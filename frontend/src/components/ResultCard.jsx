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

function ResultCard({ entry }) {
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
      <pre className="mt-4 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-white/90">
        {entry.description || "Processing..."}
      </pre>
    </article>
  );
}

export default ResultCard;

