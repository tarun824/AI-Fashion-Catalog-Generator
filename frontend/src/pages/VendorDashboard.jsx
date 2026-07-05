import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { vendorApi, API_BASE_URL, API_PREFIX } from "../utils/api";
import ResultCard from "../components/ResultCard";

const MAX_FILES = 200;
const terminalStatuses = new Set([
  "completed",
  "completed_with_errors",
  "failed",
]);

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

export default function VendorDashboard() {
  const { vendor, logout } = useVendorAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("upload");

  const [files, setFiles] = useState([]);
  const [jobSummary, setJobSummary] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const eventSourceRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    if (tab === "products") {
      loadProducts();
    }
  }, [tab]);

  useEffect(
    () => () => {
      eventSourceRef.current?.close();
    },
    [],
  );

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await vendorApi.get("/vendor/products");
      setProducts(response.data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/vendor/login");
  };

  const handleFilesAdded = (fileList) => {
    const incoming = Array.from(fileList ?? []);
    if (!incoming.length) return;
    setError("");
    setFiles((prev) => {
      const merged = [
        ...prev,
        ...incoming.map((file) => ({ id: crypto.randomUUID(), file })),
      ];
      return merged.slice(0, MAX_FILES);
    });
  };

  const subscribeToJob = (jobId) => {
    eventSourceRef.current?.close();
    const streamUrl = `${API_BASE_URL}${API_PREFIX}/api/jobs/${jobId}/stream`;
    const eventSource = new EventSource(streamUrl);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setJobSummary(payload);
      if (payload.downloadReady) {
        setDownloadUrl(
          `${API_BASE_URL}${API_PREFIX}/api/jobs/${payload.id ?? jobId}/export`,
        );
      }
      if (terminalStatuses.has(payload.status)) {
        eventSource.close();
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    eventSourceRef.current = eventSource;
  };

  const handleStartBatch = async () => {
    if (!files.length) {
      setError("Please select at least one saree image.");
      return;
    }
    setError("");
    setIsUploading(true);
    setDownloadUrl("");

    try {
      const formData = new FormData();
      files.forEach((entry) =>
        formData.append("images", entry.file, entry.file.name),
      );

      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/api/jobs`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vendorAuthToken")}`,
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
        progressPercent: 0,
      });
      subscribeToJob(payload.jobId);
    } catch (err) {
      setError(err.message ?? "Failed to start the batch.");
    } finally {
      setIsUploading(false);
    }
  };

  const derivedEntries = (jobSummary?.files ?? []).map((file) => {
    const result = jobSummary.results?.find((r) => r.fileId === file.id);
    return {
      ...file,
      sizeLabel: formatFileSize(file.size),
      description: result?.description ?? "",
      colors: result?.colors ?? [],
      category: result?.category ?? "",
      tags: result?.tags ?? [],
      approxPrice: result?.approxPrice ?? null,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-600">
              Soirya Vendor Portal
            </h1>
            <p className="text-sm text-gray-500">{vendor?.businessName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Logout
          </button>
        </div>
        <div className="px-6 flex gap-4 border-t border-gray-100">
          {["upload", "products"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition ${
                tab === t
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t === "upload" ? "Upload Sarees" : "My Products"}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {tab === "upload" ? (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Saree Photos
              </h2>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFilesAdded(e.target.files)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-medium hover:file:bg-emerald-700"
              />
              <p className="text-xs text-gray-500 mt-2">
                {files.length} / {MAX_FILES} images selected
              </p>
              <button
                onClick={handleStartBatch}
                disabled={isUploading || !files.length}
                className="mt-4 px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition"
              >
                {isUploading ? "Uploading..." : "Start AI Processing"}
              </button>
            </div>

            {jobSummary && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Processing Progress ({jobSummary.progressPercent ?? 0}%)
                  </h3>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-800"
                    >
                      Download Excel
                    </a>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {derivedEntries.map((entry) => (
                    <ResultCard entry={entry} key={entry.id} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                My Products
              </h2>
            </div>
            {productsLoading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No products yet. Upload some saree photos to get started.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3">{p.category}</td>
                      <td className="px-4 py-3">
                        {p.price?.amount != null ? `₹${p.price.amount}` : "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
