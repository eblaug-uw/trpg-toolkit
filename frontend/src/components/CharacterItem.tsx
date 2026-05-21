import "../style/CharacterItem.css";

type Props = {
  character: { name: string; type: string };
  isActive: boolean;
  onClick: () => void;
  currentHp?: number;
  onHpClick?: () => void;
};

function CharacterItem({ character, isActive, onClick, currentHp, onHpClick }: Props) {
  const typeClass = character.type === "player" ? "character-item-player" : "character-item-enemy";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        className={`character-item ${typeClass} ${isActive ? "character-item-active" : ""}`}
        onClick={onClick}
        title={character.name}
      >
        <span className="character-item-icon">👤</span>
      </button>

      {currentHp !== undefined && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHpClick?.();
          }}
          title="Damage / Heal"
          style={{
            position: "absolute",
            bottom: "-6px",
            right: "-16px",
            background: "#666",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "2px 7px",
            fontSize: "0.7em",
            fontWeight: "bold",
            cursor: "pointer",
            lineHeight: 1.5,
            minWidth: "26px",
            textAlign: "center",
            zIndex: 1,
          }}
        >
          {currentHp}
        </button>
      )}
    </div>
  );
}

export default CharacterItem;
