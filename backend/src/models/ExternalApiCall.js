import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * ExternalApiCall
 * One document per HTTP call made to (or received from) an external system:
 * marketplaces, Shiprocket, webhooks. Every retry is its own row.
 * Bodies/headers are stored REDACTED (secrets always; buyer PII masked by default).
 * Rows expire via the TTL index on `expiresAt` (successes ~30d, failures ~90d).
 */
const externalApiCallSchema = new Schema(
  {
    // Identity
    provider: { type: String, required: true, index: true }, // amazon, flipkart, shiprocket...
    operation: { type: String, default: "unknown" }, // fetchOrders, confirmShipment, token, ...
    direction: { type: String, enum: ["outbound", "inbound"], default: "outbound" },

    // Tracing
    correlationId: { type: String, index: true }, // one per button click / webhook
    attempt: { type: Number, default: 1 }, // 1-based, increments on retry
    retryOf: { type: Schema.Types.ObjectId, ref: "ExternalApiCall", default: null },
    trigger: { type: String, enum: ["manual", "webhook", "system"], default: "system" },
    triggeredBy: { type: Schema.Types.ObjectId, default: null }, // admin id

    // Business link
    context: {
      orderId: { type: String, index: true },
      externalOrderId: { type: String },
      productId: { type: String },
      sku: { type: String },
    },

    // Request
    request: {
      method: { type: String },
      url: { type: String }, // path + sanitized query
      host: { type: String },
      headers: { type: Schema.Types.Mixed },
      body: { type: Schema.Types.Mixed },
      bodyTruncated: { type: Boolean, default: false },
      bodySize: { type: Number },
    },

    // Response
    response: {
      status: { type: Number },
      headers: { type: Schema.Types.Mixed }, // only useful ones (rate limit, request id)
      body: { type: Schema.Types.Mixed },
      bodyTruncated: { type: Boolean, default: false },
      bodySize: { type: Number },
      contentType: { type: String },
    },

    // Outcome
    success: { type: Boolean, required: true, index: true },
    durationMs: { type: Number },
    errorType: { type: String }, // ProviderError.type or network code (ECONNABORTED...)
    errorMessage: { type: String, maxlength: 2000 },
    startedAt: { type: Date, default: Date.now },

    // Retention
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "external_api_calls" },
);

externalApiCallSchema.index({ provider: 1, createdAt: -1 });
externalApiCallSchema.index({ success: 1, createdAt: -1 });
externalApiCallSchema.index({ "response.status": 1, createdAt: -1 });
externalApiCallSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

export default mongoose.model("ExternalApiCall", externalApiCallSchema);
