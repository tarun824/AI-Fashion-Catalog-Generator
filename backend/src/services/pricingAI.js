/**
 * AI Pricing Engine
 * Analyzes product data to suggest optimal pricing strategies
 */

/**
 * Calculate optimal price based on multiple factors
 * @param {Object} product - Product document
 * @param {Object} options - Analysis options
 * @returns {Object} Pricing recommendation with reasoning
 */
export const suggestOptimalPrice = (product, options = {}) => {
  const currentPrice = product.price?.amount || 0;
  const basePrice = currentPrice || 1000; // Fallback if no price set

  let adjustmentFactor = 1.0;
  const reasons = [];
  const insights = [];

  // Factor 1: Product Age (older = lower price)
  const ageInDays = Math.floor(
    (Date.now() - new Date(product.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (ageInDays > 180) {
    // Over 6 months old
    adjustmentFactor *= 0.85;
    reasons.push("Product age: 6+ months old (-15%)");
    insights.push({
      factor: "age",
      impact: -15,
      detail: `${ageInDays} days old`,
    });
  } else if (ageInDays > 90) {
    // Over 3 months old
    adjustmentFactor *= 0.92;
    reasons.push("Product age: 3-6 months old (-8%)");
    insights.push({
      factor: "age",
      impact: -8,
      detail: `${ageInDays} days old`,
    });
  } else if (ageInDays < 30) {
    // New product
    adjustmentFactor *= 1.05;
    reasons.push("New product: Less than 1 month old (+5%)");
    insights.push({ factor: "age", impact: 5, detail: "New arrival premium" });
  }

  // Factor 2: Stock Level (high stock = lower price)
  const totalStock = getTotalStock(product);

  if (totalStock > 50) {
    adjustmentFactor *= 0.88;
    reasons.push("High stock level: Clear inventory (-12%)");
    insights.push({
      factor: "stock",
      impact: -12,
      detail: `${totalStock} units`,
    });
  } else if (totalStock > 20) {
    adjustmentFactor *= 0.95;
    reasons.push("Moderate stock: Gentle discount (-5%)");
    insights.push({
      factor: "stock",
      impact: -5,
      detail: `${totalStock} units`,
    });
  } else if (totalStock < 5 && totalStock > 0) {
    adjustmentFactor *= 1.08;
    reasons.push("Low stock: Scarcity premium (+8%)");
    insights.push({
      factor: "stock",
      impact: 8,
      detail: `Only ${totalStock} left`,
    });
  }

  // Factor 3: Demand Score (views vs sales)
  const demandScore = calculateDemandScore(product);

  if (demandScore > 0.7) {
    adjustmentFactor *= 1.1;
    reasons.push("High demand: Strong interest (+10%)");
    insights.push({
      factor: "demand",
      impact: 10,
      detail: `Score: ${demandScore.toFixed(2)}`,
    });
  } else if (demandScore < 0.2 && product.viewCount > 50) {
    adjustmentFactor *= 0.9;
    reasons.push("Low conversion: Price resistance (-10%)");
    insights.push({
      factor: "demand",
      impact: -10,
      detail: `Score: ${demandScore.toFixed(2)}`,
    });
  }

  // Factor 4: Seasonal Adjustment
  const seasonalFactor = getSeasonalFactor(product);
  if (seasonalFactor !== 1.0) {
    adjustmentFactor *= seasonalFactor;
    const percentChange = Math.round((seasonalFactor - 1) * 100);
    reasons.push(
      `Seasonal demand: ${percentChange > 0 ? "+" : ""}${percentChange}%`,
    );
    insights.push({
      factor: "season",
      impact: percentChange,
      detail: getCurrentSeasonContext(),
    });
  }

  // Factor 5: Performance in Category
  if (options.categoryAvgPrice) {
    const priceVsCategory = currentPrice / options.categoryAvgPrice;

    if (priceVsCategory < 0.7) {
      adjustmentFactor *= 1.05;
      reasons.push("Underpriced vs category: Room to increase (+5%)");
      insights.push({
        factor: "category",
        impact: 5,
        detail: `Category avg: ₹${Math.round(options.categoryAvgPrice)}`,
      });
    } else if (priceVsCategory > 1.3) {
      adjustmentFactor *= 0.95;
      reasons.push("Premium priced: Consider lowering (-5%)");
      insights.push({
        factor: "category",
        impact: -5,
        detail: `Category avg: ₹${Math.round(options.categoryAvgPrice)}`,
      });
    }
  }

  // Calculate suggested price
  const suggestedPrice = Math.round(basePrice * adjustmentFactor);
  const priceChange = suggestedPrice - currentPrice;
  const priceChangePercent =
    currentPrice > 0 ? Math.round((priceChange / currentPrice) * 100) : 0;

  // Determine confidence level
  const confidence = calculateConfidence(product, insights);

  // Estimate ROI
  const estimatedROI = estimateROI(product, priceChange, totalStock);

  return {
    currentPrice,
    suggestedPrice,
    priceChange,
    priceChangePercent,
    adjustmentFactor: Math.round((adjustmentFactor - 1) * 100),
    reasons,
    insights,
    confidence,
    estimatedROI,
    recommendedAction: getRecommendedAction(
      priceChangePercent,
      confidence,
      totalStock,
    ),
  };
};

/**
 * Generate bulk pricing recommendations for multiple products
 * @param {Array} products - Array of product documents
 * @param {Object} categoryStats - Optional category statistics
 * @returns {Array} Array of pricing recommendations
 */
export const bulkPricingSuggestions = (products, categoryStats = {}) => {
  return products.map((product) => {
    const categoryAvgPrice = categoryStats[product.category]?.avgPrice;
    const suggestion = suggestOptimalPrice(product, { categoryAvgPrice });

    return {
      productId: product._id,
      sku: product.sku,
      name: product.name,
      ...suggestion,
    };
  });
};

/**
 * Suggest discount strategy for slow-moving products
 * @param {Object} product - Product document
 * @returns {Object} Discount recommendation
 */
export const suggestDiscountStrategy = (product) => {
  const ageInDays = Math.floor(
    (Date.now() - new Date(product.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const totalStock = getTotalStock(product);
  const demandScore = calculateDemandScore(product);
  const currentPrice = product.price?.amount || 0;

  // Determine discount tier
  let discountPercent = 0;
  let urgency = "low";
  let strategy = "";
  let timeline = "";

  if (ageInDays > 180 && totalStock > 10) {
    // Old stock, high inventory
    discountPercent = 30;
    urgency = "high";
    strategy = "Clearance Sale";
    timeline = "Immediate - 2 weeks";
  } else if (ageInDays > 120 && totalStock > 5) {
    discountPercent = 20;
    urgency = "medium";
    strategy = "End of Season Sale";
    timeline = "1-2 weeks";
  } else if (demandScore < 0.1 && product.viewCount > 30) {
    // High views but no sales
    discountPercent = 15;
    urgency = "medium";
    strategy = "Price Test Promotion";
    timeline = "1 week trial";
  } else if (totalStock > 30) {
    // Overstock situation
    discountPercent = 10;
    urgency = "low";
    strategy = "Volume Clearance";
    timeline = "3-4 weeks";
  } else {
    return {
      needsDiscount: false,
      reason: "Product performing within acceptable range",
    };
  }

  const discountedPrice = Math.round(
    currentPrice * (1 - discountPercent / 100),
  );
  const expectedSalesBoost = estimateSalesBoost(discountPercent);

  return {
    needsDiscount: true,
    currentPrice,
    discountPercent,
    discountedPrice,
    savings: currentPrice - discountedPrice,
    strategy,
    urgency,
    timeline,
    expectedSalesBoost,
    reasoning: [
      `Product age: ${ageInDays} days`,
      `Stock level: ${totalStock} units`,
      `Demand score: ${demandScore.toFixed(2)}`,
      `Views: ${product.viewCount || 0}`,
    ],
  };
};

/**
 * Analyze pricing history and trends (placeholder for future implementation)
 * @param {Object} product - Product document
 * @returns {Object} Price history analysis
 */
export const analyzePriceHistory = (product) => {
  // This would analyze price changes over time
  // For now, return basic info
  return {
    currentPrice: product.price?.amount || 0,
    suggestedPrice: product.price?.suggested || null,
    historicalChanges: [], // Future: track price changes
    averagePrice: product.price?.amount || 0,
    priceVolatility: "stable",
  };
};

/**
 * Competitive pricing analysis (mock for now)
 * @param {Object} product - Product document
 * @returns {Object} Competitive analysis
 */
export const competitivePricing = (product) => {
  const currentPrice = product.price?.amount || 0;

  // Mock competitor prices (in real implementation, fetch from competitor APIs)
  const competitorPrices = generateMockCompetitorPrices(currentPrice);

  const avgCompetitorPrice = Math.round(
    competitorPrices.reduce((sum, p) => sum + p.price, 0) /
      competitorPrices.length,
  );

  const pricePosition =
    currentPrice < avgCompetitorPrice * 0.9
      ? "low"
      : currentPrice > avgCompetitorPrice * 1.1
        ? "high"
        : "competitive";

  return {
    competitors: competitorPrices,
    averageMarketPrice: avgCompetitorPrice,
    yourPrice: currentPrice,
    pricePosition,
    recommendation: getPricePositionRecommendation(
      pricePosition,
      currentPrice,
      avgCompetitorPrice,
    ),
  };
};

// ==================== Helper Functions ====================

/**
 * Calculate total stock across all variants
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
 * Calculate demand score based on views and sales
 * Higher score = higher demand
 */
function calculateDemandScore(product) {
  const views = product.viewCount || 0;
  const sales = product.salesCount || 0; // Assuming this field exists or will be added

  if (views === 0) return 0;

  // Conversion rate as primary metric
  const conversionRate = sales / views;

  // Boost score for products with more views
  const popularityBoost = Math.min(views / 100, 1.0);

  return Math.min(conversionRate * 10 + popularityBoost * 0.3, 1.0);
}

/**
 * Get seasonal pricing factor
 * Wedding season, festivals, etc. affect fashion pricing
 */
function getSeasonalFactor(product) {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12

  // Wedding season in India: Oct-Feb
  const isWeddingSeason = month >= 10 || month <= 2;

  // Check if product is wedding-related
  const isWeddingProduct =
    product.occasion?.toLowerCase().includes("wedding") ||
    product.occasion?.toLowerCase().includes("bridal") ||
    product.tags?.some((tag) =>
      ["wedding", "bridal", "sangeet", "mehendi"].includes(tag.toLowerCase()),
    );

  if (isWeddingSeason && isWeddingProduct) {
    return 1.12; // +12% during wedding season
  }

  // Festive season: Sep-Nov (Diwali, Navratri, etc.)
  const isFestiveSeason = month >= 9 && month <= 11;
  const isFestiveProduct =
    product.occasion?.toLowerCase().includes("festive") ||
    product.occasion?.toLowerCase().includes("party") ||
    product.tags?.some((tag) =>
      ["festive", "party", "celebration"].includes(tag.toLowerCase()),
    );

  if (isFestiveSeason && isFestiveProduct) {
    return 1.08; // +8% during festive season
  }

  // Summer clearance: May-July
  if (month >= 5 && month <= 7) {
    return 0.92; // -8% summer discount
  }

  return 1.0; // No seasonal adjustment
}

/**
 * Get current season context for display
 */
function getCurrentSeasonContext() {
  const month = new Date().getMonth() + 1;

  if (month >= 10 || month <= 2) return "Wedding season premium";
  if (month >= 9 && month <= 11) return "Festive season boost";
  if (month >= 5 && month <= 7) return "Summer clearance";
  return "Regular pricing period";
}

/**
 * Calculate confidence level for pricing suggestion
 * Based on data quality and product history
 */
function calculateConfidence(product, insights) {
  let confidenceScore = 50; // Base confidence

  // More views = more confidence
  if (product.viewCount > 100) confidenceScore += 20;
  else if (product.viewCount > 50) confidenceScore += 10;

  // Older products have more historical data
  const ageInDays = Math.floor(
    (Date.now() - new Date(product.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (ageInDays > 90) confidenceScore += 15;
  else if (ageInDays > 30) confidenceScore += 10;

  // Multiple insights = higher confidence
  if (insights.length >= 4) confidenceScore += 15;

  confidenceScore = Math.min(confidenceScore, 95); // Cap at 95%

  if (confidenceScore >= 80) return { level: "high", score: confidenceScore };
  if (confidenceScore >= 60) return { level: "medium", score: confidenceScore };
  return { level: "low", score: confidenceScore };
}

/**
 * Estimate ROI from price change
 */
function estimateROI(product, priceChange, totalStock) {
  if (priceChange === 0 || totalStock === 0) {
    return {
      estimatedRevenueChange: 0,
      estimatedSalesChange: 0,
      paybackPeriod: "N/A",
    };
  }

  // Estimate elasticity: -1% price = +0.5% sales (fashion is somewhat elastic)
  const priceChangePercent = (priceChange / product.price.amount) * 100;
  const salesChangePercent = -priceChangePercent * 0.5;

  // Estimate current sales rate (rough approximation)
  const monthlySalesEstimate = Math.max(product.salesCount || 2, 2);
  const estimatedSalesChange = Math.round(
    (monthlySalesEstimate * salesChangePercent) / 100,
  );

  // Revenue impact
  const currentRevenue = monthlySalesEstimate * product.price.amount;
  const newSalesVolume = monthlySalesEstimate + estimatedSalesChange;
  const newRevenue = newSalesVolume * (product.price.amount + priceChange);
  const estimatedRevenueChange = Math.round(newRevenue - currentRevenue);

  return {
    estimatedRevenueChange,
    estimatedSalesChange,
    paybackPeriod: "Immediate",
    confidence: "moderate",
  };
}

/**
 * Get recommended action based on analysis
 */
function getRecommendedAction(priceChangePercent, confidence, totalStock) {
  const absChange = Math.abs(priceChangePercent);

  if (absChange < 3) {
    return {
      action: "maintain",
      priority: "low",
      message: "Current pricing is optimal",
    };
  }

  if (priceChangePercent > 0 && confidence.level === "high") {
    return {
      action: "increase",
      priority: "medium",
      message: `Increase price by ${Math.round(priceChangePercent)}%`,
    };
  }

  if (priceChangePercent < 0 && totalStock > 20) {
    return {
      action: "decrease",
      priority: "high",
      message: `Reduce price by ${Math.round(Math.abs(priceChangePercent))}% to clear stock`,
    };
  }

  if (priceChangePercent < 0) {
    return {
      action: "decrease",
      priority: "medium",
      message: `Consider ${Math.round(Math.abs(priceChangePercent))}% discount`,
    };
  }

  return {
    action: "review",
    priority: "low",
    message: "Monitor performance before changes",
  };
}

/**
 * Estimate sales boost from discount
 */
function estimateSalesBoost(discountPercent) {
  // Fashion products typically see 2x sales boost per 10% discount
  const boostMultiplier = (discountPercent / 10) * 2;
  return {
    multiplier: 1 + boostMultiplier,
    description: `${Math.round(boostMultiplier * 100)}% increase expected`,
  };
}

/**
 * Generate mock competitor prices for demonstration
 */
function generateMockCompetitorPrices(currentPrice) {
  const base = currentPrice || 1000;
  return [
    {
      competitor: "StyleBazaar",
      price: Math.round(base * 0.95),
      inStock: true,
    },
    { competitor: "FashionHub", price: Math.round(base * 1.08), inStock: true },
    {
      competitor: "TrendyStore",
      price: Math.round(base * 1.02),
      inStock: false,
    },
    { competitor: "SareeWorld", price: Math.round(base * 0.88), inStock: true },
  ];
}

/**
 * Get recommendation based on price position
 */
function getPricePositionRecommendation(position, yourPrice, avgPrice) {
  if (position === "low") {
    return {
      message: "You're priced below market average",
      suggestion: `Consider raising price to ₹${Math.round(avgPrice * 0.95)} to capture more value`,
      impact: "Increase revenue by 5-10%",
    };
  }

  if (position === "high") {
    return {
      message: "You're priced above market average",
      suggestion: `Consider lowering to ₹${Math.round(avgPrice * 1.05)} to stay competitive`,
      impact: "Increase sales by 15-20%",
    };
  }

  return {
    message: "Your pricing is competitive",
    suggestion: "Maintain current price or test minor increases",
    impact: "Stable position",
  };
}
