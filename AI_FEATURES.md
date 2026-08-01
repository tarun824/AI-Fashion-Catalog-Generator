# 🤖 AI Features Documentation

## Complete AI Features Implementation

This document covers all the AI-powered features implemented in the Fashion Catalog Generator.

---

## 🎯 Features Overview

### 1. **Visual Search** 🔍
Upload any saree image and find similar products from your catalog using AI image embeddings.

### 2. **AI Personal Stylist** 🎨
Upload a photo and get personalized product recommendations based on skin tone, body type, and style preferences.

### 3. **Smart Recommendations** ✨
AI-powered "Complete the Look" and "Similar Products" suggestions.

### 4. **Virtual Try-On** 🎭
Generate photorealistic images of customers wearing sarees (DALL-E integration).

---

## 🚀 Quick Start

### Step 1: Generate Embeddings for Existing Products

Before using Visual Search and Smart Recommendations, you need to generate AI embeddings for all products:

```bash
cd backend
node scripts/generateEmbeddings.js
```

This script will:
- Process all products in your database
- Generate text embeddings from product descriptions
- Generate image embeddings from product photos
- Store embeddings in the `embeddings.text` and `embeddings.clip` fields

**Expected Output:**
```
🚀 Starting embedding generation...

📦 Found 150 products to process

Processing: Blue Banarasi Silk Saree (64a2f3c4b1e...)
  ✓ Generated image embedding (visual description captured)
  ✅ Success (1/150)

...

📊 Summary:
✅ Successfully processed: 148
❌ Failed: 2
📈 Success rate: 98.7%

✨ Embedding generation complete!
```

**Cost Estimate:** ~₹0.20 per product (₹500 for 2500 products)

---

## 📖 Feature Documentation

### 1. Visual Search

**Frontend Route:** `/visual-search`

**How it works:**
1. User uploads an image (any saree photo)
2. AI analyzes the image for colors, patterns, fabric, style
3. Generates embedding vector from the image
4. Compares with all product embeddings in database
5. Returns top 20 matches sorted by similarity

**Backend API:**
```javascript
POST /api/ai-fashion-generator/ai/visual-search
Content-Type: multipart/form-data

Body: {
  image: File (PNG/JPG, max 10MB)
}

Response: {
  success: true,
  visualDescription: "Red silk saree with golden borders...",
  totalMatches: 20,
  results: [
    {
      _id: "...",
      name: "Red Kanjivaram Silk Saree",
      slug: "red-kanjivaram-silk",
      thumbnail: "gridfs-id",
      price: 4500,
      colors: ["Red", "Gold"],
      fabric: "Silk",
      similarityPercent: 95
    },
    // ... more results
  ]
}
```

**Cost:** ~₹0.20 per search (OpenAI GPT-4o-mini Vision + embeddings)

---

### 2. AI Personal Stylist

**Frontend Route:** `/personal-stylist`

**How it works:**
1. User uploads a selfie or photo
2. AI analyzes: skin tone, body type, face shape, age, style persona
3. Generates personalized recommendations based on color theory and fashion expertise
4. Filters products matching recommendations
5. Returns curated collection (15-20 products)

**Backend API:**
```javascript
POST /api/ai-fashion-generator/ai/personal-stylist
Content-Type: multipart/form-data

Body: {
  photo: File (PNG/JPG, max 10MB)
}

Response: {
  success: true,
  analysis: {
    skinTone: "wheatish",
    bodyType: "average",
    faceShape: "oval",
    estimatedAge: "30s",
    stylePersona: "traditional",
    confidence: 0.85
  },
  recommendations: {
    colors: {
      recommended: ["Earth Tones", "Warm Colors", "Mustard", "Olive Green"],
      avoid: ["Neon Colors", "Very Light Pastels"],
      reason: "Warm earthy tones enhance wheatish complexions"
    },
    fabrics: {
      recommended: ["All Fabrics", "Silk", "Cotton", "Georgette"],
      avoid: [],
      reason: "Most fabrics work well"
    },
    styles: [
      "Classic silk sarees with traditional borders",
      "Temple jewelry complements beautifully"
    ],
    occasions: ["Formal Events", "Festive", "Wedding"]
  },
  products: [
    // ... personalized product recommendations
  ]
}
```

**Cost:** ~₹0.50 per analysis

---

### 3. Similar Products

**Backend API:**
```javascript
GET /api/ai-fashion-generator/ai/similar-products/:productId?limit=10

Response: {
  success: true,
  sourceProduct: {
    _id: "...",
    name: "Blue Silk Saree"
  },
  results: [
    {
      _id: "...",
      name: "Navy Blue Silk Saree",
      similarityPercent: 92
    },
    // ... more similar products
  ]
}
```

**Usage in Frontend:**
```javascript
import { api } from '../utils/api';

// Get similar products for a specific product
const getSimilarProducts = async (productId) => {
  const response = await api.get(`/ai/similar-products/${productId}?limit=10`);
  return response.data.results;
};
```

---

### 4. Virtual Try-On (Beta)

**Backend API:**
```javascript
POST /api/ai-fashion-generator/ai/virtual-tryon
Content-Type: multipart/form-data

Body: {
  selfie: File (customer photo),
  product: File (product image),
  productId: "optional-product-id"
}

Response: {
  success: true,
  imageUrl: "https://oaidalleapiprodscus.blob.core.windows.net/...",
  prompt: "Professional fashion photography: ...",
  personAnalysis: "Fair skin tone, dark hair, oval face...",
  productAnalysis: "Red silk saree with golden borders..."
}
```

**Cost:** ~₹3-8 per try-on (DALL-E 3 generation)

**Note:** For production, consider using specialized try-on APIs like Fal.ai or Reactive Reality for better quality and lower cost.

---

## 💻 Frontend Integration Examples

### Add Visual Search Button to Any Page

```jsx
import { Link } from 'react-router-dom';

<Link to="/visual-search" className="btn-primary">
  🔍 Find Similar Sarees
</Link>
```

### Add Personal Stylist CTA

```jsx
<div className="stylist-banner">
  <h3>Not sure what suits you?</h3>
  <p>Upload your photo and get personalized recommendations</p>
  <Link to="/personal-stylist" className="btn-primary">
    🎨 Get My Style Profile
  </Link>
</div>
```

### Display Similar Products on Product Page

```jsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

function ProductPage({ productId }) {
  const [similarProducts, setSimilarProducts] = useState([]);

  useEffect(() => {
    const loadSimilar = async () => {
      const response = await api.get(`/ai/similar-products/${productId}`);
      setSimilarProducts(response.data.results);
    };
    loadSimilar();
  }, [productId]);

  return (
    <div>
      {/* Product details */}
      
      <section className="similar-products">
        <h2>You May Also Like</h2>
        <div className="products-grid">
          {similarProducts.map(item => (
            <ProductCard key={item._id} product={item.product} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

---

## 🔧 Configuration

### Environment Variables

Add to `backend/.env`:

```bash
# OpenAI API (required for all AI features)
OPENAI_API_KEY=sk-your-key-here
OPENAI_VISION_MODEL=gpt-4o-mini

# Optional: Adjust AI behavior
AI_SIMILARITY_THRESHOLD=0.7
AI_MAX_SIMILAR_PRODUCTS=20
```

### Embedding Generation Settings

Edit `backend/scripts/generateEmbeddings.js`:

```javascript
// Rate limiting (milliseconds between requests)
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second

// Batch processing
const BATCH_SIZE = 50; // Process 50 products at a time

// Retry failed products
const MAX_RETRIES = 3;
```

---

## 📊 Performance & Costs

### Monthly Cost Estimates (5000 customers)

| Feature | Usage | Cost per Use | Monthly Total |
|---------|-------|-------------|---------------|
| Visual Search | 400 searches | ₹0.20 | ₹80 |
| Personal Stylist | 600 analyses | ₹0.50 | ₹300 |
| Virtual Try-On | 200 generations | ₹3.00 | ₹600 |
| Similar Products | Free (pre-computed) | ₹0 | ₹0 |
| **Total** | | | **₹980/month** |

### One-Time Costs

- Generate embeddings for 2500 products: ₹500
- Re-generate when products change: ₹0.20 per product

### Performance

- Visual Search: 2-5 seconds
- Personal Stylist: 3-8 seconds
- Similar Products: <500ms (database query)
- Virtual Try-On: 10-30 seconds

---

## 🐛 Troubleshooting

### Issue: "Embeddings not found"

**Solution:** Run the embedding generation script:
```bash
node scripts/generateEmbeddings.js
```

### Issue: "OpenAI API error"

**Check:**
1. `OPENAI_API_KEY` is set in `.env`
2. API key has credits/quota
3. Internet connection is working

**Test:**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: "Visual search returns no results"

**Possible causes:**
1. No products have embeddings yet
2. Uploaded image is not a saree/garment
3. Similarity threshold too high

**Debug:**
```javascript
// Check if products have embeddings
const productsWithEmbeddings = await Product.countDocuments({
  'embeddings.text': { $exists: true, $ne: null }
});
console.log(`Products with embeddings: ${productsWithEmbeddings}`);
```

### Issue: "Personal stylist analysis inaccurate"

**Tips for better results:**
- Upload clear, front-facing photos
- Good lighting
- Plain background
- No filters or heavy editing

---

## 🚀 Future Enhancements

### Planned Features

1. **Voice Search**
   - Speech-to-text → Natural language search
   - Cost: +₹100/month

2. **AR Try-On (Mobile App)**
   - Real-time camera overlay
   - Requires native mobile app
   - Cost: ₹5-10L development

3. **Style Quiz**
   - 10-question quiz → personalized recommendations
   - No AI cost (rule-based)

4. **Fashion Trends AI**
   - Analyze social media trends
   - Recommend trending products
   - Cost: +₹500/month

5. **Outfit Completion AI**
   - Suggest matching jewelry, blouse, accessories
   - Requires multi-product catalog
   - Cost: Same as visual search

---

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [CLIP Model Paper](https://arxiv.org/abs/2103.00020)
- [Color Theory for Fashion](https://www.colorpsychology.org/)
- [Body Type Styling Guide](https://www.whowhatwear.com/body-type-guide)

---

## 🆘 Support

For issues or questions:
- Check this documentation first
- Review error logs in terminal
- Open GitHub issue with details
- Contact: support@yourstore.com

---

**Last Updated:** 2026-07-05  
**Version:** 1.0  
**Status:** Production Ready 🚀
