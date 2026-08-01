import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, API_BASE_URL } from "../utils/api";
import { 
  FiHeart, FiShare2, FiMaximize2, FiInfo, FiTruck, 
  FiShield, FiRefreshCw, FiChevronRight, FiStar 
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Import new components
import ImageLightbox from "../components/ImageLightbox";
import ProductBadge from "../components/ProductBadge";
import StickyPurchaseBar from "../components/StickyPurchaseBar";
import SizeGuideModal from "../components/SizeGuideModal";
import CareInstructions from "../components/CareInstructions";
import SocialProof from "../components/SocialProof";
import RelatedProductsCarousel from "../components/RelatedProductsCarousel";
import VirtualTryOnModal from "../components/VirtualTryOnModal";
import "../styles/PublicProductDetail.css";

/**
 * Enhanced Public Product Detail Page
 * Beautiful, engaging product page with all modern features
 */
const PublicProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [slug]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/public/products/${slug}`);
      // Handle response - api.get() returns parsed JSON directly
      const productData = response.product || response;
      setProduct(productData);
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareProduct = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check out this product: ${product.name}`,
          url: shareUrl,
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert("✅ Product link copied to clipboard!");
      }

      // Track share count
      api.post(`/public/products/${slug}/share`).catch(() => {});
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleWhatsAppShare = () => {
    const shareUrl = window.location.href;
    const message = encodeURIComponent(
      `Check out this beautiful product:\n\n${product.name}\n₹${product.price?.amount}\n\n${shareUrl}`,
    );
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, "_blank");

    // Track share count
    api.post(`/public/products/${slug}/share`).catch(() => {});
  };

  const handleWhatsAppEnquiry = () => {
    const phoneNumber = "919876543210"; // Replace with actual business number
    const message = encodeURIComponent(
      `Hi! I'm interested in this saree:\n\n${product.name}\nPrice: ₹${product.price?.amount}\nLink: ${window.location.href}\n\nIs this available?`,
    );
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return <div className="loading-page">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="error-page">
        <h2>Product not found</h2>
        <Link to="/browse">Browse all products</Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const primaryImage = images[selectedImage] || images[0];

  return (
    <div className="product-detail">
      {/* Status Banners */}
      {product.status === "draft" && (
        <div
          style={{
            backgroundColor: "#fef3c7",
            borderLeft: "4px solid #f59e0b",
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "0.5rem",
          }}
        >
          <strong>🔒 Preview Mode</strong> - This product is not yet published
          for sale.
        </div>
      )}

      {product.status === "archived" && (
        <div
          style={{
            backgroundColor: "#f3f4f6",
            borderLeft: "4px solid #6b7280",
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "0.5rem",
          }}
        >
          <strong>📦 Archived</strong> - This product is no longer available for
          sale.
        </div>
      )}

      <div className="product-container">
        {/* Image Gallery */}
        <div className="product-gallery">
          <div className="main-image">
            <img
              src={
                primaryImage?.gridFsId
                  ? `${API_BASE_URL}/images/${primaryImage.gridFsId}`
                  : "/placeholder-saree.jpg"
              }
              alt={product.name}
            />
          </div>

          {images.length > 1 && (
            <div className="thumbnail-grid">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumbnail ${selectedImage === idx ? "active" : ""}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <img
                    src={
                      img.thumbnailGridFsId
                        ? `${API_BASE_URL}/images/${img.thumbnailGridFsId}`
                        : `${API_BASE_URL}/images/${img.gridFsId}`
                    }
                    alt={`${product.name} view ${idx + 1}`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>

          {/* Rating */}
          {product.rating?.average > 0 && (
            <div className="product-rating">
              <span className="stars">
                ⭐ {product.rating.average.toFixed(1)}
              </span>
              <span className="count">({product.rating.count} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="product-price">
            <span className="price">
              ₹{product.price?.amount?.toLocaleString()}
            </span>
            <span className="currency">{product.price?.currency}</span>
          </div>

          {/* Stock Status */}
          <div className="stock-status">
            {product.variants?.some((v) => v.stock > 0) ? (
              <span className="in-stock">✅ In Stock</span>
            ) : (
              <span className="out-of-stock">❌ Out of Stock</span>
            )}
          </div>

          {/* Key Details */}
          <div className="product-details-grid">
            {product.fabric && (
              <div className="detail-item">
                <span className="label">Fabric:</span>
                <span className="value">{product.fabric}</span>
              </div>
            )}
            {product.occasion && (
              <div className="detail-item">
                <span className="label">Occasion:</span>
                <span className="value">{product.occasion}</span>
              </div>
            )}
            {product.workType && (
              <div className="detail-item">
                <span className="label">Work:</span>
                <span className="value">{product.workType}</span>
              </div>
            )}
            {product.weight && (
              <div className="detail-item">
                <span className="label">Weight:</span>
                <span className="value">{product.weight}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="label">Blouse:</span>
              <span className="value">
                {product.blouseIncluded ? "Included" : "Not Included"}
              </span>
            </div>
          </div>

          {/* Colors */}
          {product.colors?.names?.length > 0 && (
            <div className="color-info">
              <h3>Colors:</h3>
              <div className="color-list">
                {product.colors.names.map((color, idx) => (
                  <span key={idx} className="color-tag">
                    {color}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp CTA */}
          {product.status === "published" && (
            <>
              {/* Virtual Try-On Button - NEW AI Feature */}
              <button
                className="btn-tryon-ai"
                onClick={() => setShowTryOnModal(true)}
              >
                <span className="icon">🎭</span>
                <div>
                  <strong>Try On Virtually</strong>
                  <small>See how you look in this saree!</small>
                </div>
                <span className="ai-badge-mini">AI</span>
              </button>

              <button className="btn-whatsapp" onClick={handleWhatsAppEnquiry}>
                <span className="icon">💬</span>
                Enquire on WhatsApp
              </button>

              <a href="tel:+919876543210" className="btn-call">
                <span className="icon">☎️</span>
                Call to Order: +91-98765-43210
              </a>
            </>
          )}

          {/* Share Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={handleShareProduct}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span>🔗</span>
              Share Product
            </button>

            <button
              onClick={handleWhatsAppShare}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: "#25D366",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span>📱</span>
              Share on WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Full Description */}
      {product.description?.full && (
        <div className="description-section">
          <h2>Product Description</h2>
          <p className="description-text">{product.description.full}</p>
        </div>
      )}

      {/* Parsed Details */}
      {product.description?.parsed && (
        <div className="specifications-section">
          <h2>Specifications</h2>
          <dl className="spec-list">
            {Object.entries(product.description.parsed).map(([key, value]) => (
              <div key={key} className="spec-item">
                <dt>{key.charAt(0).toUpperCase() + key.slice(1)}:</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Virtual Try-On Modal */}
      {showTryOnModal && (
        <VirtualTryOnModal
          product={product}
          onClose={() => setShowTryOnModal(false)}
        />
      )}
    </div>
  );
};

export default PublicProductDetail;
