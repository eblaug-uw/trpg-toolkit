import { useState } from "react";
import { LuSettings2 } from "react-icons/lu";
import "../style/PillButton.css";

function PillMapContorl({ children }) {
  const [locked, setLocked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = locked || hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#222",
        border: "1px solid #444",
        borderRadius: "999px",
        padding: "12px 10px",
        color: "#eee",
        fontSize: open ? "1.4rem" : "1.1rem",
        gap: open ? "16px" : "12px",
      }}
    >
      {open && children}
      <button
        onClick={() => setLocked((prev) => !prev)}
        aria-label="map controls"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: locked ? "1px solid #888" : "1px solid transparent",
          borderRadius: "999px",
          padding: "4px",
          color: "#eee",
          cursor: "pointer",
          fontSize: "inherit",
        }}
      >
        <LuSettings2 />
      </button>
    </div>
  );
}

export default PillMapContorl;
