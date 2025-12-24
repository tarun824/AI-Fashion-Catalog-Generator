import { useMemo, useRef, useState } from "react";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
};

function BatchUploader({
  files,
  onFilesAdded,
  onRemoveFile,
  onClear,
  isDisabled,
  maxFiles = 200,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalSize = useMemo(
    () => files.reduce((acc, file) => acc + file.file.size, 0),
    [files]
  );

  const handleFileSelection = (event) => {
    const selected = event.target.files;
    if (selected && selected.length > 0) {
      onFilesAdded?.(selected);
    }
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;
    if (event.dataTransfer?.files) {
      onFilesAdded?.(event.dataTransfer.files);
    }
  };

  const hintText = files.length
    ? "Ready when you are. Add more or start processing."
    : "Drop images or browse files to get started.";

  return (
    <section>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isDisabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-200 bg-slate-50"
        } ${isDisabled ? "opacity-60" : ""}`}
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-10 w-10 text-brand-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 16V4m0 0 3.5 3.5M12 4 8.5 7.5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M6 12.75v4.5A2.75 2.75 0 0 0 8.75 20h6.5A2.75 2.75 0 0 0 18 17.25v-4.5"
            />
          </svg>
        </div>
        <p className="mt-6 text-lg font-semibold text-slate-700">{hintText}</p>
        <p className="mt-1 text-sm text-slate-500">
          JPG, PNG, WEBP, HEIC · {maxFiles} images max · 10 MB per file
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Browse files
          </button>
          {files.length > 0 && (
            <button
              type="button"
              disabled={isDisabled}
              onClick={onClear}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Clear selection
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelection}
          disabled={isDisabled}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between text-sm text-slate-500">
        <span>
          {files.length} / {maxFiles} images selected
        </span>
        <span>Total size: {formatFileSize(totalSize)}</span>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4">
          {files.map((entry, index) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
            >
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-slate-800">
                  {entry.file.name}
                </span>
                <span className="text-xs text-slate-500">
                  {formatFileSize(entry.file.size)} · Added #{index + 1}
                </span>
              </div>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onRemoveFile?.(entry.id)}
                className="text-sm font-semibold text-brand-600 transition hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default BatchUploader;
