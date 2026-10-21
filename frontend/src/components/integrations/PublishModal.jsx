import { useState, useEffect, useMemo } from "react";
import { X, RefreshCw, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../../utils/api";
import { formatErrorMessage, logApiError } from "../../utils/errorHandler";
import { useToast } from "../../contexts/ToastContext";
import { channelLabel } from "../../utils/channelHelpers";

const mentions = (issues, words) =>
  (issues || []).some((i) =>
    words.some((w) => String(i).toLowerCase().includes(w)),
  );

/**
 * Publish products to a marketplace.
 * Props:
 *  - providerId: optional. When omitted the user picks one of the connected
 *    marketplaces that supports publishing.
 *  - productIds: optional preselected product ids.
 *  - products: optional [{_id,name,sku}] used only to show names for preselected ids.
 *  - onClose(), onPublished(): callbacks.
 */
export default function PublishModal({
  providerId: initialProviderId = "",
  productIds = [],
  products: knownProducts = [],
  onClose,
  onPublished,
}) {
  const toast = useToast();

  // provider selection
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(!initialProviderId);
  const [providerId, setProviderId] = useState(initialProviderId);

  // product search + selection
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(() => {
    const map = {};
    productIds.forEach((id) => {
      const info = knownProducts.find((p) => p._id === id);
      map[id] = {
        name: info?.name || "Selected product",
        sku: info?.sku || "",
      };
    });
    return map;
  });

  // per product overrides: { [productId]: { flipkartProductId, hsn, asin } }
  const [overrides, setOverrides] = useState({});

  // run state
  const [running, setRunning] = useState(""); // "dry" | "publish" | ""
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (initialProviderId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get("/admin/integrations");
        if (cancelled) return;
        const list = (res.integrations || []).filter(
          (i) => i.capabilities?.publishProducts,
        );
        setProviders(list);
        const firstReady = list.find((i) => i.configured || i.status?.connected);
        if (firstReady) setProviderId(firstReady.id);
      } catch (err) {
        logApiError("Load publish channels", err);
        toast.error(formatErrorMessage(err), 8000);
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProviderId]);

  // Debounced product search
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ limit: "20", page: "1" });
        if (search.trim()) params.append("search", search.trim());
        const res = await api.get(`/admin/products?${params}`);
        if (!cancelled) setSearchResults(res.data || []);
      } catch (err) {
        logApiError("Search products for publish", err);
        toast.error(formatErrorMessage(err), 8000);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selectedIds = Object.keys(selected);
  const providerName =
    providers.find((p) => p.id === providerId)?.name ||
    channelLabel(providerId);

  const toggle = (p) => {
    setReport(null);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p._id]) delete next[p._id];
      else next[p._id] = { name: p.name, sku: p.sku };
      return next;
    });
  };

  const setOverride = (pid, key, value) =>
    setOverrides((prev) => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [key]: value },
    }));

  const resultByProduct = useMemo(() => {
    const map = {};
    (report?.results || []).forEach((r) => {
      map[r.productId] = r;
    });
    return map;
  }, [report]);

  const buildOverrides = () => {
    const out = {};
    for (const pid of selectedIds) {
      const o = overrides[pid] || {};
      const clean = {};
      Object.entries(o).forEach(([k, v]) => {
        if (String(v ?? "").trim()) clean[k] = String(v).trim();
      });
      if (Object.keys(clean).length) out[pid] = clean;
    }
    return out;
  };

  const run = async (dryRun) => {
    if (!providerId) {
      toast.warning("Choose a marketplace first.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.warning("Select at least one product.");
      return;
    }
    setRunning(dryRun ? "dry" : "publish");
    try {
      const res = await api.post(`/admin/integrations/${providerId}/publish`, {
        productIds: selectedIds,
        dryRun,
        overrides: buildOverrides(),
      });
      setReport(res);
      const failed = res.failed || 0;
      if (dryRun) {
        if (failed === 0) {
          toast.success("All checks passed. You can publish now.");
        } else {
          toast.warning(
            `${failed} of ${res.total} product(s) need fixes. See the list below.`,
            7000,
          );
        }
      } else {
        if (failed === 0) {
          toast.success(
            `Published ${res.succeeded} product(s) to ${providerName}.`,
          );
        } else {
          toast.warning(
            `${res.succeeded} published, ${failed} failed. See the list below.`,
            7000,
          );
        }
        if (onPublished) await onPublished();
      }
    } catch (err) {
      logApiError(`${dryRun ? "Check" : "Publish"} to ${providerId}`, err);
      toast.error(formatErrorMessage(err), 8000);
    } finally {
      setRunning("");
    }
  };

  const inputClass =
    "w-full min-h-[44px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Publish products"
        className="bg-white dark:bg-gray-800 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-xl shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Publish to {providerName || "marketplace"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!!running}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Channel picker */}
          {!initialProviderId && (
            <div>
              <label
                htmlFor="publish-channel"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Marketplace
              </label>
              {providersLoading ? (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Loading marketplaces...
                </div>
              ) : providers.length === 0 ? (
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  No marketplace supports publishing yet. Connect one on the
                  Integrations page.
                </p>
              ) : (
                <select
                  id="publish-channel"
                  value={providerId}
                  onChange={(e) => {
                    setProviderId(e.target.value);
                    setReport(null);
                  }}
                  className={inputClass}
                >
                  <option value="">Choose...</option>
                  {providers.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={!p.configured && !p.status?.connected}
                    >
                      {p.name}
                      {!p.configured && !p.status?.connected
                        ? " (not connected)"
                        : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Selected */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Selected ({selectedIds.length})
            </h3>
            {selectedIds.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Search below and tick the products you want to publish.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedIds.map((pid) => {
                  const info = selected[pid];
                  const r = resultByProduct[pid];
                  const issues = r?.issues || [];
                  const showFlipkart =
                    providerId === "flipkart" &&
                    (mentions(issues, ["product id", "hsn"]) ||
                      overrides[pid]?.flipkartProductId ||
                      overrides[pid]?.hsn);
                  return (
                    <li
                      key={pid}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-2">
                        {r &&
                          (r.ok === false || issues.length > 0 ? (
                            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                          ))}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {info.name}
                          </p>
                          {info.sku && (
                            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                              {info.sku}
                            </p>
                          )}
                          {r && r.ok !== false && issues.length === 0 && (
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {report?.dryRun
                                ? "Ready to publish"
                                : `Status: ${r.status || "submitted"}`}
                            </p>
                          )}
                          {issues.length > 0 && (
                            <ul className="mt-1 list-disc pl-5 text-sm text-amber-800 dark:text-amber-300 space-y-0.5">
                              {issues.map((i, idx) => (
                                <li key={idx}>{String(i)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle({ _id: pid })}
                          aria-label={`Remove ${info.name}`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {providerId === "amazon" && (
                        <div className="mt-2">
                          <label
                            htmlFor={`asin-${pid}`}
                            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            Amazon ASIN (optional, to match an existing
                            listing)
                          </label>
                          <input
                            id={`asin-${pid}`}
                            value={overrides[pid]?.asin || ""}
                            onChange={(e) =>
                              setOverride(pid, "asin", e.target.value)
                            }
                            placeholder="e.g. B0XXXXXXXX"
                            className={inputClass}
                          />
                        </div>
                      )}

                      {showFlipkart && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label
                              htmlFor={`fkpid-${pid}`}
                              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >
                              Flipkart product id
                            </label>
                            <input
                              id={`fkpid-${pid}`}
                              value={overrides[pid]?.flipkartProductId || ""}
                              onChange={(e) =>
                                setOverride(
                                  pid,
                                  "flipkartProductId",
                                  e.target.value,
                                )
                              }
                              placeholder="From Flipkart seller panel"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`fkhsn-${pid}`}
                              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >
                              HSN code
                            </label>
                            <input
                              id={`fkhsn-${pid}`}
                              value={overrides[pid]?.hsn || ""}
                              onChange={(e) =>
                                setOverride(pid, "hsn", e.target.value)
                              }
                              placeholder="e.g. 6109"
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Search */}
          <div>
            <label
              htmlFor="publish-search"
              className="block text-sm font-semibold text-gray-900 dark:text-white mb-1"
            >
              Add products
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                id="publish-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or SKU"
                className={`${inputClass} pl-9`}
              />
            </div>
            <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {searching ? (
                <div className="p-4 flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <p className="p-4 text-sm text-gray-600 dark:text-gray-400">
                  No products found. Try a different search.
                </p>
              ) : (
                searchResults.map((p) => (
                  <label
                    key={p._id}
                    className="flex items-center gap-3 px-3 min-h-[48px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={!!selected[p._id]}
                      onChange={() => toggle(p)}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                        {p.name}
                      </span>
                      <span className="block text-xs font-mono text-gray-600 dark:text-gray-400">
                        {p.sku}
                        {p.price?.amount != null && ` • ₹${p.price.amount}`}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2 sm:space-y-0 sm:flex sm:justify-end sm:gap-2">
          <button
            type="button"
            onClick={() => run(true)}
            disabled={!!running || !providerId || selectedIds.length === 0}
            className="w-full sm:w-auto min-h-[44px] px-4 rounded-lg border-2 border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {running === "dry" && <RefreshCw className="w-4 h-4 animate-spin" />}
            {running === "dry" ? "Checking..." : "Check first (dry run)"}
          </button>
          <button
            type="button"
            onClick={() => run(false)}
            disabled={!!running || !providerId || selectedIds.length === 0}
            className="w-full sm:w-auto min-h-[44px] px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {running === "publish" && (
              <RefreshCw className="w-4 h-4 animate-spin" />
            )}
            {running === "publish"
              ? "Publishing..."
              : `Publish ${selectedIds.length || ""}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
