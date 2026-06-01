import { useRef, useState } from "react";

export default function ResumeUploader({ file, onChange, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files) {
    const selected = files?.[0];
    if (!selected) return;
    onChange(selected);
  }

  return (
    <div
      className={`upload-zone ${isDragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled}
      />
      <div className="upload-icon" aria-hidden="true">
        ↑
      </div>
      <h2>Upload resume PDF</h2>
      <p>Drag a PDF here or choose one from your device.</p>
      <button
        className="button button-secondary"
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose PDF
      </button>
      {file && (
        <div className="file-preview">
          <span>{file.name}</span>
          <small>{Math.ceil(file.size / 1024)} KB</small>
        </div>
      )}
    </div>
  );
}
