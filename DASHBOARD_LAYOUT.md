# Dashboard Layout Reference

## 🎨 Visual Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard Overview 👋                              [Refresh Button] │
│  Complete analytics and insights for your fashion catalog            │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┬───────────────────────────────┐
│  LEFT COLUMN (2/3 width)           │  RIGHT COLUMN (1/3 width)     │
│                                    │                               │
│  ┌──────────────────────────────┐ │  ┌─────────────────────────┐ │
│  │  📊 CATALOG ANALYTICS        │ │  │  ⚡ QUICK ACTIONS       │ │
│  │  ┌────┬────┬────┐            │ │  │  ┌─────┐  ┌─────┐       │ │
│  │  │💰  │📈  │📊  │            │ │  │  │📤   │  │➕   │       │ │
│  │  │Val │New │Avg │            │ │  │  │Batch│  │Add  │       │ │
│  │  └────┴────┴────┘            │ │  │  └─────┘  └─────┘       │ │
│  │  [30-Day Trend Line Chart]   │ │  │  ┌─────┐  ┌─────┐       │ │
│  └──────────────────────────────┘ │  │  │🔍   │  │📂   │       │ │
│                                    │  │  │Search│  │Cats │       │ │
│  ┌──────────────────────────────┐ │  │  └─────┘  └─────┘       │ │
│  │  💎 TOP PRODUCTS BY VALUE    │ │  │  📥 Export Menu          │ │
│  │  #1 [img] Product Name   ₹₹₹ │ │  │  🔧 Bulk Operations      │ │
│  │  #2 [img] Product Name   ₹₹₹ │ │  └─────────────────────────┘ │
│  │  #3 [img] Product Name   ₹₹₹ │ │                               │
│  │  #4 [img] Product Name   ₹₹₹ │ │  ┌─────────────────────────┐ │
│  │  #5 [img] Product Name   ₹₹₹ │ │  │  🤝 VENDOR INSIGHTS     │ │
│  └──────────────────────────────┘ │  │  ┌────┬────┐             │ │
│                                    │  │  │👥  │🆕  │             │ │
│  ┌──────────────────────────────┐ │  │  │Total│New │             │ │
│  │  🧵 DISTRIBUTION BY FABRIC   │ │  │  └────┴────┘             │ │
│  │  [Bar Chart]                 │ │  │  ┌────┬────┐             │ │
│  │  ███████▓▓▓▓▒▒▒░░            │ │  │  │📦  │💼  │             │ │
│  └──────────────────────────────┘ │  │  │Avg │Value│             │ │
│                                    │  │  └────┴────┘             │ │
│  ┌──────────────────────────────┐ │  │  💡 Growth Tip           │ │
│  │  🎉 DISTRIBUTION BY OCCASION │ │  └─────────────────────────┘ │
│  │  [Pie Chart]  [Legend]       │ │                               │
│  │      ◉                       │ │                               │
│  │     ◉ ◉                      │ │                               │
│  └──────────────────────────────┘ │                               │
│                                    │                               │
│  ┌──────────────────────────────┐ │                               │
│  │  📂 TOP CATEGORIES           │ │                               │
│  │  Category 1    123 prods ₹₹₹ │ │                               │
│  │  Category 2    98 prods  ₹₹₹ │ │                               │
│  │  Category 3    87 prods  ₹₹₹ │ │                               │
│  └──────────────────────────────┘ │                               │
└────────────────────────────────────┴───────────────────────────────┘

┌────────────────────────────────────┬───────────────────────────────┐
│  BOTTOM LEFT (1/2 width)           │  BOTTOM RIGHT (1/2 width)     │
│                                    │                               │
│  ┌──────────────────────────────┐ │  ┌─────────────────────────┐ │
│  │  📦 INVENTORY ALERTS         │ │  │  📋 RECENT ACTIVITY     │ │
│  │  ┌────┬────┐                 │ │  │  📤 Product uploaded    │ │
│  │  │⚠️  │📦  │                 │ │  │     2 mins ago          │ │
│  │  │Out │Low │                 │ │  │  ✅ Batch completed     │ │
│  │  │ 5  │12  │                 │ │  │     5 mins ago          │ │
│  │  └────┴────┘                 │ │  │  📤 Product uploaded    │ │
│  │  ┌────┬────┐                 │ │  │     10 mins ago         │ │
│  │  │💰  │📊  │                 │ │  │  ⚙️  Processing batch   │ │
│  │  │Val │Units│                │ │  │     15 mins ago         │ │
│  │  └────┴────┘                 │ │  │  📤 Product uploaded    │ │
│  │                              │ │  │     20 mins ago         │ │
│  │  🚨 Out of Stock (5 items)  │ │  │  ✏️  Product edited     │ │
│  │  ⚠️ Low Stock (12 items)    │ │  │     25 mins ago         │ │
│  │  📦 Overstocked (3 items)   │ │  │  📤 Product uploaded    │ │
│  └──────────────────────────────┘ │  │     30 mins ago         │ │
│                                    │  └─────────────────────────┘ │
└────────────────────────────────────┴───────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  🎯 SUMMARY STATS BAR (Gradient Purple Background)                  │
│  ┌──────┬──────┬──────┬──────┐                                     │
│  │ 1234 │  45  │  12  │  28  │                                     │
│  │Total │Added │Alerts│Vendor│                                     │
│  │Prods │Month │      │      │                                     │
│  └──────┴──────┴──────┴──────┘                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📱 Mobile Layout (< 768px)

```
┌───────────────────┐
│  Dashboard 👋     │
│  [Refresh]        │
└───────────────────┘

┌───────────────────┐
│ 📊 Catalog        │
│ Analytics         │
│ ┌──┐ ┌──┐        │
│ │💰│ │📈│        │
│ └──┘ └──┘        │
│ [Chart]           │
└───────────────────┘

┌───────────────────┐
│ ⚡ Quick Actions  │
│ ┌─────┐           │
│ │📤   │           │
│ │Batch│           │
│ └─────┘           │
│ [More actions]    │
└───────────────────┘

┌───────────────────┐
│ 💎 Top Products   │
│ [List]            │
└───────────────────┘

┌───────────────────┐
│ 🧵 Fabrics        │
│ [Chart]           │
└───────────────────┘

┌───────────────────┐
│ 🤝 Vendors        │
│ [Stats]           │
└───────────────────┘

┌───────────────────┐
│ 📦 Inventory      │
│ [Alerts]          │
└───────────────────┘

┌───────────────────┐
│ 📋 Activity       │
│ [Feed]            │
└───────────────────┘

┌───────────────────┐
│ Summary Bar       │
└───────────────────┘
```

## 🎨 Color Reference

### Widget Colors

- **Catalog Analytics**: Indigo/Purple gradient
- **Quick Actions**: Multi-colored gradients
- **Vendor Insights**: Blue/Green/Purple/Amber
- **Inventory Alerts**: Red (urgent), Yellow (warning), Green (ok), Blue (info)
- **Recent Activity**: Status-based (green/blue/yellow/red)

### Chart Colors

- **Line Chart**: Indigo (#6366f1)
- **Bar Chart**: Indigo (#6366f1)
- **Pie Chart**: Rainbow palette (Indigo, Purple, Pink, Amber, Green, Blue, Red, Teal)

### Status Badges

- ✅ **Success/Completed**: Green (bg-green-100, text-green-700)
- ⚠️ **Warning/Draft**: Yellow (bg-yellow-100, text-yellow-700)
- 🚨 **Urgent/Failed**: Red (bg-red-100, text-red-700)
- 📊 **Processing/Info**: Blue (bg-blue-100, text-blue-700)

## 📐 Spacing & Sizing

### Grid Breakpoints

- **Desktop (lg)**: 3 columns (2/3 + 1/3)
- **Tablet (md)**: 2 columns
- **Mobile**: 1 column (stack)

### Component Heights

- **Catalog Analytics**: ~400px (with chart)
- **Top Products**: ~250px per widget
- **Quick Actions**: ~600px
- **Vendor Insights**: ~400px
- **Inventory Alerts**: Variable (based on alerts)
- **Recent Activity**: Max 600px (scrollable)

### Padding & Margins

- **Page Container**: p-4 sm:p-6 lg:p-8
- **Widget Padding**: p-6
- **Grid Gaps**: gap-6
- **Element Spacing**: space-y-6, space-x-3

## 🔤 Typography

### Headings

- **Page Title**: text-3xl font-bold
- **Widget Title**: text-xl font-semibold
- **Section Title**: text-lg font-semibold
- **Card Title**: text-sm font-medium

### Body Text

- **Primary**: text-gray-900
- **Secondary**: text-gray-600
- **Tertiary**: text-gray-500

### Numbers

- **Large Stats**: text-3xl font-bold
- **Medium Stats**: text-2xl font-bold
- **Small Stats**: text-xl font-bold

## 🖼️ Icons

All icons are Unicode emojis for simplicity:

- 💰 Money/Value
- 📈 Growth/Trending
- 📊 Analytics/Stats
- 💎 Premium/Top
- 🧵 Fabric/Material
- 🎉 Occasion/Event
- 📂 Category/Folder
- 📦 Inventory/Stock
- ⚠️ Warning/Alert
- 🚨 Urgent/Critical
- 👥 People/Vendors
- 🆕 New/Fresh
- 💼 Business/Value
- 📋 Activity/Log
- ⚡ Quick/Fast
- 📤 Upload/Add
- ➕ Create/New
- 🔍 Search/Find
- ✅ Success/Done
- ✏️ Edit/Update
- ⚙️ Processing/Working

## 📱 Responsive Behavior

### Desktop (≥1024px)

- Full 3-column layout
- All charts visible
- Hover effects active
- Side-by-side grids

### Tablet (768px - 1023px)

- 2-column layout
- Charts resize proportionally
- Touch-friendly buttons
- Vertical stacking begins

### Mobile (<768px)

- Single column stack
- Charts resize to full width
- Compact stat cards (2 per row)
- Simplified navigation
- Reduced padding

## 🎭 Interactive States

### Hover Effects

- **Cards**: shadow-sm → shadow-md
- **Links**: text-gray-900 → text-indigo-600
- **Buttons**: bg-gray-50 → bg-gray-100
- **Actions**: scale-100 → scale-105

### Loading States

- **Skeleton**: animate-pulse with gray gradients
- **Spinner**: rotating border animation
- **Overlay**: backdrop-blur with opacity

### Active States

- **Selected**: border-indigo-500, bg-indigo-50
- **Focus**: ring-2 ring-indigo-500
- **Pressed**: scale-95

---

**Use this reference when customizing or extending the dashboard!**
