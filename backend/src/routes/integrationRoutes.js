/**
 * Integration Management Routes
 * Centralized API for managing all third-party integrations
 */

import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import integrationService from "../services/integrationService.js";

const router = express.Router();

/**
 * GET /api/admin/integrations
 * Get all available integrations with status
 * PROTECTED: Requires admin authentication
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("📦 Fetching integrations list...");
    const integrations = await integrationService.getAllIntegrations();
    console.log(`✓ Returning ${integrations.length} integrations`);
    res.json({
      success: true,
      integrations,
    });
  } catch (error) {
    console.error("❌ Error fetching integrations:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/integrations/:id
 * Get detailed info about specific integration
 * PROTECTED: Requires admin authentication
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const integrations = await integrationService.getAllIntegrations();
    const integration = integrations.find((i) => i.id === id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "Integration not found",
      });
    }

    // Get configuration requirements
    const config = integrationService.getIntegrationConfig(id);

    res.json({
      success: true,
      integration: {
        ...integration,
        config,
      },
    });
  } catch (error) {
    console.error("Error fetching integration:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/integrations/:id/test
 * Test connection to specific integration
 * PROTECTED: Requires admin authentication
 */
router.post("/:id/test", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🧪 Testing ${id} integration...`);
    const result = await integrationService.testIntegration(id);

    res.json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error testing integration:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/integrations/:id/webhook
 * Get webhook URL for integration
 * PROTECTED: Requires admin authentication
 */
router.get("/:id/webhook", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const webhookUrl = integrationService.getWebhookUrl(id);

    res.json({
      success: true,
      webhookUrl,
      instructions: `Configure this URL in your ${id} dashboard to receive real-time updates.`,
    });
  } catch (error) {
    console.error("Error getting webhook URL:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
