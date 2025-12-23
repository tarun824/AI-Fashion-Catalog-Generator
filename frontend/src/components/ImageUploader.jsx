import { useRef, useState } from "react";

const instructions = [
  "Drop a garment photo here",
  "PNG, JPG, or HEIC · Max 10 MB",
  "Captured on a mannequin or person works best",
];

function ImageUploader({ preview, onFileSelect, onClear, isLoading }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    onFileSelect?.(file);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    onFileSelect?.(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
        Upload
      </p>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-3 flex min-h-[320px] flex-col justify-center rounded-2xl border-2 border-dashed bg-slate-50 text-center transition ${
          isDragging ? "border-brand-500 bg-brand-50" : "border-slate-200"
        }`}
      >
        {preview ? (
          <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl">
            <img
              src={preview}
              alt="Selected garment preview"
              className="h-[320px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isLoading}
                className="rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-slate-900 shadow"
              >
                Replace Image
              </button>
              <button
                type="button"
                onClick={onClear}
                disabled={isLoading}
                className="rounded-full border border-white/70 px-5 py-2 text-sm font-semibold text-white"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="px-8">
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
            <div className="mt-6 space-y-2 text-slate-500">
              {instructions.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isLoading}
                className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Browse files
              </button>
              <p className="mt-2 text-xs text-slate-400">
                Drag and drop anywhere inside the frame
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default ImageUploader;

