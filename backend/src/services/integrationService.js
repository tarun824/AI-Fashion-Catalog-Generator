/**
 * Integration Management Service
 * Centralized service for managing all third-party integrations
 *
 * Supported Integrations:
 * - Shiprocket (Shipping)
 * - Flipkart (Marketplace)
 * - Amazon (Marketplace)
 * - Razorpay (Payment Gateway)
 * - WhatsApp Business (Messaging)
 */

import shiprocketService from "./shiprocketService.js";
import Integration from "../models/Integration.js";

class IntegrationService {
  /**
   * Get all available integrations with their status
   */
  async getAllIntegrations() {
    const integrations = [
      {
        id: "shiprocket",
        name: "Shiprocket",
        category: "shipping",
        description: "Automated shipping with 15+ courier partners",
        logo: "https://shiprocket.in/wp-content/uploads/2019/08/shiprocket-logo-blue.png",
        status: await this.checkShiprocketStatus(),
        features: [
          "Multi-courier shipping",
          "Real-time tracking",
          "Auto label generation",
          "COD collection",
          "Return management",
        ],
        webhookUrl: this.getWebhookUrl("shiprocket"),
        docsUrl: "https://apidocs.shiprocket.in/",
        enabled: !!process.env.SHIPROCKET_EMAIL,
        configured: this.isShiprocketConfigured(),
      },
      {
        id: "flipkart",
        name: "Flipkart Seller Hub",
        category: "marketplace",
        description: "Sell on Flipkart marketplace",
        logo: "https://img1a.flixcart.com/www/linchpin/fk-cp-zion/img/flipkart-plus_8d85f4.png",
        status: await this.checkFlipkartStatus(),
        features: [
          "Product listing sync",
          "Order management",
          "Inventory sync",
          "Pricing updates",
          "Returns handling",
        ],
        webhookUrl: this.getWebhookUrl("flipkart"),
        docsUrl: "https://seller.flipkart.com/api-docs",
        enabled: !!process.env.FLIPKART_API_KEY,
        configured: this.isFlipkartConfigured(),
      },
      {
        id: "amazon",
        name: "Amazon Seller Central",
        category: "marketplace",
        description: "Sell on Amazon marketplace",
        logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
        status: await this.checkAmazonStatus(),
        features: [
          "Product catalog sync",
          "FBA integration",
          "Order fulfillment",
          "Inventory management",
          "Reviews & ratings",
        ],
        webhookUrl: this.getWebhookUrl("amazon"),
        docsUrl: "https://developer.amazonservices.com/",
        enabled: !!process.env.AMAZON_SELLER_ID,
        configured: this.isAmazonConfigured(),
      },
      {
        id: "razorpay",
        name: "Razorpay",
        category: "payment",
        description: "Online payment gateway",
        logo: "https://razorpay.com/assets/razorpay-glyph.svg",
        status: await this.checkRazorpayStatus(),
        features: [
          "UPI payments",
          "Card payments",
          "Net banking",
          "Wallets",
          "EMI options",
        ],
        webhookUrl: this.getWebhookUrl("razorpay"),
        docsUrl: "https://razorpay.com/docs/",
        enabled: !!process.env.RAZORPAY_KEY_ID,
        configured: this.isRazorpayConfigured(),
      },
      {
        id: "whatsapp",
        name: "WhatsApp Business",
        category: "messaging",
        description: "Customer communication via WhatsApp",
        logo: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
        status: await this.checkWhatsAppStatus(),
        features: [
          "Order notifications",
          "Delivery updates",
          "Customer support",
          "Catalog sharing",
          "Broadcast messages",
        ],
        webhookUrl: this.getWebhookUrl("whatsapp"),
        docsUrl: "https://developers.facebook.com/docs/whatsapp",
        enabled: !!process.env.WHATSAPP_BUSINESS_ID,
        configured: this.isWhatsAppConfigured(),
      },
    ];

    return integrations;
  }

  /**
   * Get webhook URL for a specific integration
   * These are public endpoints (no auth required) for external services to call
   */
  getWebhookUrl(integrationId) {
    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const apiPrefix = process.env.API_PREFIX || "/api/ai-fashion-generator";

    // All webhooks are at /webhooks/{integrationId} (public, no auth)
    return `${baseUrl}${apiPrefix}/webhooks/${integrationId}`;
  }

  /**
   * Test integration connection
   */
  async testIntegration(integrationId) {
    switch (integrationId) {
      case "shiprocket":
        return await this.testShiprocket();
      case "flipkart":
        return await this.testFlipkart();
      case "amazon":
        return await this.testAmazon();
      case "razorpay":
        return await this.testRazorpay();
      case "whatsapp":
        return await this.testWhatsApp();
      default:
        throw new Error("Unknown integration");
    }
  }

  // ==================== SHIPROCKET ====================

  isShiprocketConfigured() {
    return !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
  }

  async checkShiprocketStatus() {
    if (!this.isShiprocketConfigured()) {
      return {
        connected: false,
        message: "Not configured",
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      // Check database first
      const integration = await Integration.findOne({ name: "shiprocket" });

      if (integration) {
        const isTokenValid = integration.isTokenValid();

        return {
          connected: integration.status === "active" && isTokenValid,
          message: isTokenValid
            ? "Connected successfully"
            : "Token expired, will refresh on next use",
          lastChecked: new Date().toISOString(),
          stats: {
            totalRequests: integration.stats.totalRequests,
            successRate:
              integration.stats.totalRequests > 0
                ? (
                    (integration.stats.successfulRequests /
                      integration.stats.totalRequests) *
                    100
                  ).toFixed(1) + "%"
                : "N/A",
            lastRequestAt: integration.stats.lastRequestAt,
          },
          tokenExpiry: integration.token.expiresAt,
          customData: integration.data, // Shiprocket-specific dynamic fields
        };
      }

      // No database record, try to authenticate
      await shiprocketService.getAuthToken();
      return {
        connected: true,
        message: "Connected successfully",
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        message: error.message || "Connection failed",
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async testShiprocket() {
    try {
      const token = await shiprocketService.getAuthToken();

      // Get stats from database
      const integration = await Integration.findOne({ name: "shiprocket" });

      return {
        success: true,
        message: "Shiprocket connection successful",
        data: {
          token: token.substring(0, 20) + "...",
          hasToken: !!token,
          tokenValid: integration?.isTokenValid() || false,
          stats: integration
            ? {
                totalRequests: integration.stats.totalRequests,
                successfulRequests: integration.stats.successfulRequests,
                failedRequests: integration.stats.failedRequests,
              }
            : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ==================== FLIPKART ====================

  isFlipkartConfigured() {
    return !!(process.env.FLIPKART_API_KEY && process.env.FLIPKART_APP_ID);
  }

  async checkFlipkartStatus() {
    if (!this.isFlipkartConfigured()) {
      return {
        connected: false,
        message: "Not configured",
        lastChecked: new Date().toISOString(),
      };
    }

    // TODO: Implement actual Flipkart API check
    return {
      connected: true,
      message: "Ready to connect (API not implemented yet)",
      lastChecked: new Date().toISOString(),
    };
  }

  async testFlipkart() {
    if (!this.isFlipkartConfigured()) {
      return {
        success: false,
        message:
          "Flipkart not configured. Add FLIPKART_API_KEY and FLIPKART_APP_ID to .env",
      };
    }

    // TODO: Implement actual Flipkart API test
    return {
      success: true,
      message: "Flipkart configuration found (API test not implemented)",
    };
  }

  // ==================== AMAZON ====================

  isAmazonConfigured() {
    return !!(
      process.env.AMAZON_SELLER_ID &&
      process.env.AMAZON_ACCESS_KEY &&
      process.env.AMAZON_SECRET_KEY
    );
  }

  async checkAmazonStatus() {
    if (!this.isAmazonConfigured()) {
      return {
        connected: false,
        message: "Not configured",
        lastChecked: new Date().toISOString(),
      };
    }

    // TODO: Implement actual Amazon API check
    return {
      connected: true,
      message: "Ready to connect (API not implemented yet)",
      lastChecked: new Date().toISOString(),
    };
  }

  async testAmazon() {
    if (!this.isAmazonConfigured()) {
      return {
        success: false,
        message:
          "Amazon not configured. Add AMAZON_SELLER_ID, AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY to .env",
      };
    }

    // TODO: Implement actual Amazon API test
    return {
      success: true,
      message: "Amazon configuration found (API test not implemented)",
    };
  }

  // ==================== RAZORPAY ====================

  isRazorpayConfigured() {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }

  async checkRazorpayStatus() {
    if (!this.isRazorpayConfigured()) {
      return {
        connected: false,
        message: "Not configured",
        lastChecked: new Date().toISOString(),
      };
    }

    // TODO: Implement actual Razorpay API check
    return {
      connected: true,
      message: "Ready to connect (API not implemented yet)",
      lastChecked: new Date().toISOString(),
    };
  }

  async testRazorpay() {
    if (!this.isRazorpayConfigured()) {
      return {
        success: false,
        message:
          "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env",
      };
    }

    // TODO: Implement actual Razorpay API test
    return {
      success: true,
      message: "Razorpay configuration found (API test not implemented)",
    };
  }

  // ==================== WHATSAPP ====================

  isWhatsAppConfigured() {
    return !!(
      process.env.WHATSAPP_BUSINESS_ID && process.env.WHATSAPP_ACCESS_TOKEN
    );
  }

  async checkWhatsAppStatus() {
    if (!this.isWhatsAppConfigured()) {
      return {
        connected: false,
        message: "Not configured",
        lastChecked: new Date().toISOString(),
      };
    }

    // TODO: Implement actual WhatsApp API check
    return {
      connected: true,
      message: "Ready to connect (API not implemented yet)",
      lastChecked: new Date().toISOString(),
    };
  }

  async testWhatsApp() {
    if (!this.isWhatsAppConfigured()) {
      return {
        success: false,
        message:
          "WhatsApp not configured. Add WHATSAPP_BUSINESS_ID and WHATSAPP_ACCESS_TOKEN to .env",
      };
    }

    // TODO: Implement actual WhatsApp API test
    return {
      success: true,
      message: "WhatsApp configuration found (API test not implemented)",
    };
  }

  /**
   * Get integration configuration requirements
   */
  getIntegrationConfig(integrationId) {
    const configs = {
      shiprocket: {
        envVars: [
          {
            key: "SHIPROCKET_EMAIL",
            description: "Your Shiprocket account email",
          },
          {
            key: "SHIPROCKET_PASSWORD",
            description: "Your Shiprocket account password",
          },
        ],
        setupSteps: [
          "Create account at https://www.shiprocket.in/",
          "Add pickup address in Shiprocket dashboard",
          "Add credentials to .env file",
          "Test connection",
        ],
      },
      flipkart: {
        envVars: [
          { key: "FLIPKART_API_KEY", description: "Flipkart API Key" },
          { key: "FLIPKART_APP_ID", description: "Flipkart App ID" },
          { key: "FLIPKART_SELLER_ID", description: "Your Flipkart Seller ID" },
        ],
        setupSteps: [
          "Register as Flipkart seller",
          "Apply for API access in seller hub",
          "Get API credentials",
          "Add credentials to .env file",
        ],
      },
      amazon: {
        envVars: [
          { key: "AMAZON_SELLER_ID", description: "Amazon Seller ID" },
          { key: "AMAZON_ACCESS_KEY", description: "Amazon MWS Access Key" },
          { key: "AMAZON_SECRET_KEY", description: "Amazon MWS Secret Key" },
        ],
        setupSteps: [
          "Register at Amazon Seller Central",
          "Complete seller verification",
          "Request MWS API access",
          "Generate API credentials",
          "Add to .env file",
        ],
      },
      razorpay: {
        envVars: [
          { key: "RAZORPAY_KEY_ID", description: "Razorpay Key ID" },
          { key: "RAZORPAY_KEY_SECRET", description: "Razorpay Key Secret" },
        ],
        setupSteps: [
          "Create account at https://razorpay.com/",
          "Complete KYC verification",
          "Generate API keys from dashboard",
          "Add credentials to .env file",
        ],
      },
      whatsapp: {
        envVars: [
          {
            key: "WHATSAPP_BUSINESS_ID",
            description: "WhatsApp Business Account ID",
          },
          {
            key: "WHATSAPP_ACCESS_TOKEN",
            description: "WhatsApp API Access Token",
          },
          { key: "WHATSAPP_PHONE_NUMBER_ID", description: "Phone Number ID" },
        ],
        setupSteps: [
          "Create Meta Business Account",
          "Set up WhatsApp Business API",
          "Get phone number verified",
          "Generate access token",
          "Add to .env file",
        ],
      },
    };

    return configs[integrationId] || null;
  }
}

export default new IntegrationService();
