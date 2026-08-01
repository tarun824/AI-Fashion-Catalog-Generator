import { useState, useRef } from "react";

/**
 * DropZone Component
 * Handles file/folder uploads via drag-drop or manual selection
 * Mobile-friendly with touch support
 */
export default function DropZone({ onFilesAdded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Drag event handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const files = [];

    // Process dropped items (files or folders)
    const processItems = async () => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          await traverseFileTree(item, files);
        }
      }

      // Filter for images only
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length > 0) {
        setPreviewCount(imageFiles.length);
        setTimeout(() => setPreviewCount(0), 3000); // Clear preview after 3s
        onFilesAdded(imageFiles);
      }
    };

    processItems();
  };

  // Recursively traverse folder structure
  const traverseFileTree = async (item, files) => {
    if (item.isFile) {
      return new Promise((resolve) => {
        item.file((file) => {
          files.push(file);
          resolve();
        });
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries) => {
          for (const entry of entries) {
            await traverseFileTree(entry, files);
          }
          resolve();
        });
      });
    }
  };

  // Handle folder selection
  const handleFolderSelect = (e) => {
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length > 0) {
      setPreviewCount(files.length);
      setTimeout(() => setPreviewCount(0), 3000);
      onFilesAdded(files);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length > 0) {
      setPreviewCount(files.length);
      setTimeout(() => setPreviewCount(0), 3000);
      onFilesAdded(files);
    }
  };

  return (
    <div className="w-full">
      {/* Drop Zone Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 md:p-12 
          transition-all duration-200 ease-in-out
          ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          }
        `}
      >
        {/* Preview Count Notification */}
        {previewCount > 0 && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
            {previewCount} images dropped ✓
          </div>
        )}

        {/* Icon */}
        <div className="flex flex-col items-center justify-center text-center">
          <svg
            className={`w-16 h-16 mb-4 transition-colors ${
              isDragging ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {/* Text */}
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {isDragging ? "Drop files here" : "Drag & drop images or folders"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            or click buttons below to browse
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* Select Folder Button */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="
                px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium 
                rounded-lg shadow-md hover:shadow-lg transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                w-full md:w-auto
              "
            >
              📁 Select Folder
            </button>

            {/* Select Images Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="
                px-6 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 
                dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500
                text-gray-700 dark:text-gray-200 font-medium rounded-lg 
                shadow-md hover:shadow-lg transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                w-full md:w-auto
              "
            >
              🖼️ Select Images
            </button>
          </div>

          {/* Supported Formats */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            Supports: JPG, PNG, WEBP, GIF
          </p>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        accept="image/*"
        onChange={handleFolderSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
