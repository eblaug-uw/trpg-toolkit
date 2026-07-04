import { useState } from "react";
import { useCharacterDraft } from "../../../context/CharacterDraftContext";
import { fetchDndEquipment, type DndEquipment } from "../../../services/dndItemSearch";
import "../../../style/CharacterWizard.css";

type EquipmentType = "armor" | "weapon" | "tool" | "gear" | "pack" | "ammunition" | "vehicle";

interface InventoryRow {
  name?: string;
  quantity?: number;
  equipped?: boolean;
  source?: string;
  unit_cost_cp?: number;
  notes?: string;
}
interface Currency {
  cp?: number;
  sp?: number;
  ep?: number;
  gp?: number;
  pp?: number;
}

const PLACEHOLDERS: Record<EquipmentType, string> = {
  armor: "e.g. leather-armor, chain-mail, plate",
  weapon: "e.g. longsword, shortbow, dagger",
  tool: "e.g. thieves-tools, herbalism-kit",
  gear: "e.g. torch, rope-hempen-50-feet",
  pack: "e.g. burglar-s-pack, explorer-s-pack",
  ammunition: "e.g. arrows, bolts",
  vehicle: "e.g. rowboat, sailing-ship",
};

function currencyToCp(c: Currency): number {
  return (c.cp ?? 0) + (c.sp ?? 0) * 10 + (c.ep ?? 0) * 50 + (c.gp ?? 0) * 100 + (c.pp ?? 0) * 1000;
}
function cpToCurrency(totalCp: number): Currency {
  let r = Math.max(0, Math.floor(totalCp));
  const pp = Math.floor(r / 1000);
  r -= pp * 1000;
  const gp = Math.floor(r / 100);
  r -= gp * 100;
  const ep = Math.floor(r / 50);
  r -= ep * 50;
  const sp = Math.floor(r / 10);
  r -= sp * 10;
  return { pp, gp, ep, sp, cp: r };
}
function costToCp(cost: { quantity: number; unit: string }): number {
  switch (cost.unit.toLowerCase()) {
    case "pp":
      return cost.quantity * 1000;
    case "gp":
      return cost.quantity * 100;
    case "ep":
      return cost.quantity * 50;
    case "sp":
      return cost.quantity * 10;
    case "cp":
      return cost.quantity;
    default:
      return 0;
  }
}
function currencyDisplay(c: Currency): string {
  const parts: string[] = [];
  if (c.pp) parts.push(`${c.pp} pp`);
  if (c.gp) parts.push(`${c.gp} gp`);
  if (c.ep) parts.push(`${c.ep} ep`);
  if (c.sp) parts.push(`${c.sp} sp`);
  if (c.cp) parts.push(`${c.cp} cp`);
  return parts.length ? parts.join(", ") : "0 cp";
}

export default function EquipmentStep() {
  const { draft, updateDraft, setTable } = useCharacterDraft();
  const inventory = (draft.inventory as InventoryRow[]) ?? [];
  const currency = (draft.currency as Currency) ?? {};
  const totalCp = currencyToCp(currency);

  const [type, setType] = useState<EquipmentType>("gear");
  const [query, setQuery] = useState("");
  const [item, setItem] = useState<DndEquipment | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setItem(null);
    try {
      const result = await fetchDndEquipment(query.trim());
      setItem(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function handleBuy() {
    if (!item) return;
    const unitCp = costToCp(item.cost);
    const totalItemCp = unitCp * qty;
    if (totalItemCp > totalCp) {
      setError(
        `Not enough funds — needs ${item.cost.quantity * qty} ${item.cost.unit} (you have ${currencyDisplay(currency)}).`,
      );
      return;
    }
    setTable("currency", cpToCurrency(totalCp - totalItemCp) as typeof draft.currency);
    const row: InventoryRow = {
      name: item.name,
      quantity: qty,
      equipped: false,
      source: "manual",
      unit_cost_cp: unitCp,
    };
    setTable("inventory", [...inventory, row] as typeof draft.inventory);
    setError("");
  }

  function handleRemoveManual(idx: number) {
    const row = inventory[idx];
    if (row.source !== "manual") return;
    const next = inventory.filter((_, i) => i !== idx);
    setTable("inventory", next as typeof draft.inventory);
    const refund = (row.unit_cost_cp ?? 0) * (row.quantity ?? 1);
    if (refund > 0) {
      setTable("currency", cpToCurrency(totalCp + refund) as typeof draft.currency);
    }
  }

  function handleToggleEquip(idx: number) {
    const next = inventory.map((r, i) => (i === idx ? { ...r, equipped: !r.equipped } : r));
    setTable("inventory", next as typeof draft.inventory);
  }

  function handleCurrencyChange(key: keyof Currency, val: number) {
    updateDraft("currency", { [key]: Math.max(0, Number.isFinite(val) ? val : 0) });
  }

  return (
    <section className="wizard-step">
      <h2>Equipment</h2>

      {/* Inventory */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">
          Your inventory ({inventory.length} {inventory.length === 1 ? "item" : "items"})
        </h3>
        {inventory.length === 0 ? (
          <p style={{ color: "#ccc" }}>Nothing in your pack yet.</p>
        ) : (
          <table className="equip-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th>Equipped</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row, i) => (
                <tr key={`${row.name ?? "row"}-${i}`}>
                  <td>{row.name ?? "(unnamed)"}</td>
                  <td>{row.quantity ?? 1}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!row.equipped}
                      onChange={() => handleToggleEquip(i)}
                    />
                  </td>
                  <td>
                    <span className={`equip-source equip-source--${row.source ?? "manual"}`}>
                      {row.source ?? "manual"}
                    </span>
                    {row.source === "manual" && (
                      <button
                        type="button"
                        className="equip-remove"
                        onClick={() => handleRemoveManual(i)}
                        style={{ marginLeft: 8 }}
                      >
                        Remove (refund)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Currency */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Currency</h3>
        <div className="equip-currency">
          {(["cp", "sp", "ep", "gp", "pp"] as Array<keyof Currency>).map((d) => (
            <label key={d} className="equip-currency__field">
              <span>{d.toUpperCase()}</span>
              <input
                type="number"
                min={0}
                value={currency[d] ?? 0}
                onChange={(e) => handleCurrencyChange(d, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
        <p className="equip-currency__total">
          Total value: {(totalCp / 100).toFixed(2)} gp ({currencyDisplay(currency)})
        </p>
      </div>

      {/* Search & buy */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Buy more equipment</h3>
        <form onSubmit={handleSearch} className="equip-search">
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
          <button type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="equip-error">{error}</p>}

        {item && (
          <div className="equip-result">
            <div className="equip-result__head">
              <h4>{item.name}</h4>
              <span className="equip-result__cost">
                {item.cost.quantity} {item.cost.unit}
              </span>
            </div>
            <p className="equip-result__meta">
              {item.equipment_category.name}
              {item.weight ? ` · ${item.weight} lb` : ""}
            </p>
            {"damage" in item && item.damage && (
              <p className="equip-result__meta">
                Damage: {item.damage.damage_dice} {item.damage.damage_type.name}
              </p>
            )}
            {"armor_class" in item && (
              <p className="equip-result__meta">
                AC: {item.armor_class.base}
                {item.armor_class.dex_bonus ? " + DEX" : ""}
              </p>
            )}
            <div className="equip-result__buy">
              <label>
                <span>Qty</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                />
              </label>
              <button type="button" onClick={handleBuy}>
                Add &amp; pay {((costToCp(item.cost) * qty) / 100).toFixed(2)} gp
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
