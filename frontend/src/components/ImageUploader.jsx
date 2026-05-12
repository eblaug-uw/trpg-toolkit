// ImageUploader.jsx
// Pick a bucket (maps or tokens) and upload an image. That's it.
// General-purpose — reusable for any feature that needs image uploads.

import { useState } from "react";
import { uploadImage } from "../services/vttStorage";

function ImageUploader() {
  const [bucket, setBucket] = useState("maps");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadImage(bucket, file);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Image Uploader</h2>

      <label htmlFor="bucket-picker">Bucket: </label>
      <select
        id="bucket-picker"
        value={bucket}
        onChange={(e) => setBucket(e.target.value)}
        disabled={uploading}
      >
        <option value="maps">Maps</option>
        <option value="tokens">Tokens</option>
      </select>

      <div style={{ marginTop: "12px" }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={uploading}
        />
      </div>

      {file && (
        <p style={{ marginTop: "8px" }}>
          Selected: {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      )}

      <button onClick={handleUpload} disabled={!file || uploading} style={{ marginTop: "8px" }}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {error && <p style={{ color: "red", marginTop: "8px" }}>{error}</p>}
    </div>
  );
}

export default ImageUploader;
