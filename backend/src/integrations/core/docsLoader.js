/**
 * Loads providers/<id>/docs.js by convention, validates, caches.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import registry from "./registry.js";
import { validateDocs } from "./docsSchema.js";

const PROVIDERS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "providers");
const ID_RE = /^[a-z0-9_-]+$/;
const cache = new Map(); // id -> docs (only successful loads are cached)

function credentialKeysOf(providerId) {
  try {
    const p = registry.get(providerId);
    if (!p) return undefined;
    return (p.credentialFields() || []).map((f) => f.key);
  } catch (error) {
    console.warn(`[Integration:docs] credentialFields failed providerId=${providerId} reason=${error.message}`);
    return undefined;
  }
}

export function docsFilePath(providerId) {
  return path.join(PROVIDERS_DIR, providerId, "docs.js");
}

export async function getProviderDocs(providerId) {
  if (typeof providerId !== "string" || !ID_RE.test(providerId)) {
    console.warn(`[Integration:docs] rejected providerId=${JSON.stringify(providerId)} reason=invalid id format`);
    return null;
  }
  if (cache.has(providerId)) return cache.get(providerId);

  const file = docsFilePath(providerId);
  if (!fs.existsSync(file)) {
    console.warn(`[Integration:docs] providerId=${providerId} reason=docs.js not found`);
    return null;
  }

  let docs;
  try {
    const mod = await import(pathToFileURL(file).href);
    docs = mod.default;
  } catch (error) {
    console.warn(`[Integration:docs] providerId=${providerId} reason=import failed: ${error.message}`);
    return null;
  }

  const credentialKeys = credentialKeysOf(providerId);
  const { valid, errors, warnings } = validateDocs(docs, { credentialKeys });
  if (!valid) {
    console.warn(`[Integration:docs] providerId=${providerId} reason=invalid docs: ${errors.slice(0, 5).join("; ")}${errors.length > 5 ? ` (+${errors.length - 5} more)` : ""}`);
    return null;
  }
  if (warnings.length) console.warn(`[Integration:docs] providerId=${providerId} warnings: ${warnings.join("; ")}`);

  const result = { ...docs, credentialFieldKeys: credentialKeys || [] };
  cache.set(providerId, result);
  return result;
}

/** [{providerId, hasDocs}] for every registered provider (file existence check; cheap). */
export function listDocsAvailability() {
  return registry.list().map((p) => ({
    providerId: p.id,
    hasDocs: ID_RE.test(p.id) && fs.existsSync(docsFilePath(p.id)),
  }));
}

export function clearDocsCache() {
  cache.clear();
}
