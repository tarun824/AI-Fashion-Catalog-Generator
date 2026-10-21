import crypto from "crypto";
import axios from "axios";
import { createHttpClient } from "../../core/httpClient.js";
import { ProviderError } from "../../core/errors.js";
import {
  runWithApiContext,
  getApiContext,
  newCorrelationId,
} from "../../logging/apiCallContext.js";
import {
  LWA_TOKEN_URL,
  DEFAULT_ENDPOINT,
  SANDBOX_ENDPOINT,
  USER_AGENT,
  TOKEN_EXPIRY_MARGIN_MS,
  TOKEN_DEFAULT_TTL_S,
  PROVIDER_ID,
} from "./amazonConfig.js";

const tag = `[Integration:${PROVIDER_ID}]`;

/** Run fn as the 'token' operation, keeping the parent's correlationId when there is one. */
const asTokenCall = (fn) =>
  runWithApiContext(
    {
      ...(getApiContext() || {}),
      correlationId: getApiContext()?.correlationId || newCorrelationId(),
      operation: "token",
      provider: PROVIDER_ID,
    },
    fn,
  );

/** In-memory access-token cache keyed by a hash of (clientId, refreshToken). */
const tokenCache = new Map();
const inflight = new Map();

const truthy = (v) => v === true || String(v).toLowerCase() === "true";

export function resolveEndpoint(credentials = {}) {
  if (truthy(credentials.useSandbox)) return SANDBOX_ENDPOINT;
  const ep = String(credentials.endpoint || "").trim().replace(/\/+$/, "");
  return ep || DEFAULT_ENDPOINT;
}

function cacheKey(c) {
  return crypto
    .createHash("sha256")
    .update(`${c.lwaClientId}|${c.refreshToken}`)
    .digest("hex");
}

export function clearTokenCache() {
  tokenCache.clear();
  inflight.clear();
}

/**
 * Exchange the LWA refresh token for an access token (~1h). Cached in memory.
 * @param {object} credentials
 * @param {{http?: {post:Function}}} [deps] test seam
 */
export async function getAccessToken(credentials, deps = {}) {
  const missing = ["lwaClientId", "lwaClientSecret", "refreshToken"].filter(
    (k) => !String(credentials?.[k] ?? "").trim(),
  );
  if (missing.length) {
    console.warn(`${tag} getAccessToken blocked reason=missing credentials keys=${missing.join(",")}`);
    throw new ProviderError("CREDENTIALS_INVALID", `Missing Amazon credentials: ${missing.join(", ")}`);
  }
  const key = cacheKey(credentials);
  const hit = tokenCache.get(key);
  if (hit && hit.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) return hit.token;
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    const http =
      deps.http || createHttpClient({ providerId: PROVIDER_ID, maxRetries: 2 });
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
      client_id: credentials.lwaClientId,
      client_secret: credentials.lwaClientSecret,
    }).toString();
    let res;
    try {
      res = await asTokenCall(() =>
        http.post(LWA_TOKEN_URL, body, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );
    } catch (err) {
      const status = err?.details?.status;
      const lwaCode = err?.details?.body?.error;
      console.warn(`${tag} LWA token request failed status=${status ?? "n/a"} lwaError=${lwaCode ?? "n/a"}`);
      if (status === 400 || status === 401 || err.type === "CREDENTIALS_INVALID" || err.type === "VALIDATION") {
        throw new ProviderError(
          "CREDENTIALS_INVALID",
          lwaCode === "invalid_grant"
            ? "Amazon refresh token is invalid, expired or revoked. Re-authorize the app and paste a new refresh token."
            : "Amazon rejected the LWA client id/secret or refresh token.",
          { details: { lwaError: lwaCode ?? null, description: err?.details?.body?.error_description ?? null } },
        );
      }
      throw err;
    }
    const token = res.data?.access_token;
    if (!token) {
      console.warn(`${tag} LWA response had no access_token`);
      throw new ProviderError("UPSTREAM_ERROR", "Amazon did not return an access token");
    }
    const ttl = Number(res.data?.expires_in) || TOKEN_DEFAULT_TTL_S;
    tokenCache.set(key, { token, expiresAt: Date.now() + ttl * 1000 });
    return token;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

/**
 * SP-API client bound to one set of credentials. Adds x-amz-access-token and
 * user-agent. Pass opts.accessToken (e.g. an RDT) to override the LWA token.
 * @param {object} credentials
 * @param {{axiosInstance?:object, http?:object, tokenHttp?:object, maxRetries?:number, retryBaseMs?:number}} [deps]
 */
export function createSpClient(credentials, deps = {}) {
  const baseURL = resolveEndpoint(credentials);
  const http =
    deps.http ||
    createHttpClient({
      providerId: PROVIDER_ID,
      baseURL,
      maxRetries: deps.maxRetries ?? 4,
      retryBaseMs: deps.retryBaseMs ?? 2000,
      axiosInstance: deps.axiosInstance,
    });

  async function request(config, opts = {}) {
    const accessToken =
      opts.accessToken || (await getAccessToken(credentials, { http: deps.tokenHttp }));
    return http.request({
      ...config,
      headers: {
        ...(config.headers || {}),
        "x-amz-access-token": accessToken,
        "user-agent": USER_AGENT,
        "content-type": "application/json",
      },
    });
  }

  /** Restricted Data Token for the given [{method, path}] resources. */
  async function getRestrictedDataToken(resources) {
    const res = await request({
      method: "POST",
      url: "/tokens/2021-03-01/restrictedDataToken",
      data: { restrictedResources: resources },
    });
    const rdt = res.data?.restrictedDataToken;
    if (!rdt) {
      throw new ProviderError("PII_ROLE_MISSING", "Amazon did not return a restricted data token");
    }
    return rdt;
  }

  return { baseURL, request, getRestrictedDataToken };
}

/** Plain fetch of a presigned URL (no Amazon auth headers). */
export async function fetchPresignedJson(url, timeout = 30000) {
  const res = await axios.get(url, { timeout });
  return res.data;
}

export default { getAccessToken, createSpClient, resolveEndpoint, clearTokenCache, fetchPresignedJson };
