import express from "express";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  downloadImage,
  deleteProductImages,
  uploadImageWithThumbnail,
} from "../services/imageStorage.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/products
 * List products with pagination and filters
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      text: req.query.search || req.query.text,
      colors: req.query.colors ? req.query.colors.split(",") : null,
      colorMode: req.query.colorMode || "any",
      colorFamilies: req.query.colorFamilies
        ? req.query.colorFamilies.split(",")
        : null,
      minColorPercent: req.query.minColorPercent
        ? parseInt(req.query.minColorPercent)
        : null,
      status: req.query.status,
      category: req.query.category,
      vendorId: req.query.vendorId,
      fabric: req.query.fabric,
      occasion: req.query.occasion,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      tags: req.query.tags ? req.query.tags.split(",") : null,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
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
    console.error("List products error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
    });
  }
});

/**
 * GET /api/admin/products/:id
 * Get single product by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "vendorId",
      "businessName email",
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch product",
    });
  }
});

/**
 * POST /api/admin/products
 * Create new product manually
 */
router.post("/", async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      category: req.body.category || "",
      price: req.body.price,
      fabric: req.body.fabric || "",
      borderType: req.body.borderType || "",
      occasion: req.body.occasion || "",
      workType: req.body.workType || "",
      weight: req.body.weight || "",
      blouseIncluded: Boolean(req.body.blouseIncluded),
      description: req.body.description,
      colors: req.body.colors,
      status: req.body.status || "draft",
      tags: req.body.tags || [],
      variants: req.body.variants || [],
      metadata: {
        uploadedBy: req.admin.email,
        ...req.body.metadata,
      },
    };

    // Validation
    if (!productData.name) {
      return res.status(400).json({
        success: false,
        error: "Product name is required",
      });
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create product",
    });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update product
 */
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      "name",
      "category",
      "price",
      "description",
      "colors",
      "status",
      "tags",
      "lowStockThreshold",
      "fabric",
      "borderType",
      "occasion",
      "workType",
      "weight",
      "blouseIncluded",
    ];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (
          ["description", "colors", "price"].includes(field) &&
          typeof req.body[field] === "object"
        ) {
          product[field] = { ...product[field]?.toObject?.(), ...req.body[field] };
        } else {
          product[field] = req.body[field];
        }
      }
    });

    await product.save();

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update product",
    });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete product and its images
 */
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Delete images from GridFS
    await deleteProductImages(product.images);

    // Delete product document
    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete product",
    });
  }
});

/**
 * PATCH /api/admin/products/:id/status
 * Update product status (draft/published/archived)
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be draft, published, or archived",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update status",
    });
  }
});

/**
 * POST /api/admin/products/:id/variants
 * Add a new size/color variant with stock to a product
 */
router.post("/:id/variants", async (req, res) => {
  try {
    const { size, color, stock, priceOverride } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    product.variants.push({
      size: size || "",
      color: color || "",
      stock: Number(stock) || 0,
      priceOverride: priceOverride != null ? Number(priceOverride) : null,
    });

    await product.save();

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Add variant error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add variant",
    });
  }
});

/**
 * PUT /api/admin/products/:id/variants/:variantId
 * Update a variant's size, color, stock, or price override
 */
router.put("/:id/variants/:variantId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const variant = product.variants.id(req.params.variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        error: "Variant not found",
      });
    }

    ["size", "color", "stock", "priceOverride"].forEach((field) => {
      if (req.body[field] !== undefined) {
        variant[field] = req.body[field];
      }
    });

    await product.save();

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Update variant error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update variant",
    });
  }
});

/**
 * DELETE /api/admin/products/:id/variants/:variantId
 * Remove a variant from a product
 */
router.delete("/:id/variants/:variantId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    product.variants.id(req.params.variantId)?.deleteOne();
    await product.save();

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Delete variant error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete variant",
    });
  }
});

/**
 * POST /api/admin/products/bulk-delete
 * Delete multiple products
 */
router.post("/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Product IDs array is required",
      });
    }

    // Get products to delete their images
    const products = await Product.find({ _id: { $in: ids } });

    // Delete all images
    await Promise.all(
      products.map((product) => deleteProductImages(product.images)),
    );

    // Delete products
    const result = await Product.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} products deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete products",
    });
  }
});

/**
 * PATCH /api/admin/products/bulk-status
 * Update status for multiple products
 */
router.patch("/bulk-status", async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Product IDs array is required",
      });
    }

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
      });
    }

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { status } },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} products updated`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk status update error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update products",
    });
  }
});

/**
 * GET /api/admin/products/stats/summary
 * Get product statistics
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const [total, draft, published, archived, recentCount, lowStockProducts] =
      await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ status: "draft" }),
        Product.countDocuments({ status: "published" }),
        Product.countDocuments({ status: "archived" }),
        Product.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        Product.find({ "variants.0": { $exists: true } })
          .select("variants lowStockThreshold")
          .lean(),
      ]);

    const lowStockCount = lowStockProducts.filter((p) => {
      const total = (p.variants || []).reduce(
        (sum, v) => sum + (v.stock || 0),
        0,
      );
      return total <= (p.lowStockThreshold ?? 5);
    }).length;

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          draft,
          published,
          archived,
        },
        recentlyAdded: recentCount,
        lowStock: lowStockCount,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get statistics",
    });
  }
});

export default router;
