import express from "express";
import Product from "../models/Product.js";
import { optionalAuthMiddleware } from "../middleware/auth.js";
import { parseNaturalQuery } from "../utils/naturalSearch.js";

const router = express.Router();

// Optional auth - works with or without token
router.use(optionalAuthMiddleware);

/**
 * POST /api/search/products
 * Search products with text, colors, and filters
 */
router.post("/products", async (req, res) => {
  try {
    const filters = {
      text: req.body.text,
      colors: req.body.colors,
      colorMode: req.body.colorMode || "any",
      colorFamilies: req.body.colorFamilies,
      minColorPercent: req.body.minColorPercent,
      status: req.body.status || "published", // Default to published for public search
      category: req.body.category,
      minPrice: req.body.minPrice,
      maxPrice: req.body.maxPrice,
      tags: req.body.tags,
      dateFrom: req.body.dateFrom,
      dateTo: req.body.dateTo,
      sortBy: req.body.sortBy || "createdAt",
      order: req.body.order || "desc",
      page: parseInt(req.body.page) || 1,
      limit: parseInt(req.body.limit) || 20,
    };

    // Admin can search all statuses, others only published
    if (!req.admin && filters.status !== "published") {
      filters.status = "published";
    }

    const result = await Product.searchProducts(filters);

    res.json({
      success: true,
      data: result.results,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({
      success: false,
      error: "Search failed",
    });
  }
});

/**
 * POST /api/search/natural
 * Parse a free-text query (e.g. "blue organza under 4000 for bridal")
 * into structured filters and search
 */
router.post("/natural", async (req, res) => {
  try {
    const { query, page, limit } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: "Query text is required",
      });
    }

    const parsedFilters = parseNaturalQuery(query);

    const filters = {
      ...parsedFilters,
      status: req.admin ? undefined : "published",
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    };

    const result = await Product.searchProducts(filters);

    res.json({
      success: true,
      data: result.results,
      pagination: result.pagination,
      parsedFilters,
    });
  } catch (error) {
    console.error("Natural search error:", error);
    res.status(500).json({
      success: false,
      error: "Natural language search failed",
    });
  }
});

/**
 * POST /api/search/color
 * Search products by color filters only
 */
router.post("/color", async (req, res) => {
  try {
    const { colors, mode, families, minPercentage } = req.body;

    const filters = {
      colors,
      colorMode: mode || "any",
      colorFamilies: families,
      minColorPercent: minPercentage,
      status: req.admin ? req.body.status : "published",
      page: parseInt(req.body.page) || 1,
      limit: parseInt(req.body.limit) || 20,
    };

    const result = await Product.searchProducts(filters);

    res.json({
      success: true,
      data: result.results,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Color search error:", error);
    res.status(500).json({
      success: false,
      error: "Color search failed",
    });
  }
});

/**
 * GET /api/search/suggestions
 * Get search term suggestions/autocomplete
 */
router.get("/suggestions", async (req, res) => {
  try {
    const query = req.query.q || "";
    const limit = parseInt(req.query.limit) || 5;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get unique keywords that match the query
    const suggestions = await Product.distinct("searchKeywords", {
      searchKeywords: { $regex: `^${query}`, $options: "i" },
      status: req.admin ? undefined : "published",
    });

    // Limit and return
    res.json({
      success: true,
      data: suggestions.slice(0, limit),
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get suggestions",
    });
  }
});

/**
 * GET /api/search/colors
 * Get all unique colors from products
 */
router.get("/colors", async (req, res) => {
  try {
    const colors = await Product.distinct("colors.names", {
      status: req.admin ? undefined : "published",
    });

    res.json({
      success: true,
      data: colors.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("Get colors error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get colors",
    });
  }
});

/**
 * GET /api/search/categories
 * Get all unique categories from products
 */
router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category", {
      status: req.admin ? undefined : "published",
    });

    res.json({
      success: true,
      data: categories.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get categories",
    });
  }
});

/**
 * GET /api/search/tags
 * Get all unique tags from products
 */
router.get("/tags", async (req, res) => {
  try {
    const tags = await Product.distinct("tags", {
      status: req.admin ? undefined : "published",
    });

    res.json({
      success: true,
      data: tags.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("Get tags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get tags",
    });
  }
});

export default router;
