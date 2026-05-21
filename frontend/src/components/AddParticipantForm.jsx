import { useState, useEffect } from "react";
import { fetchDndMonster } from "../services/dndMonsterSearch";
import { searchMonsters55, fetchMonster55ByName } from "../services/monsters55Search";
import { useRuleSet } from "../context/RuleSetContext";

function AddParticipantForm({ onAdd }) {
  const { ruleSet } = useRuleSet();
  const is55 = ruleSet === "5.5";

  const [tab, setTab] = useState("monster");
  const [query, setQuery] = useState("");
  const [monster, setMonster] = useState(null);
  const [results, setResults] = useState([]);
  const [monsterError, setMonsterError] = useState("");
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerDex, setPlayerDex] = useState(10);
  const [playerHp, setPlayerHp] = useState(20);
  const [playerInitiative, setPlayerInitiative] = useState("");

  // Clear search state when edition changes
  useEffect(() => {
    setQuery("");
    setMonster(null);
    setResults([]);
    setMonsterError("");
  }, [ruleSet]);

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

  async function handleMonsterSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setMonsterError("");
    setMonster(null);
    setResults([]);
    try {
      if (is55) {
        const found = await searchMonsters55(query, 10);
        if (found.length === 0) throw new Error("No monsters found");
        if (found.length === 1) setMonster(found[0]);
        else setResults(found);
      } else {
        setMonster(await fetchDndMonster(query));
      }
    } catch (err) {
      setMonsterError(err instanceof Error ? err.message : "Not found");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect55(name) {
    setLoading(true);
    setResults([]);
    try {
      setMonster(await fetchMonster55ByName(name));
    } catch (err) {
      setMonsterError(err instanceof Error ? err.message : "Not found");
    } finally {
      setLoading(false);
    }
  }

  function handleAddMonster() {
    if (!monster) return;

    const participant = is55
      ? {
          id: `${monster.name}-${Date.now()}`,
          name: monster.name,
          type: "monster",
          edition: "5.5",
          dexterity: monster.dex ?? 10,
          hit_points: monster.hp ?? 1,
          size: sizeToCells(monster.size),
          data: monster,
        }
      : {
          id: `${monster.index}-${Date.now()}`,
          name: monster.name,
          type: "monster",
          edition: "5.0",
          dexterity: monster.dexterity,
          hit_points: monster.hit_points,
          size: sizeToCells(monster.size),
          data: monster,
        };

    onAdd(participant);
    setMonster(null);
    setQuery("");
  }

  function handleAddPlayer(e) {
    e.preventDefault();
    if (!playerName.trim()) return;
    onAdd({
      id: `player-${Date.now()}`,
      name: playerName.trim(),
      type: "player",
      dexterity: Number(playerDex),
      size: 1,
      hit_points: Number(playerHp),
      ...(playerInitiative !== "" && { initiative_override: Number(playerInitiative) }),
      data: { name: playerName.trim(), dexterity: Number(playerDex), hit_points: Number(playerHp) },
    });
    setPlayerName("");
    setPlayerDex(10);
    setPlayerHp(20);
    setPlayerInitiative("");
  }

  const tabStyle = (active) => ({
    padding: "6px 16px",
    border: "none",
    borderBottom: active ? "2px solid #fff" : "2px solid transparent",
    background: "transparent",
    color: active ? "#fff" : "#888",
    cursor: "pointer",
    fontWeight: active ? "bold" : "normal",
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "16px",
          borderBottom: "1px solid #444",
        }}
      >
        <button style={tabStyle(tab === "monster")} onClick={() => setTab("monster")}>
          Monster
        </button>
        <button style={tabStyle(tab === "player")} onClick={() => setTab("player")}>
          Player
        </button>
      </div>

      {tab === "monster" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <form onSubmit={handleMonsterSearch} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="e.g. goblin, dragon, beholder"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          {monsterError && <p style={{ color: "red", margin: 0 }}>{monsterError}</p>}

          {/* 5.5e: multiple matches — pick one */}
          {results.length > 1 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {results.map((m) => (
                <li key={m.name}>
                  <button onClick={() => handleSelect55(m.name)}>
                    {m.name} — CR {m.cr} — {m.type}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {monster && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <strong>{is55 ? monster.name : monster.name}</strong>
                <span style={{ marginLeft: "12px", color: "#aaa", fontSize: "0.9em" }}>
                  {is55
                    ? `DEX ${monster.dex} · HP ${monster.hp}`
                    : `DEX ${monster.dexterity} · HP ${monster.hit_points}`}
                </span>
              </div>
              <button onClick={handleAddMonster}>Add to Combat</button>
            </div>
          )}
        </div>
      )}

      {tab === "player" && (
        <form
          onSubmit={handleAddPlayer}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Name
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Player name"
              style={{ width: "60%" }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            DEX score
            <input
              type="number"
              min={1}
              max={30}
              value={playerDex}
              onChange={(e) => setPlayerDex(e.target.value)}
              style={{ width: "60px" }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Max HP
            <input
              type="number"
              min={1}
              value={playerHp}
              onChange={(e) => setPlayerHp(e.target.value)}
              style={{ width: "60px" }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Initiative (optional)
            <input
              type="number"
              min={1}
              max={30}
              value={playerInitiative}
              onChange={(e) => setPlayerInitiative(e.target.value)}
              placeholder="roll manually"
              style={{ width: "60px" }}
            />
          </label>
          <button type="submit" style={{ alignSelf: "flex-end" }}>
            Add Player
          </button>
        </form>
      )}
    </div>
  );
}

export default AddParticipantForm;
