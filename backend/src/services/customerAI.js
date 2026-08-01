import Customer from "../models/Customer.js";

/**
 * AI Customer Segmentation Service
 * Automatically analyzes customers and assigns intelligent segments and risk scores
 */

// VIP Thresholds (configurable via environment)
const VIP_SPENT_THRESHOLD = parseInt(process.env.VIP_SPENT_THRESHOLD) || 50000; // ₹50,000
const VIP_ORDERS_THRESHOLD = parseInt(process.env.VIP_ORDERS_THRESHOLD) || 10;

// Regular Customer Thresholds
const REGULAR_ORDERS_THRESHOLD =
  parseInt(process.env.REGULAR_ORDERS_THRESHOLD) || 3;

// Inactive Threshold
const INACTIVE_DAYS = parseInt(process.env.INACTIVE_DAYS) || 90;

/**
 * Analyze a single customer and update their intelligence data
 */
export async function analyzeCustomer(customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Determine Customer Type
  const customerType = determineCustomerType(customer);

  // Calculate Lifetime Value
  const lifetimeValue = calculateLifetimeValue(customer);

  // Determine Churn Risk
  const churnRisk = determineChurnRisk(customer);

  // Calculate Engagement Score
  const engagementScore = calculateEngagementScore(customer);

  // Auto-assign Tags
  const tags = generateAutoTags(customer);

  // Update customer
  customer.customerType = customerType;
  customer.intelligence.lifetimeValue = lifetimeValue;
  customer.intelligence.churnRisk = churnRisk;
  customer.intelligence.engagementScore = engagementScore;
  customer.intelligence.lastAnalyzedAt = new Date();

  // Merge auto-tags with existing custom tags
  const customTags = customer.tags.filter((tag) => !isAutoTag(tag));
  customer.tags = [...new Set([...customTags, ...tags])];

  await customer.save();

  return customer;
}

/**
 * Bulk analyze all customers (run this periodically via cron)
 */
export async function analyzeAllCustomers() {
  const customers = await Customer.find({});
  const results = {
    total: customers.length,
    updated: 0,
    vipPromoted: 0,
    inactiveMarked: 0,
    highChurnRisk: 0,
    errors: [],
  };

  for (const customer of customers) {
    try {
      const oldType = customer.customerType;
      const oldChurnRisk = customer.intelligence.churnRisk;

      await analyzeCustomer(customer._id);

      results.updated++;

      if (oldType !== "vip" && customer.customerType === "vip") {
        results.vipPromoted++;
      }

      if (oldType !== "inactive" && customer.customerType === "inactive") {
        results.inactiveMarked++;
      }

      if (
        customer.intelligence.churnRisk === "high" &&
        oldChurnRisk !== "high"
      ) {
        results.highChurnRisk++;
      }
    } catch (error) {
      results.errors.push({
        customerId: customer._id,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Determine customer type based on purchase history
 */
function determineCustomerType(customer) {
  const daysSinceLastPurchase = customer.daysSinceLastPurchase;

  // VIP: High spenders or frequent buyers
  if (
    customer.totalSpent >= VIP_SPENT_THRESHOLD ||
    customer.totalOrders >= VIP_ORDERS_THRESHOLD
  ) {
    return "vip";
  }

  // Inactive: No purchase in 90+ days (if they've made at least one purchase)
  if (customer.totalOrders > 0 && daysSinceLastPurchase >= INACTIVE_DAYS) {
    return "inactive";
  }

  // Regular: Multiple purchases
  if (customer.totalOrders >= REGULAR_ORDERS_THRESHOLD) {
    return "regular";
  }

  // New: Default for new customers
  return "new";
}

/**
 * Calculate Customer Lifetime Value (CLV)
 * CLV = Average Order Value × Purchase Frequency × Customer Lifespan
 */
function calculateLifetimeValue(customer) {
  if (customer.totalOrders === 0) return 0;

  const averageOrderValue = customer.averageOrderValue;
  const customerAgeInDays =
    (Date.now() - customer.customerSince.getTime()) / (1000 * 60 * 60 * 24);
  const purchaseFrequency =
    customer.totalOrders / Math.max(customerAgeInDays / 30, 1); // Orders per month

  // Assume average customer lifespan of 2 years (24 months)
  const estimatedLifespanMonths = 24;

  const clv = averageOrderValue * purchaseFrequency * estimatedLifespanMonths;

  return Math.round(clv);
}

/**
 * Determine churn risk based on behavior
 */
function determineChurnRisk(customer) {
  if (customer.totalOrders === 0) return "low";

  const daysSinceLastPurchase = customer.daysSinceLastPurchase;

  if (!daysSinceLastPurchase) return "low";

  // High risk: 60+ days since last purchase
  if (daysSinceLastPurchase >= 60) {
    return "high";
  }

  // Medium risk: 30-60 days since last purchase
  if (daysSinceLastPurchase >= 30) {
    return "medium";
  }

  // Low risk: Recent purchase
  return "low";
}

/**
 * Calculate engagement score (0-100)
 */
function calculateEngagementScore(customer) {
  let score = 0;

  // Purchase frequency (40 points)
  const orderScore = Math.min(customer.totalOrders * 4, 40);
  score += orderScore;

  // Recency (30 points)
  const daysSinceLastPurchase = customer.daysSinceLastPurchase;
  if (daysSinceLastPurchase <= 7) {
    score += 30;
  } else if (daysSinceLastPurchase <= 30) {
    score += 20;
  } else if (daysSinceLastPurchase <= 60) {
    score += 10;
  }

  // Total spending (20 points)
  if (customer.totalSpent >= 50000) {
    score += 20;
  } else if (customer.totalSpent >= 20000) {
    score += 15;
  } else if (customer.totalSpent >= 10000) {
    score += 10;
  } else if (customer.totalSpent >= 5000) {
    score += 5;
  }

  // Products viewed (10 points)
  const viewScore = Math.min(customer.behavior.productsViewed, 10);
  score += viewScore;

  return Math.min(score, 100);
}

/**
 * Generate automatic tags based on customer behavior
 */
function generateAutoTags(customer) {
  const tags = [];

  // VIP Status
  if (customer.customerType === "vip") {
    tags.push("VIP");
  }

  // Frequent Buyer
  if (customer.totalOrders >= 5) {
    tags.push("Frequent Buyer");
  }

  // High Value
  if (customer.totalSpent >= 30000) {
    tags.push("High Value");
  }

  // Inactive
  if (customer.customerType === "inactive") {
    tags.push("Inactive");
  }

  // At Risk (high churn risk)
  if (customer.intelligence.churnRisk === "high") {
    tags.push("At Risk");
  }

  // New Customer
  if (customer.isNewCustomer) {
    tags.push("New Customer");
  }

  // Window Shopper (high views, low purchases)
  if (customer.behavior.productsViewed > 20 && customer.totalOrders < 2) {
    tags.push("Window Shopper");
  }

  // High AOV (Average Order Value)
  if (customer.averageOrderValue >= 10000) {
    tags.push("High AOV");
  }

  return tags;
}

/**
 * Check if a tag is auto-generated
 */
function isAutoTag(tag) {
  const autoTags = [
    "VIP",
    "Frequent Buyer",
    "High Value",
    "Inactive",
    "At Risk",
    "New Customer",
    "Window Shopper",
    "High AOV",
  ];
  return autoTags.includes(tag);
}

/**
 * Get high-potential customers (viewed many products but not bought)
 */
export async function getHighPotentialCustomers(limit = 20) {
  return Customer.find({
    "behavior.productsViewed": { $gte: 10 },
    totalOrders: { $lt: 2 },
    isActive: true,
  })
    .sort({ "behavior.productsViewed": -1 })
    .limit(limit)
    .lean();
}

/**
 * Get customers at risk of churning
 */
export async function getChurnRiskCustomers(limit = 20) {
  return Customer.find({
    "intelligence.churnRisk": "high",
    totalOrders: { $gte: 1 },
    isActive: true,
  })
    .sort({ lastPurchaseDate: 1 })
    .limit(limit)
    .lean();
}

/**
 * Get VIP customers
 */
export async function getVIPCustomers(limit = 20) {
  return Customer.find({
    customerType: "vip",
    isActive: true,
  })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .lean();
}

/**
 * Recommend products based on customer preferences
 */
export async function getProductRecommendations(customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Build recommendation criteria
  const recommendations = {
    preferredFabrics: customer.preferences.preferredFabrics || [],
    preferredOccasions: customer.preferences.preferredOccasions || [],
    preferredColors: customer.preferences.preferredColors || [],
    priceRange: customer.preferences.priceRange || {},
    categoriesViewed: customer.behavior.categoriesViewed || [],
  };

  return recommendations;
}

/**
 * Get customer insights for dashboard
 */
export async function getCustomerInsights() {
  const [
    totalCustomers,
    vipCount,
    regularCount,
    newCount,
    inactiveCount,
    highChurnRiskCount,
    totalRevenue,
    averageOrderValue,
    recentCustomers,
    topCustomers,
  ] = await Promise.all([
    Customer.countDocuments(),
    Customer.countDocuments({ customerType: "vip" }),
    Customer.countDocuments({ customerType: "regular" }),
    Customer.countDocuments({ customerType: "new" }),
    Customer.countDocuments({ customerType: "inactive" }),
    Customer.countDocuments({ "intelligence.churnRisk": "high" }),
    Customer.aggregate([
      { $group: { _id: null, total: { $sum: "$totalSpent" } } },
    ]).then((res) => res[0]?.total || 0),
    Customer.aggregate([
      { $group: { _id: null, avg: { $avg: "$averageOrderValue" } } },
    ]).then((res) => res[0]?.avg || 0),
    Customer.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name phone customerType totalSpent createdAt")
      .lean(),
    Customer.find({ isActive: true })
      .sort({ totalSpent: -1 })
      .limit(5)
      .select("name phone customerType totalSpent totalOrders")
      .lean(),
  ]);

  return {
    totalCustomers,
    segments: {
      vip: vipCount,
      regular: regularCount,
      new: newCount,
      inactive: inactiveCount,
    },
    highChurnRisk: highChurnRiskCount,
    revenue: {
      total: totalRevenue,
      averageOrderValue: Math.round(averageOrderValue),
    },
    recentCustomers,
    topCustomers,
  };
}
