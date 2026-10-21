/**
 * Integrations Management Page
 * Centralized page to manage all third-party integrations
 *
 * Features:
 * - View all available integrations
 * - Check connection status
 * - Test connections
 * - Copy webhook URLs
 * - View setup instructions
 * - Monitor integration health
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Settings,
  Package,
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Key,
  Download,
  UploadCloud,
  BookOpen,
  X,
} from "lucide-react";
import { api } from "../utils/api";
import { formatErrorMessage, logApiError } from "../utils/errorHandler";
import { useToast } from "../contexts/ToastContext";
import CredentialsModal from "../components/integrations/CredentialsModal";
import PublishModal from "../components/integrations/PublishModal";
import FetchSummary from "../components/integrations/FetchSummary";
import IntegrationDocsDrawer from "../components/integrations/IntegrationDocsDrawer";
import { summarizeFetchAll } from "../utils/integrationHelpers";

// Static class maps (Tailwind cannot see dynamically built class names)
const CATEGORY_STYLES = {
  shipping: {
    icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    pill: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    btn: "bg-blue-600 hover:bg-blue-700",
  },
  marketplace: {
    icon: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    pill: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
    btn: "bg-purple-600 hover:bg-purple-700",
  },
  payment: {
    icon: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    pill: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    btn: "bg-green-600 hover:bg-green-700",
  },
  messaging: {
    icon: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    pill: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    btn: "bg-orange-600 hover:bg-orange-700",
  },
  default: {
    icon: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    pill: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
    btn: "bg-gray-600 hover:bg-gray-700",
  },
};

const OUTLINE_BTN =
  "min-h-[44px] px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition flex items-center gap-2";

const HOW_KEY = "integrations.howItWorks.dismissed";
const HOW_STEPS = [
  ["Connect your account", "Paste your keys once. They are saved encrypted."],
  ["Fetch orders", "Click a button to pull orders. Nothing runs automatically."],
  ["Ship with Shiprocket", "Create shipments yourself, one order at a time."],
  ["Send tracking back", "Push the tracking number to the marketplace when ready."],
];

function readHowDismissed() {
  try {
    return localStorage.getItem(HOW_KEY) === "1";
  } catch (err) {
    console.warn("[Integrations] could not read localStorage", err);
    return false;
  }
}

export default function Integrations() {
  const toast = useToast();
  const [docsFor, setDocsFor] = useState(null); // { integration, tab, field }
  const [howDismissed, setHowDismissed] = useState(readHowDismissed);
  const [howOpen, setHowOpen] = useState(true);

  const dismissHow = () => {
    setHowDismissed(true);
    try {
      localStorage.setItem(HOW_KEY, "1");
    } catch (err) {
      console.warn("[Integrations] could not save localStorage", err);
    }
  };
  const openDocs = (integration, tab, field) =>
    setDocsFor({ integration, tab, field });
  const openDocsById = (id, tab) => {
    const found = integrations.find((i) => i.id === id);
    setDocsFor({ integration: found || { id, name: id }, tab });
  };
  const [credentialsFor, setCredentialsFor] = useState(null);
  const [publishFor, setPublishFor] = useState(null);
  const [fetchingId, setFetchingId] = useState(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchResults, setFetchResults] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/integrations");

      // The api.get() returns the parsed JSON directly
      // Backend returns: { success: true, integrations: [...] }
      if (response && response.integrations) {
        setIntegrations(response.integrations);
      } else {
        console.warn("⚠️ Unexpected response structure:", response);
        setIntegrations([]);
      }
    } catch (error) {
      logApiError("Load integrations", error);
      toast.error(formatErrorMessage(error), 8000);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (integrationId) => {
    setTestingId(integrationId);
    try {
      const response = await api.post(
        `/admin/integrations/${integrationId}/test`,
      );

      // api.post() returns parsed JSON directly
      // Backend returns: { success: true/false, message: "...", data: {...} }
      if (response.success) {
        toast.success(
          `${integrationId} connection successful. ${response.message || ""}`.trim(),
        );
      } else {
        toast.error(
          `${integrationId} test failed: ${response.message || "unknown reason"}. Check the saved keys and try again.`,
          8000,
        );
      }

      // Reload to update status
      await loadIntegrations();
    } catch (error) {
      logApiError(`Test ${integrationId}`, error);
      toast.error(formatErrorMessage(error), 8000);
    } finally {
      setTestingId(null);
    }
  };

  const copyWebhookUrl = async (url, integrationId) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedWebhook(integrationId);
      setTimeout(() => setCopiedWebhook(null), 2000);
    } catch (error) {
      console.error("Failed to copy webhook URL:", error);
      toast.error(
        "Could not copy the webhook URL. Select and copy it manually.",
      );
    }
  };

  const fetchOrders = async (integration) => {
    setFetchingId(integration.id);
    try {
      const res = await api.post(
        `/admin/integrations/${integration.id}/fetch-orders`,
        {},
      );
      setFetchResults({ [integration.id]: res });
      toast.success(
        `${integration.name}: ${res.imported ?? 0} new, ${res.updated ?? 0} updated order(s).`,
      );
      await loadIntegrations();
    } catch (error) {
      logApiError(`Fetch orders ${integration.id}`, error);
      toast.error(formatErrorMessage(error), 8000);
    } finally {
      setFetchingId(null);
    }
  };

  const fetchAllOrders = async () => {
    setFetchingAll(true);
    try {
      const res = await api.post("/admin/integrations/fetch-all", {});
      setFetchResults(res.results || {});
      const { message, tone } = summarizeFetchAll(res.results);
      toast[tone](message, 7000);
      await loadIntegrations();
    } catch (error) {
      logApiError("Fetch orders from all", error);
      toast.error(formatErrorMessage(error), 8000);
    } finally {
      setFetchingAll(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "shipping":
        return <Package className="w-6 h-6" />;
      case "marketplace":
        return <ShoppingCart className="w-6 h-6" />;
      case "payment":
        return <CreditCard className="w-6 h-6" />;
      case "messaging":
        return <MessageSquare className="w-6 h-6" />;
      default:
        return <Settings className="w-6 h-6" />;
    }
  };

  const getCategoryStyle = (category) =>
    CATEGORY_STYLES[category] || CATEGORY_STYLES.default;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg w-12 h-12"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Integration Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl w-16 h-16"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Integrations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your store with shipping, marketplaces, payments & messaging
            services
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {integrations.some((i) => i.capabilities?.fetchOrders) && (
            <button
              onClick={fetchAllOrders}
              disabled={fetchingAll}
              className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition flex items-center gap-2"
            >
              {fetchingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Fetching orders...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Fetch orders from all
                </>
              )}
            </button>
          )}
          <button
            onClick={loadIntegrations}
            className="min-h-[44px] px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>
      </div>

      {fetchResults && (
        <FetchSummary
          results={fetchResults}
          onDismiss={() => setFetchResults(null)}
          onOpenDocs={openDocsById}
        />
      )}

      {/* How integrations work */}
      {!howDismissed && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setHowOpen((v) => !v)}
              aria-expanded={howOpen}
              className="flex-1 min-h-[44px] flex items-center gap-2 text-left font-semibold text-gray-900 dark:text-white"
            >
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              How integrations work
              {howOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={dismissHow}
              aria-label="Dismiss how integrations work"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {howOpen && (
            <>
              <ol className="mt-2 space-y-2">
                {HOW_STEPS.map(([title, text], i) => (
                  <li key={title} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </span>
                    <p className="text-gray-800 dark:text-gray-200">
                      <strong>{title}</strong> - {text}
                    </p>
                  </li>
                ))}
              </ol>
              <Link
                to="/admin/api-logs"
                className="inline-flex items-center min-h-[44px] mt-1 text-sm underline text-blue-700 dark:text-blue-300"
              >
                View API Logs
              </Link>
            </>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              <strong>{integrations.length} integrations available</strong> -
              Set them up to unlock powerful features for your store
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Click "Test Connection" to verify setup • Copy webhook URLs for
              real-time sync • View docs for setup instructions
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {integrations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connected
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {integrations.filter((i) => i.status.connected).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configured
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {
                  integrations.filter(
                    (i) => i.configured && !i.status.connected,
                  ).length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Not Setup
              </p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {integrations.filter((i) => !i.configured).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {integrations.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
              <Zap className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Integrations Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Unable to load integrations. Please check your backend connection.
          </p>
          <button
            onClick={loadIntegrations}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            Retry Loading
          </button>
        </div>
      )}

      {/* Integrations List */}
      <div className="space-y-4">
        {integrations.map((integration) => {
          const style = getCategoryStyle(integration.category);
          const features = integration.features || [];
          const caps = integration.capabilities || {};
          const isExpanded = expandedId === integration.id;

          return (
            <div
              key={integration.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:scale-[1.01]"
            >
              {/* Main Card */}
              <div className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`p-3 ${style.icon} rounded-xl flex-shrink-0`}
                  >
                    {getCategoryIcon(integration.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {integration.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${style.pill}`}
                          >
                            {integration.category}
                          </span>
                          {!integration.configured && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 animate-pulse">
                              ⚡ Setup Available
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {integration.description}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {integration.status.connected ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Connected
                            </span>
                          </div>
                        ) : integration.configured ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                              Configured
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <XCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Not Setup
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Message */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {integration.status.message}
                      {" • "}
                      Last checked:{" "}
                      {new Date(
                        integration.status.lastChecked,
                      ).toLocaleTimeString()}
                      {integration.lastSyncAt && (
                        <>
                          {" • "}Orders last synced:{" "}
                          {new Date(integration.lastSyncAt).toLocaleString()}
                        </>
                      )}
                    </p>

                    {/* API logs links */}
                    <div className="flex flex-wrap gap-x-4 mb-2">
                      <Link
                        to={`/admin/api-logs?provider=${encodeURIComponent(integration.id)}`}
                        className="inline-flex items-center min-h-[44px] text-sm underline text-blue-700 dark:text-blue-300"
                      >
                        View logs
                      </Link>
                      {integration.lastSyncCorrelationId && (
                        <Link
                          to={`/admin/api-logs?correlationId=${encodeURIComponent(integration.lastSyncCorrelationId)}`}
                          className="inline-flex items-center min-h-[44px] text-sm underline text-blue-700 dark:text-blue-300"
                        >
                          {integration.lastError
                            ? "Last sync calls (failed)"
                            : "Last sync calls"}
                        </Link>
                      )}
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {features
                        .slice(0, 3)
                        .map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md"
                          >
                            {feature}
                          </span>
                        ))}
                      {features.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md">
                          +{features.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openDocs(integration)}
                        aria-label={`${integration.name} setup guide`}
                        className={OUTLINE_BTN}
                      >
                        <BookOpen className="w-4 h-4" />
                        Guide
                      </button>
                      {integration.hasCredentialFields && (
                        <button
                          onClick={() => setCredentialsFor(integration)}
                          className={`min-h-[44px] px-4 py-2 text-white rounded-lg font-medium transition flex items-center gap-2 ${style.btn}`}
                        >
                          <Key className="w-4 h-4" />
                          {integration.configured ? "Edit keys" : "Connect"}
                        </button>
                      )}

                      <button
                        onClick={() => testConnection(integration.id)}
                        disabled={testingId === integration.id}
                        className={
                          integration.hasCredentialFields
                            ? OUTLINE_BTN
                            : `min-h-[44px] px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition flex items-center gap-2 ${style.btn}`
                        }
                      >
                        {testingId === integration.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Test Connection
                          </>
                        )}
                      </button>

                      {caps.fetchOrders && integration.configured && (
                        <button
                          onClick={() => fetchOrders(integration)}
                          disabled={
                            fetchingId === integration.id || fetchingAll
                          }
                          className={OUTLINE_BTN}
                        >
                          {fetchingId === integration.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Fetching...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Fetch orders
                            </>
                          )}
                        </button>
                      )}

                      {caps.publishProducts && integration.configured && (
                        <button
                          onClick={() => setPublishFor(integration)}
                          className={OUTLINE_BTN}
                        >
                          <UploadCloud className="w-4 h-4" />
                          Publish products
                        </button>
                      )}

                      {integration.webhookUrl && (
                      <button
                        onClick={() =>
                          copyWebhookUrl(integration.webhookUrl, integration.id)
                        }
                        className={OUTLINE_BTN}
                      >
                        {copiedWebhook === integration.id ? (
                          <>
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Webhook
                          </>
                        )}
                      </button>
                      )}

                      {integration.docsUrl && (
                      <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={OUTLINE_BTN}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Docs
                      </a>
                      )}

                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : integration.id)
                        }
                        className={OUTLINE_BTN}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Details
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6">
                  {/* Setup Instructions for Not Configured */}
                  {!integration.configured && !integration.hasCredentialFields && (
                    <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                            Setup Required
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-3">
                            Add these environment variables to your{" "}
                            <code className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs font-mono">
                              backend/.env
                            </code>{" "}
                            file:
                          </p>
                          <div className="bg-yellow-900/10 dark:bg-black/20 border border-yellow-300 dark:border-yellow-800 rounded p-3 font-mono text-xs text-yellow-900 dark:text-yellow-300">
                            {integration.id === "shiprocket" &&
                              "# Shiprocket Configuration\nSHIPROCKET_EMAIL=your-email@example.com\nSHIPROCKET_PASSWORD=your-password"}
                            {integration.id === "flipkart" &&
                              "# Flipkart Configuration\nFLIPKART_API_KEY=your-api-key\nFLIPKART_API_SECRET=your-api-secret\nFLIPKART_SELLER_ID=your-seller-id"}
                            {integration.id === "amazon" &&
                              "# Amazon Configuration\nAMAZON_SELLER_ID=your-seller-id\nAMAZON_MWS_AUTH_TOKEN=your-auth-token\nAMAZON_AWS_ACCESS_KEY=your-access-key\nAMAZON_AWS_SECRET_KEY=your-secret-key"}
                            {integration.id === "razorpay" &&
                              "# Razorpay Configuration\nRAZORPAY_KEY_ID=your-key-id\nRAZORPAY_KEY_SECRET=your-key-secret"}
                            {integration.id === "whatsapp" &&
                              "# WhatsApp Business Configuration\nWHATSAPP_BUSINESS_ID=your-business-id\nWHATSAPP_ACCESS_TOKEN=your-access-token\nWHATSAPP_PHONE_NUMBER=your-phone-number"}
                          </div>
                          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                            💡 After adding credentials, restart the backend
                            server and click "Test Connection"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Webhook URL */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Webhook URL
                      </h4>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <code className="text-sm text-gray-700 dark:text-gray-300 break-all">
                          {integration.webhookUrl}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Configure this URL in {integration.name} dashboard to
                        receive real-time updates
                      </p>
                    </div>

                    {/* All Features */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Features
                      </h4>
                      <ul className="space-y-2">
                        {features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {credentialsFor && (
        <CredentialsModal
          integration={credentialsFor}
          onClose={() => setCredentialsFor(null)}
          onChanged={loadIntegrations}
          onOpenDocs={(tab, field) => openDocs(credentialsFor, tab, field)}
        />
      )}
      {docsFor && (
        <IntegrationDocsDrawer
          providerId={docsFor.integration.id}
          providerName={docsFor.integration.name}
          initialTab={docsFor.tab}
          focusField={docsFor.field}
          onClose={() => setDocsFor(null)}
        />
      )}
      {publishFor && (
        <PublishModal
          providerId={publishFor.id}
          onClose={() => setPublishFor(null)}
          onPublished={loadIntegrations}
        />
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 shadow-lg">
        <div className="flex items-start gap-6">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-xl shadow-md">
            <AlertCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              🚀 Quick Setup Guide
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Get API credentials</strong> from the service provider
                  (Shiprocket, Flipkart, etc.)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Add to environment</strong> - Click "Show Details" on
                  any integration above to see required variables
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Restart backend</strong> server to load new
                  credentials
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Test connection</strong> using the "Test Connection"
                  button to verify setup
                </p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="text-lg">📖</span>
                <span>
                  For detailed setup instructions, click "Docs" on each
                  integration card or visit their official documentation
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
