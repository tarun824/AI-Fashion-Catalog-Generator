import { useState } from "react";
import ProductCard from "./ProductCard";

/**
 * StagingCanvas Component
 * Displays grid of product cards with mobile swipe view
 * Desktop: 3-column grid
 * Mobile: Single product swipe view with navigation
 */
export default function StagingCanvas({
  productGroups,
  onUpdateGroups,
  onRemoveGroup,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Calculate total images
  const totalImages = productGroups.reduce(
    (sum, group) => sum + group.images.length,
    0,
  );

  // Handle swipe gestures for mobile
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < productGroups.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < productGroups.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Handle product card actions
  const handleUpdate = (groupId, updatedImages, primaryIndex) => {
    const updatedGroups = productGroups.map((group) =>
      group.id === groupId
        ? { ...group, images: updatedImages, primaryImageIndex: primaryIndex }
        : group,
    );
    onUpdateGroups(updatedGroups);
  };

  const handleSplit = (groupId, imageIndex) => {
    const group = productGroups.find((g) => g.id === groupId);
    if (!group || group.images.length < 2) return;

    // Create new group with the split image
    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      images: [group.images[imageIndex]],
      primaryImageIndex: 0,
    };

    // Update original group without the split image
    const updatedGroup = {
      ...group,
      images: group.images.filter((_, i) => i !== imageIndex),
      primaryImageIndex:
        group.primaryImageIndex === imageIndex
          ? 0
          : group.primaryImageIndex > imageIndex
            ? group.primaryImageIndex - 1
            : group.primaryImageIndex,
    };

    const updatedGroups = productGroups.map((g) =>
      g.id === groupId ? updatedGroup : g,
    );
    updatedGroups.push(newGroup);

    onUpdateGroups(updatedGroups);
  };

  const handleDelete = (groupId) => {
    onRemoveGroup(groupId);
    // Adjust current index if needed
    if (currentIndex >= productGroups.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (productGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
          No products staged yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Upload images or drag them from the unassigned tray
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Stats */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm md:text-base">
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {totalImages} images
          </span>
          <span className="text-gray-400 dark:text-gray-500 mx-2">→</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {productGroups.length} products
          </span>
        </div>

        {/* Mobile: Current Position Indicator */}
        <div className="md:hidden text-sm text-gray-500 dark:text-gray-400">
          {currentIndex + 1} / {productGroups.length}
        </div>
      </div>

      {/* Desktop: Grid View */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productGroups.map((group) => (
          <ProductCard
            key={group.id}
            group={group}
            onUpdate={(updatedImages, primaryIndex) =>
              handleUpdate(group.id, updatedImages, primaryIndex)
            }
            onSplit={(imageIndex) => handleSplit(group.id, imageIndex)}
            onDelete={() => handleDelete(group.id)}
          />
        ))}
      </div>

      {/* Mobile: Swipe View */}
      <div className="md:hidden">
        <div
          className="relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Product Card Container */}
          <div className="px-2">
            <ProductCard
              group={productGroups[currentIndex]}
              onUpdate={(updatedImages, primaryIndex) =>
                handleUpdate(
                  productGroups[currentIndex].id,
                  updatedImages,
                  primaryIndex,
                )
              }
              onSplit={(imageIndex) =>
                handleSplit(productGroups[currentIndex].id, imageIndex)
              }
              onDelete={() => handleDelete(productGroups[currentIndex].id)}
            />
          </div>

          {/* Navigation Arrows */}
          {productGroups.length > 1 && (
            <>
              {/* Previous Arrow */}
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`
                  absolute left-2 top-1/2 -translate-y-1/2 z-10
                  w-10 h-10 rounded-full bg-white dark:bg-gray-800 
                  shadow-lg flex items-center justify-center
                  transition-all duration-200
                  ${
                    currentIndex === 0
                      ? "opacity-30 cursor-not-allowed"
                      : "opacity-80 hover:opacity-100 active:scale-95"
                  }
                `}
                aria-label="Previous product"
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-gray-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Next Arrow */}
              <button
                onClick={handleNext}
                disabled={currentIndex === productGroups.length - 1}
                className={`
                  absolute right-2 top-1/2 -translate-y-1/2 z-10
                  w-10 h-10 rounded-full bg-white dark:bg-gray-800 
                  shadow-lg flex items-center justify-center
                  transition-all duration-200
                  ${
                    currentIndex === productGroups.length - 1
                      ? "opacity-30 cursor-not-allowed"
                      : "opacity-80 hover:opacity-100 active:scale-95"
                  }
                `}
                aria-label="Next product"
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-gray-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dot Indicators */}
        {productGroups.length > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            {productGroups.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`
                  h-2 rounded-full transition-all duration-200
                  ${
                    index === currentIndex
                      ? "w-8 bg-blue-600 dark:bg-blue-400"
                      : "w-2 bg-gray-300 dark:bg-gray-600"
                  }
                `}
                aria-label={`Go to product ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
