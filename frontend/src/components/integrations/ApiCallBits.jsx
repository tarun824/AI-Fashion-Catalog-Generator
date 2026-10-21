import { CheckCircle, XCircle } from "lucide-react";
import { STATUS_PILL_STYLES, statusClassOf } from "../../utils/apiLogHelpers";

/** HTTP status pill colored by class; "ERR" when no response was received. */
export function StatusPill({ status }) {
  const cls = statusClassOf(status);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${STATUS_PILL_STYLES[cls]}`}
      title={status ? `HTTP ${status}` : "No response received (network error or timeout)"}
    >
      {status || "ERR"}
    </span>
  );
}

export function SuccessIcon({ success }) {
  return success ? (
    <CheckCircle
      className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0"
      aria-label="Succeeded"
    />
  ) : (
    <XCircle
      className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
      aria-label="Failed"
    />
  );
}
