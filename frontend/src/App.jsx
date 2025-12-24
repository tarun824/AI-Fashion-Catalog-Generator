import { useEffect, useMemo, useRef, useState } from "react";
import BatchUploader from "./components/BatchUploader";
import ProgressPanel from "./components/ProgressPanel";
import ResultsPanel from "./components/ResultsPanel";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000"
).replace(/\/$/, "");
const MAX_FILES = 200;
const HERO_COPY = {
  title: "AI Fashion Catalog Generator",
  subtitle:
    "Upload up to 200 garments per batch, watch progress live, and export polished catalog copy in Excel.",
};

const createClientId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

const terminalStatuses = new Set([
  "completed",
  "completed_with_errors",
  "failed",
]);

function App() {
  const [files, setFiles] = useState([]);
  const [jobSummary, setJobSummary] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const eventSourceRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(
    () => () => {
      eventSourceRef.current?.close();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    },
    []
  );

  const derivedEntries = useMemo(() => {
    if (!jobSummary?.files) {
      return [];
    }
    return jobSummary.files.map((file) => {
      const result = jobSummary.results?.find(
        (entry) => entry.fileId === file.id
      );
      return {
        ...file,
        sizeLabel: formatFileSize(file.size),
        description: result?.description ?? "",
        tokens: result?.tokens ?? null,
      };
    });
  }, [jobSummary]);

  const jobActive = jobSummary && !terminalStatuses.has(jobSummary.status);

  const handleFilesAdded = (fileList) => {
    const incoming = Array.from(fileList ?? []);
    if (!incoming.length) {
      return;
    }
    setError("");
    setFiles((prev) => {
      const existingKeys = new Set(
        prev.map(
          (entry) =>
            `${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`
        )
      );
      const merged = [...prev];
      incoming.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (existingKeys.has(key)) {
          return;
        }
        merged.push({ id: createClientId(), file });
        existingKeys.add(key);
      });
      if (merged.length > MAX_FILES) {
        setInfoMessage(
          `Only the first ${MAX_FILES} files were kept to respect batch limits.`
        );
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  };

  const handleRemoveFile = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleClearFiles = () => {
    setFiles([]);
    setError("");
    setInfoMessage("");
  };

  const cleanupStreams = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const subscribeToJob = (jobId) => {
    cleanupStreams();
    const streamUrl = `${API_BASE_URL}/api/jobs/${jobId}/stream`;
    const eventSource = new EventSource(streamUrl);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setJobSummary(payload);
      if (payload.downloadReady) {
        setDownloadUrl(
          `${API_BASE_URL}/api/jobs/${payload.id ?? jobId}/export`
        );
      }
      if (terminalStatuses.has(payload.status)) {
        eventSource.close();
        eventSourceRef.current = null;
      }
    };
    eventSource.onerror = () => {
      setInfoMessage(
        "Live progress stream disconnected. Falling back to polling."
      );
      eventSource.close();
      eventSourceRef.current = null;
      schedulePolling(jobId);
    };
    eventSourceRef.current = eventSource;
  };

  const schedulePolling = (jobId) => {
    cleanupStreams();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        setJobSummary(payload);
        if (payload.downloadReady) {
          setDownloadUrl(`${API_BASE_URL}/api/jobs/${jobId}/export`);
        }
        if (terminalStatuses.has(payload.status)) {
          cleanupStreams();
        }
      } catch (pollError) {
        console.error("Polling error", pollError);
      }
    }, 3500);
  };

  const handleStartBatch = async () => {
    if (!files.length) {
      setError("Please select at least one garment image.");
      return;
    }

    setError("");
    setInfoMessage("");
    setIsUploading(true);
    setDownloadUrl("");

    try {
      const formData = new FormData();
      files.forEach((entry) => {
        formData.append("images", entry.file, entry.file.name);
      });

      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to queue batch.");
      }

      const payload = await response.json();
      setFiles([]);
      setJobSummary({
        id: payload.jobId,
        status: payload.status,
        total: payload.total,
        completed: 0,
        failed: 0,
        files: [],
        results: [],
        errors: [],
        progressPercent: 0,
      });
      subscribeToJob(payload.jobId);
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError.message ?? "Failed to start the batch.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    cleanupStreams();
    setJobSummary(null);
    setDownloadUrl("");
    setError("");
    setInfoMessage("");
    setFiles([]);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-brand-600">
            Powered by GPT-4o Vision
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900 md:text-5xl">
            {HERO_COPY.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            {HERO_COPY.subtitle}
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-3xl bg-white p-8 shadow-card">
            <BatchUploader
              files={files}
              onFilesAdded={handleFilesAdded}
              onRemoveFile={handleRemoveFile}
              onClear={handleClearFiles}
              isDisabled={jobActive || isUploading}
              maxFiles={MAX_FILES}
            />

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {infoMessage && !error && (
              <p className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                {infoMessage}
              </p>
            )}

            <ProgressPanel
              job={jobSummary}
              isUploading={isUploading}
              onStart={handleStartBatch}
              onReset={handleReset}
              disableStart={!files.length || jobActive}
              downloadUrl={downloadUrl}
            />
          </div>

          <ResultsPanel
            entries={derivedEntries}
            jobStatus={jobSummary?.status}
            errors={jobSummary?.errors ?? []}
          />
        </section>
      </div>
    </main>
  );
}

export default App;
