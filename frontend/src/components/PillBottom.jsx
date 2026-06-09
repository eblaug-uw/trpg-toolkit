import { useState, useRef, useEffect } from "react";
import { LuMap, LuUserPlus, LuTable, LuPlus, LuSave } from "react-icons/lu";
import imageUploadIcon from "../assets/icons/image-upload.svg";
import enemyGeneratorIcon from "../assets/icons/enemy-generator.svg";
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
      data-testid="pill-bottom"
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
          {onImage && (
            <button onClick={onImage} className="icon-button" aria-label="image">
              <img src={imageUploadIcon} alt="" />
            </button>
          )}
          {onMap && (
            <button onClick={onMap} className="icon-button" aria-label="map">
              <LuMap />
            </button>
          )}
          {onAddCharacter && (
            <button onClick={onAddCharacter} className="icon-button" aria-label="add character">
              <LuUserPlus />
            </button>
          )}
          {onEnemyGenerator && (
            <button onClick={onEnemyGenerator} className="icon-button" aria-label="enemy generator">
              <img src={enemyGeneratorIcon} alt="" />
            </button>
          )}
          {onTables && (
            <button onClick={onTables} className="icon-button" aria-label="Lookup Tables">
              <LuTable />
            </button>
          )}
          {onSaveEncounter && (
            <button onClick={onSaveEncounter} className="icon-button" aria-label="save encounter">
              <LuSave />
            </button>
          )}
        </div>
      )}
      <LuPlus />
    </div>
  );
}

export default PillBottom;
