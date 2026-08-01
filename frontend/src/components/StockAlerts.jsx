import { useState } from "react";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Clock,
  CheckCircle,
  X,
} from "lucide-react";

export default function StockAlerts({ alerts, onRefresh }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState("all"); // all, critical, warnings, opportunities

  if (!alerts) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        Loading alerts...
      </div>
    );
  }

  const getFilteredAlerts = () => {
    if (filter === "critical") return alerts.critical;
    if (filter === "warnings") return alerts.warnings;
    if (filter === "opportunities") return alerts.opportunities;

    return [
      ...alerts.critical.map((a) => ({ ...a, category: "critical" })),
      ...alerts.warnings.map((a) => ({ ...a, category: "warning" })),
      ...alerts.opportunities.map((a) => ({ ...a, category: "opportunity" })),
    ];
  };

  const filteredAlerts = getFilteredAlerts();

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AlertSummaryCard
          label="Critical Alerts"
          count={alerts.critical.length}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          active={filter === "critical"}
          onClick={() => setFilter("critical")}
        />
        <AlertSummaryCard
          label="Warnings"
          count={alerts.warnings.length}
          icon={<Package className="w-5 h-5" />}
          color="orange"
          active={filter === "warnings"}
          onClick={() => setFilter("warnings")}
        />
        <AlertSummaryCard
          label="Opportunities"
          count={alerts.opportunities.length}
          icon={<TrendingDown className="w-5 h-5" />}
          color="green"
          active={filter === "opportunities"}
          onClick={() => setFilter("opportunities")}
        />
        <AlertSummaryCard
          label="All Alerts"
          count={
            alerts.critical.length +
            alerts.warnings.length +
            alerts.opportunities.length
          }
          icon={<Package className="w-5 h-5" />}
          color="blue"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </div>

      {/* Alerts List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {filter === "all"
              ? "All Alerts"
              : filter === "critical"
                ? "Critical Alerts"
                : filter === "warnings"
                  ? "Warnings"
                  : "Opportunities"}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({filteredAlerts.length})
            </span>
          </h3>
          <button
            onClick={onRefresh}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Refresh
          </button>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              No alerts in this category
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Everything looks good!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert, idx) => (
              <AlertCard
                key={`${alert.sku}-${idx}`}
                alert={alert}
                onClick={() => setSelectedAlert(alert)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}

// ==================== Sub Components ====================

function AlertSummaryCard({ label, count, icon, color, active, onClick }) {
  const colorClasses = {
    red: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-600 dark:text-red-400",
      active: "ring-2 ring-red-500",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-600 dark:text-orange-400",
      active: "ring-2 ring-orange-500",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-600 dark:text-green-400",
      active: "ring-2 ring-green-500",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-600 dark:text-blue-400",
      active: "ring-2 ring-blue-500",
    },
  };

  const classes = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`
        ${classes.bg} border ${classes.border} rounded-lg p-4 text-left
        transition-all hover:shadow-md
        ${active ? classes.active : ""}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={classes.text}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {count}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {label}
          </p>
        </div>
      </div>
    </button>
  );
}

function AlertCard({ alert, onClick }) {
  const getAlertStyle = (category) => {
    switch (category) {
      case "critical":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          icon: (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ),
          badge: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
        };
      case "warning":
        return {
          bg: "bg-orange-50 dark:bg-orange-900/20",
          border: "border-orange-200 dark:border-orange-800",
          icon: (
            <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          ),
          badge:
            "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
        };
      case "opportunity":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          icon: (
            <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
          ),
          badge:
            "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
        };
      default:
        const type = alert.type;
        if (type === "out_of_stock" || type === "low_stock") {
          return {
            bg: "bg-red-50 dark:bg-red-900/20",
            border: "border-red-200 dark:border-red-800",
            icon: (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ),
            badge:
              "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
          };
        }
        if (type === "overstock") {
          return {
            bg: "bg-orange-50 dark:bg-orange-900/20",
            border: "border-orange-200 dark:border-orange-800",
            icon: (
              <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            ),
            badge:
              "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
          };
        }
        if (type === "dead_stock") {
          return {
            bg: "bg-gray-50 dark:bg-gray-900/20",
            border: "border-gray-300 dark:border-gray-700",
            icon: (
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ),
            badge:
              "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
          };
        }
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          icon: (
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ),
          badge:
            "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
        };
    }
  };

  const style = getAlertStyle(alert.category || alert.type);

  return (
    <div
      onClick={onClick}
      className={`
        ${style.bg} border ${style.border} rounded-lg p-4 
        cursor-pointer hover:shadow-md transition-shadow
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {alert.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {alert.sku}
              </p>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${style.badge}`}
            >
              {alert.type?.replace(/_/g, " ") || alert.category}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {alert.message}
          </p>
          {alert.action && (
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
              → {alert.action}
            </p>
          )}
          {alert.currentStock !== undefined && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
              <span>Stock: {alert.currentStock}</span>
              {alert.daysUntilStockout && (
                <span>Days left: {alert.daysUntilStockout}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertDetailModal({ alert, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alert Details
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {alert.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Product Name
            </p>
            <p className="text-base text-gray-900 dark:text-white">
              {alert.name}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Alert Type
            </p>
            <p className="text-base text-gray-900 dark:text-white capitalize">
              {(alert.type || alert.category)?.replace(/_/g, " ")}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Message
            </p>
            <p className="text-base text-gray-900 dark:text-white">
              {alert.message}
            </p>
          </div>

          {alert.currentStock !== undefined && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Current Stock
              </p>
              <p className="text-base text-gray-900 dark:text-white">
                {alert.currentStock} units
              </p>
            </div>
          )}

          {alert.threshold !== undefined && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Threshold
              </p>
              <p className="text-base text-gray-900 dark:text-white">
                {alert.threshold} units
              </p>
            </div>
          )}

          {alert.daysUntilStockout && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Estimated Days Until Stockout
              </p>
              <p className="text-base text-gray-900 dark:text-white">
                {alert.daysUntilStockout} days
              </p>
            </div>
          )}

          {alert.salesVelocity !== undefined && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Sales Velocity
              </p>
              <p className="text-base text-gray-900 dark:text-white">
                {alert.salesVelocity} units/day
              </p>
            </div>
          )}

          {alert.ageInDays !== undefined && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Product Age
              </p>
              <p className="text-base text-gray-900 dark:text-white">
                {alert.ageInDays} days
              </p>
            </div>
          )}

          {alert.action && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Recommended Action
              </p>
              <p className="text-base text-gray-900 dark:text-white">
                {alert.action}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            Close
          </button>
          <button
            onClick={() => {
              // Navigate to product edit page
              window.location.href = `/admin/products/${alert.productId}/edit`;
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium"
          >
            Edit Product
          </button>
        </div>
      </div>
    </div>
  );
}
