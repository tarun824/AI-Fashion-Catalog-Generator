import mongoose from "mongoose";
import { nextSequence } from "./Counter.js";

const { Schema } = mongoose;

// Build a "SRY-KAN-RED-8500-001" style SKU from type/color/price
const buildSku = (category, colorName, price, seq) => {
  const typeCode =
    (category || "GEN").replace(/[^A-Za-z]/g, "").slice(0, 3) || "GEN";
  const colorCode =
    (colorName || "MIX").replace(/[^A-Za-z]/g, "").slice(0, 3) || "MIX";
  const priceCode =
    price != null && !Number.isNaN(price) ? Math.round(price) : "0";
  const seqCode = String(seq).padStart(3, "0");
  return `SRY-${typeCode}-${colorCode}-${priceCode}-${seqCode}`.toUpperCase();
};

/**
 * Product Schema
 * Stores fashion catalog products with AI-generated descriptions and color analysis
 */
const productSchema = new Schema(
  {
    // Unique product identifier
    sku: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // URL-friendly slug (for public product pages)
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Product name
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // AI-generated description
    description: {
      full: {
        type: String,
        required: true,
      },
      parsed: {
        fabric: String,
        accents: String,
        fit: String,
        occasion: String,
      },
    },

    // Legacy single category field (kept for backward compatibility)
    category: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    // New: Multiple category associations for rich navigation
    categories: [
      {
        categoryId: {
          type: Schema.Types.ObjectId,
          ref: "Category",
        },
        type: {
          type: String,
          enum: [
            "fabric",
            "occasion",
            "workType",
            "region",
            "price",
            "collection",
          ],
        },
      },
    ],

    // Vendor who uploaded this product (null for admin-uploaded catalog items)
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },

    // Saree-specific structured attributes (AI-suggested, admin/vendor-editable)
    fabric: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    borderType: {
      type: String,
      trim: true,
      default: "",
    },
    occasion: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    workType: {
      type: String,
      trim: true,
      default: "",
    },
    weight: {
      type: String,
      enum: ["light", "medium", "heavy", ""],
      default: "",
    },
    blouseIncluded: {
      type: Boolean,
      default: false,
    },

    // Pricing - AI suggests, admin confirms/overrides
    price: {
      suggested: {
        type: Number,
        default: null,
      },
      amount: {
        type: Number,
        default: null,
        index: true,
      },
      currency: {
        type: String,
        default: "INR",
      },
    },

    // Inventory variants (size/color combinations with their own stock + SKU)
    variants: {
      type: [
        {
          size: { type: String, trim: true, default: "" },
          color: { type: String, trim: true, default: "" },
          sku: { type: String, trim: true },
          stock: { type: Number, default: 0, min: 0 },
          priceOverride: { type: Number, default: null },
        },
      ],
      default: [],
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
    },

    // Color information
    colors: {
      names: {
        type: [String],
        default: [],
        index: true,
      },
      families: {
        type: [String],
        enum: ["warm", "cool", "neutral", "metallic", "pastel", ""],
        default: [],
      },
      percentages: [
        {
          name: String,
          percent: Number,
        },
      ],
      palette: String, // Hex codes comma-separated
    },

    // Legacy single image object (kept for backward compatibility)
    images: {
      original: {
        gridFsId: {
          type: Schema.Types.ObjectId,
        },
        filename: String,
        size: Number,
        mimeType: String,
      },
      thumbnail: {
        gridFsId: Schema.Types.ObjectId,
        filename: String,
      },
    },

    // New: Multiple images array for product gallery
    imageGallery: [
      {
        gridFsId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        thumbnailGridFsId: {
          type: Schema.Types.ObjectId,
        },
        order: {
          type: Number,
          default: 0,
        },
        alt: {
          type: String,
          trim: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Vector embeddings for AI-powered search
    embeddings: {
      // Text embedding for semantic search (OpenAI text-embedding-3-small: 1536 dims)
      text: {
        type: [Number],
        default: undefined,
      },
      // Image embedding for visual search (CLIP: 512 dims)
      clip: {
        type: [Number],
        default: undefined,
      },
      model: String,
      generatedAt: Date,
    },

    // Metadata
    metadata: {
      uploadedBy: {
        type: String,
        default: "system",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      jobId: String,
      tokens: Number,
      processingTime: Number,
    },

    // Product status (admin view)
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    // Public visibility flag
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    // When product was made public
    publishedAt: {
      type: Date,
      index: true,
    },

    // Tags for organization
    tags: {
      type: [String],
      default: [],
    },

    // Auto-generated search keywords
    searchKeywords: {
      type: [String],
      default: [],
    },

    // SEO metadata for product pages
    seo: {
      title: {
        type: String,
        trim: true,
        maxlength: 60,
      },
      description: {
        type: String,
        trim: true,
        maxlength: 160,
      },
      keywords: {
        type: [String],
        default: [],
      },
    },

    // Product rating and reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // View count for analytics
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "products",
  },
);

// Indexes for efficient querying
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ isPublished: 1, publishedAt: -1 });
productSchema.index({ "categories.categoryId": 1, isPublished: 1 });
productSchema.index({ slug: 1 });
// Note: colors.names and colors.families indexes removed because they're already defined inline

// Helper: Generate URL-friendly slug
const generateSlug = (name, sku) => {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return `${baseSlug}-${sku.toLowerCase()}`;
};

// Auto-generate SKU and slug before validation runs. Required fields
// (like sku) are checked during validate(), which fires BEFORE
// pre('save') hooks — so this must be pre('validate'), not pre('save'),
// or the required-field check fails before we ever get a chance to set it.
productSchema.pre("validate", async function (next) {
  if (!this.sku) {
    const seq = await nextSequence("product-sku");
    this.sku = buildSku(
      this.category,
      this.colors?.names?.[0],
      this.price?.amount,
      seq,
    );
  }

  // Auto-generate slug if not provided
  if (!this.slug && this.name && this.sku) {
    this.slug = generateSlug(this.name, this.sku);
  }

  // Auto-generate variant SKUs for any variant missing one
  if (this.variants && this.variants.length > 0) {
    this.variants.forEach((variant, index) => {
      if (!variant.sku) {
        variant.sku = `${this.sku}-V${index + 1}`.toUpperCase();
      }
    });
  }

  // Auto-generate search keywords from name and description
  if (!this.searchKeywords || this.searchKeywords.length === 0) {
    const keywords = new Set();

    // Add words from name
    if (this.name) {
      this.name
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.length > 2) keywords.add(word);
        });
    }

    // Add words from description
    if (this.description?.full) {
      this.description.full
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.length > 3) keywords.add(word);
        });
    }

    // Add color names
    if (this.colors?.names) {
      this.colors.names.forEach((color) => {
        keywords.add(color.toLowerCase());
      });
    }

    // Add category
    if (this.category) {
      keywords.add(this.category.toLowerCase());
    }

    // Add saree-specific attributes
    ["fabric", "borderType", "occasion", "workType"].forEach((field) => {
      if (this[field]) {
        this[field]
          .toLowerCase()
          .split(/\s+/)
          .forEach((word) => keywords.add(word));
      }
    });

    // Add tags
    if (this.tags) {
      this.tags.forEach((tag) => keywords.add(tag.toLowerCase()));
    }

    this.searchKeywords = Array.from(keywords);
  }

  next();
});

// Virtual for image URLs (when serving through API)
productSchema.virtual("imageUrls").get(function () {
  return {
    original: this.images?.original?.gridFsId
      ? `/api/images/${this.images.original.gridFsId}`
      : null,
    thumbnail: this.images?.thumbnail?.gridFsId
      ? `/api/images/${this.images.thumbnail.gridFsId}`
      : null,
  };
});

// Virtual: total stock across all variants
productSchema.virtual("totalStock").get(function () {
  if (!this.variants || this.variants.length === 0) return null;
  return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
});

// Virtual: true if total stock is at/below the low-stock threshold
productSchema.virtual("isLowStock").get(function () {
  if (!this.variants || this.variants.length === 0) return false;
  return this.totalStock <= this.lowStockThreshold;
});

// Configure toJSON to include virtuals
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

// Static method: Search products with filters
productSchema.statics.searchProducts = async function (filters = {}) {
  const query = {};

  // Text search
  if (filters.text) {
    query.$text = { $search: filters.text };
  }

  // Color filtering
  if (filters.colors && filters.colors.length > 0) {
    if (filters.colorMode === "all") {
      query["colors.names"] = { $all: filters.colors };
    } else {
      query["colors.names"] = { $in: filters.colors };
    }
  }

  // Color families
  if (filters.colorFamilies && filters.colorFamilies.length > 0) {
    query["colors.families"] = { $in: filters.colorFamilies };
  }

  // Min color percentage
  if (filters.minColorPercent) {
    query["colors.percentages"] = {
      $elemMatch: { percent: { $gte: filters.minColorPercent } },
    };
  }

  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }

  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }

  // Vendor filter
  if (filters.vendorId) {
    query.vendorId = filters.vendorId;
  }

  // Saree-specific filters
  if (filters.fabric) {
    query.fabric = new RegExp(filters.fabric, "i");
  }
  if (filters.occasion) {
    query.occasion = new RegExp(filters.occasion, "i");
  }
  if (filters.workType) {
    query.workType = new RegExp(filters.workType, "i");
  }

  // Price range
  if (filters.minPrice || filters.maxPrice) {
    query["price.amount"] = {};
    if (filters.minPrice) query["price.amount"].$gte = Number(filters.minPrice);
    if (filters.maxPrice) query["price.amount"].$lte = Number(filters.maxPrice);
  }

  // Tags
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  // Date range
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }

  // Build sort options
  const sort = {};
  if (filters.text && !filters.sortBy) {
    sort.score = { $meta: "textScore" };
  } else {
    const sortField = filters.sortBy || "createdAt";
    const order = filters.order === "asc" ? 1 : -1;
    sort[sortField] = order;
  }

  // Pagination
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  // Execute query
  const projection = filters.text ? { score: { $meta: "textScore" } } : {};

  const [rawResults, total] = await Promise.all([
    this.find(query, projection)
      .populate("vendorId", "businessName email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  // .lean() skips virtuals, so compute stock fields manually for list views
  const results = rawResults.map((product) => {
    const totalStock = product.variants?.length
      ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      : null;
    return {
      ...product,
      totalStock,
      isLowStock:
        totalStock != null && totalStock <= (product.lowStockThreshold ?? 5),
    };
  });

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const Product = mongoose.model("Product", productSchema);

export default Product;
