import { useEffect, useRef, useState } from "react";
import ImageUploader from "./components/ImageUploader";
import ResultCard from "./components/ResultCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const HERO_COPY = {
  title: "AI Fashion Catalog Generator",
  subtitle:
    "Upload any garment photo and instantly receive a polished, storefront-ready specification crafted by GPT-4o vision.",
};

const convertToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() ?? "";
      const [, base64String] = result.split("base64,");
      if (!base64String) {
        reject(new Error("Unable to parse file contents."));
        return;
      }
      resolve(base64String);
    };
    reader.onerror = () => reject(new Error("Unable to read the file."));
    reader.readAsDataURL(file);
  });

function App() {
  const [imageBase64, setImageBase64] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const lastPreviewRef = useRef("");
  useEffect(
    () => () => {
      if (lastPreviewRef.current) {
        URL.revokeObjectURL(lastPreviewRef.current);
      }
    },
    [],
  );

  const updatePreview = (nextUrl) => {
    if (lastPreviewRef.current) {
      URL.revokeObjectURL(lastPreviewRef.current);
    }
    lastPreviewRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  };

  const reset = () => {
    setImageBase64("");
    setDescription("");
    setError("");
    updatePreview("");
  };

  const handleFileSelect = async (file) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Please upload an image smaller than 10MB.");
      return;
    }

    setError("");
    setDescription("");

    updatePreview(URL.createObjectURL(file));

    try {
      const base64Payload = await convertToBase64(file);
      setImageBase64(base64Payload);
    } catch (fileError) {
      console.error(fileError);
      setError("We couldn't process that image. Try another one.");
      updatePreview("");
    }
  };

  const handleGenerate = async () => {
    if (!imageBase64) {
      setError("Please add a garment image first.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-description`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate description");
      }

      const data = await response.json();
      setDescription((data.description ?? "").trim());
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to generate description. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
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
            <ImageUploader
              preview={previewUrl}
              onFileSelect={handleFileSelect}
              onClear={reset}
              isLoading={isLoading}
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !imageBase64}
                className="flex-1 rounded-2xl bg-brand-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "Analyzing..." : "Generate Description"}
              </button>

              {previewUrl && (
                <button
                  type="button"
                  onClick={reset}
                  disabled={isLoading}
                  className="rounded-2xl border border-slate-300 px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              )}
            </div>
            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <ResultCard description={description} isLoading={isLoading} />
        </section>
      </div>
    </main>
  );
}

export default App;
