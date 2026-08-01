import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, API_BASE_URL } from "../utils/api";
import {
  FiHeart,
  FiShare2,
  FiMaximize2,
  FiInfo,
  FiTruck,
  FiShield,
  FiRefreshCw,
  FiChevronRight,
  FiStar,
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

  // Track scroll for sticky bar
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (slug) {
      loadProduct();
      loadRelatedProducts();
    }
  }, [slug]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/public/products/${slug}`);
      const productData = response.product || response;
      setProduct(productData);

      // Track view count (fire and forget)
      api.post(`/public/products/${slug}/view`).catch(() => {});
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedProducts = async () => {
    try {
      // Load similar products (same fabric or occasion)
      const response = await api.get(`/public/products?limit=8`);
      const products = response.products || response.data || [];
      setRelatedProducts(products.filter((p) => p.slug !== slug).slice(0, 6));
    } catch (error) {
      console.error("Error loading related products:", error);
    }
  };

  const handleShareProduct = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} - ₹${product.price?.amount}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("✅ Product link copied to clipboard!");
      }
      // Track share
      api.post(`/public/products/${slug}/share`).catch(() => {});
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleWhatsAppEnquiry = () => {
    const phoneNumber = import.meta.env.VITE_WHATSAPP_PHONE || "919876543210";
    const message = encodeURIComponent(
      `Hi! I'm interested in this saree:\n\n${product.name}\nPrice: ₹${product.price?.amount}\nLink: ${window.location.href}\n\nIs this available?`,
    );
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const toggleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement wishlist functionality
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B2635] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Product not found
          </h2>
          <Link
            to="/browse"
            className="text-[#8B2635] dark:text-red-400 hover:underline"
          >
            Browse all products →
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const imageUrls = images.map((img) =>
    img.gridFsId
      ? `${API_BASE_URL}/images/${img.gridFsId}`
      : "/placeholder-saree.jpg",
  );
  const primaryImage = imageUrls[selectedImage] || imageUrls[0];

  // Determine badges
  const badges = [];
  if (
    product.createdAt &&
    new Date() - new Date(product.createdAt) < 7 * 24 * 60 * 60 * 1000
  ) {
    badges.push({ type: "new" });
  }
  if (product.tags?.includes("bestseller")) {
    badges.push({ type: "bestseller" });
  }
  const lowStock = product.variants?.some((v) => v.stock > 0 && v.stock < 5);
  if (lowStock) {
    badges.push({ type: "limited" });
  }

  return (
    <>
      <div className="product-detail-enhanced">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link
              to="/"
              className="hover:text-[#8B2635] dark:hover:text-red-400"
            >
              Home
            </Link>
            <FiChevronRight className="w-4 h-4" />
            <Link
              to="/browse"
              className="hover:text-[#8B2635] dark:hover:text-red-400"
            >
              Products
            </Link>
            <FiChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white truncate">
              {product.name}
            </span>
          </div>
        </div>

        {/* Status Banners */}
        {product.status === "draft" && (
          <div className="max-w-7xl mx-auto px-4 mb-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <strong>🔒 Preview Mode</strong> - This product is not yet
              published for sale.
            </div>
          </div>
        )}

        {product.status === "archived" && (
          <div className="max-w-7xl mx-auto px-4 mb-4">
            <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-500 p-4 rounded-r-lg">
              <strong>📦 Archived</strong> - This product is no longer available
              for sale.
            </div>
          </div>
        )}

        {/* Main Product Section */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <motion.div
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group cursor-zoom-in"
                onClick={() => setShowLightbox(true)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={primaryImage}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isImageZoomed ? "scale-150" : "group-hover:scale-110"
                  }`}
                />

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLightbox(true);
                    }}
                    className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white dark:hover:bg-gray-800 transition shadow-lg opacity-0 group-hover:opacity-100"
                    title="View full screen"
                  >
                    <FiMaximize2 className="w-5 h-5 text-gray-900 dark:text-white" />
                  </button>
                </div>

                {/* Badges */}
                {badges.length > 0 && (
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {badges.map((badge, idx) => (
                      <ProductBadge key={idx} type={badge.type} />
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Thumbnail Grid */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${
                        idx === selectedImage
                          ? "border-[#8B2635] dark:border-red-400 scale-105 shadow-lg"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      <img
                        src={
                          img.thumbnailGridFsId
                            ? `${API_BASE_URL}/images/${img.thumbnailGridFsId}`
                            : `${API_BASE_URL}/images/${img.gridFsId}`
                        }
                        alt={`View ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Title & Social Proof */}
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                  {product.name}
                </h1>

                {/* Social Proof */}
                <SocialProof
                  viewCount={Math.floor(Math.random() * 20) + 5}
                  recentSales={Math.floor(Math.random() * 15)}
                  lowStock={lowStock}
                />

                {/* Rating */}
                {product.rating?.average > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar
                          key={star}
                          className={`w-5 h-5 ${
                            star <= product.rating.average
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-gray-300 dark:text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {product.rating.average.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({product.rating.count} reviews)
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-[#8B2635] dark:text-red-400">
                  ₹{product.price?.amount?.toLocaleString()}
                </span>
                <span className="text-lg text-gray-500 dark:text-gray-400">
                  {product.price?.currency}
                </span>
              </div>

              {/* Stock Status */}
              <div>
                {product.variants?.some((v) => v.stock > 0) ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-semibold">
                    ✅ In Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-semibold">
                    ❌ Out of Stock
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSave}
                  className={`p-3 rounded-full transition-all ${
                    isSaved
                      ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                  title="Save to wishlist"
                >
                  <FiHeart
                    className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`}
                  />
                </button>
                <button
                  onClick={handleShareProduct}
                  className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  title="Share product"
                >
                  <FiShare2 className="w-5 h-5" />
                </button>
              </div>

              {/* Product Details Grid */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                  Product Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {product.fabric && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Fabric
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {product.fabric}
                      </p>
                    </div>
                  )}
                  {product.occasion && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Occasion
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {product.occasion}
                      </p>
                    </div>
                  )}
                  {product.workType && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Work Type
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {product.workType}
                      </p>
                    </div>
                  )}
                  {product.weight && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Weight
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">
                        {product.weight}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Blouse Piece
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {product.blouseIncluded ? "Included" : "Not Included"}
                    </p>
                  </div>
                </div>

                {/* Size Guide Link */}
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="mt-4 flex items-center gap-2 text-[#8B2635] dark:text-red-400 font-semibold hover:underline"
                >
                  <FiInfo className="w-4 h-4" />
                  <span>Size Guide & How to Drape</span>
                </button>
              </div>

              {/* Colors */}
              {product.colors?.names?.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                    Colors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.names.map((color, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              {product.status === "published" && (
                <div className="space-y-3 pt-4">
                  {/* Virtual Try-On */}
                  <button
                    onClick={() => setShowTryOnModal(true)}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#8B2635] to-[#a12e40] text-white font-bold rounded-xl hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="text-2xl">🎭</span>
                    <div className="text-left">
                      <div className="text-base">Virtual Try-On</div>
                      <div className="text-xs opacity-90">
                        See how you look!
                      </div>
                    </div>
                    <span className="ml-auto px-2 py-1 bg-white/20 rounded text-xs">
                      AI
                    </span>
                  </button>

                  {/* WhatsApp Enquiry */}
                  <button
                    onClick={handleWhatsAppEnquiry}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold rounded-xl transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span>Enquire on WhatsApp</span>
                  </button>

                  {/* Call to Order */}
                  <a
                    href="tel:+919876543210"
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-[#8B2635] dark:border-red-400 text-[#8B2635] dark:text-red-400 font-semibold rounded-xl hover:bg-[#8B2635] hover:text-white dark:hover:bg-red-400 dark:hover:text-white transition-all"
                  >
                    <span>📞</span>
                    <span>Call: +91-98765-43210</span>
                  </a>
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <FiTruck className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    Free Shipping
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    On orders above ₹999
                  </p>
                </div>
                <div className="text-center">
                  <FiShield className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    Secure Payment
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    100% Protected
                  </p>
                </div>
                <div className="text-center">
                  <FiRefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    Easy Returns
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    7 Day Return
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Additional Info */}
          <div className="mt-16 space-y-8">
            {/* Full Description */}
            {product.description?.full && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Product Description
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {product.description.full}
                </p>
              </motion.div>
            )}

            {/* Care Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <CareInstructions fabric={product.fabric} />
            </motion.div>

            {/* Specifications */}
            {product.description?.parsed &&
              Object.keys(product.description.parsed).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Specifications
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.description.parsed).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl"
                        >
                          <span className="font-semibold text-gray-900 dark:text-white capitalize">
                            {key}:
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {value}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </motion.div>
              )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <RelatedProductsCarousel
              products={relatedProducts}
              title="You May Also Like"
              apiBaseUrl={API_BASE_URL}
            />
          </motion.div>
        )}
      </div>

      {/* Sticky Purchase Bar (Mobile) */}
      <StickyPurchaseBar
        visible={showStickyBar}
        product={product}
        onWhatsAppClick={handleWhatsAppEnquiry}
      />

      {/* Modals */}
      <AnimatePresence>
        {showLightbox && (
          <ImageLightbox
            images={imageUrls}
            initialIndex={selectedImage}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </AnimatePresence>

      <SizeGuideModal
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />

      {showTryOnModal && (
        <VirtualTryOnModal
          product={product}
          onClose={() => setShowTryOnModal(false)}
        />
      )}
    </>
  );
};

export default PublicProductDetail;
