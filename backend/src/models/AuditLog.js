import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * AuditLog Schema
 * Generic audit logging for all system events
 */
const auditLogSchema = new Schema(
  {
    // Event Details
    title: {
      type: String,
      required: true,
      maxlength: 200,
      index: true,
    },

    description: {
      type: String,
      maxlength: 2000,
    },

    tag: {
      type: String,
      required: true,
      index: true,
      // Examples: admin_login, order_created, shiprocket_webhook, error, payment_failed
    },

    // Severity Level
    level: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
      index: true,
    },

    // Context Data
    metadata: {
      type: Schema.Types.Mixed, // Flexible structure for any data
      default: {},
    },

    // User Reference (if applicable)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      sparse: true,
      index: true,
    },

    userName: {
      type: String, // Cached for quick display
    },

    // IP and Device Info
    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    // Request Info (for API calls, webhooks)
    request: {
      method: String,
      url: String,
      headers: Schema.Types.Mixed,
      body: Schema.Types.Mixed,
      query: Schema.Types.Mixed,
    },

    response: {
      statusCode: Number,
      data: Schema.Types.Mixed,
    },

    // Error Details (if applicable)
    error: {
      message: String,
      stack: String,
      code: String,
    },

    // Alert Flags (for future email/Teams integration)
    alertChannels: {
      type: [String], // ["email", "teams", "slack"]
      default: [],
    },

    alertSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Auto-add createdAt, updatedAt
  },
);

// Indexes for efficient queries
auditLogSchema.index({ createdAt: -1 }); // Sort by date
auditLogSchema.index({ tag: 1, createdAt: -1 }); // Filter by tag
auditLogSchema.index({ level: 1, createdAt: -1 }); // Filter by level
auditLogSchema.index({ userId: 1, createdAt: -1 }); // Filter by user

/**
 * Search audit logs with filters
 */
auditLogSchema.statics.searchLogs = async function (filters = {}) {
  const {
    tag,
    level,
    userId,
    search,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    order = "desc",
    page = 1,
    limit = 50,
  } = filters;

  const query = {};

  // Tag filter
  if (tag) {
    query.tag = tag;
  }

  // Level filter
  if (level) {
    query.level = level;
  }

  // User filter
  if (userId) {
    query.userId = userId;
  }

  // Text search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { userName: { $regex: search, $options: "i" } },
    ];
  }

  // Date range
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const sort = { [sortBy]: order === "desc" ? -1 : 1 };
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

/**
 * Get stats grouped by tag
 */
auditLogSchema.statics.getStatsByTag = async function (dateFrom, dateTo) {
  const match = {};
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$tag",
        count: { $sum: 1 },
        errors: {
          $sum: { $cond: [{ $eq: ["$level", "error"] }, 1, 0] },
        },
        warnings: {
          $sum: { $cond: [{ $eq: ["$level", "warning"] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Clean up old logs (retention policy)
 */
auditLogSchema.statics.cleanupOldLogs = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    level: { $in: ["info", "warning"] }, // Keep errors/critical longer
  });

  return result.deletedCount;
};

export default mongoose.model("AuditLog", auditLogSchema);
