import { useState } from "react";
import { useRuleSet } from "../../context/RuleSetContext";
import { generateMobParty, pickRandomMonsters } from "./generateMobParty";
import { fetchMonsters55ForParty } from "../../services/monsters55Search";

function sizeToCells(sizeStr) {
  switch (sizeStr) {
    case "Tiny":
    case "Small":
    case "Medium":
      return 1;
    case "Large":
      return 2;
    case "Huge":
      return 3;
    case "Gargantuan":
      return 4;
    default:
      return 1;
  }
}

export default function EnemyGenerator({ onAdd }) {
  const { ruleSet } = useRuleSet();
  const is55 = ruleSet === "5.5";

  const [challengeRating, setChallengeRating] = useState(1);
  const [mobCount, setMobCount] = useState(3);
  const [habitat, setHabitat] = useState("Any");
  const [type, setType] = useState("Any");
  const [group, setGroup] = useState("Any");
  const [party, setParty] = useState([]);
  const [savedParties, setSavedParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerateParty() {
    const crValue = Number(challengeRating);
    const mobCountValue = Number(mobCount);

    if (crValue <= 0 || mobCountValue <= 0) {
      alert("Please enter a CR and MOB count greater than 0.");
      return;
    }

    setError("");
    setParty([]);

    if (is55) {
      setLoading(true);
      try {
        const monsters = await fetchMonsters55ForParty(
          crValue,
          habitat !== "Any" ? habitat : undefined,
          type !== "Any" ? type : undefined,
        );
        if (monsters.length === 0) {
          setError("No monsters found for the selected filters.");
          return;
        }
        setParty(pickRandomMonsters(monsters, mobCountValue));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch monsters.");
      } finally {
        setLoading(false);
      }
    } else {
      const generated = generateMobParty(crValue, mobCountValue, habitat, type, group);
      if (generated.length === 0) {
        setError("No MOBs match the selected filters.");
        return;
      }
      setParty(generated);
    }
  }

  function handleSaveParty() {
    if (party.length === 0) {
      alert("Generate a party before saving.");
      return;
    }
    setSavedParties([...savedParties, { party, edition: ruleSet }]);
  }

  function getMonsterName(m) {
    return m.name;
  }
  function getMonsterCR(m) {
    return m.cr;
  }
  function getMonsterType(m) {
    return m.type;
  }
  function getMonsterHabitat(m) {
    return m.habitat;
  }

  function addToTracker(monster) {
    if (!onAdd) return;
    const name = getMonsterName(monster);
    onAdd(
      is55
        ? {
            id: `${name}-${Date.now()}-${Math.random()}`,
            name,
            type: "monster",
            edition: "5.5",
            dexterity: monster.dex ?? 10,
            hit_points: monster.hp ?? 1,
            size: sizeToCells(monster.size),
            data: monster,
          }
        : {
            id: `${name}-${Date.now()}-${Math.random()}`,
            name,
            type: "monster",
            edition: "5.0",
            dexterity: 10,
            hit_points: 10,
            size: 1,
            data: monster,
          },
    );
  }

  function addAllToTracker() {
    party.forEach(addToTracker);
  }

  return (
    <section>
      <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
        <span
          style={{
            padding: "2px 10px",
            borderRadius: "12px",
            fontSize: "0.85em",
            background: is55 ? "#2d6a4f" : "#444",
            color: "white",
            fontWeight: "bold",
          }}
        >
          {is55 ? "5.5e (2024)" : "5.0e (2014)"}
        </span>
        <span style={{ fontSize: "0.8em", color: "#888", alignSelf: "center" }}>
          Switch edition in the account menu
        </span>
      </div>
      <hr />

      <label htmlFor="challenge-rating">Target CR (max):</label>
      <input
        id="challenge-rating"
        type="number"
        step="0.25"
        min="0.25"
        value={challengeRating}
        onChange={(e) => setChallengeRating(e.target.value)}
      />

      <label htmlFor="mob-count">Number of MOBs:</label>
      <input
        id="mob-count"
        type="number"
        min="1"
        value={mobCount}
        onChange={(e) => setMobCount(e.target.value)}
      />

      <label htmlFor="habitat">Habitat:</label>
      <select id="habitat" value={habitat} onChange={(e) => setHabitat(e.target.value)}>
        <option value="Any">Any</option>
        <option value="Forest">Forest</option>
        <option value="Mountain">Mountain</option>
        <option value="Dungeon">Dungeon</option>
        <option value="Swamp">Swamp</option>
        <option value="Road">Road</option>
        {is55 && <option value="Arctic">Arctic</option>}
        {is55 && <option value="Coastal">Coastal</option>}
        {is55 && <option value="Desert">Desert</option>}
        {is55 && <option value="Underdark">Underdark</option>}
        {is55 && <option value="Urban">Urban</option>}
      </select>

      <label htmlFor="type">Type:</label>
      <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="Any">Any</option>
        <option value="Humanoid">Humanoid</option>
        <option value="Undead">Undead</option>
        {is55 && <option value="Aberration">Aberration</option>}
        {is55 && <option value="Beast">Beast</option>}
        {is55 && <option value="Dragon">Dragon</option>}
        {is55 && <option value="Elemental">Elemental</option>}
        {is55 && <option value="Fiend">Fiend</option>}
        {is55 && <option value="Monstrosity">Monstrosity</option>}
      </select>

      {/* Group filter only applies to 5.0 mock data */}
      {!is55 && (
        <>
          <label htmlFor="group">Group:</label>
          <select id="group" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="Any">Any</option>
            <option value="Tribe">Tribe</option>
            <option value="Warband">Warband</option>
            <option value="Horde">Horde</option>
            <option value="Gang">Gang</option>
          </select>
        </>
      )}

      <button onClick={handleGenerateParty} disabled={loading}>
        {loading ? "Generating..." : "Generate Party"}
      </button>

      <button onClick={handleSaveParty}>Save Party</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {party.length > 0 && (
        <>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {party.map((monster, index) => (
              <li
                key={`${getMonsterName(monster)}-${index}`}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}
              >
                <span>
                  {getMonsterName(monster)} — CR {getMonsterCR(monster)} — {getMonsterType(monster)}
                  {getMonsterHabitat(monster) ? ` — ${getMonsterHabitat(monster)}` : ""}
                </span>
                <button
                  onClick={() => addToTracker(monster)}
                  style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
          <button onClick={addAllToTracker} style={{ marginTop: "6px" }}>
            Add All to Tracker
          </button>
        </>
      )}

      {savedParties.length > 0 && (
        <>
          <h3>Saved Parties</h3>
          {savedParties.map((saved, partyIndex) => (
            <div key={partyIndex}>
              <h4>
                Party {partyIndex + 1}{" "}
                <span style={{ fontSize: "0.8em", color: "#888" }}>({saved.edition})</span>
              </h4>
              <ul>
                {saved.party.map((monster, monsterIndex) => (
                  <li key={`${getMonsterName(monster)}-${partyIndex}-${monsterIndex}`}>
                    {getMonsterName(monster)} — CR {getMonsterCR(monster)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
