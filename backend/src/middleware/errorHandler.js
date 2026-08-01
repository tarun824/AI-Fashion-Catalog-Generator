/**
 * Central Error Handler Middleware
 * - Logs all errors to AuditLog with tag: "error"
 * - Returns consistent JSON error responses
 * - Captures: error message, stack trace, request info, user info
 */

import { logError } from "../utils/auditLogger.js";

/**
 * Custom error class for operational errors
 * (expected errors like validation failures, not found, etc.)
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Determine if error is operational (expected) or programming error
 */
function isOperationalError(error) {
  return error.isOperational === true;
}

/**
 * Determine error severity level
 */
function getErrorLevel(error, statusCode) {
  // Critical: Server crashes, database connection failures
  if (statusCode >= 500 && !isOperationalError(error)) {
    return "critical";
  }

  // Error: Server errors (500s)
  if (statusCode >= 500) {
    return "error";
  }

  // Warning: Client errors (400s)
  if (statusCode >= 400) {
    return "warning";
  }

  return "error";
}

/**
 * Get appropriate HTTP status code from error
 */
function getStatusCode(error) {
  // If error has statusCode, use it
  if (error.statusCode) {
    return error.statusCode;
  }

  // Mongoose validation error
  if (error.name === "ValidationError") {
    return 400;
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === "CastError") {
    return 400;
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    return 409;
  }

  // JWT errors
  if (
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError"
  ) {
    return 401;
  }

  // Default to 500
  return 500;
}

/**
 * Format error message for client response
 */
function formatErrorMessage(error, statusCode, isDevelopment) {
  // For validation errors, extract the messages
  if (error.name === "ValidationError" && error.errors) {
    const messages = Object.values(error.errors).map((e) => e.message);
    return messages.join(". ");
  }

  // For duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    return field
      ? `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`
      : "Duplicate value error.";
  }

  // For operational errors, show the message
  if (isOperationalError(error)) {
    return error.message;
  }

  // For programming errors in production, hide details
  if (statusCode >= 500 && !isDevelopment) {
    return "Something went wrong. Please try again later.";
  }

  return error.message || "An unexpected error occurred.";
}

/**
 * Central error handler middleware
 * Must be registered LAST in the middleware chain
 */
export default async function errorHandler(err, req, res, _next) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const statusCode = getStatusCode(err);
  const level = getErrorLevel(err, statusCode);
  const message = formatErrorMessage(err, statusCode, isDevelopment);

  // Log error to console in development
  if (isDevelopment) {
    console.error(`\n❌ [${statusCode}] ${err.message}`);
    if (statusCode >= 500) {
      console.error(err.stack);
    }
  }

  // Log to AuditLog (async, don't wait)
  logError(err, req, {
    statusCode,
    level,
    isOperational: isOperationalError(err),
    route: `${req.method} ${req.originalUrl}`,
  }).catch((logErr) => {
    console.error("Failed to log error to audit:", logErr);
  });

  // Build response
  const response = {
    error: message,
    ...(err.code && { code: err.code }),
  };

  // Add stack trace in development for debugging
  if (isDevelopment && statusCode >= 500) {
    response.stack = err.stack;
  }

  // Add validation errors if present
  if (err.name === "ValidationError" && err.errors) {
    response.validationErrors = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  res.status(statusCode).json(response);
}
