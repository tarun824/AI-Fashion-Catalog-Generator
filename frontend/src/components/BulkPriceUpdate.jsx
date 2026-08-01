import { useState } from "react";
import { X, Check, Loader, AlertCircle } from "lucide-react";
import { api } from "../utils/api";

export default function BulkPriceUpdate({ suggestions, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const totalRevenue = suggestions.reduce(
    (sum, s) => sum + (s.estimatedROI?.estimatedRevenueChange || 0),
    0,
  );

  const handleApplyAll = async () => {
    setProcessing(true);
    try {
      const updates = suggestions.map((s) => ({
        productId: s.productId,
        newPrice: s.suggestedPrice,
      }));

      const response = await api.post("/admin/inventory/bulk-price-update", {
        updates,
      });

      setResults(response.data.results);

      // If all successful, close after 2 seconds
      if (response.data.results.failed.length === 0) {
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (error) {
      console.error("Error applying bulk updates:", error);
      alert("Failed to apply updates. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Bulk Price Update
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Updating {suggestions.length} product
              {suggestions.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!processing && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Summary */}
          {!results && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Estimated Impact
                    </p>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>
                        • Total products:{" "}
                        <span className="font-semibold">
                          {suggestions.length}
                        </span>
                      </p>
                      <p>
                        • Estimated monthly revenue change:{" "}
                        <span
                          className={`font-semibold ${totalRevenue >= 0 ? "text-green-700" : "text-red-700"}`}
                        >
                          {totalRevenue >= 0 ? "+" : ""}₹
                          {Math.round(totalRevenue)}
                        </span>
                      </p>
                      <p>
                        • Average confidence:{" "}
                        <span className="font-semibold">
                          {Math.round(
                            suggestions.reduce(
                              (sum, s) => sum + (s.confidence?.score || 0),
                              0,
                            ) / suggestions.length,
                          )}
                          %
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product List */}
              <div className="space-y-2 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Products to Update:
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.productId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {suggestion.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {suggestion.sku}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">
                          ₹{suggestion.currentPrice}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span
                          className={`font-semibold ${
                            suggestion.priceChange > 0
                              ? "text-green-600"
                              : suggestion.priceChange < 0
                                ? "text-red-600"
                                : "text-gray-900"
                          }`}
                        >
                          ₹{suggestion.suggestedPrice}
                        </span>
                        <span
                          className={`text-xs ${
                            suggestion.priceChange > 0
                              ? "text-green-600"
                              : suggestion.priceChange < 0
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                        >
                          ({suggestion.priceChangePercent > 0 ? "+" : ""}
                          {suggestion.priceChangePercent}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {/* Success Summary */}
              {results.successful.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        Successfully Updated {results.successful.length} Product
                        {results.successful.length !== 1 ? "s" : ""}
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {results.successful.map((item) => (
                          <div
                            key={item.productId}
                            className="text-sm text-green-800"
                          >
                            <span className="font-medium">{item.sku}:</span> ₹
                            {item.oldPrice} → ₹{item.newPrice}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Failure Summary */}
              {results.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900 mb-2">
                        Failed to Update {results.failed.length} Product
                        {results.failed.length !== 1 ? "s" : ""}
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {results.failed.map((item) => (
                          <div
                            key={item.productId}
                            className="text-sm text-red-800"
                          >
                            <span className="font-medium">
                              ID {item.productId}:
                            </span>{" "}
                            {item.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {!results ? (
            <>
              <button
                onClick={onClose}
                disabled={processing}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAll}
                disabled={processing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Apply All Changes</>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onSuccess}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
