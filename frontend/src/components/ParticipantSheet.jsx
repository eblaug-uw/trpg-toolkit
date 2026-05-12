import { useState } from "react";
import Modal from "./Modal";

function StatBox({ label, value }) {
  const mod = Math.floor((value - 10) / 2);
  return (
    <div style={{ textAlign: "center", minWidth: "52px" }}>
      <div style={{ fontSize: "0.7em", color: "#666", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{value}</div>
      <div style={{ fontSize: "0.85em", color: "#444" }}>{mod >= 0 ? `+${mod}` : mod}</div>
    </div>
  );
}

// 5e (2014) — data comes from dnd5eapi.co (nested objects)
function MonsterSheet5e({ data }) {
  const ac = data.armor_class?.[0];
  return (
    <div style={{ maxWidth: "480px" }}>
      <p style={{ margin: "0 0 4px", color: "#666", fontStyle: "italic" }}>
        {data.size} {data.type}
        {data.subtype ? ` (${data.subtype})` : ""} · {data.alignment}
      </p>
      <p style={{ margin: "0 0 4px" }}>
        <strong>CR</strong> {data.challenge_rating} &nbsp;·&nbsp;
        <strong>AC</strong> {ac ? `${ac.value} (${ac.type})` : "—"}
      </p>
      <p style={{ margin: "0 0 12px" }}>
        <strong>Speed</strong>{" "}
        {Object.entries(data.speed ?? {})
          .map(([k, v]) => `${k} ${v}`)
          .join(", ")}
      </p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <StatBox label="STR" value={data.strength} />
        <StatBox label="DEX" value={data.dexterity} />
        <StatBox label="CON" value={data.constitution} />
        <StatBox label="INT" value={data.intelligence} />
        <StatBox label="WIS" value={data.wisdom} />
        <StatBox label="CHA" value={data.charisma} />
      </div>

      {data.senses && (
        <p style={{ margin: "0 0 4px", fontSize: "0.9em" }}>
          <strong>Senses</strong>{" "}
          {[
            data.senses.darkvision && `Darkvision ${data.senses.darkvision}`,
            data.senses.blindsight && `Blindsight ${data.senses.blindsight}`,
            data.senses.tremorsense && `Tremorsense ${data.senses.tremorsense}`,
            data.senses.truesight && `Truesight ${data.senses.truesight}`,
            `Passive Perception ${data.senses.passive_perception}`,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      {data.languages && (
        <p style={{ margin: "0 0 12px", fontSize: "0.9em" }}>
          <strong>Languages</strong> {data.languages}
        </p>
      )}
      {data.special_abilities?.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <strong>Special Abilities</strong>
          {data.special_abilities.map((a) => (
            <p key={a.name} style={{ margin: "4px 0", fontSize: "0.9em" }}>
              <em>{a.name}.</em> {a.desc}
            </p>
          ))}
        </div>
      )}
      {data.actions?.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <strong>Actions</strong>
          {data.actions.map((a) => (
            <p key={a.name} style={{ margin: "4px 0", fontSize: "0.9em" }}>
              <em>{a.name}.</em> {a.desc}
            </p>
          ))}
        </div>
      )}
      {data.legendary_actions?.length > 0 && (
        <div>
          <strong>Legendary Actions</strong>
          {data.legendary_actions.map((a) => (
            <p key={a.name} style={{ margin: "4px 0", fontSize: "0.9em" }}>
              <em>{a.name}.</em> {a.desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// 5.5e (2024) — data comes from references.monsters (snake_case columns)
function MonsterSheet55({ data }) {
  return (
    <div style={{ maxWidth: "480px" }}>
      <p style={{ margin: "0 0 4px", color: "#666", fontStyle: "italic" }}>
        {data.size} {data.type} · {data.alignment}
      </p>
      <p style={{ margin: "0 0 4px" }}>
        <strong>CR</strong> {data.cr} &nbsp;·&nbsp;
        <strong>AC</strong> {data.ac ?? "—"}
      </p>
      <p style={{ margin: "0 0 12px" }}>
        <strong>Speed</strong> {data.speed ?? "—"}
      </p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <StatBox label="STR" value={data.str} />
        <StatBox label="DEX" value={data.dex} />
        <StatBox label="CON" value={data.con} />
        <StatBox label="INT" value={data.int} />
        <StatBox label="WIS" value={data.wis} />
        <StatBox label="CHA" value={data.cha} />
      </div>

      {data.skills && (
        <p style={{ margin: "0 0 4px", fontSize: "0.9em" }}>
          <strong>Skills</strong> {data.skills}
        </p>
      )}
      {data.senses && (
        <p style={{ margin: "0 0 4px", fontSize: "0.9em" }}>
          <strong>Senses</strong> {data.senses}
        </p>
      )}
      {data.languages && (
        <p style={{ margin: "0 0 12px", fontSize: "0.9em" }}>
          <strong>Languages</strong> {data.languages}
        </p>
      )}
      {data.immunities && (
        <p style={{ margin: "0 0 4px", fontSize: "0.9em" }}>
          <strong>Immunities</strong> {data.immunities}
        </p>
      )}
      {data.resistances && (
        <p style={{ margin: "0 0 4px", fontSize: "0.9em" }}>
          <strong>Resistances</strong> {data.resistances}
        </p>
      )}
      {data.traits && (
        <div style={{ marginBottom: "8px" }}>
          <strong>Traits</strong>
          <p style={{ margin: "4px 0", fontSize: "0.9em" }}>{data.traits}</p>
        </div>
      )}
      {data.actions && (
        <div style={{ marginBottom: "8px" }}>
          <strong>Actions</strong>
          <p style={{ margin: "4px 0", fontSize: "0.9em" }}>{data.actions}</p>
        </div>
      )}
      {data.bonus_actions && (
        <div style={{ marginBottom: "8px" }}>
          <strong>Bonus Actions</strong>
          <p style={{ margin: "4px 0", fontSize: "0.9em" }}>{data.bonus_actions}</p>
        </div>
      )}
      {data.reactions && (
        <div style={{ marginBottom: "8px" }}>
          <strong>Reactions</strong>
          <p style={{ margin: "4px 0", fontSize: "0.9em" }}>{data.reactions}</p>
        </div>
      )}
      {data.legendary_actions && (
        <div>
          <strong>Legendary Actions</strong>
          <p style={{ margin: "4px 0", fontSize: "0.9em" }}>{data.legendary_actions}</p>
        </div>
      )}
    </div>
  );
}

function PlayerSheet({ data }) {
  return (
    <div style={{ maxWidth: "360px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <StatBox label="DEX" value={data.dexterity} />
      </div>
    </div>
  );
}

function ParticipantSheet({ participant, onClose, onRemove, onDamage, onHeal }) {
  const [dmg, setDmg] = useState(0);

  if (!participant) return null;

  // Support both 5e (hit_points) and 5.5e (HP) data shapes
  const maxHp = participant.data?.hit_points ?? participant.data?.hp;
  const currentHp = participant.hit_points;
  const hpColor = currentHp === 0 ? "#c0392b" : currentHp < maxHp / 2 ? "#e67e22" : "#27ae60";

  function applyDamage() {
    const amount = Number(dmg);
    if (amount <= 0) return;
    onDamage(participant.id, amount);
    setDmg(0);
  }

  function applyHeal() {
    const amount = Number(dmg);
    if (amount <= 0) return;
    onHeal(participant.id, amount);
    setDmg(0);
  }

  return (
    <Modal isOpen title={participant.name} onClose={onClose}>
      {/* HP bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontWeight: "bold", color: hpColor }}>
            HP {currentHp} / {maxHp}
          </span>
          {currentHp === 0 && <span style={{ color: "#c0392b", fontWeight: "bold" }}>☠ Down</span>}
        </div>
        <div style={{ background: "#ddd", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
          <div
            style={{
              width: `${(currentHp / maxHp) * 100}%`,
              background: hpColor,
              height: "100%",
              transition: "width 0.3s, background 0.3s",
            }}
          />
        </div>
      </div>

      {participant.type === "monster" && participant.edition === "5.5" && (
        <MonsterSheet55 data={participant.data} />
      )}
      {participant.type === "monster" && participant.edition !== "5.5" && (
        <MonsterSheet5e data={participant.data} />
      )}
      {participant.type === "player" && <PlayerSheet data={participant.data} />}

      {/* Damage / Heal input */}
      <div
        style={{
          marginTop: "16px",
          borderTop: "1px solid #ddd",
          paddingTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="number"
            min={0}
            value={dmg}
            onChange={(e) => setDmg(e.target.value)}
            placeholder="Damage"
            style={{ width: "90px", padding: "4px 8px" }}
          />
          <button
            onClick={applyDamage}
            style={{
              background: "#c0392b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Damage
          </button>
          <button
            onClick={applyHeal}
            style={{
              background: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Heal
          </button>
          <button
            onClick={() => onRemove(participant.id)}
            style={{
              background: "transparent",
              color: "#888",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "6px 14px",
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ParticipantSheet;
