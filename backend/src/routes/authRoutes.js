import express from "express";
import Admin from "../models/Admin.js";
import { generateToken, authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/admin/auth/login
 * Admin login - returns JWT token
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find admin by email
    const admin = await Admin.findByEmail(email);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Update last login
    await admin.updateLastLogin();

    // Generate JWT token
    const token = generateToken(admin);

    // Return success with token
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

/**
 * GET /api/admin/auth/me
 * Get current admin info (requires authentication)
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        admin: {
          id: req.admin._id,
          email: req.admin.email,
          name: req.admin.name,
          role: req.admin.role,
          lastLogin: req.admin.lastLogin,
          createdAt: req.admin.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get admin info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get admin info",
    });
  }
});

/**
 * POST /api/admin/auth/verify
 * Verify JWT token validity
 */
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        valid: true,
        admin: {
          id: req.admin._id,
          email: req.admin.email,
          role: req.admin.role,
        },
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
});

/**
 * POST /api/admin/auth/change-password
 * Change admin password (requires authentication)
 */
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters",
      });
    }

    // Get full admin with password hash
    const admin = await Admin.findById(req.admin._id);

    // Verify current password
    const isPasswordValid = await admin.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    // Update password
    admin.passwordHash = newPassword; // Will be hashed by pre-save hook
    await admin.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change password",
    });
  }
});

export default router;
