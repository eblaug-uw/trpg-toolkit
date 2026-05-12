import { useState } from "react";
import { generateTreasure } from "./generateTreasure";
import {
  searchDndEquipment,
  fetchDndEquipment,
  fetchRandomLootFromCategory,
  MOB_CATEGORY_MAP,
} from "../../services/dndItemSearch";

export default function TreasureGenerator() {
  // Stores the selected MOB type
  const [mobType, setMobType] = useState("Beast");

  // Stores the generated treasure items
  const [treasure, setTreasure] = useState([]);

  // Loading state for the generate button
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // Item search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Generates treasure based on the selected MOB type using the 5e API.
  // Falls back to the local mock table if the API request fails.
  async function handleGenerateTreasure() {
    setGenerateLoading(true);
    setGenerateError("");
    try {
      const category = MOB_CATEGORY_MAP[mobType];
      const items = await fetchRandomLootFromCategory(category);
      setTreasure(items.map((i) => i.name));
    } catch {
      setGenerateError("API unavailable — using local table.");
      setTreasure(generateTreasure(mobType));
    } finally {
      setGenerateLoading(false);
    }
  }

  // Searches the 5e API for equipment matching the query
  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResults([]);
    setSelectedItem(null);
    try {
      const results = await searchDndEquipment(query);
      if (results.length === 0) setSearchError("No items found.");
      else setSearchResults(results);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  // Fetches full details for a selected item
  async function handleSelectItem(index) {
    setSearchLoading(true);
    setSearchError("");
    try {
      const item = await fetchDndEquipment(index);
      setSelectedItem(item);
      setSearchResults([]);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  // Adds the selected item to the treasure list
  function handleAddToTreasure() {
    if (!selectedItem) return;
    setTreasure((prev) => [...prev, selectedItem.name]);
    setSelectedItem(null);
    setQuery("");
  }

  return (
    <section>
      {/* Dropdown to select MOB type */}
      <label htmlFor="mob-type">MOB Type:</label>
      <select id="mob-type" value={mobType} onChange={(event) => setMobType(event.target.value)}>
        <option value="Beast">Beast</option>
        <option value="Undead">Undead</option>
        <option value="Dragon">Dragon</option>
        <option value="Humanoid">Humanoid</option>
      </select>

      {/* Button that generates treasure */}
      <button onClick={handleGenerateTreasure} disabled={generateLoading}>
        {generateLoading ? "Generating..." : "Generate Treasure"}
      </button>
      {generateError && <p style={{ color: "orange" }}>{generateError}</p>}

      <hr />

      {/* Search items from the 5e API and add them to the treasure list */}
      <h3>Search Items (5e)</h3>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          placeholder="e.g. sword, shield, rope"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={searchLoading}>
          {searchLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {searchError && <p style={{ color: "red" }}>{searchError}</p>}

      {/* List of search results to pick from */}
      {searchResults.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {searchResults.map((r) => (
            <li key={r.index}>
              <button onClick={() => handleSelectItem(r.index)}>{r.name}</button>
            </li>
          ))}
        </ul>
      )}

      {/* Item detail card with Add to Treasure button */}
      {selectedItem && (
        <div style={{ border: "1px solid #444", padding: "8px", marginTop: "8px" }}>
          <strong>{selectedItem.name}</strong>
          <p>Category: {selectedItem.equipment_category?.name}</p>
          {selectedItem.cost && (
            <p>
              Cost: {selectedItem.cost.quantity} {selectedItem.cost.unit}
            </p>
          )}
          {selectedItem.weight && <p>Weight: {selectedItem.weight} lb</p>}
          {"damage" in selectedItem && selectedItem.damage && (
            <p>
              Damage: {selectedItem.damage.damage_dice} {selectedItem.damage.damage_type.name}
            </p>
          )}
          {"armor_class" in selectedItem && selectedItem.armor_class && (
            <p>
              AC: {selectedItem.armor_class.base}
              {selectedItem.armor_class.dex_bonus ? " + DEX" : ""}
            </p>
          )}
          {selectedItem.desc?.length > 0 && <p>{selectedItem.desc[0]}</p>}
          <button onClick={handleAddToTreasure}>Add to Treasure</button>
        </div>
      )}

      {/* Displays the generated treasure item names */}
      {treasure.length > 0 && (
        <ul>
          {treasure.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
