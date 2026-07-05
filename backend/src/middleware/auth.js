import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Vendor from "../models/Vendor.js";

/**
 * JWT Authentication Middleware
 * Protects admin routes and validates JWT tokens
 */

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate JWT token for admin
 * @param {Object} admin - Admin user object
 * @returns {string} JWT token
 */
export function generateToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      type: "admin",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

/**
 * Generate JWT token for a vendor
 * @param {Object} vendor - Vendor user object
 * @returns {string} JWT token
 */
export function generateVendorToken(vendor) {
  return jwt.sign(
    {
      id: vendor._id,
      email: vendor.email,
      type: "vendor",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
export async function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided. Please login.",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token. Please login again.",
      });
    }

    // Get admin user from database
    const admin = await Admin.findById(decoded.id).select("-passwordHash");

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: "Admin user not found or inactive.",
      });
    }

    // Attach admin to request object
    req.admin = admin;
    req.adminId = admin._id;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication error",
    });
  }
}

/**
 * Vendor authentication middleware
 * Validates JWT token from Authorization header and requires a vendor account
 */
export async function vendorAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided. Please login.",
      });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token. Please login again.",
      });
    }

    if (decoded.type !== "vendor") {
      return res.status(403).json({
        success: false,
        error: "Vendor account required.",
      });
    }

    const vendor = await Vendor.findById(decoded.id).select("-passwordHash");

    if (!vendor || !vendor.isActive) {
      return res.status(401).json({
        success: false,
        error: "Vendor account not found or inactive.",
      });
    }

    req.vendor = vendor;
    req.vendorId = vendor._id;

    next();
  } catch (error) {
    console.error("Vendor auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication error",
    });
  }
}

/**
 * Flexible authentication middleware
 * Accepts either an admin or a vendor token; attaches req.admin or req.vendor accordingly.
 * Used by shared endpoints (e.g. batch upload) that both roles can call.
 */
export async function flexibleAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided. Please login.",
      });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token. Please login again.",
      });
    }

    if (decoded.type === "vendor") {
      const vendor = await Vendor.findById(decoded.id).select("-passwordHash");
      if (!vendor || !vendor.isActive) {
        return res.status(401).json({
          success: false,
          error: "Vendor account not found or inactive.",
        });
      }
      req.vendor = vendor;
      req.vendorId = vendor._id;
      return next();
    }

    const admin = await Admin.findById(decoded.id).select("-passwordHash");
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: "Admin user not found or inactive.",
      });
    }
    req.admin = admin;
    req.adminId = admin._id;
    next();
  } catch (error) {
    console.error("Flexible auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication error",
    });
  }
}

/**
 * Optional authentication middleware
 * Validates token if provided, but doesn't require it
 */
export async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const decoded = verifyToken(token);
        const admin = await Admin.findById(decoded.id).select("-passwordHash");

        if (admin && admin.isActive) {
          req.admin = admin;
          req.adminId = admin._id;
        }
      } catch (error) {
        // Invalid token, but continue without authentication
        console.warn("Optional auth: Invalid token provided");
      }
    }

    next();
  } catch (error) {
    // Continue even if there's an error
    next();
  }
}

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      });
    }

    next();
  };
}

export default {
  generateToken,
  generateVendorToken,
  verifyToken,
  authMiddleware,
  vendorAuthMiddleware,
  flexibleAuthMiddleware,
  optionalAuthMiddleware,
  requireRole,
};
