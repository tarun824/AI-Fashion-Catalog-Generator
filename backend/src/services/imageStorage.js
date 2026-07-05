import { Readable } from "stream";
import sharp from "sharp";
import { getGridFSBucket } from "../config/database.js";

/**
 * GridFS Image Storage Service
 * Handles uploading, downloading, and thumbnail generation for product images
 */

/**
 * Upload an image to GridFS
 * @param {Buffer} buffer - Image buffer
 * @param {Object} metadata - File metadata
 * @returns {Promise<ObjectId>} - GridFS file ID
 */
export async function uploadImage(buffer, metadata = {}) {
  const bucket = getGridFSBucket();

  const filename = metadata.filename || `image-${Date.now()}.jpg`;
  const uploadStream = bucket.openUploadStream(filename, {
    contentType: metadata.mimeType || "image/jpeg",
    metadata: {
      originalName: metadata.originalName,
      size: buffer.length,
      uploadedAt: new Date(),
      ...metadata,
    },
  });

  return new Promise((resolve, reject) => {
    const readStream = Readable.from(buffer);

    readStream
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => {
        resolve(uploadStream.id);
      });
  });
}

/**
 * Download an image from GridFS
 * @param {ObjectId|string} fileId - GridFS file ID
 * @returns {Promise<Buffer>} - Image buffer
 */
export async function downloadImage(fileId) {
  const bucket = getGridFSBucket();

  return new Promise((resolve, reject) => {
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream
      .on("data", (chunk) => chunks.push(chunk))
      .on("error", reject)
      .on("end", () => {
        resolve(Buffer.concat(chunks));
      });
  });
}

/**
 * Delete an image from GridFS
 * @param {ObjectId|string} fileId - GridFS file ID
 * @returns {Promise<boolean>}
 */
export async function deleteImage(fileId) {
  const bucket = getGridFSBucket();

  try {
    await bucket.delete(fileId);
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}

/**
 * Generate and upload thumbnail
 * @param {Buffer} originalBuffer - Original image buffer
 * @param {Object} metadata - File metadata
 * @param {number} maxSize - Maximum dimension (default 150px)
 * @returns {Promise<ObjectId>} - Thumbnail GridFS file ID
 */
export async function generateAndUploadThumbnail(
  originalBuffer,
  metadata = {},
  maxSize = 150,
) {
  try {
    // Generate thumbnail using sharp
    const thumbnailBuffer = await sharp(originalBuffer)
      .resize(maxSize, maxSize, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail
    const thumbnailFilename = metadata.filename
      ? `thumb-${metadata.filename}`
      : `thumb-${Date.now()}.jpg`;

    const thumbnailId = await uploadImage(thumbnailBuffer, {
      ...metadata,
      filename: thumbnailFilename,
      mimeType: "image/jpeg",
      isThumbnail: true,
      originalSize: originalBuffer.length,
      thumbnailSize: thumbnailBuffer.length,
    });

    return thumbnailId;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    throw error;
  }
}

/**
 * Upload image with automatic thumbnail generation
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} metadata - File metadata
 * @returns {Promise<Object>} - Object with original and thumbnail IDs
 */
export async function uploadImageWithThumbnail(buffer, metadata = {}) {
  // Upload original
  const originalId = await uploadImage(buffer, metadata);

  // Generate and upload thumbnail
  let thumbnailId = null;
  try {
    thumbnailId = await generateAndUploadThumbnail(buffer, metadata);
  } catch (error) {
    console.warn("Failed to generate thumbnail:", error.message);
    // Continue without thumbnail if generation fails
  }

  return {
    originalId,
    thumbnailId,
  };
}

/**
 * Check if image exists in GridFS
 * @param {ObjectId|string} fileId - GridFS file ID
 * @returns {Promise<boolean>}
 */
export async function imageExists(fileId) {
  const bucket = getGridFSBucket();

  try {
    const files = await bucket.find({ _id: fileId }).toArray();
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get image metadata
 * @param {ObjectId|string} fileId - GridFS file ID
 * @returns {Promise<Object|null>}
 */
export async function getImageMetadata(fileId) {
  const bucket = getGridFSBucket();

  try {
    const files = await bucket.find({ _id: fileId }).toArray();
    return files.length > 0 ? files[0] : null;
  } catch (error) {
    console.error("Error getting image metadata:", error);
    return null;
  }
}

/**
 * Delete product images (original + thumbnail)
 * @param {Object} images - Images object from Product model
 * @returns {Promise<void>}
 */
export async function deleteProductImages(images) {
  const deletePromises = [];

  if (images?.original?.gridFsId) {
    deletePromises.push(deleteImage(images.original.gridFsId));
  }

  if (images?.thumbnail?.gridFsId) {
    deletePromises.push(deleteImage(images.thumbnail.gridFsId));
  }

  await Promise.all(deletePromises);
}

export default {
  uploadImage,
  downloadImage,
  deleteImage,
  generateAndUploadThumbnail,
  uploadImageWithThumbnail,
  imageExists,
  getImageMetadata,
  deleteProductImages,
};
