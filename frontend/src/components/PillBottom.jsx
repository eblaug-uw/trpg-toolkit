import { useState, useRef, useEffect } from "react";
import { LuImage, LuMap, LuUserPlus, LuTable, LuPlus, LuSwords, LuSave } from "react-icons/lu";
import "../style/PillButton.css";

function PillBottom({
  onImage,
  onMap,
  onAddCharacter,
  onTables,
  onEnemyGenerator,
  onSaveEncounter,
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef(null);

  function cancelPendingClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelPendingClose();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 100);
  }

  function openNow() {
    cancelPendingClose();
    setOpen(true);
  }

  useEffect(() => () => cancelPendingClose(), []);

  return (
    <div
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1em",
        height: "1em",
      }}
    >
      {open && (
        <div
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          style={{
            position: "absolute",
            right: "0%",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "row",
            gap: "8px",
            alignItems: "center",
            background: "#222",
            border: "1px solid #444",
            borderRadius: "999px",
            padding: "8px 16px",
            color: "#eee",
            whiteSpace: "nowrap",
          }}
        >
          <button onClick={onImage} className="icon-button" aria-label="image">
            <LuImage />
          </button>
          <button onClick={onMap} className="icon-button" aria-label="map">
            <LuMap />
          </button>
          <button onClick={onAddCharacter} className="icon-button" aria-label="add character">
            <LuUserPlus />
          </button>
          <button onClick={onEnemyGenerator} className="icon-button" aria-label="enemy generator">
            <LuSwords />
          </button>
          <button onClick={onTables} className="icon-button" aria-label="Lookup Tables">
            <LuTable />
          </button>
          <button onClick={onSaveEncounter} className="icon-button" aria-label="save encounter">
            <LuSave />
          </button>
        </div>
      )}
      <LuPlus />
    </div>
  );
}

export default PillBottom;
