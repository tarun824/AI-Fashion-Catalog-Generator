import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { format } from "date-fns";
import EmptyState from "../components/EmptyState";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({});
  const [selectedOrders, setSelectedOrders] = useState([]);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Statistics
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
  });

  useEffect(() => {
    loadStats();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadOrders();
  }, [
    page,
    statusFilter,
    paymentStatusFilter,
    sourceFilter,
    sortBy,
    sortOrder,
  ]);

  const loadStats = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const response = await api.get(`/admin/orders/stats?${params}`);
      const statsData = response.data || {};
      setStats({
        totalOrders: statsData.totalOrders || 0,
        totalRevenue: statsData.totalRevenue || 0,
        averageOrderValue: statsData.averageOrderValue || 0,
        pendingOrders: statsData.pendingOrders || 0,
        confirmedOrders: statsData.confirmedOrders || 0,
        processingOrders: statsData.processingOrders || 0,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        order: sortOrder,
      });

      if (searchText.trim()) {
        params.append("search", searchText.trim());
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (paymentStatusFilter !== "all") {
        params.append("paymentStatus", paymentStatusFilter);
      }

      if (sourceFilter !== "all") {
        params.append("source", sourceFilter);
      }

      if (dateFrom) {
        params.append("dateFrom", dateFrom);
      }

      if (dateTo) {
        params.append("dateTo", dateTo);
      }

      const response = await api.get(`/admin/orders?${params}`);
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (!selectedOrders.length) return;
    if (!confirm(`Update ${selectedOrders.length} order(s) to ${newStatus}?`))
      return;

    try {
      await api.post("/admin/orders/bulk-status", {
        ids: selectedOrders,
        status: newStatus,
      });
      setSelectedOrders([]);
      loadOrders();
      loadStats();
    } catch (err) {
      alert("Failed to update orders: " + err.message);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(orders.map((o) => o._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  };

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setSourceFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track all customer orders
          </p>
        </div>
        <Link
          to="/admin/orders/create"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition"
        >
          + Create Order
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Orders
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.totalOrders}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Revenue
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            ₹{stats.totalRevenue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Avg Order Value
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            ₹{stats.averageOrderValue.toFixed(0)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Pending Orders
          </div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {stats.pendingOrders +
              stats.confirmedOrders +
              stats.processingOrders}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by order number, customer..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="manual">Manual</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Search
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-blue-800">
            {selectedOrders.length} order(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkStatusChange("confirmed")}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Confirm
            </button>
            <button
              onClick={() => handleBulkStatusChange("processing")}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Processing
            </button>
            <button
              onClick={() => handleBulkStatusChange("shipped")}
              className="px-3 py-1 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700"
            >
              Shipped
            </button>
            <button
              onClick={() => setSelectedOrders([])}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Loading orders...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="📦"
              title={
                searchText || statusFilter !== "all"
                  ? "No Orders Found"
                  : "No Orders Yet"
              }
              description={
                searchText || statusFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Orders will appear here once customers start purchasing from your store."
              }
              actions={
                searchText || statusFilter !== "all"
                  ? []
                  : [
                      {
                        type: "primary",
                        icon: "➕",
                        label: "Create Order",
                        subtitle: "Manually create an order for a customer",
                        link: "/admin/orders/create",
                      },
                      {
                        type: "secondary",
                        icon: "🔗",
                        label: "Share Store Link",
                        subtitle: "Get customers to your storefront",
                        link: "/",
                      },
                    ]
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedOrders.length === orders.length &&
                          orders.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shipping Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order._id)}
                          onChange={() => handleSelectOrder(order._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.customer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customer.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.items.length} item(s)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{order.pricing.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <OrderStatusBadge status={order.status} type="order" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {order.shipping?.lastError ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                ⚠️ Error
                              </span>
                              <span
                                className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate"
                                title={order.shipping.lastError.message}
                              >
                                {order.shipping.lastError.message}
                              </span>
                            </div>
                          ) : order.status === "delivered" ||
                            order.shipping?.deliveredAt ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🎉 Delivered
                            </span>
                          ) : order.shipping?.pickupScheduledAt ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📅 Pickup Scheduled
                            </span>
                          ) : order.shipping?.awbCode ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              🚚 Courier Assigned
                            </span>
                          ) : order.shipping?.shiprocketOrderId ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              📦 Shipment Created
                            </span>
                          ) : order.status === "confirmed" ||
                            order.status === "processing" ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ✓ Ready to Ship
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              ⏳ Not Started
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <OrderStatusBadge
                          status={order.payment.status}
                          type="payment"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {order.payment.method}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        >
                          View
                        </Link>
                        {!order.shipping?.awbCode &&
                          order.status !== "cancelled" &&
                          order.status !== "delivered" && (
                            <Link
                              to={`/admin/orders/${order._id}?action=ship`}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              🚀 Ship
                            </Link>
                          )}
                        {order.shipping?.awbCode && (
                          <span className="text-gray-400">✓ Shipped</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {pagination.page} of {pagination.pages} (
                    {pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                      className="px-3 py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
