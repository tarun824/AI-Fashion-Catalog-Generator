import { useState } from "react";
import { DropZone, StagingCanvas, UnassignedTray } from "../components/staging";

/**
 * Example Usage Page for Smart Staging System
 *
 * This demonstrates how to integrate all staging components:
 * - DropZone: Upload files/folders
 * - UnassignedTray: Manage unassigned images
 * - StagingCanvas: Display and manage product groups
 */
export default function StagingExample() {
  const [unassignedImages, setUnassignedImages] = useState([]);
  const [productGroups, setProductGroups] = useState([]);

  // Handle new files from DropZone
  const handleFilesAdded = (files) => {
    const newImages = files.map((file) => ({
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file),
      file: file,
      name: file.name,
    }));

    setUnassignedImages([...unassignedImages, ...newImages]);
  };

  // Combine selected images into a product
  const handleCombineSelected = (selectedImages) => {
    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      images: selectedImages,
      primaryImageIndex: 0,
    };

    setProductGroups([...productGroups, newGroup]);
  };

  // Remove images from unassigned tray
  const handleRemoveUnassigned = (imageIds) => {
    setUnassignedImages(
      unassignedImages.filter((img) => !imageIds.includes(img.id)),
    );
  };

  // Remove a product group
  const handleRemoveGroup = (groupId) => {
    const group = productGroups.find((g) => g.id === groupId);
    if (!group) return;

    // Optionally move images back to unassigned
    // setUnassignedImages([...unassignedImages, ...group.images]);

    setProductGroups(productGroups.filter((g) => g.id !== groupId));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Smart Product Staging
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload images, organize them into products, and manage your catalog
          </p>
        </div>

        {/* Drop Zone */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            1. Upload Images
          </h2>
          <DropZone onFilesAdded={handleFilesAdded} />
        </section>

        {/* Staging Canvas */}
        {productGroups.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              2. Product Staging
            </h2>
            <StagingCanvas
              productGroups={productGroups}
              onUpdateGroups={setProductGroups}
              onRemoveGroup={handleRemoveGroup}
            />
          </section>
        )}

        {/* Unassigned Tray */}
        {unassignedImages.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              3. Unassigned Images
            </h2>
            <UnassignedTray
              images={unassignedImages}
              onCombineSelected={handleCombineSelected}
              onRemoveImages={handleRemoveUnassigned}
            />
          </section>
        )}

        {/* Action Buttons */}
        {productGroups.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
            <button
              className="
                px-8 py-4 bg-green-600 hover:bg-green-700 text-white 
                font-bold text-lg rounded-lg shadow-lg hover:shadow-xl
                transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-900
              "
              onClick={() => {
                // Implement save/submit logic
                console.log("Product groups:", productGroups);
                alert("Ready to save! Check console for product data.");
              }}
            >
              ✓ Save {productGroups.length}{" "}
              {productGroups.length === 1 ? "Product" : "Products"}
            </button>

            <button
              className="
                px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white 
                font-bold text-lg rounded-lg shadow-lg hover:shadow-xl
                transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-900
              "
              onClick={() => {
                if (confirm("Clear all products and start over?")) {
                  setProductGroups([]);
                  setUnassignedImages([]);
                }
              }}
            >
              🔄 Reset All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
