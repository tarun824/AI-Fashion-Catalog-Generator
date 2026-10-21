# Integrations

Each marketplace or shipping service is one provider class. Routes, services and UI never branch on provider id; they use the registry.

## Add a provider

1. Create `providers/<id>/<Id>Provider.js` extending `core/BaseProvider.js`:
   - set `static id` (must match an `Integration.name` enum value), `displayName`, `category` (`marketplace` | `shipping`), `capabilities`;
   - implement `credentialFields()` and the methods you support. Anything unsupported throws `ProviderError("UNSUPPORTED")` by default.
   - keep field mapping in a pure `<id>Mapper.js` (`toNormalizedOrder`, `toProviderListing`) so it can be unit tested with fixtures.
   - export a default instance: `export default new AmazonProvider();`
2. Add one line to `providers/index.js`:
   ```js
   import amazonProvider from "./amazon/AmazonProvider.js";
   export const providers = [shiprocketProvider, amazonProvider];
   ```

Providers are stateless: credentials are passed into every call. Use `core/httpClient.js` for outbound calls (timeout, retry/backoff on 429/5xx, secret redaction, ProviderError conversion).

## credentialFields()

```js
[{ key: "clientId", label: "Client ID", secret: false, required: true, help: "Seller Central > Developer" },
 { key: "refreshToken", label: "Refresh token", secret: true, required: true }]
```

Saved via `PUT /admin/integrations/:id/credentials`, encrypted with AES-256-GCM (`INTEGRATION_ENCRYPTION_KEY`) into `Integration.credentialsEnc`. API responses only contain `{ key: { hasValue, last4 } }`. A provider with no credential fields (Shiprocket) is treated as env-configured and uses the legacy test path.

## Contracts

- `fetchOrders` returns `NormalizedOrder[]` (see `core/schemas.js`); `orderImportService` upserts idempotently by `(marketplace.channel, marketplace.externalOrderId)`.
- `publishProduct` receives a `NormalizedListing` and returns `{ externalId, status, issues[] }`; honour `dryRun`.
- Throw `ProviderError(type, message, { retryable, details })` with one of: `CREDENTIALS_INVALID`, `RATE_LIMITED`, `PII_ROLE_MISSING`, `UNSUPPORTED`, `MAPPING_REQUIRED`, `UPSTREAM_ERROR`, `VALIDATION`.
- Never log secrets, tokens or buyer addresses. Every skipped/guarded path logs `[Integration:<id>] <what> <ids> reason=<why>`.

## Env

- `INTEGRATION_ENCRYPTION_KEY` (required in production; 64-char hex or any string)
- `PUBLIC_API_BASE_URL` public base including API prefix, used for image URLs (`<base>/images/:gridFsId`)

## External API call logging

Every outbound call made through `core/httpClient.js` (each retry is its own row) is written to `external_api_calls` (`models/ExternalApiCall.js`) via `logging/apiCallLogger.js`: buffered, batched `insertMany`, fire-and-forget, never throws into the caller. Bodies/headers are redacted (`logging/redaction.js`): secrets always; buyer PII (name/phone/email/address, pincode past 3 digits) masked unless `API_LOG_CAPTURE_PII=true`; bodies over the limit are stored as a truncated string (`bodyTruncated`); binary is stored as `{binary,size,contentType}`.

Attach business context once per request/webhook/job (inherited by all child async work):

```js
import { runWithApiContext, updateApiContext, newCorrelationId } from "./logging/apiCallContext.js";
await runWithApiContext({ correlationId: newCorrelationId(), operation: "confirmShipment", trigger: "manual", triggeredBy: adminId, context: { orderId } }, () => doWork());
updateApiContext({ context: { externalOrderId } }); // inside the run
```

Per-call overrides / opt-out: `client.request({ ..., apiLog: { operation: "fetchOrders", context: { orderId } } })`; `apiLog: false` skips logging for noisy calls. Call `hookProcessShutdown()` once at startup to flush on exit/SIGINT/SIGTERM.

Env: `API_LOG_ENABLED` (default `true`), `API_LOG_CAPTURE_PII` (default `false`), `API_LOG_RETENTION_SUCCESS_DAYS` (30), `API_LOG_RETENTION_FAILURE_DAYS` (90), `API_LOG_MAX_BODY_BYTES` (51200). Test: `node backend/src/integrations/logging/apiCallLogging.test.mjs`.

## In-app docs

Every provider folder should have a `docs.js` (`providers/<id>/docs.js`, default export) that powers the in-app setup guide. Served by `GET /api/admin/integrations/:id/docs` (404 `NOT_FOUND` when absent); the list endpoint adds `hasDocs` per entry. Loader: `core/docsLoader.js`; validator: `core/docsSchema.js`.

Schema:

```js
{ providerId, title, tagline, overview,
  howItWorks: [{ title, body }], capabilities: [{ label, button, description }],
  limitations: [string], prerequisites: [{ text, link? }],
  setup: [{ title, steps: [string], link?, note? }],
  fields: { [credentialKey]: { label, summary, whereToFind: [string], example, format, link?, tips: [string], warning?, required: boolean } },
  security: [string], usage: [{ title, steps: [string] }],
  troubleshooting: [{ problem, cause, fix }]  /* >= 5 */, glossary: [{ term, meaning }],
  links: [{ label, url }], lastVerified: "YYYY-MM-DD", unverified: [string] }
```

Rules: all links are valid `https` URLs; every `credentialFields()` key needs a `fields` entry (extras only warn); examples must be visibly fake (no real-looking tokens). Validate with `node backend/src/integrations/docs.test.mjs` (providers without `docs.js` print SKIP; exits non-zero on any error).
