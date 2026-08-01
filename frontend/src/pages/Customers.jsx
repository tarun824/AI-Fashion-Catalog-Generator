import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import EmptyState from "../components/EmptyState";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({});
  const [insights, setInsights] = useState({
    totalCustomers: 0,
    segments: { vip: 0, regular: 0, new: 0, inactive: 0 },
    revenue: { total: 0 },
    highChurnRisk: 0,
  });

  // Filters
  const [searchText, setSearchText] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [churnRiskFilter, setChurnRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadInsights();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [
    page,
    customerTypeFilter,
    sourceFilter,
    churnRiskFilter,
    sortBy,
    sortOrder,
  ]);

  const loadInsights = async () => {
    try {
      const response = await api.get("/admin/customers/insights");
      const insightsData = response.insights || {};
      setInsights({
        totalCustomers: insightsData.totalCustomers || 0,
        segments: insightsData.segments || {
          vip: 0,
          regular: 0,
          new: 0,
          inactive: 0,
        },
        revenue: insightsData.revenue || { total: 0 },
        highChurnRisk: insightsData.highChurnRisk || 0,
      });
    } catch (err) {
      console.error("Failed to load insights:", err);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (searchText.trim()) {
        params.append("search", searchText.trim());
      }

      if (customerTypeFilter !== "all") {
        params.append("customerType", customerTypeFilter);
      }

      if (sourceFilter !== "all") {
        params.append("source", sourceFilter);
      }

      if (churnRiskFilter !== "all") {
        params.append("churnRisk", churnRiskFilter);
      }

      const response = await api.get(`/admin/customers?${params}`);
      setCustomers(response.customers || []);
      setPagination(response.pagination || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  const handleAnalyzeAll = async () => {
    if (
      !confirm("Run AI analysis on all customers? This may take a few minutes.")
    ) {
      return;
    }

    try {
      await api.post("/admin/customers/analyze-all");
      alert("Bulk analysis started in background. Check console for results.");
    } catch (err) {
      alert("Failed to start analysis: " + err.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCustomerTypeBadge = (type) => {
    const colors = {
      vip: "bg-purple-100 text-purple-800",
      regular: "bg-blue-100 text-blue-800",
      new: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}
      >
        {type.toUpperCase()}
      </span>
    );
  };

  const getChurnRiskBadge = (risk) => {
    if (!risk) return null;

    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[risk]}`}
      >
        {risk.toUpperCase()} RISK
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customer Intelligence</h1>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyzeAll}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🤖 Analyze All
          </button>
          <Link
            to="/admin/customers/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Customer
          </Link>
        </div>
      </div>

      {/* Insights Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Total Customers</div>
          <div className="text-2xl font-bold">{insights.totalCustomers}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">VIP Customers</div>
          <div className="text-2xl font-bold text-purple-600">
            {insights.segments.vip}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(insights.revenue.total)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">At Risk</div>
          <div className="text-2xl font-bold text-red-600">
            {insights.highChurnRisk}
          </div>
        </div>
      </div>

      {/* Segment Stats */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="font-semibold mb-3">Customer Segments</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
              VIP: {insights.segments.vip}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              Regular: {insights.segments.regular}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              New: {insights.segments.new}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
              Inactive: {insights.segments.inactive}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={customerTypeFilter}
              onChange={(e) => {
                setCustomerTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="vip">VIP</option>
              <option value="regular">Regular</option>
              <option value="new">New</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="referral">Referral</option>
            </select>

            <select
              value={churnRiskFilter}
              onChange={(e) => {
                setChurnRiskFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Sort by: Date Added</option>
              <option value="totalSpent">Sort by: Total Spent</option>
              <option value="totalOrders">Sort by: Total Orders</option>
              <option value="lastPurchaseDate">Sort by: Last Purchase</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </form>
      </div>

      {/* Customer List */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading customers...</div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <EmptyState
            icon="👥"
            title={
              searchText || customerTypeFilter !== "all"
                ? "No Customers Found"
                : "No Customers Yet"
            }
            description={
              searchText || customerTypeFilter !== "all"
                ? "Try adjusting your filters or search terms"
                : "Customers will appear here when they place orders or sign up."
            }
            actions={
              searchText || customerTypeFilter !== "all"
                ? []
                : [
                    {
                      type: "primary",
                      icon: "🔗",
                      label: "Share Store Link",
                      subtitle: "Invite customers to browse your catalog",
                      link: "/",
                    },
                    {
                      type: "secondary",
                      icon: "➕",
                      label: "Create Order",
                      subtitle: "Add a customer while creating an order",
                      link: "/admin/orders/create",
                    },
                  ]
            }
          />
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Purchase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getCustomerTypeBadge(customer.customerType)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">
                        {customer.totalOrders}
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg: {formatCurrency(customer.averageOrderValue)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-green-600">
                        {formatCurrency(customer.totalSpent)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {formatDate(customer.lastPurchaseDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getChurnRiskBadge(customer.intelligence?.churnRisk)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/customers/${customer._id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
