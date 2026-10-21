import { createHttpClient } from "../../core/httpClient.js";
import { ProviderError } from "../../core/errors.js";
import { PROVIDER_ID, DEFAULT_API_VERSION } from "./shopifyConfig.js";

const http = createHttpClient({ providerId: PROVIDER_ID, maxRetries: 2 });

const str = (v) => (v == null ? "" : String(v).trim());

function assertCreds(creds) {
  if (!str(creds?.shopDomain) || !str(creds?.accessToken)) {
    console.warn(`[Integration:${PROVIDER_ID}] missing shopDomain/accessToken reason=credentials incomplete`);
    throw new ProviderError("CREDENTIALS_INVALID", "Shopify store domain and Admin API access token are required");
  }
}

/** Normalizes "my-store.myshopify.com" / "https://my-store.myshopify.com/" to a bare host. */
export function shopHost(creds) {
  return str(creds.shopDomain)
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

export function apiBase(creds) {
  const version = str(creds.apiVersion) || DEFAULT_API_VERSION;
  return `https://${shopHost(creds)}/admin/api/${version}`;
}

/**
 * Authenticated Shopify Admin REST request. Static token, no refresh flow.
 * @param {object} creds
 * @param {{method?:string,url:string,params?:object,data?:any}} config url relative to apiBase, or absolute (pagination next-page links)
 */
export async function shopifyRequest(creds, config) {
  assertCreds(creds);
  const url = /^https?:\/\//i.test(config.url) ? config.url : `${apiBase(creds)}${config.url}`;
  try {
    return await http.request({
      ...config,
      url,
      headers: {
        ...(config.headers || {}),
        "X-Shopify-Access-Token": creds.accessToken,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof ProviderError && err.type === "CREDENTIALS_INVALID") {
      throw new ProviderError("CREDENTIALS_INVALID", "Shopify rejected the Admin API access token", {
        details: err.details,
      });
    }
    throw err;
  }
}

/** Parses the RFC 5988 Link header Shopify uses for cursor pagination. Returns {next, prev} absolute URLs or null. */
export function parseLinkHeader(headerValue) {
  const out = { next: null, prev: null };
  if (!headerValue) return out;
  for (const part of String(headerValue).split(",")) {
    const m = part.match(/<([^>]+)>;\s*rel="(next|previous)"/);
    if (!m) continue;
    const rel = m[2] === "previous" ? "prev" : "next";
    out[rel] = m[1];
  }
  return out;
}
