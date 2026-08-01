/**
 * Audit Log Routes
 */

import express from "express";
import AuditLog from "../models/AuditLog.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/audits
 * List audit logs with filters
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      tag: req.query.tag,
      level: req.query.level,
      userId: req.query.userId,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      sortBy: req.query.sortBy || "createdAt",
      order: req.query.order || "desc",
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    };

    const result = await AuditLog.searchLogs(filters);

    res.json({
      success: true,
      logs: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("List audit logs error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch audit logs",
    });
  }
});

/**
 * GET /api/admin/audits/stats
 * Get audit log statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const stats = await AuditLog.getStatsByTag(dateFrom, dateTo);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Audit stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch audit statistics",
    });
  }
});

/**
 * GET /api/admin/audits/tags
 * Get list of available tags
 */
router.get("/tags", async (req, res) => {
  try {
    const tags = await AuditLog.distinct("tag");

    res.json({
      success: true,
      tags: tags.sort(),
    });
  } catch (error) {
    console.error("Fetch tags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tags",
    });
  }
});

/**
 * GET /api/admin/audits/:id
 * Get single audit log by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate(
      "userId",
      "name email",
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        error: "Audit log not found",
      });
    }

    res.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error("Get audit log error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch audit log",
    });
  }
});

/**
 * DELETE /api/admin/audits/cleanup
 * Clean up old audit logs
 */
router.delete("/cleanup", async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const deletedCount = await AuditLog.cleanupOldLogs(daysToKeep);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} old audit logs`,
      deletedCount,
    });
  } catch (error) {
    console.error("Cleanup audit logs error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cleanup audit logs",
    });
  }
});

export default router;
