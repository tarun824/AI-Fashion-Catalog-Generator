/**
 * Integration Model
 * Stores third-party service integrations with dynamic configuration
 *
 * Supports: Shiprocket, Razorpay, WhatsApp, Amazon, Flipkart, etc.
 * Each integration can have unique fields stored in dynamic 'data' field
 */

import mongoose from "mongoose";
import {
  encryptObject,
  decryptObject,
  maskObject,
} from "../integrations/core/credentialVault.js";

const integrationSchema = new mongoose.Schema(
  {
    // Integration identifier (unique)
    name: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "shiprocket",
        "razorpay",
        "whatsapp",
        "amazon",
        "flipkart",
        "shopify",
        "myntra",
        "meesho",
        "phonepe",
        "paytm",
        "stripe",
      ],
    },

    // Display name for UI
    displayName: {
      type: String,
      required: true,
    },

    // Integration status
    status: {
      type: String,
      enum: ["active", "inactive", "error", "pending"],
      default: "inactive",
    },

    // Category of integration
    category: {
      type: String,
      enum: ["shipping", "payment", "communication", "marketplace", "other"],
      required: true,
    },

    // Standard credentials (common fields)
    credentials: {
      email: { type: String, default: "" },
      password: { type: String, default: "" },
      apiKey: { type: String, default: "" },
      apiSecret: { type: String, default: "" },
      merchantId: { type: String, default: "" },
      sellerId: { type: String, default: "" },
    },

    // Encrypted credential blob (AES-256-GCM, see credentialVault). Preferred over
    // the legacy plaintext `credentials` fields above, which are no longer written.
    credentialsEnc: { type: String, default: "", select: false },
    credentialsUpdatedAt: { type: Date, default: null },

    // Authentication token storage
    token: {
      value: { type: String, default: "" },
      expiresAt: { type: Date, default: null },
      generatedAt: { type: Date, default: null },
    },

    // 🔥 DYNAMIC FIELD - Integration-specific data
    // Each integration can store unique fields here
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Configuration settings
    config: {
      enabled: { type: Boolean, default: false },
      autoSync: { type: Boolean, default: false },
      webhookUrl: { type: String, default: "" },
      webhookSecret: { type: String, default: "" },
      testMode: { type: Boolean, default: true },
    },

    // Error tracking
    lastError: {
      message: { type: String, default: "" },
      code: { type: String, default: "" },
      timestamp: { type: Date, default: null },
    },

    // Usage statistics
    stats: {
      totalRequests: { type: Number, default: 0 },
      successfulRequests: { type: Number, default: 0 },
      failedRequests: { type: Number, default: 0 },
      lastRequestAt: { type: Date, default: null },
      lastSuccessAt: { type: Date, default: null },
    },

    // Metadata
    notes: { type: String, default: "" },
    setupCompletedAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
    // correlationId of the most recent order fetch (success or failure) - see ExternalApiCall
    lastSyncCorrelationId: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

// ==================== METHODS ====================

/**
 * Check if authentication token is valid
 */
integrationSchema.methods.isTokenValid = function () {
  if (!this.token?.value || !this.token?.expiresAt) {
    return false;
  }
  return new Date(this.token.expiresAt) > new Date();
};

/**
 * Save authentication token
 */
integrationSchema.methods.saveToken = function (tokenValue, expiresInMs) {
  this.token = {
    value: tokenValue,
    expiresAt: new Date(Date.now() + expiresInMs),
    generatedAt: new Date(),
  };
  this.status = "active";
  this.lastError = { message: "", code: "", timestamp: null };
  return this.save();
};

/**
 * Clear authentication token
 */
integrationSchema.methods.clearToken = function () {
  this.token = { value: "", expiresAt: null, generatedAt: null };
  return this.save();
};

/**
 * Record successful request
 */
integrationSchema.methods.recordSuccess = function () {
  this.stats.totalRequests += 1;
  this.stats.successfulRequests += 1;
  this.stats.lastRequestAt = new Date();
  this.stats.lastSuccessAt = new Date();
  return this.save();
};

/**
 * Record failed request
 */
integrationSchema.methods.recordFailure = function (
  errorMessage,
  errorCode = "",
) {
  this.stats.totalRequests += 1;
  this.stats.failedRequests += 1;
  this.stats.lastRequestAt = new Date();
  this.lastError = {
    message: errorMessage,
    code: errorCode,
    timestamp: new Date(),
  };
  this.status = "error";
  return this.save();
};

/**
 * Update integration-specific data (dynamic field)
 */
integrationSchema.methods.updateData = function (key, value) {
  if (!this.data) {
    this.data = {};
  }
  this.data[key] = value;
  this.markModified("data"); // Required for Mixed type
  return this.save();
};

/**
 * Get integration-specific data
 */
integrationSchema.methods.getData = function (key, defaultValue = null) {
  return this.data?.[key] ?? defaultValue;
};

/**
 * Encrypt and store credentials (replaces the whole set).
 * Caller must save() afterwards (or use setCredentialsAndSave).
 * @param {Object} plainObj
 */
integrationSchema.methods.setCredentials = function (plainObj) {
  this.credentialsEnc = encryptObject(plainObj || {});
  this.credentialsUpdatedAt = new Date();
  return this;
};

/**
 * Decrypt stored credentials. Requires credentialsEnc to be loaded
 * (query with .select("+credentialsEnc")). Returns {} when none stored.
 */
integrationSchema.methods.getCredentials = function () {
  if (!this.credentialsEnc) {
    console.warn(
      `[Integration:${this.name}] getCredentials: no credentialsEnc loaded (not saved, or query missing +credentialsEnc)`,
    );
    return {};
  }
  return decryptObject(this.credentialsEnc);
};

/**
 * Masked view: { key: { hasValue, last4 } }
 */
integrationSchema.methods.getMaskedCredentials = function () {
  return maskObject(this.getCredentials());
};

integrationSchema.methods.hasCredentials = function () {
  return !!this.credentialsEnc;
};

/**
 * Mark integration as active
 */
integrationSchema.methods.activate = function () {
  this.status = "active";
  this.config.enabled = true;
  this.setupCompletedAt = new Date();
  return this.save();
};

/**
 * Mark integration as inactive
 */
integrationSchema.methods.deactivate = function () {
  this.status = "inactive";
  this.config.enabled = false;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get or create integration
 */
integrationSchema.statics.getOrCreate = async function (
  name,
  displayName,
  category,
) {
  let integration = await this.findOne({ name });

  if (!integration) {
    integration = await this.create({
      name,
      displayName,
      category,
      status: "inactive",
    });
  }

  return integration;
};

/**
 * Get active integrations by category
 */
/**
 * Load an integration including its encrypted credentials blob.
 */
integrationSchema.statics.findWithCredentials = function (name) {
  return this.findOne({ name }).select("+credentialsEnc");
};

integrationSchema.statics.getActiveByCategory = function (category) {
  return this.find({
    category,
    status: "active",
    "config.enabled": true,
  });
};

// ==================== INDEXES ====================
// Note: name index removed - already defined with unique: true inline

integrationSchema.index({ category: 1, status: 1 });
integrationSchema.index({ status: 1 });

export default mongoose.model("Integration", integrationSchema);
