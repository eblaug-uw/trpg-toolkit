// MapBackgroundPicker.tsx
// Lists the user's uploaded maps and lets them click one to set as the home page background.
// Receives an `onSelect` callback — calls it with the chosen image's signed URL AND its
// stable storage name (the URL expires, the name doesn't).

import { useState, useEffect } from "react";
import { getSignedThumbnailUrls, getSignedUrl, listImages } from "../services/vttStorage";

type Props = {
  onSelect: (url: string, name: string) => void;
  pixelsPerFoot: number;
  onChangePixelsPerFoot: (value: number) => void;
};

type MapItem = {
  name: string;
  thumbnailUrl?: string;
  originalUrl?: string;
  fallbackRequested?: boolean;
};

function defaultPixelsPerFoot(naturalWidth: number): number {
  if (naturalWidth >= 6000) return 50;
  return 12;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not load maps";
}

function MapBackgroundPicker({ onSelect, pixelsPerFoot, onChangePixelsPerFoot }: Props) {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectingName, setSelectingName] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadMaps = async () => {
      try {
        const names = (await listImages("maps")).filter((n) => !n.startsWith("."));
        if (!cancelled) {
          setMaps(names.map((name) => ({ name })));
          setLoading(false);
        }
        await getSignedThumbnailUrls("maps", names, undefined, ({ name, url }) => {
          if (!cancelled) {
            setMaps((items) =>
              items.map((item) => (item.name === name ? { ...item, thumbnailUrl: url } : item)),
            );
          }
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadMaps();

    return () => {
      cancelled = true;
    };
  }, []);

  const prepareOriginalUrl = async (name: string): Promise<string> => {
    const map = maps.find((item) => item.name === name);
    if (map?.originalUrl) return map.originalUrl;

    const url = await getSignedUrl("maps", name);
    setMaps((items) =>
      items.map((item) => (item.name === name ? { ...item, originalUrl: url } : item)),
    );
    return url;
  };

  const prefetchOriginalUrl = (name: string) => {
    void prepareOriginalUrl(name).catch(() => {});
  };

  const handleMapClick = async (name: string) => {
    try {
      setSelectingName(name);
      setError("");
      const previewUrl = maps.find((item) => item.name === name)?.thumbnailUrl;
      if (previewUrl) {
        onSelect(previewUrl, name);
      }

      const url = await prepareOriginalUrl(name);
      const img = new Image();
      img.onload = () => onChangePixelsPerFoot(defaultPixelsPerFoot(img.naturalWidth));
      img.src = url;
      if (url !== previewUrl) {
        onSelect(url, name);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSelectingName("");
    }
  };

  const handleThumbnailError = async (name: string) => {
    const map = maps.find((item) => item.name === name);
    if (!map || map.fallbackRequested) return;

    setMaps((items) =>
      items.map((item) => (item.name === name ? { ...item, fallbackRequested: true } : item)),
    );

    try {
      const url = await getSignedUrl("maps", name);
      setMaps((items) =>
        items.map((item) => (item.name === name ? { ...item, thumbnailUrl: url } : item)),
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
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
              aria-label={`Select ${m.name}`}
              onClick={() => void handleMapClick(m.name)}
              onMouseEnter={() => prefetchOriginalUrl(m.name)}
              onFocus={() => prefetchOriginalUrl(m.name)}
              disabled={Boolean(selectingName)}
              style={{
                padding: 0,
                border: "1px solid #999",
                borderRadius: "4px",
                cursor: "pointer",
                background: "transparent",
              }}
            >
              {m.thumbnailUrl ? (
                <img
                  src={m.thumbnailUrl}
                  alt={m.name}
                  loading="lazy"
                  decoding="async"
                  width="120"
                  height="80"
                  onError={() => void handleThumbnailError(m.name)}
                  style={{
                    width: "120px",
                    height: "80px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span
                  aria-label={`Loading ${m.name}`}
                  style={{
                    width: "120px",
                    height: "80px",
                    display: "block",
                    background: "#333",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapBackgroundPicker;
