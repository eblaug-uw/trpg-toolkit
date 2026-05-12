import "../style/CharacterList.css";

function CharacterList({ character, onManage }) {
  return (
    <li className="character-list">
      <span className="character-list-name">{character.name}</span>
      <button className="character-list-manage" onClick={() => onManage?.(character)}>
        Manage
      </button>
    </li>
  );
}

export default CharacterList;
