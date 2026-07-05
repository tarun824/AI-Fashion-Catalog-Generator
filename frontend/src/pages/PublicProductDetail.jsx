import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, API_BASE_URL } from "../utils/api";
import "../styles/PublicProductDetail.css";

/**
 * Public Product Detail Page
 * Full product details with WhatsApp enquiry CTA
 */
const PublicProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [slug]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/public/products/${slug}`);
      setProduct(response.data.product);
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setLoading(false);
    }
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
          <button className="btn-whatsapp" onClick={handleWhatsAppEnquiry}>
            <span className="icon">💬</span>
            Enquire on WhatsApp
          </button>

          <a href="tel:+919876543210" className="btn-call">
            <span className="icon">☎️</span>
            Call to Order: +91-98765-43210
          </a>
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
    </div>
  );
};

export default PublicProductDetail;
