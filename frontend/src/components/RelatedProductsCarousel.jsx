import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { FiHeart } from "react-icons/fi";
import { Link } from "react-router-dom";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

/**
 * RelatedProductsCarousel Component
 * Horizontal scrolling carousel of similar/related products
 */
export default function RelatedProductsCarousel({ products, title = "You May Also Like", apiBaseUrl }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <Link
            to="/browse"
            className="text-[#8B2635] dark:text-red-400 font-semibold text-sm hover:underline"
          >
            View All →
          </Link>
        </div>

        {/* Carousel */}
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={20}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          breakpoints={{
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
          className="related-products-swiper"
        >
          {products.map((product) => (
            <SwiperSlide key={product._id}>
              <ProductCard product={product} apiBaseUrl={apiBaseUrl} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

function ProductCard({ product, apiBaseUrl }) {
  const primaryImage = product.images?.[0];
  const imageUrl = primaryImage?.gridFsId
    ? `${apiBaseUrl}/images/${primaryImage.gridFsId}`
    : "/placeholder-saree.jpg";

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            // TODO: Add to wishlist functionality
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white dark:hover:bg-gray-800 transition shadow-lg"
        >
          <FiHeart className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Quick Badge */}
        {product.tags?.includes("new") && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
            NEW
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Name */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-[#8B2635] dark:group-hover:text-red-400 transition">
          {product.name}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-2 mb-2">
          {product.fabric && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {product.fabric}
            </span>
          )}
          {product.fabric && product.occasion && (
            <span className="text-gray-300 dark:text-gray-600">•</span>
          )}
          {product.occasion && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {product.occasion}
            </span>
          )}
        </div>

        {/* Colors */}
        {product.colors?.names?.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {product.colors.names.slice(0, 3).map((color, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
              >
                {color}
              </span>
            ))}
            {product.colors.names.length > 3 && (
              <span className="text-xs text-gray-400">
                +{product.colors.names.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Price & Rating */}
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-[#8B2635] dark:text-red-400">
            ₹{product.price?.amount?.toLocaleString()}
          </p>
          {product.rating?.average > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-yellow-500">⭐</span>
              <span>{product.rating.average.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
