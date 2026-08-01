import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getCatalogAnalytics,
  getPerformanceAnalytics,
  getInventoryAnalytics,
  getRecentActivity,
  getCustomerInsights,
} from "../services/analyticsService.js";

const router = express.Router();

// All analytics routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/analytics/catalog
 * Get catalog value analytics and trends
 */
router.get("/catalog", async (req, res) => {
  try {
    const analytics = await getCatalogAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching catalog analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch catalog analytics",
    });
  }
});

/**
 * GET /api/admin/analytics/performance
 * Get product and category performance metrics
 */
router.get("/performance", async (req, res) => {
  try {
    const analytics = await getPerformanceAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching performance analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch performance analytics",
    });
  }
});

/**
 * GET /api/admin/analytics/inventory
 * Get inventory alerts and stock analytics
 */
router.get("/inventory", async (req, res) => {
  try {
    const analytics = await getInventoryAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching inventory analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch inventory analytics",
    });
  }
});

/**
 * GET /api/admin/analytics/activity
 * Get recent activity feed
 */
router.get("/activity", async (req, res) => {
  try {
    const activities = await getRecentActivity();
    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch recent activity",
    });
  }
});

/**
 * GET /api/admin/analytics/customers
 * Get customer/vendor insights
 */
router.get("/customers", async (req, res) => {
  try {
    const insights = await getCustomerInsights();
    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("Error fetching customer insights:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch customer insights",
    });
  }
});

/**
 * GET /api/admin/analytics/dashboard
 * Get all dashboard analytics in one call (optimized)
 */
router.get("/dashboard", async (req, res) => {
  try {
    const [catalog, performance, inventory, activity, customers] =
      await Promise.all([
        getCatalogAnalytics(),
        getPerformanceAnalytics(),
        getInventoryAnalytics(),
        getRecentActivity(),
        getCustomerInsights(),
      ]);

    res.json({
      success: true,
      data: {
        catalog,
        performance,
        inventory,
        activity,
        customers,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard analytics",
    });
  }
});

export default router;
