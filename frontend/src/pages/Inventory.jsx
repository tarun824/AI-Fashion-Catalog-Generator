import { useState, useEffect } from "react";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";
import StockAlerts from "../components/StockAlerts";
import PricingSuggestions from "../components/PricingSuggestions";
import { api } from "../utils/api";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState({
    summary: {
      totalProducts: 0,
      totalInventoryValue: 0,
      slowMovers: 0,
      fastMovers: 0,
      deadStock: 0,
      bundleOpportunities: 0,
    },
    topSlowMovers: [],
    topFastMovers: [],
    deadStock: [],
    bundleSuggestions: [],
  });
  const [alerts, setAlerts] = useState({
    critical: [],
    warnings: [],
    opportunities: [],
  });
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [insightsRes, alertsRes] = await Promise.all([
        api.get("/admin/inventory/insights"),
        api.get("/admin/inventory/alerts"),
      ]);

      // Safely access and merge nested data
      const insightsData = insightsRes.data?.insights || insightsRes.data || {};
      const alertsData = alertsRes.data?.alerts || alertsRes.data || {};

      setInsights({
        summary: insightsData.summary || {
          totalProducts: 0,
          totalInventoryValue: 0,
          slowMovers: 0,
          fastMovers: 0,
          deadStock: 0,
          bundleOpportunities: 0,
        },
        topSlowMovers: insightsData.topSlowMovers || [],
        topFastMovers: insightsData.topFastMovers || [],
        deadStock: insightsData.deadStock || [],
        bundleSuggestions: insightsData.bundleSuggestions || [],
      });

      setAlerts({
        critical: alertsData.critical || [],
        warnings: alertsData.warnings || [],
        opportunities: alertsData.opportunities || [],
      });
    } catch (err) {
      console.error("Error loading inventory data:", err);
      console.error("Error details:", err.response?.data);
      setError("Failed to load inventory data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadInventoryData();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Inventory Intelligence
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          AI-powered insights to optimize pricing and stock management
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={refreshData}
              className="mt-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          icon={<Package className="w-6 h-6 text-blue-600" />}
          label="Total Products"
          value={insights.summary.totalProducts}
          bgColor="bg-blue-50"
        />
        <SummaryCard
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          label="Inventory Value"
          value={`₹${(insights.summary.totalInventoryValue / 1000).toFixed(1)}K`}
          bgColor="bg-green-50"
        />
        <SummaryCard
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          label="Fast Movers"
          value={insights.summary.fastMovers}
          subtitle="High demand products"
          bgColor="bg-purple-50"
        />
        <SummaryCard
          icon={<TrendingDown className="w-6 h-6 text-orange-600" />}
          label="Slow Movers"
          value={insights.summary.slowMovers}
          subtitle="Need attention"
          bgColor="bg-orange-50"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={<Zap />}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === "alerts"}
              onClick={() => setActiveTab("alerts")}
              icon={<AlertCircle />}
              badge={alerts?.critical?.length || 0}
            >
              Alerts
            </TabButton>
            <TabButton
              active={activeTab === "pricing"}
              onClick={() => setActiveTab("pricing")}
              icon={<DollarSign />}
            >
              Pricing AI
            </TabButton>
            <TabButton
              active={activeTab === "performance"}
              onClick={() => setActiveTab("performance")}
              icon={<TrendingUp />}
            >
              Performance
            </TabButton>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab insights={insights} alerts={alerts} />
              )}
              {activeTab === "alerts" && (
                <StockAlerts alerts={alerts} onRefresh={refreshData} />
              )}
              {activeTab === "pricing" && (
                <PricingSuggestions onRefresh={refreshData} />
              )}
              {activeTab === "performance" && (
                <PerformanceTab insights={insights} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Sub Components ====================

function SummaryCard({ icon, label, value, subtitle, bgColor = "bg-gray-50" }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`${bgColor} dark:bg-opacity-10 p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, badge, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-6 py-3 text-sm font-medium border-b-2 transition-colors
        flex items-center gap-2
        ${
          active
            ? "border-blue-600 text-blue-600 dark:text-blue-400"
            : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
        }
      `}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
      {badge > 0 && (
        <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Loading inventory data...
        </p>
      </div>
    </div>
  );
}

// ==================== Tab Contents ====================

function OverviewTab({ insights, alerts }) {
  if (!insights || !alerts) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {alerts.critical.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                {alerts.critical.length} Critical Alert
                {alerts.critical.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-2">
                {alerts.critical.slice(0, 3).map((alert, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-red-800 dark:text-red-200"
                  >
                    <span className="font-medium">{alert.sku}:</span>{" "}
                    {alert.message}
                  </div>
                ))}
              </div>
              {alerts.critical.length > 3 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  +{alerts.critical.length - 3} more alerts
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Fast Movers"
          count={insights.summary.fastMovers}
          description="High-demand products"
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          color="green"
        />
        <QuickActionCard
          title="Slow Movers"
          count={insights.summary.slowMovers}
          description="Need promotion"
          icon={<TrendingDown className="w-5 h-5 text-orange-600" />}
          color="orange"
        />
        <QuickActionCard
          title="Dead Stock"
          count={insights.summary.deadStock}
          description="No sales in 6+ months"
          icon={<Clock className="w-5 h-5 text-red-600" />}
          color="red"
        />
      </div>

      {/* Top Fast Movers */}
      {insights.topFastMovers?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Fast-Moving Products
          </h3>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Sales Velocity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {insights.topFastMovers.slice(0, 5).map((product) => (
                  <tr
                    key={product.sku}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {product.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {product.salesVelocity} /day
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 dark:text-gray-200">
                        {product.currentStock} units
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {product.stockoutRisk.urgency === "critical" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bundle Opportunities */}
      {insights.bundleSuggestions?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Bundle Opportunities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.bundleSuggestions.slice(0, 4).map((bundle) => (
              <div
                key={bundle.bundleId}
                className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {bundle.name}
                </h4>
                <div className="space-y-1 mb-3">
                  {bundle.products.map((product) => (
                    <div
                      key={product.sku}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      • {product.name}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 line-through mr-2">
                      ₹{bundle.regularPrice}
                    </span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      ₹{bundle.bundlePrice}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    Save ₹{bundle.savings}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ title, count, description, icon, color }) {
  const colorClasses = {
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    orange:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {count}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mt-1">
            {title}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
  );
}

function PerformanceTab({ insights }) {
  if (!insights) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Slow Movers */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Slow-Moving Products ({insights.topSlowMovers?.length || 0})
        </h3>
        {insights.topSlowMovers?.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Age
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {insights.topSlowMovers.map((product) => (
                  <tr
                    key={product.sku}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {product.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                      {product.currentStock} units
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {product.ageInDays} days
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={product.severity} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {product.recommendations[0]?.action || "Review"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No slow-moving products found
          </p>
        )}
      </div>

      {/* Dead Stock */}
      {insights.deadStock?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Dead Stock ({insights.deadStock.length})
          </h3>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 mb-4">
              These products have not sold in 6+ months. Consider deep discounts
              or removal.
            </p>
            <div className="space-y-3">
              {insights.deadStock.map((item) => (
                <div
                  key={item.sku}
                  className="bg-white dark:bg-gray-800 rounded p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.currentStock} units • ₹{item.currentValue} value
                    </p>
                  </div>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    {item.ageInMonths} months old
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const classes = {
    critical: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
    high: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    medium:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    low: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${classes[severity]}`}
    >
      {severity}
    </span>
  );
}
