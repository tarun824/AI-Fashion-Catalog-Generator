import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { channelLabel } from "../../utils/channelHelpers";

/**
 * Renders the per-provider outcome of fetch-orders / fetch-all.
 * results: { [providerId]: summary | {ok:false,error,errorType,actionRequired} | {skipped,reason} }
 */
const HELP_ERROR_TYPES = [
  "CREDENTIALS_INVALID",
  "PII_ROLE_MISSING",
  "RATE_LIMITED",
  "VALIDATION",
];

export default function FetchSummary({ results, onDismiss, onOpenDocs }) {
  const entries = Object.entries(results || {});
  if (entries.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Order sync results
        </h3>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] px-3 text-sm text-gray-700 dark:text-gray-300 hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>
      {entries.map(([id, r]) => {
        const failed = r?.ok === false || !!r?.error;
        const skipped = !!r?.skipped && !failed;
        return (
          <div
            key={id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              {failed ? (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : skipped ? (
                <MinusCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
              {channelLabel(id)}
            </div>
            {failed && (
              <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                <p>{r.error || "Sync failed"}</p>
                {r.actionRequired && (
                  <p className="mt-1">Next step: {r.actionRequired}</p>
                )}
              </div>
            )}
            {skipped && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Skipped: {r.reason || "not connected"}
              </p>
            )}
            {!failed && !skipped && (
              <>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    ["Imported", r.imported],
                    ["Updated", r.updated],
                    ["Skipped", r.skipped],
                    ["Needs mapping", r.needsMapping],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-gray-50 dark:bg-gray-900/50 rounded-lg py-2"
                    >
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {typeof value === "number" ? value : 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                {Array.isArray(r.warnings) && r.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {r.warnings.map((w, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300"
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {typeof w === "string" ? w : JSON.stringify(w)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {onOpenDocs &&
              (HELP_ERROR_TYPES.includes(r?.errorType) ||
                (Array.isArray(r?.warnings) && r.warnings.length > 0)) && (
                <button
                  type="button"
                  onClick={() => onOpenDocs(id, "troubleshooting")}
                  className="mt-2 mr-4 inline-flex items-center min-h-[44px] text-sm underline text-blue-700 dark:text-blue-300"
                >
                  Open troubleshooting guide
                </button>
              )}
            {r?.correlationId && (
              <Link
                to={`/admin/api-logs?correlationId=${encodeURIComponent(r.correlationId)}`}
                className="mt-2 inline-flex items-center min-h-[44px] text-sm underline text-blue-700 dark:text-blue-300"
              >
                View API calls
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
