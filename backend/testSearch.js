import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./src/models/Product.js";
import "./src/models/Vendor.js"; // Import to register schema

dotenv.config();

async function testSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const filters = {
      text: "Regal",
      status: "published",
      sortBy: "createdAt",
      order: "desc",
      page: 1,
      limit: 10,
    };

    console.log("🔍 Searching with filters:", JSON.stringify(filters, null, 2));

    const result = await Product.searchProducts(filters);

    console.log("\n📊 Search Result:");
    console.log(`   Total found: ${result.pagination.total}`);
    console.log(`   Results returned: ${result.results.length}`);
    console.log(`   Response structure:`, {
      resultsIsArray: Array.isArray(result.results),
      firstProduct: result.results[0]
        ? {
            _id: result.results[0]._id,
            name: result.results[0].name,
            sku: result.results[0].sku,
            status: result.results[0].status,
          }
        : null,
    });

    console.log("\n✅ API would return:");
    console.log(
      JSON.stringify(
        {
          success: true,
          data: result.results,
          pagination: result.pagination,
        },
        null,
        2,
      ).substring(0, 500) + "...",
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testSearch();
