import ResultCard, { StatusPill } from "./ResultCard";

function ResultsPanel({
  entries,
  totalEntries,
  jobStatus,
  errors,
  searchQuery,
  onSearchChange,
  selectedColors,
  onColorToggle,
  allColors,
}) {
  const hasResults = entries.length > 0;
  const hasErrors = errors?.length > 0;
  const isFiltering = searchQuery || selectedColors.length > 0;

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

      {/* Search and Filter UI */}
      {totalEntries > 0 && (
        <div className="mt-6 space-y-3">
          {/* Text Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, description, or color..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-white/50 focus:bg-white/15 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Color Filter Chips */}
          {allColors.length > 0 && (
            <div>
              <p className="text-xs text-white/60 mb-2">Filter by color:</p>
              <div className="flex flex-wrap gap-2">
                {allColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => onColorToggle(color)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedColors.includes(color)
                        ? "bg-brand-500 text-white ring-2 ring-brand-400"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
              {selectedColors.length > 0 && (
                <button
                  onClick={() =>
                    selectedColors.forEach((c) => onColorToggle(c))
                  }
                  className="mt-2 text-xs text-brand-300 hover:text-brand-200 underline"
                >
                  Clear color filters
                </button>
              )}
            </div>
          )}

          {/* Results Count */}
          {isFiltering && (
            <p className="text-xs text-white/60">
              Showing {entries.length} of {totalEntries} sarees
            </p>
          )}
        </div>
      )}

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
