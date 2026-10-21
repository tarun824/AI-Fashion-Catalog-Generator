import axios from "axios";
import { ProviderError } from "./errors.js";
import { recordApiCall, newCallId } from "../logging/apiCallLogger.js";

const REDACT_HEADERS = [
  "authorization",
  "x-amz-access-token",
  "x-api-key",
  "cookie",
];
const SECRET_KEY_RE =
  /(secret|token|password|authorization|api[-_]?key|refresh)/i;

/** Deep-ish redaction for log/detail output. */
export function redact(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] =
        SECRET_KEY_RE.test(k) || REDACT_HEADERS.includes(k.toLowerCase())
          ? "[REDACTED]"
          : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(res, attempt, baseMs) {
  const ra = res?.headers?.["retry-after"];
  if (ra) {
    const secs = Number(ra);
    if (!Number.isNaN(secs)) return Math.min(secs * 1000, 60000);
    const date = Date.parse(ra);
    if (!Number.isNaN(date))
      return Math.min(Math.max(date - Date.now(), 0), 60000);
  }
  return Math.min(baseMs * 2 ** attempt, 30000);
}

/**
 * Create an HTTP client for a provider.
 * @param {{providerId:string, baseURL?:string, timeoutMs?:number, maxRetries?:number, retryBaseMs?:number, headers?:object, axiosInstance?:object}} opts
 */
export function createHttpClient({
  providerId,
  baseURL,
  timeoutMs = 30000,
  maxRetries = 3,
  retryBaseMs = 500,
  headers = {},
  axiosInstance,
}) {
  const instance =
    axiosInstance || axios.create({ baseURL, timeout: timeoutMs, headers });

  /**
   * @param {{method?:string,url:string,params?:object,data?:any,headers?:object}} config
   * @returns {Promise<{status:number,data:any,headers:object}>}
   */
  async function request(rawConfig) {
    const { apiLog, ...config } = rawConfig;
    const method = (config.method || "GET").toUpperCase();
    const logOn = apiLog !== false;
    let prevId = null;
    for (let attempt = 0; ; attempt++) {
      const callId = logOn ? newCallId() : null;
      const startedAt = new Date();
      const t0 = Date.now();
      const log = (extra) => {
        if (!logOn) return;
        try {
          recordApiCall({
            _id: callId,
            provider: providerId,
            operation: apiLog?.operation,
            context: apiLog?.context,
            method,
            url: buildFullUrl(instance, baseURL, config),
            headers: { ...headers, ...(config.headers || {}) },
            requestBody: config.data,
            attempt: attempt + 1,
            retryOf: prevId,
            durationMs: Date.now() - t0,
            startedAt,
            ...extra,
          });
        } catch (e) {
          console.warn(`[Integration:${providerId}] api log failed: ${e.message}`);
        }
      };
      try {
        const res = await instance.request({
          timeout: timeoutMs,
          ...config,
          method,
        });
        log({
          status: res.status,
          responseHeaders: res.headers,
          responseBody: res.data,
          responseContentType: res.headers?.["content-type"],
          success: res.status >= 200 && res.status < 300,
        });
        return { status: res.status, data: res.data, headers: res.headers };
      } catch (err) {
        const res = err.response;
        const status = res?.status;
        log({
          status,
          responseHeaders: res?.headers,
          responseBody: res?.data,
          responseContentType: res?.headers?.["content-type"],
          success: false,
          errorType: status ? `HTTP_${status}` : err.code || err.name || "NETWORK_ERROR",
          errorMessage: err.message,
        });
        prevId = callId;
        const retryable =
          !res || status === 429 || (status >= 500 && status < 600);
        if (retryable && attempt < maxRetries) {
          const delay = retryDelayMs(res, attempt, retryBaseMs);
          console.warn(
            `[Integration:${providerId}] retry ${attempt + 1}/${maxRetries} ${method} ${config.url} status=${status ?? err.code} in ${delay}ms`,
          );
          await sleep(delay);
          continue;
        }
        throw toProviderError(providerId, method, config.url, err);
      }
    }
  }

  return {
    request,
    get: (url, config = {}) => request({ ...config, method: "GET", url }),
    post: (url, data, config = {}) =>
      request({ ...config, method: "POST", url, data }),
    put: (url, data, config = {}) =>
      request({ ...config, method: "PUT", url, data }),
    patch: (url, data, config = {}) =>
      request({ ...config, method: "PATCH", url, data }),
    delete: (url, config = {}) => request({ ...config, method: "DELETE", url }),
  };
}

/** baseURL + path + serialized query (secrets in query are masked by the logger). */
function buildFullUrl(instance, baseURL, config) {
  try {
    const base = config.baseURL || instance?.defaults?.baseURL || baseURL || "";
    let url = String(config.url ?? "");
    if (!/^https?:\/\//i.test(url)) {
      url = base.replace(/\/+$/, "") + (url.startsWith("/") || !url ? "" : "/") + url;
    }
    if (config.params && typeof config.params === "object") {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(config.params)) {
        if (v == null) continue;
        if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
        else qs.append(k, String(v));
      }
      const q = qs.toString();
      if (q) url += (url.includes("?") ? "&" : "?") + q;
    }
    return url;
  } catch (e) {
    console.warn(`[Integration] api log url build failed: ${e.message}`);
    return String(config.url ?? "");
  }
}

function toProviderError(providerId, method, url, err) {
  const status = err.response?.status;
  const body = err.response?.data;
  const safeDetails = {
    status: status ?? null,
    code: err.code ?? null,
    body: redact(body),
  };
  // Never log request headers/body (may hold secrets/PII): only method/url/status.
  console.error(
    `[Integration:${providerId}] ${method} ${url} failed status=${status ?? err.code ?? "n/a"}`,
  );
  if (status === 401) {
    return new ProviderError(
      "CREDENTIALS_INVALID",
      "Marketplace rejected the credentials",
      { details: safeDetails },
    );
  }
  if (status === 403) {
    return new ProviderError(
      "PII_ROLE_MISSING",
      "Marketplace denied access (missing permission/role)",
      { details: safeDetails },
    );
  }
  if (status === 429) {
    return new ProviderError("RATE_LIMITED", "Marketplace rate limit hit", {
      details: safeDetails,
      retryable: true,
    });
  }
  if (status >= 400 && status < 500) {
    return new ProviderError(
      "VALIDATION",
      "Marketplace rejected the request",
      { details: safeDetails, status: 400, retryable: false },
    );
  }
  return new ProviderError(
    "UPSTREAM_ERROR",
    err.code === "ECONNABORTED"
      ? "Marketplace request timed out"
      : "Marketplace request failed",
    { details: safeDetails },
  );
}

export default createHttpClient;
