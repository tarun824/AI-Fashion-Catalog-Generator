import express from "express";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  suggestOptimalPrice,
  bulkPricingSuggestions,
  suggestDiscountStrategy,
  competitivePricing,
} from "../services/pricingAI.js";
import {
  predictStockout,
  suggestReorderQuantity,
  identifySlowMovers,
  identifyFastMovers,
  suggestBundles,
  detectDeadStock,
  generateInventoryAlerts,
} from "../services/inventoryAI.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/inventory/alerts
 * Get comprehensive inventory alerts (low stock, overstock, dead stock)
 */
router.get("/alerts", async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: "archived" } })
      .select(
        "sku name variants lowStockThreshold status createdAt salesCount lastSoldAt",
      )
      .lean();

    const alerts = generateInventoryAlerts(products);

    res.json({
      success: true,
      alerts,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating inventory alerts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate inventory alerts",
    });
  }
});

/**
 * GET /api/admin/inventory/insights
 * Get AI-powered inventory insights and recommendations
 */
router.get("/insights", async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: "archived" } })
      .select(
        "sku name variants price category occasion tags createdAt salesCount lastSoldAt viewCount",
      )
      .lean();

    // Generate various insights
    const slowMovers = identifySlowMovers(products);
    const fastMovers = identifyFastMovers(products);
    const deadStock = detectDeadStock(products);
    const bundles = suggestBundles(products);

    // Calculate summary statistics
    const totalValue = products.reduce((sum, p) => {
      const stock = p.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
      return sum + stock * (p.price?.amount || 0);
    }, 0);

    const insights = {
      summary: {
        totalProducts: products.length,
        totalInventoryValue: Math.round(totalValue),
        slowMovers: slowMovers.length,
        fastMovers: fastMovers.length,
        deadStock: deadStock.length,
        bundleOpportunities: bundles.length,
      },
      topSlowMovers: slowMovers.slice(0, 10),
      topFastMovers: fastMovers.slice(0, 10),
      deadStock: deadStock.slice(0, 10),
      bundleSuggestions: bundles.slice(0, 5),
    };

    res.json({
      success: true,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating inventory insights:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate inventory insights",
    });
  }
});

/**
 * POST /api/admin/inventory/pricing-suggestions
 * Get AI pricing suggestions for products
 * Body: { productIds?: string[] } - optional array to filter specific products
 */
router.post("/pricing-suggestions", async (req, res) => {
  try {
    const { productIds } = req.body;

    // Build query
    const query = { status: { $ne: "archived" } };
    if (productIds && productIds.length > 0) {
      query._id = { $in: productIds };
    }

    const products = await Product.find(query)
      .select(
        "sku name price variants category occasion tags createdAt salesCount viewCount",
      )
      .limit(100) // Limit to prevent overload
      .lean();

    if (products.length === 0) {
      return res.json({
        success: true,
        suggestions: [],
        message: "No products found",
      });
    }

    // Calculate category statistics for better recommendations
    const categoryStats = {};
    products.forEach((p) => {
      if (p.category && p.price?.amount) {
        if (!categoryStats[p.category]) {
          categoryStats[p.category] = { total: 0, count: 0 };
        }
        categoryStats[p.category].total += p.price.amount;
        categoryStats[p.category].count++;
      }
    });

    // Calculate averages
    Object.keys(categoryStats).forEach((cat) => {
      categoryStats[cat].avgPrice =
        categoryStats[cat].total / categoryStats[cat].count;
    });

    // Generate pricing suggestions
    const suggestions = bulkPricingSuggestions(products, categoryStats);

    // Add discount strategies for products needing them
    suggestions.forEach((suggestion) => {
      const product = products.find(
        (p) => p._id.toString() === suggestion.productId.toString(),
      );
      if (product) {
        const discountStrategy = suggestDiscountStrategy(product);
        suggestion.discountStrategy = discountStrategy;
      }
    });

    // Sort by potential impact (highest price change first)
    suggestions.sort(
      (a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange),
    );

    res.json({
      success: true,
      suggestions,
      totalProducts: suggestions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating pricing suggestions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate pricing suggestions",
    });
  }
});

/**
 * POST /api/admin/inventory/bulk-price-update
 * Apply bulk price updates
 * Body: { updates: [{ productId, newPrice }] }
 */
router.post("/bulk-price-update", async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Updates array is required",
      });
    }

    const results = {
      successful: [],
      failed: [],
    };

    // Process each update
    for (const update of updates) {
      try {
        const { productId, newPrice } = update;

        if (!productId || typeof newPrice !== "number" || newPrice < 0) {
          results.failed.push({
            productId,
            error: "Invalid productId or newPrice",
          });
          continue;
        }

        const product = await Product.findById(productId);
        if (!product) {
          results.failed.push({
            productId,
            error: "Product not found",
          });
          continue;
        }

        // Update price
        const oldPrice = product.price?.amount || 0;
        product.price.amount = newPrice;

        // Update price history (if you add this field later)
        // product.priceHistory = product.priceHistory || [];
        // product.priceHistory.push({
        //   oldPrice,
        //   newPrice,
        //   changedAt: new Date(),
        //   changedBy: req.admin._id,
        // });

        await product.save();

        results.successful.push({
          productId,
          sku: product.sku,
          name: product.name,
          oldPrice,
          newPrice,
        });
      } catch (error) {
        results.failed.push({
          productId: update.productId,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        total: updates.length,
        successful: results.successful.length,
        failed: results.failed.length,
      },
    });
  } catch (error) {
    console.error("Error applying bulk price updates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to apply bulk price updates",
    });
  }
});

/**
 * GET /api/admin/inventory/slow-movers
 * Get list of slow-moving products with recommendations
 */
router.get("/slow-movers", async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: "archived" } })
      .select(
        "sku name variants price category occasion tags createdAt salesCount viewCount lastSoldAt",
      )
      .lean();

    const slowMovers = identifySlowMovers(products);

    res.json({
      success: true,
      slowMovers,
      count: slowMovers.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error identifying slow movers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to identify slow-moving products",
    });
  }
});

/**
 * GET /api/admin/inventory/fast-movers
 * Get list of fast-moving products
 */
router.get("/fast-movers", async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: "archived" } })
      .select(
        "sku name variants price category occasion tags createdAt salesCount viewCount",
      )
      .lean();

    const fastMovers = identifyFastMovers(products);

    res.json({
      success: true,
      fastMovers,
      count: fastMovers.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error identifying fast movers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to identify fast-moving products",
    });
  }
});

/**
 * GET /api/admin/inventory/bundles
 * Get AI-suggested product bundles
 */
router.get("/bundles", async (req, res) => {
  try {
    const products = await Product.find({
      status: "published",
      isPublished: true,
    })
      .select("sku name price category occasion tags variants")
      .lean();

    const bundles = suggestBundles(products);

    res.json({
      success: true,
      bundles,
      count: bundles.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating bundle suggestions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate bundle suggestions",
    });
  }
});

/**
 * GET /api/admin/inventory/dead-stock
 * Get dead stock items (no sales in 6+ months)
 */
router.get("/dead-stock", async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: "archived" } })
      .select("sku name variants price createdAt salesCount lastSoldAt")
      .lean();

    const deadStock = detectDeadStock(products);

    res.json({
      success: true,
      deadStock,
      count: deadStock.length,
      totalValue: deadStock.reduce((sum, item) => sum + item.currentValue, 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error detecting dead stock:", error);
    res.status(500).json({
      success: false,
      error: "Failed to detect dead stock",
    });
  }
});

/**
 * GET /api/admin/inventory/stockout-prediction/:productId
 * Get detailed stockout prediction for a specific product
 */
router.get("/stockout-prediction/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .select("sku name variants price createdAt salesCount")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const prediction = predictStockout(product);
    const reorderSuggestion = suggestReorderQuantity(product);

    res.json({
      success: true,
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
      },
      prediction,
      reorderSuggestion,
    });
  } catch (error) {
    console.error("Error predicting stockout:", error);
    res.status(500).json({
      success: false,
      error: "Failed to predict stockout",
    });
  }
});

/**
 * GET /api/admin/inventory/competitive-pricing/:productId
 * Get competitive pricing analysis for a product
 */
router.get("/competitive-pricing/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .select("sku name price category")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const analysis = competitivePricing(product);

    res.json({
      success: true,
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
      },
      analysis,
    });
  } catch (error) {
    console.error("Error analyzing competitive pricing:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze competitive pricing",
    });
  }
});

/**
 * GET /api/admin/inventory/price-suggestion/:productId
 * Get detailed price suggestion for a specific product
 */
router.get("/price-suggestion/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .select(
        "sku name price variants category occasion tags createdAt salesCount viewCount",
      )
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Get category average price
    const categoryProducts = await Product.find({
      category: product.category,
      "price.amount": { $exists: true, $ne: null },
      status: { $ne: "archived" },
    })
      .select("price")
      .lean();

    const categoryAvgPrice =
      categoryProducts.length > 0
        ? categoryProducts.reduce((sum, p) => sum + (p.price?.amount || 0), 0) /
          categoryProducts.length
        : null;

    const suggestion = suggestOptimalPrice(product, { categoryAvgPrice });
    const discountStrategy = suggestDiscountStrategy(product);

    res.json({
      success: true,
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
      },
      suggestion,
      discountStrategy,
    });
  } catch (error) {
    console.error("Error generating price suggestion:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate price suggestion",
    });
  }
});

/**
 * POST /api/admin/inventory/apply-suggestion/:productId
 * Apply AI pricing suggestion to a product
 */
router.post("/apply-suggestion/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { suggestedPrice } = req.body;

    if (typeof suggestedPrice !== "number" || suggestedPrice < 0) {
      return res.status(400).json({
        success: false,
        error: "Valid suggestedPrice is required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const oldPrice = product.price?.amount || 0;
    product.price.amount = suggestedPrice;

    await product.save();

    res.json({
      success: true,
      message: "Price updated successfully",
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
        oldPrice,
        newPrice: suggestedPrice,
        change: suggestedPrice - oldPrice,
        changePercent:
          oldPrice > 0
            ? Math.round(((suggestedPrice - oldPrice) / oldPrice) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error applying price suggestion:", error);
    res.status(500).json({
      success: false,
      error: "Failed to apply price suggestion",
    });
  }
});

export default router;
