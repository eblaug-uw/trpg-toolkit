import { useState } from "react";
import { LuChartBar, LuPackage, LuSparkles } from "react-icons/lu";
import lootIcon from "../assets/icons/loot.svg";
import "../style/PillButton.css";

function PillRight({ onLoot, onStats, onXpCalc }) {
  const [open, setOpen] = useState(false);

  function runAndClose(action) {
    setOpen(false);
    action();
  }

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
          <button onClick={() => runAndClose(onLoot)} className="icon-button" aria-label="loot">
            <img className="custom-icon" src={lootIcon} alt="" />
          </button>
          <button onClick={() => runAndClose(onStats)} className="icon-button" aria-label="stats">
            <LuChartBar />
          </button>
          <button
            onClick={() => runAndClose(onXpCalc)}
            className="icon-button"
            aria-label="xp calculator"
          >
            <LuSparkles />
          </button>
        </div>
      )}
      <LuPackage />
    </div>
  );
}

export default PillRight;
