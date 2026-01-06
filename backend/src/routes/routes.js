import express from "express";
import { jobStore } from "../jobs/jobStore.js";
import { startJobProcessing } from "../services/jobRunner.js";
import multer from "multer";
import { randomUUID } from "crypto";
const router = express.Router();
const MAX_FILES = Number(process.env.MAX_BATCH_SIZE ?? 200);
const MAX_FILE_SIZE_MB = Number(process.env.MAX_IMAGE_MB ?? 20);
const MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const DESCRIPTION_PROMPT =
  process.env.DESCRIPTION_PROMPT ??
  "Review this garment image and fill every bullet. Favor exact fashion terminology.";

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

const SYSTEM_PROMPT = `
  You are a Senior E-commerce Fashion Specialist. 
  Analyze the garment image and generate a product listing in the EXACT following format:
  
  [Create a catchy, descriptive product name]
  
  Description (4 lines):
  - Line 1: Describe the primary fabric, pattern, and main design feature.
  - Line 2: Detail the specific accents (like borders, zari, or textures).
  - Line 3: Mention the fit, drape, or how it feels to wear.
  - Line 4: Suggest the best occasions or the overall style value.
  
  Use elegant, inviting language suitable for a high-end e-commerce website.
  `.trim();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const uploadMiddleware = upload.array("images", MAX_FILES);

router.post("/api/jobs", (req, res) => {
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

      const job = jobStore.create(filesMeta);
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
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.get("/api/jobs/:jobId", (req, res) => {
  try {
    const summary = jobStore.summary(req.params.jobId);
    if (!summary) {
      return res.status(404).json({ error: "Job not found." });
    }
    return res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.get("/api/jobs/:jobId/stream", (req, res) => {
  try {
    const summary = jobStore.summary(req.params.jobId);
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

router.get("/api/jobs/:jobId/export", (req, res) => {
  try {
    const download = jobStore.getDownload(req.params.jobId);
    if (!download || !download.buffer) {
      return res.status(409).json({
        error: "Export not ready yet.",
      });
    }
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${
        download.filename ?? `${req.params.jobId}.xlsx`
      }"`
    );
    return res.send(download.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
