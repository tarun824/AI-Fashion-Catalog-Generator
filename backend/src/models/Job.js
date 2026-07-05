import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Job Schema
 * Tracks batch upload jobs with file processing status
 */
const jobSchema = new Schema(
  {
    // Unique job identifier (UUID)
    jobId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Job status
    status: {
      type: String,
      enum: [
        "queued",
        "processing",
        "completed",
        "completed_with_errors",
        "failed",
      ],
      default: "queued",
      index: true,
    },

    // Files in this batch
    files: [
      {
        fileId: {
          type: String,
          required: true,
        },
        originalName: String,
        order: Number,
        status: {
          type: String,
          enum: ["pending", "processing", "completed", "failed"],
          default: "pending",
        },
        size: Number,
        mimeType: String,
        gridFsId: Schema.Types.ObjectId, // Reference to image in GridFS
        thumbnailId: Schema.Types.ObjectId, // Reference to thumbnail in GridFS
        productId: Schema.Types.ObjectId, // Reference to created Product
        error: String,
      },
    ],

    // AI processing results
    results: [
      {
        fileId: String,
        description: String,
        colors: [String],
        colorDetails: {
          percentages: [
            {
              name: String,
              percent: Number,
            },
          ],
          palette: String,
          families: [String],
        },
        category: String,
        tags: [String],
        approxPrice: Number,
        fabric: String,
        borderType: String,
        occasion: String,
        workType: String,
        weight: String,
        blouseIncluded: Boolean,
        tokens: Number,
        durationMs: Number,
        error: String,
      },
    ],

    // Progress tracking
    progress: {
      total: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
      failed: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
    },

    // Excel export
    export: {
      ready: {
        type: Boolean,
        default: false,
      },
      building: {
        type: Boolean,
        default: false,
      },
      buffer: Buffer, // Store Excel buffer (max 16MB)
      filename: String,
      filePath: String,
      error: String,
    },

    // Metadata
    uploadedBy: {
      type: String,
      default: "admin",
    },

    // Vendor who submitted this batch (null for admin uploads)
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },

    // Auto-expire jobs after 7 days
    expiresAt: {
      type: Date,
      index: true,
      expires: 0, // TTL index
    },
  },
  {
    timestamps: true,
    collection: "jobs",
  },
);

// Pre-save hook to calculate progress percentage
jobSchema.pre("save", function (next) {
  if (this.progress.total > 0) {
    this.progress.percentage = Math.round(
      ((this.progress.completed + this.progress.failed) / this.progress.total) *
        100,
    );
  }

  // Set expiration date (7 days from creation)
  if (!this.expiresAt && this.createdAt) {
    this.expiresAt = new Date(
      this.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
  }

  next();
});

// Static method: Get job with summary
jobSchema.statics.getJobSummary = async function (jobId) {
  const job = await this.findOne({ jobId }).lean();

  if (!job) {
    return null;
  }

  return {
    id: job.jobId,
    status: job.status,
    progress: job.progress,
    files: job.files.map((f) => ({
      id: f.fileId,
      originalName: f.originalName,
      status: f.status,
      size: f.size,
      order: f.order,
      productId: f.productId,
      error: f.error,
    })),
    results: job.results,
    export: job.export,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
};

// Static method: Update file status
jobSchema.statics.updateFileStatus = async function (
  jobId,
  fileId,
  status,
  updates = {},
) {
  const update = {
    "files.$.status": status,
    updatedAt: new Date(),
  };

  // Add any additional updates to the file
  Object.keys(updates).forEach((key) => {
    update[`files.$.${key}`] = updates[key];
  });

  await this.updateOne({ jobId, "files.fileId": fileId }, { $set: update });
};

// Static method: Add result
jobSchema.statics.addResult = async function (jobId, fileId, result) {
  await this.updateOne(
    { jobId },
    {
      $push: { results: { fileId, ...result } },
      $inc: { "progress.completed": 1 },
      $set: { updatedAt: new Date() },
    },
  );
};

// Static method: Mark file as failed
jobSchema.statics.markFileFailed = async function (jobId, fileId, error) {
  await this.updateOne(
    { jobId, "files.fileId": fileId },
    {
      $set: {
        "files.$.status": "failed",
        "files.$.error": error,
        updatedAt: new Date(),
      },
      $inc: { "progress.failed": 1 },
    },
  );
};

// Static method: Complete job
jobSchema.statics.completeJob = async function (jobId, hasErrors = false) {
  const status = hasErrors ? "completed_with_errors" : "completed";

  await this.updateOne(
    { jobId },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    },
  );
};

const Job = mongoose.model("Job", jobSchema);

export default Job;
