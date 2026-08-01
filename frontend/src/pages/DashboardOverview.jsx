import { useEffect, useState } from "react";
import { api } from "../utils/api";
import CatalogValueWidget from "../components/CatalogValueWidget";
import TopProductsWidget from "../components/TopProductsWidget";
import InventoryAlertsWidget from "../components/InventoryAlertsWidget";
import VendorInsightsWidget from "../components/VendorInsightsWidget";
import RecentActivityWidget from "../components/RecentActivityWidget";
import QuickActionsPanel from "../components/QuickActionsPanel";
import SetupChecklist from "../components/SetupChecklist";

export default function DashboardOverview() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 60 seconds
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.get("/admin/analytics/dashboard");
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-6 py-4 rounded-xl">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold">Error loading dashboard</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg transition text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Dashboard Overview 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Complete analytics and insights for your fashion catalog
              </p>
            </div>
            {!loading && (
              <button
                onClick={loadDashboardData}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <svg
                  className="w-4 h-4 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Refresh
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Setup Checklist (shows until complete) */}
            <SetupChecklist />

            {/* Catalog Value Widget */}
            <CatalogValueWidget
              data={dashboardData?.catalog}
              loading={loading}
            />

            {/* Top Products & Performance */}
            <TopProductsWidget
              data={dashboardData?.performance}
              loading={loading}
            />
          </div>

          {/* Right Column - Quick Actions & Insights */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActionsPanel />

            {/* Vendor Insights */}
            <VendorInsightsWidget
              data={dashboardData?.customers}
              loading={loading}
            />
          </div>
        </div>

        {/* Bottom Section - Inventory & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Inventory Alerts */}
          <InventoryAlertsWidget
            data={dashboardData?.inventory}
            loading={loading}
          />

          {/* Recent Activity */}
          <RecentActivityWidget
            data={dashboardData?.activity}
            loading={loading}
          />
        </div>

        {/* Footer Stats Bar */}
        {dashboardData && !loading && (
          <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold mb-1">
                  {dashboardData.catalog?.productCount || 0}
                </p>
                <p className="text-sm text-indigo-100">Total Products</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold mb-1">
                  {dashboardData.catalog?.addedThisMonth || 0}
                </p>
                <p className="text-sm text-indigo-100">Added This Month</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold mb-1">
                  {dashboardData.inventory?.lowStockCount || 0}
                </p>
                <p className="text-sm text-indigo-100">Low Stock Alerts</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold mb-1">
                  {dashboardData.customers?.totalVendors || 0}
                </p>
                <p className="text-sm text-indigo-100">Active Vendors</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && !dashboardData && (
          <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-600 dark:border-t-indigo-400 mb-4"></div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Loading dashboard...
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Calculating analytics
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
