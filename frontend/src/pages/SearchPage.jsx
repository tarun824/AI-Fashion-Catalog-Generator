import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

export default function SearchPage() {
  const [searchText, setSearchText] = useState("");
  const [naturalQuery, setNaturalQuery] = useState("");
  const [searchMode, setSearchMode] = useState("natural"); // 'natural' or 'advanced'
  const [selectedColors, setSelectedColors] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [colorMode, setColorMode] = useState("any");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [parsedFilters, setParsedFilters] = useState(null);
  const limit = 20;
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    loadAvailableColors();
    loadAvailableCategories();
    loadSearchHistory();
  }, []);

  // Auto-search with debounce
  useEffect(() => {
    if (searchMode === "natural" && naturalQuery.trim()) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        handleNaturalSearch(false);
      }, 800);
    }
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [naturalQuery]);

  const loadSearchHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      setSearchHistory(history.slice(0, 10)); // Keep last 10
    } catch (err) {
      console.error("Failed to load search history:", err);
    }
  };

  const saveToSearchHistory = (query, mode) => {
    try {
      const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      const newEntry = { query, mode, timestamp: Date.now() };

      // Remove duplicates
      const filtered = history.filter((h) => h.query !== query);
      const updated = [newEntry, ...filtered].slice(0, 10);

      localStorage.setItem("searchHistory", JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (err) {
      console.error("Failed to save search history:", err);
    }
  };

  const clearSearchHistory = () => {
    localStorage.removeItem("searchHistory");
    setSearchHistory([]);
  };

  const loadAvailableColors = async () => {
    try {
      const response = await api.get("/search/colors");
      setAvailableColors(response.data || []);
    } catch (err) {
      console.error("Failed to load colors:", err);
    }
  };

  const loadAvailableCategories = async () => {
    try {
      const response = await api.get("/search/categories");
      setAvailableCategories(response.data || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const handleNaturalSearch = async (manual = true) => {
    if (!naturalQuery.trim()) return;

    if (manual) {
      saveToSearchHistory(naturalQuery, "natural");
    }

    setLoading(true);
    setPage(1);

    try {
      const response = await api.post("/search/natural", {
        query: naturalQuery.trim(),
        page: 1,
        limit,
      });

      setResults(response.data.data || []);
      setPagination(response.data.pagination || {});
      setParsedFilters(response.data.parsedFilters || null);
    } catch (err) {
      console.error("Natural search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = async (e) => {
    if (e) e.preventDefault();

    if (searchText.trim()) {
      saveToSearchHistory(searchText, "advanced");
    }

    setLoading(true);
    setPage(1);
    setParsedFilters(null);

    try {
      const searchParams = {
        page: 1,
        limit,
        sortBy,
        order: sortOrder,
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

      if (minPrice) {
        searchParams.minPrice = parseFloat(minPrice);
      }

      if (maxPrice) {
        searchParams.maxPrice = parseFloat(maxPrice);
      }

      const response = await api.post("/search/products", searchParams);
      setResults(response.data.data || []);
      setPagination(response.data.pagination || {});
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async (pageNum) => {
    setLoading(true);

    try {
      if (searchMode === "natural" && naturalQuery.trim()) {
        const response = await api.post("/search/natural", {
          query: naturalQuery.trim(),
          page: pageNum,
          limit,
        });
        setResults(response.data.data || []);
        setPagination(response.data.pagination || {});
      } else {
        const searchParams = {
          page: pageNum,
          limit,
          sortBy,
          order: sortOrder,
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

        if (minPrice) {
          searchParams.minPrice = parseFloat(minPrice);
        }

        if (maxPrice) {
          searchParams.maxPrice = parseFloat(maxPrice);
        }

        const response = await api.post("/search/products", searchParams);
        setResults(response.data.data || []);
        setPagination(response.data.pagination || {});
      }
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
    setNaturalQuery("");
    setSelectedColors([]);
    setColorMode("any");
    setCategoryFilter("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setResults([]);
    setPagination({});
    setParsedFilters(null);
  };

  const applyQuickFilter = (query) => {
    setSearchMode("natural");
    setNaturalQuery(query);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchText.trim()) count++;
    if (selectedColors.length > 0) count++;
    if (categoryFilter) count++;
    if (minPrice) count++;
    if (maxPrice) count++;
    return count;
  }, [searchText, selectedColors, categoryFilter, minPrice, maxPrice]);

  const quickFilters = [
    { label: "🔥 Bridal Sarees", query: "bridal saree" },
    { label: "✨ Under ₹5000", query: "under 5000" },
    { label: "💙 Blue Collection", query: "blue" },
    { label: "🌟 Festive Wear", query: "festive" },
    { label: "🎨 Organza Silk", query: "organza silk" },
    { label: "👔 Casual Shirts", query: "casual shirt" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            🔍 Search Products
          </h2>
          <p className="text-gray-600 mt-1">
            Advanced search with natural language & filters
          </p>
        </div>
        {searchHistory.length > 0 && (
          <button
            onClick={clearSearchHistory}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Search Mode Toggle */}
      <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSearchMode("natural")}
          className={`px-6 py-2 rounded-md font-medium transition ${
            searchMode === "natural"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🧠 Natural Language
        </button>
        <button
          onClick={() => setSearchMode("advanced")}
          className={`px-6 py-2 rounded-md font-medium transition ${
            searchMode === "advanced"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ⚙️ Advanced Filters
        </button>
      </div>

      {/* Natural Language Search */}
      {searchMode === "natural" && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-sm border-2 border-indigo-200 p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              💬 Describe what you're looking for
            </label>
            <div className="relative">
              <input
                type="text"
                value={naturalQuery}
                onChange={(e) => {
                  setNaturalQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder='Try: "blue organza saree under 5000 for wedding" or "red cotton shirt"'
                className="w-full px-4 py-3 pr-12 text-lg border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => handleNaturalSearch(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
              >
                Search
              </button>
            </div>

            {/* Search Suggestions */}
            {showSuggestions && searchHistory.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg absolute z-10 w-full max-w-2xl">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">
                    RECENT SEARCHES
                  </span>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {searchHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.mode === "natural") {
                          setSearchMode("natural");
                          setNaturalQuery(item.query);
                        } else {
                          setSearchMode("advanced");
                          setSearchText(item.query);
                        }
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span className="text-gray-400">🕐</span>
                      <span className="text-sm text-gray-700">
                        {item.query}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {item.mode === "natural" ? "Natural" : "Advanced"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              QUICK FILTERS:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter, idx) => (
                <button
                  key={idx}
                  onClick={() => applyQuickFilter(filter.query)}
                  className="px-4 py-2 bg-white border-2 border-indigo-200 text-sm font-medium text-indigo-700 rounded-full hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition shadow-sm"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parsed Filters Display */}
          {parsedFilters && Object.keys(parsedFilters).length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                🎯 DETECTED FILTERS:
              </p>
              <div className="flex flex-wrap gap-2">
                {parsedFilters.text && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    Text: {parsedFilters.text}
                  </span>
                )}
                {parsedFilters.colors && parsedFilters.colors.length > 0 && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                    Colors: {parsedFilters.colors.join(", ")}
                  </span>
                )}
                {parsedFilters.category && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    Category: {parsedFilters.category}
                  </span>
                )}
                {parsedFilters.minPrice && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                    Min: ₹{parsedFilters.minPrice}
                  </span>
                )}
                {parsedFilters.maxPrice && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                    Max: ₹{parsedFilters.maxPrice}
                  </span>
                )}
                {parsedFilters.fabric && (
                  <span className="px-3 py-1 bg-pink-100 text-pink-800 text-sm rounded-full">
                    Fabric: {parsedFilters.fabric}
                  </span>
                )}
                {parsedFilters.occasion && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                    Occasion: {parsedFilters.occasion}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Search Form */}
      {searchMode === "advanced" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleAdvancedSearch} className="space-y-6">
            {/* Text Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔎 Search Text
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name, description, tags..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Category & Price Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              {availableCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📂 Category
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

              {/* Min Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Min Price
                </label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="₹0"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💵 Max Price
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="₹10000"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Color Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎨 Colors
              </label>
              <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {availableColors.slice(0, 30).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => toggleColor(color)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all shadow-sm ${
                      selectedColors.includes(color)
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>

              {selectedColors.length > 0 && (
                <div className="flex items-center space-x-4 bg-indigo-50 p-3 rounded-lg">
                  <label className="text-sm font-medium text-gray-700">
                    Match Mode:
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setColorMode("any")}
                      className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${
                        colorMode === "any"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      Any
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode("all")}
                      className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${
                        colorMode === "all"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      All
                    </button>
                  </div>
                  <span className="text-xs text-gray-500 ml-auto">
                    {selectedColors.length} selected
                  </span>
                </div>
              )}
            </div>

            {/* Sort Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="createdAt">Date Added</option>
                  <option value="price.amount">Price</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⬆️⬇️ Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800">
                  ⚡ {activeFilterCount} active filter
                  {activeFilterCount > 1 ? "s" : ""} applied
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-md hover:shadow-lg"
              >
                🔍 Search
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                🗑️ Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-gray-600 font-medium animate-pulse">
            Searching products...
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  ✅ {pagination.total} Result
                  {pagination.total !== 1 ? "s" : ""} Found
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing page {page} of {pagination.totalPages}
                </p>
              </div>
              {searchMode === "natural" && (
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-700">
                    AI-POWERED SEARCH
                  </p>
                  <p className="text-xs text-gray-500">
                    Natural language processed
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Grid */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {results.map((product, idx) => (
                <Link
                  key={product._id}
                  to={`/admin/products/${product._id}`}
                  className="flex items-start space-x-4 p-5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {product.images?.thumbnail?.gridFsId && (
                    <div className="relative flex-shrink-0">
                      <img
                        src={api.getImageUrl(product.images.thumbnail.gridFsId)}
                        alt={product.name}
                        className="w-28 h-28 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow border-2 border-gray-200 group-hover:border-indigo-300"
                      />
                      <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {idx + 1}
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-700 transition">
                      {product.name}
                    </h4>
                    <div className="flex items-center space-x-3 mb-2">
                      {product.category && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          📂 {product.category}
                        </span>
                      )}
                      {product.price?.amount != null && (
                        <span className="px-3 py-0.5 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                          ₹{product.price.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                      {product.description?.full}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.colors?.names?.slice(0, 6).map((color, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 text-xs font-medium rounded-md shadow-sm"
                        >
                          🎨 {color}
                        </span>
                      ))}
                      {product.colors?.names?.length > 6 && (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                          +{product.colors.names.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                        product.status === "published"
                          ? "bg-green-100 text-green-800"
                          : product.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {product.status}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      #{product._id.slice(-6)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Page {page} of {pagination.totalPages}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing {results.length} of {pagination.total} results
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadPage(page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-5 py-2.5 bg-white border-2 border-indigo-300 rounded-lg text-sm font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-indigo-700 transition shadow-sm"
                  >
                    ← Previous
                  </button>
                  <div className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md">
                    {page}
                  </div>
                  <button
                    onClick={() => loadPage(page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-5 py-2.5 bg-white border-2 border-indigo-300 rounded-lg text-sm font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-indigo-700 transition shadow-sm"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : searchText ||
        selectedColors.length > 0 ||
        categoryFilter ||
        naturalQuery ? (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg shadow-sm border-2 border-red-200 p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-700 text-xl font-bold mb-2">
            No Products Found
          </p>
          <p className="text-gray-500 mb-6">
            Try adjusting your search criteria or use different keywords
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition"
            >
              Clear All Filters
            </button>
            {searchMode === "advanced" && (
              <button
                onClick={() => setSearchMode("natural")}
                className="px-6 py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium transition"
              >
                Try Natural Search
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
