import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

export default function SearchPage() {
  const [searchText, setSearchText] = useState("");
  const [selectedColors, setSelectedColors] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [colorMode, setColorMode] = useState("any");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadAvailableColors();
    loadAvailableCategories();
  }, []);

  const loadAvailableColors = async () => {
    try {
      const response = await api.get("/api/search/colors");
      setAvailableColors(response.data || []);
    } catch (err) {
      console.error("Failed to load colors:", err);
    }
  };

  const loadAvailableCategories = async () => {
    try {
      const response = await api.get("/api/search/categories");
      setAvailableCategories(response.data || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setPage(1);

    try {
      const searchParams = {
        page: 1,
        limit,
      };

      if (searchText.trim()) {
        searchParams.text = searchText.trim();
      }

      if (selectedColors.length > 0) {
        searchParams.colors = selectedColors;
        searchParams.colorMode = colorMode;
      }

      if (categoryFilter) {
        searchParams.category = categoryFilter;
      }

      const response = await api.post("/api/search/products", searchParams);
      setResults(response.data || []);
      setPagination(response.pagination || {});
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async (pageNum) => {
    setLoading(true);

    try {
      const searchParams = {
        page: pageNum,
        limit,
      };

      if (searchText.trim()) {
        searchParams.text = searchText.trim();
      }

      if (selectedColors.length > 0) {
        searchParams.colors = selectedColors;
        searchParams.colorMode = colorMode;
      }

      if (categoryFilter) {
        searchParams.category = categoryFilter;
      }

      const response = await api.post("/api/search/products", searchParams);
      setResults(response.data || []);
      setPagination(response.pagination || {});
      setPage(pageNum);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleColor = (color) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
  };

  const clearFilters = () => {
    setSearchText("");
    setSelectedColors([]);
    setColorMode("any");
    setCategoryFilter("");
    setResults([]);
    setPagination({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Search Products</h2>
        <p className="text-gray-600 mt-1">
          Find products by text, colors, and more
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Text Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Text
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, description, tags..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">All Categories</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Color Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colors
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {availableColors.slice(0, 20).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition ${
                    selectedColors.includes(color)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>

            {selectedColors.length > 0 && (
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">
                  Color Match:
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setColorMode("any")}
                    className={`px-3 py-1 text-sm rounded ${
                      colorMode === "any"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Any
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode("all")}
                    className={`px-3 py-1 text-sm rounded ${
                      colorMode === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {pagination.total} result{pagination.total !== 1 ? "s" : ""}{" "}
                found
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {results.map((product) => (
                <Link
                  key={product._id}
                  to={`/dashboard/products/${product._id}`}
                  className="flex items-start space-x-4 p-4 hover:bg-gray-50 transition"
                >
                  {product.images?.thumbnail?.gridFsId && (
                    <img
                      src={api.getImageUrl(product.images.thumbnail.gridFsId)}
                      alt={product.name}
                      className="w-24 h-24 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {product.name}
                    </h4>
                    <p className="text-xs text-gray-500 mb-1">
                      {product.category}
                      {product.category &&
                        product.price?.amount != null &&
                        " • "}
                      {product.price?.amount != null &&
                        `₹${product.price.amount}`}
                    </p>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {product.description?.full}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.colors?.names?.slice(0, 5).map((color, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded"
                        >
                          {color}
                        </span>
                      ))}
                      {product.colors?.names?.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                          +{product.colors.names.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === "published"
                          ? "bg-green-100 text-green-800"
                          : product.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-700">
                Showing page {page} of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadPage(page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadPage(page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : searchText || selectedColors.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No products found</p>
          <p className="text-gray-400 mt-2">
            Try adjusting your search criteria
          </p>
        </div>
      ) : null}
    </div>
  );
}
