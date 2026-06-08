export const TEXT_FIELD_MAP = {
  // ─── identity (character) ─────────────────────────────
  CharacterName: "character.name",
  PlayerName: "character.player_name",
  "Race ": "character.species",
  ClassLevel: "character.class_level_raw", // parser splits into class[] + level
  Background: "character.background",
  Alignment: "character.alignment",
  XP: "character.experience_points",
  Inspiration: "character.inspiration", // text on this sheet, coerced to bool
  ProfBonus: "character.proficiency_bonus",

  // ─── ability scores (abilities) ───────────────────────
  STR: "abilities.strength",
  DEX: "abilities.dexterity",
  CON: "abilities.constitution",
  INT: "abilities.intelligence",
  WIS: "abilities.wisdom",
  CHA: "abilities.charisma",

  // ─── combat (character / speed) ───────────────────────
  AC: "character.armor_class",
  Initiative: "character.initiative",
  Speed: "speed.walk",
  HPMax: "character.hit_points_max",
  HPCurrent: "character.hit_points",
  HPTemp: "character.temp_hp",
  HDTotal: "character.hit_dice",
  HD: "character.hit_dice_current",

  // ─── personality (personality) ────────────────────────
  "PersonalityTraits ": "personality.traits",
  Ideals: "personality.ideals",
  Bonds: "personality.bonds",
  Flaws: "personality.flaws",

  // ─── appearance (appearance) ──────────────────────────
  Age: "appearance.age",
  Height: "appearance.height",
  Weight: "appearance.weight",
  Eyes: "appearance.eyes",
  Skin: "appearance.skin",
  Hair: "appearance.hair",

  // ─── features / equipment text blobs ──────────────────
  "Feat+Traits": "features_traits.raw",
  "Features and Traits": "features_traits.raw_features",
  Equipment: "character.equipment_raw",

  // ─── currency (currency) ──────────────────────────────
  CP: "currency.cp",
  SP: "currency.sp",
  EP: "currency.ep",
  GP: "currency.gp",
  PP: "currency.pp",

  // ─── attacks (attacks[]) ──────────────────────────────
  "Wpn Name": "attacks[0].name",
  "Wpn1 AtkBonus": "attacks[0].attack_bonus",
  "Wpn1 Damage": "attacks[0].damage",
  "Wpn Name 2": "attacks[1].name",
  "Wpn2 AtkBonus ": "attacks[1].attack_bonus",
  "Wpn2 Damage ": "attacks[1].damage",
  "Wpn Name 3": "attacks[2].name",
  "Wpn3 AtkBonus  ": "attacks[2].attack_bonus",
  "Wpn3 Damage ": "attacks[2].damage",

  // ─── spell slots (spell_slots) ────────────────────────
  "SlotsTotal 19": "spell_slots.level_1_total",
  "SlotsRemaining 19": "spell_slots.level_1",
  "SlotsTotal 20": "spell_slots.level_2_total",
  "SlotsRemaining 20": "spell_slots.level_2",
  "SlotsTotal 21": "spell_slots.level_3_total",
  "SlotsRemaining 21": "spell_slots.level_3",
  "SlotsTotal 22": "spell_slots.level_4_total",
  "SlotsRemaining 22": "spell_slots.level_4",
  "SlotsTotal 23": "spell_slots.level_5_total",
  "SlotsRemaining 23": "spell_slots.level_5",
  "SlotsTotal 24": "spell_slots.level_6_total",
  "SlotsRemaining 24": "spell_slots.level_6",
  "SlotsTotal 25": "spell_slots.level_7_total",
  "SlotsRemaining 25": "spell_slots.level_7",
  "SlotsTotal 26": "spell_slots.level_8_total",
  "SlotsRemaining 26": "spell_slots.level_8",
  "SlotsTotal 27": "spell_slots.level_9_total",
  "SlotsRemaining 27": "spell_slots.level_9",

  // Spells (~100 `Spells N` fields) are handled dynamically in the parser —
  // they're grouped into spells[] with level inferred from position relative
  // to SlotsTotal markers. Cantrips = the spell fields before the first marker.
};

// PDF buttons (image placeholders) — ignore for now.
export const IGNORED_FIELDS = ["CHARACTER IMAGE", "Faction Symbol Image"];

// Anonymous checkboxes ("Check Box 12" etc.) — TBD. See open question.
export const CHECKBOX_MAP = {};
