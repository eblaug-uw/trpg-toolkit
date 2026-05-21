import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEncounters } from "../context/EncountersContext";
import { deserializeVttState } from "../features/vtt/encounter/deserialize";

function LoadEncounterButton({ campaignId }) {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { addEncounter, saveVttState } = useEncounters();
  const [error, setError] = useState("");

  function handlePick() {
    setError("");
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    let blob;
    try {
      const text = await file.text();
      blob = JSON.parse(text);
      // Validate by deserializing — throws on unknown schema or shape problems.
      deserializeVttState(blob);
    } catch (err) {
      setError(`Could not load file: ${err.message}`);
      return;
    }

    const title = file.name.replace(/\.json$/i, "");
    const created = addEncounter(campaignId, title);
    saveVttState(created.id, blob);
    navigate(`/vtt?encounterId=${created.id}`);
  }

  return (
    <>
      <button className="page-create-btn" onClick={handlePick}>
        Load from file
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {error && (
        <p role="alert" style={{ color: "red", marginTop: 4 }}>
          {error}
        </p>
      )}
    </>
  );
}

export default LoadEncounterButton;
