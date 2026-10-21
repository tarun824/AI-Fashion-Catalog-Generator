import { ExternalLink } from "lucide-react";
import { asArray, asText, safeHttps } from "../../utils/docsHelpers";

export function ExtLink({ href, children, className = "" }) {
  const safe = safeHttps(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium underline text-blue-700 dark:text-blue-300 ${className}`}
    >
      {children}
      <ExternalLink className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
    </a>
  );
}

/**
 * Field help body shared by the docs drawer and the credentials modal.
 * `field` is a docs.fields[key] entry; every property is optional.
 */
export function FieldHelp({ field, showSummary = false }) {
  if (!field || typeof field !== "object") return null;
  const where = asArray(field.whereToFind).map(asText).filter(Boolean);
  const tips = asArray(field.tips).map(asText).filter(Boolean);
  return (
    <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
      {showSummary && asText(field.summary) && <p>{field.summary}</p>}
      {where.length > 0 && (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">
            Where to find it
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            {where.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      {asText(field.example) && (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">
            Example{" "}
            <span className="font-normal text-xs text-gray-600 dark:text-gray-400">
              (sample - not real)
            </span>
          </p>
          <code className="inline-block max-w-full break-all px-2 py-1 rounded bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 font-mono text-xs">
            {field.example}
          </code>
        </div>
      )}
      {asText(field.format) && (
        <p>
          <span className="font-semibold text-gray-900 dark:text-white">
            Format:{" "}
          </span>
          {field.format}
        </p>
      )}
      {tips.length > 0 && (
        <ul className="list-disc pl-5 space-y-1">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
      {asText(field.warning) && (
        <p
          role="note"
          className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 px-3 py-2"
        >
          {field.warning}
        </p>
      )}
      <ExtLink href={field.link}>Open the official page</ExtLink>
    </div>
  );
}
