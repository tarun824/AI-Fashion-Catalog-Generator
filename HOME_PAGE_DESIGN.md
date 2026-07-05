# 🏠 Home Page Design — Indian Saree Storefront

**Inspired by:** Koskii.com aesthetic  
**Target:** Indian women shopping for ethnic wear  
**Cultural Focus:** Wedding occasions, traditional fabrics, rich colors

---

## 🎨 Visual Design Philosophy

### Color Palette (Rich, Cultural, Premium)

```css
:root {
  /* Primary — Deep, regal tones */
  --color-primary: #8b2635; /* Deep maroon (bridal red) */
  --color-primary-light: #a53a4a;
  --color-primary-dark: #6b1e28;

  /* Secondary — Gold (Zari-inspired) */
  --color-secondary: #d4af37; /* Gold */
  --color-accent: #c77b30; /* Copper/bronze */

  /* Background — Clean canvas */
  --color-bg: #ffffff; /* Pure white (like Koskii) */
  --color-surface: #fffbf5; /* Warm ivory for cards */

  /* Text */
  --color-text: #2c2c2c; /* Almost black */
  --color-text-light: #6b6b6b; /* Grey for meta info */

  /* Sale/Badges */
  --color-sale: #e63946; /* Bright red */
  --color-new: #06a77d; /* Emerald green */
}
```

### Typography

```css
/* Headings — Elegant serif (like fashion magazines) */
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap");

/* Body — Clean, readable */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap");

h1 {
  font-family: "Playfair Display", serif;
  font-size: 48px;
  font-weight: 700;
}

h2 {
  font-family: "Playfair Display", serif;
  font-size: 32px;
  font-weight: 600;
}

body {
  font-family: "Inter", sans-serif;
  font-size: 16px;
}
```

---

## 📐 Home Page Layout (Desktop)

### Full Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR: Free Shipping | Easy Returns | COD Available          │
├─────────────────────────────────────────────────────────────────┤
│  HEADER                                                          │
│  [LOGO]    SAREES  LEHENGAS  SUITS  OCCASIONS  SALE    [🔍📷🛒] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🎯 HERO SECTION (Full-width banner)                            │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                                                       │      │
│  │     [Lifestyle photo: Model in wedding saree]        │      │
│  │                                                       │      │
│  │     "Timeless Elegance for Your Special Moments"     │      │
│  │     [Shop Wedding Collection]                        │      │
│  │                                                       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔥 PROMOTIONAL BANNER (Sticky category scroll)                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │  FLAT  │ │  NEW   │ │ UNDER  │ │  SILK  │ │WEDDING │       │
│  │  40%   │ │ARRIVALS│ │ ₹2999  │ │ SAREES │ │SPECIAL │       │
│  │  OFF   │ │        │ │        │ │30% OFF │ │        │       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
│  ← Horizontal scroll →                                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  💍 SHOP BY OCCASION (Indian weddings)                          │
│  "Find the Perfect Saree for Every Celebration"                 │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   HALDI  │  │  MEHENDI │  │  SANGEET │  │  WEDDING │       │
│  │  [Image] │  │  [Image] │  │  [Image] │  │  [Image] │       │
│  │          │  │          │  │          │  │          │       │
│  │ Yellow & │  │  Green & │  │   Party  │  │   Bridal │       │
│  │ Pastel   │  │  Festive │  │   Glam   │  │   Silk   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │RECEPTION │  │ FESTIVE  │  │  CASUAL  │  │  PARTY   │       │
│  │  [Image] │  │  [Image] │  │  [Image] │  │  [Image] │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🧵 SHOP BY FABRIC                                              │
│  "Authentic Handlooms & Premium Silks"                          │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │BANARASI│ │KANJIVA-│ │  SILK  │ │ COTTON │ │GEORGETTE│      │
│  │  SILK  │ │  RAM   │ │ SAREES │ │ SAREES │ │ SAREES │       │
│  │ [Image]│ │ [Image]│ │ [Image]│ │ [Image]│ │ [Image]│       │
│  │        │ │        │ │        │ │        │ │        │       │
│  │Starting│ │Starting│ │Starting│ │Starting│ │Starting│       │
│  │₹8,999  │ │₹12,999 │ │₹4,999  │ │₹1,999  │ │₹2,499  │       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                                  │
│  [View All Fabrics →]                                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⭐ BESTSELLERS                                                  │
│  "Most Loved by Our Customers"                                  │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │[Product]│ │[Product]│ │[Product]│ │[Product]│ │[Product]│ │
│  │  Image  │ │  Image  │ │  Image  │ │  Image  │ │  Image  │ │
│  │         │ │         │ │         │ │         │ │         │ │
│  │ ⭐ 4.8  │ │ ⭐ 4.9  │ │ ⭐ 4.7  │ │ ⭐ 5.0  │ │ ⭐ 4.8  │ │
│  │Red Silk │ │Pink Net │ │Green    │ │Blue     │ │Gold     │ │
│  │Wedding  │ │Party    │ │Festive  │ │Banarasi │ │Georgette│ │
│  │         │ │         │ │         │ │         │ │         │ │
│  │₹8,999   │ │₹5,499   │ │₹6,999   │ │₹12,999  │ │₹4,999   │ │
│  │40% OFF  │ │30% OFF  │ │25% OFF  │ │20% OFF  │ │40% OFF  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                                  │
│  [View All Bestsellers →]                                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🎨 SHOP BY COLOR                                               │
│  "Explore Your Favorite Hues"                                   │
│                                                                  │
│  [⬤ Red] [⬤ Pink] [⬤ Blue] [⬤ Green] [⬤ Yellow] [⬤ Maroon]   │
│  [⬤ Black] [⬤ White] [⬤ Gold] [⬤ Orange] [⬤ Purple] [More→]  │
│                                                                  │
│  (Each color circle shows product count when hovered)           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✨ SHOP BY WORK TYPE                                           │
│  "Exquisite Craftsmanship"                                      │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   ZARI   │  │EMBROIDERY│  │  STONE   │  │  PRINTED │       │
│  │   WORK   │  │   WORK   │  │   WORK   │  │  SAREES  │       │
│  │  [Image] │  │  [Image] │  │  [Image] │  │  [Image] │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  💰 SHOP BY BUDGET                                              │
│  "Quality Sarees at Every Price Point"                          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  UNDER   │  │ ₹2,000-  │  │ ₹5,000-  │  │  PREMIUM │       │
│  │  ₹2,000  │  │  ₹5,000  │  │ ₹10,000  │  │ COLLECTION│      │
│  │  [Image] │  │  [Image] │  │  [Image] │  │  [Image] │       │
│  │          │  │          │  │          │  │          │       │
│  │2,450 items│ │1,890 items│ │945 items │ │520 items │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🎁 SPECIAL COLLECTIONS                                         │
│  "Curated Just for You"                                         │
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  NEW ARRIVALS       │  │  TRENDING NOW       │              │
│  │  This Week          │  │  Top 20 This Month  │              │
│  │  [Banner Image]     │  │  [Banner Image]     │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  BRIDAL SPECIAL     │  │  FESTIVE EDIT       │              │
│  │  Wedding Collection │  │  Festival Ready     │              │
│  │  [Banner Image]     │  │  [Banner Image]     │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  💬 WHAT OUR CUSTOMERS SAY                                      │
│  "Real Reviews from Real Brides"                                │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │ [Customer Photo]     │  │ [Customer Photo]     │            │
│  │                      │  │                      │            │
│  │ ⭐⭐⭐⭐⭐           │  │ ⭐⭐⭐⭐⭐           │            │
│  │                      │  │                      │            │
│  │ "Perfect saree for   │  │ "Amazing quality,    │            │
│  │  my sister's wedding.│  │  got so many         │            │
│  │  Everyone loved it!" │  │  compliments!"       │            │
│  │                      │  │                      │            │
│  │ - Priya, Bangalore   │  │ - Anjali, Mumbai     │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                  │
│  [More Reviews →]                                               │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📱 WHY SHOP WITH US?                                           │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  🚚     │  │  🔄     │  │  ✅     │  │  🔒     │           │
│  │  FREE   │  │  EASY   │  │ QUALITY │  │  100%   │           │
│  │SHIPPING │  │ RETURNS │  │ASSURED  │  │  SECURE │           │
│  │         │  │         │  │         │  │         │           │
│  │On orders│  │7-day    │  │Authentic│  │Payment  │           │
│  │₹1,999+  │  │return   │  │products │  │guarantee│           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📧 STAY CONNECTED                                              │
│  "Subscribe for Exclusive Offers & New Arrivals"                │
│                                                                  │
│  [Enter your email]  [SUBSCRIBE]                                │
│                                                                  │
│  Get ₹500 off on your first order!                              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FOOTER                                                          │
│  [About] [Contact] [Shipping] [Returns] [Privacy] [Terms]       │
│  [Instagram] [Facebook] [Pinterest] [YouTube] [WhatsApp]        │
│  © 2026 YourBrand. All rights reserved.                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile Layout (Responsive Design)

```
┌───────────────────────────┐
│ 🍔 [LOGO]         🔍 📷 🛒│
├───────────────────────────┤
│                           │
│  HERO BANNER              │
│  [Full-width image]       │
│  "Timeless Elegance"      │
│  [Shop Now]               │
│                           │
├───────────────────────────┤
│                           │
│  PROMO SCROLL             │
│  [SALE] [NEW] [SILK] →   │
│                           │
├───────────────────────────┤
│                           │
│  SHOP BY OCCASION         │
│                           │
│  ┌─────────┐ ┌─────────┐ │
│  │ HALDI   │ │ MEHENDI │ │
│  │ [Image] │ │ [Image] │ │
│  └─────────┘ └─────────┘ │
│  ┌─────────┐ ┌─────────┐ │
│  │ SANGEET │ │ WEDDING │ │
│  │ [Image] │ │ [Image] │ │
│  └─────────┘ └─────────┘ │
│                           │
├───────────────────────────┤
│                           │
│  BESTSELLERS              │
│  (Horizontal scroll)      │
│  [Product] [Product] →    │
│                           │
├───────────────────────────┤
│                           │
│  SHOP BY FABRIC           │
│  (Horizontal scroll)      │
│  [Banarasi] [Silk] →      │
│                           │
└───────────────────────────┘
    ⬇ Bottom Nav ⬇
┌───────────────────────────┐
│ 🏠   🔍   📷   💬   ☰    │
│Home Search Cam  Chat Menu │
└───────────────────────────┘
```

---

## 🎯 Component Specifications

### 1. Hero Banner Component

```jsx
// components/HeroBanner.jsx
<section className="hero-section">
  <div className="hero-container">
    <Swiper autoplay loop>
      <SwiperSlide>
        <div className="hero-slide">
          <img src="/hero-wedding.jpg" alt="Wedding Collection" />
          <div className="hero-content">
            <h1>Timeless Elegance for Your Special Moments</h1>
            <p>Discover Handcrafted Sarees for Every Celebration</p>
            <button className="btn-primary">Shop Wedding Collection</button>
          </div>
        </div>
      </SwiperSlide>

      <SwiperSlide>
        <div className="hero-slide">
          <img src="/hero-festive.jpg" alt="Festive Collection" />
          <div className="hero-content">
            <h1>Festival Ready Styles</h1>
            <p>Traditional Silk Sarees at Up to 40% Off</p>
            <button className="btn-primary">Explore Festive Collection</button>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</section>
```

**Design Specs:**

- Height: 600px desktop, 400px mobile
- Overlay: Dark gradient (bottom) for text readability
- Auto-play: 5 seconds per slide
- Animation: Fade transition

---

### 2. Promotional Strip Component

```jsx
// components/PromoStrip.jsx
<section className="promo-strip">
  <div className="promo-scroll">
    <PromoCard
      image="/sale-40.jpg"
      title="FLAT 40% OFF"
      subtitle="On All Silk Sarees"
      link="/sale"
      badge="🔥 HOT DEAL"
    />

    <PromoCard
      image="/new-arrivals.jpg"
      title="NEW ARRIVALS"
      subtitle="This Week's Fresh Styles"
      link="/new"
      badge="✨ NEW"
    />

    <PromoCard
      image="/under-2999.jpg"
      title="UNDER ₹2,999"
      subtitle="Quality Sarees on Budget"
      link="/budget/under-2999"
    />

    <PromoCard
      image="/silk-sale.jpg"
      title="SILK SAREES"
      subtitle="30% Off - Limited Time"
      link="/category/silk"
      badge="💎 PREMIUM"
    />

    <PromoCard
      image="/wedding-special.jpg"
      title="WEDDING SPECIAL"
      subtitle="Bridal Collection 2026"
      link="/occasion/wedding"
      badge="💍 BRIDAL"
    />
  </div>
</section>
```

**Design Specs:**

- Cards: 200x250px each
- Horizontal scroll (overflow-x: auto)
- Smooth scroll snap on mobile
- Hover: Scale 1.05 + shadow

---

### 3. Occasion Grid Component

```jsx
// components/OccasionGrid.jsx
<section className="occasion-grid-section">
  <div className="section-header">
    <h2>Shop by Occasion</h2>
    <p className="subtitle">Find the Perfect Saree for Every Celebration</p>
  </div>

  <div className="occasion-grid">
    <OccasionCard
      image="/occasion-haldi.jpg"
      title="HALDI"
      description="Yellow & Pastel Sarees"
      productCount={245}
      link="/occasion/haldi"
      color="#FFD700" // Gold overlay
    />

    <OccasionCard
      image="/occasion-mehendi.jpg"
      title="MEHENDI"
      description="Green & Festive Sarees"
      productCount={320}
      link="/occasion/mehendi"
      color="#06A77D" // Green overlay
    />

    <OccasionCard
      image="/occasion-sangeet.jpg"
      title="SANGEET"
      description="Party & Glam Sarees"
      productCount={410}
      link="/occasion/sangeet"
      color="#E91E63" // Pink overlay
    />

    <OccasionCard
      image="/occasion-wedding.jpg"
      title="WEDDING"
      description="Bridal Silk Sarees"
      productCount={580}
      link="/occasion/wedding"
      color="#8B2635" // Maroon overlay
    />

    <OccasionCard
      image="/occasion-reception.jpg"
      title="RECEPTION"
      description="Elegant Designer Sarees"
      productCount={390}
      link="/occasion/reception"
      color="#1E88E5" // Blue overlay
    />

    <OccasionCard
      image="/occasion-festive.jpg"
      title="FESTIVE"
      description="Traditional Handlooms"
      productCount={520}
      link="/occasion/festive"
      color="#FF6F00" // Orange overlay
    />

    <OccasionCard
      image="/occasion-casual.jpg"
      title="CASUAL"
      description="Daily Wear Comfort"
      productCount={680}
      link="/occasion/casual"
      color="#607D8B" // Grey overlay
    />

    <OccasionCard
      image="/occasion-party.jpg"
      title="PARTY"
      description="Contemporary Styles"
      productCount={430}
      link="/occasion/party"
      color="#9C27B0" // Purple overlay
    />
  </div>
</section>
```

**OccasionCard Design:**

```css
.occasion-card {
  position: relative;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s;
}

.occasion-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.occasion-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.occasion-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
}

.occasion-card-title {
  font-family: "Playfair Display", serif;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.occasion-card-description {
  font-size: 14px;
  opacity: 0.9;
}

.occasion-card-count {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.7;
}
```

---

### 4. Product Card Component (Bestsellers)

```jsx
// components/ProductCard.jsx
<div className="product-card">
  <div className="product-image-wrapper">
    <Link to={`/product/${product.slug}`}>
      <img
        src={product.thumbnail}
        alt={product.name}
        className="product-image"
      />
    </Link>

    {/* Badges */}
    <div className="product-badges">
      {product.isNew && <span className="badge-new">NEW</span>}
      {product.isBestseller && (
        <span className="badge-bestseller">⭐ BESTSELLER</span>
      )}
      {product.discount > 0 && (
        <span className="badge-sale">{product.discount}% OFF</span>
      )}
    </div>

    {/* Quick Actions (Show on hover) */}
    <div className="product-quick-actions">
      <button className="btn-icon" title="Find Similar">
        <CameraIcon /> Find Similar
      </button>
      <button className="btn-icon" title="Quick View">
        <EyeIcon /> Quick View
      </button>
    </div>

    {/* Stock Badge */}
    {product.stock < 5 && product.stock > 0 && (
      <div className="stock-badge">Only {product.stock} left!</div>
    )}
  </div>

  <div className="product-info">
    {/* Rating */}
    <div className="product-rating">
      <span className="stars">⭐ {product.rating}</span>
      <span className="reviews">({product.reviewCount})</span>
    </div>

    {/* Name */}
    <h3 className="product-name">
      <Link to={`/product/${product.slug}`}>{product.name}</Link>
    </h3>

    {/* Meta Info */}
    <p className="product-meta">
      {product.fabric} • {product.occasion}
    </p>

    {/* Colors */}
    {product.colors?.length > 0 && (
      <div className="product-colors">
        {product.colors.slice(0, 5).map((color) => (
          <span
            key={color}
            className="color-dot"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        {product.colors.length > 5 && (
          <span className="color-more">+{product.colors.length - 5}</span>
        )}
      </div>
    )}

    {/* Price */}
    <div className="product-price">
      <span className="price-current">₹{product.price}</span>
      {product.originalPrice > product.price && (
        <>
          <span className="price-original">₹{product.originalPrice}</span>
          <span className="price-discount">
            ({Math.round((1 - product.price / product.originalPrice) * 100)}%
            OFF)
          </span>
        </>
      )}
    </div>

    {/* WhatsApp CTA */}
    <button className="btn-whatsapp-small">
      <WhatsAppIcon /> Quick Enquiry
    </button>
  </div>
</div>
```

**Product Card Styling:**

```css
.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
}

.product-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.product-image-wrapper {
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.product-card:hover .product-image {
  transform: scale(1.1);
}

.product-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.badge-new {
  background: #06a77d;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-sale {
  background: #e63946;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-bestseller {
  background: rgba(212, 175, 55, 0.95);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.product-quick-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  gap: 8px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s;
}

.product-card:hover .product-quick-actions {
  opacity: 1;
  transform: translateY(0);
}

.product-info {
  padding: 16px;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  margin-bottom: 8px;
}

.product-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-meta {
  font-size: 14px;
  color: #6b6b6b;
  margin-bottom: 8px;
}

.product-colors {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #f0f0f0;
  cursor: pointer;
}

.product-price {
  margin-bottom: 12px;
}

.price-current {
  font-size: 20px;
  font-weight: 700;
  color: #2c2c2c;
}

.price-original {
  font-size: 16px;
  color: #999;
  text-decoration: line-through;
  margin-left: 8px;
}

.price-discount {
  font-size: 14px;
  color: #06a77d;
  margin-left: 4px;
}

.btn-whatsapp-small {
  width: 100%;
  padding: 10px;
  background: #25d366;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.3s;
}

.btn-whatsapp-small:hover {
  background: #1da851;
}
```

---

### 5. Color Filter Component

```jsx
// components/ColorFilter.jsx
<section className="color-filter-section">
  <div className="section-header">
    <h2>Shop by Color</h2>
    <p className="subtitle">Explore Your Favorite Hues</p>
  </div>

  <div className="color-grid">
    {COLORS.map((color) => (
      <Link
        key={color.name}
        to={`/search?color=${color.slug}`}
        className="color-filter-item"
      >
        <div className="color-circle" style={{ backgroundColor: color.hex }}>
          <span className="color-count">{color.productCount}</span>
        </div>
        <span className="color-name">{color.name}</span>
      </Link>
    ))}
  </div>
</section>;

// Color data
const COLORS = [
  { name: "Red", slug: "red", hex: "#E63946", productCount: 450 },
  { name: "Pink", slug: "pink", hex: "#FF006E", productCount: 520 },
  { name: "Maroon", slug: "maroon", hex: "#8B2635", productCount: 380 },
  { name: "Blue", slug: "blue", hex: "#1E88E5", productCount: 410 },
  { name: "Green", slug: "green", hex: "#06A77D", productCount: 390 },
  { name: "Yellow", slug: "yellow", hex: "#FFD700", productCount: 280 },
  { name: "Orange", slug: "orange", hex: "#FF6F00", productCount: 250 },
  { name: "Purple", slug: "purple", hex: "#9C27B0", productCount: 320 },
  { name: "Black", slug: "black", hex: "#2C2C2C", productCount: 460 },
  { name: "White", slug: "white", hex: "#FFFFFF", productCount: 340 },
  { name: "Gold", slug: "gold", hex: "#D4AF37", productCount: 220 },
  { name: "Silver", slug: "silver", hex: "#C0C0C0", productCount: 180 },
];
```

**Color Circle Styling:**

```css
.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: center;
  padding: 40px 0;
}

.color-filter-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.color-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  position: relative;
}

.color-filter-item:hover .color-circle {
  transform: scale(1.15);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  border-color: var(--color-primary);
}

.color-count {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.3s;
}

.color-filter-item:hover .color-count {
  opacity: 1;
}

.color-name {
  font-size: 14px;
  font-weight: 500;
}
```

---

### 6. Customer Testimonial Component

```jsx
// components/TestimonialSection.jsx
<section className="testimonial-section">
  <div className="section-header">
    <h2>What Our Customers Say</h2>
    <p className="subtitle">Real Reviews from Real Brides</p>
  </div>

  <Swiper
    spaceBetween={30}
    slidesPerView={1}
    breakpoints={{
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 3 },
    }}
    pagination
    autoplay
  >
    {TESTIMONIALS.map((testimonial) => (
      <SwiperSlide key={testimonial.id}>
        <TestimonialCard {...testimonial} />
      </SwiperSlide>
    ))}
  </Swiper>
</section>;

// TestimonialCard component
function TestimonialCard({
  name,
  location,
  photo,
  rating,
  review,
  productImage,
}) {
  return (
    <div className="testimonial-card">
      <div className="testimonial-header">
        <img src={photo} alt={name} className="customer-photo" />
        <div className="customer-info">
          <h4>{name}</h4>
          <p>{location}</p>
          <div className="rating">{"⭐".repeat(rating)}</div>
        </div>
      </div>

      <p className="testimonial-review">"{review}"</p>

      <img src={productImage} alt="Product" className="product-thumb" />
    </div>
  );
}

const TESTIMONIALS = [
  {
    id: 1,
    name: "Priya Sharma",
    location: "Bangalore",
    photo: "/testimonials/priya.jpg",
    rating: 5,
    review:
      "Perfect saree for my sister's wedding. The fabric quality is amazing and everyone loved it!",
    productImage: "/products/red-silk-saree.jpg",
  },
  // ... more testimonials
];
```

---

## 🎯 Key Interactions & Animations

### Scroll Animations

```javascript
// Use Intersection Observer for scroll animations
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".animate-on-scroll").forEach((el) => {
    observer.observe(el);
  });

  return () => observer.disconnect();
}, []);
```

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}

.animate-in {
  opacity: 1;
  transform: translateY(0);
}
```

### Hover Effects

```css
/* Product card hover */
.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

/* Category card hover */
.occasion-card:hover img {
  transform: scale(1.1);
}

/* Button hover with shine effect */
.btn-primary {
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.5s;
}

.btn-primary:hover::before {
  left: 100%;
}
```

---

## 🚀 Performance Optimizations

### Image Loading Strategy

```jsx
// Lazy load images with blur placeholder
<Image
  src={product.image}
  alt={product.name}
  placeholder="blur"
  blurDataURL={product.blurPlaceholder}
  loading="lazy"
  sizes="(max-width: 768px) 50vw, 25vw"
/>
```

### Critical CSS Inlining

```html
<!-- Inline critical CSS for above-the-fold content -->
<style>
  .hero-section {
    /* Critical styles */
  }
  .promo-strip {
    /* Critical styles */
  }
</style>
```

### Font Loading

```css
/* Use font-display: swap to prevent FOIT */
@font-face {
  font-family: "Playfair Display";
  src: url("/fonts/playfair-display.woff2") format("woff2");
  font-display: swap;
}
```

---

## 📊 Key Metrics to Track

### User Engagement

- **Scroll Depth**: How far users scroll down home page
- **Category Clicks**: Which occasion/fabric categories get most clicks
- **Hero Banner CTR**: Click-through rate on hero CTA buttons
- **Time on Page**: Average time spent on home page

### Conversion Indicators

- **WhatsApp CTA Clicks**: How many users click enquiry buttons
- **Search Bar Usage**: % of users who use search from home page
- **Visual Search Adoption**: % of users who try camera search

### Performance

- **LCP (Largest Contentful Paint)**: Target < 2.5s
- **FID (First Input Delay)**: Target < 100ms
- **CLS (Cumulative Layout Shift)**: Target < 0.1
- **Mobile Speed Score**: Target > 90

---

## ✅ Pre-Launch Checklist

### Content Requirements

- [ ] 8+ high-quality hero banner images
- [ ] Lifestyle photos for all occasion categories
- [ ] Product photos for at least 500 products
- [ ] Customer testimonial photos (5+)
- [ ] All category banner images

### Technical Setup

- [ ] Image CDN configured
- [ ] Lazy loading implemented
- [ ] Analytics tracking installed
- [ ] WhatsApp Business number configured
- [ ] Mobile responsiveness tested on real devices

### SEO

- [ ] Meta tags for home page
- [ ] Structured data (Organization, WebSite)
- [ ] Open Graph tags for social sharing
- [ ] Sitemap includes home page
- [ ] robots.txt configured

---

**This design captures the essence of Koskii's visual-first, occasion-driven approach while being optimized for your saree storefront. Ready to build it?** 🎨✨
