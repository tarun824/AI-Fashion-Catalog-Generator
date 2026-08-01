import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./src/models/Product.js";

dotenv.config();

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Count all products
    const totalCount = await Product.countDocuments();
    console.log(`📦 Total Products: ${totalCount}`);

    // Count by status
    const publishedCount = await Product.countDocuments({
      status: "published",
    });
    const draftCount = await Product.countDocuments({ status: "draft" });
    const archivedCount = await Product.countDocuments({ status: "archived" });

    console.log(`   ✓ Published: ${publishedCount}`);
    console.log(`   ✓ Draft: ${draftCount}`);
    console.log(`   ✓ Archived: ${archivedCount}\n`);

    // Get sample products
    const sampleProducts = await Product.find({ status: "published" })
      .select("name sku status")
      .limit(10);

    console.log("📋 Sample Published Products:");
    if (sampleProducts.length === 0) {
      console.log("   ❌ No published products found!");

      // Check if there are ANY products
      const anyProducts = await Product.find()
        .select("name sku status")
        .limit(5);
      if (anyProducts.length > 0) {
        console.log("\n   Found these products (not published):");
        anyProducts.forEach((p) => {
          console.log(`   - ${p.name} (${p.sku}) [${p.status}]`);
        });
      }
    } else {
      sampleProducts.forEach((p) => {
        console.log(`   - ${p.name} (${p.sku})`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkProducts();
