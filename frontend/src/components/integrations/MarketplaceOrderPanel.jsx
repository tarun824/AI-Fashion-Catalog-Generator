import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../../utils/api";
import { formatErrorMessage, logApiError } from "../../utils/errorHandler";
import { useToast } from "../../contexts/ToastContext";
import { SourceBadge, MarketplaceOrderChips } from "./ChannelChips";
import { channelLabel, dispatchState } from "../../utils/channelHelpers";

const safeFormat = (value, pattern) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : format(d, pattern);
};

/**
 * Marketplace details for an imported order + "Send tracking to <Channel>".
 * Renders nothing for non-marketplace orders.
 */
export default function MarketplaceOrderPanel({ order, onUpdated }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const m = order?.marketplace;
  if (!m?.channel) return null;

  const channel = channelLabel(m.channel);
  const hasAwb = !!order.shipping?.awbCode;
  const confirmed = !!m.shipmentConfirmedAt;
  const canSend = hasAwb && !confirmed;
  const dispatch = dispatchState(m.dispatchByDate);

  const sendTracking = async () => {
    setSending(true);
    try {
      const res = await api.post(
        `/admin/integrations/orders/${order._id}/confirm-shipment`,
        {},
      );
      toast.success(res.message || `Tracking sent to ${channel}.`);
      if (onUpdated) await onUpdated();
    } catch (err) {
      logApiError(`Confirm shipment to ${m.channel}`, err);
      toast.error(formatErrorMessage(err), 8000);
      // Backend stores the last error on the order; refresh to show it.
      if (onUpdated) await onUpdated();
    } finally {
      setSending(false);
    }
  };

  const Field = ({ label, children }) => (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <div className="font-medium text-gray-900 dark:text-white break-words">
        {children}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Marketplace order
        </h2>
        <SourceBadge source={m.channel} />
      </div>
      <MarketplaceOrderChips order={order} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Channel">{channel}</Field>
        <Field label={`${channel} order id`}>
          <span className="font-mono text-sm">{m.externalOrderId || "-"}</span>
        </Field>
        <Field label="Dispatch by">
          <span
            className={
              dispatch?.tone === "overdue" && !hasAwb
                ? "text-red-700 dark:text-red-300"
                : dispatch?.tone === "today" && !hasAwb
                  ? "text-amber-700 dark:text-amber-300"
                  : ""
            }
          >
            {safeFormat(m.dispatchByDate, "MMM d, yyyy h:mm a")}
            {!hasAwb && dispatch?.tone === "overdue" && " (overdue)"}
            {!hasAwb && dispatch?.tone === "today" && " (due today)"}
          </span>
        </Field>
        <Field label="Fulfilment">
          {m.fulfillmentType === "MARKETPLACE"
            ? `Fulfilled by ${channel}`
            : m.fulfillmentType === "SELLER"
              ? "Seller ships"
              : "-"}
        </Field>
        <Field label="Last synced">
          {safeFormat(m.syncedAt, "MMM d, yyyy h:mm a")}
        </Field>
        {m.status && <Field label={`${channel} status`}>{m.status}</Field>}
      </div>

      {m.fulfillmentType !== "MARKETPLACE" && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          {confirmed && (
            <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              Tracking sent to {channel} on{" "}
              {safeFormat(m.shipmentConfirmedAt, "MMM d, yyyy h:mm a")}
            </p>
          )}
          {!confirmed && m.shipmentConfirmError && (
            <p
              role="alert"
              className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                Last attempt failed: {m.shipmentConfirmError}. Fix the issue
                and try again.
              </span>
            </p>
          )}
          {!hasAwb && !confirmed && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ship this order with Shiprocket first. Once an AWB exists you can
              send the tracking to {channel}.
            </p>
          )}
          {canSend && (
            <button
              type="button"
              onClick={sendTracking}
              disabled={sending}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send tracking to {channel}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
