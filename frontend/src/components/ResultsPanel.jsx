import ResultCard, { StatusPill } from "./ResultCard";

function ResultsPanel({ entries, jobStatus, errors }) {
  const hasResults = entries.length > 0;
  const hasErrors = errors?.length > 0;

  return (
    <aside className="flex h-full flex-col rounded-3xl bg-slate-900 p-8 text-white shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-brand-100">
            Output
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Generated Catalog Copy
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Each entry is streaming in as soon as the model finishes.
          </p>
        </div>
        <StatusPill status={jobStatus ?? "idle"} />
      </div>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
        {hasResults ? (
          entries.map((entry) => <ResultCard entry={entry} key={entry.id} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-sm text-white/70">
            Upload garments to view the AI-generated copy here.
          </div>
        )}
      </div>

      {hasErrors && (
        <div className="mt-4 rounded-2xl border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-semibold">Errors</p>
          <ul className="mt-2 space-y-1">
            {errors.map((error) => (
              <li key={error.fileId}>
                <span className="font-semibold">
                  {entries.find((entry) => entry.id === error.fileId)
                    ?.originalName ?? "Unknown file"}
                  :
                </span>{" "}
                {error.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

export default ResultsPanel;

