import { useRef, useState, useCallback } from "react";

/**
 * FileDropzone — reusable drag-and-drop file upload area.
 *
 * Props:
 *   onFilesChange(files: File[]) — called whenever the file list changes.
 *
 * Accepts: images, PDFs, Word documents.
 */

const ACCEPTED = "image/*,.pdf,.doc,.docx";

export default function FileDropzone({ onFilesChange }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const updateFiles = useCallback(
    (next) => {
      setFiles(next);
      onFilesChange?.(next);
    },
    [onFilesChange]
  );

  const addFiles = useCallback(
    (incoming) => {
      const merged = [...files];
      for (const f of incoming) {
        // Avoid duplicates by name + size + lastModified.
        const dup = merged.some(
          (e) =>
            e.name === f.name &&
            e.size === f.size &&
            e.lastModified === f.lastModified
        );
        if (!dup) merged.push(f);
      }
      updateFiles(merged);
    },
    [files, updateFiles]
  );

  const removeFile = useCallback(
    (index) => {
      const next = files.filter((_, i) => i !== index);
      updateFiles(next);
    },
    [files, updateFiles]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e) => {
    if (e.target.files.length) addFiles(Array.from(e.target.files));
    // Reset so re-selecting the same file fires onChange again.
    e.target.value = "";
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop area */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={handleInputChange}
        />
        <svg
          className="mx-auto h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold text-blue-600">Click to upload</span>{" "}
          or drag & drop
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Images, PDF, DOC — up to 10 MB each
        </p>
      </div>

      {/* Chip list of selected files */}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700"
            >
              <span className="max-w-[160px] truncate">{file.name}</span>
              <span className="text-xs text-gray-400">
                ({formatSize(file.size)})
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-500 transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
