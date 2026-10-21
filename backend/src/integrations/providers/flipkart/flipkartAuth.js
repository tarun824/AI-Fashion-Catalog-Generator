import crypto from "crypto";
import { createHttpClient } from "../../core/httpClient.js";
import { ProviderError } from "../../core/errors.js";
import {
  runWithApiContext,
  getApiContext,
  newCorrelationId,
} from "../../logging/apiCallContext.js";
import {
  PROVIDER_ID,
  TOKEN_URL,
  TOKEN_SCOPE,
  TOKEN_EXPIRY_MARGIN_MS,
  TOKEN_DEFAULT_TTL_SEC,
} from "./flipkartConfig.js";

/**
 * In-memory token cache keyed by a hash of appId (providers are stateless and
 * only receive credentials, so there is no Integration document to persist to).
 * Tokens last ~60 days; a restart just fetches a new one.
 */
const tokenCache = new Map();

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
const http = createHttpClient({ providerId: PROVIDER_ID, maxRetries: 2 });

const cacheKey = (creds) =>
  crypto.createHash("sha256").update(String(creds.appId || "")).digest("hex");

export function clearTokenCache(creds) {
  if (creds) tokenCache.delete(cacheKey(creds));
  else tokenCache.clear();
}

function assertCreds(creds) {
  if (!creds?.appId || !creds?.appSecret) {
    console.warn(`[Integration:${PROVIDER_ID}] missing appId/appSecret reason=credentials incomplete`);
    throw new ProviderError("CREDENTIALS_INVALID", "Flipkart App ID and App Secret are required");
  }
}

async function requestToken(creds) {
  const basic = Buffer.from(`${creds.appId}:${creds.appSecret}`).toString("base64");
  const config = {
    url: TOKEN_URL,
    params: { grant_type: "client_credentials", scope: TOKEN_SCOPE },
    headers: { Authorization: `Basic ${basic}` },
  };
  try {
    // TODO(verify): docs confirm URL + Basic auth; verb is likely GET.
    return await asTokenCall(() => http.request({ ...config, method: "GET" }));
  } catch (err) {
    if (err instanceof ProviderError && err.details?.status === 405) {
      console.warn(`[Integration:${PROVIDER_ID}] token GET rejected status=405, retrying with POST`);
      return asTokenCall(() => http.request({ ...config, method: "POST" }));
    }
    throw err;
  }
}

/** @returns {Promise<string>} bearer token */
export async function getAccessToken(creds, { force = false } = {}) {
  assertCreds(creds);
  const key = cacheKey(creds);
  const cached = tokenCache.get(key);
  if (!force && cached && cached.expiresAt - Date.now() > TOKEN_EXPIRY_MARGIN_MS) {
    return cached.token;
  }
  let res;
  try {
    res = await requestToken(creds);
  } catch (err) {
    // Bad app id/secret comes back as 400 invalid_client or 401.
    if (err instanceof ProviderError && err.type === "VALIDATION" && [400, 401].includes(err.details?.status)) {
      throw new ProviderError("CREDENTIALS_INVALID", "Flipkart rejected the App ID / App Secret", {
        details: err.details,
      });
    }
    throw err;
  }
  const token = res.data?.access_token;
  if (!token) {
    console.warn(`[Integration:${PROVIDER_ID}] token response had no access_token status=${res.status}`);
    throw new ProviderError("UPSTREAM_ERROR", "Flipkart did not return an access token");
  }
  const ttlSec = Number(res.data?.expires_in) || TOKEN_DEFAULT_TTL_SEC;
  tokenCache.set(key, { token, expiresAt: Date.now() + ttlSec * 1000 });
  return token;
}

/**
 * Authenticated request. On 401 refreshes the token once and retries.
 * @param {object} creds
 * @param {{method?:string,url:string,params?:object,data?:any}} config absolute URL
 */
export async function flipkartRequest(creds, config) {
  const send = async (force) => {
    const token = await getAccessToken(creds, { force });
    return http.request({
      ...config,
      headers: { ...(config.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  };
  try {
    return await send(false);
  } catch (err) {
    if (err instanceof ProviderError && err.type === "CREDENTIALS_INVALID") {
      console.warn(`[Integration:${PROVIDER_ID}] 401 on ${config.method || "GET"} ${config.url}, refreshing token once`);
      clearTokenCache(creds);
      return send(true);
    }
    throw err;
  }
}
