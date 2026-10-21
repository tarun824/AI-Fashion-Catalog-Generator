/**
 * API Logs: every call made to / received from external systems
 * (marketplaces, Shiprocket). Read-only viewer over /admin/api-calls.
 * Filters are mirrored in the URL so other screens can deep-link, e.g.
 * /admin/api-logs?correlationId=abc or ?provider=amazon&success=false
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, SlidersHorizontal, X, Inbox, AlertCircle } from "lucide-react";
import { api } from "../utils/api";
import { formatErrorMessage, logApiError } from "../utils/errorHandler";
import { useToast } from "../contexts/ToastContext";
import { SourceBadge } from "../components/integrations/ChannelChips";
import { StatusPill, SuccessIcon } from "../components/integrations/ApiCallBits";
import ApiCallDetailDrawer from "../components/integrations/ApiCallDetailDrawer";
import { channelLabel } from "../utils/channelHelpers";
import {
  LOG_PROVIDERS,
  formatDateTime,
  formatDuration,
  rateTone,
} from "../utils/apiLogHelpers";

const PAGE_SIZE = 25;

const TONE_CARD = {
  green:
    "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20",
  amber:
    "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20",
  red: "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20",
  slate: "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800",
};
const TONE_TEXT = {
  green: "text-green-800 dark:text-green-300",
  amber: "text-amber-800 dark:text-amber-300",
  red: "text-red-800 dark:text-red-300",
  slate: "text-gray-800 dark:text-gray-200",
};

const INPUT =
  "w-full min-h-[44px] px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400";
const CHIP_BASE =
  "min-h-[44px] px-4 rounded-full text-sm font-medium border transition";
const CHIP_ON =
  "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500";
const CHIP_OFF =
  "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${CHIP_BASE} ${active ? CHIP_ON : CHIP_OFF}`}
    >
      {children}
    </button>
  );
}

/** Convert the URL range selection into ISO from/to for the API. */
function rangeToDates(range, fromDate, toDate) {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString() };
  }
  if (range === "7d") {
    return { from: new Date(now.getTime() - 7 * 86400000).toISOString() };
  }
  if (range === "custom") {
    const out = {};
    if (fromDate) out.from = new Date(`${fromDate}T00:00:00`).toISOString();
    if (toDate) out.to = new Date(`${toDate}T23:59:59.999`).toISOString();
    return out;
  }
  return {};
}

function StatsCards({ stats, loading, error, activeProvider, onPick, onRetry }) {
  if (loading && !stats) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading last 24h health...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg p-3">
        <span>Could not load the 24h summary.</span>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] px-3 underline"
        >
          Retry
        </button>
      </div>
    );
  }
  const providers = stats?.providers || [];
  if (providers.length === 0) {
    return (
      <p className="text-sm text-gray-700 dark:text-gray-300">
        No external API calls in the last 24 hours.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {providers.map((p) => {
        const tone = rateTone(p.successRate);
        const active = activeProvider === p.provider;
        return (
          <button
            key={p.provider}
            type="button"
            onClick={() => onPick(active ? "" : p.provider)}
            aria-pressed={active}
            className={`text-left rounded-xl border-2 p-3 transition ${TONE_CARD[tone]} ${active ? "ring-2 ring-blue-500" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">
                {channelLabel(p.provider)}
              </span>
              <span className={`text-lg font-bold ${TONE_TEXT[tone]}`}>
                {p.successRate == null ? "-" : `${p.successRate}%`}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-700 dark:text-gray-300">
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {p.total}
                </div>
                calls
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatDuration(p.avgDurationMs)}
                </div>
                avg
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatDuration(p.p95DurationMs)}
                </div>
                p95
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">
              {p.failures > 0
                ? `${p.failures} failed, last ${formatDateTime(p.lastFailureAt)}`
                : "No failures"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FilterFields({ filters, setParam, setParams, orderDraft, setOrderDraft, corrDraft, setCorrDraft, onSubmitText }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="log-provider" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
          Provider
        </label>
        <select
          id="log-provider"
          value={filters.provider}
          onChange={(e) => setParam("provider", e.target.value)}
          className={INPUT}
        >
          <option value="">All providers</option>
          {LOG_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {channelLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Result</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.success === ""} onClick={() => setParam("success", "")}>All</Chip>
          <Chip active={filters.success === "true"} onClick={() => setParam("success", "true")}>Success</Chip>
          <Chip active={filters.success === "false"} onClick={() => setParam("success", "false")}>Failed</Chip>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">HTTP status</div>
        <div className="flex flex-wrap gap-2">
          {["", "2xx", "4xx", "5xx"].map((c) => (
            <Chip key={c || "any"} active={filters.statusClass === c} onClick={() => setParam("statusClass", c)}>
              {c || "Any"}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">When</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.range === ""} onClick={() => setParams({ range: "", from: "", to: "" })}>Any time</Chip>
          <Chip active={filters.range === "today"} onClick={() => setParams({ range: "today", from: "", to: "" })}>Today</Chip>
          <Chip active={filters.range === "7d"} onClick={() => setParams({ range: "7d", from: "", to: "" })}>7 days</Chip>
          <Chip active={filters.range === "custom"} onClick={() => setParam("range", "custom")}>Custom</Chip>
        </div>
        {filters.range === "custom" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="log-from" className="block text-xs text-gray-700 dark:text-gray-300">From</label>
              <input id="log-from" type="date" value={filters.from} onChange={(e) => setParam("from", e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="log-to" className="block text-xs text-gray-700 dark:text-gray-300">To</label>
              <input id="log-to" type="date" value={filters.to} onChange={(e) => setParam("to", e.target.value)} className={INPUT} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label htmlFor="log-order" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Order ID</label>
          <input
            id="log-order"
            value={orderDraft}
            onChange={(e) => setOrderDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitText()}
            onBlur={onSubmitText}
            placeholder="Order or marketplace order ID"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="log-corr" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Correlation ID</label>
          <input
            id="log-corr"
            value={corrDraft}
            onChange={(e) => setCorrDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitText()}
            onBlur={onSubmitText}
            placeholder="Shared by all calls of one click"
            className={INPUT}
          />
        </div>
      </div>
    </div>
  );
}

export default function ApiLogs() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      provider: searchParams.get("provider") || "",
      success: searchParams.get("success") || "",
      statusClass: searchParams.get("statusClass") || "",
      correlationId: searchParams.get("correlationId") || "",
      orderId: searchParams.get("orderId") || "",
      range: searchParams.get("range") || "",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
    }),
    [searchParams],
  );

  const [orderDraft, setOrderDraft] = useState(filters.orderId);
  const [corrDraft, setCorrDraft] = useState(filters.correlationId);
  useEffect(() => setOrderDraft(filters.orderId), [filters.orderId]);
  useEffect(() => setCorrDraft(filters.correlationId), [filters.correlationId]);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const requestRef = useRef(0);

  const setParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );
  const setParam = useCallback((k, v) => setParams({ [k]: v }), [setParams]);

  const submitText = useCallback(() => {
    const o = orderDraft.trim();
    const c = corrDraft.trim();
    if (o !== filters.orderId || c !== filters.correlationId) {
      setParams({ orderId: o, correlationId: c });
    }
  }, [orderDraft, corrDraft, filters.orderId, filters.correlationId, setParams]);

  const queryString = useCallback(
    (pageNumber) => {
      const q = new URLSearchParams();
      ["provider", "success", "statusClass", "correlationId", "orderId"].forEach((k) => {
        if (filters[k]) q.set(k, filters[k]);
      });
      const dates = rangeToDates(filters.range, filters.from, filters.to);
      if (dates.from) q.set("from", dates.from);
      if (dates.to) q.set("to", dates.to);
      q.set("page", String(pageNumber));
      q.set("limit", String(PAGE_SIZE));
      return q.toString();
    },
    [filters],
  );

  const loadPage = useCallback(
    async (pageNumber, append) => {
      const reqId = ++requestRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/admin/api-calls?${queryString(pageNumber)}`);
        if (reqId !== requestRef.current) return;
        setRows((prev) => (append ? [...prev, ...res.data] : res.data));
        setPage(res.page);
        setTotal(res.total);
        setHasMore(res.hasMore);
      } catch (err) {
        if (reqId !== requestRef.current) return;
        logApiError("Load API logs", err);
        const msg = formatErrorMessage(err);
        setError(msg);
        toast.error(msg, 8000);
      } finally {
        if (reqId === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [queryString, toast],
  );

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await api.get("/admin/api-calls/stats?hours=24");
      setStats(res);
    } catch (err) {
      logApiError("Load API stats", err);
      setStatsError(true);
      toast.error(formatErrorMessage(err), 8000);
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const activeCount = [
    filters.provider,
    filters.success,
    filters.statusClass,
    filters.correlationId,
    filters.orderId,
    filters.range,
  ].filter(Boolean).length;

  const clearAll = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const refresh = () => {
    loadPage(1, false);
    loadStats();
  };

  const showCorrelation = (cid) => {
    setSelectedId(null);
    setParams({ correlationId: cid });
  };

  const fieldProps = {
    filters,
    setParam,
    setParams,
    orderDraft,
    setOrderDraft,
    corrDraft,
    setCorrDraft,
    onSubmitText: submitText,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Logs</h1>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Every call to Amazon, Flipkart, Shiprocket and other services.
            Secrets and buyer personal data are masked.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="min-h-[44px] px-3 inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <section aria-label="Last 24 hours">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Last 24 hours
        </h2>
        <StatsCards
          stats={stats}
          loading={statsLoading}
          error={statsError}
          activeProvider={filters.provider}
          onPick={(p) => setParam("provider", p)}
          onRetry={loadStats}
        />
      </section>

      {/* Filters: inline on desktop, bottom sheet on mobile */}
      <div className="hidden sm:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <FilterFields {...fieldProps} />
        {activeCount > 0 && (
          <button type="button" onClick={clearAll} className="mt-3 min-h-[44px] px-3 text-sm underline text-gray-800 dark:text-gray-200">
            Clear all filters
          </button>
        )}
      </div>
      <div className="sm:hidden flex gap-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {activeCount > 0 && (
          <button type="button" onClick={clearAll} className="min-h-[44px] px-3 text-sm underline text-gray-800 dark:text-gray-200">
            Clear
          </button>
        )}
      </div>

      {sheetOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" onClick={() => { submitText(); setSheetOpen(false); }} className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
              <button type="button" aria-label="Close" onClick={() => { submitText(); setSheetOpen(false); }} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-800 dark:text-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterFields {...fieldProps} />
            <button
              type="button"
              onClick={() => { submitText(); setSheetOpen(false); }}
              className="mt-4 w-full min-h-[44px] rounded-lg bg-blue-600 text-white font-semibold"
            >
              Show {loading ? "" : `${total} `}results
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-700 dark:text-gray-300">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading API calls...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-900 dark:text-red-200">
          <div className="flex items-start gap-2 whitespace-pre-line">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
          <button type="button" onClick={() => loadPage(1, false)} className="mt-3 min-h-[44px] px-4 rounded-lg border border-red-400 dark:border-red-700 font-medium">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <Inbox className="w-10 h-10 mx-auto text-gray-500 dark:text-gray-400" />
          <p className="mt-2 font-medium text-gray-900 dark:text-white">No API calls match</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {activeCount > 0
              ? "Try clearing a filter, or widen the date range."
              : "Calls appear here after you fetch orders, publish products or ship an order."}
          </p>
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="mt-3 min-h-[44px] px-4 rounded-lg bg-blue-600 text-white font-medium">
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing {rows.length} of {total}
            {filters.correlationId && " calls in one click"}
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-gray-800 dark:text-gray-200">
                <tr>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Provider</th>
                  <th className="px-3 py-2 font-semibold">Operation</th>
                  <th className="px-3 py-2 font-semibold">Request</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Time taken</th>
                  <th className="px-3 py-2 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-900 dark:text-gray-100">
                {rows.map((r) => (
                  <tr
                    key={r._id}
                    tabIndex={0}
                    onClick={() => setSelectedId(r._id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(r._id)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700/50"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="px-3 py-2"><SourceBadge source={r.provider} /></td>
                    <td className="px-3 py-2">
                      {r.operation}
                      {r.attempt > 1 && (
                        <span className="ml-1 text-xs text-amber-800 dark:text-amber-300">retry #{r.attempt}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs max-w-xs truncate" title={r.request?.url}>
                      <span className="font-bold">{r.request?.method}</span> {r.request?.url}
                    </td>
                    <td className="px-3 py-2"><StatusPill status={r.response?.status} /></td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDuration(r.durationMs)}</td>
                    <td className="px-3 py-2"><SuccessIcon success={r.success} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-2">
            {rows.map((r) => (
              <li key={r._id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r._id)}
                  className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <SourceBadge source={r.provider} />
                    <div className="flex items-center gap-2">
                      <StatusPill status={r.response?.status} />
                      <SuccessIcon success={r.success} />
                    </div>
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {r.operation}
                    {r.attempt > 1 && (
                      <span className="ml-1 text-xs text-amber-800 dark:text-amber-300">retry #{r.attempt}</span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                    <span className="font-bold">{r.request?.method}</span> {r.request?.url}
                  </div>
                  {!r.success && r.errorMessage && (
                    <div className="text-xs text-red-800 dark:text-red-300 break-words">{r.errorMessage}</div>
                  )}
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    {formatDateTime(r.createdAt)} - {formatDuration(r.durationMs)}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => loadPage(page + 1, true)}
                disabled={loadingMore}
                className="min-h-[44px] px-6 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium inline-flex items-center gap-2 disabled:opacity-60"
              >
                {loadingMore && <RefreshCw className="w-4 h-4 animate-spin" />}
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {selectedId && (
        <ApiCallDetailDrawer
          callId={selectedId}
          onClose={() => setSelectedId(null)}
          onShowCorrelation={showCorrelation}
        />
      )}
    </div>
  );
}
