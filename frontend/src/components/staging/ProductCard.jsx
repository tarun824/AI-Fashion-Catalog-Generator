import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Sortable Image Thumbnail Component
 */
function SortableImage({ image, index, isPrimary, onSetPrimary, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Thumbnail Image */}
      <div
        {...attributes}
        {...listeners}
        className={`
          w-20 h-20 rounded-lg overflow-hidden cursor-move
          border-2 transition-all duration-200
          ${
            isPrimary
              ? "border-yellow-400 ring-2 ring-yellow-400 ring-offset-2 dark:ring-offset-gray-800"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }
        `}
      >
        <img
          src={image.url}
          alt={`Thumbnail ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Primary Star Badge */}
      {isPrimary && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-md">
          <svg
            className="w-4 h-4 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      )}

      {/* Hover Actions */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        {/* Set Primary Button */}
        {!isPrimary && (
          <button
            onClick={() => onSetPrimary(index)}
            className="p-1.5 bg-yellow-400 hover:bg-yellow-500 rounded-full shadow-lg transition-colors"
            title="Set as primary"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )}

        {/* Remove Button */}
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-colors"
          title="Remove from group"
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * ProductCard Component
 * Shows main image + gallery with drag-drop reordering
 */
export default function ProductCard({ group, onUpdate, onSplit, onDelete }) {
  const [primaryImageIndex, setPrimaryImageIndex] = useState(
    group.primaryImageIndex || 0,
  );
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end for image reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = group.images.findIndex((img) => img.id === active.id);
      const newIndex = group.images.findIndex((img) => img.id === over.id);

      const newImages = arrayMove(group.images, oldIndex, newIndex);

      // Update primary index if it was moved
      let newPrimaryIndex = primaryImageIndex;
      if (oldIndex === primaryImageIndex) {
        newPrimaryIndex = newIndex;
      } else if (
        oldIndex < primaryImageIndex &&
        newIndex >= primaryImageIndex
      ) {
        newPrimaryIndex--;
      } else if (
        oldIndex > primaryImageIndex &&
        newIndex <= primaryImageIndex
      ) {
        newPrimaryIndex++;
      }

      setPrimaryImageIndex(newPrimaryIndex);
      onUpdate(newImages, newPrimaryIndex);
    }
  };

  // Set primary image
  const handleSetPrimary = (index) => {
    setPrimaryImageIndex(index);
    onUpdate(group.images, index);
  };

  // Remove image from group
  const handleRemoveImage = (index) => {
    if (group.images.length === 1) {
      // If only one image, delete the entire group
      onDelete();
      return;
    }

    const newImages = group.images.filter((_, i) => i !== index);
    const newPrimaryIndex =
      index === primaryImageIndex
        ? 0
        : index < primaryImageIndex
          ? primaryImageIndex - 1
          : primaryImageIndex;

    setPrimaryImageIndex(newPrimaryIndex);
    onUpdate(newImages, newPrimaryIndex);
  };

  // Add images to group
  const handleAddImages = (e) => {
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length === 0) return;

    const newImages = files.map((file) => ({
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file),
      file: file,
      name: file.name,
    }));

    onUpdate([...group.images, ...newImages], primaryImageIndex);
  };

  const primaryImage = group.images[primaryImageIndex] || group.images[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
        <img
          src={primaryImage.url}
          alt="Product primary"
          className="w-full h-full object-cover"
        />

        {/* Image Count Badge */}
        <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
          {group.images.length} {group.images.length === 1 ? "image" : "images"}
        </div>
      </div>

      {/* Gallery Thumbnails */}
      {group.images.length > 1 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={group.images.map((img) => img.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-2 overflow-x-auto pb-2">
                {group.images.map((image, index) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    index={index}
                    isPrimary={index === primaryImageIndex}
                    onSetPrimary={handleSetPrimary}
                    onRemove={handleRemoveImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Drag to reorder • Star to set primary
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 flex flex-wrap gap-2">
        {/* Add Images */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="
            flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white 
            font-medium rounded-lg transition-colors duration-200
            flex items-center justify-center gap-2
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-800
          "
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add
        </button>

        {/* Split */}
        {group.images.length > 1 && (
          <button
            onClick={() => onSplit(0)}
            className="
              flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white 
              font-medium rounded-lg transition-colors duration-200
              flex items-center justify-center gap-2
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-800
            "
            title="Split first image into new product"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            Split
          </button>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="
            px-4 py-2 bg-red-600 hover:bg-red-700 text-white 
            font-medium rounded-lg transition-colors duration-200
            flex items-center justify-center gap-2
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-800
          "
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleAddImages}
        className="hidden"
      />
    </div>
  );
}
