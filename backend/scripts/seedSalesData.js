/**
 * Seed Sales Data for Testing AI Pricing & Inventory Intelligence
 *
 * This script adds realistic sales data to existing products for testing
 * the AI pricing and inventory features.
 *
 * Usage:
 *   node backend/scripts/seedSalesData.js
 */

import mongoose from "mongoose";
import Product from "../src/models/Product.js";
import { connectDatabase } from "../src/config/database.js";

async function seedSalesData() {
  try {
    console.log("🔌 Connecting to database...");
    await connectDatabase();

    console.log("📊 Fetching products...");
    const products = await Product.find({ status: { $ne: "archived" } }).limit(
      50,
    );

    if (products.length === 0) {
      console.log("❌ No products found. Please add products first.");
      process.exit(1);
    }

    console.log(`✅ Found ${products.length} products. Adding sales data...\n`);

    let fastMovers = 0;
    let normalMovers = 0;
    let slowMovers = 0;

    for (const product of products) {
      const random = Math.random();
      const ageInDays = Math.floor(
        (Date.now() - new Date(product.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // 25% fast movers (high sales)
      if (random < 0.25) {
        const salesCount = Math.floor(Math.random() * 80) + 40; // 40-120 sales
        const viewCount = salesCount * (3 + Math.random() * 3); // 3-6x views
        const daysSinceLastSale = Math.floor(Math.random() * 5); // Last 5 days

        product.salesCount = salesCount;
        product.viewCount = Math.floor(viewCount);
        product.lastSoldAt = new Date(
          Date.now() - daysSinceLastSale * 24 * 60 * 60 * 1000,
        );

        fastMovers++;
        console.log(
          `🔥 Fast Mover: ${product.sku} - ${salesCount} sales, ${product.viewCount} views`,
        );
      }
      // 40% normal movers
      else if (random < 0.65) {
        const salesCount = Math.floor(Math.random() * 30) + 10; // 10-40 sales
        const viewCount = salesCount * (5 + Math.random() * 5); // 5-10x views
        const daysSinceLastSale = Math.floor(Math.random() * 20) + 5; // 5-25 days ago

        product.salesCount = salesCount;
        product.viewCount = Math.floor(viewCount);
        product.lastSoldAt = new Date(
          Date.now() - daysSinceLastSale * 24 * 60 * 60 * 1000,
        );

        normalMovers++;
        console.log(
          `✅ Normal: ${product.sku} - ${salesCount} sales, ${product.viewCount} views`,
        );
      }
      // 35% slow/dead movers
      else {
        const salesCount = Math.floor(Math.random() * 5); // 0-5 sales
        const viewCount = Math.floor(Math.random() * 80) + 30; // 30-110 views (high views, low sales)

        product.salesCount = salesCount;
        product.viewCount = viewCount;

        if (salesCount > 0) {
          // Last sale was 60-180 days ago
          const daysSinceLastSale = Math.floor(Math.random() * 120) + 60;
          product.lastSoldAt = new Date(
            Date.now() - daysSinceLastSale * 24 * 60 * 60 * 1000,
          );
          console.log(
            `🐌 Slow Mover: ${product.sku} - ${salesCount} sales, ${product.viewCount} views (last sale ${daysSinceLastSale}d ago)`,
          );
        } else {
          product.lastSoldAt = null;
          console.log(
            `💀 Dead Stock: ${product.sku} - No sales, ${product.viewCount} views`,
          );
        }

        slowMovers++;
      }

      await product.save();
    }

    console.log("\n" + "=".repeat(60));
    console.log("✨ Sales Data Seeded Successfully!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Total Products: ${products.length}`);
    console.log(
      `   🔥 Fast Movers: ${fastMovers} (${Math.round((fastMovers / products.length) * 100)}%)`,
    );
    console.log(
      `   ✅ Normal Movers: ${normalMovers} (${Math.round((normalMovers / products.length) * 100)}%)`,
    );
    console.log(
      `   🐌 Slow/Dead Stock: ${slowMovers} (${Math.round((slowMovers / products.length) * 100)}%)`,
    );
    console.log("=".repeat(60));
    console.log(
      "\n💡 Now visit: http://localhost:5173/app/ai-fashion-generator/admin/inventory",
    );
    console.log("   to see AI pricing and inventory insights!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding sales data:", error);
    process.exit(1);
  }
}

// Run the seeder
seedSalesData();
