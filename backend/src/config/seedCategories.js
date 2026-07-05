import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";

dotenv.config();

/**
 * Seed script for creating initial saree categories
 * Run with: node backend/src/config/seedCategories.js
 */

const CATEGORIES = [
  // ===== OCCASION CATEGORIES =====
  {
    name: "Haldi",
    slug: "haldi",
    type: "occasion",
    description:
      "Bright and vibrant yellow and pastel sarees perfect for Haldi ceremonies. Traditional turmeric ceremony attire.",
    sortOrder: 1,
    isFeatured: true,
    iconColor: "#FFD700",
  },
  {
    name: "Mehendi",
    slug: "mehendi",
    type: "occasion",
    description:
      "Green and festive sarees for Mehendi ceremonies. Elegant designs with intricate patterns.",
    sortOrder: 2,
    isFeatured: true,
    iconColor: "#06A77D",
  },
  {
    name: "Sangeet",
    slug: "sangeet",
    type: "occasion",
    description:
      "Party and glam sarees for Sangeet night. Sequins, stonework, and modern designs.",
    sortOrder: 3,
    isFeatured: true,
    iconColor: "#E91E63",
  },
  {
    name: "Wedding",
    slug: "wedding",
    type: "occasion",
    description:
      "Bridal silk sarees for the main wedding ceremony. Premium Banarasi, Kanjivaram, and designer sarees.",
    sortOrder: 4,
    isFeatured: true,
    iconColor: "#8B2635",
  },
  {
    name: "Reception",
    slug: "reception",
    type: "occasion",
    description:
      "Elegant designer sarees for wedding receptions. Contemporary designs with rich fabrics.",
    sortOrder: 5,
    isFeatured: true,
    iconColor: "#1E88E5",
  },
  {
    name: "Festival",
    slug: "festival",
    type: "occasion",
    description:
      "Traditional handloom sarees for Diwali, Puja, and other festivals. Authentic cultural wear.",
    sortOrder: 6,
    isFeatured: true,
    iconColor: "#FF6F00",
  },
  {
    name: "Casual",
    slug: "casual",
    type: "occasion",
    description:
      "Comfortable daily wear sarees for everyday occasions. Lightweight and easy to drape.",
    sortOrder: 7,
    iconColor: "#607D8B",
  },
  {
    name: "Party",
    slug: "party",
    type: "occasion",
    description:
      "Contemporary party wear sarees with modern designs and embellishments.",
    sortOrder: 8,
    iconColor: "#9C27B0",
  },
  {
    name: "Office Wear",
    slug: "office-wear",
    type: "occasion",
    description:
      "Professional sarees suitable for corporate and office environments.",
    sortOrder: 9,
    iconColor: "#455A64",
  },

  // ===== FABRIC CATEGORIES =====
  {
    name: "Banarasi Silk",
    slug: "banarasi-silk",
    type: "fabric",
    description:
      "Authentic Banarasi silk sarees from Varanasi. Known for intricate zari work and brocade patterns.",
    sortOrder: 1,
    isFeatured: true,
    iconColor: "#D4AF37",
  },
  {
    name: "Kanjivaram Silk",
    slug: "kanjivaram-silk",
    type: "fabric",
    description:
      "Traditional Kanchipuram silk sarees from Tamil Nadu. Rich temple borders and vibrant colors.",
    sortOrder: 2,
    isFeatured: true,
    iconColor: "#8B2635",
  },
  {
    name: "Pure Silk",
    slug: "pure-silk",
    type: "fabric",
    description:
      "Premium quality pure silk sarees. Luxurious feel with natural sheen.",
    sortOrder: 3,
    isFeatured: true,
    iconColor: "#9C27B0",
  },
  {
    name: "Cotton",
    slug: "cotton",
    type: "fabric",
    description:
      "Breathable cotton sarees for daily wear. Comfortable and easy to maintain.",
    sortOrder: 4,
    isFeatured: true,
    iconColor: "#8BC34A",
  },
  {
    name: "Georgette",
    slug: "georgette",
    type: "fabric",
    description:
      "Lightweight georgette sarees with beautiful drape. Perfect for parties and events.",
    sortOrder: 5,
    iconColor: "#FF5722",
  },
  {
    name: "Chiffon",
    slug: "chiffon",
    type: "fabric",
    description:
      "Sheer and elegant chiffon sarees. Ideal for modern and contemporary looks.",
    sortOrder: 6,
    iconColor: "#E91E63",
  },
  {
    name: "Organza",
    slug: "organza",
    type: "fabric",
    description:
      "Crisp organza sarees with structured drape. Modern and fashion-forward.",
    sortOrder: 7,
    iconColor: "#00BCD4",
  },
  {
    name: "Net",
    slug: "net",
    type: "fabric",
    description:
      "Embellished net sarees with heavy work. Popular for wedding occasions.",
    sortOrder: 8,
    iconColor: "#FF9800",
  },
  {
    name: "Linen",
    slug: "linen",
    type: "fabric",
    description:
      "Natural linen sarees for summer. Breathable and eco-friendly.",
    sortOrder: 9,
    iconColor: "#A1887F",
  },
  {
    name: "Tussar Silk",
    slug: "tussar-silk",
    type: "fabric",
    description:
      "Textured tussar silk sarees with natural gold sheen. Handloom heritage.",
    sortOrder: 10,
    iconColor: "#C77B30",
  },

  // ===== WORK TYPE CATEGORIES =====
  {
    name: "Zari Work",
    slug: "zari-work",
    type: "workType",
    description:
      "Sarees with intricate zari (gold/silver thread) work. Traditional and elegant.",
    sortOrder: 1,
    isFeatured: true,
    iconColor: "#D4AF37",
  },
  {
    name: "Embroidery",
    slug: "embroidery",
    type: "workType",
    description:
      "Hand-embroidered sarees with thread work. Exquisite craftsmanship.",
    sortOrder: 2,
    isFeatured: true,
    iconColor: "#E91E63",
  },
  {
    name: "Stonework",
    slug: "stonework",
    type: "workType",
    description:
      "Sarees embellished with stones, sequins, and crystal work. Glamorous and sparkly.",
    sortOrder: 3,
    isFeatured: true,
    iconColor: "#9C27B0",
  },
  {
    name: "Printed",
    slug: "printed",
    type: "workType",
    description:
      "Digital and block printed sarees. Modern designs and vibrant colors.",
    sortOrder: 4,
    iconColor: "#FF5722",
  },
  {
    name: "Block Print",
    slug: "block-print",
    type: "workType",
    description:
      "Traditional hand block printed sarees. Authentic Indian craftsmanship.",
    sortOrder: 5,
    iconColor: "#795548",
  },
  {
    name: "Hand Painted",
    slug: "hand-painted",
    type: "workType",
    description:
      "Artistic hand-painted sarees. Unique and one-of-a-kind designs.",
    sortOrder: 6,
    iconColor: "#FF9800",
  },
  {
    name: "Plain",
    slug: "plain",
    type: "workType",
    description:
      "Solid color sarees without embellishments. Elegant simplicity.",
    sortOrder: 7,
    iconColor: "#607D8B",
  },
  {
    name: "Woven",
    slug: "woven",
    type: "workType",
    description:
      "Handloom woven sarees with intricate patterns. Traditional weaving techniques.",
    sortOrder: 8,
    iconColor: "#8BC34A",
  },

  // ===== REGION CATEGORIES =====
  {
    name: "Kanchipuram",
    slug: "kanchipuram",
    type: "region",
    description:
      "Traditional Kanchipuram sarees from Tamil Nadu. Temple borders and heavy silk.",
    sortOrder: 1,
    iconColor: "#8B2635",
  },
  {
    name: "Banarasi",
    slug: "banarasi",
    type: "region",
    description:
      "Authentic Banarasi weaves from Varanasi. Rich brocade and zari work.",
    sortOrder: 2,
    iconColor: "#D4AF37",
  },
  {
    name: "Chanderi",
    slug: "chanderi",
    type: "region",
    description:
      "Lightweight Chanderi sarees from Madhya Pradesh. Sheer and elegant.",
    sortOrder: 3,
    iconColor: "#00BCD4",
  },
  {
    name: "Paithani",
    slug: "paithani",
    type: "region",
    description:
      "Traditional Paithani sarees from Maharashtra. Peacock and lotus motifs.",
    sortOrder: 4,
    iconColor: "#9C27B0",
  },
  {
    name: "Bandhani",
    slug: "bandhani",
    type: "region",
    description:
      "Tie-dye Bandhani sarees from Gujarat and Rajasthan. Colorful patterns.",
    sortOrder: 5,
    iconColor: "#FF5722",
  },
  {
    name: "Ikat",
    slug: "ikat",
    type: "region",
    description:
      "Ikat weave sarees from Odisha and Andhra Pradesh. Unique dyeing technique.",
    sortOrder: 6,
    iconColor: "#FF9800",
  },
  {
    name: "Tant",
    slug: "tant",
    type: "region",
    description:
      "Traditional Bengali Tant sarees. Lightweight cotton for summer.",
    sortOrder: 7,
    iconColor: "#8BC34A",
  },

  // ===== PRICE CATEGORIES =====
  {
    name: "Under ₹2,000",
    slug: "under-2000",
    type: "price",
    description: "Affordable sarees under ₹2,000. Quality fashion on a budget.",
    sortOrder: 1,
    isFeatured: true,
    iconColor: "#4CAF50",
  },
  {
    name: "₹2,000 - ₹5,000",
    slug: "2000-5000",
    type: "price",
    description:
      "Mid-range sarees between ₹2,000 and ₹5,000. Great value for money.",
    sortOrder: 2,
    isFeatured: true,
    iconColor: "#FF9800",
  },
  {
    name: "₹5,000 - ₹10,000",
    slug: "5000-10000",
    type: "price",
    description:
      "Premium sarees between ₹5,000 and ₹10,000. Designer collections.",
    sortOrder: 3,
    isFeatured: true,
    iconColor: "#9C27B0",
  },
  {
    name: "Premium Collection",
    slug: "premium",
    type: "price",
    description: "Luxury sarees above ₹10,000. Exclusive designer pieces.",
    sortOrder: 4,
    isFeatured: true,
    iconColor: "#D4AF37",
  },

  // ===== COLLECTION CATEGORIES =====
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    type: "collection",
    description: "Latest sarees added this month. Fresh styles and designs.",
    sortOrder: 1,
    isFeatured: true,
    iconColor: "#06A77D",
  },
  {
    name: "Bestsellers",
    slug: "bestsellers",
    type: "collection",
    description: "Most popular sarees loved by our customers.",
    sortOrder: 2,
    isFeatured: true,
    iconColor: "#E91E63",
  },
  {
    name: "Trending Now",
    slug: "trending",
    type: "collection",
    description: "Currently trending sarees. What everyone is wearing.",
    sortOrder: 3,
    isFeatured: true,
    iconColor: "#FF5722",
  },
  {
    name: "Bridal Special",
    slug: "bridal-special",
    type: "collection",
    description: "Curated bridal collection. Perfect for your big day.",
    sortOrder: 4,
    isFeatured: true,
    iconColor: "#8B2635",
  },
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/fashion-catalog",
    );
    console.log("✓ Connected to MongoDB");

    // Clear existing categories (optional - comment out if you want to keep existing)
    const existingCount = await Category.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing categories`);
      console.log("⚠️  Skipping seed to avoid duplicates");
      console.log("⚠️  Delete categories manually if you want to reseed");
      process.exit(0);
    }

    // Insert categories
    const inserted = await Category.insertMany(CATEGORIES);
    console.log(`✓ Seeded ${inserted.length} categories`);

    // Print category summary
    const byType = inserted.reduce((acc, cat) => {
      acc[cat.type] = (acc[cat.type] || 0) + 1;
      return acc;
    }, {});

    console.log("\nCategory Summary:");
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} categories`);
    });

    console.log("\n✓ Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Seeding failed:", error);
    process.exit(1);
  }
}

// Run seeding
seedCategories();
