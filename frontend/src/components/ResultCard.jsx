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
    if (normalized.startsWith("description")) {
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
        <ul className="space-y-1 text-white/90">
          {parsed.lines.map((line, index) => (
            <li key={index} className="text-[13px] leading-relaxed">
              {line || <span className="text-white/40">Generating...</span>}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default ResultCard;

