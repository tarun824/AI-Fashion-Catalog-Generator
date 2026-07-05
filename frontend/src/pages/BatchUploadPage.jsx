import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../utils/api";
import BatchUploader from "../components/BatchUploader";
import ProgressPanel from "../components/ProgressPanel";
import ResultsPanel from "../components/ResultsPanel";
import { matchesColorFamily, getAllUniqueColors } from "../utils/colorFamilies";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:5000/api/ai-fashion-generator"
).replace(/\/$/, "");

const MAX_FILES = 200;

const createClientId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const terminalStatuses = new Set([
  "completed",
  "completed_with_errors",
  "failed",
]);

export default function BatchUploadPage() {
  const [files, setFiles] = useState([]);
  const [jobSummary, setJobSummary] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColors, setSelectedColors] = useState([]);

  const eventSourceRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(
    () => () => {
      eventSourceRef.current?.close();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    },
    [],
  );

  const derivedEntries = useMemo(() => {
    if (!jobSummary?.files) {
      return [];
    }
    return jobSummary.files.map((file) => {
      const result = jobSummary.results?.find(
        (entry) => entry.fileId === file.id,
      );
      return {
        ...file,
        sizeLabel: formatFileSize(file.size),
        description: result?.description ?? "",
        colors: result?.colors ?? [],
        category: result?.category ?? "",
        tags: result?.tags ?? [],
        approxPrice: result?.approxPrice ?? null,
        fabric: result?.fabric ?? "",
        occasion: result?.occasion ?? "",
        tokens: result?.tokens ?? null,
      };
    });
  }, [jobSummary]);

  const allColors = useMemo(
    () => getAllUniqueColors(derivedEntries),
    [derivedEntries],
  );

  const filteredEntries = useMemo(() => {
    if (!searchQuery && selectedColors.length === 0) {
      return derivedEntries;
    }

    return derivedEntries.filter((entry) => {
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        !searchQuery ||
        entry.originalName.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        (entry.colors &&
          entry.colors.some((c) => c.toLowerCase().includes(query))) ||
        (entry.colors && matchesColorFamily(searchQuery, entry.colors));

      const matchesSelectedColors =
        selectedColors.length === 0 ||
        selectedColors.every(
          (selectedColor) =>
            entry.colors &&
            entry.colors.some(
              (c) => c.toLowerCase() === selectedColor.toLowerCase(),
            ),
        );

      return matchesSearch && matchesSelectedColors;
    });
  }, [derivedEntries, searchQuery, selectedColors]);

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
            `${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`,
        ),
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
          `Only the first ${MAX_FILES} files were kept to respect batch limits.`,
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
    const streamUrl = `${API_BASE_URL}/jobs/${jobId}/stream`;
    const eventSource = new EventSource(streamUrl);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setJobSummary(payload);
      if (payload.downloadReady) {
        setDownloadUrl(`${API_BASE_URL}/jobs/${payload.id ?? jobId}/export`);
      }
      if (terminalStatuses.has(payload.status)) {
        eventSource.close();
        eventSourceRef.current = null;
      }
    };
    eventSource.onerror = () => {
      setInfoMessage(
        "Live progress stream disconnected. Falling back to polling.",
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
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        setJobSummary(payload);
        if (payload.downloadReady) {
          setDownloadUrl(`${API_BASE_URL}/jobs/${jobId}/export`);
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

      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
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
    setSearchQuery("");
    setSelectedColors([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Batch Upload</h2>
        <p className="text-gray-600 mt-1">
          Upload up to {MAX_FILES} images for AI processing
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          {infoMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <BatchUploader
            files={files}
            maxFiles={MAX_FILES}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemoveFile}
            onClear={handleClearFiles}
            isDisabled={isUploading || jobActive}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ProgressPanel
            job={jobSummary}
            isUploading={isUploading}
            onStart={handleStartBatch}
            onReset={handleReset}
            disableStart={!files.length || isUploading || jobActive}
            downloadUrl={downloadUrl}
          />
        </div>
      </div>

      {jobSummary && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ResultsPanel
            entries={filteredEntries}
            totalEntries={derivedEntries.length}
            jobStatus={jobSummary.status}
            errors={jobSummary.errors}
            allColors={allColors}
            searchQuery={searchQuery}
            selectedColors={selectedColors}
            onSearchChange={setSearchQuery}
            onColorToggle={(color) => {
              setSelectedColors((prev) =>
                prev.includes(color)
                  ? prev.filter((c) => c !== color)
                  : [...prev, color],
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
