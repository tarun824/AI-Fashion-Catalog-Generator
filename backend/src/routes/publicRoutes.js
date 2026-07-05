import express from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const router = express.Router();

// Configure multer for image uploads (visual search)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Rate limiting for public API (100 requests per 15 minutes per IP)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(publicLimiter);

// ===== HEALTH CHECK =====
router.get("/health", (_req, res) => {
  res.json({ status: "ok", public: true });
});

// ===== CATEGORY ROUTES =====

/**
 * GET /api/public/categories
 * Get all active categories (tree structure)
 */
router.get("/categories", async (req, res) => {
  try {
    const { type, flat } = req.query;

    if (flat === "true") {
      // Return flat list of categories
      const query = { isActive: true };
      if (type) {
        query.type = type;
      }

      const categories = await Category.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .select(
          "name slug type description image productCount isFeatured iconColor",
        )
        .lean();

      return res.json({ categories });
    }

    // Return hierarchical tree
    const tree = await Category.getTree(type || null);
    res.json({ categories: tree });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * GET /api/public/categories/:slug
 * Get single category details
 */
router.get("/categories/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true })
      .select("-createdAt -updatedAt")
      .lean();

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Get breadcrumb path
    const categoryDoc = await Category.findById(category._id);
    const path = await categoryDoc.getPath();

    res.json({
      category,
      path: path.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
      })),
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// ===== PRODUCT ROUTES =====

/**
 * GET /api/public/products
 * List published products with filters and pagination
 */
router.get("/products", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24,
      sort = "newest",
      category,
      fabric,
      occasion,
      workType,
      colors,
      priceMin,
      priceMax,
      inStockOnly,
      featured,
    } = req.query;

    // Build query
    const query = {
      isPublished: true,
      status: "published",
    };

    // Category filter (can be category ID or slug)
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        query["categories.categoryId"] = cat._id;
      }
    }

    // Attribute filters
    if (fabric) {
      query.fabric = {
        $in: Array.isArray(fabric) ? fabric : [fabric],
      };
    }

    if (occasion) {
      query.occasion = {
        $in: Array.isArray(occasion) ? occasion : [occasion],
      };
    }

    if (workType) {
      query.workType = {
        $in: Array.isArray(workType) ? workType : [workType],
      };
    }

    // Color filter
    if (colors) {
      const colorArray = Array.isArray(colors) ? colors : colors.split(",");
      query["colors.names"] = { $in: colorArray };
    }

    // Price range filter
    if (priceMin || priceMax) {
      query["price.amount"] = {};
      if (priceMin) query["price.amount"].$gte = Number(priceMin);
      if (priceMax) query["price.amount"].$lte = Number(priceMax);
    }

    // Stock filter
    if (inStockOnly === "true") {
      query["variants"] = {
        $elemMatch: { stock: { $gt: 0 } },
      };
    }

    // Featured filter
    if (featured === "true") {
      // For now, use high-rated or high-viewed products as "featured"
      query.$or = [
        { "rating.average": { $gte: 4.5 } },
        { viewCount: { $gte: 100 } },
      ];
    }

    // Sort options
    let sortObj = {};
    switch (sort) {
      case "price-low":
        sortObj = { "price.amount": 1 };
        break;
      case "price-high":
        sortObj = { "price.amount": -1 };
        break;
      case "rating":
        sortObj = { "rating.average": -1, "rating.count": -1 };
        break;
      case "popular":
        sortObj = { viewCount: -1 };
        break;
      case "newest":
      default:
        sortObj = { publishedAt: -1, createdAt: -1 };
        break;
    }

    // Execute query with pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select(
          "name slug price images imageGallery colors fabric occasion workType rating viewCount blouseIncluded variants",
        )
        .lean(),
      Product.countDocuments(query),
    ]);

    // Transform products for public consumption
    const publicProducts = products.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      price: p.price?.amount || null,
      currency: p.price?.currency || "INR",
      thumbnail:
        p.imageGallery?.[0]?.thumbnailGridFsId || p.images?.thumbnail?.gridFsId,
      colors: p.colors?.names || [],
      colorPalette: p.colors?.palette || "",
      fabric: p.fabric || "",
      occasion: p.occasion || "",
      workType: p.workType || "",
      blouseIncluded: p.blouseIncluded || false,
      rating: p.rating?.average || 0,
      ratingCount: p.rating?.count || 0,
      inStock: p.variants?.some((v) => v.stock > 0) || false,
    }));

    res.json({
      products: publicProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      filters: {
        category,
        fabric,
        occasion,
        workType,
        colors,
        priceMin,
        priceMax,
        inStockOnly,
        sort,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/**
 * GET /api/public/products/:slug
 * Get single product detail by slug
 */
router.get("/products/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      slug,
      isPublished: true,
      status: "published",
    })
      .populate("categories.categoryId", "name slug type")
      .lean();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Increment view count (async, don't wait)
    Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).exec();

    // Transform for public consumption (hide internal fields)
    const publicProduct = {
      id: product._id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      categories: product.categories || [],
      fabric: product.fabric,
      borderType: product.borderType,
      occasion: product.occasion,
      workType: product.workType,
      weight: product.weight,
      blouseIncluded: product.blouseIncluded,
      price: {
        amount: product.price?.amount || null,
        currency: product.price?.currency || "INR",
      },
      colors: product.colors || {},
      images: product.imageGallery?.length
        ? product.imageGallery.map((img) => ({
            gridFsId: img.gridFsId,
            thumbnailGridFsId: img.thumbnailGridFsId,
            alt: img.alt,
            isPrimary: img.isPrimary,
          }))
        : [
            {
              gridFsId: product.images?.original?.gridFsId,
              thumbnailGridFsId: product.images?.thumbnail?.gridFsId,
              alt: product.name,
              isPrimary: true,
            },
          ],
      variants: product.variants || [],
      rating: product.rating || { average: 0, count: 0 },
      tags: product.tags || [],
      seo: product.seo || {},
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    res.json({ product: publicProduct });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// ===== SEARCH ROUTES =====

/**
 * POST /api/public/search
 * Search products (keyword + filters)
 * TODO: Add semantic search in Phase 1C
 */
router.post("/search", async (req, res) => {
  try {
    const {
      q, // Search query
      mode = "keyword", // "keyword" | "semantic" | "hybrid"
      page = 1,
      limit = 24,
      ...filters // fabric, occasion, colors, etc.
    } = req.body;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Build base query
    const query = {
      isPublished: true,
      status: "published",
    };

    // Keyword search using MongoDB text index
    if (mode === "keyword" || mode === "hybrid") {
      query.$text = { $search: q };
    }

    // Apply additional filters (reuse product listing filter logic)
    if (filters.fabric)
      query.fabric = {
        $in: Array.isArray(filters.fabric) ? filters.fabric : [filters.fabric],
      };
    if (filters.occasion)
      query.occasion = {
        $in: Array.isArray(filters.occasion)
          ? filters.occasion
          : [filters.occasion],
      };
    if (filters.workType)
      query.workType = {
        $in: Array.isArray(filters.workType)
          ? filters.workType
          : [filters.workType],
      };
    if (filters.colors) {
      const colorArray = Array.isArray(filters.colors)
        ? filters.colors
        : filters.colors.split(",");
      query["colors.names"] = { $in: colorArray };
    }
    if (filters.priceMin || filters.priceMax) {
      query["price.amount"] = {};
      if (filters.priceMin)
        query["price.amount"].$gte = Number(filters.priceMin);
      if (filters.priceMax)
        query["price.amount"].$lte = Number(filters.priceMax);
    }

    // Sort by text score
    const sortObj = { score: { $meta: "textScore" } };

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query, { score: { $meta: "textScore" } })
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select(
          "name slug price images imageGallery colors fabric occasion workType rating viewCount blouseIncluded",
        )
        .lean(),
      Product.countDocuments(query),
    ]);

    // Transform for public
    const publicProducts = products.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      price: p.price?.amount || null,
      currency: p.price?.currency || "INR",
      thumbnail:
        p.imageGallery?.[0]?.thumbnailGridFsId || p.images?.thumbnail?.gridFsId,
      colors: p.colors?.names || [],
      fabric: p.fabric || "",
      occasion: p.occasion || "",
      workType: p.workType || "",
      blouseIncluded: p.blouseIncluded || false,
      rating: p.rating?.average || 0,
      ratingCount: p.rating?.count || 0,
      score: p.score, // Text search relevance score
    }));

    res.json({
      query: q,
      mode,
      products: publicProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
});

/**
 * POST /api/public/search/visual
 * Visual search by image upload
 * TODO: Implement in Phase 1D with CLIP embeddings
 */
router.post("/search/visual", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // TODO: Phase 1D - Implement CLIP embedding generation and vector search
    // For now, return placeholder
    res.status(501).json({
      error: "Visual search not yet implemented",
      message: "This feature will be available in Phase 1D",
      uploadedFile: {
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("Error in visual search:", error);
    res.status(500).json({ error: "Visual search failed" });
  }
});

/**
 * GET /api/public/products/:id/similar
 * Find visually similar products
 * TODO: Implement in Phase 1D with CLIP embeddings
 */
router.get("/products/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 12 } = req.query;

    // Check if product exists and is published
    const product = await Product.findOne({
      _id: id,
      isPublished: true,
      status: "published",
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // TODO: Phase 1D - Use image embeddings for similarity
    // For now, find similar by category/fabric/occasion
    const query = {
      _id: { $ne: product._id },
      isPublished: true,
      status: "published",
      $or: [
        { fabric: product.fabric },
        { occasion: product.occasion },
        { "colors.families": { $in: product.colors?.families || [] } },
      ],
    };

    const similarProducts = await Product.find(query)
      .limit(parseInt(limit, 10))
      .select(
        "name slug price images imageGallery colors fabric occasion rating",
      )
      .lean();

    const publicProducts = similarProducts.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      price: p.price?.amount || null,
      thumbnail:
        p.imageGallery?.[0]?.thumbnailGridFsId || p.images?.thumbnail?.gridFsId,
      colors: p.colors?.names || [],
      fabric: p.fabric || "",
      occasion: p.occasion || "",
      rating: p.rating?.average || 0,
    }));

    res.json({
      similar: publicProducts,
      method: "attribute-based", // Will change to "visual-embedding" in Phase 1D
    });
  } catch (error) {
    console.error("Error finding similar products:", error);
    res.status(500).json({ error: "Failed to find similar products" });
  }
});

// ===== FILTER OPTIONS =====

/**
 * GET /api/public/filters
 * Get available filter options (for building filter UI)
 */
router.get("/filters", async (req, res) => {
  try {
    const query = { isPublished: true, status: "published" };

    // Get distinct values for each filter
    const [fabrics, occasions, workTypes, colors] = await Promise.all([
      Product.distinct("fabric", query),
      Product.distinct("occasion", query),
      Product.distinct("workType", query),
      Product.distinct("colors.names", query),
    ]);

    // Get price range
    const priceStats = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          min: { $min: "$price.amount" },
          max: { $max: "$price.amount" },
        },
      },
    ]);

    res.json({
      fabrics: fabrics.filter(Boolean).sort(),
      occasions: occasions.filter(Boolean).sort(),
      workTypes: workTypes.filter(Boolean).sort(),
      colors: colors.filter(Boolean).sort(),
      priceRange: priceStats[0] || { min: 0, max: 50000 },
    });
  } catch (error) {
    console.error("Error fetching filters:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

export default router;
