// MapBackgroundPicker.tsx
// Lists the user's uploaded maps and lets them click one to set as the home page background.
// Receives an `onSelect` callback — calls it with the chosen image's signed URL AND its
// stable storage name (the URL expires, the name doesn't).

import { useState, useEffect } from "react";
import { getSignedUrl, listImages } from "../services/vttStorage";

type Props = {
  onSelect: (url: string, name: string) => void;
  pixelsPerFoot: number;
  onChangePixelsPerFoot: (value: number) => void;
};

type MapItem = {
  name: string;
  url: string;
};

function defaultPixelsPerFoot(naturalWidth: number): number {
  if (naturalWidth >= 6000) return 50;
  return 12;
}

function MapBackgroundPicker({ onSelect, pixelsPerFoot, onChangePixelsPerFoot }: Props) {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMaps = async () => {
      try {
        const names = (await listImages("maps")).filter((n) => !n.startsWith("."));
        const items = await Promise.all(
          names.map(async (name) => ({
            name,
            url: await getSignedUrl("maps", name),
          })),
        );
        setMaps(items);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadMaps();
  }, []);

  const handleMapClick = (e: React.MouseEvent<HTMLButtonElement>, url: string, name: string) => {
    const img = e.currentTarget.querySelector("img");
    const w = img?.naturalWidth ?? 0;
    if (w > 0) {
      onChangePixelsPerFoot(defaultPixelsPerFoot(w));
    }
    onSelect(url, name);
  };

  return (
    <div>
      <h2>Maps</h2>

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginBottom: "12px",
          maxWidth: "200px",
          fontSize: "0.85rem",
          color: "#ddd",
        }}
      >
        Pixels per foot (1 grid box = 5 ft)
        <input
          type="number"
          min="1"
          value={pixelsPerFoot}
          onChange={(e) => onChangePixelsPerFoot(Number(e.target.value))}
          style={{
            padding: "6px 8px",
            background: "#333",
            color: "#eee",
            border: "1px solid #555",
            borderRadius: "6px",
          }}
        />
      </label>

      {loading && <p>Loading Maps...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && maps.length === 0 && <p style={{ opacity: 0.7 }}>No maps uploaded yet</p>}
      {!loading && maps.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          {maps.map((m) => (
            <button
              key={m.name}
              onClick={(e) => handleMapClick(e, m.url, m.name)}
              style={{
                padding: 0,
                border: "1px solid #999",
                borderRadius: "4px",
                cursor: "pointer",
                background: "transparent",
              }}
            >
              <img
                src={m.url}
                alt={m.name}
                style={{
                  width: "120px",
                  height: "80px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapBackgroundPicker;
