import { useState } from "react";

/**
 * UnassignedTray Component
 * Horizontal scrollable list of unassigned images
 * Supports selection and combining into products
 */
export default function UnassignedTray({
  images,
  onCombineSelected,
  onRemoveImages,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Toggle image selection
  const handleToggleSelect = (imageId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedIds(newSelected);
  };

  // Select all images
  const handleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  // Combine selected images into product
  const handleCombine = () => {
    const selectedImages = images.filter((img) => selectedIds.has(img.id));
    if (selectedImages.length === 0) return;

    onCombineSelected(selectedImages);

    // Remove combined images from unassigned
    onRemoveImages(Array.from(selectedIds));

    // Clear selection
    setSelectedIds(new Set());
  };

  // Delete selected images
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Delete ${selectedIds.size} selected image(s)?`)) {
      return;
    }

    onRemoveImages(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  if (images.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
          No unassigned images
        </p>
      </div>
    );
  }

  const allSelected = selectedIds.size === images.length && images.length > 0;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">
            Unassigned Images
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {images.length} {images.length === 1 ? "image" : "images"}
            {someSelected && ` • ${selectedIds.size} selected`}
          </span>
        </div>

        {/* Select All Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Select All
          </span>
        </label>
      </div>

      {/* Image Scroll Container */}
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-3 pb-2">
          {images.map((image) => {
            const isSelected = selectedIds.has(image.id);

            return (
              <div key={image.id} className="relative flex-shrink-0 group">
                {/* Image Container */}
                <div
                  onClick={() => handleToggleSelect(image.id)}
                  className={`
                    w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden cursor-pointer
                    border-2 transition-all duration-200
                    ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    }
                  `}
                >
                  <img
                    src={image.url}
                    alt={image.name || "Unassigned image"}
                    className="w-full h-full object-cover"
                    draggable="false"
                  />

                  {/* Selection Overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20" />
                  )}
                </div>

                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(image.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Image Name (on hover) */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 opacity-0 group-hover:opacity-100 p-2">
                  <p className="text-xs text-white truncate">
                    {image.name || "Untitled"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {someSelected && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-2">
          {/* Combine Button */}
          <button
            onClick={handleCombine}
            className="
              flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white 
              font-semibold rounded-lg shadow-md hover:shadow-lg
              transition-all duration-200
              flex items-center justify-center gap-2
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            Combine Selected → 1 Product
          </button>

          {/* Delete Selected Button */}
          <button
            onClick={handleDeleteSelected}
            className="
              px-6 py-3 bg-red-600 hover:bg-red-700 text-white 
              font-semibold rounded-lg shadow-md hover:shadow-lg
              transition-all duration-200
              flex items-center justify-center gap-2
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-800
              md:w-auto
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
            Delete ({selectedIds.size})
          </button>
        </div>
      )}

      {/* Instructions */}
      {!someSelected && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 Select images and combine them into a product, or drag them to
            product cards above
          </p>
        </div>
      )}
    </div>
  );
}
