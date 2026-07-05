import express from "express";
import { jobStore } from "../jobs/jobStore.js";
import { startJobProcessing } from "../services/jobRunner.js";
import { SYSTEM_PROMPT } from "../config/prompt.js";
import multer from "multer";
import { randomUUID } from "crypto";
import authRoutes from "./authRoutes.js";
import adminRoutes from "./adminRoutes.js";
import searchRoutes from "./searchRoutes.js";
import imageRoutes from "./imageRoutes.js";
import vendorAuthRoutes from "./vendorAuthRoutes.js";
import vendorRoutes from "./vendorRoutes.js";
import publicRoutes from "./publicRoutes.js";
import { flexibleAuthMiddleware } from "../middleware/auth.js";

const router = express.Router();
const MAX_FILES = Number(process.env.MAX_BATCH_SIZE ?? 200);
const MAX_FILE_SIZE_MB = Number(process.env.MAX_IMAGE_MB ?? 20);
const MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const DESCRIPTION_PROMPT =
  process.env.DESCRIPTION_PROMPT ??
  "Analyze this garment image carefully and provide the output in the EXACT format specified. CRITICAL: You MUST include the Colors line at the end with 2-5 dominant colors separated by commas. Do not skip any section.";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are supported."));
      return;
    }
    cb(null, true);
  },
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const uploadMiddleware = upload.array("images", MAX_FILES);

router.post("/api/jobs", flexibleAuthMiddleware, (req, res) => {
  try {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message ?? "Unable to process upload.",
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "Missing OpenAI configuration on the server.",
        });
      }

      const files = req.files ?? [];
      if (!files.length) {
        return res
          .status(400)
          .json({ error: "Please attach at least one image." });
      }
      if (files.length > MAX_FILES) {
        return res.status(400).json({
          error: `You can upload up to ${MAX_FILES} images per batch.`,
        });
      }

      const filesMeta = files.map((file, index) => ({
        id: randomUUID(),
        order: index,
        originalName: file.originalname,
        size: file.size,
        status: "queued",
        mimeType: file.mimetype,
        buffer: file.buffer,
      }));

      // Create job and upload images to GridFS
      const vendorId = req.vendor?._id ?? null;
      const uploadedBy = req.vendor?.email ?? req.admin?.email ?? "admin";

      jobStore
        .create(filesMeta, { vendorId, uploadedBy })
        .then((job) => {
          jobStore.emit(job.id);

          const tasks = files.map((file, index) => ({
            jobId: job.id,
            fileId: filesMeta[index].id,
            imageBase64: file.buffer.toString("base64"),
            prompt: SYSTEM_PROMPT,
            model: MODEL,
            apiKey: process.env.OPENAI_API_KEY,
            descriptionPrompt: DESCRIPTION_PROMPT,
          }));

          startJobProcessing(job, tasks);

          res.status(202).json({
            jobId: job.id,
            total: job.total,
            status: job.status,
          });
        })
        .catch((error) => {
          console.error("Job creation error:", error);
          res.status(500).json({ error: "Failed to create job." });
        });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.get("/api/jobs/:jobId", async (req, res) => {
  try {
    const summary = await jobStore.summary(req.params.jobId);
    if (!summary) {
      return res.status(404).json({ error: "Job not found." });
    }
    return res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.get("/api/jobs/:jobId/stream", async (req, res) => {
  try {
    const summary = await jobStore.summary(req.params.jobId);
    if (!summary) {
      return res.status(404).end();
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const sendUpdate = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendUpdate(summary);
    const unsubscribe = jobStore.subscribe(req.params.jobId, sendUpdate);

    req.on("close", () => {
      unsubscribe?.();
      res.end();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.get("/api/jobs/:jobId/export", async (req, res) => {
  try {
    const download = await jobStore.getDownload(req.params.jobId);
    if (!download || !download.buffer) {
      return res.status(409).json({
        error: "Export not ready yet.",
      });
    }
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${
        download.filename ?? `${req.params.jobId}.xlsx`
      }"`,
    );
    return res.send(download.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Mount new routes
router.use("/api/public", publicRoutes);
router.use("/api/admin/auth", authRoutes);
router.use("/api/admin/products", adminRoutes);
router.use("/api/search", searchRoutes);
router.use("/api/images", imageRoutes);
router.use("/api/vendor/auth", vendorAuthRoutes);
router.use("/api/vendor/products", vendorRoutes);

export default router;
