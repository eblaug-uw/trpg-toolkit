import { useState } from "react";
import { FaBars } from "react-icons/fa";
import CharacterList from "./CharacterList";
import "../style/CharacterSidebar.css";

function CharacterSidebar({ characters, onAddCharacter, onManageCharacter }) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        className="character-sidebar-collapsed"
        onClick={() => setOpen(true)}
        aria-label="show characters"
        title="Show chracters"
      >
        <FaBars />
      </button>
    );
  }

  return (
    <aside className="character-sidebar">
      <div className="character-sidebar-header">
        <h2>Characters</h2>
        <button
          className="character-sidebar-hide"
          onClick={() => setOpen(false)}
          aria-label="Hide characters"
        >
          Hide
        </button>
      </div>

      <button className="character-sidebar-add" onClick={onAddCharacter}>
        Add Character
      </button>

      {characters.length === 0 ? (
        <p>No characters yet.</p>
      ) : (
        <ul className="character-sidebar-list">
          {characters.map((ch) => (
            <CharacterList key={ch.id} character={ch} onManage={onManageCharacter} />
          ))}
        </ul>
      )}
    </aside>
  );
}

export default CharacterSidebar;
