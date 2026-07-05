# 🛍️ Public Saree Storefront — Phase 1 Complete Plan

**Product:** AI-Powered Women's Ethnic Wear Discovery Platform  
**Focus:** Premium sarees & ethnic wear for modern women  
**Phase 1 Scope:** Browse + Advanced Search ONLY (No Cart/Checkout)  
**Timeline:** 4-6 weeks for MVP

---

## 🎯 Vision & Positioning

### What We're Building

A **visual-first, AI-powered saree discovery platform** where women can:

- Browse beautiful sarees by occasion, fabric, style
- Search naturally: _"red silk saree for my sister's wedding"_
- Search visually: Upload a photo and find similar designs
- Get instant WhatsApp contact to purchase (no cart friction)

### Why It's Different (AI-Era Competitive Edge)

1. **Semantic Search**: Natural language understanding — search like talking to a boutique assistant
2. **Visual Search**: Upload ANY saree photo (Pinterest, Instagram, friend's wedding) → find similar in catalog
3. **Smart Filters**: AI-extracted attributes (fabric, occasion, work type) auto-tagged during admin upload
4. **Mobile-First**: 80%+ of saree shoppers browse on phones
5. **Zero Friction**: No cart, no accounts — see it, love it, WhatsApp to buy

---

## 📊 Current State vs Target State

### What Already Exists (Internal Admin Tool)

✅ Product model with saree-specific fields (fabric, occasion, borderType, workType, colors, price, variants)  
✅ AI batch image processing (OpenAI Vision generates descriptions)  
✅ GridFS image storage with thumbnails  
✅ Basic text search with filters  
✅ Admin authentication & dashboard  
✅ Excel catalog export

### What's Missing (Public Storefront)

❌ Public-facing frontend (home, browse, product pages)  
❌ Category/taxonomy navigation  
❌ Semantic (natural language) search  
❌ Visual (image-based) search  
❌ Mobile-optimized design  
❌ WhatsApp integration for purchases  
❌ SEO optimization

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC STOREFRONT                         │
│  (New React App - Separate from Admin Dashboard)            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Home   │  │ Category │  │  Search  │  │ Product  │   │
│  │   Page   │  │  Browse  │  │ Results  │  │  Detail  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC API LAYER                          │
│             (New Routes - No Auth Required)                  │
│                                                              │
│  GET  /api/public/products          → Browse products       │
│  GET  /api/public/products/:slug    → Product detail        │
│  GET  /api/public/categories        → Category tree         │
│  POST /api/public/search            → Keyword + Semantic    │
│  POST /api/public/search/visual     → Image search          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SEARCH LAYER (NEW)                         │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Text Search   │  │ Semantic Search│  │Visual Search │  │
│  │  (Existing)    │  │  (New - GPT)   │  │ (New - CLIP) │  │
│  │                │  │                │  │              │  │
│  │ MongoDB Text   │  │ Text Embedding │  │Image Embedding│ │
│  │    Index       │  │   + Vector DB  │  │  + Vector DB │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   MongoDB    │  │  MongoDB     │  │   GridFS     │     │
│  │   Products   │  │  Categories  │  │   Images     │     │
│  │  (Enhanced)  │  │    (New)     │  │  (Existing)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Category Taxonomy — Saree-Specific Design

### Primary Navigation Structure

```
🏠 Home
│
├─ 🎨 Shop by Fabric
│   ├─ Silk Sarees
│   │   ├─ Kanjivaram Silk
│   │   ├─ Banarasi Silk
│   │   ├─ Tussar Silk
│   │   └─ Pure Silk
│   ├─ Cotton Sarees
│   │   ├─ Handloom Cotton
│   │   ├─ Printed Cotton
│   │   └─ Linen Cotton
│   ├─ Georgette & Chiffon
│   ├─ Organza
│   └─ Designer Blends
│
├─ 💍 Shop by Occasion
│   ├─ Wedding Sarees
│   ├─ Festival & Puja Sarees
│   ├─ Party & Reception Sarees
│   ├─ Casual & Daily Wear
│   └─ Office Wear
│
├─ ✨ Shop by Work Type
│   ├─ Zari Work Sarees
│   ├─ Embroidered Sarees
│   ├─ Block Print Sarees
│   ├─ Hand Painted Sarees
│   ├─ Digital Print Sarees
│   └─ Plain/Solid Sarees
│
├─ 🌍 Shop by Region/Weave
│   ├─ Kanchipuram
│   ├─ Banarasi
│   ├─ Chanderi
│   ├─ Paithani
│   ├─ Bandhani (Tie-Dye)
│   ├─ Ikat
│   └─ Tant (Bengali)
│
├─ 💰 Shop by Price
│   ├─ Under ₹2,000
│   ├─ ₹2,000 - ₹5,000
│   ├─ ₹5,000 - ₹10,000
│   └─ ₹10,000+
│
└─ ⭐ Collections
    ├─ New Arrivals
    ├─ Best Sellers
    ├─ Under ₹3,000
    └─ Premium Collection
```

### Category Data Model (NEW)

```javascript
// backend/src/models/Category.js (NEW FILE)
{
  _id: ObjectId,
  name: String,              // "Kanjivaram Silk"
  slug: String,              // "kanjivaram-silk" (URL-friendly)
  parentId: ObjectId,        // null for top-level, or parent category ID
  type: String,              // "fabric" | "occasion" | "workType" | "region" | "price" | "collection"
  description: String,       // "Traditional South Indian silk sarees known for..."
  image: {
    gridFsId: ObjectId,      // Header image for category page
    thumbnailGridFsId: ObjectId
  },
  sortOrder: Number,         // For controlling nav menu order
  metaTitle: String,         // SEO
  metaDescription: String,   // SEO
  isActive: Boolean,         // Show/hide category
  productCount: Number,      // Cached count (updated on product publish)
  createdAt: Date,
  updatedAt: Date
}
```

### Product Schema Enhancement

```javascript
// backend/src/models/Product.js (MODIFY EXISTING)

// ❌ REMOVE: category: String (single flat category)

// ✅ ADD:
categories: [{
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
  type: String  // "fabric" | "occasion" | "workType" | "region" | "price"
}],

// Example: A Kanjivaram wedding saree would have:
// categories: [
//   { categoryId: ObjectId("silk-sarees"), type: "fabric" },
//   { categoryId: ObjectId("kanjivaram"), type: "region" },
//   { categoryId: ObjectId("wedding-sarees"), type: "occasion" }
// ]

// ✅ ADD: Image gallery (currently only single image)
images: [{
  gridFsId: { type: Schema.Types.ObjectId, required: true },
  thumbnailGridFsId: { type: Schema.Types.ObjectId },
  order: { type: Number, default: 0 },  // Display order
  alt: String,  // "Red Kanjivaram silk saree pallu detail"
  isPrimary: { type: Boolean, default: false }  // Featured image
}],

// ✅ ADD: Embeddings for AI search
embeddings: {
  text: [Number],   // Text embedding for semantic search (OpenAI text-embedding-3-small: 1536 dims)
  image: [Number]   // Image embedding for visual search (CLIP: 512 dims)
},

// ✅ ADD: SEO fields
seo: {
  title: String,       // "Red Kanjivaram Silk Wedding Saree | BrandName"
  description: String, // Meta description
  keywords: [String]   // ["kanjivaram saree", "wedding saree", "red silk saree"]
},

// ✅ ADD: Public visibility
isPublished: { type: Boolean, default: false },  // Only published = visible on storefront
publishedAt: Date
```

---

## 🔍 Advanced Search System — 3-Tier Architecture

### Tier 1: Keyword + Filter Search (Existing + Enhanced)

**What It Does:**  
Traditional text search + faceted filters

**User Experience:**

- Search bar: "red silk saree"
- Filters: Fabric, Occasion, Color, Price, Work Type, Size

**Backend (Existing - Enhance):**

```javascript
// backend/src/routes/publicRoutes.js (NEW FILE)

router.get("/api/public/search", async (req, res) => {
  const {
    q, // Search query
    fabric, // Filter: "silk", "cotton", etc.
    occasion, // Filter: "wedding", "casual", etc.
    colors, // Filter: ["red", "blue"]
    priceMin, // Filter: 2000
    priceMax, // Filter: 10000
    workType, // Filter: "embroidered", "zari", etc.
    size, // Filter: "free-size", "petite"
    sort, // "newest", "price-low", "price-high"
    page = 1,
    limit = 24,
  } = req.query;

  // Build query
  const query = {
    isPublished: true, // ✅ CRITICAL: Only show published products
    status: "published",
  };

  // Text search (existing MongoDB text index)
  if (q) {
    query.$text = { $search: q };
  }

  // Filters
  if (fabric) query.fabric = { $in: Array.isArray(fabric) ? fabric : [fabric] };
  if (occasion)
    query.occasion = { $in: Array.isArray(occasion) ? occasion : [occasion] };
  if (colors?.length) query["colors.families"] = { $in: colors };
  if (priceMin || priceMax) {
    query.price = {};
    if (priceMin) query.price.$gte = Number(priceMin);
    if (priceMax) query.price.$lte = Number(priceMax);
  }
  if (workType)
    query.workType = { $in: Array.isArray(workType) ? workType : [workType] };

  // Size availability (check variants array)
  if (size) {
    query["variants"] = {
      $elemMatch: {
        size: size,
        stock: { $gt: 0 },
      },
    };
  }

  // Sort
  let sortObj = {};
  switch (sort) {
    case "price-low":
      sortObj = { price: 1 };
      break;
    case "price-high":
      sortObj = { price: -1 };
      break;
    case "newest":
      sortObj = { publishedAt: -1 };
      break;
    default:
      sortObj = q ? { score: { $meta: "textScore" } } : { publishedAt: -1 };
  }

  const products = await Product.find(query)
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .select(
      "name slug price images colors fabric occasion workType isBlouseIncluded",
    ) // ✅ Public-safe projection
    .lean();

  const total = await Product.countDocuments(query);

  res.json({
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
```

---

### Tier 2: Semantic Search (Natural Language) — NEW

**What It Does:**  
Understands **meaning**, not just keywords

**Examples:**

- _"something elegant for my friend's cocktail party"_ → Returns party sarees, not just keyword matches
- _"traditional silk saree for temple visit"_ → Returns puja/festival sarees in silk
- _"lightweight saree for office in summer"_ → Returns cotton/linen casual sarees

**How It Works:**

1. **Indexing (One-time + On Product Publish):**
   - Generate text embedding for each product using OpenAI `text-embedding-3-small`
   - Input text: `name + description.full + fabric + occasion + workType + colors`
   - Store embedding in `product.embeddings.text` (1536-dimensional vector)

2. **Query (Real-time):**
   - User types natural language query
   - Generate embedding for query text
   - Find products with most similar embeddings (cosine similarity)
   - Blend with keyword search score for hybrid ranking

**Implementation:**

#### Option A: MongoDB Atlas Vector Search (Recommended — Zero New Infrastructure)

```javascript
// backend/src/services/embeddingService.js (NEW FILE)
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTextEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small", // 1536 dims, $0.02 per 1M tokens
    input: text.slice(0, 8000), // Max token limit safety
  });
  return response.data[0].embedding; // Array of 1536 floats
}

export async function generateProductTextEmbedding(product) {
  const text = [
    product.name,
    product.description?.full || "",
    product.fabric || "",
    product.occasion || "",
    product.workType || "",
    (product.colors?.families || []).join(", "),
  ]
    .filter(Boolean)
    .join(". ");

  return await generateTextEmbedding(text);
}
```

```javascript
// backend/src/services/semanticSearch.js (NEW FILE)
import { generateTextEmbedding } from "./embeddingService.js";
import Product from "../models/Product.js";

export async function semanticSearch(query, filters = {}, limit = 24) {
  // Generate embedding for search query
  const queryEmbedding = await generateTextEmbedding(query);

  // MongoDB Atlas Vector Search aggregation
  const pipeline = [
    {
      $vectorSearch: {
        index: "text_embeddings_index", // Created in Atlas UI
        path: "embeddings.text",
        queryVector: queryEmbedding,
        numCandidates: 100, // Pre-filter candidates
        limit: limit * 2, // Get more for re-ranking
      },
    },
    {
      $match: {
        isPublished: true,
        status: "published",
        ...filters, // Apply additional filters (fabric, occasion, etc.)
      },
    },
    {
      $addFields: {
        vectorScore: { $meta: "vectorSearchScore" },
      },
    },
    {
      $limit: limit,
    },
  ];

  const results = await Product.aggregate(pipeline);
  return results;
}
```

**Atlas Setup (One-time):**

1. Create Atlas Search Index via Atlas UI:
   - Index name: `text_embeddings_index`
   - Field: `embeddings.text`
   - Type: `knnVector`
   - Dimensions: `1536`
   - Similarity: `cosine`

**Cost Estimate:**

- Embedding generation: ~$0.02 per 1M tokens
- For 10,000 products, ~$0.50 one-time
- Live queries: ~$0.02 per 1,000 searches
- Very cheap for boutique scale

#### Hybrid Search (Combine Semantic + Keyword)

```javascript
// backend/src/routes/publicRoutes.js

router.post("/api/public/search", async (req, res) => {
  const { q, mode = "hybrid", ...filters } = req.body;

  let results = [];

  if (mode === "semantic" || mode === "hybrid") {
    // Semantic search
    const semanticResults = await semanticSearch(q, filters, 24);
    results = semanticResults;
  }

  if (mode === "keyword" || mode === "hybrid") {
    // Traditional keyword search
    const keywordResults = await keywordSearch(q, filters, 24);

    if (mode === "hybrid") {
      // Merge and re-rank (semantic gets 70% weight, keyword 30%)
      results = mergeAndRerank(semanticResults, keywordResults, 0.7, 0.3);
    } else {
      results = keywordResults;
    }
  }

  res.json({ results, query: q, mode });
});
```

---

### Tier 3: Visual Search (Image-Based Search) — NEW

**What It Does:**  
Upload a photo of ANY saree → Find visually similar items in catalog

**Use Cases:**

- User saw a saree on Instagram/Pinterest → upload screenshot to find similar
- User has old saree photo → wants to find similar styles
- "Find more like this" button on every product detail page

**How It Works:**

1. **Indexing (One-time + On Product Publish):**
   - Generate image embedding for product's primary image using CLIP (OpenAI CLIP or HuggingFace)
   - Store in `product.embeddings.image` (512-dimensional vector)

2. **Query (Real-time):**
   - User uploads image (or clicks "similar" on a product)
   - Generate CLIP embedding for uploaded image
   - Find products with most similar image embeddings
   - Return top 24 matches

**Implementation:**

```javascript
// backend/src/services/imageEmbeddingService.js (NEW FILE)
import OpenAI from "openai";
import sharp from "sharp";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImageEmbedding(imageBuffer) {
  // Resize to 224x224 (CLIP standard)
  const resized = await sharp(imageBuffer)
    .resize(224, 224, { fit: "cover" })
    .toBuffer();

  // Convert to base64
  const base64 = resized.toString("base64");

  // Call OpenAI CLIP API (or use HuggingFace for cheaper alternative)
  const response = await openai.embeddings.create({
    model: "clip-vit-base-patch32", // 512-dim embedding
    input: {
      type: "image",
      image: base64,
    },
  });

  return response.data[0].embedding;
}

export async function generateProductImageEmbedding(product) {
  // Get primary image from GridFS
  const primaryImage =
    product.images.find((img) => img.isPrimary) || product.images[0];
  if (!primaryImage) return null;

  const imageBuffer = await getImageBufferFromGridFS(primaryImage.gridFsId);
  return await generateImageEmbedding(imageBuffer);
}
```

```javascript
// backend/src/routes/publicRoutes.js

// Visual search endpoint
router.post(
  "/api/public/search/visual",
  upload.single("image"), // Multer middleware
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      // Validate image
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "File must be an image" });
      }

      if (req.file.size > 10 * 1024 * 1024) {
        // 10MB limit
        return res.status(400).json({ error: "Image too large (max 10MB)" });
      }

      // Generate embedding for uploaded image
      const queryEmbedding = await generateImageEmbedding(req.file.buffer);

      // Atlas Vector Search on image embeddings
      const results = await Product.aggregate([
        {
          $vectorSearch: {
            index: "image_embeddings_index",
            path: "embeddings.image",
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 24,
          },
        },
        {
          $match: {
            isPublished: true,
            status: "published",
          },
        },
        {
          $addFields: {
            similarity: { $meta: "vectorSearchScore" },
          },
        },
      ]);

      res.json({ results, uploadedImage: req.file.originalname });
    } catch (error) {
      console.error("Visual search error:", error);
      res.status(500).json({ error: "Visual search failed" });
    }
  },
);

// "Find similar" endpoint (by product ID)
router.get("/api/public/products/:id/similar", async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isPublished: true,
  });

  if (!product || !product.embeddings?.image) {
    return res.status(404).json({ error: "Product not found or no embedding" });
  }

  // Use product's own image embedding as query
  const results = await Product.aggregate([
    {
      $vectorSearch: {
        index: "image_embeddings_index",
        path: "embeddings.image",
        queryVector: product.embeddings.image,
        numCandidates: 50,
        limit: 24,
      },
    },
    {
      $match: {
        isPublished: true,
        _id: { $ne: product._id }, // Exclude the query product itself
      },
    },
  ]);

  res.json({ results });
});
```

**Atlas Setup (One-time):**

1. Create second Atlas Search Index:
   - Index name: `image_embeddings_index`
   - Field: `embeddings.image`
   - Type: `knnVector`
   - Dimensions: `512`
   - Similarity: `cosine`

---

## 🎨 Frontend Design Specifications

### Design Principles

1. **Mobile-First**: 80% of saree shoppers browse on phones
2. **Image-Led**: Large, high-quality product photos (sarees sell on visual appeal)
3. **Minimal Friction**: No accounts, no cart — straight to WhatsApp CTA
4. **Premium Feel**: Warm, elegant design (not generic e-commerce blue)
5. **Fast**: Lazy-loaded images, optimized Core Web Vitals

### Color Palette (Fashion-Forward, Not Tech)

```css
:root {
  /* Primary — Warm, elegant tones */
  --color-primary: #8b2635; /* Deep maroon (saree-inspired) */
  --color-primary-light: #a53a4a;
  --color-primary-dark: #6b1e28;

  /* Secondary — Gold accents (zari-inspired) */
  --color-secondary: #d4af37; /* Gold */
  --color-secondary-light: #e8c968;
  --color-secondary-dark: #b8941f;

  /* Neutrals — Clean, readable */
  --color-bg: #fffbf5; /* Warm ivory */
  --color-surface: #ffffff;
  --color-text: #2c2c2c;
  --color-text-light: #6b6b6b;
  --color-border: #e8e2d5;

  /* Accents */
  --color-success: #2d7a3e; /* Emerald green */
  --color-error: #c53030;
  --color-warning: #d97706;
}
```

### Typography

```css
/* Display (headings) — Elegant serif */
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap");

/* Body text — Clean sans-serif */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap");

h1,
h2,
h3 {
  font-family: "Playfair Display", serif;
  font-weight: 600;
}

body,
button,
input {
  font-family: "Inter", sans-serif;
}
```

### Layout Principles

- **Max content width**: 1400px (prevents ultra-wide layouts)
- **Grid**: 3-4 columns desktop, 2 columns tablet, 1 column mobile
- **Product cards**: Square aspect ratio (1:1) with hover zoom
- **Whitespace**: Generous padding (sarees = luxury, needs breathing room)
- **Sticky elements**: Search bar sticky on scroll, filters sticky in sidebar

---

## 🖼️ Page-by-Page Specifications

### 1. Home Page (`/`)

**Purpose:** Brand introduction + Category entry points

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  🔍 Search Bar (with camera icon for visual)    │
├─────────────────────────────────────────────────┤
│                                                 │
│      🎨 HERO SECTION                            │
│   [Full-width banner image of model in saree]  │
│   "Discover Timeless Elegance"                  │
│   [CTA: Browse Collection]                      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   Shop by Occasion                              │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│   │ Wedding │ │Festival │ │ Casual  │  ...    │
│   │  Sarees │ │ Sarees  │ │ Sarees  │         │
│   └─────────┘ └─────────┘ └─────────┘         │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   Shop by Fabric                                │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│   │  Silk   │ │ Cotton  │ │Georgette│  ...    │
│   └─────────┘ └─────────┘ └─────────┘         │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   Featured Collection (Carousel)                │
│   [Horizontally scrollable product cards]       │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   Why Shop With Us?                             │
│   • AI-Powered Search • Premium Quality         │
│   • Authentic Handlooms • Quick Delivery        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Components to Build:**

- `HeroSection.jsx` — Full-width banner with CTA
- `CategoryGrid.jsx` — Reusable category tile grid
- `ProductCarousel.jsx` — Horizontal scrolling product list
- `FeatureBlocks.jsx` — USP highlights

---

### 2. Category Browse Page (`/category/:slug`)

**Purpose:** Browse products within a category with filters

**Layout:**

```
Desktop:
┌─────────────────────────────────────────────────┐
│  Breadcrumb: Home > Silk Sarees > Kanjivaram    │
├─────────┬───────────────────────────────────────┤
│         │  Sort: [Newest ▼]     View: [Grid]    │
│ FILTERS │                                        │
│         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ Fabric  │  │ IMG  │ │ IMG  │ │ IMG  │ │ IMG  │ │
│ ☐ Silk  │  │ Name │ │ Name │ │ Name │ │ Name │ │
│ ☐ Cotton│  │ ₹3999│ │ ₹5499│ │ ₹2999│ │ ₹4200│ │
│         │  └──────┘ └──────┘ └──────┘ └──────┘ │
│ Price   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ ₹─────₹ │  │ IMG  │ │ IMG  │ │ IMG  │ │ IMG  │ │
│         │  └──────┘ └──────┘ └──────┘ └──────┘ │
│ Color   │                                        │
│ ⬤ Red   │  [Pagination: 1 2 3 ... Next]         │
│ ⬤ Blue  │                                        │
└─────────┴───────────────────────────────────────┘

Mobile: Filters collapse into bottom sheet/modal
```

**Filters (Left Sidebar):**

- **Fabric**: Checkboxes (Silk, Cotton, Georgette, etc.)
- **Occasion**: Checkboxes (Wedding, Festival, Casual, etc.)
- **Color**: Color swatches (clickable color circles)
- **Price Range**: Dual-handle slider (₹0 - ₹20,000+)
- **Work Type**: Checkboxes (Zari, Embroidered, Printed, etc.)
- **Availability**: Toggle (In Stock Only)

**Product Card Design:**

```jsx
// ProductCard.jsx
<div className="product-card">
  <div className="product-image">
    <img src={thumbnail} alt={name} />
    <div className="hover-overlay">
      <button className="quick-view">Quick View</button>
      <button className="find-similar">Find Similar</button>
    </div>
    {!inStock && <span className="badge out-of-stock">Out of Stock</span>}
    {isNew && <span className="badge new">New</span>}
  </div>
  <div className="product-info">
    <h3 className="product-name">{name}</h3>
    <p className="product-meta">
      {fabric} • {occasion}
    </p>
    <div className="product-price">
      <span className="price">₹{price}</span>
      {originalPrice > price && (
        <span className="original-price">₹{originalPrice}</span>
      )}
    </div>
    <div className="product-colors">
      {colors.map((c) => (
        <span className="color-dot" style={{ bg: c }} />
      ))}
    </div>
  </div>
</div>
```

**Components to Build:**

- `CategoryPage.jsx` — Main page wrapper
- `FilterSidebar.jsx` — All filter controls
- `ProductGrid.jsx` — Responsive grid layout
- `ProductCard.jsx` — Individual product card
- `Pagination.jsx` — Page navigation

---

### 3. Search Results Page (`/search?q=...`)

**Purpose:** Display results from keyword/semantic/visual search

**Layout:** Same as Category Browse, but with additional features:

```
┌─────────────────────────────────────────────────┐
│  Showing results for: "red silk wedding saree"  │
│  🔍 Search again   📷 Search by image           │
├─────────┬───────────────────────────────────────┤
│         │  🎯 Search Mode: [Hybrid ▼]           │
│ FILTERS │     (Keyword / Semantic / Visual)      │
│         │                                        │
│ [Same   │  [Same product grid as category page] │
│  as     │                                        │
│  above] │                                        │
└─────────┴───────────────────────────────────────┘
```

**Special Features:**

- **Search Mode Toggle**: Keyword / Semantic / Hybrid selector
- **Visual Search Upload**: Drag-drop or click to upload image
- **Query Refinement**: "Did you mean...?" suggestions
- **Related Searches**: "red silk saree", "wedding sarees", "kanjivaram silk"

**Components to Build:**

- `SearchResultsPage.jsx` — Main wrapper
- `SearchBar.jsx` — Enhanced search input with mode toggle
- `VisualSearchUploader.jsx` — Image upload component
- `SearchModeToggle.jsx` — Keyword/Semantic/Visual selector

---

### 4. Product Detail Page (`/product/:slug`)

**Purpose:** Full product details + purchase CTA (WhatsApp)

**Layout:**

```
Desktop:
┌───────────────────────────────────────────────────┐
│ Breadcrumb: Home > Silk Sarees > Kanjivaram > ... │
├──────────────────┬────────────────────────────────┤
│                  │  Red Kanjivaram Silk Wedding    │
│  IMAGE GALLERY   │  Saree with Zari Border         │
│                  │                                 │
│  ┌────────────┐  │  ₹8,999  [15% OFF] ₹10,499     │
│  │            │  │  ✅ In Stock • Ships in 2-3 days │
│  │   MAIN     │  │                                 │
│  │   IMAGE    │  │  🎨 Colors: ⬤ Red ⬤ Maroon      │
│  │            │  │                                 │
│  └────────────┘  │  📏 Size: Free Size             │
│                  │  🧵 Includes: Blouse Piece      │
│  [▭] [▭] [▭]    │                                 │
│  Thumbnails      │  📱 Enquire on WhatsApp [CTA]   │
│                  │  ☎️  Call to Order: +91-XXXXX    │
│  🔍 Find Similar │                                 │
│                  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                  │                                 │
│                  │  📖 Product Details              │
│                  │  • Fabric: Pure Kanjivaram Silk │
│                  │  • Occasion: Wedding, Festival  │
│                  │  • Work: Zari Border            │
│                  │  • Weight: 750g                 │
│                  │  • Care: Dry Clean Only         │
│                  │                                 │
│                  │  📝 Full Description             │
│                  │  [AI-generated description...]  │
└──────────────────┴────────────────────────────────┘

Below the fold:
┌───────────────────────────────────────────────────┐
│  🔍 More Like This                                 │
│  [Product carousel of visually similar sarees]    │
├───────────────────────────────────────────────────┤
│  🏷️ Similar in This Category                      │
│  [Product carousel from same category]            │
└───────────────────────────────────────────────────┘
```

**Key Features:**

1. **Image Gallery:**
   - Main image (zoomable on hover/click)
   - 4-6 thumbnail images below (different angles, drape, blouse, etc.)
   - Swipeable on mobile

2. **Product Info:**
   - Name, price, discount badge
   - Stock status (In Stock / Only X Left / Out of Stock)
   - Color variants (if any)
   - Size, blouse inclusion, fabric, occasion, work type
   - Detailed specs in table format

3. **CTA (No Cart!):**
   - **Primary CTA**: "Enquire on WhatsApp" → Opens WhatsApp with pre-filled message
   - **Secondary CTA**: "Call to Order" → Phone number (click-to-call on mobile)
   - Pre-filled message: _"Hi! I'm interested in [Product Name] (₹[Price]). Is it available?"_

4. **Find Similar Button:**
   - Triggers visual search using this product's image
   - Opens modal with similar products

5. **Related Products:**
   - "More Like This" — Visual similarity (same image embedding search)
   - "Similar in Category" — Same category, sorted by popularity

**WhatsApp Integration:**

```jsx
// components/WhatsAppEnquiryButton.jsx
import React from "react";

const WhatsAppEnquiryButton = ({ product }) => {
  const phoneNumber = "919876543210"; // Replace with actual business number

  const message = encodeURIComponent(
    `Hi! I'm interested in this saree:\n\n` +
      `${product.name}\n` +
      `Price: ₹${product.price}\n` +
      `Link: ${window.location.href}\n\n` +
      `Is this available?`,
  );

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-whatsapp"
    >
      <svg>...</svg> {/* WhatsApp icon */}
      Enquire on WhatsApp
    </a>
  );
};
```

**Components to Build:**

- `ProductDetailPage.jsx` — Main wrapper
- `ImageGallery.jsx` — Main image + thumbnails + zoom
- `ProductInfo.jsx` — Details, specs, price
- `WhatsAppEnquiryButton.jsx` — CTA button
- `FindSimilarButton.jsx` — Visual search trigger
- `RelatedProducts.jsx` — "More Like This" carousel

---

### 5. Visual Search Modal

**Purpose:** Upload image for visual search (triggered from search bar or product page)

**Layout:**

```
┌─────────────────────────────────────────┐
│  🔍 Search by Image              [✕]    │
├─────────────────────────────────────────┤
│                                         │
│    ┌───────────────────────────┐       │
│    │                           │       │
│    │   Drag & drop image       │       │
│    │   or click to browse      │       │
│    │                           │       │
│    │   📷                      │       │
│    │                           │       │
│    └───────────────────────────┘       │
│                                         │
│    [Take Photo] [Choose File]          │
│                                         │
│    ℹ️  Supported: JPG, PNG, HEIC       │
│    Max size: 10MB                       │
│                                         │
├─────────────────────────────────────────┤
│              [Search] [Cancel]          │
└─────────────────────────────────────────┘

After upload:
┌─────────────────────────────────────────┐
│  🔍 Searching...                         │
├─────────────────────────────────────────┤
│                                         │
│    [Your uploaded image thumbnail]      │
│                                         │
│    🔄 Analyzing image...                │
│                                         │
└─────────────────────────────────────────┘

Results:
┌─────────────────────────────────────────┐
│  🔍 Similar Sarees Found         [✕]    │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ IMG  │ │ IMG  │ │ IMG  │  ...      │
│  │ Name │ │ Name │ │ Name │           │
│  │ ₹5999│ │ ₹4499│ │ ₹6999│           │
│  └──────┘ └──────┘ └──────┘           │
│                                         │
│  [View All Results]                     │
└─────────────────────────────────────────┘
```

**Components to Build:**

- `VisualSearchModal.jsx` — Modal wrapper
- `ImageUploader.jsx` — Drag-drop + file input + camera (mobile)
- `SearchProgress.jsx` — Loading state
- `VisualSearchResults.jsx` — Results grid

---

## 📱 Mobile-Specific Considerations

### Critical Mobile Features

1. **Bottom Navigation:**

```
┌─────────────────────────────────┐
│                                 │
│        (Page content)           │
│                                 │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  🏠   🔍   📷   💬   ☰         │
│ Home Search Camera WhatsApp Menu│
└─────────────────────────────────┘
```

2. **Filters:** Bottom sheet (slide up) instead of sidebar
3. **Search Bar:** Sticky at top, expands on tap
4. **Product Images:** Swipeable gallery, pinch-to-zoom
5. **WhatsApp CTA:** Floating action button (always visible)

---

## 🗄️ Backend Structure — New Files

### Public Routes (NEW)

```javascript
// backend/src/routes/publicRoutes.js
import express from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Rate limiting (100 requests per 15 minutes per IP)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

router.use(publicLimiter);

// Product listing & detail
router.get("/api/public/products", getPublicProducts);
router.get("/api/public/products/:slug", getProductDetail);

// Category navigation
router.get("/api/public/categories", getCategories);
router.get("/api/public/categories/:slug", getCategoryDetail);

// Search
router.post("/api/public/search", keywordAndSemanticSearch);
router.post("/api/public/search/visual", upload.single("image"), visualSearch);
router.get("/api/public/products/:id/similar", getSimilarProducts);

// Filters & facets
router.get("/api/public/filters", getAvailableFilters);

export default router;
```

### Embedding Services (NEW)

```javascript
// backend/src/services/embeddingService.js
import OpenAI from 'openai';

// Text embeddings (for semantic search)
export async function generateTextEmbedding(text) { ... }
export async function generateProductTextEmbedding(product) { ... }

// Image embeddings (for visual search)
export async function generateImageEmbedding(imageBuffer) { ... }
export async function generateProductImageEmbedding(product) { ... }
```

### Background Jobs (ENHANCE EXISTING)

```javascript
// backend/src/jobs/embeddingGenerator.js (NEW)
// Batch job to generate embeddings for all published products

import Product from "../models/Product.js";
import {
  generateProductTextEmbedding,
  generateProductImageEmbedding,
} from "../services/embeddingService.js";

export async function generateAllEmbeddings() {
  const products = await Product.find({
    isPublished: true,
    $or: [
      { "embeddings.text": { $exists: false } },
      { "embeddings.image": { $exists: false } },
    ],
  });

  console.log(`Generating embeddings for ${products.length} products...`);

  for (const product of products) {
    try {
      if (!product.embeddings?.text) {
        product.embeddings.text = await generateProductTextEmbedding(product);
      }

      if (!product.embeddings?.image && product.images?.length) {
        product.embeddings.image = await generateProductImageEmbedding(product);
      }

      await product.save();
      console.log(`✓ Embeddings generated for: ${product.name}`);
    } catch (error) {
      console.error(`✗ Failed for ${product.name}:`, error.message);
    }
  }

  console.log("Embedding generation complete!");
}

// Run on server startup (one-time backfill)
// Later, run automatically on product.isPublished = true
```

### Models (ENHANCE EXISTING)

```javascript
// backend/src/models/Product.js (MODIFY)
// Add the schema changes documented earlier:
// - categories array
// - images array
// - embeddings.text and embeddings.image
// - isPublished, publishedAt
// - seo object
```

```javascript
// backend/src/models/Category.js (NEW)
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    type: {
      type: String,
      enum: ["fabric", "occasion", "workType", "region", "price", "collection"],
      required: true,
    },
    description: String,
    image: {
      gridFsId: mongoose.Schema.Types.ObjectId,
      thumbnailGridFsId: mongoose.Schema.Types.ObjectId,
    },
    sortOrder: { type: Number, default: 0 },
    metaTitle: String,
    metaDescription: String,
    isActive: { type: Boolean, default: true },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ type: 1 });

export default mongoose.model("Category", categorySchema);
```

---

## 🚀 Implementation Roadmap

### Phase 1A — Foundation (Week 1-2)

**Backend:**

- [ ] Create `Category` model
- [ ] Enhance `Product` model (categories, images array, embeddings, isPublished)
- [ ] Create `publicRoutes.js` with basic endpoints
- [ ] Add rate limiting middleware
- [ ] Seed sample categories (fabric, occasion, workType taxonomies)

**Frontend:**

- [ ] Create new public storefront app (separate from admin dashboard)
- [ ] Set up React Router with public pages
- [ ] Design system: colors, typography, base components
- [ ] Build `Header.jsx`, `Footer.jsx`, layout structure

**Deliverable:** Navigable skeleton with mock data

---

### Phase 1B — Core Browse Experience (Week 2-3)

**Backend:**

- [ ] Implement category listing API
- [ ] Implement product listing with filters (keyword search)
- [ ] Implement product detail API
- [ ] Public-safe projection (hide vendor data, internal notes)

**Frontend:**

- [ ] Home page (hero, category tiles, featured products)
- [ ] Category browse page (product grid, filters sidebar)
- [ ] Product detail page (gallery, info, WhatsApp CTA)
- [ ] Product card component
- [ ] Filter sidebar (fabric, occasion, color, price)

**Deliverable:** Functional storefront with keyword search & filters

---

### Phase 1C — Semantic Search (Week 3-4)

**Backend:**

- [ ] Install OpenAI SDK, configure API key
- [ ] Implement `embeddingService.js` (text embeddings)
- [ ] Create `embeddingGenerator.js` background job
- [ ] Set up MongoDB Atlas Vector Search index for text embeddings
- [ ] Implement semantic search API endpoint
- [ ] Hybrid search (blend semantic + keyword scores)

**Frontend:**

- [ ] Search results page
- [ ] Enhanced search bar with mode toggle (keyword/semantic/hybrid)
- [ ] "Did you mean...?" query suggestions
- [ ] Loading states for AI search

**Deliverable:** Natural language search working (_"elegant saree for cocktail party"_)

---

### Phase 1D — Visual Search (Week 4-5)

**Backend:**

- [ ] Implement `imageEmbeddingService.js` (CLIP embeddings)
- [ ] Set up MongoDB Atlas Vector Search index for image embeddings
- [ ] Implement visual search API endpoint (upload image)
- [ ] Implement "find similar" API (by product ID)
- [ ] Generate image embeddings for all products (batch job)

**Frontend:**

- [ ] Visual search modal (drag-drop image uploader)
- [ ] Camera input for mobile
- [ ] Visual search results page
- [ ] "Find Similar" button on product detail pages
- [ ] "More Like This" carousel on product pages

**Deliverable:** Image-based search fully functional

---

### Phase 1E — Polish & Launch Prep (Week 5-6)

**Backend:**

- [ ] Add CDN layer for images (S3 + CloudFront or similar)
- [ ] Optimize embedding generation (batch processing)
- [ ] Add monitoring & error tracking (Sentry)
- [ ] Load testing (simulate 1000 concurrent users)

**Frontend:**

- [ ] Mobile optimization (bottom nav, filter bottom sheet, touch gestures)
- [ ] SEO optimization (meta tags, sitemap, structured data)
- [ ] Analytics integration (Google Analytics or Plausible)
- [ ] Accessibility audit (keyboard nav, screen readers)
- [ ] Performance optimization (lazy loading, image optimization, Core Web Vitals)

**Deliverable:** Production-ready public storefront

---

## 📊 Success Metrics (Phase 1)

### Technical Metrics

- **Page Load Time**: < 2s (First Contentful Paint)
- **Search Latency**: < 500ms (keyword), < 1s (semantic), < 2s (visual)
- **Mobile Performance**: Lighthouse score > 90
- **Uptime**: 99.5%+

### User Engagement Metrics

- **Search Usage**: % of visitors who search (target: 60%+)
- **Search Modes**: Keyword vs Semantic vs Visual distribution
- **WhatsApp CTR**: % of product views that click WhatsApp CTA (target: 15%+)
- **Product Views per Session**: Target 8+ pages
- **Bounce Rate**: < 40%

### Search Quality Metrics

- **Zero-Result Searches**: < 10% (if high, catalog has gaps)
- **Search-to-Detail CTR**: % of search results that get clicked (target: 40%+)
- **Semantic Search Accuracy**: Manual evaluation of top 10 results for 50 test queries

---

## 🔧 Configuration & Environment Variables

### Backend `.env` Additions

```bash
# Existing (keep these)
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb://...
JWT_SECRET=...
PORT=5000

# NEW for Phase 1
MONGODB_ATLAS_VECTOR_SEARCH=true  # Enable Atlas Vector Search
EMBEDDING_MODEL_TEXT=text-embedding-3-small  # OpenAI text embedding model
EMBEDDING_MODEL_IMAGE=clip-vit-base-patch32  # CLIP for visual search

# Rate Limiting
PUBLIC_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
PUBLIC_RATE_LIMIT_MAX_REQUESTS=100  # Requests per window

# WhatsApp Business Number (for enquiry CTAs)
WHATSAPP_BUSINESS_NUMBER=919876543210

# Image CDN (once set up)
IMAGE_CDN_URL=https://cdn.yourdomain.com
```

---

## 💰 Cost Estimate (Monthly, Boutique Scale)

**Assumptions:** 10,000 products, 50,000 monthly visitors, 10,000 searches/month

| Service               | Cost        | Notes                                                         |
| --------------------- | ----------- | ------------------------------------------------------------- |
| **MongoDB Atlas**     | $60         | M10 cluster (2GB RAM, good for vector search)                 |
| **OpenAI Embeddings** | $2          | One-time: $0.50 for 10k products. Ongoing: ~$0.02/1k searches |
| **OpenAI CLIP**       | $5          | Visual search queries (~500/month)                            |
| **Image CDN**         | $10         | CloudFront or BunnyCDN (5GB, 100k requests)                   |
| **Hosting**           | $15         | Vercel Pro or similar for frontend                            |
| **Total**             | **~$92/mo** | Very affordable for boutique scale                            |

**Scaling:** At 100k visitors/month, expect ~$200-300/mo.

---

## 🚨 Risk Mitigation

### Technical Risks

| Risk                         | Impact           | Mitigation                                                 |
| ---------------------------- | ---------------- | ---------------------------------------------------------- |
| **OpenAI API outage**        | Search breaks    | Graceful fallback to keyword search only                   |
| **Vector search slow**       | Poor UX          | Pre-warm cache, optimize index, CDN for results            |
| **MongoDB Atlas cost spike** | Budget overrun   | Set billing alerts, optimize queries, add query caching    |
| **Image CDN bandwidth**      | Slow image loads | Compress images (WebP), lazy loading, limit max resolution |

### Business Risks

| Risk                                     | Impact           | Mitigation                                              |
| ---------------------------------------- | ---------------- | ------------------------------------------------------- |
| **Zero WhatsApp conversions**            | No sales         | Add phone CTA as alternative, track which works better  |
| **Users don't understand visual search** | Feature unused   | Onboarding tooltips, prominent "Upload photo" CTA       |
| **Search quality poor**                  | User frustration | Manual testing, user feedback loop, tune hybrid weights |

---

## 📋 Pre-Launch Checklist

### Before Public Launch

- [ ] **Legal:** Privacy policy, terms of service (required for public site)
- [ ] **WhatsApp:** Business number active, auto-reply message set up
- [ ] **Domains:** Purchase domain, configure DNS, SSL certificate
- [ ] **Analytics:** Google Analytics / Plausible installed, events configured
- [ ] **Monitoring:** Error tracking (Sentry), uptime monitoring (UptimeRobot)
- [ ] **Backups:** Automated MongoDB backups configured
- [ ] **Testing:** Cross-browser (Chrome, Safari, Firefox), cross-device (iOS, Android)
- [ ] **Performance:** All images optimized, CDN configured, Lighthouse > 90
- [ ] **SEO:** Sitemap.xml, robots.txt, meta tags, structured data for products
- [ ] **Security:** Rate limiting enabled, HTTPS enforced, CORS configured
- [ ] **Content:** At least 500 products with embeddings generated

---

## 🎯 Post-Launch Priorities (Phase 2+ Ideas)

**Not building now, but keep in mind for future:**

1. **Cart & Checkout** — If WhatsApp friction is too high
2. **User Accounts** — Wishlist, order history, saved addresses
3. **Reviews & Ratings** — Social proof
4. **Personalization** — "Recommended for you" based on browsing
5. **Filters on Visual Search** — Upload image + filter by price/occasion
6. **Multi-Language** — Hindi, Tamil, Telugu (huge market opportunity)
7. **AR Try-On** — Virtual draping (very advanced, but game-changer for sarees)
8. **Inventory Sync** — Integrate with offline POS if physical store exists

---

## 📞 Next Steps to Start Building

1. **Review & Approve This Plan** — Any changes to scope, design, timeline?
2. **Set Up MongoDB Atlas** — Upgrade to M10 cluster, enable Vector Search
3. **Get OpenAI API Key** — If not already have one for CLIP access
4. **Create Category Taxonomy** — Finalize exact categories (I'll help build seed data)
5. **Start with Phase 1A** — Foundation work (models, routes, basic frontend)

---

**Ready to build?** Let me know if you want to:

- Modify any part of this plan
- Start implementation (I can scaffold the files)
- Deep-dive into any specific section (e.g., design mockups, API specs)
- Discuss alternatives (e.g., PostgreSQL + pgvector instead of MongoDB Atlas)

This is your AI-era saree discovery platform. Let's build something beautiful! 🚀✨
