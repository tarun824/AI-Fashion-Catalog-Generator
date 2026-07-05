import mongoose from "mongoose";

/**
 * MongoDB Database Connection Configuration
 * Sets up connection to MongoDB with GridFS support
 */

let gridFSBucket = null;

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
export async function connectDatabase() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/fashion-catalog";

    await mongoose.connect(mongoUri);

    console.log("✓ MongoDB connected successfully");
    console.log(`  Database: ${mongoose.connection.db.databaseName}`);

    // Initialize GridFS bucket for image storage
    const db = mongoose.connection.db;
    const bucketName = process.env.MONGODB_GRIDFS_BUCKET || "product-images";
    gridFSBucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: bucketName,
    });

    console.log(`✓ GridFS bucket initialized: ${bucketName}`);

    // Create text search indexes
    await createSearchIndexes();
  } catch (error) {
    console.error("✗ MongoDB connection error:", error.message);
    throw error;
  }
}

/**
 * Create text search indexes for products
 */
async function createSearchIndexes() {
  try {
    const Product = mongoose.model("Product");

    // Check if text index already exists
    const indexesCursor = Product.collection.listIndexes();
    const indexes = await indexesCursor.toArray();
    const hasTextIndex = indexes.some(
      (idx) => idx.key && Object.values(idx.key).includes("text"),
    );

    if (!hasTextIndex) {
      await Product.collection.createIndex(
        {
          name: "text",
          "description.full": "text",
          searchKeywords: "text",
        },
        {
          weights: {
            name: 10,
            searchKeywords: 5,
            "description.full": 1,
          },
          name: "product_text_search",
        },
      );
      console.log("✓ Text search indexes created");
    }

    // Color filtering indexes
    await Product.collection.createIndex({ "colors.names": 1 });
    await Product.collection.createIndex({ "colors.families": 1 });
    await Product.collection.createIndex({ status: 1, createdAt: -1 });
  } catch (error) {
    // If Product model doesn't exist yet, indexes will be created later
    if (error.name !== "MissingSchemaError") {
      console.warn(
        "Note: Search indexes will be created after Product model is loaded",
      );
    }
  }
}

/**
 * Get GridFS bucket instance
 * @returns {GridFSBucket}
 */
export function getGridFSBucket() {
  if (!gridFSBucket) {
    throw new Error(
      "GridFS bucket not initialized. Call connectDatabase() first.",
    );
  }
  return gridFSBucket;
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection() {
  await mongoose.connection.close();
  console.log("✓ MongoDB connection closed");
}

// Handle connection events
mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeDatabaseConnection();
  process.exit(0);
});
