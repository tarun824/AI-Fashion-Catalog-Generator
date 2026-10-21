/** Shared helpers for the API call log screens (page, drawer, order history). */

export const LOG_PROVIDERS = [
  "amazon",
  "flipkart",
  "shopify",
  "myntra",
  "meesho",
  "shiprocket",
];

/** Returns "2xx" | "3xx" | "4xx" | "5xx" | "network" for a response status. */
export function statusClassOf(status) {
  if (!status) return "network";
  if (status < 300) return "2xx";
  if (status < 400) return "3xx";
  if (status < 500) return "4xx";
  return "5xx";
}

// Static class maps only (Tailwind cannot see dynamic names).
export const STATUS_PILL_STYLES = {
  "2xx": "bg-green-100 text-green-900 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700",
  "3xx": "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700",
  "4xx": "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
  "5xx": "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
  network:
    "bg-slate-200 text-slate-900 border-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500",
};

export function formatDuration(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return "-";
  const n = Number(ms);
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(n < 10000 ? 2 : 1)} s`;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Pretty-print a body that may be an object or a JSON string. */
export function prettyBody(body) {
  if (body === undefined || body === null || body === "") return "";
  if (typeof body === "string") {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

/** Success-rate tone for stats cards: green >= 98, amber >= 90, red below. */
export function rateTone(rate) {
  if (rate == null) return "slate";
  if (rate >= 98) return "green";
  if (rate >= 90) return "amber";
  return "red";
}
