const statusStyles = {
  queued: "bg-slate-100 text-slate-600",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  completed_with_errors: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700",
};

export const StatusPill = ({ status }) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  const styles = statusStyles[normalized] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
};

const DESCRIPTION_LINES = 4;

const parseDescription = (text) => {
  if (!text) {
    return { name: "", lines: [] };
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let productName = "";
  const rest = [];

  lines.forEach((line) => {
    const normalized = line.toLowerCase();
    if (!productName && normalized.startsWith("name:")) {
      productName = line.split(/name:/i)[1]?.trim() ?? "";
      return;
    }
    // Skip description header and metadata lines (colors/category/tags/price/saree attrs)
    if (
      normalized.startsWith("description") ||
      normalized.startsWith("colors:") ||
      normalized.startsWith("category:") ||
      normalized.startsWith("tags:") ||
      normalized.startsWith("approxprice:") ||
      normalized.startsWith("fabric:") ||
      normalized.startsWith("bordertype:") ||
      normalized.startsWith("occasion:") ||
      normalized.startsWith("worktype:") ||
      normalized.startsWith("weight:") ||
      normalized.startsWith("blouseincluded:")
    ) {
      return;
    }
    rest.push(line.replace(/^[-•]\s*/, ""));
  });

  while (rest.length < DESCRIPTION_LINES) {
    rest.push("");
  }

  return {
    name: productName || rest.shift() || "",
    lines: rest.slice(0, DESCRIPTION_LINES),
  };
};

function ResultCard({ entry }) {
  const parsed = parseDescription(entry.description);
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{entry.originalName}</p>
          <p className="text-xs text-white/60">
            #{entry.order + 1} • {entry.sizeLabel}
          </p>
        </div>
        <StatusPill status={entry.status} />
      </div>

      <div className="mt-4 space-y-2">
        {parsed.name && (
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            {parsed.name}
          </p>
        )}
        {(entry.category || entry.approxPrice) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            {entry.category && (
              <span className="rounded-md bg-white/10 px-2 py-0.5">
                {entry.category}
              </span>
            )}
            {entry.approxPrice != null && (
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
                ~₹{entry.approxPrice}
              </span>
            )}
          </div>
        )}
        <ul className="space-y-1 text-white/90">
          {parsed.lines.map((line, index) => (
            <li key={index} className="text-[13px] leading-relaxed">
              {line || <span className="text-white/40">Generating...</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Color Badges */}
      {entry.colors && entry.colors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5">
            {entry.colors.map((color, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-md text-xs font-medium bg-brand-500/20 text-brand-200 border border-brand-400/30"
              >
                {color}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tag Badges */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/10 text-white/70"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default ResultCard;
