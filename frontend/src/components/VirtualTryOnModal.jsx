import React, { useState } from "react";
import { API_BASE_URL } from "../utils/api";
import "../styles/VirtualTryOnModal.css";

export default function VirtualTryOnModal({ product, onClose }) {
  const [selfie, setSelfie] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSelfieSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setSelfie(file);
    setSelfiePreview(URL.createObjectURL(file));
    setError(null);
    setResult(null);
  };

  const handleTryOn = async () => {
    if (!selfie) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("selfie", selfie);

      // Get product image - use first image from gallery
      const productImageId = product.images?.[0]?.gridFsId;
      if (!productImageId) {
        throw new Error("Product image not found");
      }
      
      const productImageResponse = await fetch(
        `${API_BASE_URL}/images/${productImageId}`,
      );
      
      if (!productImageResponse.ok) {
        throw new Error("Failed to load product image");
      }
      
      const productImageBlob = await productImageResponse.blob();
      formData.append("product", productImageBlob, "product.jpg");
      formData.append("productId", product._id);

      const response = await fetch(`${API_BASE_URL}/ai/virtual-tryon`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Try-on failed");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (result?.imageUrl) {
      const link = document.createElement("a");
      link.href = result.imageUrl;
      link.download = `tryon-${product.slug}.jpg`;
      link.click();
    }
  };

  const shareOnWhatsApp = () => {
    const message = encodeURIComponent(
      `Look how amazing this saree looks! 🌟\n\n${product.name}\n₹${product.price?.amount}\n\n${window.location.href}`,
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <div className="tryon-modal-overlay" onClick={onClose}>
      <div className="tryon-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-content">
          <div className="modal-header">
            <h2>🎭 Try On This Saree</h2>
            <p>Upload your photo to see how you'll look in {product.name}</p>
          </div>

          {!result ? (
            <div className="tryon-upload-section">
              <div className="product-preview">
                <h3>Selected Product:</h3>
                <div className="product-card-mini">
                  {product.images?.[0]?.thumbnailGridFsId && (
                    <img
                      src={`${API_BASE_URL}/images/${product.images[0].thumbnailGridFsId}`}
                      alt={product.name}
                    />
                  )}
                  <div>
                    <p className="product-name-mini">{product.name}</p>
                    <p className="product-price-mini">
                      ₹{product.price?.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {!selfiePreview ? (
                <label className="selfie-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSelfieSelect}
                    className="file-input-hidden"
                  />
                  <div className="upload-content-modal">
                    <div className="camera-icon-large">📸</div>
                    <h3>Upload Your Photo</h3>
                    <p>Take a selfie or choose from gallery</p>
                    <span className="upload-hint-modal">
                      For best results: Clear, front-facing photo with good
                      lighting
                    </span>
                  </div>
                </label>
              ) : (
                <div className="selfie-preview-section">
                  <h3>Your Photo:</h3>
                  <img
                    src={selfiePreview}
                    alt="Your selfie"
                    className="selfie-preview-img"
                  />
                  <div className="preview-actions-modal">
                    <button
                      onClick={handleTryOn}
                      disabled={loading}
                      className="btn-try-primary"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-small"></span>
                          Generating... (10-30 seconds)
                        </>
                      ) : (
                        "✨ Generate Try-On"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelfie(null);
                        setSelfiePreview(null);
                      }}
                      className="btn-try-secondary"
                    >
                      Choose Different Photo
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message-modal">
                  <span>⚠️</span>
                  {error}
                </div>
              )}

              <div className="privacy-notice-modal">
                🔒 <strong>Privacy:</strong> Your photos are processed securely
                and never stored
              </div>
            </div>
          ) : (
            <div className="tryon-result-section">
              <h3>✨ Here's How You Look!</h3>
              <div className="result-image-container">
                <img
                  src={result.imageUrl}
                  alt="Virtual Try-On Result"
                  className="result-image"
                />
              </div>

              <div className="result-actions">
                <button onClick={downloadResult} className="btn-download">
                  📥 Download Image
                </button>
                <button onClick={shareOnWhatsApp} className="btn-share-wa">
                  📱 Share on WhatsApp
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setSelfie(null);
                    setSelfiePreview(null);
                  }}
                  className="btn-try-again"
                >
                  🔄 Try Again
                </button>
              </div>

              <div className="disclaimer-modal">
                💡 This is an AI-generated preview. Actual product colors and
                draping may vary.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
