import Product from "../models/Product.js";
import { downloadImage } from "./imageStorage.js";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../config/prompt.js";

/**
 * Merge Service
 * Handles merging multiple product listings into a single product
 */

// Lazy-loaded OpenAI client (initialized on first use, after dotenv loads)
let openai = null;
const getOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

/**
 * Convert image buffer to base64 data URL
 * @param {Buffer} buffer - Image buffer
 * @returns {string} - Base64 data URL
 */
const toDataUrl = (buffer) => {
  const base64 = buffer.toString("base64");
  return `data:image/jpeg;base64,${base64}`;
};

/**
 * Get most common non-empty value from array of values
 * @param {Array} values - Array of values
 * @returns {string|null} - Most common value
 */
const getMostCommon = (values) => {
  const filtered = values.filter((v) => v && v.trim() !== "");
  if (filtered.length === 0) return null;

  const counts = {};
  filtered.forEach((val) => {
    counts[val] = (counts[val] || 0) + 1;
  });

  return Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
};

/**
 * Calculate price based on strategy
 * @param {Array<number>} prices - Array of price values
 * @param {string} strategy - Price strategy
 * @param {number|null} manualPrice - Manual price override
 * @returns {number} - Calculated price
 */
const calculatePrice = (prices, strategy, manualPrice = null) => {
  if (strategy === "manual" && manualPrice != null) {
    return manualPrice;
  }

  const validPrices = prices.filter((p) => p != null && p > 0);
  if (validPrices.length === 0) return null;

  switch (strategy) {
    case "highest":
      return Math.max(...validPrices);
    case "lowest":
      return Math.min(...validPrices);
    case "average":
      return Math.round(
        validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length,
      );
    default:
      return Math.max(...validPrices); // Default to highest
  }
};

/**
 * Generate new description using OpenAI with all product images
 * @param {Array<Object>} imageGallery - Array of image objects with gridFsId
 * @param {string} productName - Product name
 * @returns {Promise<Object>} - Description object with full and parsed fields
 */
const generateDescriptionFromImages = async (imageGallery, productName) => {
  try {
    if (!imageGallery || imageGallery.length === 0) {
      throw new Error("No images available for description generation");
    }

    // Download and convert images to base64 (limit to first 5 images for API efficiency)
    const imagesToProcess = imageGallery.slice(0, 5);
    const imageUrls = await Promise.all(
      imagesToProcess.map(async (img) => {
        const buffer = await downloadImage(img.gridFsId);
        return toDataUrl(buffer);
      }),
    );

    // Build image content array for OpenAI
    const imageContent = imageUrls.map((url) => ({
      type: "image_url",
      image_url: { url },
    }));

    // Call OpenAI API
    const response = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze these images of the same garment from different angles and generate a comprehensive product listing. Product Name: ${productName}`,
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices?.[0]?.message?.content;
    const rawDescription = Array.isArray(content)
      ? content
          .map((chunk) => chunk.text ?? chunk)
          .join("\n")
          .trim()
      : (content ?? "").trim();

    // Parse the structured response
    const parsed = {
      fabric: null,
      accents: null,
      fit: null,
      occasion: null,
    };

    // Extract Description lines
    const descMatch = rawDescription.match(
      /Description \(4 lines\):\s*\n- (.+?)\n- (.+?)\n- (.+?)\n- (.+?)(?:\n|$)/s,
    );
    if (descMatch) {
      parsed.fabric = descMatch[1].trim();
      parsed.accents = descMatch[2].trim();
      parsed.fit = descMatch[3].trim();
      parsed.occasion = descMatch[4].trim();
    }

    return {
      full: rawDescription,
      parsed,
    };
  } catch (error) {
    console.error("[MergeService] Error generating description:", error);
    throw new Error(`Failed to generate description: ${error.message}`);
  }
};

/**
 * Merge multiple products into a primary product
 * @param {string} primaryProductId - MongoDB ObjectId of primary product
 * @param {Array<string>} mergeProductIds - Array of product IDs to merge
 * @param {Object} options - Merge options
 * @param {string} options.priceStrategy - "highest" | "lowest" | "average" | "manual"
 * @param {number|null} options.manualPrice - Manual price (if strategy is "manual")
 * @param {string} options.descriptionStrategy - "keep_primary" | "keep_longest" | "regenerate"
 * @param {boolean} options.deleteAfterMerge - Whether to soft delete merged products
 * @param {string} options.mergedBy - Username/ID of user performing merge
 * @returns {Promise<Object>} - Merge result
 */
export async function mergeProducts(
  primaryProductId,
  mergeProductIds,
  options = {},
) {
  const {
    priceStrategy = "highest",
    manualPrice = null,
    descriptionStrategy = "keep_primary",
    deleteAfterMerge = true,
    mergedBy = "system",
  } = options;

  try {
    // Validate inputs
    if (!primaryProductId) {
      throw new Error("Primary product ID is required");
    }
    if (!mergeProductIds || mergeProductIds.length === 0) {
      throw new Error("At least one product to merge is required");
    }

    // Fetch all products
    const [primaryProduct, ...mergeProducts] = await Promise.all([
      Product.findById(primaryProductId),
      ...mergeProductIds.map((id) => Product.findById(id)),
    ]);

    // Validate products exist
    if (!primaryProduct) {
      throw new Error(`Primary product not found: ${primaryProductId}`);
    }

    const notFoundIds = mergeProductIds.filter(
      (id, idx) => !mergeProducts[idx],
    );
    if (notFoundIds.length > 0) {
      throw new Error(`Products not found: ${notFoundIds.join(", ")}`);
    }

    const allProducts = [primaryProduct, ...mergeProducts];

    // Log image structures for debugging
    console.log("[MergeService] Product image structures:");
    allProducts.forEach((p, idx) => {
      console.log(`  Product ${idx} (${p.sku}):`, {
        imageGalleryCount: p.imageGallery?.length || 0,
        hasLegacyImage: !!p.images?.original?.gridFsId,
        legacyImageId: p.images?.original?.gridFsId?.toString(),
      });
    });

    // 1. Merge imageGallery arrays
    const mergedImageGallery = [];
    const seenImageIds = new Set();

    allProducts.forEach((product) => {
      // Check imageGallery array (new structure)
      if (product.imageGallery && product.imageGallery.length > 0) {
        product.imageGallery.forEach((img) => {
          const imgId = img.gridFsId.toString();
          if (!seenImageIds.has(imgId)) {
            seenImageIds.add(imgId);
            mergedImageGallery.push({
              gridFsId: img.gridFsId,
              thumbnailGridFsId: img.thumbnailGridFsId,
              order: mergedImageGallery.length,
              alt: img.alt || product.name || "",
              isPrimary: mergedImageGallery.length === 0, // First image is primary
            });
          }
        });
      }
      // Fallback: Check legacy single image structure
      else if (product.images?.original?.gridFsId) {
        const imgId = product.images.original.gridFsId.toString();
        if (!seenImageIds.has(imgId)) {
          seenImageIds.add(imgId);
          mergedImageGallery.push({
            gridFsId: product.images.original.gridFsId,
            thumbnailGridFsId:
              product.images.thumbnail?.gridFsId ||
              product.images.original.gridFsId,
            order: mergedImageGallery.length,
            alt: product.name || "",
            isPrimary: mergedImageGallery.length === 0,
          });
        }
      }
    });

    console.log(
      `[MergeService] Merged ${mergedImageGallery.length} images from ${allProducts.length} products`,
    );

    // 2. Calculate new price
    const prices = allProducts.map((p) => p.price?.amount).filter(Boolean);
    const newPrice = calculatePrice(prices, priceStrategy, manualPrice);

    // 3. Handle description strategy
    let newDescription = primaryProduct.description;

    switch (descriptionStrategy) {
      case "keep_longest": {
        const descriptions = allProducts
          .map((p) => p.description?.full)
          .filter(Boolean);
        const longest = descriptions.reduce((a, b) =>
          a.length > b.length ? a : b,
        );
        const longestProduct = allProducts.find(
          (p) => p.description?.full === longest,
        );
        newDescription = longestProduct?.description || newDescription;
        break;
      }
      case "regenerate": {
        newDescription = await generateDescriptionFromImages(
          mergedImageGallery,
          primaryProduct.name,
        );
        break;
      }
      case "keep_primary":
      default:
        // Keep existing primary description
        break;
    }

    // 4. Copy best attributes (most common values)
    const bestAttributes = {
      fabric:
        getMostCommon(allProducts.map((p) => p.fabric)) ||
        primaryProduct.fabric,
      borderType:
        getMostCommon(allProducts.map((p) => p.borderType)) ||
        primaryProduct.borderType,
      occasion:
        getMostCommon(allProducts.map((p) => p.occasion)) ||
        primaryProduct.occasion,
      workType:
        getMostCommon(allProducts.map((p) => p.workType)) ||
        primaryProduct.workType,
      weight:
        getMostCommon(allProducts.map((p) => p.weight)) ||
        primaryProduct.weight,
      category:
        getMostCommon(allProducts.map((p) => p.category)) ||
        primaryProduct.category,
    };

    // 5. Merge color arrays (unique colors)
    const allColors = new Set();
    const allColorFamilies = new Set();
    allProducts.forEach((p) => {
      if (p.colors?.names) {
        p.colors.names.forEach((c) => allColors.add(c));
      }
      if (p.colors?.families) {
        p.colors.families.forEach((f) => allColorFamilies.add(f));
      }
    });

    // 6. Build merge history entries
    const mergeHistoryEntries = mergeProducts.map((product) => ({
      mergedFrom: product._id,
      mergedFromSku: product.sku,
      mergedAt: new Date(),
      mergedBy,
    }));

    // 7. Update primary product
    primaryProduct.imageGallery = mergedImageGallery;

    // Update images.thumbnail with the primary image for backward compatibility
    if (mergedImageGallery.length > 0) {
      const primaryImage = mergedImageGallery[0];
      primaryProduct.images.thumbnail = {
        gridFsId: primaryImage.thumbnailGridFsId || primaryImage.gridFsId,
        filename: primaryImage.alt || "merged-thumbnail.jpg",
      };
      primaryProduct.images.original = {
        gridFsId: primaryImage.gridFsId,
        filename: primaryImage.alt || "merged-image.jpg",
      };
    }

    primaryProduct.price.amount = newPrice;
    primaryProduct.description = newDescription;
    Object.assign(primaryProduct, bestAttributes);
    primaryProduct.colors.names = Array.from(allColors);
    primaryProduct.colors.families = Array.from(allColorFamilies);
    primaryProduct.mergeHistory.push(...mergeHistoryEntries);

    // Merge tags (unique)
    const allTags = new Set(primaryProduct.tags || []);
    mergeProducts.forEach((p) => {
      if (p.tags) {
        p.tags.forEach((tag) => allTags.add(tag));
      }
    });
    primaryProduct.tags = Array.from(allTags);

    // Merge categories (unique by categoryId)
    const existingCategoryIds = new Set(
      primaryProduct.categories.map((c) => c.categoryId.toString()),
    );
    mergeProducts.forEach((p) => {
      if (p.categories) {
        p.categories.forEach((cat) => {
          const catId = cat.categoryId.toString();
          if (!existingCategoryIds.has(catId)) {
            primaryProduct.categories.push(cat);
            existingCategoryIds.add(catId);
          }
        });
      }
    });

    await primaryProduct.save();

    // 8. Permanently delete merged products
    const deletedProductIds = [];
    if (deleteAfterMerge) {
      await Promise.all(
        mergeProducts.map(async (product) => {
          deletedProductIds.push(product._id.toString());
          await Product.deleteOne({ _id: product._id });
        }),
      );
    }

    return {
      mergedProduct: primaryProduct,
      deletedProductIds,
      newImageCount: mergedImageGallery.length,
      mergedFromCount: mergeProducts.length,
      priceChanged: primaryProduct.price.amount !== prices[0],
      descriptionRegenerated: descriptionStrategy === "regenerate",
    };
  } catch (error) {
    console.error("[MergeService] Error merging products:", error);
    throw error;
  }
}

/**
 * Get merge candidates for a product (similar products based on attributes)
 * @param {string} productId - MongoDB ObjectId of product
 * @param {number} limit - Maximum number of candidates to return
 * @returns {Promise<Array>} - Array of potential merge candidates
 */
export async function getMergeCandidates(productId, limit = 10) {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Find similar products based on:
    // - Same category
    // - Similar colors
    // - Similar price range (±30%)
    // - Not already deleted
    // - Not the same product
    const query = {
      _id: { $ne: product._id },
      deletedAt: null,
      category: product.category,
    };

    // Add price range if price exists
    if (product.price?.amount) {
      const priceMin = product.price.amount * 0.7;
      const priceMax = product.price.amount * 1.3;
      query["price.amount"] = { $gte: priceMin, $lte: priceMax };
    }

    // Add color similarity if colors exist
    if (product.colors?.names?.length > 0) {
      query["colors.names"] = { $in: product.colors.names };
    }

    const candidates = await Product.find(query)
      .select("sku name category price colors imageGallery fabric occasion")
      .limit(limit)
      .lean();

    return candidates;
  } catch (error) {
    console.error("[MergeService] Error getting merge candidates:", error);
    throw error;
  }
}

/**
 * Unmerge products (restore soft-deleted products that were merged)
 * @param {string} primaryProductId - MongoDB ObjectId of primary product
 * @param {Array<string>} unmergeProductIds - Product IDs to restore
 * @returns {Promise<Object>} - Unmerge result
 */
export async function unmergeProducts(primaryProductId, unmergeProductIds) {
  try {
    const primaryProduct = await Product.findById(primaryProductId);
    if (!primaryProduct) {
      throw new Error(`Primary product not found: ${primaryProductId}`);
    }

    // Find products to restore
    const productsToRestore = await Product.find({
      _id: { $in: unmergeProductIds },
      deletedAt: { $ne: null },
      deletedReason: `Merged into: ${primaryProduct.sku}`,
    });

    if (productsToRestore.length === 0) {
      throw new Error("No merged products found to restore");
    }

    // Restore products
    await Promise.all(
      productsToRestore.map(async (product) => {
        product.deletedAt = null;
        product.deletedReason = null;
        await product.save();
      }),
    );

    // Remove from merge history
    primaryProduct.mergeHistory = primaryProduct.mergeHistory.filter(
      (entry) => !unmergeProductIds.includes(entry.mergedFrom.toString()),
    );

    await primaryProduct.save();

    return {
      restoredProducts: productsToRestore.map((p) => ({
        id: p._id,
        sku: p.sku,
        name: p.name,
      })),
      restoredCount: productsToRestore.length,
    };
  } catch (error) {
    console.error("[MergeService] Error unmerging products:", error);
    throw error;
  }
}

export default {
  mergeProducts,
  getMergeCandidates,
  unmergeProducts,
};
