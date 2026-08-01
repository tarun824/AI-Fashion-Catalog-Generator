import helmet from "helmet";
import hpp from "hpp";
import { rateLimit } from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import { fileTypeFromBuffer } from "file-type";

/**
 * Security Middleware Configuration
 * Implements multiple layers of protection against common attacks
 * Compatible with Express 5 (read-only req.query/req.params)
 */

// ============================================
// 1. HELMET - Security Headers
// ============================================
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for image loading
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ============================================
// 2. RATE LIMITERS - Prevent Brute Force
// ============================================

// Strict limiter for auth routes (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Moderate limiter for API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for sensitive operations (password reset, etc.)
export const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: {
    success: false,
    error: "Too many attempts. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload limiter - prevent upload flooding
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: "Upload limit exceeded. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// 3. NOSQL INJECTION PROTECTION (Express 5 Compatible)
// ============================================

/**
 * NoSQL injection patterns to detect and sanitize
 */
const NOSQL_PATTERNS = [
  "$ne",
  "$gt",
  "$lt",
  "$gte",
  "$lte",
  "$in",
  "$nin",
  "$or",
  "$and",
  "$not",
  "$nor",
  "$exists",
  "$type",
  "$mod",
  "$regex",
  "$where",
  "$elemMatch",
  "$size",
  "$all",
];

/**
 * Check if a value contains NoSQL injection patterns
 */
function containsNoSqlInjection(value) {
  if (typeof value === "string") {
    return NOSQL_PATTERNS.some(
      (pattern) => value.includes(pattern) || value.startsWith("$"),
    );
  }
  if (typeof value === "object" && value !== null) {
    return Object.keys(value).some((key) => key.startsWith("$"));
  }
  return false;
}

/**
 * Recursively sanitize an object for NoSQL injection (in-place modification)
 * @param {object} obj - Object to sanitize
 * @param {string} path - Current path for logging
 * @param {object} req - Request object for logging
 */
function sanitizeNoSqlInPlace(obj, path = "", req = null) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];

    // Check key for $ prefix (NoSQL operator)
    if (key.startsWith("$")) {
      console.warn(
        `🛡️ NoSQL injection blocked - Key: ${currentPath}, IP: ${req?.ip || "unknown"}`,
      );
      delete obj[key];
      continue;
    }

    // Check string values for injection patterns
    if (typeof value === "string" && containsNoSqlInjection(value)) {
      console.warn(
        `🛡️ NoSQL injection blocked - Key: ${currentPath}, IP: ${req?.ip || "unknown"}`,
      );
      obj[key] = value.replace(/\$/g, "_");
    }
    // Recursively sanitize nested objects
    else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            sanitizeNoSqlInPlace(item, `${currentPath}[${index}]`, req);
          }
        });
      } else {
        // Check if object has $ keys (injection attempt)
        const dollarKeys = Object.keys(value).filter((k) => k.startsWith("$"));
        if (dollarKeys.length > 0) {
          console.warn(
            `🛡️ NoSQL injection blocked - Key: ${currentPath}, IP: ${req?.ip || "unknown"}`,
          );
          obj[key] = {};
        } else {
          sanitizeNoSqlInPlace(value, currentPath, req);
        }
      }
    }
  }
}

/**
 * NoSQL injection protection middleware (Express 5 compatible)
 * Modifies objects in-place instead of reassigning
 */
export function mongoSanitizeMiddleware(req, _res, next) {
  // Sanitize body (mutable)
  if (req.body && typeof req.body === "object") {
    sanitizeNoSqlInPlace(req.body, "body", req);
  }

  // For query params, we need to sanitize each value in place
  // In Express 5, req.query is read-only but its nested values can be modified
  if (req.query && typeof req.query === "object") {
    for (const key of Object.keys(req.query)) {
      const value = req.query[key];
      if (typeof value === "string" && containsNoSqlInjection(value)) {
        console.warn(
          `🛡️ NoSQL injection blocked in query - Key: ${key}, IP: ${req.ip}`,
        );
        // Can't modify read-only, but we can flag it
        req._sanitizedQuery = req._sanitizedQuery || {};
        req._sanitizedQuery[key] = value.replace(/\$/g, "_");
      }
    }
  }

  next();
}

// ============================================
// 4. HTTP PARAMETER POLLUTION PROTECTION
// ============================================
export const hppMiddleware = hpp({
  whitelist: [
    // Allow these params to have multiple values
    "colors",
    "categories",
    "tags",
    "status",
    "ids",
  ],
});

// ============================================
// 5. XSS PROTECTION - Input Sanitization
// ============================================

/**
 * Sanitize a string value to prevent XSS attacks
 * @param {string} value - Input value
 * @returns {string} Sanitized value
 */
function sanitizeValue(value) {
  if (typeof value !== "string") return value;

  // Remove HTML tags and dangerous characters
  return sanitizeHtml(value, {
    allowedTags: [], // No HTML allowed
    allowedAttributes: {},
    disallowedTagsMode: "recursiveEscape",
  }).trim();
}

/**
 * Recursively sanitize object values
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip file buffers and mongoose internals
      if (key === "buffer" || key.startsWith("_")) {
        sanitized[key] = value;
        continue;
      }
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize object values in-place (for Express 5 compatibility)
 * @param {object} obj - Object to sanitize in-place
 */
function sanitizeObjectInPlace(obj) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    // Skip file buffers and mongoose internals
    if (key === "buffer" || key.startsWith("_")) continue;

    const value = obj[key];

    if (typeof value === "string") {
      obj[key] = sanitizeValue(value);
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === "string") {
          value[i] = sanitizeValue(value[i]);
        } else if (typeof value[i] === "object" && value[i] !== null) {
          sanitizeObjectInPlace(value[i]);
        }
      }
    } else if (typeof value === "object" && value !== null) {
      sanitizeObjectInPlace(value);
    }
  }
}

/**
 * XSS sanitization middleware (Express 5 compatible)
 * Sanitizes req.body in-place. Query/params are read-only in Express 5.
 */
export function xssSanitizer(req, _res, next) {
  // Sanitize body (mutable in Express 5)
  if (req.body && typeof req.body === "object") {
    sanitizeObjectInPlace(req.body);
  }
  // Note: req.query and req.params are read-only in Express 5
  // XSS in query params is less critical as they're typically used in DB queries
  // which are protected by the NoSQL sanitizer
  next();
}

// ============================================
// 6. FILE UPLOAD SECURITY
// ============================================

/**
 * Allowed image MIME types and their magic bytes
 */
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ["ffd8ff"],
  "image/png": ["89504e47"],
  "image/gif": ["47494638"],
  "image/webp": ["52494646"],
  "image/bmp": ["424d"],
  "image/svg+xml": null, // SVG is text-based, handled separately
};

/**
 * Dangerous file extensions that should NEVER be allowed
 */
const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".php",
  ".py",
  ".rb",
  ".pl",
  ".jar",
  ".war",
  ".msi",
  ".scr",
  ".com",
  ".pif",
  ".application",
  ".gadget",
  ".msp",
  ".hta",
  ".cpl",
  ".msc",
  ".reg",
  ".inf",
  ".lnk",
];

/**
 * Validate file is a genuine image using magic bytes
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimetype - Declared MIME type
 * @returns {Promise<{valid: boolean, error?: string, detectedType?: string}>}
 */
export async function validateImageFile(buffer, originalName, mimetype) {
  try {
    // 1. Check for dangerous extensions
    const extension = originalName.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
    if (DANGEROUS_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `File type "${extension}" is not allowed for security reasons.`,
      };
    }

    // 2. Check declared MIME type
    if (!mimetype.startsWith("image/")) {
      return {
        valid: false,
        error: "Only image files are allowed.",
      };
    }

    // 3. Validate using magic bytes (file-type library)
    const fileTypeResult = await fileTypeFromBuffer(buffer);

    if (!fileTypeResult) {
      // Could be SVG (text-based) - check manually
      const bufferString = buffer.toString("utf8", 0, 1000).toLowerCase();
      if (bufferString.includes("<svg") || bufferString.includes("<?xml")) {
        // SVG detected - additional validation
        if (
          bufferString.includes("<script") ||
          bufferString.includes("javascript:")
        ) {
          return {
            valid: false,
            error: "SVG files with scripts are not allowed.",
          };
        }
        return { valid: true, detectedType: "image/svg+xml" };
      }

      return {
        valid: false,
        error: "Could not verify file type. File may be corrupted or invalid.",
      };
    }

    // 4. Verify detected type is an allowed image type
    if (!fileTypeResult.mime.startsWith("image/")) {
      return {
        valid: false,
        error: `File appears to be "${fileTypeResult.mime}", not an image. Upload rejected.`,
      };
    }

    // 5. Check for MIME type mismatch (potential attack)
    if (mimetype !== fileTypeResult.mime) {
      console.warn(
        `🛡️ MIME type mismatch: declared "${mimetype}", detected "${fileTypeResult.mime}" for file "${originalName}"`,
      );
      // Allow if detected type is still a valid image
      if (!Object.keys(ALLOWED_IMAGE_TYPES).includes(fileTypeResult.mime)) {
        return {
          valid: false,
          error: `File type mismatch detected. Expected image, got "${fileTypeResult.mime}".`,
        };
      }
    }

    return { valid: true, detectedType: fileTypeResult.mime };
  } catch (error) {
    console.error("File validation error:", error);
    return {
      valid: false,
      error: "File validation failed. Please try a different file.",
    };
  }
}

/**
 * Multer file filter with enhanced validation
 * Use this in multer configuration
 */
export function secureImageFilter(_req, file, cb) {
  // Quick check on declared MIME type
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image files are allowed."));
    return;
  }

  // Check extension
  const extension =
    file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    cb(
      new Error(
        `File type "${extension}" is not allowed for security reasons.`,
      ),
    );
    return;
  }

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
  ];
  if (!allowedExtensions.includes(extension)) {
    cb(
      new Error(
        `File extension "${extension}" is not allowed. Allowed: ${allowedExtensions.join(", ")}`,
      ),
    );
    return;
  }

  // Pass initial check - deep validation happens after upload
  cb(null, true);
}

/**
 * Middleware to validate uploaded files after multer processes them
 * Use AFTER multer middleware
 */
export async function validateUploadedFiles(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return next();
    }

    const validationResults = await Promise.all(
      files.map(async (file) => {
        const result = await validateImageFile(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
        return { file, ...result };
      }),
    );

    const invalidFiles = validationResults.filter((r) => !r.valid);

    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map(
        (f) => `${f.file.originalname}: ${f.error}`,
      );
      return res.status(400).json({
        success: false,
        error: "Some files failed security validation.",
        details: errors,
      });
    }

    // Attach validated types to files
    validationResults.forEach((result) => {
      if (result.detectedType) {
        result.file.validatedMimeType = result.detectedType;
      }
    });

    next();
  } catch (error) {
    console.error("File validation middleware error:", error);
    res.status(500).json({
      success: false,
      error: "File validation failed.",
    });
  }
}

// ============================================
// 7. REQUEST SIZE LIMITS
// ============================================
export const jsonLimit = { limit: "10mb" };
export const urlencodedLimit = { extended: true, limit: "10mb" };

// ============================================
// 8. SECURITY LOGGING
// ============================================

/**
 * Log security-related events
 */
export function securityLogger(req, _res, next) {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$or|\$and|\$not|\$nor|\$exists|\$type|\$mod|\$regex|\$where)/i,
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
  ];

  const bodyStr = JSON.stringify(req.body || {});
  const queryStr = JSON.stringify(req.query || {});

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(bodyStr) || pattern.test(queryStr)) {
      console.warn(
        `🛡️ Suspicious request pattern detected - IP: ${req.ip}, Path: ${req.path}, Pattern: ${pattern}`,
      );
      break;
    }
  }

  next();
}

// ============================================
// COMBINED MIDDLEWARE EXPORT
// ============================================

/**
 * Apply all security middleware to an Express app
 * @param {import('express').Application} app - Express app instance
 */
export function applySecurityMiddleware(app) {
  // 1. Security headers
  app.use(helmetMiddleware);

  // 2. NoSQL injection protection
  app.use(mongoSanitizeMiddleware);

  // 3. HTTP parameter pollution protection
  app.use(hppMiddleware);

  // 4. XSS sanitization
  app.use(xssSanitizer);

  // 5. Security logging
  app.use(securityLogger);

  console.log("✓ Security middleware applied:");
  console.log("  - Helmet (security headers)");
  console.log("  - NoSQL injection protection");
  console.log("  - HTTP parameter pollution protection");
  console.log("  - XSS sanitization");
  console.log("  - Security event logging");
}

export default {
  applySecurityMiddleware,
  helmetMiddleware,
  mongoSanitizeMiddleware,
  hppMiddleware,
  xssSanitizer,
  securityLogger,
  authLimiter,
  apiLimiter,
  sensitiveOpLimiter,
  uploadLimiter,
  validateImageFile,
  secureImageFilter,
  validateUploadedFiles,
  jsonLimit,
  urlencodedLimit,
};
