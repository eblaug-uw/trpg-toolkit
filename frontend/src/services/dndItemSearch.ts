// Base URL for the D&D 5e 2014 REST API. Change "2014" to "2024" for the 5.5 ruleset.
const DND_API_BASE = "https://www.dnd5eapi.co/api/2014";

// Shared sub-interfaces used across multiple equipment types.
export interface Cost {
  quantity: number;
  unit: string;
}
export interface EquipmentCategory {
  name: string;
}
export interface WeaponProperty {
  name: string;
}
export interface ArmorClass {
  base: number;
  dex_bonus: boolean;
  max_bonus?: number;
}
export interface Damage {
  damage_dice: string;
  damage_type: { name: string };
}
export interface Range {
  normal: number;
  long?: number;
}
export interface ThrowRange {
  normal: number;
  long?: number;
}
export interface Speed {
  quantity: number;
  unit: string;
}
export interface Content {
  item: { name: string };
  quantity: number;
}

// Fields that every equipment type shares — all specific types extend this.
interface EquipmentBase {
  index: string;
  name: string;
  desc: string[];
  equipment_category: EquipmentCategory;
  gear_category?: EquipmentCategory;
  cost: Cost;
  weight?: number;
  properties: WeaponProperty[];
}

// Each interface below adds type-specific fields on top of EquipmentBase.
// To add a new equipment type: create a new interface extending EquipmentBase,
// add it to the DndEquipment union, and handle it in EquipmentSearch.tsx.

export interface DndArmor extends EquipmentBase {
  armor_category: string;
  armor_class: ArmorClass;
  str_minimum?: number;
  stealth_disadvantage?: boolean;
}

export interface DndWeapon extends EquipmentBase {
  weapon_category: string;
  weapon_range: string;
  category_range: string;
  damage?: Damage;
  two_handed_damage?: Damage;
  range?: Range;
  throw_range?: ThrowRange;
}

export interface DndTool extends EquipmentBase {
  tool_category: string;
}

// Gear has no extra fields beyond the base — used for torches, rope, etc.
export interface DndGear extends EquipmentBase {}

export interface DndPack extends EquipmentBase {
  contents: Content[];
}

export interface DndAmmunition extends EquipmentBase {
  quantity: number;
}

export interface DndVehicle extends EquipmentBase {
  vehicle_category: string;
  speed?: Speed;
  capacity?: string;
}

// Union of all possible equipment types returned by the API.
// Components use "in" checks (e.g. "armor_category" in item) to detect which type was returned.
export type DndEquipment =
  | DndArmor
  | DndWeapon
  | DndTool
  | DndGear
  | DndPack
  | DndAmmunition
  | DndVehicle;

export interface EquipmentListItem {
  index: string;
  name: string;
}

// Returns a list of equipment whose names contain the query string.
export async function searchDndEquipment(query: string): Promise<EquipmentListItem[]> {
  const response = await fetch(
    `${DND_API_BASE}/equipment?name=${encodeURIComponent(query.trim())}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  const data = await response.json();
  return data.results ?? [];
}

// Maps each mob type to the equipment category that best represents its loot.
export const MOB_CATEGORY_MAP: Record<string, string> = {
  Beast: "adventuring-gear",
  Undead: "weapon",
  Dragon: "armor",
  Humanoid: "weapon",
};

// Fetches all items in an equipment category, then returns `count` random ones.
export async function fetchRandomLootFromCategory(
  category: string,
  count = 3,
): Promise<EquipmentListItem[]> {
  const response = await fetch(`${DND_API_BASE}/equipment-categories/${category}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Category "${category}" not found (${response.status})`);
  const data = await response.json();
  const pool: EquipmentListItem[] = data.equipment ?? [];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Fetches a single equipment item by its API index slug (e.g. "longsword").
// Also accepts a display name — converts it to a slug automatically.
export async function fetchDndEquipment(itemName: string): Promise<DndEquipment> {
  const slug = itemName.trim().toLowerCase().replace(/\s+/g, "-");
  const response = await fetch(`${DND_API_BASE}/equipment/${slug}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`"${itemName}" not found (${response.status})`);
  }

  return response.json();
}
