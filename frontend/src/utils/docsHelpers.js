export const asArray = (x) => (Array.isArray(x) ? x : []);
export const asText = (x) =>
  typeof x === "string" ? x : typeof x === "number" ? String(x) : "";

/** Only https URLs are allowed to be linked. */
export const safeHttps = (url) => {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
};

