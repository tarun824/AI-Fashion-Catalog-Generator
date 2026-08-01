import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import OrderStatusBadge from "../components/OrderStatusBadge";
import ShippingWizard from "../components/ShippingWizard";
import ShippingTracking from "../components/ShippingTracking";
import OneClickShip from "../components/OneClickShip";
import { format } from "date-fns";
import { Truck, Package } from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Shipping wizard
  const [showShippingWizard, setShowShippingWizard] = useState(false);
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
      navigate("/dashboard/orders");
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
          to="/dashboard/orders"
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
            to="/dashboard/orders"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Created on{" "}
            {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintInvoice}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Print Invoice
          </button>
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <button
              onClick={handleCancelOrder}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Status and Payment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Order Status
            </h2>
            <button
              onClick={() => {
                setNewStatus(order.status);
                setShowStatusModal(true);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Update
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <OrderStatusBadge status={order.status} type="order" />
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Source:</span>{" "}
              <span className="font-medium capitalize">{order.source}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
            <button
              onClick={() => {
                setNewPaymentStatus(order.payment.status);
                setShowPaymentModal(true);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Update
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <OrderStatusBadge status={order.payment.status} type="payment" />
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Method:</span>{" "}
              <span className="font-medium">{order.payment.method}</span>
            </div>
            {order.payment.transactionId && (
              <div className="text-sm">
                <span className="text-gray-500">Transaction ID:</span>{" "}
                <span className="font-mono text-xs">
                  {order.payment.transactionId}
                </span>
              </div>
            )}
            {order.payment.paidAmount > 0 && (
              <div className="text-sm">
                <span className="text-gray-500">Paid Amount:</span>{" "}
                <span className="font-medium text-green-600">
                  ₹{order.payment.paidAmount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipping Section */}
      {(order.status === "confirmed" ||
        order.status === "processing" ||
        order.status === "shipped") && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Shipping</h2>
                <p className="text-sm text-gray-600">
                  {order.shipping?.awbCode
                    ? "Track shipment or manage shipping"
                    : "Create shipment to start delivery"}
                </p>
              </div>
            </div>

            {!order.shipping?.awbCode && (
              <div className="flex gap-3">
                <OneClickShip
                  order={order}
                  onSuccess={() => {
                    loadOrder();
                    setTrackingRefresh((prev) => prev + 1);
                  }}
                />
                <button
                  onClick={() => setShowShippingWizard(true)}
                  className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Ship with Options
                </button>
              </div>
            )}
          </div>

          {order.shipping?.awbCode ? (
            <ShippingTracking order={order} refreshTrigger={trackingRefresh} />
          ) : (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                Order confirmed and ready to ship
              </p>
              <p className="text-sm text-gray-500">
                Use "One-Click Ship" for automatic courier selection or
                <br />
                "Ship with Options" to manually choose courier and customize
              </p>
            </div>
          )}
        </div>
      )}

      {/* Customer Information */}
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

      {/* Order Items */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Order Items
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right">
                    ₹{item.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">
                    ₹{item.subtotal.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-medium">
                ₹{order.pricing.subtotal.toLocaleString()}
              </span>
            </div>
            {order.pricing.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount:</span>
                <span className="font-medium text-red-600">
                  -₹{order.pricing.discount.toLocaleString()}
                </span>
              </div>
            )}
            {order.pricing.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax:</span>
                <span className="font-medium">
                  ₹{order.pricing.tax.toLocaleString()}
                </span>
              </div>
            )}
            {order.pricing.shippingCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping:</span>
                <span className="font-medium">
                  ₹{order.pricing.shippingCharge.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>₹{order.pricing.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

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

      {/* Status History Timeline */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Order Timeline
          </h2>
          <div className="space-y-4">
            {order.statusHistory
              .slice()
              .reverse()
              .map((entry, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <OrderStatusBadge status={entry.status} type="order" />
                        {entry.note && (
                          <p className="text-sm text-gray-600 mt-1">
                            {entry.note}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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

      {/* Shipping Wizard Modal */}
      {showShippingWizard && (
        <ShippingWizard
          order={order}
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
