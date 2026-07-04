import "../style/CharacterList.css";

function CharacterList({ character, onManage, onDelete }) {
  const classText = Array.isArray(character.class) ? character.class[0] : character.class;
  const metaParts = [
    character.player_name,
    character.species,
    classText && character.level ? `${classText} ${character.level}` : classText,
  ].filter(Boolean);
  const meta = metaParts.join(" • ");

  return (
    <li className="character-list">
      <div className="character-list__text">
        <div className="character-list-name">{character.name}</div>
        {meta && <div className="character-list-meta">{meta}</div>}
      </div>
      <div className="character-list__actions">
        <button className="character-list-manage" onClick={() => onManage?.(character)}>
          Manage
        </button>
        <button className="character-list-delete" onClick={() => onDelete?.(character)}>
          Delete
        </button>
      </div>
    </li>
  );
}

export default CharacterList;
