import express from "express";
import { downloadImage, getImageMetadata } from "../services/imageStorage.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/images/:id
 * Serve image from GridFS
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid image ID",
      });
    }

    // Get image metadata
    const metadata = await getImageMetadata(new mongoose.Types.ObjectId(id));

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: "Image not found",
      });
    }

    // Download image buffer
    const imageBuffer = await downloadImage(new mongoose.Types.ObjectId(id));

    // Set content type
    const contentType = metadata.contentType || "image/jpeg";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    // Send image
    res.send(imageBuffer);
  } catch (error) {
    console.error("Serve image error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve image",
    });
  }
});

export default router;
