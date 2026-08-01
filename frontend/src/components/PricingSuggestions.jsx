import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import { api } from "../utils/api";
import BulkPriceUpdate from "./BulkPriceUpdate";

export default function PricingSuggestions({ onRefresh }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [filter, setFilter] = useState("all"); // all, increase, decrease, maintain
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    loadPricingSuggestions();
  }, []);

  const loadPricingSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        "/admin/inventory/pricing-suggestions",
        {},
      );
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error("Error loading pricing suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const applySingleSuggestion = async (productId, suggestedPrice) => {
    setApplyingId(productId);
    try {
      await api.post(`/admin/inventory/apply-suggestion/${productId}`, {
        suggestedPrice,
      });

      // Refresh suggestions
      await loadPricingSuggestions();
      onRefresh?.();

      alert("Price updated successfully!");
    } catch (error) {
      console.error("Error applying suggestion:", error);
      alert("Failed to update price. Please try again.");
    } finally {
      setApplyingId(null);
    }
  };

  const toggleSelection = (productId) => {
    setSelectedSuggestions((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const selectAll = () => {
    const filtered = getFilteredSuggestions();
    setSelectedSuggestions(filtered.map((s) => s.productId));
  };

  const deselectAll = () => {
    setSelectedSuggestions([]);
  };

  const handleBulkUpdate = () => {
    if (selectedSuggestions.length === 0) {
      alert("Please select products to update");
      return;
    }
    setShowBulkModal(true);
  };

  const getFilteredSuggestions = () => {
    if (filter === "all") return suggestions;
    if (filter === "increase")
      return suggestions.filter((s) => s.priceChange > 0);
    if (filter === "decrease")
      return suggestions.filter((s) => s.priceChange < 0);
    if (filter === "maintain")
      return suggestions.filter((s) => Math.abs(s.priceChange) < 10);
    return suggestions;
  };

  const filteredSuggestions = getFilteredSuggestions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Analyzing pricing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Pricing Recommendations
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {filteredSuggestions.length} product
            {filteredSuggestions.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPricingSuggestions}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            Refresh
          </button>
          {selectedSuggestions.length > 0 && (
            <button
              onClick={handleBulkUpdate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium text-sm"
            >
              Update {selectedSuggestions.length} Price
              {selectedSuggestions.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
          count={suggestions.length}
        >
          All
        </FilterButton>
        <FilterButton
          active={filter === "increase"}
          onClick={() => setFilter("increase")}
          count={suggestions.filter((s) => s.priceChange > 0).length}
          color="green"
        >
          Price Increase
        </FilterButton>
        <FilterButton
          active={filter === "decrease"}
          onClick={() => setFilter("decrease")}
          count={suggestions.filter((s) => s.priceChange < 0).length}
          color="red"
        >
          Price Decrease
        </FilterButton>
        <FilterButton
          active={filter === "maintain"}
          onClick={() => setFilter("maintain")}
          count={suggestions.filter((s) => Math.abs(s.priceChange) < 10).length}
          color="gray"
        >
          No Change Needed
        </FilterButton>

        {filteredSuggestions.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Select All
            </button>
            {selectedSuggestions.length > 0 && (
              <button
                onClick={deselectAll}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                Deselect All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Suggestions List */}
      {filteredSuggestions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            All prices are optimized
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            No pricing changes recommended
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.productId}
              suggestion={suggestion}
              selected={selectedSuggestions.includes(suggestion.productId)}
              onToggleSelect={() => toggleSelection(suggestion.productId)}
              onApply={() =>
                applySingleSuggestion(
                  suggestion.productId,
                  suggestion.suggestedPrice,
                )
              }
              applying={applyingId === suggestion.productId}
            />
          ))}
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <BulkPriceUpdate
          suggestions={suggestions.filter((s) =>
            selectedSuggestions.includes(s.productId),
          )}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            setSelectedSuggestions([]);
            loadPricingSuggestions();
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}

// ==================== Sub Components ====================

function FilterButton({ active, onClick, count, color = "blue", children }) {
  const colorClasses = {
    blue: active
      ? "bg-blue-600 text-white"
      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
    green: active
      ? "bg-green-600 text-white"
      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
    red: active
      ? "bg-red-600 text-white"
      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
    gray: active
      ? "bg-gray-600 text-white"
      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium border transition-colors
        ${colorClasses[color]}
        ${active ? "border-transparent" : "border-gray-300 dark:border-gray-600"}
      `}
    >
      {children}
      {count > 0 && (
        <span
          className={`ml-2 ${active ? "opacity-90" : "text-gray-500 dark:text-gray-400"}`}
        >
          ({count})
        </span>
      )}
    </button>
  );
}

function SuggestionCard({
  suggestion,
  selected,
  onToggleSelect,
  onApply,
  applying,
}) {
  const isIncrease = suggestion.priceChange > 0;
  const isDecrease = suggestion.priceChange < 0;
  const isNoChange = Math.abs(suggestion.priceChange) < 10;

  const confidenceColor = {
    high: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30",
    medium:
      "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30",
    low: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800",
  };

  return (
    <div
      className={`
      bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all
      ${selected ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800" : "border-gray-200 dark:border-gray-700 hover:shadow-md"}
    `}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />

        {/* Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {suggestion.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {suggestion.sku}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceColor[suggestion.confidence?.level || "low"]}`}
              >
                {suggestion.confidence?.score || 0}% confident
              </span>
            </div>
          </div>

          {/* Price Change */}
          <div className="flex items-center gap-6 mb-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Current Price
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{suggestion.currentPrice}
              </p>
            </div>
            <div className="flex-shrink-0">
              {isIncrease && <TrendingUp className="w-6 h-6 text-green-600" />}
              {isDecrease && <TrendingDown className="w-6 h-6 text-red-600" />}
              {isNoChange && <DollarSign className="w-6 h-6 text-gray-400" />}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Suggested Price
              </p>
              <p
                className={`text-lg font-semibold ${
                  isIncrease
                    ? "text-green-600 dark:text-green-400"
                    : isDecrease
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-900 dark:text-white"
                }`}
              >
                ₹{suggestion.suggestedPrice}
                <span className="text-sm ml-2">
                  ({suggestion.priceChangePercent > 0 ? "+" : ""}
                  {suggestion.priceChangePercent}%)
                </span>
              </p>
            </div>
          </div>

          {/* Insights */}
          {suggestion.insights && suggestion.insights.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Insights:
              </p>
              <div className="space-y-1">
                {suggestion.insights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span
                      className={`
                      inline-block w-1 h-1 rounded-full mt-2
                      ${insight.impact > 0 ? "bg-green-500" : insight.impact < 0 ? "bg-red-500" : "bg-gray-400"}
                    `}
                    />
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium capitalize">
                        {insight.factor}:
                      </span>{" "}
                      {insight.detail}
                      <span
                        className={`ml-1 ${insight.impact > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        ({insight.impact > 0 ? "+" : ""}
                        {insight.impact}%)
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROI */}
          {suggestion.estimatedROI && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-200">
                    Estimated Impact:
                  </p>
                  <p className="text-blue-800 dark:text-blue-300 mt-1">
                    Revenue:{" "}
                    {suggestion.estimatedROI.estimatedRevenueChange > 0
                      ? "+"
                      : ""}
                    ₹{suggestion.estimatedROI.estimatedRevenueChange}/month
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Action */}
          {suggestion.recommendedAction && (
            <div
              className={`
              px-3 py-2 rounded text-sm font-medium
              ${
                suggestion.recommendedAction.priority === "high"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                  : suggestion.recommendedAction.priority === "medium"
                    ? "bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
              }
            `}
            >
              → {suggestion.recommendedAction.message}
            </div>
          )}

          {/* Discount Strategy */}
          {suggestion.discountStrategy?.needsDiscount && (
            <div className="mt-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-3">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-1">
                💡 Discount Opportunity
              </p>
              <p className="text-sm text-purple-800 dark:text-purple-300">
                {suggestion.discountStrategy.strategy}:{" "}
                {suggestion.discountStrategy.discountPercent}% off (₹
                {suggestion.discountStrategy.currentPrice} → ₹
                {suggestion.discountStrategy.discountedPrice})
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                Expected sales boost:{" "}
                {suggestion.discountStrategy.expectedSalesBoost?.description}
              </p>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <button
          onClick={onApply}
          disabled={applying}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap
            ${
              applying
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            }
          `}
        >
          {applying ? (
            <span className="flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              Applying...
            </span>
          ) : (
            "Apply Now"
          )}
        </button>
      </div>
    </div>
  );
}
