import { useState } from "react";
import {
  fetchDndEquipment,
  type DndEquipment,
  type DndArmor,
  type DndWeapon,
  type DndTool,
  type DndPack,
  type DndAmmunition,
  type DndVehicle,
} from "../services/dndItemSearch.ts";

type EquipmentType = "armor" | "weapon" | "tool" | "gear" | "pack" | "ammunition" | "vehicle";

const PLACEHOLDERS: Record<EquipmentType, string> = {
  armor: "e.g. leather-armor, chain-mail, plate",
  weapon: "e.g. longsword, shortbow, dagger",
  tool: "e.g. thieves-tools, herbalism-kit",
  gear: "e.g. torch, rope-hempen-50-feet",
  pack: "e.g. burglar-s-pack, explorer-s-pack",
  ammunition: "e.g. arrows, bolts",
  vehicle: "e.g. rowboat, sailing-ship",
};

export default function EquipmentSearch() {
  const [type, setType] = useState<EquipmentType>("armor");
  const [query, setQuery] = useState<string>("");
  const [item, setItem] = useState<DndEquipment | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setItem(null);
    try {
      const result = await fetchDndEquipment(query);
      setItem(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h2>D&D Equipment Search</h2>
      <form
        onSubmit={handleSearch}
        style={{ display: "flex", justifyContent: "center", gap: "8px" }}
      >
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as EquipmentType);
            setItem(null);
            setError("");
          }}
        >
          <option value="armor">Armor</option>
          <option value="weapon">Weapon</option>
          <option value="tool">Tool</option>
          <option value="gear">Gear</option>
          <option value="pack">Pack</option>
          <option value="ammunition">Ammunition</option>
          <option value="vehicle">Vehicle</option>
        </select>
        <input
          type="text"
          placeholder={PLACEHOLDERS[type]}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {item && (
        <div>
          <h3>{item.name}</h3>
          <p>
            <strong>Category:</strong> {item.equipment_category.name}
          </p>
          <p>
            <strong>Cost:</strong> {item.cost.quantity} {item.cost.unit}
          </p>
          {item.weight && (
            <p>
              <strong>Weight:</strong> {item.weight} lb
            </p>
          )}
          {item.properties.length > 0 && (
            <p>
              <strong>Properties:</strong> {item.properties.map((p) => p.name).join(", ")}
            </p>
          )}

          {/* Armor */}
          {"armor_category" in item && (
            <>
              <p>
                <strong>Armor Type:</strong> {item.armor_category}
              </p>
              <p>
                <strong>AC:</strong> {item.armor_class.base}
                {item.armor_class.dex_bonus ? " + DEX" : ""}
              </p>
              {item.str_minimum ? (
                <p>
                  <strong>STR Minimum:</strong> {item.str_minimum}
                </p>
              ) : null}
              <p>
                <strong>Stealth:</strong>{" "}
                {item.stealth_disadvantage ? "Disadvantage" : "No penalty"}
              </p>
            </>
          )}

          {/* Weapon */}
          {"weapon_category" in item && (
            <>
              <p>
                <strong>Weapon Type:</strong> {item.weapon_category} — {item.category_range}
              </p>
              {item.damage && (
                <p>
                  <strong>Damage:</strong> {item.damage.damage_dice} {item.damage.damage_type.name}
                </p>
              )}
              {item.two_handed_damage && (
                <p>
                  <strong>Two-Handed:</strong> {item.two_handed_damage.damage_dice}{" "}
                  {item.two_handed_damage.damage_type.name}
                </p>
              )}
              {item.range && (
                <p>
                  <strong>Range:</strong> {item.range.normal}
                  {item.range.long ? `/${item.range.long}` : ""} ft
                </p>
              )}
            </>
          )}

          {/* Tool */}
          {"tool_category" in item && (
            <p>
              <strong>Tool Type:</strong> {item.tool_category}
            </p>
          )}

          {/* Pack */}
          {"contents" in item && item.contents?.length > 0 && (
            <div>
              <strong>Contents:</strong>
              {item.contents.map((c) => (
                <p key={c.item.name}>
                  {c.item.name} x{c.quantity}
                </p>
              ))}
            </div>
          )}

          {/* Ammunition */}
          {"quantity" in item && (
            <p>
              <strong>Quantity:</strong> {item.quantity}
            </p>
          )}

          {/* Vehicle */}
          {"vehicle_category" in item && (
            <>
              <p>
                <strong>Vehicle Type:</strong> {item.vehicle_category}
              </p>
              {item.speed && (
                <p>
                  <strong>Speed:</strong> {item.speed.quantity} {item.speed.unit}
                </p>
              )}
              {item.capacity && (
                <p>
                  <strong>Capacity:</strong> {item.capacity}
                </p>
              )}
            </>
          )}

          {item.desc.length > 0 && (
            <p>
              <em>{item.desc.join(" ")}</em>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
