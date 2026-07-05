import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Category Schema
 * Hierarchical taxonomy for organizing sarees (fabric, occasion, work type, etc.)
 */
const categorySchema = new Schema(
  {
    // Category name
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // URL-friendly slug
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Parent category for hierarchical structure
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    // Category type for filtering navigation
    type: {
      type: String,
      enum: ["fabric", "occasion", "workType", "region", "price", "collection"],
      required: true,
      index: true,
    },

    // Description for category pages
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Category banner image
    image: {
      gridFsId: {
        type: Schema.Types.ObjectId,
        default: null,
      },
      thumbnailGridFsId: {
        type: Schema.Types.ObjectId,
        default: null,
      },
      alt: {
        type: String,
        trim: true,
      },
    },

    // Sort order for display in navigation
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },

    // SEO metadata
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },

    // Visibility
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Cached product count (updated when products are published/unpublished)
    productCount: {
      type: Number,
      default: 0,
    },

    // Featured flag for homepage display
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Icon/color for visual navigation
    iconColor: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "categories",
  },
);

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parentId: 1, sortOrder: 1 });
categorySchema.index({ type: 1, isActive: 1, sortOrder: 1 });
categorySchema.index({ isFeatured: 1, sortOrder: 1 });

// Virtual for child categories
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentId",
});

// Method to get full category path (breadcrumb)
categorySchema.methods.getPath = async function () {
  const path = [this];
  let current = this;

  while (current.parentId) {
    current = await this.constructor.findById(current.parentId);
    if (current) {
      path.unshift(current);
    } else {
      break;
    }
  }

  return path;
};

// Static method to get category tree
categorySchema.statics.getTree = async function (type = null) {
  const query = { parentId: null, isActive: true };
  if (type) {
    query.type = type;
  }

  const rootCategories = await this.find(query).sort({ sortOrder: 1 }).lean();

  // Recursively load children
  const loadChildren = async (category) => {
    const children = await this.find({
      parentId: category._id,
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean();

    category.children = await Promise.all(children.map(loadChildren));
    return category;
  };

  return await Promise.all(rootCategories.map(loadChildren));
};

// Static method to update product count
categorySchema.statics.updateProductCount = async function (categoryId) {
  const Product = mongoose.model("Product");

  const count = await Product.countDocuments({
    "categories.categoryId": categoryId,
    isPublished: true,
    status: "published",
  });

  await this.findByIdAndUpdate(categoryId, { productCount: count });
};

export default mongoose.model("Category", categorySchema);
