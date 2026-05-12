import { useState } from "react";
import "../style/SelectEdition.css";

function ItemDropdown() {
  const [item, setItem] = useState("");

  return (
    <div className="edition-dropdown">
      <select className="drop-dow" value={item} onChange={(e) => setItem(e.target.value)}>
        <option value="">Select Edition</option>
        <option value="5.0">DnD 5.0</option>
        <option value="5.5">DnD 5.5</option>
      </select>
    </div>
  );
}

export default ItemDropdown;
