/**
 * Generic Audit Logger Utility
 * Centralized logging for all system events
 */

import AuditLog from "../models/AuditLog.js";

/**
 * Create an audit log entry
 *
 * @param {Object} options - Audit log options
 * @param {string} options.title - Event title (required)
 * @param {string} options.description - Detailed description
 * @param {string} options.tag - Event tag for filtering (required)
 * @param {string} options.level - Severity level: info|warning|error|critical
 * @param {Object} options.metadata - Additional structured data
 * @param {string} options.userId - User ID (if applicable)
 * @param {string} options.userName - User name (if applicable)
 * @param {string} options.ipAddress - IP address
 * @param {string} options.userAgent - User agent
 * @param {Object} options.request - Request details
 * @param {Object} options.response - Response details
 * @param {Object} options.error - Error object
 * @param {Array} options.alertChannels - Alert channels (email, teams, slack)
 *
 * @returns {Promise<AuditLog>} Created audit log
 */
export async function createAuditLog(options) {
  try {
    const {
      title,
      description,
      tag,
      level = "info",
      metadata = {},
      userId,
      userName,
      ipAddress,
      userAgent,
      request,
      response,
      error,
      alertChannels = [],
    } = options;

    // Validation
    if (!title || !tag) {
      console.error("Audit log requires title and tag");
      return null;
    }

    // Create log entry
    const auditLog = new AuditLog({
      title,
      description,
      tag,
      level,
      metadata,
      userId,
      userName,
      ipAddress,
      userAgent,
      request: request
        ? {
            method: request.method,
            url: request.url || request.originalUrl,
            headers: sanitizeHeaders(request.headers),
            body: sanitizeBody(request.body),
            query: request.query,
          }
        : undefined,
      response: response
        ? {
            statusCode: response.statusCode,
            data: sanitizeBody(response.data),
          }
        : undefined,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            code: error.code,
          }
        : undefined,
      alertChannels,
      alertSent: false,
    });

    await auditLog.save();

    // Log to console for debugging
    const emoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
      critical: "🚨",
    };

    console.log(`${emoji[level]} [AUDIT] [${tag}] ${title}`);

    // TODO: Send alerts if channels specified
    if (alertChannels.length > 0 && level !== "info") {
      // Future: Send to email/Teams/Slack
      console.log(`🔔 Alert queued for channels: ${alertChannels.join(", ")}`);
    }

    return auditLog;
  } catch (err) {
    console.error("Failed to create audit log:", err);
    return null;
  }
}

/**
 * Helper: Sanitize headers (remove sensitive data)
 */
function sanitizeHeaders(headers) {
  if (!headers) return undefined;

  const sanitized = { ...headers };

  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized["x-api-key"];

  return sanitized;
}

/**
 * Helper: Sanitize request/response body
 */
function sanitizeBody(body) {
  if (!body) return undefined;

  // Convert to plain object
  const sanitized = JSON.parse(JSON.stringify(body));

  // Remove sensitive fields
  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "secret",
    "creditCard",
    "cvv",
    "ssn",
  ];

  function removeSensitive(obj) {
    if (typeof obj !== "object" || obj === null) return;

    for (const key in obj) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        obj[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object") {
        removeSensitive(obj[key]);
      }
    }
  }

  removeSensitive(sanitized);
  return sanitized;
}

/**
 * Quick logging functions for common events
 */

export function logAdminLogin(admin, req) {
  return createAuditLog({
    title: "Admin Login",
    description: `${admin.name} logged in successfully`,
    tag: "admin_login",
    level: "info",
    userId: admin._id,
    userName: admin.name,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    metadata: {
      email: admin.email,
      role: admin.role,
    },
  });
}

export function logAdminLogout(admin, req) {
  return createAuditLog({
    title: "Admin Logout",
    description: `${admin.name} logged out`,
    tag: "admin_logout",
    level: "info",
    userId: admin._id,
    userName: admin.name,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

export function logError(error, req, context = {}) {
  return createAuditLog({
    title: "Application Error",
    description: error.message,
    tag: "error",
    level: "error",
    userId: req?.admin?._id,
    userName: req?.admin?.name,
    ipAddress: req?.ip,
    userAgent: req?.get?.("user-agent"),
    request: req,
    error,
    metadata: context,
    alertChannels: ["email"], // Send email for errors
  });
}

export function logWebhook(webhookType, data, req) {
  return createAuditLog({
    title: `Webhook Received: ${webhookType}`,
    description: `Incoming webhook from ${webhookType}`,
    tag: `${webhookType.toLowerCase()}_webhook`,
    level: "info",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    request: req,
    metadata: data,
  });
}

export function logOrderCreated(order, admin, req) {
  return createAuditLog({
    title: "Order Created",
    description: `Order ${order.orderNumber} created for ${order.customer.name}`,
    tag: "order_created",
    level: "info",
    userId: admin._id,
    userName: admin.name,
    ipAddress: req.ip,
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.pricing.total,
      customerPhone: order.customer.phone,
    },
  });
}

export function logShipmentCreated(order, shipmentData, admin) {
  return createAuditLog({
    title: "Shipment Created",
    description: `Shipment created for order ${order.orderNumber}`,
    tag: "shipment_created",
    level: "info",
    userId: admin?._id,
    userName: admin?.name,
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      awbCode: shipmentData.awbCode,
      courier: shipmentData.courierName,
    },
  });
}

export default {
  createAuditLog,
  logAdminLogin,
  logAdminLogout,
  logError,
  logWebhook,
  logOrderCreated,
  logShipmentCreated,
};
