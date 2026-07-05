import EventEmitter from "events";
import { randomUUID } from "crypto";
import Job from "../models/Job.js";
import { uploadImageWithThumbnail } from "../services/imageStorage.js";
import Product from "../models/Product.js";

// In-memory event emitters for real-time updates
const emitters = new Map();

const DEFAULT_ESTIMATE_MS =
  Number(process.env.ESTIMATE_IMAGE_SECONDS ?? 20) * 1000;

const getEmitter = (jobId) => {
  if (!emitters.has(jobId)) {
    emitters.set(jobId, new EventEmitter());
  }
  return emitters.get(jobId);
};

const calculateEtaSeconds = (job) => {
  const processed = job.progress.completed + job.progress.failed;
  const remaining = Math.max(job.progress.total - processed, 0);
  if (remaining <= 0) {
    return 0;
  }
  const durations = job.results
    .map((result) => result.durationMs)
    .filter((value) => typeof value === "number" && value > 0);
  const averageMs =
    durations.length > 0
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : DEFAULT_ESTIMATE_MS;
  return Math.max(Math.round((remaining * averageMs) / 1000), 0);
};

const sanitizeJob = (job) => {
  const processed = job.progress.completed + job.progress.failed;
  const progressPercent = job.progress.total
    ? Math.round((processed / job.progress.total) * 100)
    : 0;

  const safeFiles = job.files.map(({ buffer, ...fileMeta }) => fileMeta);

  return {
    id: job.jobId,
    status: job.status,
    total: job.progress.total,
    completed: job.progress.completed,
    failed: job.progress.failed,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    files: safeFiles,
    results: job.results,
    errors: job.results
      .filter((r) => r.error)
      .map((r) => ({ fileId: r.fileId, error: r.error })),
    downloadReady: job.export.ready,
    progressPercent,
    etaSeconds: calculateEtaSeconds(job),
  };
};

export const jobStore = {
  async create(filesMeta, options = {}) {
    const jobId = randomUUID();
    const { vendorId = null, uploadedBy = "admin" } = options;

    // Upload images to GridFS
    const filesWithImages = await Promise.all(
      filesMeta.map(async (file) => {
        const { originalId, thumbnailId } = await uploadImageWithThumbnail(
          file.buffer,
          {
            originalName: file.originalName,
            filename: `${jobId}-${file.id}.jpg`,
            mimeType: file.mimeType,
          },
        );

        return {
          fileId: file.id,
          originalName: file.originalName,
          order: file.order,
          status: "pending",
          size: file.size,
          mimeType: file.mimeType,
          gridFsId: originalId,
          thumbnailId: thumbnailId,
        };
      }),
    );

    const job = new Job({
      jobId,
      status: "queued",
      files: filesWithImages,
      vendorId,
      uploadedBy,
      progress: {
        total: filesMeta.length,
        completed: 0,
        failed: 0,
      },
    });

    await job.save();

    return {
      id: jobId,
      status: job.status,
      total: job.progress.total,
      completed: job.progress.completed,
      failed: job.progress.failed,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      files: filesWithImages,
      results: [],
      errors: [],
    };
  },

  async get(jobId) {
    const job = await Job.findOne({ jobId }).lean();
    return job;
  },

  async summary(jobId) {
    const job = await Job.findOne({ jobId }).lean();
    if (!job) {
      return null;
    }
    return sanitizeJob(job);
  },

  async setStatus(jobId, status, extra = {}) {
    await Job.updateOne(
      { jobId },
      {
        $set: {
          status,
          updatedAt: new Date(),
          ...extra,
        },
      },
    );
    this.emit(jobId);
  },

  async markFileStatus(jobId, fileId, status, extra = {}) {
    const updateFields = {
      "files.$.status": status,
      updatedAt: new Date(),
    };

    Object.keys(extra).forEach((key) => {
      updateFields[`files.$.${key}`] = extra[key];
    });

    await Job.updateOne(
      { jobId, "files.fileId": fileId },
      { $set: updateFields },
    );

    this.emit(jobId);
  },

  async markSuccess(jobId, fileId, payload) {
    const job = await Job.findOne({ jobId });
    if (!job) return;

    // Create Product from the result
    try {
      await this.createProductFromResult(jobId, fileId, payload);
    } catch (error) {
      console.error("Failed to create product:", error);
    }

    await Job.updateOne(
      { jobId },
      {
        $push: { results: { fileId, ...payload } },
        $inc: { "progress.completed": 1 },
        $set: { updatedAt: new Date() },
      },
    );

    await this.markFileStatus(jobId, fileId, "completed", {
      durationMs: payload.durationMs,
    });
  },

  async markFailure(jobId, fileId, error) {
    await Job.updateOne(
      { jobId },
      {
        $push: { results: { fileId, error } },
        $inc: { "progress.failed": 1 },
        $set: { updatedAt: new Date() },
      },
    );

    await this.markFileStatus(jobId, fileId, "failed", { error });
  },

  async finalize(jobId, { buffer, filename }) {
    const job = await Job.findOne({ jobId });
    if (!job) return;

    const hasErrors = job.progress.failed > 0;
    let status = "completed";
    if (job.progress.completed === 0) {
      status = "failed";
    } else if (hasErrors) {
      status = "completed_with_errors";
    }

    await Job.updateOne(
      { jobId },
      {
        $set: {
          status,
          "export.ready": Boolean(buffer),
          "export.buffer": buffer, // Store small buffers in DB
          "export.filename": filename,
          updatedAt: new Date(),
        },
      },
    );

    this.emit(jobId);
  },

  async emit(jobId) {
    const job = await Job.findOne({ jobId }).lean();
    if (!job) return;

    const emitter = getEmitter(jobId);
    emitter.emit("update", sanitizeJob(job));
  },

  subscribe(jobId, listener) {
    const emitter = getEmitter(jobId);
    emitter.on("update", listener);
    return () => emitter.off("update", listener);
  },

  async getDownload(jobId) {
    const job = await Job.findOne({ jobId }).lean();
    if (!job || !job.export.ready) {
      return null;
    }
    return {
      buffer: job.export.buffer,
      filename: job.export.filename,
    };
  },

  async createProductFromResult(jobId, fileId, result) {
    const job = await Job.findOne({ jobId });
    if (!job) return;

    const file = job.files.find((f) => f.fileId === fileId);
    if (!file) return;

    // Extract name from description (first line)
    const descriptionLines = result.description.split("\n");
    let name = file.originalName.replace(/\.[^/.]+$/, ""); // Remove extension

    // Try to extract "Name:" line
    const nameLine = descriptionLines.find((line) =>
      line.toLowerCase().startsWith("name:"),
    );
    if (nameLine) {
      name = nameLine.replace(/^name:\s*/i, "").trim();
    }

    // Parse description into structured format
    const descriptionText = result.description;
    const parsed = {
      fabric: descriptionLines[1] || "",
      accents: descriptionLines[2] || "",
      fit: descriptionLines[3] || "",
      occasion: descriptionLines[4] || "",
    };

    // Create product
    const product = new Product({
      name,
      category: result.category || "",
      tags: result.tags || [],
      vendorId: job.vendorId || null,
      fabric: result.fabric || "",
      borderType: result.borderType || "",
      occasion: result.occasion || "",
      workType: result.workType || "",
      weight: result.weight || "",
      blouseIncluded: Boolean(result.blouseIncluded),
      price: {
        suggested: result.approxPrice ?? null,
        amount: result.approxPrice ?? null,
        currency: "INR",
      },
      description: {
        full: descriptionText,
        parsed,
      },
      colors: {
        names: result.colors || [],
        families: result.colorDetails?.families || [],
        percentages: result.colorDetails?.percentages || [],
        palette: result.colorDetails?.palette || "",
      },
      images: {
        original: {
          gridFsId: file.gridFsId,
          filename: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
        },
        thumbnail: file.thumbnailId
          ? {
              gridFsId: file.thumbnailId,
              filename: `thumb-${file.originalName}`,
            }
          : undefined,
      },
      status: "draft",
      metadata: {
        uploadedBy: job.uploadedBy,
        uploadedAt: job.createdAt,
        jobId: job.jobId,
        tokens: result.tokens,
        processingTime: result.durationMs,
      },
    });

    await product.save();

    // Link product to job file
    await Job.updateOne(
      { jobId, "files.fileId": fileId },
      { $set: { "files.$.productId": product._id } },
    );

    return product;
  },
};
