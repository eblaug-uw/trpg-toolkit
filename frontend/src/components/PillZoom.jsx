/* --Imports-- */
import { useState } from "react";
import { LuZoomIn, LuZoomOut } from "react-icons/lu";
import zoomIcon from "../assets/icons/zoom.svg";
import "../style/PillButton.css";

function PillZoom({ onZoomIn, onZoomOut }) {
  /* --States-- */
  const [open, setOpen] = useState(false);

  /* --Render-- */
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
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
          <button onClick={onZoomIn} className="icon-button" aria-label="zoom in">
            <LuZoomIn />
          </button>
          <button onClick={onZoomOut} className="icon-button" aria-label="zoom out">
            <LuZoomOut />
          </button>
        </div>
      )}

      {/* Always-visible magnifier icon */}
      <img className="custom-icon" src={zoomIcon} alt="" />
    </div>
  );
}

export default PillZoom;
