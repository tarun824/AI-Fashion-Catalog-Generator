import { useState, useEffect } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { api } from "../utils/api";
import OrderStatusBadge from "../components/OrderStatusBadge";
import ShippingWizard from "../components/ShippingWizard";
import ShippingTracking from "../components/ShippingTracking";
import ShippingConfirmModal from "../components/ShippingConfirmModal";
import OneClickShip from "../components/OneClickShip";
import { format } from "date-fns";
import { Truck, Package, AlertCircle } from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Shipping wizard
  const [showShippingWizard, setShowShippingWizard] = useState(false);
  const [showShippingConfirm, setShowShippingConfirm] = useState(false);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState("");
  const [trackingRefresh, setTrackingRefresh] = useState(0);

  // Update modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    loadOrder();
  }, [id]);

  useEffect(() => {
    // Auto-scroll and highlight shipping section if ?action=ship in URL
    if (searchParams.get("action") === "ship" && order) {
      setTimeout(() => {
        const section = document.getElementById("shipping-section");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add flash animation to draw attention
          section.classList.add("ring-4", "ring-blue-400", "ring-offset-4");
          setTimeout(() => {
            section.classList.remove(
              "ring-4",
              "ring-blue-400",
              "ring-offset-4",
            );
          }, 2500);
        }
      }, 600);
    }
  }, [searchParams, order]);

  const loadOrder = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/admin/orders/${id}`);
      setOrder(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      await api.patch(`/admin/orders/${id}/status`, {
        status: newStatus,
        note: statusNote,
      });
      setShowStatusModal(false);
      setNewStatus("");
      setStatusNote("");
      loadOrder();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      await api.patch(`/admin/orders/${id}/payment`, {
        status: newPaymentStatus,
        paidAmount: paidAmount ? parseFloat(paidAmount) : null,
        transactionId: transactionId || null,
      });
      setShowPaymentModal(false);
      setNewPaymentStatus("");
      setPaidAmount("");
      setTransactionId("");
      loadOrder();
    } catch (err) {
      alert("Failed to update payment: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      await api.delete(`/admin/orders/${id}`);
      navigate("/admin/orders");
    } catch (err) {
      alert("Failed to cancel order: " + err.message);
    }
  };

  const handlePrintInvoice = () => {
    window.open(
      `${api.baseUrl}/admin/orders/${id}/invoice`,
      "_blank",
      "width=800,height=600",
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || "Order not found"}</p>
        <Link
          to="/admin/orders"
          className="text-blue-600 hover:text-blue-800 mt-4 inline-block"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/orders"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Created on{" "}
            {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex gap-2">
          {/* TODO: */}
          {/* <button
            onClick={handlePrintInvoice}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Print Invoice
          </button> */}
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <>
              <button
                onClick={() => setShowShippingConfirm(true)}
                disabled={order.status === "pending"}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-4 h-4" />
                Ship with Options
              </button>
              <button
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Cancel Order
              </button>
            </>
          )}
        </div>
      </div>

      {/* Shipping Action Banner */}
      {searchParams.get("action") === "ship" && !order.shipping?.awbCode && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl shadow-lg border-2 border-blue-400">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Truck className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">
                Ready to Ship This Order?
              </h3>
              {order.status === "pending" ? (
                <p className="text-blue-100">
                  👇 Scroll down to the <strong>Shipping section</strong> and
                  click <strong>"✓ Confirm Order Now"</strong> first, then ship.
                </p>
              ) : (
                <p className="text-blue-100">
                  👇 Scroll down to the <strong>Shipping section</strong> below
                  to start shipping!
                </p>
              )}
            </div>
            <button
              onClick={() => {
                document
                  .getElementById("shipping-section")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition shadow-lg"
            >
              Go to Shipping →
            </button>
          </div>
        </div>
      )}

      {/* Shipping Progress - Shows shipping flow chart */}
      {order.status !== "cancelled" && order.status !== "delivered" && (
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Shipping Progress
          </h3>
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${
                    order.shipping?.deliveredAt
                      ? "100%"
                      : order.shipping?.pickupScheduledAt
                        ? "75%"
                        : order.shipping?.awbCode
                          ? "50%"
                          : order.shipping?.shiprocketOrderId
                            ? "25%"
                            : order.status === "confirmed"
                              ? "12.5%"
                              : "0%"
                  }`,
                }}
              ></div>
            </div>

            {/* Steps */}
            {[
              {
                label: "Order Confirmed",
                completed:
                  order.status === "confirmed" ||
                  order.status === "processing" ||
                  order.status === "shipped" ||
                  order.status === "delivered",
                current:
                  order.status === "confirmed" &&
                  !order.shipping?.shiprocketOrderId,
                icon: "✓",
                proof:
                  order.status !== "pending"
                    ? `Order ${order.orderNumber}`
                    : null,
                errorStage: null,
              },
              {
                label: "Shipment Created",
                completed: order.shipping?.shiprocketOrderId,
                current:
                  !order.shipping?.awbCode && order.shipping?.shiprocketOrderId,
                icon: "📦",
                proof: order.shipping?.shiprocketOrderId
                  ? `SR ID: ${order.shipping.shiprocketOrderId}`
                  : null,
                errorStage: "create_order",
              },
              {
                label: "Courier Assigned",
                completed: order.shipping?.awbCode,
                current:
                  order.shipping?.awbCode && !order.shipping?.pickupScheduledAt,
                icon: "🚚",
                proof: order.shipping?.awbCode
                  ? `AWB: ${order.shipping.awbCode}`
                  : null,
                errorStage: "assign_courier",
              },
              {
                label: "Pickup Scheduled",
                completed: order.shipping?.pickupScheduledAt,
                current:
                  order.shipping?.pickupScheduledAt &&
                  !order.shipping?.deliveredAt,
                icon: "📅",
                proof: order.shipping?.pickupScheduledAt
                  ? `Pickup: ${new Date(order.shipping.pickupScheduledAt).toLocaleDateString()}`
                  : null,
                errorStage: "schedule_pickup",
              },
              {
                label: "Delivered",
                completed:
                  order.shipping?.deliveredAt || order.status === "delivered",
                current: false,
                icon: "🎉",
                proof: order.shipping?.deliveredAt
                  ? `Delivered: ${new Date(order.shipping.deliveredAt).toLocaleDateString()}`
                  : null,
                errorStage: "tracking",
              },
            ].map((step, index) => {
              const hasError =
                order.shipping?.lastError?.stage === step.errorStage;
              const isBlocked = hasError && !step.completed;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center relative z-10"
                  style={{ flex: 1 }}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 mb-2 ${
                      isBlocked
                        ? "bg-red-600 text-white shadow-lg border-2 border-red-400"
                        : step.completed
                          ? "bg-blue-600 text-white shadow-lg"
                          : step.current
                            ? "bg-white border-4 border-blue-600 text-blue-600 shadow-lg animate-pulse"
                            : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isBlocked ? "✕" : step.completed ? "✓" : step.icon}
                  </div>
                  <span
                    className={`text-xs text-center font-medium ${
                      isBlocked
                        ? "text-red-600"
                        : step.completed || step.current
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {/* Show proof/ID below completed steps */}
                  {step.completed && step.proof && !isBlocked && (
                    <span className="text-[10px] text-center text-gray-500 mt-1 font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {step.proof}
                    </span>
                  )}
                  {/* Show error message for blocked steps */}
                  {isBlocked && order.shipping?.lastError && (
                    <div className="text-[10px] text-center mt-1 max-w-[120px]">
                      <div className="bg-red-100 text-red-800 px-2 py-1 rounded font-medium mb-1">
                        ⚠️ Error
                      </div>
                      <div className="text-red-600 leading-tight">
                        {order.shipping.lastError.message}
                      </div>
                      {order.shipping.lastError.timestamp && (
                        <div className="text-gray-400 mt-1">
                          {new Date(
                            order.shipping.lastError.timestamp,
                          ).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Information - FIRST for business users */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <p className="font-medium">{order.customer.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Phone</label>
            <p className="font-medium">{order.customer.phone}</p>
          </div>
          {order.customer.email && (
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium">{order.customer.email}</p>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="text-sm text-gray-500">Address</label>
            <p className="text-sm">
              {order.customer.address.line1}
              {order.customer.address.line2 && (
                <>, {order.customer.address.line2}</>
              )}
              <br />
              {order.customer.address.city && (
                <>{order.customer.address.city}, </>
              )}
              {order.customer.address.state} {order.customer.address.pincode}
              <br />
              {order.customer.address.country}
            </p>
          </div>
        </div>
      </div>

      {/* Order Details Table - SECOND for complete overview */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setNewStatus(order.status);
                setShowStatusModal(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded"
            >
              Update Status
            </button>
            <button
              onClick={() => {
                setNewPaymentStatus(order.payment.status);
                setShowPaymentModal(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded"
            >
              Update Payment
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase w-1/4">
                  Order #
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {order.orderNumber}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase w-1/4">
                  Status
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} type="order" />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Source
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 capitalize">
                  {order.source}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Payment Status
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge
                    status={order.payment.status}
                    type="payment"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Payment Method
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {order.payment.method}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Items
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {order.items.length} item(s)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Subtotal
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  ₹{order.pricing.subtotal.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Discount
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600">
                  {order.pricing.discount > 0
                    ? `-₹${order.pricing.discount.toLocaleString()}`
                    : "₹0"}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Shipping Charge
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  ₹{order.pricing.shippingCharge.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Tax
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  ₹{order.pricing.tax.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                  Total Amount
                </td>
                <td className="px-4 py-3 text-lg font-bold text-blue-600">
                  ₹{order.pricing.total.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Paid Amount
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600">
                  {order.payment.paidAmount > 0
                    ? `₹${order.payment.paidAmount.toLocaleString()}`
                    : "₹0"}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Created At
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Paid At
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600">
                  {order.payment.paidAt
                    ? format(
                        new Date(order.payment.paidAt),
                        "MMM d, yyyy h:mm a",
                      )
                    : "-"}
                </td>
              </tr>
              {order.payment.transactionId && (
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Transaction ID
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-mono text-gray-900"
                    colSpan={3}
                  >
                    {order.payment.transactionId}
                  </td>
                </tr>
              )}
              {order.notes && (
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Order Notes
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900" colSpan={3}>
                    {order.notes}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Items - THIRD */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Order Items
        </h2>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div
              key={index}
              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-gray-900">
                    ₹{item.subtotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.quantity} × ₹{item.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Tracking - Show tracking details if order is shipped */}
      {order.shipping?.awbCode && (
        <div id="shipping-section">
          <ShippingTracking order={order} refreshTrigger={trackingRefresh} />
        </div>
      )}

      {/* Shipping Information */}
      {(order.shipping.courier ||
        order.shipping.trackingNumber ||
        order.status === "shipped" ||
        order.status === "delivered") && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Shipping Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.shipping.courier && (
              <div>
                <label className="text-sm text-gray-500">Courier</label>
                <p className="font-medium">{order.shipping.courier}</p>
              </div>
            )}
            {order.shipping.trackingNumber && (
              <div>
                <label className="text-sm text-gray-500">Tracking Number</label>
                <p className="font-mono text-sm">
                  {order.shipping.trackingNumber}
                </p>
              </div>
            )}
            {order.shipping.shippedAt && (
              <div>
                <label className="text-sm text-gray-500">Shipped At</label>
                <p className="text-sm">
                  {format(
                    new Date(order.shipping.shippedAt),
                    "MMM d, yyyy h:mm a",
                  )}
                </p>
              </div>
            )}
            {order.shipping.deliveredAt && (
              <div>
                <label className="text-sm text-gray-500">Delivered At</label>
                <p className="text-sm">
                  {format(
                    new Date(order.shipping.deliveredAt),
                    "MMM d, yyyy h:mm a",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {(order.notes || order.internalNotes) && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          {order.notes && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">
                Customer Notes
              </label>
              <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
            </div>
          )}
          {order.internalNotes && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Internal Notes
              </label>
              <p className="text-sm text-gray-600 mt-1">
                {order.internalNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Update Order Status</h3>
            <form onSubmit={handleStatusUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update Status"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Update Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Update Payment</h3>
            <form onSubmit={handlePaymentUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={newPaymentStatus}
                  onChange={(e) => setNewPaymentStatus(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid Amount (Optional)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="Leave empty to use order total"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update Payment"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipping Confirmation Modal */}
      {showShippingConfirm && (
        <ShippingConfirmModal
          isOpen={showShippingConfirm}
          onClose={() => setShowShippingConfirm(false)}
          onConfirm={(pickupLocation) => {
            setShowShippingConfirm(false);
            setSelectedPickupLocation(pickupLocation);
            setShowShippingWizard(true);
          }}
          order={order}
          mode="options"
        />
      )}

      {/* Shipping Wizard Modal */}
      {showShippingWizard && (
        <ShippingWizard
          order={order}
          pickupLocation={selectedPickupLocation}
          onClose={() => setShowShippingWizard(false)}
          onSuccess={() => {
            setShowShippingWizard(false);
            loadOrder();
            setTrackingRefresh((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
