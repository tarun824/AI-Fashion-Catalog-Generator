import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { autoGroupImages, calculateGroupingStats } from "../utils/imageGrouper";
import imageCompression from "browser-image-compression";
import { api } from "../utils/api";
import MergePreviewModal from "../components/products/MergePreviewModal";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

function SmartStagingPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [unassignedImages, setUnassignedImages] = useState([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [groupingMethod, setGroupingMethod] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [draggedCardId, setDraggedCardId] = useState(null);

  // Merge existing products
  const [showExistingProductsModal, setShowExistingProductsModal] =
    useState(false);
  const [existingProducts, setExistingProducts] = useState([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [refreshingAfterMerge, setRefreshingAfterMerge] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    if (productGroups.length === 0 && unassignedImages.length === 0) {
      return null;
    }
    return calculateGroupingStats({
      groups: productGroups,
      ungrouped: unassignedImages,
    });
  }, [productGroups, unassignedImages]);

  // Handle file selection
  const handleFilesAdded = async (fileList) => {
    setIsGrouping(true);
    const newFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (newFiles.length === 0) {
      setIsGrouping(false);
      return;
    }

    // Add to files state
    setFiles((prev) => [...prev, ...newFiles]);

    // Auto-group all files
    const allFiles = [...files, ...newFiles];
    try {
      const result = await autoGroupImages(allFiles);
      setProductGroups(result.groups);
      setUnassignedImages(result.ungrouped);
      setGroupingMethod(result.method);
    } catch (error) {
      console.error("Grouping failed:", error);
      // Fallback: all as ungrouped
      setUnassignedImages(allFiles);
    }
    setIsGrouping(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files) {
      handleFilesAdded(event.dataTransfer.files);
    }
  };

  // Update group name
  const updateGroupName = (groupId, newName) => {
    setProductGroups((prev) =>
      prev.map((group) =>
        group.groupId === groupId
          ? { ...group, suggestedName: newName }
          : group,
      ),
    );
  };

  // Move image from unassigned to group
  const addImageToGroup = (groupId, imageFile) => {
    setUnassignedImages((prev) => prev.filter((f) => f !== imageFile));
    setProductGroups((prev) =>
      prev.map((group) =>
        group.groupId === groupId
          ? { ...group, files: [...group.files, imageFile] }
          : group,
      ),
    );
  };

  // Remove image from group
  const removeImageFromGroup = (groupId, imageFile) => {
    setProductGroups((prev) =>
      prev.map((group) =>
        group.groupId === groupId
          ? { ...group, files: group.files.filter((f) => f !== imageFile) }
          : group,
      ),
    );
    setUnassignedImages((prev) => [...prev, imageFile]);
  };

  // Create new group from unassigned image
  const createGroupFromImage = (imageFile) => {
    const newGroup = {
      groupId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      files: [imageFile],
      suggestedName: imageFile.name.replace(/\.[^.]+$/, ""),
    };
    setUnassignedImages((prev) => prev.filter((f) => f !== imageFile));
    setProductGroups((prev) => [...prev, newGroup]);
  };

  // Delete entire group
  const deleteGroup = (groupId) => {
    const group = productGroups.find((g) => g.groupId === groupId);
    if (group) {
      setUnassignedImages((prev) => [...prev, ...group.files]);
      setProductGroups((prev) => prev.filter((g) => g.groupId !== groupId));
      // Remove from selection if selected
      setSelectedCardIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  // Toggle card selection
  const toggleCardSelection = (groupId) => {
    setSelectedCardIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Merge selected cards
  const mergeSelectedCards = () => {
    if (selectedCardIds.size < 2) return;

    const selectedGroups = productGroups.filter((g) =>
      selectedCardIds.has(g.groupId),
    );

    // Combine all files from selected groups
    const mergedFiles = selectedGroups.flatMap((g) => g.files);

    // Use first group's name or create new one
    const mergedName = selectedGroups[0].suggestedName + " (merged)";

    // Create new merged group
    const mergedGroup = {
      groupId: `merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      files: mergedFiles,
      suggestedName: mergedName,
    };

    // Remove old groups and add merged
    setProductGroups((prev) => [
      ...prev.filter((g) => !selectedCardIds.has(g.groupId)),
      mergedGroup,
    ]);

    // Clear selection
    setSelectedCardIds(new Set());
  };

  // Drag card onto another card to merge
  const handleCardDragStart = (groupId) => {
    setDraggedCardId(groupId);
  };

  const handleCardDragOver = (e, targetGroupId) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCardDrop = (e, targetGroupId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCardId || draggedCardId === targetGroupId) {
      setDraggedCardId(null);
      return;
    }

    // Merge dragged card into target card
    const draggedGroup = productGroups.find((g) => g.groupId === draggedCardId);
    const targetGroup = productGroups.find((g) => g.groupId === targetGroupId);

    if (!draggedGroup || !targetGroup) return;

    // Combine files
    const mergedGroup = {
      ...targetGroup,
      files: [...targetGroup.files, ...draggedGroup.files],
      suggestedName:
        targetGroup.suggestedName + " + " + draggedGroup.suggestedName,
    };

    // Update groups
    setProductGroups((prev) =>
      prev
        .filter((g) => g.groupId !== draggedCardId)
        .map((g) => (g.groupId === targetGroupId ? mergedGroup : g)),
    );

    setDraggedCardId(null);
  };

  // Process all groups
  const handleProcessAll = async () => {
    if (productGroups.length === 0) {
      alert("No products to process. Please group some images first.");
      return;
    }

    setIsProcessing(true);

    try {
      // Compress and prepare files
      const formData = new FormData();
      const productData = [];

      for (const group of productGroups) {
        const compressedFiles = [];

        for (const file of group.files) {
          try {
            const compressed = await imageCompression(file, {
              maxSizeMB: 2,
              maxWidthOrHeight: 2048,
              useWebWorker: true,
            });
            compressedFiles.push(compressed);
          } catch (error) {
            console.warn("Compression failed for", file.name, "using original");
            compressedFiles.push(file);
          }
        }

        // Add files to formData
        compressedFiles.forEach((file, index) => {
          formData.append(`product_${group.groupId}_image_${index}`, file);
        });

        // Add product metadata
        productData.push({
          groupId: group.groupId,
          name: group.suggestedName,
          imageCount: compressedFiles.length,
        });
      }

      formData.append("products", JSON.stringify(productData));

      // Send to backend
      const response = await fetch("/api/admin/staging/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      // Navigate to job tracking page
      if (result.jobId) {
        navigate(`/admin/batch-upload?jobId=${result.jobId}`);
      } else {
        navigate("/admin/products");
      }
    } catch (error) {
      console.error("Processing failed:", error);
      alert("Failed to process products. Please try again.");
      setIsProcessing(false);
    }
  };

  // Clear all
  const handleClearAll = () => {
    if (confirm("Are you sure? This will clear all staged products.")) {
      setFiles([]);
      setProductGroups([]);
      setUnassignedImages([]);
      setGroupingMethod("");
    }
  };

  // Load existing products from database
  const loadExistingProducts = async () => {
    setLoadingExisting(true);
    try {
      const response = await api.get("/admin/products?limit=100&status=all");
      setExistingProducts(response.data?.data || response.data || []);
      setShowExistingProductsModal(true);
    } catch (error) {
      console.error("Failed to load products:", error);
      alert("Failed to load existing products. Please try again.");
    } finally {
      setLoadingExisting(false);
    }
  };

  // Toggle existing product selection
  const toggleExistingProductSelection = (productId) => {
    setSelectedExistingIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  // Open merge modal for existing products
  const handleMergeExisting = () => {
    if (selectedExistingIds.length < 2) {
      alert("Please select at least 2 products to merge.");
      return;
    }
    setShowExistingProductsModal(false);
    setShowMergeModal(true);
  };

  // Handle merge complete
  const handleMergeComplete = async (mergedProduct) => {
    // Keep modal open - it will show success state
    // User will close it manually by clicking "Done"

    // Refresh the products list to show merged product and remove deleted ones
    setRefreshingAfterMerge(true);
    try {
      const response = await api.get("/admin/products?limit=100&status=all");
      setExistingProducts(response.data?.data || response.data || []);
      console.log("✅ Products list refreshed after merge");
    } catch (error) {
      console.error("Failed to reload products:", error);
    } finally {
      setRefreshingAfterMerge(false);
    }

    // Clear selection for next merge
    setSelectedExistingIds([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-32 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Smart Product Staging
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Upload multiple product photos and AI will group them
                automatically
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Merge Existing Products Button */}
              <button
                onClick={loadExistingProducts}
                disabled={loadingExisting}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-pink-500 disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                {loadingExisting ? "Loading..." : "Merge Existing Products"}
              </button>

              {files.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Drop Zone - Show when no files or alongside */}
        {files.length === 0 ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed px-6 py-20 text-center transition ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
            }`}
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                className="h-12 w-12"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="mt-6 text-xl font-semibold text-slate-800 dark:text-white">
              Drop your product photos here
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Or click to browse from your device
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              JPG, PNG, WEBP · Up to 200 images · 10 MB per file
            </p>
            <div className="mt-8">
              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-purple-500"
              >
                Select Images
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesAdded(e.target.files)}
            />
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            {stats && (
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.totalImages}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Total Images
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.groupCount}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Products
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.groupedImages}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Grouped
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.ungroupedImages}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Unassigned
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.groupingRate}%
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Success Rate
                  </div>
                </div>
              </div>
            )}

            {/* Add More Button */}
            <div className="mb-6">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isGrouping}
                className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
              >
                {isGrouping ? "Processing..." : "+ Add More Images"}
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFilesAdded(e.target.files)}
              />
            </div>

            {/* Grouping Method Badge */}
            {groupingMethod && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Grouped by: {groupingMethod}
              </div>
            )}

            {/* Product Groups */}
            {productGroups.length > 0 && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    Products ({productGroups.length})
                  </h2>
                  {selectedCardIds.size >= 2 && (
                    <button
                      onClick={mergeSelectedCards}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium shadow-lg hover:from-purple-500 hover:to-pink-500 transition"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                      Merge {selectedCardIds.size} Products
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productGroups.map((group) => (
                    <ProductGroupCard
                      key={group.groupId}
                      group={group}
                      isSelected={selectedCardIds.has(group.groupId)}
                      onToggleSelect={() => toggleCardSelection(group.groupId)}
                      onUpdateName={updateGroupName}
                      onRemoveImage={removeImageFromGroup}
                      onDelete={deleteGroup}
                      onDragStart={() => handleCardDragStart(group.groupId)}
                      onDragOver={(e) => handleCardDragOver(e, group.groupId)}
                      onDrop={(e) => handleCardDrop(e, group.groupId)}
                      isDragging={draggedCardId === group.groupId}
                      isDragTarget={
                        draggedCardId && draggedCardId !== group.groupId
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unassigned Images */}
            {unassignedImages.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">
                  Unassigned Images ({unassignedImages.length})
                </h2>
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {unassignedImages.map((file, index) => (
                      <UnassignedImageCard
                        key={index}
                        file={file}
                        onCreateGroup={createGroupFromImage}
                        productGroups={productGroups}
                        onAddToGroup={addImageToGroup}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Process Button */}
      {productGroups.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold">{productGroups.length}</span>{" "}
              products ready to process
            </div>
            <button
              onClick={handleProcessAll}
              disabled={isProcessing}
              className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:from-green-500 hover:to-emerald-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                `Process ${productGroups.length} ${productGroups.length === 1 ? "Product" : "Products"}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Existing Products Selection Modal */}
      {showExistingProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Select Products to Merge
                </h2>
                <button
                  onClick={() => {
                    setShowExistingProductsModal(false);
                    setSelectedExistingIds([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Select 2 or more products to merge them into one
              </p>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {refreshingAfterMerge ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-slate-600 dark:text-slate-400">
                    Refreshing products...
                  </p>
                </div>
              ) : existingProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">
                    No products found
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {existingProducts.map((product) => (
                    <div
                      key={product._id}
                      onClick={() =>
                        toggleExistingProductSelection(product._id)
                      }
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        selectedExistingIds.includes(product._id)
                          ? "border-purple-500 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-900 bg-purple-50 dark:bg-purple-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedExistingIds.includes(product._id)}
                          onChange={() =>
                            toggleExistingProductSelection(product._id)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          {product.images?.thumbnail?.gridFsId && (
                            <div className="relative">
                              <img
                                src={api.getImageUrl(
                                  product.images.thumbnail.gridFsId,
                                )}
                                alt={product.name}
                                className="w-full h-32 object-cover rounded-lg mb-2"
                              />
                              {/* Image count badge */}
                              {(product.imageGallery?.length > 1 ||
                                product.images?.gallery?.length > 1) && (
                                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                  {product.imageGallery?.length ||
                                    product.images?.gallery?.length ||
                                    1}
                                </div>
                              )}
                            </div>
                          )}
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {product.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            ₹
                            {typeof product.price === "number"
                              ? product.price.toFixed(2)
                              : (
                                  product.price?.amount ||
                                  product.price?.suggested ||
                                  0
                                ).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedExistingIds.length} product(s) selected
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowExistingProductsModal(false);
                      setSelectedExistingIds([]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMergeExisting}
                    disabled={selectedExistingIds.length < 2}
                    className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Merge {selectedExistingIds.length} Products
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Preview Modal */}
      {showMergeModal && (
        <MergePreviewModal
          selectedProducts={existingProducts.filter((p) =>
            selectedExistingIds.includes(p._id),
          )}
          onConfirm={handleMergeComplete}
          onCancel={() => {
            setShowMergeModal(false);
            setSelectedExistingIds([]);
            // Always re-open existing products modal to show refreshed data
            setShowExistingProductsModal(true);
          }}
        />
      )}
    </div>
  );
}

// Product Group Card Component
function ProductGroupCard({
  group,
  isSelected,
  onToggleSelect,
  onUpdateName,
  onRemoveImage,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragTarget,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(group.suggestedName);

  const handleSaveName = () => {
    onUpdateName(group.groupId, name);
    setIsEditing(false);
  };

  const handleCardClick = (e) => {
    // Ctrl+Click or Cmd+Click for multi-select
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onToggleSelect();
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={handleCardClick}
      className={`rounded-lg border-2 bg-white p-4 shadow-lg transition-all cursor-pointer
        ${
          isSelected
            ? "border-purple-500 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-900"
            : "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500"
        }
        ${isDragging ? "opacity-50 scale-95" : ""}
        ${
          isDragTarget
            ? "border-green-500 bg-green-50 dark:bg-green-900/20 scale-105"
            : "dark:bg-slate-800"
        }
      `}
    >
      <div className="mb-3 flex items-center justify-between">
        {/* Selection Checkbox */}
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
            title="Select for merge (or Ctrl+Click card)"
          />
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleSaveName();
              }}
              className="rounded border border-blue-400 px-2 py-1 text-sm font-medium dark:bg-slate-700 dark:text-white flex-1"
              autoFocus
            />
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="cursor-pointer text-base font-semibold text-slate-800 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 flex-1"
            >
              {group.suggestedName}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {group.files.length} {group.files.length === 1 ? "image" : "images"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(group.groupId);
            }}
            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            title="Delete group"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {group.files.map((file, index) => (
          <div key={index} className="group relative aspect-square">
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="h-full w-full rounded-lg object-cover"
              draggable={false}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage(group.groupId, file);
              }}
              className="absolute right-1 top-1 hidden rounded-full bg-red-500 p-1 text-white shadow group-hover:block hover:bg-red-600 transition"
              title="Remove from group"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/70 px-1 text-xs text-white">
              {file.name}
            </div>
            {/* Primary badge for first image */}
            {index === 0 && (
              <div className="absolute top-1 left-1 bg-yellow-400 rounded-full p-1 shadow-md">
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Drag hint */}
      {isDragTarget && (
        <div className="mt-3 text-center text-sm font-medium text-green-600 dark:text-green-400 animate-pulse">
          🎯 Drop here to merge
        </div>
      )}
    </div>
  );
}

// Unassigned Image Card Component
function UnassignedImageCard({
  file,
  onCreateGroup,
  productGroups,
  onAddToGroup,
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative aspect-square">
      <img
        src={URL.createObjectURL(file)}
        alt={file.name}
        className="h-full w-full rounded-lg object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-full bg-white p-2 text-slate-700 shadow-lg"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
      {showMenu && (
        <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => {
              onCreateGroup(file);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Create New Product
          </button>
          {productGroups.length > 0 && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700" />
              {productGroups.slice(0, 3).map((group) => (
                <button
                  key={group.groupId}
                  onClick={() => {
                    onAddToGroup(group.groupId, file);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Add to "{group.suggestedName}"
                </button>
              ))}
            </>
          )}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 truncate rounded-b-lg bg-black/70 px-1 text-xs text-white">
        {file.name}
      </div>
    </div>
  );
}

export default SmartStagingPage;
