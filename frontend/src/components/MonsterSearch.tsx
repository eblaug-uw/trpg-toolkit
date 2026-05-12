import { useState, useEffect } from "react";
import { fetchDndMonster, type DndMonster } from "../services/dndMonsterSearch";
import {
  searchMonsters55,
  fetchMonster55ByName,
  type Monster55,
} from "../services/monsters55Search";
import { useRuleSet } from "../context/RuleSetContext";

export default function MonsterSearch() {
  const { ruleSet } = useRuleSet();
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Monster55[]>([]);
  const [monster55, setMonster55] = useState<Monster55 | null>(null);
  const [monster5e, setMonster5e] = useState<DndMonster | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setMonster55(null);
    setMonster5e(null);
    setError("");
  }, [ruleSet]);

  async function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setMonster55(null);
    setMonster5e(null);
    setResults([]);
    try {
      if (ruleSet === "5.5") {
        const found = await searchMonsters55(query, 10);
        if (found.length === 0) {
          setError("No monsters found. Check that data is imported in Supabase.");
        } else if (found.length === 1) {
          setMonster55(found[0]);
        } else {
          setResults(found);
        }
      } else {
        const result = await fetchDndMonster(query);
        setMonster5e(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(name: string) {
    setLoading(true);
    setError("");
    setResults([]);
    try {
      setMonster55(await fetchMonster55ByName(name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h2>D&D Monster Search</h2>

      <form
        onSubmit={handleSearch}
        style={{ display: "flex", justifyContent: "center", gap: "8px" }}
      >
        <input
          type="text"
          placeholder="e.g. goblin, dragon, beholder"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* 5.5e: multiple matches list */}
      {results.length > 1 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {results.map((m) => (
            <li key={m.name}>
              <button onClick={() => handleSelect(m.name)}>
                {m.name} — CR {m.cr} — {m.type}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 5.5e stat block */}
      {monster55 && (
        <div>
          {monster55.image_url && (
            <img src={monster55.image_url} alt={monster55.name} style={{ maxHeight: "150px" }} />
          )}
          <h3>{monster55.name}</h3>
          <p>
            <strong>Type:</strong> {monster55.size} {monster55.type}
          </p>
          <p>
            <strong>Alignment:</strong> {monster55.alignment ?? "—"}
          </p>
          <p>
            <strong>CR:</strong> {monster55.cr} ({monster55.xp ?? "—"} XP)
          </p>
          {monster55.legendary && (
            <p>
              <strong>Legendary Monster</strong>
            </p>
          )}
          <p>
            <strong>HP:</strong> {monster55.hp ?? "—"}
          </p>
          <p>
            <strong>AC:</strong> {monster55.ac ?? "—"}
          </p>
          <p>
            <strong>Speed:</strong> {monster55.speed ?? "—"}
          </p>
          <p>
            <strong>Initiative:</strong> {monster55.initiative ?? "—"}
          </p>
          <p>
            <strong>STR</strong> {monster55.str} &nbsp;
            <strong>DEX</strong> {monster55.dex} &nbsp;
            <strong>CON</strong> {monster55.con} &nbsp;
            <strong>INT</strong> {monster55.int} &nbsp;
            <strong>WIS</strong> {monster55.wis} &nbsp;
            <strong>CHA</strong> {monster55.cha}
          </p>
          {monster55.skills && (
            <p>
              <strong>Skills:</strong> {monster55.skills}
            </p>
          )}
          {monster55.senses && (
            <p>
              <strong>Senses:</strong> {monster55.senses}
            </p>
          )}
          {monster55.languages && (
            <p>
              <strong>Languages:</strong> {monster55.languages}
            </p>
          )}
          {monster55.habitat && (
            <p>
              <strong>Habitat:</strong> {monster55.habitat}
            </p>
          )}
          {monster55.source && (
            <p>
              <strong>Source:</strong> {monster55.source}
            </p>
          )}
          {monster55.immunities && (
            <p>
              <strong>Immunities:</strong> {monster55.immunities}
            </p>
          )}
          {monster55.resistances && (
            <p>
              <strong>Resistances:</strong> {monster55.resistances}
            </p>
          )}
          {monster55.vulnerabilities && (
            <p>
              <strong>Vulnerabilities:</strong> {monster55.vulnerabilities}
            </p>
          )}
          {monster55.traits && (
            <div style={{ textAlign: "left" }}>
              <strong>Traits:</strong>
              <p>{monster55.traits}</p>
            </div>
          )}
          {monster55.actions && (
            <div style={{ textAlign: "left" }}>
              <strong>Actions:</strong>
              <p>{monster55.actions}</p>
            </div>
          )}
          {monster55.bonus_actions && (
            <div style={{ textAlign: "left" }}>
              <strong>Bonus Actions:</strong>
              <p>{monster55.bonus_actions}</p>
            </div>
          )}
          {monster55.reactions && (
            <div style={{ textAlign: "left" }}>
              <strong>Reactions:</strong>
              <p>{monster55.reactions}</p>
            </div>
          )}
          {monster55.legendary_actions && (
            <div style={{ textAlign: "left" }}>
              <strong>Legendary Actions:</strong>
              <p>{monster55.legendary_actions}</p>
            </div>
          )}
        </div>
      )}

      {/* 5e stat block */}
      {monster5e && (
        <div>
          <h3>{monster5e.name}</h3>
          <p>
            <strong>Type:</strong> {monster5e.size} {monster5e.type}
            {monster5e.subtype ? ` (${monster5e.subtype})` : ""}
          </p>
          <p>
            <strong>Alignment:</strong> {monster5e.alignment}
          </p>
          <p>
            <strong>CR:</strong> {monster5e.challenge_rating} ({monster5e.xp} XP)
          </p>
          <p>
            <strong>HP:</strong> {monster5e.hit_points} ({monster5e.hit_dice}) — roll:{" "}
            {monster5e.hit_points_roll}
          </p>
          <p>
            <strong>AC:</strong>{" "}
            {monster5e.armor_class.map((a) => `${a.value} (${a.type})`).join(", ")}
          </p>
          <p>
            <strong>Speed:</strong>{" "}
            {Object.entries(monster5e.speed)
              .map(([k, v]) => `${k} ${v}`)
              .join(", ")}
          </p>
          <p>
            <strong>STR</strong> {monster5e.strength} &nbsp;
            <strong>DEX</strong> {monster5e.dexterity} &nbsp;
            <strong>CON</strong> {monster5e.constitution} &nbsp;
            <strong>INT</strong> {monster5e.intelligence} &nbsp;
            <strong>WIS</strong> {monster5e.wisdom} &nbsp;
            <strong>CHA</strong> {monster5e.charisma}
          </p>
          {monster5e.proficiencies.length > 0 && (
            <p>
              <strong>Proficiencies:</strong>{" "}
              {monster5e.proficiencies.map((p) => `${p.proficiency.name} +${p.value}`).join(", ")}
            </p>
          )}
          {monster5e.damage_vulnerabilities.length > 0 && (
            <p>
              <strong>Vulnerabilities:</strong> {monster5e.damage_vulnerabilities.join(", ")}
            </p>
          )}
          {monster5e.damage_resistances.length > 0 && (
            <p>
              <strong>Resistances:</strong> {monster5e.damage_resistances.join(", ")}
            </p>
          )}
          {monster5e.damage_immunities.length > 0 && (
            <p>
              <strong>Immunities:</strong> {monster5e.damage_immunities.join(", ")}
            </p>
          )}
          {monster5e.condition_immunities.length > 0 && (
            <p>
              <strong>Condition Immunities:</strong>{" "}
              {monster5e.condition_immunities.map((c) => c.name).join(", ")}
            </p>
          )}
          <p>
            <strong>Senses:</strong>{" "}
            {[
              monster5e.senses.darkvision && `Darkvision ${monster5e.senses.darkvision}`,
              monster5e.senses.blindsight && `Blindsight ${monster5e.senses.blindsight}`,
              monster5e.senses.tremorsense && `Tremorsense ${monster5e.senses.tremorsense}`,
              monster5e.senses.truesight && `Truesight ${monster5e.senses.truesight}`,
              `Passive Perception ${monster5e.senses.passive_perception}`,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p>
            <strong>Languages:</strong> {monster5e.languages || "—"}
          </p>
          {monster5e.special_abilities && monster5e.special_abilities.length > 0 && (
            <div style={{ textAlign: "left" }}>
              <strong>Special Abilities:</strong>
              {monster5e.special_abilities.map((a) => (
                <p key={a.name}>
                  <em>{a.name}:</em> {a.desc}
                </p>
              ))}
            </div>
          )}
          {monster5e.actions.length > 0 && (
            <div style={{ textAlign: "left" }}>
              <strong>Actions:</strong>
              {monster5e.actions.map((a) => (
                <p key={a.name}>
                  <em>{a.name}:</em> {a.desc}
                </p>
              ))}
            </div>
          )}
          {monster5e.reactions && monster5e.reactions.length > 0 && (
            <div style={{ textAlign: "left" }}>
              <strong>Reactions:</strong>
              {monster5e.reactions.map((r) => (
                <p key={r.name}>
                  <em>{r.name}:</em> {r.desc}
                </p>
              ))}
            </div>
          )}
          {monster5e.legendary_actions && monster5e.legendary_actions.length > 0 && (
            <div style={{ textAlign: "left" }}>
              <strong>Legendary Actions:</strong>
              {monster5e.legendary_actions.map((a) => (
                <p key={a.name}>
                  <em>{a.name}:</em> {a.desc}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
