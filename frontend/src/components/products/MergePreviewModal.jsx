import { useState, useMemo } from "react";
import { X, GripVertical, AlertCircle } from "lucide-react";
import { api } from "../../utils/api";

/**
 * MergePreviewModal Component
 * Preview and configure product merge before confirming
 *
 * Props:
 * - selectedProducts: Array of product objects to merge
 * - onConfirm: Callback when merge is confirmed (receives merged product)
 * - onCancel: Callback when modal is closed
 */
export default function MergePreviewModal({
  selectedProducts = [], // Default to empty array
  onConfirm,
  onCancel,
}) {
  // Early return if no products - MUST be before any hooks
  if (!selectedProducts || selectedProducts.length === 0) {
    return null;
  }

  const [priceStrategy, setPriceStrategy] = useState("keep_primary");
  const [manualPrice, setManualPrice] = useState("");
  const [descriptionStrategy, setDescriptionStrategy] =
    useState("keep_primary");
  const [primaryProductId, setPrimaryProductId] = useState(
    selectedProducts[0]?._id || null,
  );

  // Build image order from all products' image galleries
  const [imageOrder, setImageOrder] = useState(() => {
    const images = [];
    selectedProducts.forEach((p) => {
      // Check for imageGallery first (new structure)
      if (p.imageGallery?.length > 0) {
        p.imageGallery.forEach((img) => {
          images.push({
            productId: p._id,
            gridFsId: img.gridFsId,
            thumbnailGridFsId: img.thumbnailGridFsId,
            order: images.length,
            productName: p.name,
          });
        });
      }
      // Fallback to images.gallery (virtual field)
      else if (p.images?.gallery?.length > 0) {
        p.images.gallery.forEach((img) => {
          images.push({
            productId: p._id,
            gridFsId: img.gridFsId,
            thumbnailGridFsId: img.thumbnailGridFsId,
            order: images.length,
            productName: p.name,
          });
        });
      }
      // Fallback to legacy single image
      else if (p.images?.original?.gridFsId) {
        images.push({
          productId: p._id,
          gridFsId: p.images.original.gridFsId,
          thumbnailGridFsId: p.images.thumbnail?.gridFsId,
          order: images.length,
          productName: p.name,
        });
      }
    });
    return images;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [mergedProduct, setMergedProduct] = useState(null);

  const primaryProduct = useMemo(
    () =>
      selectedProducts.find((p) => p._id === primaryProductId) ||
      selectedProducts[0],
    [selectedProducts, primaryProductId],
  );

  const previewPrice = useMemo(() => {
    if (priceStrategy === "manual") {
      return Number(manualPrice) || 0;
    }

    const prices = selectedProducts
      .map((p) => p.price?.amount || 0)
      .filter((p) => p > 0);
    if (prices.length === 0) return 0;

    switch (priceStrategy) {
      case "average":
        return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      case "highest":
        return Math.max(...prices);
      case "lowest":
        return Math.min(...prices);
      case "keep_primary":
      default:
        return primaryProduct?.price?.amount || 0;
    }
  }, [priceStrategy, manualPrice, selectedProducts, primaryProduct]);

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/html"));

    const newOrder = [...imageOrder];
    const [draggedItem] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    // Update order property
    newOrder.forEach((img, idx) => {
      img.order = idx;
    });

    setImageOrder(newOrder);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      // Separate primary product from merge products
      const allProductIds = selectedProducts.map((p) => p._id);
      const mergeProductIds = allProductIds.filter(
        (id) => id !== primaryProductId,
      );

      const response = await api.post("/admin/products/merge", {
        primaryProductId,
        mergeProductIds,
        options: {
          priceStrategy,
          priceValue: priceStrategy === "manual" ? Number(manualPrice) : null,
          descriptionStrategy,
        },
      });

      // Show success state instead of closing
      setMergedProduct(response.data);
      setMergeSuccess(true);
      onConfirm(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalImages = imageOrder.length;
  const mergedAttributes = useMemo(() => {
    // Collect all unique attributes
    const attributes = {
      categories: new Set(),
      colors: new Set(),
      tags: new Set(),
      variants: [],
    };

    selectedProducts.forEach((p) => {
      if (p.category) attributes.categories.add(p.category);
      if (p.colors?.names)
        p.colors.names.forEach((c) => attributes.colors.add(c));
      if (p.tags) p.tags.forEach((t) => attributes.tags.add(t));
      if (p.variants) attributes.variants.push(...p.variants);
    });

    return {
      categories: Array.from(attributes.categories),
      colors: Array.from(attributes.colors),
      tags: Array.from(attributes.tags),
      variantCount: attributes.variants.length,
    };
  }, [selectedProducts]);

  // Success view after merge
  if (mergeSuccess && mergedProduct) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">✅</span> Merge Successful!
              </h3>
              <p className="text-sm text-green-100 mt-0.5">
                {selectedProducts.length} products merged into one
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Merged Product Preview */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🎉 Your Merged Product
              </h4>

              <div className="flex gap-4">
                {/* Primary Image */}
                {mergedProduct.images?.gallery?.[0] && (
                  <div className="flex-shrink-0">
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-4 border-green-400 dark:border-green-600 shadow-lg">
                      <img
                        src={api.getImageUrl(
                          mergedProduct.images.gallery[0].gridFsId,
                        )}
                        alt={mergedProduct.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        PRIMARY
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Product Name
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {mergedProduct.name}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        SKU
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mergedProduct.sku}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Price
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ₹{mergedProduct.price?.amount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Total Images
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mergedProduct.images?.gallery?.length || 0} photos
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Status
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {mergedProduct.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Gallery Preview */}
              {mergedProduct.images?.gallery?.length > 1 && (
                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    All Merged Images:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {mergedProduct.images.gallery
                      .slice(0, 8)
                      .map((img, idx) => (
                        <div
                          key={idx}
                          className="relative w-12 h-12 rounded border-2 border-green-300 dark:border-green-700 overflow-hidden"
                        >
                          <img
                            src={api.getImageUrl(img.gridFsId)}
                            alt={`Image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    {mergedProduct.images.gallery.length > 8 && (
                      <div className="w-12 h-12 rounded border-2 border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <span className="text-xs font-bold text-green-700 dark:text-green-300">
                          +{mergedProduct.images.gallery.length - 8}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                📋 What Happened:
              </h5>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>
                  ✅ {selectedProducts.length} products merged successfully
                </li>
                <li>
                  ✅ {mergedProduct.images?.gallery?.length || 0} images
                  preserved
                </li>
                <li>
                  ✅ {selectedProducts.length - 1} duplicate product(s) removed
                </li>
                <li>✅ Primary product updated with all data</li>
              </ul>
            </div>

            {/* Next Steps */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                👉 Next Step:
              </h5>
              <p className="text-sm text-purple-800 dark:text-purple-300">
                Click <strong>"Done"</strong> to return to the product list and
                see your updated merged product!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
            >
              Done ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Configuration view before merge
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-bold text-white">Merge Products</h3>
            <p className="text-sm text-purple-100 mt-0.5">
              Combining {selectedProducts.length} products
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Merge Failed
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Primary Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Product (will be kept)
            </label>
            <select
              value={primaryProductId}
              onChange={(e) => setPrimaryProductId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {selectedProducts.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} (SKU: {product.sku})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Other products will be deleted after merge
            </p>
          </div>

          {/* Image Gallery Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Combined Images ({totalImages} total)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Drag to reorder • First image will be the primary image
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {imageOrder.map((img, index) => (
                <div
                  key={`${img.productId}-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className="relative group cursor-move bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden aspect-square"
                >
                  <img
                    src={api.getImageUrl(img.gridFsId)}
                    alt={img.productName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <GripVertical className="w-6 h-6 text-white" />
                  </div>
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                      PRIMARY
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {img.productName?.substring(0, 20)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Price Resolution
            </label>
            <div className="space-y-2">
              {[
                {
                  value: "keep_primary",
                  label: "Keep Primary Product Price",
                  desc: `₹${primaryProduct?.price?.amount || 0}`,
                },
                {
                  value: "average",
                  label: "Average Price",
                  desc: `₹${Math.round(
                    selectedProducts
                      .map((p) => p.price?.amount || 0)
                      .filter((p) => p > 0)
                      .reduce((a, b) => a + b, 0) /
                      selectedProducts.filter((p) => (p.price?.amount || 0) > 0)
                        .length || 0,
                  )}`,
                },
                {
                  value: "highest",
                  label: "Highest Price",
                  desc: `₹${Math.max(...selectedProducts.map((p) => p.price?.amount || 0))}`,
                },
                {
                  value: "lowest",
                  label: "Lowest Price",
                  desc: `₹${Math.min(...selectedProducts.map((p) => p.price?.amount || 0).filter((p) => p > 0))}`,
                },
                {
                  value: "manual",
                  label: "Manual Price",
                  desc: "Enter custom price",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                >
                  <input
                    type="radio"
                    name="priceStrategy"
                    value={option.value}
                    checked={priceStrategy === option.value}
                    onChange={(e) => setPriceStrategy(e.target.value)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {option.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {priceStrategy === "manual" && (
              <div className="mt-3">
                <input
                  type="number"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                Final Price: ₹{previewPrice}
              </p>
            </div>
          </div>

          {/* Description Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Description Strategy
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                <input
                  type="radio"
                  name="descriptionStrategy"
                  value="keep_primary"
                  checked={descriptionStrategy === "keep_primary"}
                  onChange={(e) => setDescriptionStrategy(e.target.value)}
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Keep Primary Product Description
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {primaryProduct?.description?.full || "No description"}
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                <input
                  type="radio"
                  name="descriptionStrategy"
                  value="keep_longest"
                  checked={descriptionStrategy === "keep_longest"}
                  onChange={(e) => setDescriptionStrategy(e.target.value)}
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Use Longest Description
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose the most detailed description
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition opacity-50">
                <input
                  type="radio"
                  name="descriptionStrategy"
                  value="regenerate"
                  disabled
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Regenerate with AI
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Coming soon
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Merged Attributes Preview */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Merged Attributes Preview
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Categories</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {mergedAttributes.categories.join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Colors</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {mergedAttributes.colors.length} unique colors
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Tags</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {mergedAttributes.tags.length} tags
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Variants</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {mergedAttributes.variantCount} variants
                </p>
              </div>
            </div>
          </div>

          {/* Result Preview */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
              ⚠️ Action Summary
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
              <li>
                • <strong>{primaryProduct?.name}</strong> will be kept with all
                merged data
              </li>
              <li>
                • {selectedProducts.length - 1} other product(s) will be{" "}
                <strong>permanently deleted</strong>
              </li>
              <li>• All images will be preserved in the merged product</li>
              <li>• This action cannot be undone</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Merging..."
              : `Merge ${selectedProducts.length} Products`}
          </button>
        </div>
      </div>
    </div>
  );
}
