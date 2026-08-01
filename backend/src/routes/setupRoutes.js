import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import Admin from "../models/Admin.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/setup/status
 * Get current setup/onboarding progress
 */
router.get("/status", async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found",
      });
    }

    // Auto-update checklist based on actual data
    const updates = {};

    // Check if products uploaded
    const productCount = await Product.countDocuments();
    if (productCount > 0 && !admin.setupChecklist.uploadedProducts) {
      updates["setupChecklist.uploadedProducts"] = true;
    }

    // Check if any product published
    const publishedCount = await Product.countDocuments({
      status: "published",
    });
    if (publishedCount > 0 && !admin.setupChecklist.publishedProduct) {
      updates["setupChecklist.publishedProduct"] = true;
    }

    // Check if any vendor invited
    const vendorCount = await Vendor.countDocuments();
    if (vendorCount > 0 && !admin.setupChecklist.invitedVendor) {
      updates["setupChecklist.invitedVendor"] = true;
    }

    // Check if any order received
    const orderCount = await Order.countDocuments();
    if (orderCount > 0 && !admin.setupChecklist.firstOrder) {
      updates["setupChecklist.firstOrder"] = true;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await Admin.updateOne({ _id: admin._id }, { $set: updates });
      // Reload admin with updates
      const updatedAdmin = await Admin.findById(req.admin.id);
      admin.setupChecklist = updatedAdmin.setupChecklist;
    }

    // Calculate progress
    const checklist = admin.setupChecklist;
    const completedItems = Object.values(checklist).filter(Boolean).length;
    const totalItems = Object.keys(checklist).length;
    const allComplete = completedItems === totalItems;

    res.json({
      success: true,
      data: {
        checklist,
        progress: {
          completed: completedItems,
          total: totalItems,
          percentage: Math.round((completedItems / totalItems) * 100),
        },
        allComplete,
      },
    });
  } catch (error) {
    console.error("Error fetching setup status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch setup status",
    });
  }
});

/**
 * POST /api/admin/setup/mark-complete
 * Manually mark a checklist item as complete
 */
router.post("/mark-complete", async (req, res) => {
  try {
    const { item } = req.body;

    const validItems = [
      "uploadedProducts",
      "publishedProduct",
      "configuredStore",
      "invitedVendor",
      "firstOrder",
    ];

    if (!validItems.includes(item)) {
      return res.status(400).json({
        success: false,
        error: "Invalid checklist item",
      });
    }

    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found",
      });
    }

    // Mark item as complete
    admin.setupChecklist[item] = true;
    await admin.save();

    res.json({
      success: true,
      data: {
        checklist: admin.setupChecklist,
      },
    });
  } catch (error) {
    console.error("Error marking item complete:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update checklist",
    });
  }
});

export default router;
