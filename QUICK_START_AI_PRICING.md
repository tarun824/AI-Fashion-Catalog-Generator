# Quick Start Guide - AI Pricing & Inventory

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Backend (if not already installed)
cd backend
npm install

# Frontend (if not already installed)
cd frontend
npm install
```

### Step 2: Start Services

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 3: Access the Feature

1. Open browser: `http://localhost:5173/app/ai-fashion-generator`
2. Login with admin credentials
3. Click **"Inventory AI"** in the sidebar

## 🎯 Quick Demo Workflow

### Demo 1: View Inventory Insights (30 seconds)

1. Go to **Inventory AI** → **Overview** tab
2. See total products, inventory value, fast/slow movers
3. Check quick action cards for product categories

### Demo 2: AI Pricing Recommendations (1 minute)

1. Go to **Pricing AI** tab
2. See AI-generated price suggestions with confidence scores
3. Click **"Apply Now"** on any suggestion to update price instantly
4. Or select multiple products → **"Update X Prices"** → Review → Confirm

### Demo 3: Stock Alerts (30 seconds)

1. Go to **Alerts** tab
2. Filter by **Critical**, **Warnings**, or **Opportunities**
3. Click any alert to see detailed information
4. Click **"Edit Product"** to fix the issue

### Demo 4: Performance Analysis (1 minute)

1. Go to **Performance** tab
2. See slow-moving products with recommendations
3. Check dead stock items (no sales in 6+ months)
4. View bundle opportunities

## 🧪 Testing with Sample Data

### Option 1: Use Existing Products

The system will analyze your current product catalog. However, since `salesCount` defaults to 0, you'll see:

- Most products as "slow movers" or "dead stock"
- Price suggestions based mainly on age and stock levels
- Limited demand-based insights

### Option 2: Manually Add Sales Data (Recommended)

Update a few products in MongoDB to simulate sales:

```javascript
// In MongoDB shell or Compass
db.products.updateOne(
  { sku: "YOUR-PRODUCT-SKU" },
  {
    $set: {
      salesCount: 50, // 50 sales
      lastSoldAt: new Date(), // Sold today
      viewCount: 200, // 200 views
    },
  },
);

// Another example - slow mover
db.products.updateOne(
  { sku: "ANOTHER-SKU" },
  {
    $set: {
      salesCount: 2, // Only 2 sales
      lastSoldAt: new Date("2025-12-01"), // Sold 7 months ago
      viewCount: 150, // But 150 views
      "variants.0.stock": 45, // High stock
    },
  },
);
```

### Option 3: Bulk Update Script (Advanced)

Create `backend/scripts/seedSalesData.js`:

```javascript
import mongoose from "mongoose";
import Product from "../src/models/Product.js";
import { connectDatabase } from "../src/config/database.js";

async function seedSalesData() {
  await connectDatabase();

  const products = await Product.find({ status: "published" }).limit(20);

  for (const product of products) {
    const random = Math.random();

    // 30% fast movers
    if (random < 0.3) {
      product.salesCount = Math.floor(Math.random() * 50) + 30;
      product.viewCount = product.salesCount * 5;
      product.lastSoldAt = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      );
    }
    // 40% normal
    else if (random < 0.7) {
      product.salesCount = Math.floor(Math.random() * 20) + 5;
      product.viewCount = product.salesCount * 10;
      product.lastSoldAt = new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      );
    }
    // 30% slow/dead
    else {
      product.salesCount = Math.floor(Math.random() * 3);
      product.viewCount = Math.floor(Math.random() * 50) + 20;
      product.lastSoldAt =
        product.salesCount > 0
          ? new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
          : null;
    }

    await product.save();
    console.log(`Updated ${product.sku}`);
  }

  console.log("✅ Sales data seeded!");
  process.exit(0);
}

seedSalesData().catch(console.error);
```

Run it:

```bash
cd backend
node scripts/seedSalesData.js
```

## 📊 API Testing with curl

### Get Inventory Alerts

```bash
curl -X GET http://localhost:5000/api/ai-fashion-generator/admin/inventory/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Pricing Suggestions

```bash
curl -X POST http://localhost:5000/api/ai-fashion-generator/admin/inventory/pricing-suggestions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Apply Single Price Suggestion

```bash
curl -X POST http://localhost:5000/api/ai-fashion-generator/admin/inventory/apply-suggestion/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"suggestedPrice": 1200}'
```

## 🔧 Troubleshooting

### Issue: "No products found"

**Solution**: Make sure you have products in your database with `status: 'published'`

### Issue: "All products showing as slow movers"

**Solution**: Add sales data to products (see Option 2 or 3 above)

### Issue: "Pricing suggestions not loading"

**Solution**:

1. Check backend console for errors
2. Verify MongoDB connection is active
3. Check that products have valid `price.amount` values

### Issue: "Cannot update price"

**Solution**:

1. Verify you're logged in as admin
2. Check product ID is correct
3. Ensure new price is a valid number > 0

### Issue: Navigation item not showing

**Solution**: Clear browser cache and refresh

## 💡 Best Practices

### 1. Start with Small Batch

- Review AI suggestions on 5-10 products first
- Monitor results before bulk updates

### 2. Use Filters Effectively

- Filter by "Increase" to find underpriced products
- Filter by "Decrease" to identify overstock situations
- Focus on "High" confidence suggestions first

### 3. Regular Reviews

- Check alerts daily for critical stock issues
- Review pricing suggestions weekly
- Analyze performance monthly

### 4. Seasonal Adjustments

- Before wedding season (Oct-Feb): Check bridal/wedding items
- Before festivals (Sep-Nov): Review party/festive products
- Summer (May-Jul): Apply clearance discounts

## 📈 Expected Results

After adding realistic sales data:

- **Fast Movers**: 20-30% of products (high sales velocity)
- **Slow Movers**: 30-40% of products (low sales velocity)
- **Dead Stock**: 10-20% of products (no sales in 6+ months)
- **Pricing Adjustments**: 40-60% of products get recommendations

## 🎓 Learning Resources

### Algorithm Details

See `AI_PRICING_INVENTORY_GUIDE.md` → "AI Algorithms Explained"

### API Reference

See `AI_PRICING_INVENTORY_GUIDE.md` → "Backend API Endpoints"

### Code Structure

- **Pricing Logic**: `backend/src/services/pricingAI.js`
- **Inventory Logic**: `backend/src/services/inventoryAI.js`
- **API Routes**: `backend/src/routes/inventoryRoutes.js`
- **UI Components**: `frontend/src/pages/Inventory.jsx`

## 🚨 Important Notes

1. **Sales Data**: The system requires `salesCount` and `lastSoldAt` to be populated for accurate insights
2. **Initial State**: Existing products have `salesCount: 0`, so they'll appear as slow movers
3. **Future Integration**: Connect this to your order system to automatically update sales counts
4. **Backup**: Always backup database before bulk price updates

## ✅ Checklist for First Use

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Logged in as admin
- [ ] Can see "Inventory AI" in sidebar
- [ ] Dashboard loads without errors
- [ ] At least 10 products in database
- [ ] (Optional) Added sample sales data to some products

## 🎉 You're Ready!

Start exploring the AI-powered inventory intelligence system. The more you use it, the more valuable insights you'll discover!

**Need Help?**

- Check documentation: `AI_PRICING_INVENTORY_GUIDE.md`
- Review implementation: `AI_PRICING_IMPLEMENTATION.md`
- Check console logs for detailed error messages

---

**Happy Optimizing! 🚀**
