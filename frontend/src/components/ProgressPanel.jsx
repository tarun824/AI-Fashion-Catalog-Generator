const statusLabelMap = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  completed_with_errors: "Completed w/ issues",
  failed: "Failed",
};

const formatEta = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Calculating…";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(Math.round(seconds % 60), 0);
  if (mins === 0) {
    return `${secs}s`;
  }
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
};

function ProgressPanel({
  job,
  isUploading,
  onStart,
  onReset,
  disableStart,
  downloadUrl,
}) {
  const status = job?.status ?? "idle";
  const progressPercent = job?.progressPercent ?? 0;
  const isFinished = ["completed", "completed_with_errors", "failed"].includes(
    status,
  );
  const processedCount = (job?.completed ?? 0) + (job?.failed ?? 0);
  const etaSeconds = job?.etaSeconds ?? 0;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-brand-600">
            Progress
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            {statusLabelMap[status] ?? "Idle"}
          </h3>
          {etaSeconds > 0 && !isFinished && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              ETA ~ {formatEta(etaSeconds)}
            </p>
          )}
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-600 transition hover:border-brand-500"
          >
            Download Excel
          </a>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {processedCount} / {job?.total ?? 0} processed
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-brand-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs uppercase text-slate-500">Completed</dt>
          <dd className="text-lg font-semibold text-emerald-600">
            {job?.completed ?? 0}
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs uppercase text-slate-500">Processing</dt>
          <dd className="text-lg font-semibold text-amber-600">
            {Math.max(job?.total ?? 0 - processedCount, 0)}
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs uppercase text-slate-500">Failed</dt>
          <dd className="text-lg font-semibold text-rose-600">
            {job?.failed ?? 0}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disableStart || isUploading}
          onClick={onStart}
          className="flex-1 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isUploading ? "Uploading..." : "Start Batch"}
        </button>
        <button
          type="button"
          disabled={!job || (!isFinished && !isUploading)}
          onClick={onReset}
          className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default ProgressPanel;

