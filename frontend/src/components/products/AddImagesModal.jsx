import { useState, useRef } from "react";
import { X, Upload, Trash2, AlertCircle } from "lucide-react";
import { api } from "../../utils/api";

/**
 * AddImagesModal Component
 * Add additional images to an existing product
 *
 * Props:
 * - product: Product object to add images to
 * - onClose: Callback when modal is closed
 * - onSuccess: Callback when images are successfully added (receives updated product)
 */
export default function AddImagesModal({ product, onClose, onSuccess }) {
  const [newImages, setNewImages] = useState([]);
  const [regenerateDescription, setRegenerateDescription] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const currentImageCount =
    (product.imageGallery?.length || 0) +
    (product.images?.original?.gridFsId ? 1 : 0);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length === 0) {
      setError("Please select valid image files");
      return;
    }

    setError("");

    // Create preview URLs for selected files
    const imagePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((images) => {
      setNewImages((prev) => [...prev, ...images]);
    });
  };

  const removeImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (newImages.length === 0) {
      setError("Please select at least one image");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Convert images to base64 buffers for upload
      const imageBuffers = await Promise.all(
        newImages.map(async (img) => {
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onload = () => {
              // Remove data URL prefix to get pure base64
              const base64 = reader.result.split(",")[1];
              resolve({
                buffer: base64,
                originalName: img.name,
                mimeType: img.file.type,
              });
            };
            reader.readAsDataURL(img.file);
          });
        }),
      );

      const response = await api.post(`/admin/products/${product._id}/images`, {
        images: imageBuffers,
        regenerateDescription,
      });

      onSuccess(response.data);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length > 0) {
      // Trigger file select with dropped files
      const event = {
        target: {
          files: files,
        },
      };
      handleFileSelect(event);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-bold text-white">Add Images</h3>
            <p className="text-sm text-blue-100 mt-0.5">{product.name}</p>
          </div>
          <button
            onClick={onClose}
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
                  Upload Failed
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Current Images */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Current Images ({currentImageCount})
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {/* Show main image if exists */}
              {product.images?.original?.gridFsId && (
                <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-500">
                  <img
                    src={api.getImageUrl(product.images.original.gridFsId)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                    MAIN
                  </div>
                </div>
              )}

              {/* Show image gallery */}
              {product.imageGallery?.map((img, index) => (
                <div
                  key={img.gridFsId}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  <img
                    src={api.getImageUrl(img.gridFsId)}
                    alt={img.alt || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* File Upload DropZone */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Add New Images
            </h4>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, JPEG, GIF up to 20MB each
              </p>
            </div>
          </div>

          {/* Preview New Images */}
          {newImages.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                New Images Preview ({newImages.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {newImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-green-500 bg-gray-100 dark:bg-gray-700">
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* File Info */}
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {img.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(img.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Regeneration Option */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="flex items-start gap-3 cursor-pointer opacity-50">
              <input
                type="checkbox"
                checked={regenerateDescription}
                onChange={(e) => setRegenerateDescription(e.target.checked)}
                disabled
                className="mt-1 w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Regenerate description with AI
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Coming soon: Use AI to analyze all images and create a new
                  comprehensive description
                </p>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              ℹ️ Image Upload Guidelines
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• High-quality images improve customer engagement</li>
              <li>• Use consistent lighting and backgrounds</li>
              <li>• Show product from multiple angles</li>
              <li>• Images will be added to the product gallery</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {newImages.length > 0 && (
              <span>
                Adding {newImages.length} new image
                {newImages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || newImages.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Add Images</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
