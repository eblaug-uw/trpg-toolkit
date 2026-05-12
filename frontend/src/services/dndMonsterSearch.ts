import type { Combatant } from "./combatant";

const DND_API_BASE = "https://www.dnd5eapi.co/api/2014";

export interface MonsterSpeed {
  walk?: string;
  fly?: string;
  swim?: string;
  burrow?: string;
  climb?: string;
}

export interface MonsterArmorClass {
  type: string;
  value: number;
}

export interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
  damage?: { damage_type: { name: string }; damage_dice: string }[];
}

export interface LegendaryAction {
  name: string;
  desc: string;
}

export interface Reaction {
  name: string;
  desc: string;
}

export interface SpecialAbility {
  name: string;
  desc: string;
}

export interface MonsterProficiency {
  value: number;
  proficiency: { name: string };
}

export interface Sense {
  passive_perception: number;
  darkvision?: string;
  blindsight?: string;
  tremorsense?: string;
  truesight?: string;
}

export interface DndMonster extends Combatant {
  index: string;
  name: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  armor_class: MonsterArmorClass[];
  hit_points: number;
  hit_dice: string;
  hit_points_roll: string;
  speed: MonsterSpeed;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencies: MonsterProficiency[];
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: { name: string }[];
  senses: Sense;
  languages: string;
  challenge_rating: number;
  xp: number;
  special_abilities?: SpecialAbility[];
  actions: MonsterAction[];
  legendary_actions?: LegendaryAction[];
  reactions?: Reaction[];
  image?: string;
}

export async function fetchDndMonster(monsterName: string): Promise<DndMonster> {
  const slug = monsterName.trim().toLowerCase().replace(/\s+/g, "-");
  const response = await fetch(`${DND_API_BASE}/monsters/${slug}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Monster "${monsterName}" not found (${response.status})`);
  }

  return response.json();
}
