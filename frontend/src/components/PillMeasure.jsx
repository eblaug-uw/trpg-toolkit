import { useState } from "react";
import { LuRuler } from "react-icons/lu";
import "../style/PillButton.css";

const MEASURE_GROUPS = [
  { title: null, items: [{ id: "distance", label: "Distance" }] },
  {
    title: "Squares",
    items: [
      { id: "square-10", label: "10" },
      { id: "square-15", label: "15" },
      { id: "square-20", label: "20" },
      { id: "square-30", label: "30" },
    ],
  },
  {
    title: "Lines",
    items: [
      { id: "line-100x5", label: "100×5" },
      { id: "line-30x5", label: "30×5" },
      { id: "line-30x10", label: "30×10" },
      { id: "line-60x10", label: "60×10" },
      { id: "line-60x5", label: "60×5" },
    ],
  },
  {
    title: "Cones",
    items: [
      { id: "cone-15", label: "15" },
      { id: "cone-30", label: "30" },
      { id: "cone-40", label: "40" },
      { id: "cone-60", label: "60" },
    ],
  },
  {
    title: "Circles",
    items: [
      { id: "circle-10", label: "10" },
      { id: "circle-15", label: "15" },
      { id: "circle-20", label: "20" },
    ],
  },
];

function PillMeasure({ measureMode, onSetMeasureMode }) {
  const [open, setOpen] = useState(false);

  const toggleMode = (id) => {
    onSetMeasureMode(measureMode === id ? null : id);
  };

  const buttonStyle = (active) => ({
    background: active ? "#3498db" : "#2d2d2d",
    color: "#eee",
    border: "none",
    borderRadius: "6px",
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: active ? "bold" : "normal",
    minWidth: "40px",
  });

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
            right: "100%",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "#222",
            border: "1px solid #444",
            borderRadius: "12px",
            padding: "12px 14px",
            color: "#eee",
            whiteSpace: "nowrap",
            minWidth: "200px",
          }}
        >
          {MEASURE_GROUPS.map((group, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {group.title && (
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#888",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {group.title}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {group.items.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMode(m.id)}
                    style={buttonStyle(measureMode === m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <LuRuler />
    </div>
  );
}

export default PillMeasure;
