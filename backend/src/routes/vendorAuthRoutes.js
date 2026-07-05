import express from "express";
import Vendor from "../models/Vendor.js";
import { generateVendorToken, vendorAuthMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/vendor/auth/register
 * Vendor self-registration - creates a vendor account and returns a JWT token
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, businessName, contactPhone } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({
        success: false,
        error: "Email, password, and business name are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const existing = await Vendor.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "A vendor account with this email already exists",
      });
    }

    const vendor = await Vendor.createVendor({
      email,
      password,
      businessName,
      contactPhone,
    });

    const token = generateVendorToken(vendor);

    res.status(201).json({
      success: true,
      data: {
        token,
        vendor: {
          id: vendor._id,
          email: vendor.email,
          businessName: vendor.businessName,
        },
      },
    });
  } catch (error) {
    console.error("Vendor register error:", error);
    res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
});

/**
 * POST /api/vendor/auth/login
 * Vendor login - returns JWT token
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const vendor = await Vendor.findByEmail(email);
    if (!vendor) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    await vendor.updateLastLogin();

    const token = generateVendorToken(vendor);

    res.json({
      success: true,
      data: {
        token,
        vendor: {
          id: vendor._id,
          email: vendor.email,
          businessName: vendor.businessName,
        },
      },
    });
  } catch (error) {
    console.error("Vendor login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

/**
 * GET /api/vendor/auth/me
 * Get current vendor info (requires authentication)
 */
router.get("/me", vendorAuthMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: {
      vendor: {
        id: req.vendor._id,
        email: req.vendor.email,
        businessName: req.vendor.businessName,
        contactPhone: req.vendor.contactPhone,
        lastLogin: req.vendor.lastLogin,
        createdAt: req.vendor.createdAt,
      },
    },
  });
});

export default router;
