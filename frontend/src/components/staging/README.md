# Smart Staging System Components

React components for a Smart Product Staging System that handles batch image uploads, grouping, and organization with drag-and-drop functionality.

## Components

### 1. DropZone

File/folder upload component with drag-drop support.

**Features:**

- Drag & drop files or folders
- Manual selection buttons (Select Folder, Select Images)
- Mobile-friendly with touch support
- Auto-filters image files only
- Shows preview count on drop

**Usage:**

```jsx
import { DropZone } from "./components/staging";

<DropZone onFilesAdded={(files) => console.log(files)} />;
```

### 2. StagingCanvas

Grid display of product cards with mobile swipe view.

**Features:**

- Desktop: 3-column responsive grid
- Mobile: Swipe navigation with arrows and dots
- Shows image count → product count
- Touch gesture support

**Usage:**

```jsx
import { StagingCanvas } from "./components/staging";

<StagingCanvas
  productGroups={groups}
  onUpdateGroups={setGroups}
  onRemoveGroup={(groupId) => console.log("Remove:", groupId)}
/>;
```

### 3. ProductCard

Individual product card with image gallery and actions.

**Features:**

- Drag-drop to reorder images within card
- Mark primary image with star badge
- Actions: Add images, Split group, Delete
- Hover effects and animations

**Usage:**

```jsx
import { ProductCard } from "./components/staging";

<ProductCard
  group={productGroup}
  onUpdate={(images, primaryIndex) => console.log("Updated")}
  onSplit={(imageIndex) => console.log("Split at:", imageIndex)}
  onDelete={() => console.log("Deleted")}
/>;
```

### 4. UnassignedTray

Horizontal scrollable list of unassigned images.

**Features:**

- Checkbox selection
- Select all functionality
- Combine selected into product
- Delete selected images
- Horizontal scroll on overflow

**Usage:**

```jsx
import { UnassignedTray } from "./components/staging";

<UnassignedTray
  images={unassignedImages}
  onCombineSelected={(selectedImages) =>
    console.log("Combine:", selectedImages)
  }
  onRemoveImages={(imageIds) => console.log("Remove:", imageIds)}
/>;
```

## Installation

### 1. Install Dependencies

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2. Import Components

```jsx
// Import individual components
import {
  DropZone,
  StagingCanvas,
  ProductCard,
  UnassignedTray,
} from "./components/staging";

// Or import all at once
import * as Staging from "./components/staging";
```

## Complete Example

See [`frontend/src/pages/StagingExample.jsx`](../pages/StagingExample.jsx) for a full working example.

### Data Structure

#### Image Object

```javascript
{
  id: "img-1234567890-abc123",
  url: "blob:http://...",  // Object URL from File
  file: File,              // Original File object
  name: "product.jpg"
}
```

#### Product Group Object

```javascript
{
  id: "group-1234567890-xyz789",
  images: [imageObject, imageObject, ...],
  primaryImageIndex: 0  // Index of primary image
}
```

## Mobile Responsiveness

All components use Tailwind breakpoints:

- **Default (< 768px)**: Mobile-first design
- **md: (≥ 768px)**: Tablet layout
- **lg: (≥ 1024px)**: Desktop layout

### Mobile-Specific Features

1. **StagingCanvas**: Swipe navigation with touch gestures
2. **DropZone**: Touch-friendly buttons and drop zones
3. **ProductCard**: Touch-optimized drag-drop
4. **UnassignedTray**: Horizontal scroll with momentum

## Styling

Components use Tailwind CSS with dark mode support:

- Light mode: Default
- Dark mode: Activated via `dark:` classes

### Key Classes Used

- `bg-white dark:bg-gray-800` - Background colors
- `text-gray-700 dark:text-gray-200` - Text colors
- `border-gray-300 dark:border-gray-600` - Border colors

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 13.4+)
- **Mobile**: Android Chrome, iOS Safari

## Performance Notes

1. **Object URLs**: Remember to revoke object URLs when done:

   ```javascript
   URL.revokeObjectURL(image.url);
   ```

2. **Large Batches**: Consider implementing:
   - Virtual scrolling for 200+ images
   - Lazy loading for thumbnails
   - Image compression before upload

3. **Memory Management**: Clear unused images from state to prevent memory leaks

## Troubleshooting

### Drag-drop not working

- Ensure `@dnd-kit` packages are installed
- Check that images have unique `id` properties

### Mobile swipe not responsive

- Verify touch event handlers are not blocked by other elements
- Check z-index layering

### Images not displaying

- Confirm File objects are being converted to Object URLs
- Check image file types (must start with `image/`)

## Future Enhancements

- [ ] Drag images from UnassignedTray to ProductCards
- [ ] Bulk edit multiple products
- [ ] Image cropping/editing
- [ ] Auto-grouping based on AI similarity
- [ ] Export to various formats (JSON, CSV)

## License

Part of the ecommerce_text project.
