/**
 * Turn a /admin/integrations/fetch-all `results` map into a toast message.
 * Returns { message, tone } where tone is a useToast method name.
 */
export function summarizeFetchAll(results) {
  const entries = Object.entries(results || {});
  if (entries.length === 0) {
    return {
      message:
        "No marketplace is connected yet. Add your keys on the Integrations page.",
      tone: "info",
    };
  }
  let imported = 0;
  let updated = 0;
  let failed = 0;
  let needsMapping = 0;
  for (const [, r] of entries) {
    if (r?.ok === false || r?.error) {
      failed += 1;
    } else if (!r?.skipped) {
      imported += r?.imported || 0;
      updated += r?.updated || 0;
      needsMapping += r?.needsMapping || 0;
    }
  }
  let message = `${imported} new, ${updated} updated order(s)`;
  if (needsMapping) message += `, ${needsMapping} need mapping`;
  if (failed) message += `. ${failed} channel(s) failed, see details below.`;
  return { message, tone: failed ? "warning" : "success" };
}
