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
import Product from "../models/Product.js";
import registry from "../integrations/core/registry.js";
import { listDocsAvailability } from "../integrations/core/docsLoader.js";
import { ProviderError } from "../integrations/core/errors.js";
import {
  requireCredentials,
  missingRequired,
  getProviderOrThrow,
  assertCapability,
} from "../integrations/services/credentialStore.js";
import { importOrders } from "../integrations/services/orderImportService.js";
import {
  runWithApiContext,
  getApiContext,
  updateApiContext,
} from "../integrations/logging/apiCallContext.js";

const MAX_FETCH_PAGES = 20;
const DEFAULT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

class IntegrationService {
  /**
   * Get all available integrations with their status
   */
  async getAllIntegrations() {
    const legacy = await this.getLegacyIntegrations();
    const merged = [];
    const seen = new Set();
    for (const entry of legacy) {
      const provider = registry.get(entry.id);
      seen.add(entry.id);
      merged.push(
        provider ? await this.buildRegistryEntry(provider, entry) : entry,
      );
    }
    // Providers registered but without a legacy static entry
    for (const provider of registry.list()) {
      if (!seen.has(provider.id)) {
        merged.push(await this.buildRegistryEntry(provider, null));
      }
    }
    const docsMap = new Map(
      listDocsAvailability().map((d) => [d.providerId, d.hasDocs]),
    );
    for (const entry of merged) {
      if (registry.has(entry.id)) entry.hasDocs = !!docsMap.get(entry.id);
    }
    return merged;
  }

  /**
   * True when the provider keeps credentials in the encrypted store
   * (has credential fields). Env-based providers (Shiprocket) use legacy paths.
   */
  usesStoredCredentials(provider) {
    return !!provider && provider.credentialFields().length > 0;
  }

  /**
   * Merge registry metadata over a legacy static entry (legacy fields preserved
   * so the existing frontend keeps working).
   */
  async buildRegistryEntry(provider, legacyEntry) {
    const C = provider.constructor;
    const base = legacyEntry || {
      id: provider.id,
      name: provider.displayName,
      category: provider.category,
      description: C.description || "",
      logo: C.logo || "",
      features: C.features || [],
      docsUrl: C.docsUrl || "",
      webhookUrl: this.getWebhookUrl(provider.id),
      enabled: false,
      configured: false,
      status: {
        connected: false,
        message: "Not configured",
        lastChecked: new Date().toISOString(),
      },
    };
    const entry = {
      ...base,
      category: provider.category || base.category,
      capabilities: provider.capabilities,
      hasCredentialFields: this.usesStoredCredentials(provider),
      lastSyncAt: null,
      lastSyncCorrelationId: null,
    };

    try {
      const doc = await Integration.findWithCredentials(provider.id);
      entry.lastSyncAt = doc?.lastSyncAt || null;
      entry.lastSyncCorrelationId = doc?.lastSyncCorrelationId || null;
      if (this.usesStoredCredentials(provider)) {
        const hasCreds = !!doc?.hasCredentials();
        entry.configured = hasCreds;
        entry.enabled = hasCreds && !!doc?.config?.enabled;
        let message = "Not configured";
        if (hasCreds) {
          if (doc.status === "active") message = "Connected successfully";
          else if (doc.status === "error")
            message = doc.lastError?.message || "Last request failed";
          else message = "Credentials saved. Run Test connection.";
        }
        entry.status = {
          connected: hasCreds && doc.status === "active",
          message,
          lastChecked: new Date().toISOString(),
          stats: doc
            ? {
                totalRequests: doc.stats.totalRequests,
                lastRequestAt: doc.stats.lastRequestAt,
              }
            : undefined,
        };
      }
    } catch (error) {
      console.warn(
        `[Integration:${provider.id}] status lookup failed reason=${error.message}`,
      );
    }
    return entry;
  }

  /** Static entries kept as before so nothing disappears from the UI. */
  async getLegacyIntegrations() {
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
    const provider = registry.get(integrationId);
    if (this.usesStoredCredentials(provider)) {
      return await this.testRegistryIntegration(integrationId);
    }
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

  // ==================== REGISTRY-BASED OPERATIONS ====================

  getCredentialFields(id) {
    const provider = getProviderOrThrow(id);
    return provider.credentialFields().map((f) => ({
      key: f.key,
      label: f.label,
      secret: !!f.secret,
      required: !!f.required,
      help: f.help || "",
    }));
  }

  async saveCredentials(id, values, ownerId) {
    const provider = getProviderOrThrow(id);
    if (!this.usesStoredCredentials(provider)) {
      throw new ProviderError(
        "UNSUPPORTED",
        `${provider.displayName} credentials are managed via server environment`,
      );
    }
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new ProviderError("VALIDATION", "credentials must be an object");
    }
    const allowed = new Set(provider.credentialFields().map((f) => f.key));
    const clean = {};
    for (const [k, v] of Object.entries(values)) {
      if (!allowed.has(k)) {
        console.warn(`[Integration:${id}] ignored unknown credential key=${k}`);
        continue;
      }
      if (v != null && String(v).trim() !== "") clean[k] = String(v).trim();
    }
    let integration = await Integration.findWithCredentials(id);
    if (!integration) {
      await Integration.getOrCreate(
        id,
        provider.displayName,
        provider.category === "shipping" ? "shipping" : "marketplace",
      );
      integration = await Integration.findWithCredentials(id);
    }
    // Merge with existing so a secret left blank in the form is kept
    let existing = {};
    if (integration.hasCredentials()) {
      try {
        existing = integration.getCredentials();
      } catch (err) {
        console.warn(
          `[Integration:${id}] existing credentials unreadable, replacing reason=${err.message}`,
        );
      }
    }
    const next = { ...existing, ...clean };
    const missing = missingRequired(provider, next);
    if (missing.length) {
      throw new ProviderError("VALIDATION", "Missing required credentials", {
        details: { missing },
        actionRequired: `Fill in: ${missing.join(", ")}`,
      });
    }
    integration.setCredentials(next);
    integration.status = "pending";
    integration.token = { value: "", expiresAt: null, generatedAt: null };
    await integration.save();
    console.log(
      `[Integration:${id}] credentials saved ownerId=${ownerId || ""} keys=${Object.keys(next).join(",")}`,
    );
    return integration.getMaskedCredentials();
  }

  async deleteCredentials(id, ownerId) {
    getProviderOrThrow(id);
    const integration = await Integration.findWithCredentials(id);
    if (!integration) {
      console.warn(
        `[Integration:${id}] deleteCredentials: no integration doc ownerId=${ownerId || ""}`,
      );
      return false;
    }
    integration.credentialsEnc = "";
    integration.credentialsUpdatedAt = null;
    integration.token = { value: "", expiresAt: null, generatedAt: null };
    integration.status = "inactive";
    integration.config.enabled = false;
    await integration.save();
    console.log(
      `[Integration:${id}] credentials deleted ownerId=${ownerId || ""}`,
    );
    return true;
  }

  async getMaskedCredentials(id) {
    getProviderOrThrow(id);
    const integration = await Integration.findWithCredentials(id);
    if (!integration?.hasCredentials()) return {};
    return integration.getMaskedCredentials();
  }

  /** Registry test; returns legacy shape {success,message,data}. */
  async testRegistryIntegration(id) {
    const provider = getProviderOrThrow(id);
    const { integration, credentials } = await requireCredentials(id);
    try {
      const result = await provider.testConnection(credentials);
      if (result?.ok) {
        integration.status = "active";
        integration.config.enabled = true;
        integration.setupCompletedAt =
          integration.setupCompletedAt || new Date();
        await integration.save();
        await integration.recordSuccess();
      } else {
        await integration.recordFailure(
          result?.message || "Connection test failed",
          "TEST_FAILED",
        );
      }
      return {
        success: !!result?.ok,
        message: result?.message || "",
        data: undefined,
      };
    } catch (err) {
      await integration.recordFailure(err.message, err.type || "TEST_FAILED");
      throw err;
    }
  }

  /**
   * Fetch orders from one provider (paged, capped) and import them.
   * @returns {Promise<{imported,updated,skipped,needsMapping,warnings,fetched,pages}>}
   */
  async fetchOrdersFor(id, { since } = {}, ownerId) {
    const provider = getProviderOrThrow(id);
    assertCapability(provider, "fetchOrders");
    const { integration, credentials } = await requireCredentials(id);

    let sinceDate = since ? new Date(since) : integration.lastSyncAt;
    if (since && Number.isNaN(sinceDate.getTime())) {
      throw new ProviderError("VALIDATION", "since must be a valid date");
    }
    if (!sinceDate) sinceDate = new Date(Date.now() - DEFAULT_LOOKBACK_MS);

    const startedAt = new Date();
    const syncCorrelationId = getApiContext()?.correlationId || null;
    const warnings = [];
    const orders = [];
    let cursor = null;
    let pages = 0;
    try {
      do {
        const page = await provider.fetchOrders(credentials, {
          since: sinceDate,
          cursor,
          limit: 50,
        });
        pages++;
        orders.push(...(page?.orders || []));
        warnings.push(...(page?.warnings || []));
        cursor = page?.cursor || null;
      } while (cursor && pages < MAX_FETCH_PAGES);
      if (cursor) {
        const msg = `Stopped after ${MAX_FETCH_PAGES} pages; more orders remain. Run fetch again.`;
        console.warn(`[Integration:${id}] ${msg}`);
        warnings.push(msg);
      }
      const summary = await importOrders({
        providerId: id,
        normalizedOrders: orders,
        ownerId,
      });
      // Only advance the sync cursor when everything was fetched
      if (!cursor) integration.lastSyncAt = startedAt;
      integration.lastSyncCorrelationId = syncCorrelationId;
      await integration.save();
      await integration.recordSuccess();
      return {
        ...summary,
        warnings: [...warnings, ...summary.warnings],
        fetched: orders.length,
        pages,
      };
    } catch (err) {
      integration.lastSyncCorrelationId = syncCorrelationId;
      await integration
        .save()
        .catch((e) =>
          console.warn(
            `[Integration:${id}] could not persist lastSyncCorrelationId correlationId=${syncCorrelationId} reason=${e.message}`,
          ),
        );
      await integration
        .recordFailure(err.message, err.type || "FETCH_FAILED")
        .catch((e) =>
          console.warn(
            `[Integration:${id}] could not record failure reason=${e.message}`,
          ),
        );
      throw err;
    }
  }

  /** Fetch from every connected provider that supports fetchOrders. */
  async fetchAll({ since } = {}, ownerId) {
    const results = {};
    for (const provider of registry.list()) {
      if (!provider.capabilities.fetchOrders) continue;
      const doc = await Integration.findWithCredentials(provider.id);
      if (!doc?.hasCredentials()) {
        console.warn(
          `[Integration:${provider.id}] fetch-all skipped reason=not connected`,
        );
        results[provider.id] = { skipped: true, reason: "Not connected" };
        continue;
      }
      try {
        const parentCtx = getApiContext() || {};
        const summary = await runWithApiContext(
          { ...parentCtx, provider: provider.id, operation: "fetchOrders" },
          () => this.fetchOrdersFor(provider.id, { since }, ownerId),
        );
        results[provider.id] = {
          ok: true,
          ...summary,
          correlationId: parentCtx.correlationId,
        };
      } catch (err) {
        console.warn(
          `[Integration:${provider.id}] fetch-all failed type=${err.type || "ERROR"} reason=${err.message}`,
        );
        results[provider.id] = {
          ok: false,
          error: err.message,
          errorType: err.type || "UPSTREAM_ERROR",
          actionRequired: err.actionRequired,
          correlationId: getApiContext()?.correlationId,
        };
      }
    }
    return results;
  }

  /** Resolve the channel SKU from externalSku or productId. */
  async resolveChannelSku(id, { productId, externalSku }) {
    if (externalSku) return { externalSku, product: null };
    if (!productId) {
      throw new ProviderError(
        "VALIDATION",
        "externalSku or productId is required",
      );
    }
    const product = await Product.findOne({ _id: productId, deletedAt: null });
    if (!product) {
      throw new ProviderError("VALIDATION", "Product not found", {
        status: 404,
      });
    }
    const listing = product.channelListings.find((l) => l.channel === id);
    if (!listing?.externalSku) {
      throw new ProviderError(
        "MAPPING_REQUIRED",
        "Product is not linked to this marketplace",
        { details: { productId } },
      );
    }
    return { externalSku: listing.externalSku, product };
  }

  async pushInventory(id, body = {}) {
    const provider = getProviderOrThrow(id);
    assertCapability(provider, "updateInventory");
    const { credentials } = await requireCredentials(id);
    const { externalSku, product } = await this.resolveChannelSku(id, body);
    updateApiContext({
      context: { productId: product ? String(product._id) : body.productId, sku: externalSku },
    });
    let quantity = body.quantity;
    if (quantity == null && product) {
      quantity = (product.variants || []).reduce(
        (s, v) => s + (v.stock || 0),
        0,
      );
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ProviderError(
        "VALIDATION",
        "quantity must be a non-negative integer",
      );
    }
    return provider.updateInventory(credentials, { externalSku, quantity });
  }

  async pushPrice(id, body = {}) {
    const provider = getProviderOrThrow(id);
    assertCapability(provider, "updatePrice");
    const { credentials } = await requireCredentials(id);
    const { externalSku, product } = await this.resolveChannelSku(id, body);
    updateApiContext({
      context: { productId: product ? String(product._id) : body.productId, sku: externalSku },
    });
    let { mrp, sellingPrice } = body;
    if (product) {
      sellingPrice = sellingPrice ?? product.price?.amount;
      mrp = mrp ?? product.price?.suggested ?? product.price?.amount;
    }
    if (typeof sellingPrice !== "number" || sellingPrice < 0) {
      throw new ProviderError(
        "VALIDATION",
        "sellingPrice must be a non-negative number",
      );
    }
    return provider.updatePrice(credentials, {
      externalSku,
      mrp,
      sellingPrice,
    });
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
