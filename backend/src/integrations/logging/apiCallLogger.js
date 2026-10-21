import mongoose from "mongoose";
import ExternalApiCall from "../../models/ExternalApiCall.js";
import { getApiContext } from "./apiCallContext.js";
import {
  sanitizeBody,
  sanitizeHeaders,
  sanitizeUrl,
  RESPONSE_HEADER_KEEP,
} from "./redaction.js";

const DAY_MS = 86400000;
const TRIGGERS = ["manual", "webhook", "system"];

let buffer = [];
let timer = null;
let flushPromise = null;
let sink = null; // test hook
let dropped = 0;
let disabledWarned = false;
let lastDisconnectedWarn = 0;
let shutdownHooked = false;

const envNum = (name, def) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : def;
};

export function getApiLogSettings() {
  return {
    enabled: String(process.env.API_LOG_ENABLED ?? "true").toLowerCase() !== "false",
    capturePII: String(process.env.API_LOG_CAPTURE_PII ?? "false").toLowerCase() === "true",
    retentionSuccessDays: envNum("API_LOG_RETENTION_SUCCESS_DAYS", 30),
    retentionFailureDays: envNum("API_LOG_RETENTION_FAILURE_DAYS", 90),
    maxBodyBytes: envNum("API_LOG_MAX_BODY_BYTES", 51200),
    bufferMax: envNum("API_LOG_BUFFER_MAX", 5000),
    batchSize: 50,
    flushMs: 1000,
  };
}

/** Pre-generated id so retries can reference retryOf. */
export function newCallId() {
  return new mongoose.Types.ObjectId();
}

/** Test hook: sink(docs) replaces ExternalApiCall.insertMany. Pass null to reset. */
export function setSink(fn) {
  sink = typeof fn === "function" ? fn : null;
}

export function getBufferSize() {
  return buffer.length;
}

/** Test hook: clear buffer/timers/counters. */
export function resetApiCallLogger() {
  buffer = [];
  dropped = 0;
  disabledWarned = false;
  lastDisconnectedWarn = 0;
  if (timer) clearTimeout(timer);
  timer = null;
}

const toObjectId = (v, label) => {
  if (v == null || v === "") return null;
  if (v instanceof mongoose.Types.ObjectId) return v;
  if (typeof v === "object" && v._id) return toObjectId(v._id, label);
  if (/^[a-f0-9]{24}$/i.test(String(v))) return new mongoose.Types.ObjectId(String(v));
  console.warn(`[ApiLog] ${label} is not a valid ObjectId (${String(v).slice(0, 40)}); stored as null`);
  return null;
};
const str = (v) => (v == null ? undefined : String(v));

function scheduleFlush(delay) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flushApiCalls();
  }, delay ?? getApiLogSettings().flushMs);
  if (typeof timer.unref === "function") timer.unref();
}

/** Fire-and-forget. Never throws, never blocks. */
export function recordApiCall(entry = {}) {
  try {
    const s = getApiLogSettings();
    if (!s.enabled) {
      if (!disabledWarned) {
        disabledWarned = true;
        console.warn("[ApiLog] API_LOG_ENABLED=false; external API calls will not be recorded");
      }
      return;
    }
    const ctx = getApiContext() || {};
    const provider = entry.provider ?? ctx.provider;
    if (!provider) {
      console.warn(
        `[ApiLog] skipped: no provider (operation=${entry.operation ?? ctx.operation ?? "unknown"} url=${String(entry.url ?? "").slice(0, 80)})`,
      );
      return;
    }
    let trigger = entry.trigger ?? ctx.trigger ?? "system";
    if (!TRIGGERS.includes(trigger)) {
      console.warn(`[ApiLog] invalid trigger "${trigger}"; using "system"`);
      trigger = "system";
    }
    const success = !!entry.success;
    const now = Date.now();
    const days = success ? s.retentionSuccessDays : s.retentionFailureDays;
    const { url, host } = sanitizeUrl(entry.url);
    const reqCT = entry.headers?.["content-type"] ?? entry.headers?.["Content-Type"];
    const req = sanitizeBody(entry.requestBody, {
      capturePII: s.capturePII,
      maxBytes: s.maxBodyBytes,
      contentType: reqCT,
    });
    const res = sanitizeBody(entry.responseBody, {
      capturePII: s.capturePII,
      maxBytes: s.maxBodyBytes,
      contentType: entry.responseContentType,
    });
    const doc = {
      _id: entry._id ?? newCallId(),
      provider: String(provider),
      operation: entry.operation ?? ctx.operation ?? "unknown",
      direction: entry.direction === "inbound" ? "inbound" : "outbound",
      correlationId: entry.correlationId ?? ctx.correlationId,
      attempt: entry.attempt ?? 1,
      retryOf: toObjectId(entry.retryOf, "retryOf"),
      trigger,
      triggeredBy: toObjectId(entry.triggeredBy ?? ctx.triggeredBy, "triggeredBy"),
      context: {
        orderId: str(entry.context?.orderId ?? ctx.context?.orderId),
        externalOrderId: str(entry.context?.externalOrderId ?? ctx.context?.externalOrderId),
        productId: str(entry.context?.productId ?? ctx.context?.productId),
        sku: str(entry.context?.sku ?? ctx.context?.sku),
      },
      request: {
        method: entry.method,
        url,
        host: host ?? entry.host,
        headers: sanitizeHeaders(entry.headers),
        body: req.body,
        bodyTruncated: req.bodyTruncated,
        bodySize: req.bodySize,
      },
      response: {
        status: entry.status,
        headers: sanitizeHeaders(entry.responseHeaders, { keep: RESPONSE_HEADER_KEEP }),
        body: res.body,
        bodyTruncated: res.bodyTruncated,
        bodySize: res.bodySize,
        contentType: entry.responseContentType,
      },
      success,
      durationMs: entry.durationMs,
      errorType: entry.errorType,
      errorMessage: entry.errorMessage ? String(entry.errorMessage).slice(0, 2000) : undefined,
      startedAt: entry.startedAt ?? new Date(now),
      expiresAt: new Date(now + days * DAY_MS),
    };
    buffer.push(doc);
    if (buffer.length > s.bufferMax) {
      const over = buffer.length - s.bufferMax;
      buffer.splice(0, over);
      const before = dropped;
      dropped += over;
      if (before === 0 || Math.floor(dropped / 100) > Math.floor(before / 100)) {
        console.warn(`[ApiLog] buffer full (max=${s.bufferMax}); dropped ${dropped} oldest call(s) so far`);
      }
    }
    if (buffer.length >= s.batchSize) flushApiCalls();
    else scheduleFlush(s.flushMs);
  } catch (err) {
    console.warn(`[ApiLog] recordApiCall failed: ${err.message}`);
  }
}

async function doFlush() {
  while (buffer.length) {
    if (!sink && mongoose.connection.readyState !== 1) {
      const t = Date.now();
      if (t - lastDisconnectedWarn > 30000) {
        lastDisconnectedWarn = t;
        console.warn(
          `[ApiLog] mongoose not connected (readyState=${mongoose.connection.readyState}); retaining ${buffer.length} call(s) in buffer`,
        );
      }
      scheduleFlush(5000);
      return;
    }
    const docs = buffer.splice(0, buffer.length);
    try {
      if (sink) await sink(docs);
      else await ExternalApiCall.insertMany(docs, { ordered: false });
    } catch (err) {
      console.warn(`[ApiLog] insert of ${docs.length} call(s) failed (dropped): ${err.message}`);
    }
  }
}

/** Awaitable flush (tests/shutdown). Never rejects. */
export async function flushApiCalls() {
  try {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (flushPromise) await flushPromise;
    if (!buffer.length) return;
    flushPromise = doFlush().finally(() => {
      flushPromise = null;
    });
    await flushPromise;
  } catch (err) {
    console.warn(`[ApiLog] flushApiCalls failed: ${err.message}`);
  }
}

/** Idempotent. Flushes on beforeExit / SIGINT / SIGTERM; never calls process.exit. */
export function hookProcessShutdown() {
  if (shutdownHooked) return;
  shutdownHooked = true;
  process.on("beforeExit", () => {
    flushApiCalls();
  });
  for (const sig of ["SIGINT", "SIGTERM"]) {
    const handler = async () => {
      const guard = new Promise((r) => setTimeout(r, 3000).unref());
      await Promise.race([flushApiCalls(), guard]);
      process.removeListener(sig, handler);
      // Restore default termination if nobody else handles the signal.
      if (process.listenerCount(sig) === 0) process.kill(process.pid, sig);
    };
    process.on(sig, handler);
  }
}
