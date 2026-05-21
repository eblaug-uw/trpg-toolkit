import { useState, useRef, useEffect } from "react";
import { LuDice5, LuChevronDown } from "react-icons/lu";
import CharacterItem from "./CharacterItem";
import { fetchAllStatuses } from "../services/statusesService";
import type { Status, AppliedStatus } from "../services/statusesService";
import "../style/InitiativeTracker.css";

type Entry = {
  id: string;
  name: string;
  type: string;
  hit_points: number;
  initiativeTotal?: number;
  statuses?: AppliedStatus[];
};

type HpPopoverProps = {
  entry: Entry;
  onDamage: (id: string, amount: number) => void;
  onHeal: (id: string, amount: number) => void;
  onClose: () => void;
};

type Props = {
  participants: Entry[];
  queue: Entry[];
  combatActive: boolean;
  onRoll: () => void;
  onNext: () => void;
  onSelect: (entry: Entry) => void;
  onDamage: (id: string, amount: number) => void;
  onHeal: (id: string, amount: number) => void;
  onAdjustInitiative: (name: string, total: number) => void;
  onApplyStatus: (id: string, status: AppliedStatus) => void;
  onRemoveStatus: (id: string, instanceId: string) => void;
};

function HpPopover({ entry, onDamage, onHeal, onClose }: HpPopoverProps) {
  const [amount, setAmount] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

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

function StatusPopover({
  entry,
  onApply,
  onRemove,
}: {
  entry: Entry;
  onApply: (status: AppliedStatus) => void;
  onRemove: (instanceId: string) => void;
}) {
  const [availableStatuses, setAvailableStatuses] = useState<Status[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [turns, setTurns] = useState(1);

  useEffect(() => {
    fetchAllStatuses().then(setAvailableStatuses).catch(console.error);
  }, []);

  function handleApply() {
    const found = availableStatuses.find((s) => s.id === selectedId);
    if (!found) return;
    onApply({
      instanceId: crypto.randomUUID(),
      statusId: found.id,
      name: found.name,
      turnsRemaining: turns,
      effect_summary: found.effect_summary ?? null,
    });
    setSelectedId("");
    setTurns(1);
  }

  const activeStatuses = entry.statuses ?? [];

  return (
    <div className="status-popover">
      <div className="status-popover__title">{entry.name} — Statuses</div>

      {activeStatuses.length > 0 && (
        <div className="status-popover__active-list">
          {activeStatuses.map((s) => (
            <div key={s.instanceId} className="status-popover__active-item">
              <span>
                {s.name} ({s.turnsRemaining}t)
              </span>
              <button
                className="status-popover__remove-btn"
                onClick={() => onRemove(s.instanceId)}
                title="Remove"
              >
                ×
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
        <option value="">Select status…</option>
        {availableStatuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <div className="status-popover__row">
        <label className="status-popover__label">Turns</label>
        <input
          className="status-popover__input"
          type="number"
          min={1}
          value={turns}
          onChange={(e) => setTurns(Number(e.target.value))}
        />
      </div>

      <button
        className="status-popover__apply-btn"
        onClick={handleApply}
        disabled={!selectedId || turns < 1}
      >
        Apply
      </button>
    </div>
  );
}

function InitiativeEditInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <input
      ref={ref}
      className="initiative-badge-input"
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
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
}: Props) {
  const isEmpty = participants.length === 0;
  const displayList = combatActive ? queue : participants;
  const [hpPopoverId, setHpPopoverId] = useState<string | null>(null);
  const [editingInitId, setEditingInitId] = useState<string | null>(null);
  const [editInitValue, setEditInitValue] = useState("");
  const [statusPopoverId, setStatusPopoverId] = useState<string | null>(null);

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
          if (combatActive) {
            onNext();
          } else {
            onRoll();
          }
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
          <div
            key={entry.id}
            className="initiative-entry"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
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
            />

            {/* Status badge button */}
            <button
              className={`status-badge-btn${activeStatuses.length > 0 ? " status-badge-btn--active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setHpPopoverId(null);
                setEditingInitId(null);
                setStatusPopoverId(statusPopoverId === entry.id ? null : entry.id);
              }}
              title="Apply Status"
            >
              {activeStatuses.length > 0 ? activeStatuses.length : "+"}
            </button>

            {combatActive &&
              entry.initiativeTotal !== undefined &&
              (editingInitId === entry.id ? (
                <InitiativeEditInput
                  value={editInitValue}
                  onChange={setEditInitValue}
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
                    setEditInitValue(String(entry.initiativeTotal ?? ""));
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
