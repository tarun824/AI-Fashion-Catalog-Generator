import express from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  analyzeCustomer,
  analyzeAllCustomers,
  getHighPotentialCustomers,
  getChurnRiskCustomers,
  getVIPCustomers,
  getProductRecommendations,
  getCustomerInsights,
} from "../services/customerAI.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/customers
 * List customers with pagination and filters
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      text: req.query.search || req.query.text,
      customerType: req.query.customerType,
      minSpent: req.query.minSpent,
      maxSpent: req.query.maxSpent,
      minOrders: req.query.minOrders,
      tags: req.query.tags ? req.query.tags.split(",") : null,
      source: req.query.source,
      churnRisk: req.query.churnRisk,
      isActive:
        req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      sortBy: req.query.sortBy || "createdAt",
      order: req.query.order || "desc",
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await Customer.searchCustomers(filters);

    res.json({
      success: true,
      customers: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customers",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/insights
 * Get customer insights for dashboard
 */
router.get("/insights", async (req, res) => {
  try {
    const insights = await getCustomerInsights();

    res.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("Failed to fetch customer insights:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer insights",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/segments
 * Get customer segment counts
 */
router.get("/segments", async (req, res) => {
  try {
    const segments = await Customer.getSegments();

    res.json({
      success: true,
      segments,
    });
  } catch (error) {
    console.error("Failed to fetch customer segments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer segments",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/vip
 * Get VIP customers list
 */
router.get("/vip", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const vipCustomers = await getVIPCustomers(limit);

    res.json({
      success: true,
      customers: vipCustomers,
    });
  } catch (error) {
    console.error("Failed to fetch VIP customers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch VIP customers",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/high-potential
 * Get high-potential customers (window shoppers)
 */
router.get("/high-potential", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const customers = await getHighPotentialCustomers(limit);

    res.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("Failed to fetch high-potential customers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch high-potential customers",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/churn-risk
 * Get customers at risk of churning
 */
router.get("/churn-risk", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const customers = await getChurnRiskCustomers(limit);

    res.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("Failed to fetch churn-risk customers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch churn-risk customers",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/top
 * Get top customers by spending
 */
router.get("/top", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topCustomers = await Customer.getTopCustomers(limit);

    res.json({
      success: true,
      customers: topCustomers,
    });
  } catch (error) {
    console.error("Failed to fetch top customers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch top customers",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/:id
 * Get customer detail
 */
router.get("/:id", async (req, res) => {
  try {
    // Validate ObjectId to prevent errors with routes like /new
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID format",
      });
    }

    const customer = await Customer.findById(req.params.id)
      .populate("referredBy", "name phone")
      .populate("notes.addedBy", "name email");

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer",
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/customers
 * Create new customer
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      addresses,
      preferences,
      communication,
      source,
      referredBy,
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: "Name and phone are required",
      });
    }

    // Check if customer with phone already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: "Customer with this phone number already exists",
      });
    }

    // Create customer
    const customer = await Customer.create({
      name,
      phone,
      email,
      addresses: addresses || [],
      preferences: preferences || {},
      communication: communication || {},
      source: source || "website",
      referredBy: referredBy || null,
    });

    res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Failed to create customer:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create customer",
      message: error.message,
    });
  }
});

/**
 * PATCH /api/admin/customers/:id
 * Update customer
 */
router.patch("/:id", async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID format",
      });
    }

    const {
      name,
      phone,
      email,
      addresses,
      preferences,
      communication,
      source,
      referredBy,
      tags,
      isActive,
      blockedReason,
    } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    // Update fields
    if (name) customer.name = name;
    if (phone) customer.phone = phone;
    if (email !== undefined) customer.email = email;
    if (addresses) customer.addresses = addresses;
    if (preferences)
      customer.preferences = { ...customer.preferences, ...preferences };
    if (communication)
      customer.communication = { ...customer.communication, ...communication };
    if (source) customer.source = source;
    if (referredBy !== undefined) customer.referredBy = referredBy;
    if (tags) customer.tags = tags;
    if (isActive !== undefined) customer.isActive = isActive;
    if (blockedReason !== undefined) customer.blockedReason = blockedReason;

    await customer.save();

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Failed to update customer:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update customer",
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/customers/:id/notes
 * Add note to customer
 */
router.post("/:id/notes", async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID format",
      });
    }

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Note text is required",
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    await customer.addNote(text, req.user._id);

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Failed to add note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add note",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/admin/customers/:id/notes/:noteId
 * Delete customer note
 */
router.delete("/:id/notes/:noteId", async (req, res) => {
  try {
    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(req.params.id) ||
      !mongoose.Types.ObjectId.isValid(req.params.noteId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format",
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    customer.notes = customer.notes.filter(
      (note) => note._id.toString() !== req.params.noteId,
    );
    await customer.save();

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Failed to delete note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete note",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/:id/orders
 * Get customer order history (placeholder - needs Order model)
 */
router.get("/:id/orders", async (req, res) => {
  try {
    // TODO: Implement when Order model is created
    // For now, return empty array
    res.json({
      success: true,
      orders: [],
      message: "Order tracking not yet implemented",
    });
  } catch (error) {
    console.error("Failed to fetch customer orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer orders",
      message: error.message,
    });
  }
});

/**
 * GET /api/admin/customers/:id/recommendations
 * Get product recommendations for customer
 */
router.get("/:id/recommendations", async (req, res) => {
  try {
    const recommendations = await getProductRecommendations(req.params.id);

    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch recommendations",
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/customers/:id/analyze
 * Run AI analysis on customer
 */
router.post("/:id/analyze", async (req, res) => {
  try {
    const customer = await analyzeCustomer(req.params.id);

    res.json({
      success: true,
      customer,
      message: "Customer analyzed successfully",
    });
  } catch (error) {
    console.error("Failed to analyze customer:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze customer",
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/customers/analyze-all
 * Run AI analysis on all customers (admin only)
 */
router.post("/analyze-all", async (req, res) => {
  try {
    // Check if user is super-admin
    if (req.user.role !== "super-admin") {
      return res.status(403).json({
        success: false,
        error: "Only super-admins can run bulk analysis",
      });
    }

    // Run in background (don't wait)
    analyzeAllCustomers()
      .then((results) => {
        console.log("Bulk customer analysis completed:", results);
      })
      .catch((error) => {
        console.error("Bulk customer analysis failed:", error);
      });

    res.json({
      success: true,
      message: "Bulk customer analysis started in background",
    });
  } catch (error) {
    console.error("Failed to start bulk analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start bulk analysis",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/admin/customers/:id
 * Delete customer (soft delete - mark as inactive)
 */
router.delete("/:id", async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID format",
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    // Soft delete - mark as inactive
    customer.isActive = false;
    customer.blockedReason = "Deleted by admin";
    await customer.save();

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete customer",
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/customers/export
 * Export customers to CSV
 */
router.post("/export", async (req, res) => {
  try {
    const { customerType, tags, source } = req.body;

    const query = {};
    if (customerType && customerType !== "all") {
      query.customerType = customerType;
    }
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }
    if (source && source !== "all") {
      query.source = source;
    }

    const customers = await Customer.find(query)
      .select(
        "name phone email customerType totalOrders totalSpent lastPurchaseDate",
      )
      .lean();

    res.json({
      success: true,
      customers,
      count: customers.length,
    });
  } catch (error) {
    console.error("Failed to export customers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export customers",
      message: error.message,
    });
  }
});

export default router;
