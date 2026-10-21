import crypto from "crypto";

const PREFIX = "v1";
let cachedKey = null;
let warned = false;

function getKey() {
  if (cachedKey) return cachedKey;
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (raw) {
    cachedKey = /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, "hex")
      : crypto.createHash("sha256").update(raw).digest();
    return cachedKey;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("INTEGRATION_ENCRYPTION_KEY is required in production");
  }
  if (!warned) {
    warned = true;
    console.warn(
      "[Integration:vault] INTEGRATION_ENCRYPTION_KEY not set; using derived DEV key. Credentials encrypted now will not decrypt after setting a real key.",
    );
  }
  cachedKey = crypto.scryptSync(
    "dev-only-integration-key",
    "prodoc-integrations",
    32,
  );
  return cachedKey;
}

/** Encrypt a string. Output: v1:<iv b64>:<tag b64>:<ciphertext b64> */
export function encryptString(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptString(payload) {
  const parts = String(payload || "").split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Invalid encrypted payload format");
  }
  const [, iv, tag, data] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptObject(obj) {
  return encryptString(JSON.stringify(obj ?? {}));
}

export function decryptObject(payload) {
  return JSON.parse(decryptString(payload));
}

/** {key:value} -> {key:{hasValue,last4}}; last4 only for values of length >= 8 */
export function maskObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const s = v == null ? "" : String(v);
    out[k] = {
      hasValue: s.length > 0,
      last4: s.length >= 8 ? s.slice(-4) : "",
    };
  }
  return out;
}

/** test helper */
export function _resetKeyCache() {
  cachedKey = null;
  warned = false;
}

export default {
  encryptString,
  decryptString,
  encryptObject,
  decryptObject,
  maskObject,
};
