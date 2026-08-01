/**
 * Inventory Intelligence Service
 * AI-powered inventory predictions, alerts, and optimization suggestions
 */

/**
 * Predict when stock will run out based on sales velocity
 * @param {Object} product - Product document
 * @returns {Object} Stockout prediction
 */
export const predictStockout = (product) => {
  const totalStock = getTotalStock(product);

  if (totalStock === 0) {
    return {
      status: "out_of_stock",
      daysUntilStockout: 0,
      urgency: "critical",
      message: "Product is out of stock",
    };
  }

  // Calculate sales velocity (units per day)
  const ageInDays = Math.max(
    Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
    1,
  );

  const salesCount = product.salesCount || 0;
  const salesVelocity = salesCount / ageInDays;

  if (salesVelocity === 0) {
    return {
      status: "no_movement",
      daysUntilStockout: Infinity,
      urgency: "none",
      message: "No sales activity detected",
      salesVelocity: 0,
    };
  }

  const daysUntilStockout = Math.floor(totalStock / salesVelocity);

  let urgency = "none";
  let status = "healthy";
  let message = `Stock will last approximately ${daysUntilStockout} days`;

  if (daysUntilStockout <= 7) {
    urgency = "critical";
    status = "critical";
    message = `Critical: Only ${daysUntilStockout} days of stock remaining`;
  } else if (daysUntilStockout <= 14) {
    urgency = "high";
    status = "warning";
    message = `Low stock: ${daysUntilStockout} days remaining`;
  } else if (daysUntilStockout <= 30) {
    urgency = "medium";
    status = "monitor";
    message = `Monitor: ${daysUntilStockout} days of stock`;
  }

  return {
    status,
    urgency,
    message,
    daysUntilStockout,
    currentStock: totalStock,
    salesVelocity: parseFloat(salesVelocity.toFixed(2)),
    estimatedStockoutDate: new Date(
      Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000,
    ),
  };
};

/**
 * Suggest optimal reorder quantity using Economic Order Quantity (EOQ) principles
 * @param {Object} product - Product document
 * @param {Object} options - Calculation options
 * @returns {Object} Reorder recommendation
 */
export const suggestReorderQuantity = (product, options = {}) => {
  const {
    leadTimeDays = 14, // Default 2 weeks lead time
    safetyStockDays = 7, // Default 1 week safety stock
    orderingCost = 500, // Default ordering cost in INR
    holdingCostPercent = 0.25, // 25% annual holding cost
  } = options;

  const ageInDays = Math.max(
    Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
    1,
  );

  const salesCount = product.salesCount || 0;
  const dailySales = salesCount / ageInDays;

  if (dailySales === 0) {
    return {
      recommended: false,
      reason: "No sales history - cannot calculate reorder quantity",
      suggestedAction: "Monitor sales for at least 30 days before reordering",
    };
  }

  // Calculate reorder point (ROP)
  const leadTimeDemand = dailySales * leadTimeDays;
  const safetyStock = dailySales * safetyStockDays;
  const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

  // Calculate Economic Order Quantity (EOQ)
  const annualDemand = dailySales * 365;
  const unitCost = product.price?.amount || 1000;
  const holdingCostPerUnit = unitCost * holdingCostPercent;

  const eoq = Math.ceil(
    Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit),
  );

  // Adjust EOQ based on current stock level
  const currentStock = getTotalStock(product);
  const optimalOrderQty = Math.max(eoq, reorderPoint - currentStock);

  // Calculate costs
  const orderCost = orderingCost;
  const holdingCost = (optimalOrderQty / 2) * holdingCostPerUnit;
  const totalCost = orderCost + holdingCost;

  return {
    recommended: currentStock < reorderPoint,
    currentStock,
    reorderPoint,
    suggestedQuantity: optimalOrderQty,
    safetyStock,
    dailySalesRate: parseFloat(dailySales.toFixed(2)),
    leadTimeDays,
    costBreakdown: {
      orderingCost: Math.round(orderCost),
      holdingCost: Math.round(holdingCost),
      totalCost: Math.round(totalCost),
    },
    timing:
      currentStock < reorderPoint
        ? "Order now"
        : `Order when stock reaches ${reorderPoint}`,
  };
};

/**
 * Identify slow-moving products
 * @param {Array} products - Array of product documents
 * @param {Object} thresholds - Performance thresholds
 * @returns {Array} Slow-moving products with analysis
 */
export const identifySlowMovers = (products, thresholds = {}) => {
  const {
    minDaysOld = 60,
    maxSalesVelocity = 0.1, // Less than 0.1 sales per day
    minStock = 5,
  } = thresholds;

  const slowMovers = [];

  products.forEach((product) => {
    const ageInDays = Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (ageInDays < minDaysOld) return; // Skip new products

    const totalStock = getTotalStock(product);
    if (totalStock < minStock) return; // Skip low-stock items

    const salesCount = product.salesCount || 0;
    const salesVelocity = salesCount / ageInDays;

    if (salesVelocity <= maxSalesVelocity) {
      const daysOfStock =
        salesVelocity > 0 ? totalStock / salesVelocity : Infinity;

      slowMovers.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: totalStock,
        ageInDays,
        salesCount,
        salesVelocity: parseFloat(salesVelocity.toFixed(3)),
        daysOfStock: isFinite(daysOfStock) ? Math.round(daysOfStock) : "N/A",
        severity: getSeverity(salesVelocity, ageInDays, totalStock),
        recommendations: getSlowMoverRecommendations(
          product,
          salesVelocity,
          ageInDays,
          totalStock,
        ),
      });
    }
  });

  // Sort by severity
  return slowMovers.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

/**
 * Identify fast-moving products
 * @param {Array} products - Array of product documents
 * @param {Object} thresholds - Performance thresholds
 * @returns {Array} Fast-moving products
 */
export const identifyFastMovers = (products, thresholds = {}) => {
  const {
    minSalesVelocity = 1.0, // At least 1 sale per day
    minDaysOld = 14,
  } = thresholds;

  const fastMovers = [];

  products.forEach((product) => {
    const ageInDays = Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (ageInDays < minDaysOld) return; // Skip very new products

    const salesCount = product.salesCount || 0;
    const salesVelocity = salesCount / ageInDays;

    if (salesVelocity >= minSalesVelocity) {
      const totalStock = getTotalStock(product);
      const stockout = predictStockout(product);

      fastMovers.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: totalStock,
        salesVelocity: parseFloat(salesVelocity.toFixed(2)),
        salesCount,
        viewCount: product.viewCount || 0,
        conversionRate:
          product.viewCount > 0
            ? parseFloat(((salesCount / product.viewCount) * 100).toFixed(2))
            : 0,
        stockoutRisk: stockout,
        reorderSuggestion: suggestReorderQuantity(product),
        performance: "excellent",
      });
    }
  });

  // Sort by sales velocity (highest first)
  return fastMovers.sort((a, b) => b.salesVelocity - a.salesVelocity);
};

/**
 * Suggest product bundles based on complementary items
 * @param {Array} products - Array of product documents
 * @returns {Array} Bundle suggestions
 */
export const suggestBundles = (products) => {
  const bundles = [];

  // Group products by category/occasion
  const categoryGroups = {};
  products.forEach((product) => {
    const category = product.category || "general";
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(product);
  });

  // Find complementary products
  Object.entries(categoryGroups).forEach(([category, items]) => {
    if (items.length < 2) return;

    // Example: Bundle different colors of same style
    const byOccasion = {};
    items.forEach((item) => {
      const occasion = item.occasion || "casual";
      if (!byOccasion[occasion]) byOccasion[occasion] = [];
      byOccasion[occasion].push(item);
    });

    Object.entries(byOccasion).forEach(([occasion, occasionItems]) => {
      if (occasionItems.length >= 2) {
        // Create bundle of 2-3 items
        for (let i = 0; i < occasionItems.length - 1; i++) {
          const item1 = occasionItems[i];
          const item2 = occasionItems[i + 1];

          const bundlePrice =
            (item1.price?.amount || 0) + (item2.price?.amount || 0);
          const discountedPrice = Math.round(bundlePrice * 0.85); // 15% bundle discount

          bundles.push({
            bundleId: `${item1.sku}-${item2.sku}`,
            name: `${occasion} Collection Bundle`,
            products: [
              {
                sku: item1.sku,
                name: item1.name,
                price: item1.price?.amount || 0,
              },
              {
                sku: item2.sku,
                name: item2.name,
                price: item2.price?.amount || 0,
              },
            ],
            regularPrice: bundlePrice,
            bundlePrice: discountedPrice,
            savings: bundlePrice - discountedPrice,
            savingsPercent: 15,
            reason: `Popular ${occasion} combination`,
            estimatedDemand: "medium",
          });
        }
      }
    });
  });

  // Return top bundles (limit to 20)
  return bundles.slice(0, 20);
};

/**
 * Detect dead stock (no sales in 6 months with inventory)
 * @param {Array} products - Array of product documents
 * @returns {Array} Dead stock items
 */
export const detectDeadStock = (products) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const deadStock = [];

  products.forEach((product) => {
    const totalStock = getTotalStock(product);
    if (totalStock === 0) return; // Skip out-of-stock

    const productAge = new Date(product.createdAt);
    const lastSoldDate = product.lastSoldAt
      ? new Date(product.lastSoldAt)
      : null;

    // Product older than 6 months
    const isOldProduct = productAge < sixMonthsAgo;

    // No sales in 6 months (or never sold)
    const noRecentSales = !lastSoldDate || lastSoldDate < sixMonthsAgo;

    if (isOldProduct && noRecentSales && totalStock > 0) {
      const ageInMonths = Math.floor(
        (Date.now() - productAge.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );

      const currentValue = totalStock * (product.price?.amount || 0);

      deadStock.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: totalStock,
        ageInMonths,
        currentValue,
        lastSoldAt: lastSoldDate || "Never",
        recommendations: [
          {
            action: "deep_discount",
            discount: "50-70%",
            message: "Apply deep discount to clear inventory",
          },
          {
            action: "donate",
            message: "Consider donation for tax benefits",
          },
          {
            action: "bundle",
            message: "Include as bonus in popular product bundles",
          },
        ],
      });
    }
  });

  return deadStock.sort((a, b) => b.currentValue - a.currentValue);
};

/**
 * Generate comprehensive inventory alerts
 * @param {Array} products - Array of product documents
 * @returns {Object} Categorized alerts
 */
export const generateInventoryAlerts = (products) => {
  const alerts = {
    critical: [],
    warnings: [],
    opportunities: [],
    summary: {
      totalProducts: products.length,
      lowStock: 0,
      overstock: 0,
      deadStock: 0,
      fastMoving: 0,
    },
  };

  products.forEach((product) => {
    const totalStock = getTotalStock(product);
    const stockout = predictStockout(product);
    const lowStockThreshold = product.lowStockThreshold || 5;

    // Critical alerts
    if (totalStock === 0 && product.status === "published") {
      alerts.critical.push({
        type: "out_of_stock",
        productId: product._id,
        sku: product.sku,
        name: product.name,
        message: "Product is out of stock and still published",
        action: "Reorder immediately or unpublish",
      });
    } else if (totalStock > 0 && totalStock <= lowStockThreshold) {
      alerts.critical.push({
        type: "low_stock",
        productId: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: totalStock,
        threshold: lowStockThreshold,
        message: `Stock below threshold (${totalStock}/${lowStockThreshold})`,
        daysUntilStockout: stockout.daysUntilStockout,
      });
      alerts.summary.lowStock++;
    }

    // Warnings
    if (totalStock > 50) {
      alerts.warnings.push({
        type: "overstock",
        productId: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: totalStock,
        message: "High inventory level - consider promotion",
      });
      alerts.summary.overstock++;
    }

    // Check for dead stock
    const ageInDays = Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (ageInDays > 180 && (product.salesCount || 0) === 0 && totalStock > 0) {
      alerts.warnings.push({
        type: "dead_stock",
        productId: product._id,
        sku: product.sku,
        name: product.name,
        ageInDays,
        currentStock: totalStock,
        message: "No sales in 6+ months",
      });
      alerts.summary.deadStock++;
    }

    // Opportunities (fast movers)
    const salesVelocity = (product.salesCount || 0) / Math.max(ageInDays, 1);
    if (salesVelocity >= 0.5 && totalStock > 0) {
      alerts.opportunities.push({
        type: "fast_mover",
        productId: product._id,
        sku: product.sku,
        name: product.name,
        salesVelocity: parseFloat(salesVelocity.toFixed(2)),
        message: "High demand - consider increasing inventory",
      });
      alerts.summary.fastMoving++;
    }
  });

  return alerts;
};

// ==================== Helper Functions ====================

/**
 * Get total stock across all variants
 */
function getTotalStock(product) {
  if (!product.variants || product.variants.length === 0) {
    return 0;
  }
  return product.variants.reduce(
    (total, variant) => total + (variant.stock || 0),
    0,
  );
}

/**
 * Determine severity level for slow movers
 */
function getSeverity(salesVelocity, ageInDays, stock) {
  const daysOfStock = salesVelocity > 0 ? stock / salesVelocity : Infinity;

  if (salesVelocity === 0 && ageInDays > 180) return "critical";
  if (daysOfStock > 365) return "critical";
  if (daysOfStock > 180) return "high";
  if (daysOfStock > 90) return "medium";
  return "low";
}

/**
 * Get recommendations for slow-moving products
 */
function getSlowMoverRecommendations(product, salesVelocity, ageInDays, stock) {
  const recommendations = [];

  if (salesVelocity === 0) {
    recommendations.push({
      action: "Price reduction",
      detail: "Apply 20-30% discount to stimulate demand",
    });
    recommendations.push({
      action: "Marketing boost",
      detail: "Feature in homepage or social media",
    });
  }

  if (stock > 20) {
    recommendations.push({
      action: "Bundle offer",
      detail: "Create bundle with popular items",
    });
  }

  if (ageInDays > 180) {
    recommendations.push({
      action: "Clearance sale",
      detail: "Move to clearance section with deep discount",
    });
  }

  return recommendations;
}
