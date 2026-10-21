// Run: node backend/src/integrations/docs.test.mjs
import fs from "node:fs";
import registry from "./core/registry.js";
import { getProviderDocs, listDocsAvailability, docsFilePath } from "./core/docsLoader.js";
import { validateDocs } from "./core/docsSchema.js";

let failed = 0;
const fail = (m) => { failed++; console.log(`  FAIL ${m}`); };

// Per-provider content validation
for (const p of registry.list()) {
  const file = docsFilePath(p.id);
  if (!fs.existsSync(file)) {
    console.log(`SKIP ${p.id} (no docs.js)`);
    continue;
  }
  let docs;
  try {
    docs = (await import(new URL(`file:///${file.replace(/\\/g, "/")}`).href)).default;
  } catch (e) {
    console.log(`FAIL ${p.id}`);
    fail(`import error: ${e.message}`);
    continue;
  }
  const credentialKeys = (p.credentialFields() || []).map((f) => f.key);
  const r = validateDocs(docs, { credentialKeys });
  if (docs?.providerId !== p.id) { r.errors.push(`providerId "${docs?.providerId}" != "${p.id}"`); r.valid = false; }
  console.log(`${r.valid ? "PASS" : "FAIL"} ${p.id}`);
  r.errors.forEach((e) => fail(e));
  r.warnings.forEach((w) => console.log(`  warn ${w}`));
  if (r.valid) {
    const loaded = await getProviderDocs(p.id);
    if (!loaded || !Array.isArray(loaded.credentialFieldKeys)) fail("getProviderDocs did not return docs with credentialFieldKeys");
  }
}

// Loader behaviour
console.log("--- loader checks");
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
for (const bad of ["../core/registry", "..\\x", "a/b", "A", "", "x.js", null, undefined, 5]) {
  check(`rejects id ${JSON.stringify(bad)}`, (await getProviderDocs(bad)) === null);
}
check("missing docs returns null", (await getProviderDocs("no_such_provider_zz")) === null);
const avail = listDocsAvailability();
check("listDocsAvailability covers registry", avail.length === registry.list().length && avail.every((a) => typeof a.hasDocs === "boolean"));

// Validator self-tests
const bad = validateDocs({});
check("validator rejects empty object", !bad.valid && bad.errors.length > 0);
check("validator rejects non-object", !validateDocs(null).valid);

console.log(failed ? `\n${failed} failure(s)` : "\nAll docs checks passed");
process.exit(failed ? 1 : 0);
