/**
 * Shipping Confirmation Modal
 * Beautiful modal for confirming shipping actions with pickup location selection
 */

import { useState, useEffect } from "react";
import { X, Package, Zap, AlertTriangle, MapPin } from "lucide-react";
import { api } from "../utils/api";

export default function ShippingConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  mode = "oneclick", // "oneclick" | "options"
}) {
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickup, setSelectedPickup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch pickup locations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPickupLocations();
    }
  }, [isOpen]);

  const fetchPickupLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/admin/shipping/pickup-locations");
      // Handle nested response structure: response.locations.shipping_address
      const locations = response.locations?.shipping_address || [];

      if (response.success && locations.length > 0) {
        setPickupLocations(locations);
        // Auto-select first location
        setSelectedPickup(locations[0].pickup_location);
      } else {
        setError("No pickup locations found. Please configure in Shiprocket.");
      }
    } catch (err) {
      console.error("Error fetching pickup locations:", err);
      setError("Failed to load pickup locations");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = {
    oneclick: {
      icon: Zap,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      title: "Ship Order Automatically?",
      description:
        "We'll automatically select the best courier based on price and delivery time for this order.",
      features: [
        "✓ Automatically select best courier",
        "✓ Generate shipping label",
        "✓ Schedule pickup",
        "✓ Send tracking to customer",
      ],
      confirmText: "⚡ Ship Now",
      confirmClass:
        "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
    },
    options: {
      icon: Package,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100",
      title: "Choose Shipping Options",
      description:
        "You'll be able to compare couriers, select pickup time, and customize shipping preferences.",
      features: [
        "✓ Compare courier rates",
        "✓ Choose preferred courier",
        "✓ Select pickup date/time",
        "✓ Add special instructions",
      ],
      confirmText: "📦 Continue",
      confirmClass: "bg-purple-600 hover:bg-purple-700",
    },
  };

  const content = modalContent[mode];
  const Icon = content.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full my-auto overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`p-3 sm:p-4 rounded-xl ${content.iconBg}`}>
              <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${content.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {content.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                {order.orderNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[60vh] sm:max-h-none overflow-y-auto">
          {/* Description */}
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {content.description}
          </p>

          {/* Pickup Location Selector */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-3 sm:p-4 border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                Pickup Location
              </h3>
            </div>

            {loading ? (
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 animate-pulse">
                Loading pickup locations...
              </div>
            ) : error ? (
              <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-200 dark:border-red-700">
                {error}
              </div>
            ) : (
              <select
                value={selectedPickup}
                onChange={(e) => setSelectedPickup(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 rounded-lg font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {pickupLocations.map((location) => (
                  <option key={location.id} value={location.pickup_location}>
                    📍 {location.pickup_location} - {location.city},{" "}
                    {location.pin_code}
                  </option>
                ))}
              </select>
            )}

            {selectedPickup && !loading && !error && (
              <div className="mt-2 sm:mt-3 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="font-medium flex-shrink-0">Address:</span>
                  <span className="break-words">
                    {
                      pickupLocations.find(
                        (l) => l.pickup_location === selectedPickup,
                      )?.address
                    }
                    ,{" "}
                    {
                      pickupLocations.find(
                        (l) => l.pickup_location === selectedPickup,
                      )?.city
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2">
              Order Summary
            </h3>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-600 dark:text-gray-300">
                  Customer:
                </span>
                <span className="font-medium text-gray-900 dark:text-white truncate max-w-[60%]">
                  {order.customer.name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-600 dark:text-gray-300">Items:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {order.items.length} item(s)
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-600 dark:text-gray-300">Total:</span>
                <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                  ₹{order.pricing.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-600 dark:text-gray-300 flex-shrink-0">
                  Delivery to:
                </span>
                <span className="font-medium text-gray-900 dark:text-white text-right break-words">
                  {order.customer.address.city},{" "}
                  {order.customer.address.pincode}
                </span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-1.5 sm:space-y-2">
            {content.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300"
              >
                {feature}
              </div>
            ))}
          </div>

          {/* Warning for COD */}
          {order.payment.method === "COD" && (
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  Cash on Delivery Order
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  COD charges may apply. Ensure payment collection on delivery.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex gap-2 sm:gap-3 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-500 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedPickup) {
                onConfirm(selectedPickup);
                onClose();
              }
            }}
            disabled={!selectedPickup || loading || error}
            className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-semibold text-white transition shadow-lg hover:shadow-xl ${content.confirmClass} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg`}
          >
            {loading ? "Loading..." : content.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
