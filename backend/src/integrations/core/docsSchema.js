/**
 * Validation for providers/<id>/docs.js (in-app integration guide content).
 * Hand-written, no deps. validateDocs(docs, { credentialKeys? }) -> { valid, errors, warnings }
 */

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isArr = (v) => Array.isArray(v);

function isHttpsUrl(v) {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !!u.hostname;
  } catch {
    return false;
  }
}

const SECRET_PATTERNS = [
  [/^shpat_[a-f0-9]{32}$/i, "looks like a real Shopify admin token"],
  [/amzn1\.oa2-cs\.v1\.[a-f0-9]{40,}/i, "looks like a real Amazon client secret"],
  [/^Atzr\|[A-Za-z0-9_\-|=]{40,}$/, "looks like a real Amazon refresh token"],
  [/^[A-Za-z0-9+/=_-]{40,}$/, "long opaque string (looks like a real token/base64)"],
];

function looksLikeSecret(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  // placeholders such as xxxx / <...> / "example" are visibly fake
  if (/x{4,}|\.{3}|<[^>]+>|example|your[_-]|dummy|fake/i.test(t)) return null;
  for (const [re, why] of SECRET_PATTERNS) if (re.test(t)) return why;
  return null;
}

export function validateDocs(docs, { credentialKeys } = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!docs || typeof docs !== "object" || isArr(docs)) {
    return { valid: false, errors: ["docs must be an object"], warnings };
  }

  for (const k of ["providerId", "title", "tagline", "overview", "lastVerified"]) {
    if (!isStr(docs[k])) err(`${k} must be a non-empty string`);
  }
  if (docs.lastVerified && !/^\d{4}-\d{2}-\d{2}/.test(docs.lastVerified)) {
    warn("lastVerified should start with an ISO date (YYYY-MM-DD)");
  }

  const checkLink = (url, where) => {
    if (!isHttpsUrl(url)) err(`${where}: "${url}" is not a valid https URL`);
  };

  // howItWorks
  if (!isArr(docs.howItWorks) || docs.howItWorks.length === 0) err("howItWorks must be a non-empty array");
  else docs.howItWorks.forEach((h, i) => {
    if (!isStr(h?.title) || !isStr(h?.body)) err(`howItWorks[${i}] needs title and body`);
  });

  // capabilities
  if (!isArr(docs.capabilities)) err("capabilities must be an array");
  else docs.capabilities.forEach((c, i) => {
    for (const k of ["label", "button", "description"]) if (!isStr(c?.[k])) err(`capabilities[${i}].${k} must be a non-empty string`);
  });

  if (!isArr(docs.limitations)) err("limitations must be an array of strings");
  else docs.limitations.forEach((l, i) => { if (!isStr(l)) err(`limitations[${i}] must be a non-empty string`); });

  // prerequisites
  if (!isArr(docs.prerequisites)) err("prerequisites must be an array");
  else docs.prerequisites.forEach((p, i) => {
    if (!isStr(p?.text)) err(`prerequisites[${i}].text must be a non-empty string`);
    if (p?.link !== undefined) checkLink(p.link, `prerequisites[${i}].link`);
  });

  // setup
  if (!isArr(docs.setup) || docs.setup.length === 0) err("setup must be a non-empty array");
  else docs.setup.forEach((s, i) => {
    if (!isStr(s?.title)) err(`setup[${i}].title must be a non-empty string`);
    if (!isArr(s?.steps) || s.steps.length === 0 || !s.steps.every(isStr)) err(`setup[${i}].steps must be a non-empty array of strings`);
    if (s?.link !== undefined) checkLink(s.link, `setup[${i}].link`);
    if (s?.note !== undefined && !isStr(s.note)) err(`setup[${i}].note must be a non-empty string when present`);
  });

  // fields
  const fieldKeys = [];
  if (!docs.fields || typeof docs.fields !== "object" || isArr(docs.fields)) err("fields must be an object keyed by credential key");
  else {
    for (const [key, f] of Object.entries(docs.fields)) {
      fieldKeys.push(key);
      const w = `fields.${key}`;
      if (!f || typeof f !== "object") { err(`${w} must be an object`); continue; }
      if (!isStr(f.label)) err(`${w}.label must be a non-empty string`);
      if (!isStr(f.summary)) err(`${w}.summary must be a non-empty string`);
      if (!isArr(f.whereToFind) || f.whereToFind.length === 0 || !f.whereToFind.every(isStr)) err(`${w}.whereToFind must be a non-empty array of strings`);
      if (!isStr(f.example)) err(`${w}.example must be a non-empty string`);
      else {
        const why = looksLikeSecret(f.example);
        if (why) warn(`${w}.example ${why}; examples must be visibly fake`);
      }
      if (!isStr(f.format)) err(`${w}.format must be a non-empty string`);
      if (f.link !== undefined) checkLink(f.link, `${w}.link`);
      if (!isArr(f.tips)) err(`${w}.tips must be an array`);
      if (f.warning !== undefined && !isStr(f.warning)) err(`${w}.warning must be a non-empty string when present`);
      if (typeof f.required !== "boolean") err(`${w}.required must be a boolean`);
    }
  }

  if (isArr(credentialKeys)) {
    for (const k of credentialKeys) if (!fieldKeys.includes(k)) err(`credential field "${k}" has no entry in fields`);
    for (const k of fieldKeys) if (!credentialKeys.includes(k)) warn(`fields.${k} does not match any credential field (ok for env-configured providers)`);
  }

  if (!isArr(docs.security) || !docs.security.every(isStr)) err("security must be an array of strings");

  if (!isArr(docs.usage)) err("usage must be an array");
  else docs.usage.forEach((u, i) => {
    if (!isStr(u?.title)) err(`usage[${i}].title must be a non-empty string`);
    if (!isArr(u?.steps) || u.steps.length === 0 || !u.steps.every(isStr)) err(`usage[${i}].steps must be a non-empty array of strings`);
  });

  if (!isArr(docs.troubleshooting)) err("troubleshooting must be an array");
  else {
    if (docs.troubleshooting.length < 5) err(`troubleshooting needs at least 5 entries (has ${docs.troubleshooting.length})`);
    docs.troubleshooting.forEach((t, i) => {
      for (const k of ["problem", "cause", "fix"]) if (!isStr(t?.[k])) err(`troubleshooting[${i}].${k} must be a non-empty string`);
    });
  }

  if (!isArr(docs.glossary)) err("glossary must be an array");
  else docs.glossary.forEach((g, i) => {
    if (!isStr(g?.term) || !isStr(g?.meaning)) err(`glossary[${i}] needs term and meaning`);
  });

  if (!isArr(docs.links)) err("links must be an array");
  else docs.links.forEach((l, i) => {
    if (!isStr(l?.label)) err(`links[${i}].label must be a non-empty string`);
    checkLink(l?.url, `links[${i}].url`);
  });

  if (!isArr(docs.unverified) || !docs.unverified.every(isStr)) err("unverified must be an array of strings");

  return { valid: errors.length === 0, errors, warnings };
}

export default validateDocs;
