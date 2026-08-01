import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Customer Schema
 * Stores customer information with AI-powered segmentation and intelligence
 */
const customerSchema = new Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[+\d\s()-]+$/,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      sparse: true, // Allow null but ensure uniqueness when set
    },

    // Multiple Addresses
    addresses: [
      {
        label: {
          type: String,
          default: "Home",
          trim: true,
        },
        street: {
          type: String,
          required: true,
          trim: true,
        },
        city: {
          type: String,
          required: true,
          trim: true,
        },
        state: {
          type: String,
          required: true,
          trim: true,
        },
        pincode: {
          type: String,
          required: true,
          trim: true,
        },
        country: {
          type: String,
          default: "India",
          trim: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Customer Segmentation
    customerType: {
      type: String,
      enum: ["new", "regular", "vip", "inactive"],
      default: "new",
    },

    // Purchase History Metrics
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },

    averageOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastPurchaseDate: {
      type: Date,
      default: null,
    },

    customerSince: {
      type: Date,
      default: Date.now,
    },

    // AI-Powered Tags
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Customer Preferences
    preferences: {
      preferredFabrics: [String],
      preferredOccasions: [String],
      preferredColors: [String],
      priceRange: {
        min: Number,
        max: Number,
      },
      sizes: [String],
    },

    // Communication Preferences
    communication: {
      whatsappOptIn: {
        type: Boolean,
        default: true,
      },
      emailOptIn: {
        type: Boolean,
        default: true,
      },
      smsOptIn: {
        type: Boolean,
        default: true,
      },
      preferredMethod: {
        type: String,
        enum: ["whatsapp", "email", "sms", "phone"],
        default: "whatsapp",
      },
    },

    // Customer Source
    source: {
      type: String,
      enum: [
        "website",
        "whatsapp",
        "instagram",
        "facebook",
        "referral",
        "walk-in",
        "other",
      ],
      default: "website",
    },

    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    // Notes (for admin)
    notes: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
        },
        addedBy: {
          type: Schema.Types.ObjectId,
          ref: "Admin",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // AI Intelligence Metrics
    intelligence: {
      lifetimeValue: {
        type: Number,
        default: 0,
      },
      churnRisk: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
      engagementScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lastAnalyzedAt: {
        type: Date,
        default: null,
      },
    },

    // Behavioral Data
    behavior: {
      productsViewed: {
        type: Number,
        default: 0,
      },
      categoriesViewed: [String],
      lastSeenAt: {
        type: Date,
        default: null,
      },
      cartAbandonments: {
        type: Number,
        default: 0,
      },
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    blockedReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for Performance
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ customerType: 1 });
customerSchema.index({ totalSpent: -1 });
customerSchema.index({ lastPurchaseDate: -1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ name: "text" });

// Virtual: Days Since Last Purchase
customerSchema.virtual("daysSinceLastPurchase").get(function () {
  if (!this.lastPurchaseDate) return null;
  const diffTime = Date.now() - this.lastPurchaseDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual: Is New Customer (less than 30 days old)
customerSchema.virtual("isNewCustomer").get(function () {
  const diffTime = Date.now() - this.customerSince.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return days <= 30;
});

// Method: Get Default Address
customerSchema.methods.getDefaultAddress = function () {
  return (
    this.addresses.find((addr) => addr.isDefault) || this.addresses[0] || null
  );
};

// Method: Add Note
customerSchema.methods.addNote = function (text, adminId) {
  this.notes.push({
    text,
    addedBy: adminId,
    addedAt: new Date(),
  });
  return this.save();
};

// Method: Update Purchase Metrics
customerSchema.methods.updatePurchaseMetrics = function (orderAmount) {
  this.totalOrders += 1;
  this.totalSpent += orderAmount;
  this.averageOrderValue = this.totalSpent / this.totalOrders;
  this.lastPurchaseDate = new Date();
  return this.save();
};

// Static Method: Search Customers
customerSchema.statics.searchCustomers = async function (filters = {}) {
  const {
    text,
    customerType,
    minSpent,
    maxSpent,
    minOrders,
    tags,
    source,
    churnRisk,
    isActive,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    order = "desc",
    page = 1,
    limit = 20,
  } = filters;

  // Build query
  const query = {};

  // Text search
  if (text && text.trim()) {
    query.$or = [
      { name: { $regex: text.trim(), $options: "i" } },
      { phone: { $regex: text.trim(), $options: "i" } },
      { email: { $regex: text.trim(), $options: "i" } },
    ];
  }

  // Customer Type
  if (customerType && customerType !== "all") {
    query.customerType = customerType;
  }

  // Spent Range
  if (minSpent) {
    query.totalSpent = { ...query.totalSpent, $gte: parseFloat(minSpent) };
  }
  if (maxSpent) {
    query.totalSpent = { ...query.totalSpent, $lte: parseFloat(maxSpent) };
  }

  // Order Count
  if (minOrders) {
    query.totalOrders = { $gte: parseInt(minOrders) };
  }

  // Tags
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  // Source
  if (source && source !== "all") {
    query.source = source;
  }

  // Churn Risk
  if (churnRisk && churnRisk !== "all") {
    query["intelligence.churnRisk"] = churnRisk;
  }

  // Active Status
  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  // Date Range
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) {
      query.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.createdAt.$lte = new Date(dateTo);
    }
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const sortOrder = order === "desc" ? -1 : 1;
  const sortOptions = { [sortBy]: sortOrder };

  const [customers, total] = await Promise.all([
    this.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select("-notes") // Exclude notes from list view
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    customers,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

// Static Method: Get Customer Segments
customerSchema.statics.getSegments = async function () {
  const [vip, regular, newCustomers, inactive, total] = await Promise.all([
    this.countDocuments({ customerType: "vip" }),
    this.countDocuments({ customerType: "regular" }),
    this.countDocuments({ customerType: "new" }),
    this.countDocuments({ customerType: "inactive" }),
    this.countDocuments(),
  ]);

  const [highChurnRisk, totalRevenue] = await Promise.all([
    this.countDocuments({ "intelligence.churnRisk": "high" }),
    this.aggregate([{ $group: { _id: null, total: { $sum: "$totalSpent" } } }]),
  ]);

  return {
    total,
    vip,
    regular,
    new: newCustomers,
    inactive,
    highChurnRisk,
    totalRevenue: totalRevenue[0]?.total || 0,
  };
};

// Static Method: Get Top Customers
customerSchema.statics.getTopCustomers = async function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .select("name phone email totalSpent totalOrders customerType")
    .lean();
};

// Static Method: Create or Update from Order
customerSchema.statics.createOrUpdateFromOrder = async function (orderData) {
  const {
    customerName,
    customerPhone,
    customerEmail,
    orderAmount,
    shippingAddress,
  } = orderData;

  let customer = await this.findOne({ phone: customerPhone });

  if (customer) {
    // Update existing customer
    customer.totalOrders += 1;
    customer.totalSpent += orderAmount;
    customer.averageOrderValue = customer.totalSpent / customer.totalOrders;
    customer.lastPurchaseDate = new Date();

    // Update email if not set
    if (!customer.email && customerEmail) {
      customer.email = customerEmail;
    }

    await customer.save();
  } else {
    // Create new customer
    const addressData = shippingAddress
      ? [
          {
            label: "Home",
            street: shippingAddress.street || "",
            city: shippingAddress.city || "",
            state: shippingAddress.state || "",
            pincode: shippingAddress.pincode || "",
            country: shippingAddress.country || "India",
            isDefault: true,
          },
        ]
      : [];

    customer = await this.create({
      name: customerName,
      phone: customerPhone,
      email: customerEmail || undefined,
      addresses: addressData,
      totalOrders: 1,
      totalSpent: orderAmount,
      averageOrderValue: orderAmount,
      lastPurchaseDate: new Date(),
      customerSince: new Date(),
      source: "website",
    });
  }

  return customer;
};

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
