import { useEffect, useRef, useState } from "react";
import { LuDice5, LuChevronDown } from "react-icons/lu";
import CharacterItem from "./CharacterItem";
import { fetchAllStatuses } from "../services/statusesService";
import "../style/InitiativeTracker.css";

function HpPopover({ entry, onDamage, onHeal, onClose }) {
  const [amount, setAmount] = useState(1);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        ref={inputRef}
        className="hp-popover__input"
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
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

function StatusPopover({ entry, onApply, onRemove }) {
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [turns, setTurns] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAllStatuses()
      .then((statuses) => {
        if (!cancelled) setAvailableStatuses(statuses);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Could not load statuses.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeStatuses = entry.statuses ?? [];
  const selectedStatus = availableStatuses.find((s) => s.id === selectedId);
  const turnsInputId = `status-turns-${entry.id}`;
  const alreadyApplied =
    selectedStatus && !selectedStatus.stackable
      ? activeStatuses.some((s) => s.statusId === selectedStatus.id)
      : false;

  function handleApply() {
    if (!selectedStatus || turns < 1 || alreadyApplied) return;
    const instanceId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${selectedStatus.id}-${Date.now()}-${Math.random()}`;

    onApply({
      instanceId,
      statusId: selectedStatus.id,
      name: selectedStatus.name,
      turnsRemaining: turns,
      stackable: selectedStatus.stackable,
      effect_summary: selectedStatus.effect_summary ?? null,
    });
    setSelectedId("");
    setTurns(1);
  }

  return (
    <div className="status-popover">
      <div className="status-popover__title">{entry.name} - Statuses</div>

      {activeStatuses.length > 0 && (
        <div className="status-popover__active-list">
          {activeStatuses.map((status) => (
            <div key={status.instanceId} className="status-popover__active-item">
              <span title={status.effect_summary ?? ""}>
                {status.name} ({status.turnsRemaining}t)
              </span>
              <button
                className="status-popover__remove-btn"
                onClick={() => onRemove(status.instanceId)}
                title="Remove status"
                aria-label={`remove ${status.name}`}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <select
        className="status-popover__select"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Select status...</option>
        {availableStatuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>

      <div className="status-popover__row">
        <label className="status-popover__label" htmlFor={turnsInputId}>
          Turns
        </label>
        <input
          id={turnsInputId}
          className="status-popover__input"
          type="number"
          min={1}
          value={turns}
          onChange={(e) => setTurns(Number(e.target.value))}
        />
      </div>

      {selectedStatus?.effect_summary && (
        <p className="status-popover__summary">{selectedStatus.effect_summary}</p>
      )}
      {alreadyApplied && (
        <p className="status-popover__summary">
          This status is already active and is not stackable.
        </p>
      )}
      {error && <p className="status-popover__summary">{error}</p>}

      <button
        className="status-popover__apply-btn"
        onClick={handleApply}
        disabled={!selectedId || turns < 1 || alreadyApplied}
      >
        Apply
      </button>
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
  onApplyStatus,
  onRemoveStatus,
}) {
  const isEmpty = participants.length === 0;
  const displayList = combatActive ? queue : participants;
  const [hpPopoverId, setHpPopoverId] = useState(null);
  const [editingInitId, setEditingInitId] = useState(null);
  const [editInitValue, setEditInitValue] = useState("");
  const [statusPopoverId, setStatusPopoverId] = useState(null);

  function closeAll() {
    setHpPopoverId(null);
    setEditingInitId(null);
    setStatusPopoverId(null);
  }

  return (
    <div
      className="initiative-tracker"
      onClick={closeAll}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeAll();
      }}
      role="presentation"
    >
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

      {displayList.map((entry, i) => {
        const activeStatuses = entry.statuses ?? [];
        return (
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
                setStatusPopoverId(null);
                setHpPopoverId(hpPopoverId === entry.id ? null : entry.id);
              }}
              statusCount={activeStatuses.length}
              onStatusClick={() => {
                setHpPopoverId(null);
                setEditingInitId(null);
                setStatusPopoverId(statusPopoverId === entry.id ? null : entry.id);
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
                    setStatusPopoverId(null);
                    setEditingInitId(entry.id);
                    setEditInitValue(String(entry.initiativeTotal));
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

            {statusPopoverId === entry.id && (
              <StatusPopover
                entry={entry}
                onApply={(status) => onApplyStatus(entry.id, status)}
                onRemove={(instanceId) => onRemoveStatus(entry.id, instanceId)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default InitiativeTracker;
