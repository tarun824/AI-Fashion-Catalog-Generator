/**
 * One-Click Ship Button
 * Instant shipping with auto-courier selection
 */

import { useState } from "react";
import { Zap, Loader, Check } from "lucide-react";
import { api } from "../utils/api";
import ShippingConfirmModal from "./ShippingConfirmModal";

export default function OneClickShip({
  order,
  onSuccess,
  variant = "primary",
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleOneClickShip = async () => {
    if (disabled) return;
    setShowModal(true);
  };

  const confirmShip = async (pickupLocation) => {
    setLoading(true);
    try {
      const response = await api.post("/admin/shipping/one-click-ship", {
        orderId: order._id,
        pickupLocation: pickupLocation, // Use selected pickup location from modal
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess && onSuccess(response.data);
      }, 1500);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to ship order");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <button
        disabled
        className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2 opacity-90"
      >
        <Check className="w-5 h-5" />
        Shipped!
      </button>
    );
  }

  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white",
    secondary:
      "bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };

  return (
    <>
      <ShippingConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={confirmShip}
        order={order}
        mode="oneclick"
      />

      <button
        onClick={handleOneClickShip}
        disabled={loading || disabled}
        className={`
          px-6 py-3 rounded-lg font-semibold transition
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2 shadow-lg hover:shadow-xl
          ${variants[variant]}
        `}
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Shipping...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            One-Click Ship
          </>
        )}
      </button>
    </>
  );
}
