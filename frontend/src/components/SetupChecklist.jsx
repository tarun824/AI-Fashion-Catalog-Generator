import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

/**
 * SetupChecklist Component
 * Shows onboarding progress and guides users through initial setup
 */
export default function SetupChecklist() {
  const [setupStatus, setSetupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadSetupStatus();
  }, []);

  const loadSetupStatus = async () => {
    try {
      const response = await api.get("/admin/setup/status");
      // api.get() already returns parsed JSON, so response = { success, data }
      const data = response.data;
      setSetupStatus(data);

      // Auto-dismiss if fully complete
      if (data?.allComplete) {
        const dismissed = localStorage.getItem("setupChecklistDismissed");
        setDismissed(dismissed === "true");
      }
    } catch (error) {
      console.error("Failed to load setup status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("setupChecklistDismissed", "true");
    setDismissed(true);
  };

  if (loading || dismissed) return null;

  const { checklist, progress, allComplete } = setupStatus || {};

  // Don't show if no checklist data
  if (!checklist) return null;

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-lg border-2 border-indigo-200 dark:border-indigo-800 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🎯 Setup Progress
            {allComplete && (
              <span className="text-sm font-normal px-2 py-0.5 bg-green-500 text-white rounded-full">
                Complete!
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {allComplete
              ? "You're all set! Start managing your store."
              : "Complete these steps to unlock all features"}
          </p>
        </div>

        {allComplete && (
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            title="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {completedCount} of {totalCount} completed
          </span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {percentage}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        <ChecklistItem
          completed={checklist.uploadedProducts}
          icon="📤"
          label="Upload products"
          description="Add your first products to the catalog"
          action={
            !checklist.uploadedProducts && {
              label: "Upload now",
              link: "/admin/batch-upload",
            }
          }
        />

        <ChecklistItem
          completed={checklist.publishedProduct}
          icon="✅"
          label="Publish a product"
          description="Make at least one product visible to customers"
          action={
            !checklist.publishedProduct &&
            checklist.uploadedProducts && {
              label: "View products",
              link: "/admin/products",
            }
          }
        />

        <ChecklistItem
          completed={checklist.configuredStore}
          icon="⚙️"
          label="Configure store settings"
          description="Set up WhatsApp, payment & shipping options"
          action={
            !checklist.configuredStore && {
              label: "Configure",
              link: "/admin/integrations",
            }
          }
        />

        <ChecklistItem
          completed={checklist.invitedVendor}
          icon="👥"
          label="Invite vendors (optional)"
          description="Allow others to upload products"
          action={
            !checklist.invitedVendor && {
              label: "View vendors",
              link: "/admin/vendors",
            }
          }
        />

        <ChecklistItem
          completed={checklist.firstOrder}
          icon="🎉"
          label="Receive your first order"
          description="Start selling and track orders"
          action={
            !checklist.firstOrder &&
            checklist.publishedProduct && {
              label: "Share store",
              link: "/",
            }
          }
        />
      </div>

      {/* Completion Reward */}
      {allComplete && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                All features unlocked!
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                You have access to AI pricing, analytics, and bulk operations
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ChecklistItem Component
 */
function ChecklistItem({ completed, icon, label, description, action }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition ${
        completed
          ? "bg-white/50 dark:bg-gray-800/30"
          : "bg-white dark:bg-gray-800"
      }`}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {completed ? (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-400 dark:bg-gray-600 rounded-full" />
          </div>
        )}
      </div>

      {/* Icon */}
      <span className="text-2xl flex-shrink-0">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${
            completed
              ? "text-gray-500 dark:text-gray-400 line-through"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>

      {/* Action Button */}
      {!completed && action && (
        <Link
          to={action.link}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
