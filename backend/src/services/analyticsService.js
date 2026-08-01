import Product from "../models/Product.js";
import Job from "../models/Job.js";

/**
 * Analytics Service
 * Provides comprehensive analytics for the admin dashboard
 */

/**
 * Get catalog value analytics
 * Calculates total value, average value, and trends
 */
export async function getCatalogAnalytics() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // Get published products only for value calculations
    const publishedProducts = await Product.find({
      status: "published",
      "price.amount": { $gt: 0 },
    }).select("price.amount createdAt");

    // Calculate total catalog value
    const totalValue = publishedProducts.reduce(
      (sum, p) => sum + (p.price?.amount || 0),
      0,
    );
    const avgValue =
      publishedProducts.length > 0 ? totalValue / publishedProducts.length : 0;

    // Products added this week/month
    const addedToday = publishedProducts.filter(
      (p) => p.createdAt >= today,
    ).length;
    const addedThisWeek = publishedProducts.filter(
      (p) => p.createdAt >= thisWeekStart,
    ).length;
    const addedThisMonth = publishedProducts.filter(
      (p) => p.createdAt >= thisMonthStart,
    ).length;
    const addedLastMonth = publishedProducts.filter(
      (p) => p.createdAt >= lastMonthStart && p.createdAt <= lastMonthEnd,
    ).length;

    // Calculate growth percentage
    const growthPercent =
      addedLastMonth > 0
        ? (((addedThisMonth - addedLastMonth) / addedLastMonth) * 100).toFixed(
            1,
          )
        : addedThisMonth > 0
          ? 100
          : 0;

    // Get trend data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayProducts = publishedProducts.filter(
        (p) => p.createdAt >= date && p.createdAt < nextDate,
      );

      const dayValue = dayProducts.reduce(
        (sum, p) => sum + (p.price?.amount || 0),
        0,
      );

      trendData.push({
        date: date.toISOString().split("T")[0],
        value: dayValue,
        count: dayProducts.length,
      });
    }

    return {
      totalValue,
      avgValue,
      productCount: publishedProducts.length,
      addedToday,
      addedThisWeek,
      addedThisMonth,
      growthPercent: parseFloat(growthPercent),
      trend: trendData,
    };
  } catch (error) {
    console.error("Error getting catalog analytics:", error);
    throw error;
  }
}

/**
 * Get top performing products and categories
 */
export async function getPerformanceAnalytics() {
  try {
    // Top 5 products by price (highest value items)
    const topProducts = await Product.find({
      status: "published",
      "price.amount": { $gt: 0 },
    })
      .sort({ "price.amount": -1 })
      .limit(5)
      .select("name slug price.amount images fabric occasion colors.names")
      .lean();

    // Sales by fabric type
    const fabricStats = await Product.aggregate([
      { $match: { status: "published", fabric: { $ne: "" } } },
      {
        $group: {
          _id: "$fabric",
          count: { $sum: 1 },
          totalValue: { $sum: "$price.amount" },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 },
    ]);

    // Sales by occasion
    const occasionStats = await Product.aggregate([
      { $match: { status: "published", occasion: { $ne: "" } } },
      {
        $group: {
          _id: "$occasion",
          count: { $sum: 1 },
          totalValue: { $sum: "$price.amount" },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 },
    ]);

    // Top categories by product count
    const categoryStats = await Product.aggregate([
      { $match: { status: "published", category: { $ne: "" } } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalValue: { $sum: "$price.amount" },
          avgValue: { $avg: "$price.amount" },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
    ]);

    // Color distribution
    const colorStats = await Product.aggregate([
      {
        $match: {
          status: "published",
          "colors.names": { $exists: true, $ne: [] },
        },
      },
      { $unwind: "$colors.names" },
      {
        $group: {
          _id: "$colors.names",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      topProducts: topProducts.map((p) => ({
        ...p,
        imageUrl: p.images?.thumbnail?.gridFsId
          ? `/api/ai-fashion-generator/api/images/${p.images.thumbnail.gridFsId}`
          : null,
      })),
      fabricStats: fabricStats.map((f) => ({
        name: f._id,
        count: f.count,
        value: f.totalValue || 0,
      })),
      occasionStats: occasionStats.map((o) => ({
        name: o._id,
        count: o.count,
        value: o.totalValue || 0,
      })),
      categoryStats: categoryStats.map((c) => ({
        name: c._id,
        count: c.count,
        value: c.totalValue || 0,
        avgValue: c.avgValue || 0,
      })),
      colorStats: colorStats.map((c) => ({ name: c._id, count: c.count })),
    };
  } catch (error) {
    console.error("Error getting performance analytics:", error);
    throw error;
  }
}

/**
 * Get inventory alerts and stock analytics
 */
export async function getInventoryAnalytics() {
  try {
    // Get all products with stock information
    const allProducts = await Product.find({})
      .select("name slug stock lowStockThreshold price.amount status variants")
      .lean();

    // Calculate stock levels
    const lowStockProducts = [];
    const outOfStockProducts = [];
    const overStockedProducts = [];
    let totalStockValue = 0;
    let totalStockUnits = 0;

    allProducts.forEach((product) => {
      const stock = product.stock || 0;
      const threshold = product.lowStockThreshold || 5;
      const price = product.price?.amount || 0;

      totalStockUnits += stock;
      totalStockValue += stock * price;

      if (stock === 0 && product.status === "published") {
        outOfStockProducts.push({
          name: product.name,
          slug: product.slug,
          status: product.status,
        });
      } else if (
        stock > 0 &&
        stock <= threshold &&
        product.status === "published"
      ) {
        lowStockProducts.push({
          name: product.name,
          slug: product.slug,
          stock,
          threshold,
          status: product.status,
        });
      } else if (stock > 50 && product.status === "published") {
        // Consider items with >50 units as potentially overstocked
        overStockedProducts.push({
          name: product.name,
          slug: product.slug,
          stock,
          value: stock * price,
        });
      }
    });

    // Sort by urgency
    lowStockProducts.sort((a, b) => a.stock - b.stock);
    overStockedProducts.sort((a, b) => b.value - a.value);

    return {
      lowStock: lowStockProducts.slice(0, 10),
      outOfStock: outOfStockProducts.slice(0, 10),
      overStocked: overStockedProducts.slice(0, 5),
      totalStockValue,
      totalStockUnits,
      outOfStockCount: outOfStockProducts.length,
      lowStockCount: lowStockProducts.length,
    };
  } catch (error) {
    console.error("Error getting inventory analytics:", error);
    throw error;
  }
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity() {
  try {
    // Recent product uploads (last 10)
    const recentProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name slug status createdAt price.amount vendorId")
      .populate("vendorId", "businessName")
      .lean();

    // Recent job activities
    const recentJobs = await Job.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("status filesProcessed filesTotal createdAt updatedAt")
      .lean();

    // Format activities
    const activities = [];

    recentProducts.forEach((product) => {
      activities.push({
        type: "product",
        action: "uploaded",
        title: product.name,
        slug: product.slug,
        status: product.status,
        timestamp: product.createdAt,
        metadata: {
          price: product.price?.amount,
          vendor: product.vendorId?.businessName || "Admin",
        },
      });
    });

    recentJobs.forEach((job) => {
      activities.push({
        type: "job",
        action: job.status === "completed" ? "completed" : "processing",
        title: `Batch processing: ${job.filesProcessed}/${job.filesTotal} files`,
        status: job.status,
        timestamp: job.updatedAt || job.createdAt,
        metadata: {
          progress: Math.round((job.filesProcessed / job.filesTotal) * 100),
        },
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return activities.slice(0, 15);
  } catch (error) {
    console.error("Error getting recent activity:", error);
    throw error;
  }
}

/**
 * Get customer/vendor insights
 */
export async function getCustomerInsights() {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get vendor statistics
    const vendorProducts = await Product.aggregate([
      { $match: { vendorId: { $ne: null } } },
      {
        $group: {
          _id: "$vendorId",
          productCount: { $sum: 1 },
          totalValue: { $sum: "$price.amount" },
        },
      },
    ]);

    // Get new vendors this month (based on first product upload)
    const newVendorsThisMonth = await Product.aggregate([
      {
        $match: {
          vendorId: { $ne: null },
          createdAt: { $gte: thisMonthStart },
        },
      },
      {
        $group: {
          _id: "$vendorId",
          firstUpload: { $min: "$createdAt" },
        },
      },
      { $match: { firstUpload: { $gte: thisMonthStart } } },
    ]);

    return {
      totalVendors: vendorProducts.length,
      newVendorsThisMonth: newVendorsThisMonth.length,
      avgProductsPerVendor:
        vendorProducts.length > 0
          ? Math.round(
              vendorProducts.reduce((sum, v) => sum + v.productCount, 0) /
                vendorProducts.length,
            )
          : 0,
      totalVendorValue: vendorProducts.reduce(
        (sum, v) => sum + (v.totalValue || 0),
        0,
      ),
    };
  } catch (error) {
    console.error("Error getting customer insights:", error);
    throw error;
  }
}
