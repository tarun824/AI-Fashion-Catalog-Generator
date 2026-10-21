import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ListTree,
} from "lucide-react";
import { api } from "../../utils/api";
import { formatErrorMessage, logApiError } from "../../utils/errorHandler";
import { useToast } from "../../contexts/ToastContext";
import { channelLabel } from "../../utils/channelHelpers";
import {
  formatDateTime,
  formatDuration,
  prettyBody,
} from "../../utils/apiLogHelpers";
import { StatusPill, SuccessIcon } from "./ApiCallBits";

const BTN =
  "min-h-[44px] px-3 inline-flex items-center gap-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700";

function CopyButton({ text, label }) {
  const toast = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch (error) {
      logApiError(`Copy ${label}`, error);
      toast.error(
        `Could not copy ${label.toLowerCase()}. Select the text and copy it manually.`,
      );
    }
  };
  return (
    <button type="button" onClick={handleCopy} className={BTN}>
      <Copy className="w-4 h-4" />
      Copy
    </button>
  );
}

/** Collapsible pretty-printed JSON/text block with a Copy button. */
function JsonBlock({ title, value, defaultOpen = false, note }) {
  const [open, setOpen] = useState(defaultOpen);
  const text = prettyBody(value);
  const empty = text === "";
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center justify-between gap-2 px-3 py-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 min-h-[44px] flex items-center gap-2 text-left text-sm font-medium text-gray-900 dark:text-white"
        >
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {title}
          {empty && (
            <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
              (empty)
            </span>
          )}
        </button>
        {!empty && <CopyButton text={text} label={title} />}
      </div>
      {open && (
        <div className="px-3 pb-3">
          {note}
          {empty ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nothing was recorded for this part.
            </p>
          ) : (
            <pre className="max-h-96 overflow-auto text-xs leading-relaxed bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg p-3 whitespace-pre-wrap break-all">
              {text}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-1.5">
      <dt className="sm:w-32 flex-shrink-0 text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-white break-all min-w-0">
        {children}
      </dd>
    </div>
  );
}

function TruncatedNote({ truncated, size }) {
  if (!truncated) return null;
  return (
    <p className="mb-2 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>
        Body truncated for storage
        {size ? ` (original size ${size} bytes)` : ""}. Only the first part is
        shown.
      </span>
    </p>
  );
}

/**
 * Slide-over (full-screen on mobile) showing one external API call in full.
 * Props: callId, onClose, onShowCorrelation(correlationId)
 */
export default function ApiCallDetailDrawer({
  callId,
  onClose,
  onShowCorrelation,
}) {
  const toast = useToast();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/api-calls/${callId}`);
      setCall(res.data);
    } catch (err) {
      logApiError("Load API call", err);
      const msg = formatErrorMessage(err);
      setError(msg);
      toast.error(msg, 8000);
    } finally {
      setLoading(false);
    }
  }, [callId, toast]);

  useEffect(() => {
    if (callId) load();
  }, [callId, load]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const orderId = call?.context?.orderId;
  const ctx = call?.context || {};
  const hasContext = ctx.orderId || ctx.externalOrderId || ctx.productId || ctx.sku;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="API call details">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="hidden sm:block absolute inset-0 bg-black/50 cursor-default"
      />
      <div className="relative w-full sm:max-w-2xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white truncate">
            {call
              ? `${channelLabel(call.provider)} / ${call.operation}`
              : "API call"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 py-8 justify-center">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading call details...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-900 dark:text-red-200 whitespace-pre-line">
              {error}
              <div className="mt-3">
                <button type="button" onClick={load} className={BTN}>
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </div>
            </div>
          )}

          {!loading && call && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <SuccessIcon success={call.success} />
                  <StatusPill status={call.response?.status} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {call.success ? "Succeeded" : "Failed"}
                  </span>
                </div>
                <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                  <Row label="Provider">{channelLabel(call.provider)}</Row>
                  <Row label="Operation">{call.operation}</Row>
                  <Row label="Direction">{call.direction}</Row>
                  <Row label="Time">{formatDateTime(call.startedAt || call.createdAt)}</Row>
                  <Row label="Duration">{formatDuration(call.durationMs)}</Row>
                  <Row label="Attempt">
                    {call.attempt || 1}
                    {call.attempt > 1 ? " (retry)" : ""}
                    {call.retryOf ? ` - retry of ${call.retryOf}` : ""}
                  </Row>
                  {call.trigger && <Row label="Trigger">{call.trigger}</Row>}
                  {call.correlationId && (
                    <Row label="Correlation">
                      <span className="font-mono text-xs">{call.correlationId}</span>
                      {onShowCorrelation && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => onShowCorrelation(call.correlationId)}
                            className={BTN}
                          >
                            <ListTree className="w-4 h-4" />
                            Show all calls in this click
                          </button>
                        </div>
                      )}
                    </Row>
                  )}
                  {hasContext && (
                    <Row label="Linked to">
                      <div className="space-y-1">
                        {orderId && (
                          <div>
                            <Link
                              to={`/admin/orders/${orderId}`}
                              className="inline-flex items-center min-h-[44px] text-blue-700 dark:text-blue-300 underline"
                            >
                              Open order {orderId}
                            </Link>
                          </div>
                        )}
                        {ctx.externalOrderId && <div>Marketplace order: {ctx.externalOrderId}</div>}
                        {ctx.productId && <div>Product: {ctx.productId}</div>}
                        {ctx.sku && <div>SKU: {ctx.sku}</div>}
                      </div>
                    </Row>
                  )}
                </dl>
              </section>

              {!call.success && (call.errorType || call.errorMessage) && (
                <section className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-900 dark:text-red-200">
                    <AlertTriangle className="w-4 h-4" />
                    {call.errorType || "Error"}
                  </h3>
                  {call.errorMessage && (
                    <p className="mt-1 text-sm text-red-900 dark:text-red-200 break-words">
                      {call.errorMessage}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-red-800 dark:text-red-300">
                    Next step: check the response body below, then retry the
                    action from Integrations. 401/403 usually means the
                    credentials need to be re-entered.
                  </p>
                </section>
              )}

              <section className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Values shown as masked are hidden on purpose: secrets (tokens,
                  keys, passwords) are always removed and buyer personal data
                  (name, phone, email, address) is masked before logs are saved.
                </span>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Request
                </h3>
                <div className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  <span className="font-bold">{call.request?.method || "-"}</span>{" "}
                  {call.request?.host ? `${call.request.host}` : ""}
                  {call.request?.url || ""}
                </div>
                <JsonBlock title="Request headers" value={call.request?.headers} />
                <JsonBlock
                  title="Request body"
                  value={call.request?.body}
                  note={
                    <TruncatedNote
                      truncated={call.request?.bodyTruncated}
                      size={call.request?.bodySize}
                    />
                  }
                />
              </section>

              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Response <StatusPill status={call.response?.status} />
                </h3>
                {call.response?.contentType && (
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {call.response.contentType}
                  </p>
                )}
                <JsonBlock title="Response headers" value={call.response?.headers} />
                <JsonBlock
                  title="Response body"
                  value={call.response?.body}
                  defaultOpen={!call.success}
                  note={
                    <TruncatedNote
                      truncated={call.response?.bodyTruncated}
                      size={call.response?.bodySize}
                    />
                  }
                />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
