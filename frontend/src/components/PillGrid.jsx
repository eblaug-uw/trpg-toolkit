/* --Imports-- */
import { useState } from "react";
import {
  LuLayoutGrid,
  LuRuler,
  LuSlidersHorizontal,
  LuArrowLeftRight,
  LuArrowUpDown,
} from "react-icons/lu";
import gridResizeIcon from "../assets/icons/grid-resize.svg";
import "../style/PillButton.css";

function PillGrid({
  showGrid,
  onToggleGrid,
  pixelsPerFoot,
  onChangePixelsPerFoot,
  gridFineTune,
  onChangeGridFineTune,
  gridOffsetX,
  onChangeGridOffsetX,
  gridOffsetY,
  onChangeGridOffsetY,
}) {
  const [open, setOpen] = useState(false);

  const cellStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.7rem",
    color: "#eee",
    minWidth: "70px",
  };

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
            gap: "12px",
            alignItems: "center",
            background: "#222",
            border: "1px solid #444",
            borderRadius: "999px",
            padding: "10px 16px",
            color: "#eee",
            whiteSpace: "nowrap",
          }}
        >
          {/* Shift Y */}
          <div style={cellStyle}>
            <LuArrowUpDown />
            <input
              type="range"
              min="-50"
              max="50"
              value={gridOffsetY}
              onChange={(e) => onChangeGridOffsetY(Number(e.target.value))}
              style={{ width: "70px" }}
            />
          </div>
          {/* Shift X */}
          <div style={cellStyle}>
            <LuArrowLeftRight />
            <input
              type="range"
              min="-50"
              max="50"
              value={gridOffsetX}
              onChange={(e) => onChangeGridOffsetX(Number(e.target.value))}
              style={{ width: "70px" }}
            />
          </div>
          {/* Fine-tune */}
          <div style={cellStyle}>
            <LuSlidersHorizontal />
            <input
              type="range"
              min="-20"
              max="20"
              value={gridFineTune}
              onChange={(e) => onChangeGridFineTune(Number(e.target.value))}
              style={{ width: "70px" }}
            />
          </div>

          {/* Px / ft */}
          <div style={cellStyle}>
            <LuRuler />
            <input
              type="number"
              min="1"
              value={pixelsPerFoot}
              onChange={(e) => onChangePixelsPerFoot(Number(e.target.value))}
              style={{
                width: "50px",
                padding: "2px 4px",
                background: "#333",
                color: "#eee",
                border: "1px solid #444",
                borderRadius: "4px",
                textAlign: "center",
              }}
            />
          </div>
          {/* toggle */}
          <button
            onClick={onToggleGrid}
            className="icon-button"
            aria-label="toggle grid"
            style={{ opacity: showGrid ? 1 : 0.5 }}
          >
            <LuLayoutGrid />
          </button>
        </div>
      )}

      {/* Always-visible grid icon */}
      <img className="custom-icon-2" src={gridResizeIcon} alt="" />
    </div>
  );
}

export default PillGrid;
