import { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Save,
  Zap,
  Trash2,
  BookOpen,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../utils/api";
import { formatErrorMessage, logApiError } from "../../utils/errorHandler";
import { useToast } from "../../contexts/ToastContext";
import useIntegrationDocs from "../../hooks/useIntegrationDocs";
import { FieldHelp } from "./DocsBits";

/**
 * Dynamic credentials form driven by GET /admin/integrations/:id/credential-fields.
 * Secrets are only held in local state while the modal is open and are cleared
 * right after a successful save. Values are never logged.
 */
export default function CredentialsModal({
  integration,
  onClose,
  onChanged,
  onOpenDocs,
}) {
  const toast = useToast();
  const { docs } = useIntegrationDocs(integration.id);
  const [helpOpen, setHelpOpen] = useState({});
  const securityNote =
    (Array.isArray(docs?.security) && typeof docs.security[0] === "string"
      ? docs.security[0]
      : "") ||
    `Your keys are saved encrypted on our server and never shown again - only the last 4 characters. They're used only to talk to ${integration.name}.`;
  const [fields, setFields] = useState([]);
  const [masked, setMasked] = useState({});
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "save" | "test" | "remove" | ""
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/admin/integrations/${integration.id}/credential-fields`,
        );
        if (cancelled) return;
        setFields(res.fields || []);
        setMasked(res.credentials || {});
      } catch (err) {
        logApiError(`Load ${integration.id} credential fields`, err);
        toast.error(formatErrorMessage(err), 8000);
        if (!cancelled) onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.id]);

  const setValue = (key, value) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const runTest = async () => {
    try {
      const res = await api.post(`/admin/integrations/${integration.id}/test`);
      if (res.success) {
        toast.success(
          `${integration.name} connected. ${res.message || ""}`.trim(),
        );
      } else {
        toast.error(
          `${integration.name} test failed: ${res.message || "unknown reason"}. Check the keys and try again.`,
          8000,
        );
      }
    } catch (err) {
      logApiError(`Test ${integration.id}`, err);
      toast.error(formatErrorMessage(err), 8000);
    }
  };

  const handleSave = async (alsoTest) => {
    setFormError("");
    const payload = {};
    for (const f of fields) {
      const v = (values[f.key] ?? "").trim();
      if (v) payload[f.key] = v;
    }
    const missing = fields.filter(
      (f) => f.required && !payload[f.key] && !masked[f.key]?.hasValue,
    );
    if (missing.length > 0) {
      setFormError(`Please fill: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setBusy("save");
    try {
      const res = await api.put(`/admin/integrations/${integration.id}/credentials`, {
        credentials: payload,
      });
      setMasked(res.credentials || {});
      setValues({}); // drop secrets from memory
      toast.success(`${integration.name} keys saved`);
      if (alsoTest) {
        setBusy("test");
        await runTest();
      }
      if (onChanged) await onChanged();
      onClose();
    } catch (err) {
      logApiError(`Save ${integration.id} credentials`, err);
      toast.error(formatErrorMessage(err), 8000);
    } finally {
      setBusy("");
    }
  };

  const handleRemove = async () => {
    if (
      !window.confirm(
        `Remove all saved ${integration.name} keys? Syncing will stop until you add them again.`,
      )
    ) {
      return;
    }
    setBusy("remove");
    try {
      await api.delete(`/admin/integrations/${integration.id}/credentials`);
      setValues({});
      toast.success(`${integration.name} keys removed`);
      if (onChanged) await onChanged();
      onClose();
    } catch (err) {
      logApiError(`Remove ${integration.id} credentials`, err);
      toast.error(formatErrorMessage(err), 8000);
    } finally {
      setBusy("");
    }
  };

  const hasAnySaved = Object.values(masked).some((m) => m?.hasValue);
  const inputClass =
    "w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${integration.name} credentials`}
        className="bg-white dark:bg-gray-800 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-xl shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {integration.name} keys
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading form...
            </div>
          ) : (
            <>
            {onOpenDocs && (
              <button
                type="button"
                onClick={() => onOpenDocs("setup")}
                className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 text-sm font-medium text-left hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                <BookOpen className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Need help? Open the full setup guide
              </button>
            )}
            <p className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
              <ShieldCheck
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-700 dark:text-green-400"
                aria-hidden="true"
              />
              <span>{securityNote}</span>
            </p>
            <form
              id="credentials-form"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(false);
              }}
              className="space-y-4"
            >
              {fields.map((f) => {
                const m = masked[f.key];
                const placeholder =
                  f.secret && m?.hasValue
                    ? `•••• ${m.last4 || ""}`.trim()
                    : m?.hasValue
                      ? "Saved. Leave blank to keep"
                      : "";
                return (
                  <div key={f.key}>
                    <label
                      htmlFor={`cred-${f.key}`}
                      className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
                    >
                      {f.label}
                      {f.required && (
                        <span className="text-red-600 dark:text-red-400">
                          {" "}
                          *
                        </span>
                      )}
                    </label>
                    <input
                      id={`cred-${f.key}`}
                      name={`cred-${f.key}`}
                      type={f.secret ? "password" : f.type || "text"}
                      autoComplete={f.secret ? "new-password" : "off"}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      placeholder={placeholder}
                      className={inputClass}
                    />
                    {m?.hasValue && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Leave blank to keep the saved value.
                      </p>
                    )}
                    {docs?.fields?.[f.key] ? (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setHelpOpen((p) => ({ ...p, [f.key]: !p[f.key] }))
                          }
                          aria-expanded={!!helpOpen[f.key]}
                          className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-blue-700 dark:text-blue-300 underline"
                        >
                          <HelpCircle className="w-4 h-4" aria-hidden="true" />
                          Where do I find this?
                        </button>
                        {helpOpen[f.key] && (
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3">
                            <FieldHelp field={docs.fields[f.key]} showSummary />
                          </div>
                        )}
                      </div>
                    ) : (
                      f.help && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {f.help}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
              {formError && (
                <p
                  role="alert"
                  className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
                >
                  {formError}
                </p>
              )}
            </form>
            </>
          )}
        </div>

        {!loading && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-2 sm:justify-end">
            {hasAnySaved && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={!!busy}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-lg border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 flex items-center justify-center gap-2 sm:mr-auto"
              >
                {busy === "remove" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove keys
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={!!busy}
              className="w-full sm:w-auto min-h-[44px] px-4 rounded-lg border-2 border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy === "test" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {busy === "test" ? "Testing..." : "Save & test"}
            </button>
            <button
              type="submit"
              form="credentials-form"
              disabled={!!busy}
              className="w-full sm:w-auto min-h-[44px] px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy === "save" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {busy === "save" ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
