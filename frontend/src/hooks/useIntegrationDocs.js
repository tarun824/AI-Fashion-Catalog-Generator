import { useCallback, useEffect, useState } from "react";
import { api } from "../utils/api";
import { logApiError } from "../utils/errorHandler";

// Module-level cache shared by the drawer and the credentials modal.
// entry: { status: "ok" | "missing", docs } ; in-flight requests are deduped.
const cache = new Map();
const inflight = new Map();

export function loadIntegrationDocs(providerId, { force = false } = {}) {
  if (!providerId) {
    return Promise.reject(new Error("providerId is required to load docs"));
  }
  if (!force && cache.has(providerId)) {
    return Promise.resolve(cache.get(providerId));
  }
  if (inflight.has(providerId)) return inflight.get(providerId);

  const p = api
    .get(`/admin/integrations/${encodeURIComponent(providerId)}/docs`)
    .then((res) => {
      const entry = res?.docs
        ? { status: "ok", docs: res.docs }
        : { status: "missing", docs: null };
      cache.set(providerId, entry);
      return entry;
    })
    .catch((err) => {
      if (err?.response?.status === 404) {
        const entry = { status: "missing", docs: null };
        cache.set(providerId, entry);
        return entry;
      }
      logApiError(`Load ${providerId} docs`, err);
      throw err;
    })
    .finally(() => inflight.delete(providerId));
  inflight.set(providerId, p);
  return p;
}

const fromEntry = (entry) => ({
  docs: entry.docs,
  loading: false,
  notFound: entry.status === "missing",
  error: null,
});

/**
 * Lazily fetches docs for a provider (once, cached, shared).
 * Returns { docs, loading, notFound, error, retry }.
 */
export default function useIntegrationDocs(providerId, { enabled = true } = {}) {
  const [state, setState] = useState(() => {
    const hit = providerId ? cache.get(providerId) : null;
    return hit
      ? fromEntry(hit)
      : { docs: null, loading: !!providerId && enabled, notFound: false, error: null };
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!providerId || !enabled) return undefined;
    let cancelled = false;
    loadIntegrationDocs(providerId, { force: nonce > 0 })
      .then((entry) => {
        if (!cancelled) setState(fromEntry(entry));
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ docs: null, loading: false, notFound: false, error: err });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [providerId, enabled, nonce]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setNonce((n) => n + 1);
  }, []);
  return { ...state, retry };
}
