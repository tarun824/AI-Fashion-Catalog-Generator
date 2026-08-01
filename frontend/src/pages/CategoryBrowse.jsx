import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, API_BASE_URL } from "../utils/api";
import "../styles/CategoryBrowse.css";

/**
 * Category Browse Page
 * Browse products within a category with filters
 */
const CategoryBrowse = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    fabric: [],
    occasion: [],
    colors: [],
    priceMin: "",
    priceMax: "",
    sort: "newest",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    // Only load category if we have a slug (specific category page)
    if (slug) {
      loadCategory();
    } else {
      // For /browse route (all products), set a default category
      setCategory({
        name: "All Products",
        description: "Browse our entire collection",
      });
    }
    loadProducts();
  }, [slug, filters, pagination.page]);

  const loadCategory = async () => {
    try {
      const response = await api.get(`/public/categories/${slug}`);
      setCategory(response.category);
    } catch (error) {
      console.error("Error loading category:", error);
      // Set default if category load fails
      setCategory({
        name: "All Products",
        description: "Browse our entire collection",
      });
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: filters.sort,
        ...filters,
      };

      // Only add category filter if we have a slug
      if (slug) {
        params.category = slug;
      }

      const response = await api.get("/public/products", { params });

      setProducts(response.products || []);
      setPagination(
        response.pagination || {
          page: 1,
          limit: 24,
          total: 0,
          pages: 0,
        },
      );
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="category-browse">
      {/* Category Header */}
      {category && (
        <div className="category-header">
          <h1>{category.name}</h1>
          <p>{category.description}</p>
          <div className="product-count">
            {pagination.total} {pagination.total === 1 ? "Product" : "Products"}
          </div>
        </div>
      )}

      <div className="browse-container">
        {/* Filters Sidebar */}
        <aside className="filters-sidebar">
          <h3>Filters</h3>

          {/* Sort */}
          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {/* TODO: Add more filters (fabric, occasion, color, price) */}
        </aside>

        {/* Product Grid */}
        <div className="products-main">
          {loading ? (
            <div className="loading">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="no-products">
              <p>No products found in this category.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product }) => {
  const imageUrl = product.thumbnail
    ? `${API_BASE_URL}/images/${product.thumbnail}`
    : "/placeholder-saree.jpg";

  return (
    <Link to={`/products/${product.slug}`} className="product-card">
      <div className="product-image">
        <img src={imageUrl} alt={product.name} />
        {!product.inStock && (
          <div className="badge out-of-stock">Out of Stock</div>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-meta">
          {product.fabric} • {product.occasion}
        </p>

        {product.colors?.length > 0 && (
          <div className="product-colors">
            {product.colors.slice(0, 5).map((color, idx) => (
              <span
                key={idx}
                className="color-dot"
                title={color}
                style={{ backgroundColor: color.toLowerCase() }}
              />
            ))}
          </div>
        )}

        <div className="product-price">
          <span className="price">₹{product.price?.toLocaleString()}</span>
        </div>

        {product.rating > 0 && (
          <div className="product-rating">
            <span className="stars">⭐ {product.rating.toFixed(1)}</span>
            <span className="count">({product.ratingCount})</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default CategoryBrowse;
