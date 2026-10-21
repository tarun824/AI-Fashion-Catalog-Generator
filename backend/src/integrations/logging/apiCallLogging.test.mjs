// Run: node backend/src/integrations/logging/apiCallLogging.test.mjs  (no network, no DB)
import assert from "node:assert/strict";
import { runWithApiContext, getApiContext, updateApiContext, newCorrelationId } from "./apiCallContext.js";
import { sanitizeBody, sanitizeHeaders, sanitizeUrl } from "./redaction.js";
import { recordApiCall, flushApiCalls, setSink, resetApiCallLogger, getBufferSize, newCallId } from "./apiCallLogger.js";
import { createHttpClient } from "../core/httpClient.js";

let passed = 0;
const origWarn = console.warn;
const origErr = console.error;
const quiet = () => { console.warn = () => {}; console.error = () => {}; };
const loud = () => { console.warn = origWarn; console.error = origErr; };
async function t(name, fn) {
  try {
    resetApiCallLogger();
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (e) {
    loud();
    console.error(`FAIL - ${name}\n`, e);
    process.exit(1);
  } finally {
    loud();
    setSink(null);
  }
}
const capture = () => {
  const rows = [];
  setSink(async (docs) => rows.push(...docs));
  return rows;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await t("secrets always redacted incl. form-encoded", () => {
  const { body } = sanitizeBody({ client_secret: "s", refresh_token: "r", nested: { access_token: "a", restrictedDataToken: "x", ok: 1 }, password: "p" }, { capturePII: true });
  assert.equal(body.client_secret, "[REDACTED]");
  assert.equal(body.refresh_token, "[REDACTED]");
  assert.equal(body.nested.access_token, "[REDACTED]");
  assert.equal(body.nested.restrictedDataToken, "[REDACTED]");
  assert.equal(body.nested.ok, 1);
  const f = sanitizeBody("grant_type=refresh_token&client_secret=abc&client_id=me", { capturePII: true });
  assert.equal(f.body.client_secret, "[REDACTED]");
  assert.equal(f.body.client_id, "me");
  assert.ok(!JSON.stringify(f.body).includes("abc"));
});

await t("PII masked by default, unmasked with capturePII", () => {
  const src = { buyerName: "Rahul Sharma", phone: "9876543210", BuyerEmail: "rahul@x.com", AddressLine1: "12 MG Road", city: "Pune", postalCode: "411001" };
  const m = sanitizeBody(src, { capturePII: false }).body;
  assert.equal(m.buyerName, "R***");
  assert.equal(m.phone, "******3210");
  assert.equal(m.BuyerEmail, "r***@x.com");
  assert.equal(m.AddressLine1, "***");
  assert.equal(m.city, "Pune");
  assert.equal(m.postalCode, "411***");
  const u = sanitizeBody(src, { capturePII: true }).body;
  assert.equal(u.buyerName, "Rahul Sharma");
  assert.equal(u.phone, "9876543210");
});

await t("headers sanitized", () => {
  const h = sanitizeHeaders({ Authorization: "Bearer x", "x-amz-access-token": "t", Cookie: "c", Accept: "json", "X-Custom-Secret": "s" });
  assert.equal(h.authorization, "[REDACTED]");
  assert.equal(h["x-amz-access-token"], "[REDACTED]");
  assert.equal(h.cookie, "[REDACTED]");
  assert.equal(h["x-custom-secret"], "[REDACTED]");
  assert.equal(h.accept, "json");
  const r = sanitizeHeaders({ "content-type": "a", "retry-after": "3", "x-ratelimit-remaining": "9", "set-cookie": "z", server: "n" }, { keep: ["content-type", "retry-after", "x-ratelimit-*"] });
  assert.deepEqual(r, { "content-type": "a", "retry-after": "3", "x-ratelimit-remaining": "9" });
});

await t("url query secrets masked, host split", () => {
  const r = sanitizeUrl("https://api.x.com/orders?token=abc&page=2");
  assert.equal(r.host, "api.x.com");
  assert.ok(!r.url.includes("abc") && r.url.includes("page=2"));
});

await t("truncation", () => {
  const r = sanitizeBody({ data: "x".repeat(5000) }, { capturePII: false, maxBytes: 1000 });
  assert.equal(r.bodyTruncated, true);
  assert.equal(typeof r.body, "string");
  assert.ok(Buffer.byteLength(r.body) <= 1000);
  assert.ok(r.bodySize > 5000);
});

await t("binary handling", () => {
  const r = sanitizeBody(Buffer.alloc(2048), { contentType: "application/pdf" });
  assert.deepEqual(r.body, { binary: true, size: 2048, contentType: "application/pdf" });
  assert.equal(r.bodySize, 2048);
  assert.equal(sanitizeBody(new ArrayBuffer(10)).body.binary, true);
});

await t("ALS propagates through await and setTimeout; updateApiContext", async () => {
  const seen = [];
  await runWithApiContext({ correlationId: "c1", operation: "op", context: { orderId: "o1" } }, async () => {
    await sleep(5);
    seen.push(getApiContext().correlationId);
    updateApiContext({ trigger: "manual", context: { sku: "S1" } });
    await new Promise((r) => setTimeout(() => { seen.push(getApiContext().context); r(); }, 5));
  });
  assert.equal(seen[0], "c1");
  assert.deepEqual(seen[1], { orderId: "o1", sku: "S1" });
  assert.equal(getApiContext(), undefined);
  quiet();
  updateApiContext({ a: 1 }); // no-op
  loud();
  assert.match(newCorrelationId(), /^[0-9a-f-]{36}$/);
});

await t("recordApiCall merges context, expiresAt success vs failure", async () => {
  const rows = capture();
  runWithApiContext({ correlationId: "cc", operation: "fetchOrders", trigger: "manual", context: { orderId: "o9" } }, () => {
    recordApiCall({ provider: "amazon", method: "GET", url: "https://a.com/x", success: true, status: 200 });
    recordApiCall({ provider: "amazon", operation: "explicit", method: "GET", url: "/y", success: false, status: 500, context: { sku: "Z" } });
  });
  await flushApiCalls();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].correlationId, "cc");
  assert.equal(rows[0].operation, "fetchOrders");
  assert.equal(rows[0].trigger, "manual");
  assert.equal(rows[0].context.orderId, "o9");
  assert.equal(rows[1].operation, "explicit");
  assert.equal(rows[1].context.sku, "Z");
  const days = (d) => Math.round((d.expiresAt - Date.now()) / 86400000);
  assert.equal(days(rows[0]), 30);
  assert.equal(days(rows[1]), 90);
});

await t("httpClient: retry rows with attempt/retryOf, opt-out, secrets", async () => {
  const rows = capture();
  let n = 0;
  const fake = {
    defaults: { baseURL: "https://sp.example.com" },
    async request(cfg) {
      n++;
      if (n < 3) {
        const e = new Error("boom");
        e.response = { status: 503, headers: { "retry-after": "0" }, data: { err: 1 } };
        throw e;
      }
      return { status: 200, data: { ok: true, buyerName: "Asha K" }, headers: { "content-type": "application/json" } };
    },
  };
  quiet();
  const client = createHttpClient({ providerId: "amazon", axiosInstance: fake, retryBaseMs: 1, maxRetries: 3 });
  const res = await client.request({ method: "POST", url: "/orders", params: { page: 1 }, data: { client_secret: "zzz" }, headers: { Authorization: "Bearer q" }, apiLog: { operation: "fetchOrders", context: { orderId: "O1" } } });
  assert.equal(res.status, 200);
  await client.get("/quiet", { apiLog: false });
  loud();
  await flushApiCalls();
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.attempt), [1, 2, 3]);
  assert.equal(rows[0].retryOf, null);
  assert.equal(String(rows[1].retryOf), String(rows[0]._id));
  assert.equal(String(rows[2].retryOf), String(rows[1]._id));
  assert.deepEqual(rows.map((r) => r.success), [false, false, true]);
  assert.equal(rows[0].errorType, "HTTP_503");
  assert.equal(rows[0].operation, "fetchOrders");
  assert.equal(rows[0].context.orderId, "O1");
  assert.equal(rows[0].request.url, "/orders?page=1");
  assert.equal(rows[0].request.host, "sp.example.com");
  assert.equal(rows[0].request.headers.authorization, "[REDACTED]");
  assert.equal(rows[0].request.body.client_secret, "[REDACTED]");
  assert.equal(rows[2].response.body.buyerName, "A***");
  assert.equal(rows[2].response.headers["content-type"], "application/json");
});

await t("httpClient: network error uses err.code", async () => {
  const rows = capture();
  const fake = { async request() { const e = new Error("t/o"); e.code = "ECONNABORTED"; throw e; } };
  quiet();
  const c = createHttpClient({ providerId: "p", axiosInstance: fake, maxRetries: 0 });
  await assert.rejects(() => c.get("/x"));
  loud();
  await flushApiCalls();
  assert.equal(rows[0].errorType, "ECONNABORTED");
  assert.equal(rows[0].response.status, undefined);
});

await t("logger never throws when sink fails; bad input tolerated", async () => {
  setSink(async () => { throw new Error("db down"); });
  quiet();
  recordApiCall({ provider: "x", success: true });
  recordApiCall(null);
  recordApiCall({ success: true }); // no provider -> warn+skip
  recordApiCall({ provider: "x", requestBody: (() => { const a = {}; a.self = a; return a; })(), success: false });
  await flushApiCalls();
  loud();
  assert.equal(getBufferSize(), 0);
});

await t("buffer bounded", async () => {
  process.env.API_LOG_BUFFER_MAX = "10";
  // sink unset + mongoose not connected => rows retained up to bound
  quiet();
  for (let i = 0; i < 25; i++) recordApiCall({ provider: "x", success: true, attempt: i });
  loud();
  // batch flush attempts don't drain while disconnected
  assert.equal(getBufferSize(), 10);
  delete process.env.API_LOG_BUFFER_MAX;
  resetApiCallLogger();
});

await t("API_LOG_ENABLED=false disables", async () => {
  process.env.API_LOG_ENABLED = "false";
  const rows = capture();
  quiet();
  recordApiCall({ provider: "x", success: true });
  loud();
  await flushApiCalls();
  delete process.env.API_LOG_ENABLED;
  assert.equal(rows.length, 0);
  assert.ok(newCallId());
});

console.log(`\n${passed} passed`);
process.exit(0);
