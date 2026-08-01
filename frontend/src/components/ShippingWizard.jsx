/**
 * Shipping Wizard Component
 * Beautiful step-by-step shipping process with visual feedback
 *
 * Steps:
 * 1. Create Order in Shiprocket
 * 2. Select Courier (compare rates)
 * 3. Generate Label
 * 4. Schedule Pickup
 * 5. Done! (show tracking)
 */

import { useState } from "react";
import {
  X,
  Check,
  Loader,
  Package,
  Truck,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { api } from "../utils/api";

export default function ShippingWizard({ order, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [shippingData, setShippingData] = useState({
    shiprocketOrderId: order.shipping?.shiprocketOrderId || null,
    shipmentId: order.shipping?.shipmentId || null,
    couriers: [],
    selectedCourier: null,
    awbCode: null,
    labelUrl: null,
    pickupDate: null,
  });

  const steps = [
    {
      number: 1,
      title: "Create Order",
      icon: Package,
      desc: "Register order with Shiprocket",
    },
    {
      number: 2,
      title: "Select Courier",
      icon: Truck,
      desc: "Compare rates and choose",
    },
    {
      number: 3,
      title: "Generate Label",
      icon: FileText,
      desc: "Get shipping label",
    },
    {
      number: 4,
      title: "Schedule Pickup",
      icon: Calendar,
      desc: "Book courier pickup",
    },
  ];

  /**
   * Step 1: Create Shiprocket Order
   */
  const createShiprocketOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/admin/shipping/create-order", {
        orderId: order._id,
        pickupLocation: "Primary",
      });

      setShippingData((prev) => ({
        ...prev,
        shiprocketOrderId: response.data.data.shiprocketOrderId,
        shipmentId: response.data.data.shipmentId,
      }));

      // Auto-fetch courier rates
      await fetchCourierRates(response.data.data.shiprocketOrderId);
      setCurrentStep(2);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch available couriers
   */
  const fetchCourierRates = async (shiprocketOrderId) => {
    try {
      const response = await api.get(
        `/admin/shipping/courier-rates/${order._id}`,
      );
      setShippingData((prev) => ({
        ...prev,
        couriers: response.data.couriers,
        selectedCourier: response.data.couriers[0], // Auto-select cheapest
      }));
    } catch (error) {
      setError("Failed to fetch courier rates");
    }
  };

  /**
   * Step 2: Assign Selected Courier
   */
  const assignCourier = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/admin/shipping/assign-courier", {
        orderId: order._id,
        courierId: shippingData.selectedCourier.courierId,
      });

      setShippingData((prev) => ({
        ...prev,
        awbCode: response.data.data.awbCode,
      }));

      setCurrentStep(3);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to assign courier");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Generate Label
   */
  const generateLabel = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/admin/shipping/generate-label", {
        orderId: order._id,
      });

      setShippingData((prev) => ({
        ...prev,
        labelUrl: response.data.data.labelUrl,
      }));

      setCurrentStep(4);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to generate label");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 4: Schedule Pickup
   */
  const schedulePickup = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/admin/shipping/schedule-pickup", {
        orderId: order._id,
        pickupDate: getNextPickupDate(),
      });

      setShippingData((prev) => ({
        ...prev,
        pickupDate: response.data.data.pickupScheduledDate,
      }));

      // Success!
      onSuccess && onSuccess();
    } catch (error) {
      setError(error.response?.data?.error || "Failed to schedule pickup");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get next available pickup date (tomorrow, skip Sunday)
   */
  const getNextPickupDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) {
      // Sunday
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    return tomorrow.toISOString().split("T")[0];
  };

  /**
   * Execute current step action
   */
  const executeStep = () => {
    switch (currentStep) {
      case 1:
        createShiprocketOrder();
        break;
      case 2:
        assignCourier();
        break;
      case 3:
        generateLabel();
        break;
      case 4:
        schedulePickup();
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Ship Order</h2>
              <p className="text-blue-100 mt-1">Order {order.orderNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-6 grid grid-cols-4 gap-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isComplete = currentStep > step.number;

              return (
                <div
                  key={step.number}
                  className={`
                    p-3 rounded-lg border-2 transition-all
                    ${isActive ? "bg-white text-blue-600 border-white" : ""}
                    ${isComplete ? "bg-green-500/20 text-green-100 border-green-300" : ""}
                    ${!isActive && !isComplete ? "bg-white/10 text-white/70 border-white/30" : ""}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isComplete ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    <span className="text-sm font-semibold">{step.number}</span>
                  </div>
                  <div className="text-xs font-medium">{step.title}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Create Order */}
          {currentStep === 1 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Create Shiprocket Order
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Register this order with Shiprocket to start the shipping
                process. We'll send order details to their system.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto mb-6">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-sm text-gray-500">Customer</span>
                    <p className="font-medium">{order.customer.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Amount</span>
                    <p className="font-medium">
                      ₹{order.pricing.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">Delivery to</span>
                    <p className="font-medium">
                      {order.customer.address.city},{" "}
                      {order.customer.address.pincode}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={executeStep}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5" />
                    Create Order in Shiprocket
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Select Courier */}
          {currentStep === 2 && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Truck className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Select Courier Partner
                </h3>
                <p className="text-gray-600">
                  Compare rates and delivery times to choose the best option
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {shippingData.couriers.map((courier) => (
                  <label
                    key={courier.courierId}
                    className={`
                      block p-4 border-2 rounded-xl cursor-pointer transition
                      ${
                        shippingData.selectedCourier?.courierId ===
                        courier.courierId
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="courier"
                      checked={
                        shippingData.selectedCourier?.courierId ===
                        courier.courierId
                      }
                      onChange={() =>
                        setShippingData((prev) => ({
                          ...prev,
                          selectedCourier: courier,
                        }))
                      }
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">
                            {courier.courierName}
                          </span>
                          {courier.isRecommended && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Delivery: {courier.estimatedDays} •
                          {courier.codAvailable && " COD Available"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ₹{courier.totalCharge}
                        </div>
                        <div className="text-xs text-gray-500">
                          Freight: ₹{courier.freightCharge}
                          {courier.codCharges > 0 &&
                            ` + COD: ₹${courier.codCharges}`}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={executeStep}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition inline-flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Assigning Courier...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm Selection
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generate Label */}
          {currentStep === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Generate Shipping Label
              </h3>
              <p className="text-gray-600 mb-6">
                Create a printable shipping label for the package
              </p>

              {shippingData.awbCode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto mb-6">
                  <p className="text-sm text-green-700 mb-1">
                    AWB Tracking Number
                  </p>
                  <p className="text-2xl font-mono font-bold text-green-900">
                    {shippingData.awbCode}
                  </p>
                </div>
              )}

              <button
                onClick={executeStep}
                disabled={loading}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating Label...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Label PDF
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 4: Schedule Pickup */}
          {currentStep === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Schedule Pickup
              </h3>
              <p className="text-gray-600 mb-4">
                Book courier pickup for tomorrow
              </p>

              {shippingData.labelUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto mb-6">
                  <a
                    href={shippingData.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <FileText className="w-5 h-5" />
                    Download & Print Label
                  </a>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-6">
                Pickup Date:{" "}
                <span className="font-semibold">{getNextPickupDate()}</span>
              </p>

              <button
                onClick={executeStep}
                disabled={loading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Scheduling Pickup...
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    Schedule Pickup
                  </>
                )}
              </button>
            </div>
          )}

          {/* Success State */}
          {shippingData.pickupDate && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                🎉 Order Shipped Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                Courier will pick up on {shippingData.pickupDate}
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 max-w-md mx-auto mb-6">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-sm text-gray-600">Courier</span>
                    <p className="font-semibold">
                      {shippingData.selectedCourier.courierName}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">AWB Code</span>
                    <p className="font-mono font-semibold text-sm">
                      {shippingData.awbCode}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      Estimated Delivery
                    </span>
                    <p className="font-semibold">
                      {shippingData.selectedCourier.estimatedDays}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                {shippingData.labelUrl && (
                  <a
                    href={shippingData.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition inline-flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Print Label
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
