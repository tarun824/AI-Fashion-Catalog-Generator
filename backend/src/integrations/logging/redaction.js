/** Redaction helpers for external API call logs. Never throws. */

const SENSITIVE_HEADER_RE = /(secret|token|key|password|authorization|cookie)/i;
const SECRET_KEY_RE =
  /(secret|token|password|passwd|authorization|api[-_]?key|apikey|refresh|credential|signature)/i;

export const RESPONSE_HEADER_KEEP = [
  "content-type",
  "retry-after",
  "x-amzn-requestid",
  "x-amzn-ratelimit-limit",
  "x-amz-rid",
  "x-ratelimit-*",
  "x-request-id",
  "date",
];

const MASK = "[REDACTED]";
const MAX_DEPTH = 12;

export function isSensitiveHeader(name) {
  return SENSITIVE_HEADER_RE.test(String(name));
}

/**
 * @param {object} headers
 * @param {{keep?:string[]}} [opts] keep = whitelist (supports trailing '*'); when given only these
 *   (non-sensitive) headers are returned. Without it, all headers are returned with sensitive ones masked.
 */
export function sanitizeHeaders(headers, { keep } = {}) {
  if (!headers || typeof headers !== "object") return undefined;
  try {
    const raw = typeof headers.toJSON === "function" ? headers.toJSON() : headers;
    const out = {};
    const allowed = keep?.map((k) => k.toLowerCase());
    for (const [name, value] of Object.entries(raw)) {
      const lower = name.toLowerCase();
      if (value === undefined || value === null) continue;
      if (isSensitiveHeader(lower)) {
        if (!allowed) out[lower] = MASK;
        continue;
      }
      if (allowed) {
        const ok = allowed.some((k) =>
          k.endsWith("*") ? lower.startsWith(k.slice(0, -1)) : lower === k,
        );
        if (!ok) continue;
      }
      out[lower] = Array.isArray(value) ? value.join(", ") : String(value);
    }
    return out;
  } catch (err) {
    console.warn(`[ApiLog] sanitizeHeaders failed: ${err.message}`);
    return undefined;
  }
}

const normKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");

function piiKind(key) {
  const k = normKey(key);
  if (/^addressline\d*$/.test(k) || ["address", "street", "streetaddress"].includes(k)) return "address";
  if (
    [
      "name", "buyername", "customername", "fullname", "recipientname",
      "shippingname", "billingname", "firstname", "lastname",
    ].includes(k)
  )
    return "name";
  if (
    ["phone", "phonenumber", "contactnumber", "mobile", "mobilenumber", "buyerphone", "contact"].includes(k)
  )
    return "phone";
  if (["email", "buyeremail", "emailaddress", "customeremail"].includes(k)) return "email";
  if (["postalcode", "pincode", "zip", "zipcode"].includes(k)) return "postal";
  return null;
}

export function maskValue(kind, value) {
  const s = String(value);
  if (!s) return s;
  switch (kind) {
    case "name":
      return `${s[0]}***`;
    case "phone":
      return `******${s.replace(/\D/g, "").slice(-4)}`;
    case "email": {
      const at = s.indexOf("@");
      return at > 0 ? `${s[0]}***${s.slice(at)}` : `${s[0]}***`;
    }
    case "postal":
      return `${s.slice(0, 3)}***`;
    default:
      return "***";
  }
}

// Mongo-unsafe keys ('.' and leading '$') would break inserts.
const safeKey = (k) => k.replace(/\./g, "_").replace(/^\$/, "_$");

function isBinary(v) {
  return (
    Buffer.isBuffer(v) ||
    v instanceof ArrayBuffer ||
    ArrayBuffer.isView(v) ||
    (typeof v === "object" && typeof v.pipe === "function") ||
    (typeof Blob !== "undefined" && v instanceof Blob)
  );
}

function binarySize(v) {
  if (v?.byteLength != null) return v.byteLength;
  if (v?.size != null) return v.size;
  return undefined;
}

function walk(value, capturePII, depth) {
  if (value == null || typeof value !== "object") return value;
  if (depth > MAX_DEPTH) return "[MAX_DEPTH]";
  if (isBinary(value)) return { binary: true, size: binarySize(value) };
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => walk(v, capturePII, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const key = safeKey(k);
    if (SECRET_KEY_RE.test(k)) {
      out[key] = MASK;
      continue;
    }
    if (!capturePII) {
      const kind = piiKind(k);
      if (kind && v != null && typeof v !== "object") {
        out[key] = maskValue(kind, v);
        continue;
      }
    }
    out[key] = walk(v, capturePII, depth + 1);
  }
  return out;
}

function looksFormEncoded(s) {
  return /^[A-Za-z0-9_.\-%+[\]]+=[^\s]*(&[A-Za-z0-9_.\-%+[\]]+=[^\s]*)*$/.test(s);
}

const envInt = (name, def) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : def;
};

export const defaultMaxBodyBytes = () => envInt("API_LOG_MAX_BODY_BYTES", 51200);
export const defaultCapturePII = () =>
  String(process.env.API_LOG_CAPTURE_PII || "false").toLowerCase() === "true";

/**
 * @returns {{body:any, bodyTruncated:boolean, bodySize:number|undefined}}
 */
export function sanitizeBody(
  body,
  { capturePII = defaultCapturePII(), maxBytes = defaultMaxBodyBytes(), contentType } = {},
) {
  try {
    if (body === undefined || body === null)
      return { body: undefined, bodyTruncated: false, bodySize: undefined };
    if (isBinary(body)) {
      const size = binarySize(body);
      return {
        body: { binary: true, size, ...(contentType ? { contentType } : {}) },
        bodyTruncated: false,
        bodySize: size,
      };
    }
    let bodySize;
    let work = body;
    if (typeof body === "string") {
      bodySize = Buffer.byteLength(body);
      const t = body.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try {
          work = JSON.parse(t);
        } catch {
          work = body;
        }
      } else if (looksFormEncoded(t)) {
        const o = {};
        for (const [k, v] of new URLSearchParams(t)) o[k] = v;
        work = o;
      }
    } else {
      try {
        bodySize = Buffer.byteLength(JSON.stringify(body) ?? "");
      } catch {
        bodySize = undefined;
      }
    }
    let clean;
    if (typeof work === "string") {
      // Opaque text (XML/HTML...): mask obvious secret assignments only.
      clean = work.replace(
        /((?:secret|token|password|api[-_]?key)[^=:"'\s]*["']?\s*[=:]\s*["']?)[^&\s"',;]+/gi,
        `$1${MASK}`,
      );
    } else {
      clean = walk(work, capturePII, 0);
    }
    const serialized = typeof clean === "string" ? clean : JSON.stringify(clean);
    if (serialized !== undefined && Buffer.byteLength(serialized) > maxBytes) {
      const preview = Buffer.from(serialized).subarray(0, maxBytes).toString("utf8");
      return {
        body: preview,
        bodyTruncated: true,
        bodySize: bodySize ?? Buffer.byteLength(serialized),
      };
    }
    return { body: clean, bodyTruncated: false, bodySize };
  } catch (err) {
    console.warn(`[ApiLog] sanitizeBody failed: ${err.message}`);
    return { body: "[UNSANITIZABLE]", bodyTruncated: false, bodySize: undefined };
  }
}

/** Split a URL into { url: path + sanitized query, host }. Secret-like query params are masked. */
export function sanitizeUrl(rawUrl) {
  if (!rawUrl) return { url: undefined, host: undefined };
  try {
    const u = new URL(String(rawUrl), "http://relative.invalid");
    const relative = u.host === "relative.invalid";
    for (const k of [...u.searchParams.keys()]) {
      if (SECRET_KEY_RE.test(k)) u.searchParams.set(k, MASK);
    }
    return { url: `${u.pathname}${u.search}`, host: relative ? undefined : u.host };
  } catch (err) {
    console.warn(`[ApiLog] sanitizeUrl failed: ${err.message}`);
    return { url: String(rawUrl).split("?")[0], host: undefined };
  }
}
