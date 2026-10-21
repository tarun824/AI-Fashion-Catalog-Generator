import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, RefreshCw, History } from "lucide-react";
import { api } from "../../utils/api";
import { formatErrorMessage, logApiError } from "../../utils/errorHandler";
import { useToast } from "../../contexts/ToastContext";
import { formatDateTime, formatDuration } from "../../utils/apiLogHelpers";
import { StatusPill } from "./ApiCallBits";
import ApiCallDetailDrawer from "./ApiCallDetailDrawer";

/**
 * Collapsible "API history" for one order. Loads lazily on first expand.
 * Props: order (needs _id, optional marketplace.externalOrderId)
 */
export default function OrderApiHistory({ order }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calls, setCalls] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const orderKey = order?._id;
  const externalId = order?.marketplace?.externalOrderId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = [orderKey, externalId].filter(Boolean);
      const results = await Promise.all(
        ids.map((id) =>
          api.get(`/admin/api-calls?orderId=${encodeURIComponent(id)}&limit=20`),
        ),
      );
      const seen = new Map();
      results.forEach((r) => (r.data || []).forEach((c) => seen.set(c._id, c)));
      setCalls(
        [...seen.values()].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
      );
    } catch (err) {
      logApiError("Load order API history", err);
      const msg = formatErrorMessage(err);
      setError(msg);
      toast.error(msg, 8000);
    } finally {
      setLoading(false);
    }
  }, [orderKey, externalId, toast]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && calls === null && !loading) load();
  };

  if (!orderKey) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <History className="w-5 h-5" />
          API history
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading API calls...
            </div>
          )}
          {!loading && error && (
            <div className="text-sm text-red-800 dark:text-red-300 whitespace-pre-line">
              {error}
              <div>
                <button type="button" onClick={load} className="mt-2 min-h-[44px] underline">
                  Try again
                </button>
              </div>
            </div>
          )}
          {!loading && !error && calls && calls.length === 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              No external API calls recorded for this order yet.
            </p>
          )}
          {!loading && !error && calls && calls.length > 0 && (
            <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {calls.map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c._id)}
                      className="w-full min-h-[44px] py-2 flex items-center gap-2 text-left"
                    >
                      <StatusPill status={c.response?.status} />
                      <span className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">
                        {c.provider} / {c.operation}
                      </span>
                      <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDateTime(c.createdAt)} - {formatDuration(c.durationMs)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Link
                to={`/admin/api-logs?orderId=${encodeURIComponent(externalId || orderKey)}`}
                className="inline-flex items-center min-h-[44px] text-sm underline text-blue-700 dark:text-blue-300"
              >
                Open in API Logs
              </Link>
            </>
          )}
        </div>
      )}

      {selectedId && (
        <ApiCallDetailDrawer
          callId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
