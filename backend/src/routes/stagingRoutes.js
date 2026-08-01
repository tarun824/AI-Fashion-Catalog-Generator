import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { authMiddleware } from "../middleware/auth.js";
import { jobStore } from "../jobs/jobStore.js";
import { startJobProcessing } from "../services/jobRunner.js";
import { SYSTEM_PROMPT } from "../config/prompt.js";
import {
  secureImageFilter,
  validateUploadedFiles,
  uploadLimiter,
} from "../middleware/security.js";

const router = express.Router();

// Configuration
const MAX_FILES = Number(process.env.MAX_BATCH_SIZE ?? 200);
const MAX_FILE_SIZE_MB = Number(process.env.MAX_IMAGE_MB ?? 20);
const MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const DESCRIPTION_PROMPT =
  process.env.DESCRIPTION_PROMPT ??
  "Analyze this garment image carefully and provide the output in the EXACT format specified.";

// Secure multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: secureImageFilter,
});

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/admin/staging/upload
 * Upload images for staging with grouping metadata
 *
 * Body (FormData):
 * - images: File[] - Array of image files
 * - groups: JSON string - Grouping metadata: { groups: [{ groupId, imageIndexes }] }
 *
 * Returns:
 * {
 *   jobId: string,
 *   total: number,
 *   groups: [{
 *     groupId: string,
 *     imageCount: number,
 *     uploadedFiles: [{ fileId, originalName, groupId, order }]
 *   }]
 * }
 */
router.post(
  "/upload",
  uploadLimiter,
  upload.array("images", MAX_FILES),
  validateUploadedFiles,
  async (req, res) => {
    try {
      // Validate OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          success: false,
          error: "Missing OpenAI configuration on the server.",
        });
      }

      // Validate files
      const files = req.files ?? [];
      if (!files.length) {
        return res.status(400).json({
          success: false,
          error: "Please attach at least one image.",
        });
      }

      if (files.length > MAX_FILES) {
        return res.status(400).json({
          success: false,
          error: `You can upload up to ${MAX_FILES} images per batch.`,
        });
      }

      // Parse grouping metadata
      let groupsMetadata = { groups: [] };
      if (req.body.groups) {
        try {
          groupsMetadata =
            typeof req.body.groups === "string"
              ? JSON.parse(req.body.groups)
              : req.body.groups;
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: "Invalid groups metadata format.",
          });
        }
      }

      // Build file metadata with grouping information
      const groupMap = new Map();
      groupsMetadata.groups?.forEach((group) => {
        group.imageIndexes?.forEach((index) => {
          groupMap.set(index, group.groupId);
        });
      });

      const filesMeta = files.map((file, index) => {
        const fileId = randomUUID();
        const groupId = groupMap.get(index) || null;

        return {
          id: fileId,
          order: index,
          originalName: file.originalname,
          size: file.size,
          status: "queued",
          mimeType: file.mimetype,
          buffer: file.buffer,
          metadata: {
            groupId,
            uploadedAt: new Date(),
            staging: true, // Flag for staging area
          },
        };
      });

      // Get user context
      const vendorId = req.vendor?._id ?? null;
      const uploadedBy = req.admin?.email ?? req.vendor?.email ?? "admin";

      // Create job and upload images to GridFS
      const job = await jobStore.create(filesMeta, {
        vendorId,
        uploadedBy,
        type: "staging",
      });

      // Emit job creation event
      jobStore.emit(job.id);

      // Prepare AI processing tasks
      const tasks = files.map((file, index) => ({
        jobId: job.id,
        fileId: filesMeta[index].id,
        imageBase64: file.buffer.toString("base64"),
        prompt: SYSTEM_PROMPT,
        model: MODEL,
        apiKey: process.env.OPENAI_API_KEY,
        descriptionPrompt: DESCRIPTION_PROMPT,
      }));

      // Start batch AI processing
      startJobProcessing(job, tasks);

      // Build response with grouping information
      const groupedFiles = new Map();
      filesMeta.forEach((file) => {
        const groupId = file.metadata.groupId || "ungrouped";
        if (!groupedFiles.has(groupId)) {
          groupedFiles.set(groupId, []);
        }
        groupedFiles.get(groupId).push({
          fileId: file.id,
          originalName: file.originalName,
          groupId: file.metadata.groupId,
          order: file.order,
        });
      });

      const groups = Array.from(groupedFiles.entries()).map(
        ([groupId, files]) => ({
          groupId: groupId === "ungrouped" ? null : groupId,
          imageCount: files.length,
          uploadedFiles: files,
        }),
      );

      res.status(202).json({
        success: true,
        jobId: job.id,
        total: files.length,
        status: job.status,
        groups,
      });
    } catch (error) {
      console.error("Staging upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process staging upload.",
        message: error.message,
      });
    }
  },
);

/**
 * GET /api/admin/staging/job/:jobId
 * Get staging job status and results
 */
router.get("/job/:jobId", async (req, res) => {
  try {
    const summary = await jobStore.summary(req.params.jobId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: "Job not found.",
      });
    }

    res.json({
      success: true,
      job: summary,
    });
  } catch (error) {
    console.error("Get staging job error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch job status.",
    });
  }
});

/**
 * GET /api/admin/staging/job/:jobId/stream
 * Stream real-time updates for staging job
 */
router.get("/job/:jobId/stream", async (req, res) => {
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
    console.error("Stream staging job error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to stream job updates.",
    });
  }
});

export default router;
