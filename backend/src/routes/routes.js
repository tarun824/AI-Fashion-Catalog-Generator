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
import analyticsRoutes from "./analyticsRoutes.js";
import orderRoutes from "./orderRoutes.js";
import customerRoutes from "./customerRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import shippingRoutes from "./shippingRoutes.js";
import integrationRoutes from "./integrationRoutes.js";
import setupRoutes from "./setupRoutes.js";
import aiRoutes from "./aiRoutes.js";
import auditRoutes from "./auditRoutes.js";
import { logWebhook } from "../utils/auditLogger.js";
import { isDevelopment } from "../utils/environment.js";
import { flexibleAuthMiddleware } from "../middleware/auth.js";
import {
  secureImageFilter,
  validateUploadedFiles,
  uploadLimiter,
  apiLimiter,
} from "../middleware/security.js";
import shiprocketService from "../services/shiprocketService.js";
import Order from "../models/Order.js";

const router = express.Router();
const MAX_FILES = Number(process.env.MAX_BATCH_SIZE ?? 200);
const MAX_FILE_SIZE_MB = Number(process.env.MAX_IMAGE_MB ?? 20);
const MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const DESCRIPTION_PROMPT =
  process.env.DESCRIPTION_PROMPT ??
  "Analyze this garment image carefully and provide the output in the EXACT format specified. CRITICAL: You MUST include the Colors line at the end with 2-5 dominant colors separated by commas. Do not skip any section.";

// Secure multer configuration with magic bytes validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: secureImageFilter, // Enhanced security filter
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * TEST ENDPOINT - Development Only
 * Test webhook handling with sample data
 */
if (isDevelopment()) {
  router.post("/webhooks/test", async (req, res) => {
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TEST WEBHOOK RECEIVED");
    console.log("=".repeat(80));
    console.log("⏰ Time:", new Date().toISOString());
    console.log("📋 Payload:");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("🔍 Headers:");
    console.log(JSON.stringify(req.headers, null, 2));
    console.log("🌐 IP:", req.ip || req.connection.remoteAddress);
    console.log("=".repeat(80) + "\n");

    res.json({
      success: true,
      message: "Test webhook received and logged",
      received: req.body,
    });
  });
}

/**
 * PUBLIC WEBHOOK ROUTES (No Authentication Required)
 * These endpoints receive callbacks from external services
 */

// Shiprocket webhook - receives shipment status updates
router.post("/webhooks/shiprocket", async (req, res) => {
  try {
    const rawPayload = req.body;

    // ===== DETAILED LOGGING FOR DEVELOPMENT =====
    console.log("\n" + "=".repeat(80));
    console.log("📦 SHIPROCKET WEBHOOK RECEIVED");
    console.log("=".repeat(80));
    console.log("⏰ Time:", new Date().toISOString());
    console.log("🔗 Endpoint: POST /webhooks/shiprocket");
    console.log("📋 Payload:");

    if (isDevelopment()) {
      // Full payload in development
      console.log(JSON.stringify(rawPayload, null, 2));
    } else {
      // Truncated in production
      console.log(JSON.stringify(rawPayload).substring(0, 500) + "...");
    }

    console.log("-".repeat(80));

    // Log to audit system
    await logWebhook("shiprocket", rawPayload, req);

    const webhookData = await shiprocketService.handleWebhook(rawPayload);

    // Find order by Shiprocket order ID or AWB
    const order = await Order.findOne({
      $or: [
        { "shipping.shiprocketOrderId": webhookData.orderId },
        { "shipping.shiprocketOrderId": rawPayload.sr_order_id },
        { "shipping.awbCode": webhookData.awb },
        { orderNumber: rawPayload.order_id },
      ],
    });

    if (order) {
      // 1. Store raw webhook event for audit/debugging
      order.webhookHistory.push({
        receivedAt: new Date(),
        source: "shiprocket",
        eventType: webhookData.shipmentStatus || "status_update",
        payload: rawPayload,
        processed: true,
      });

      // 2. Update shipping status
      const previousStatus = order.status;
      order.shipping.currentStatus = webhookData.currentStatus;
      order.shipping.shipmentStatus = webhookData.shipmentStatus;
      order.shipping.lastUpdated = new Date();

      // 3. Store tracking scans (detailed location history)
      if (rawPayload.scans && Array.isArray(rawPayload.scans)) {
        // Merge new scans, avoiding duplicates
        for (const scan of rawPayload.scans) {
          const scanDate = new Date(scan.date);
          const exists = order.shipping.trackingScans.some(
            (s) =>
              s.date.getTime() === scanDate.getTime() &&
              s.status === scan.status,
          );
          if (!exists) {
            order.shipping.trackingScans.push({
              date: scanDate,
              status: scan.status || scan.activity,
              activity: scan.activity || "",
              location: scan.location || "",
              remarks: scan.remarks || "",
            });
          }
        }
        // Sort scans by date (newest first)
        order.shipping.trackingScans.sort((a, b) => b.date - a.date);
      }

      // 4. Map Shiprocket status to our order status
      const statusMap = {
        NEW: "confirmed",
        "AWB ASSIGNED": "processing",
        "PICKUP SCHEDULED": "processing",
        "PICKED UP": "shipped",
        "IN TRANSIT": "shipped",
        "OUT FOR DELIVERY": "shipped",
        DELIVERED: "delivered",
        "RTO INITIATED": "returned",
        "RTO IN TRANSIT": "returned",
        "RTO DELIVERED": "returned",
        CANCELLED: "cancelled",
        LOST: "cancelled",
        UNDELIVERED: "shipped",
      };

      const newStatus =
        statusMap[webhookData.shipmentStatus] ||
        statusMap[webhookData.currentStatus];

      if (newStatus && newStatus !== previousStatus) {
        order.status = newStatus;

        // 5. Add status history entry WITH webhook source tag
        order.statusHistory.push({
          status: newStatus,
          note: `${webhookData.currentStatus} (via Shiprocket webhook)`,
          source: "webhook",
          timestamp: new Date(),
        });
      }

      // 6. Handle specific status updates
      if (webhookData.shipmentStatus === "DELIVERED") {
        order.shipping.deliveredAt = webhookData.deliveredDate
          ? new Date(webhookData.deliveredDate)
          : new Date();
        // COD payment collected on delivery
        if (order.payment.method === "COD") {
          order.payment.status = "paid";
          order.payment.paidAt = order.shipping.deliveredAt;
        }
      } else if (
        webhookData.shipmentStatus === "PICKED UP" &&
        !order.shipping.shippedAt
      ) {
        order.shipping.shippedAt = new Date();
      }

      // 7. Update ETD if provided
      if (rawPayload.etd) {
        order.shipping.expectedDelivery = new Date(rawPayload.etd);
      }

      await order.save();

      console.log("✅ ORDER UPDATED SUCCESSFULLY");
      console.log(`   Order Number: ${order.orderNumber}`);
      console.log(`   Status Change: ${previousStatus} → ${order.status}`);
      console.log(`   Current Status: ${webhookData.currentStatus}`);
      console.log(
        `   Tracking Scans: ${order.shipping.trackingScans.length} total`,
      );
      console.log(`   AWB Code: ${order.shipping.awbCode}`);
      console.log("=".repeat(80) + "\n");
    } else {
      console.log("⚠️  ORDER NOT FOUND");
      console.log(`   AWB: ${webhookData.awb}`);
      console.log(`   Order ID from webhook: ${rawPayload.order_id}`);
      console.log(`   SR Order ID: ${rawPayload.sr_order_id}`);
      console.log("=".repeat(80) + "\n");
    }

    res.json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.log("❌ WEBHOOK PROCESSING ERROR");
    console.error("   Error:", error.message);
    console.error("   Stack:", error.stack);
    console.log("=".repeat(80) + "\n");
    res.status(500).json({ error: error.message });
  }
});

const uploadMiddleware = upload.array("images", MAX_FILES);

/**
 * POST /jobs - Batch image upload with AI processing
 * Rate limited and secured with magic bytes validation
 */
router.post("/jobs", uploadLimiter, flexibleAuthMiddleware, (req, res) => {
  try {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message ?? "Unable to process upload.",
        });
      }

      // Validate files with magic bytes (deep validation)
      try {
        await new Promise((resolve, reject) => {
          validateUploadedFiles(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } catch (validationError) {
        // Response already sent by middleware
        return;
      }

      // Check if response was already sent by validation middleware
      if (res.headersSent) return;

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

router.get("/jobs/:jobId", async (req, res) => {
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

router.get("/jobs/:jobId/stream", async (req, res) => {
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

router.get("/jobs/:jobId/export", async (req, res) => {
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

// Mount routes (API_PREFIX already includes /api/ai-fashion-generator)
router.use("/ai", aiRoutes);
router.use("/public", publicRoutes);
router.use("/admin/auth", authRoutes);
router.use("/admin/analytics", apiLimiter, analyticsRoutes);
router.use("/admin/products", apiLimiter, adminRoutes);
router.use("/admin/orders", apiLimiter, orderRoutes);
router.use("/admin/customers", apiLimiter, customerRoutes);
router.use("/admin/inventory", apiLimiter, inventoryRoutes);
router.use("/admin/shipping", apiLimiter, shippingRoutes);
router.use("/admin/integrations", apiLimiter, integrationRoutes);
router.use("/admin/setup", apiLimiter, setupRoutes);
router.use("/admin/audits", apiLimiter, auditRoutes);
router.use("/search", searchRoutes);
router.use("/images", imageRoutes);
router.use("/vendor/auth", vendorAuthRoutes);
router.use("/vendor/products", apiLimiter, vendorRoutes);

export default router;
