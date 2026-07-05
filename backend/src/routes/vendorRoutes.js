import express from "express";
import Product from "../models/Product.js";
import { vendorAuthMiddleware } from "../middleware/auth.js";

const router = express.Router();

// All routes here are scoped to the authenticated vendor's own products
router.use(vendorAuthMiddleware);

/**
 * GET /api/vendor/products
 * List the current vendor's own products
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      text: req.query.search || req.query.text,
      status: req.query.status,
      category: req.query.category,
      vendorId: req.vendor._id,
      sortBy: req.query.sortBy || "createdAt",
      order: req.query.order || "desc",
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await Product.searchProducts(filters);

    res.json({
      success: true,
      data: result.results,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Vendor list products error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
    });
  }
});

/**
 * GET /api/vendor/products/stats/summary
 * Stats scoped to the current vendor
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const [total, draft, published, archived] = await Promise.all([
      Product.countDocuments({ vendorId }),
      Product.countDocuments({ vendorId, status: "draft" }),
      Product.countDocuments({ vendorId, status: "published" }),
      Product.countDocuments({ vendorId, status: "archived" }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: { draft, published, archived },
      },
    });
  } catch (error) {
    console.error("Vendor stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get statistics",
    });
  }
});

/**
 * GET /api/vendor/products/:id
 * Get a single product owned by this vendor
 */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      vendorId: req.vendor._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Vendor get product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch product",
    });
  }
});

/**
 * PUT /api/vendor/products/:id
 * Vendors may only update their own price/stock-facing fields, not moderation status
 */
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      vendorId: req.vendor._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const allowedUpdates = [
      "name",
      "category",
      "price",
      "fabric",
      "borderType",
      "occasion",
      "workType",
      "weight",
      "blouseIncluded",
      "tags",
    ];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "price" && typeof req.body[field] === "object") {
          product.price = { ...product.price?.toObject?.(), ...req.body[field] };
        } else {
          product[field] = req.body[field];
        }
      }
    });

    await product.save();

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Vendor update product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update product",
    });
  }
});

export default router;
