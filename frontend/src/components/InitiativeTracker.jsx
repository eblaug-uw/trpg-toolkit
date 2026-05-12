import { useState } from "react";
import { LuDice5, LuChevronDown } from "react-icons/lu";
import CharacterItem from "./CharacterItem";
import "../style/InitiativeTracker.css";

function HpPopover({ entry, onDamage, onHeal, onClose }) {
  const [amount, setAmount] = useState(1);

  function handleDamage() {
    if (amount > 0) {
      onDamage(entry.id, amount);
      onClose();
    }
  }
  function handleHeal() {
    if (amount > 0) {
      onHeal(entry.id, amount);
      onClose();
    }
  }

  return (
    <div className="hp-popover">
      <div className="hp-popover__title">
        {entry.name} — HP {entry.hit_points}
      </div>
      <input
        className="hp-popover__input"
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        autoFocus
      />
      <div className="hp-popover__actions">
        <button className="hp-popover__btn hp-popover__btn--damage" onClick={handleDamage}>
          − Dmg
        </button>
        <button className="hp-popover__btn hp-popover__btn--heal" onClick={handleHeal}>
          + Heal
        </button>
      </div>
    </div>
  );
}

function InitiativeTracker({
  participants,
  queue,
  combatActive,
  onRoll,
  onNext,
  onSelect,
  onDamage,
  onHeal,
  onAdjustInitiative,
}) {
  const isEmpty = participants.length === 0;
  const displayList = combatActive ? queue : participants;
  const [hpPopoverId, setHpPopoverId] = useState(null);
  const [editingInitId, setEditingInitId] = useState(null);
  const [editInitValue, setEditInitValue] = useState("");

  function closeAll() {
    setHpPopoverId(null);
    setEditingInitId(null);
  }

  return (
    <div className="initiative-tracker" onClick={closeAll}>
      <button
        className={`initiative-dice-btn ${combatActive ? "initiative-dice-btn--active" : "initiative-dice-btn--idle"}`}
        onClick={(e) => {
          e.stopPropagation();
          combatActive ? onNext() : onRoll();
        }}
        disabled={isEmpty}
        title={combatActive ? "Next Turn" : "Roll Initiative"}
        aria-label={combatActive ? "next turn" : "roll initiative"}
      >
        {combatActive ? <LuChevronDown /> : <LuDice5 />}
      </button>

      {displayList.map((entry, i) => (
        <div key={entry.id} className="initiative-entry" onClick={(e) => e.stopPropagation()}>
          <CharacterItem
            character={{ name: entry.name, type: entry.type }}
            isActive={combatActive && i === 0}
            onClick={() => {
              closeAll();
              onSelect(entry);
            }}
            currentHp={entry.hit_points}
            onHpClick={() => {
              setEditingInitId(null);
              setHpPopoverId(hpPopoverId === entry.id ? null : entry.id);
            }}
          />

          {combatActive &&
            entry.initiativeTotal !== undefined &&
            (editingInitId === entry.id ? (
              <input
                className="initiative-badge-input"
                type="number"
                autoFocus
                value={editInitValue}
                onChange={(e) => setEditInitValue(e.target.value)}
                onBlur={() => setEditingInitId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onAdjustInitiative(entry.name, Number(editInitValue));
                    setEditingInitId(null);
                  }
                  if (e.key === "Escape") setEditingInitId(null);
                }}
              />
            ) : (
              <button
                className="initiative-badge"
                title="Click to adjust initiative"
                onClick={() => {
                  setHpPopoverId(null);
                  setEditingInitId(entry.id);
                  setEditInitValue(entry.initiativeTotal);
                }}
              >
                {entry.initiativeTotal}
              </button>
            ))}

          {hpPopoverId === entry.id && (
            <HpPopover
              entry={entry}
              onDamage={onDamage}
              onHeal={onHeal}
              onClose={() => setHpPopoverId(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default InitiativeTracker;
