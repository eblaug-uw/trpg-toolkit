import { useMemo } from "react";
import { useCharacterDraft } from "../../../context/CharacterDraftContext";
import classData from "../../../data/classes_55.json";
import fsData from "../../../data/fighting_styles_55.json";
import featsData from "../../../data/feats_55.json";
import "../../../style/CharacterWizard.css";

interface EquipOption {
  label: string;
  items: string[];
  gold: number;
}
interface ClassFeature {
  level: number;
  name: string;
  description: string;
}
interface Subclass {
  name: string;
  tagline?: string;
  description: string;
  features: ClassFeature[];
}
interface Spellcasting {
  ability: string;
  spell_list?: string;
  spellcasting_focus?: string;
  ritual_casting?: boolean;
  pact_magic?: boolean;
  spell_slots_by_level?: Record<string, number[]>;
  cantrips_known_by_level?: Record<string, number>;
  spells_prepared_by_level?: Record<string, number>;
  pact_slots_by_level?: Record<string, { slots: number; slot_level: number }>;
}
interface ClassDef {
  id: string;
  name: string;
  hit_die: number;
  saving_throws: string[];
  skill_choice_count: number;
  skill_choices: string[];
  subclass_level: number;
  starting_equipment: EquipOption[];
  spellcasting?: Spellcasting | null;
  features: ClassFeature[];
  subclasses: Subclass[];
  level_progression?: Array<Record<string, unknown>>;
}
interface FightingStyle {
  id: string;
  name: string;
  description: string;
}

interface FeatGrants {
  ability_increase?: { choose: number; amount: number; from: string[]; max: number };
  ability_increase_options?: Array<{ choose: number; amount: number; from: string[]; max: number }>;
  ability_increase_and_save?: {
    choose: number;
    amount: number;
    from: string[];
    max: number;
    also_grants: string;
  };
  skill_or_tool_proficiency?: { choose: number; from: string | string[] };
  tool_proficiency?: { fixed: string[] };
  hp_bonus_per_level?: number;
  initiative_proficiency?: boolean;
  luck_points_per_long_rest?: string;
  damage_resistance_choice?: { choose: number; from: string[] };
  spells_known?: {
    cantrips: number;
    level_1: number;
    from_class_list: string[];
    choose_class: number;
  };
  spellcasting_ability_choice?: string[];
}
interface FeatDef {
  id: string;
  name: string;
  category: "Origin" | "General" | "Epic Boon" | "Fighting Style" | "Dragonmark";
  source: string;
  summary: string;
  prerequisite: string | null;
  repeatable: boolean;
  description: string;
  grants?: FeatGrants;
}

const ALL_CLASSES = (classData as { classes: ClassDef[] }).classes;
const ALL_FS = (fsData as { fighting_styles: FightingStyle[] }).fighting_styles;
const ALL_FEATS = (featsData as { feats: FeatDef[] }).feats;

const CLASSES_WITH_FS: Record<string, number> = {
  fighter: 1,
  paladin: 2,
  ranger: 2,
};
const ABILITIES_ALL = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

function skillKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}
function abilityKey(name: string): string {
  return name.toLowerCase();
}
function profBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}
function parsePrereqLevel(p: string | null): number {
  const m = p?.match(/Level\s+(\d+)/i);
  return m ? Number(m[1]) : 1;
}
function featIsEligible(
  feat: FeatDef,
  charLevel: number,
  abilities: Record<string, number>,
  alreadyTaken: string[],
  isEpicSlot: boolean,
  hasSpellcasting: boolean,
): boolean {
  if (isEpicSlot && feat.category !== "Epic Boon") return false;
  if (!isEpicSlot && feat.category !== "General") return false;
  if (charLevel < parsePrereqLevel(feat.prerequisite)) return false;
  if (alreadyTaken.includes(feat.name) && !feat.repeatable) return false;
  const abMatch = feat.prerequisite?.match(
    /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(\d+)/i,
  );
  if (abMatch) {
    const ab = abMatch[1].toLowerCase();
    if ((abilities[ab] ?? 10) < Number(abMatch[2])) return false;
  }
  if (/Spellcasting|Pact Magic/i.test(feat.prerequisite ?? "") && !hasSpellcasting) return false;
  return true;
}

interface AsiPick {
  type: "asi" | "feat";
  asi_mode?: "plus2" | "plus1plus1";
  abilities?: Array<{ ab: string; amount: number }>;
  feat?: string;
  feat_ability_choice?: { ab: string; amount: number };
  feat_hp_bonus?: number;
  feat_init_prof?: boolean;
  feat_magic_initiate_note?: string;
}
interface ClassMeta {
  class_id?: string;
  saves?: string[];
  skills?: string[];
  feats?: string[];
  inventory_items?: string[];
  gold?: number;
  hp_added?: number;
  feature_count?: number;
  spell_slot_levels?: number[];
  asi_picks?: Record<number, AsiPick>;
}

type CharFields = {
  class?: string[];
  level?: number;
  subclass?: string;
  spellcasting_ability?: string;
  hit_points_max?: number;
  hit_points?: number;
  hit_dice?: number;
  proficiency_bonus?: number;
  feats?: string[];
  tool?: string[];
  languages?: string;
};

export default function ClassStep() {
  const { draft, updateDraft, setTable } = useCharacterDraft();
  const c = draft.characters as CharFields;
  const meta = (draft as { _meta?: { class?: ClassMeta } })._meta?.class ?? {};

  const selectedClassName = c.class?.[0] ?? "";
  const cls = ALL_CLASSES.find((x) => x.name === selectedClassName) ?? null;
  const level = c.level ?? 1;
  const subclass = cls?.subclasses.find((s) => s.name === (c.subclass ?? "")) ?? null;

  const conMod = useMemo(() => {
    const conScore = (draft.abilities as { constitution?: number }).constitution ?? 10;
    return Math.floor((conScore - 10) / 2);
  }, [draft.abilities]);

  const fsThresholdLevel = cls ? CLASSES_WITH_FS[cls.id] : undefined;
  const needsFS = !!(cls && fsThresholdLevel && level >= fsThresholdLevel);
  const currentFS = (c.feats ?? []).find((f) => ALL_FS.some((s) => s.name === f)) ?? "";

  const asiLevels = cls && cls.id === "fighter" ? [4, 6, 8, 12, 14, 16, 19] : [4, 8, 12, 16, 19];
  const asiLevelsReached = asiLevels.filter((l) => l <= level);

  // ── Apply / undo (class-level)
  function undoMeta(m: ClassMeta) {
    if (m.saves?.length) {
      const next: Record<string, unknown> = { ...draft.abilities };
      for (const ab of m.saves) next[`${abilityKey(ab)}_proficiency`] = false;
      setTable("abilities", next);
    }
    if (m.skills?.length) {
      const next: Record<string, unknown> = { ...draft.skills };
      for (const sk of m.skills) next[`${sk}_proficiency`] = false;
      setTable("skills", next);
    }
    if (m.feats?.length) {
      const cur = c.feats ?? [];
      const removed = new Set(m.feats);
      updateDraft("characters", { feats: cur.filter((f) => !removed.has(f)) });
    }
    if (m.inventory_items?.length) {
      const cur = draft.inventory as Array<{ name?: string; source?: string }>;
      const removed = new Set(m.inventory_items);
      setTable(
        "inventory",
        cur.filter((it) => !(it.source === "class" && it.name && removed.has(it.name))),
      );
    }
    if (m.gold) {
      const cur = (draft.currency as { gp?: number }).gp ?? 0;
      updateDraft("currency", { gp: Number(cur) - m.gold });
    }
    if (m.hp_added) {
      const curHpMax = c.hit_points_max ?? 0;
      const curHp = c.hit_points ?? 0;
      updateDraft("characters", {
        hit_points_max: curHpMax - m.hp_added,
        hit_points: curHp - m.hp_added,
      });
    }
    setTable(
      "features_traits",
      (draft.features_traits as Array<{ source?: string }>).filter((t) => t.source !== "class"),
    );
    setTable(
      "spells",
      (draft.spells as Array<{ source?: string }>).filter((s) => s.source !== "class"),
    );
    if (m.spell_slot_levels?.length) {
      const cur = { ...draft.spell_slots } as Record<string, unknown>;
      for (const lv of m.spell_slot_levels) {
        cur[`level_${lv}`] = 0;
        cur[`level_${lv}_total`] = 0;
      }
      setTable("spell_slots", cur);
    }
    // Note: ASI picks are NOT undone here — they live in their own meta slice
    // and survive class re-applications. They get pruned by sweepStaleAsiPicks().
  }

  function setMeta(next: ClassMeta) {
    const draftAny = draft as { _meta?: Record<string, unknown> };
    const merged = { ...(draftAny._meta ?? {}), class: next };
    updateDraft("_meta" as never, merged as never);
  }

  function applyClass(args: {
    cls: ClassDef;
    level: number;
    subclass: Subclass | null;
    chosenSkills: string[];
    equipLabel: string;
    fsName: string;
  }) {
    const { cls, level, subclass, chosenSkills, equipLabel, fsName } = args;
    if (Object.keys(meta).length) undoMeta(meta);

    const newMeta: ClassMeta = {
      class_id: cls.id,
      saves: [],
      skills: [],
      feats: [],
      inventory_items: [],
      gold: 0,
      hp_added: 0,
      feature_count: 0,
      spell_slot_levels: [],
      asi_picks: meta.asi_picks ?? {}, // preserve existing ASI picks
    };

    // Saves
    const savesPatch: Record<string, unknown> = { ...draft.abilities };
    for (const ab of cls.saving_throws) {
      savesPatch[`${abilityKey(ab)}_proficiency`] = true;
      newMeta.saves.push(ab);
    }
    setTable("abilities", savesPatch);

    // Skills
    const skillsPatch: Record<string, unknown> = { ...draft.skills };
    for (const sk of chosenSkills) {
      const k = skillKey(sk);
      skillsPatch[`${k}_proficiency`] = true;
      newMeta.skills.push(k);
    }
    setTable("skills", skillsPatch);

    // Top-level character columns
    const updates: Partial<CharFields> = {
      class: [cls.name],
      level,
      hit_dice: level,
      proficiency_bonus: profBonus(level),
      subclass: subclass?.name ?? undefined,
    };
    const avgPerLevel = Math.floor(cls.hit_die / 2) + 1;
    const hpMax = cls.hit_die + (level - 1) * avgPerLevel + level * conMod;
    updates.hit_points_max = Math.max(1, hpMax);
    updates.hit_points = updates.hit_points_max;
    newMeta.hp_added = updates.hit_points_max ?? 0;
    if (cls.spellcasting?.ability) updates.spellcasting_ability = cls.spellcasting.ability;
    updateDraft("characters", updates);

    // Fighting Style → feats[]
    if (fsName) {
      const curFeats = c.feats ?? [];
      if (!curFeats.includes(fsName)) {
        updateDraft("characters", { feats: [...curFeats, fsName] });
        newMeta.feats.push(fsName);
      }
    }

    // Features
    const features: Array<{ name: string; description: string; source: string }> = [];
    for (const f of cls.features) {
      if (f.level <= level) {
        features.push({
          name: `Level ${f.level}: ${f.name}`,
          description: f.description,
          source: "class",
        });
      }
    }
    if (subclass) {
      for (const f of subclass.features) {
        if (f.level <= level) {
          features.push({
            name: `${subclass.name} — Level ${f.level}: ${f.name}`,
            description: f.description,
            source: "class",
          });
        }
      }
    }
    newMeta.feature_count = features.length;
    setTable("features_traits", [
      ...(draft.features_traits as Array<{ source?: string }>).filter((t) => t.source !== "class"),
      ...features,
    ]);

    // Spell slots (regular casters)
    if (cls.spellcasting && !cls.spellcasting.pact_magic) {
      const slotsByLv = cls.spellcasting.spell_slots_by_level;
      if (slotsByLv) {
        const slotRow = slotsByLv[String(level)];
        if (slotRow) {
          const ss: Record<string, unknown> = { ...draft.spell_slots };
          for (let i = 0; i < slotRow.length; i++) {
            const total = slotRow[i];
            const lvKey = `level_${i + 1}`;
            ss[lvKey] = total;
            ss[`${lvKey}_total`] = total;
            if (total > 0) newMeta.spell_slot_levels.push(i + 1);
          }
          setTable("spell_slots", ss);
        }
      }
    }
    if (cls.spellcasting?.pact_magic && cls.spellcasting.pact_slots_by_level) {
      const pact = cls.spellcasting.pact_slots_by_level[String(level)];
      if (pact) {
        const ss: Record<string, unknown> = { ...draft.spell_slots };
        const k = `level_${pact.slot_level}`;
        ss[k] = pact.slots;
        ss[`${k}_total`] = pact.slots;
        newMeta.spell_slot_levels.push(pact.slot_level);
        setTable("spell_slots", ss);
      }
    }

    // Starting equipment
    const opt = cls.starting_equipment.find((e) => e.label === equipLabel);
    if (opt) {
      const additions = opt.items.map((name) => ({
        name,
        quantity: 1,
        equipped: false,
        source: "class",
      }));
      setTable("inventory", [...draft.inventory, ...additions]);
      const curGp = (draft.currency as { gp?: number }).gp ?? 0;
      updateDraft("currency", { gp: Number(curGp) + opt.gold });
      newMeta.inventory_items = opt.items.slice();
      newMeta.gold = opt.gold;
    }

    setMeta(newMeta);

    // Prune any ASI picks above new level
    sweepStaleAsiPicks(level, newMeta);
  }

  // ── ASI pick handlers
  function applyAsiPick(lv: number, pick: AsiPick) {
    const prior = meta.asi_picks?.[lv];

    // Build one combined ability patch: undo prior, then apply new
    const abPatch: Record<string, unknown> = { ...draft.abilities };
    const bump = (ab: string, delta: number, cap = 20) => {
      const k = abilityKey(ab);
      const cur = (abPatch[k] as number) ?? 10;
      abPatch[k] = Math.max(1, Math.min(cap, cur + delta));
    };

    if (prior) {
      for (const d of prior.abilities ?? []) bump(d.ab, -d.amount, 30);
      if (prior.feat_ability_choice) {
        bump(prior.feat_ability_choice.ab, -prior.feat_ability_choice.amount, 30);
        if (prior.feat === "Resilient") {
          abPatch[`${abilityKey(prior.feat_ability_choice.ab)}_proficiency`] = false;
        }
      }
    }

    for (const d of pick.abilities ?? []) bump(d.ab, d.amount, 20);
    if (pick.feat_ability_choice) {
      const isBoon =
        pick.feat === "Boon of Combat Prowess" || pick.feat === "Boon of Energy Resistance";
      bump(pick.feat_ability_choice.ab, pick.feat_ability_choice.amount, isBoon ? 30 : 20);
      if (pick.feat === "Resilient") {
        abPatch[`${abilityKey(pick.feat_ability_choice.ab)}_proficiency`] = true;
      }
    }

    setTable("abilities", abPatch);

    // Feats[]: strip prior feat name, add new feat name
    const curFeats = c.feats ?? [];
    let nextFeats = curFeats;
    if (prior?.feat) nextFeats = nextFeats.filter((f) => f !== prior.feat);
    if (pick.type === "feat" && pick.feat && !nextFeats.includes(pick.feat)) {
      nextFeats = [...nextFeats, pick.feat];
    }
    if (nextFeats !== curFeats) updateDraft("characters", { feats: nextFeats });

    // HP delta from feats like Tough (= bonus * char level)
    const priorHp = (prior?.feat_hp_bonus ?? 0) * (c.level ?? 1);
    const newHp = (pick.feat_hp_bonus ?? 0) * (c.level ?? 1);
    const hpDelta = newHp - priorHp;
    if (hpDelta !== 0) {
      const curMax = c.hit_points_max ?? 0;
      const curHp = c.hit_points ?? 0;
      updateDraft("characters", {
        hit_points_max: curMax + hpDelta,
        hit_points: curHp + hpDelta,
      });
    }

    // Persist meta
    const nextPicks = { ...(meta.asi_picks ?? {}), [lv]: pick };
    setMeta({ ...meta, asi_picks: nextPicks });
  }

  function undoAsiPick(lv: number, prior: AsiPick, persist = true) {
    const abPatch: Record<string, unknown> = { ...draft.abilities };
    const bump = (ab: string, delta: number) => {
      const k = abilityKey(ab);
      abPatch[k] = ((abPatch[k] as number) ?? 10) + delta;
    };
    for (const d of prior.abilities ?? []) bump(d.ab, -d.amount);
    if (prior.feat_ability_choice) {
      bump(prior.feat_ability_choice.ab, -prior.feat_ability_choice.amount);
      if (prior.feat === "Resilient") {
        abPatch[`${abilityKey(prior.feat_ability_choice.ab)}_proficiency`] = false;
      }
    }
    setTable("abilities", abPatch);

    if (prior.feat) {
      const cur = c.feats ?? [];
      updateDraft("characters", { feats: cur.filter((f) => f !== prior.feat) });
    }
    if (prior.feat_hp_bonus) {
      const curMax = c.hit_points_max ?? 0;
      const curHp = c.hit_points ?? 0;
      const sub = prior.feat_hp_bonus * (c.level ?? 1);
      updateDraft("characters", { hit_points_max: curMax - sub, hit_points: curHp - sub });
    }

    if (persist) {
      const nextPicks = { ...(meta.asi_picks ?? {}) };
      delete nextPicks[lv];
      setMeta({ ...meta, asi_picks: nextPicks });
    }
  }

  function clearAsiPick(lv: number) {
    const prior = meta.asi_picks?.[lv];
    if (!prior) return;
    undoAsiPick(lv, prior);
  }

  function sweepStaleAsiPicks(newLevel: number, mref: ClassMeta) {
    const picks = mref.asi_picks ?? {};
    let dirty = false;
    const next: Record<number, AsiPick> = {};
    for (const k of Object.keys(picks)) {
      const lv = Number(k);
      if (lv <= newLevel) next[lv] = picks[lv];
      else {
        undoAsiPick(lv, picks[lv], /*persist=*/ false);
        dirty = true;
      }
    }
    if (dirty) setMeta({ ...mref, asi_picks: next });
  }

  // ── Class-level handlers
  function handleClassChange(name: string) {
    const newCls = ALL_CLASSES.find((x) => x.name === name);
    if (Object.keys(meta).length) undoMeta(meta);
    if (!newCls) {
      updateDraft("characters", { class: undefined, level: undefined, subclass: undefined });
      setMeta({});
      return;
    }
    applyClass({
      cls: newCls,
      level: 1,
      subclass: null,
      chosenSkills: [],
      equipLabel: "",
      fsName: "",
    });
  }
  function handleLevelChange(lv: number) {
    if (!cls) return;
    const safeLv = Math.max(1, Math.min(20, lv));
    applyClass({
      cls,
      level: safeLv,
      subclass: safeLv >= cls.subclass_level ? subclass : null,
      chosenSkills:
        meta.skills?.map((k) => k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())) ??
        [],
      equipLabel: equipLabelFromMeta(),
      fsName: currentFS,
    });
  }
  function handleSubclassChange(name: string) {
    if (!cls) return;
    const sub = cls.subclasses.find((s) => s.name === name) ?? null;
    applyClass({
      cls,
      level,
      subclass: sub,
      chosenSkills: skillsFromMeta(),
      equipLabel: equipLabelFromMeta(),
      fsName: currentFS,
    });
  }
  function toggleSkill(name: string) {
    if (!cls) return;
    const current = skillsFromMeta();
    const has = current.includes(name);
    let next: string[];
    if (has) next = current.filter((s) => s !== name);
    else if (current.length >= cls.skill_choice_count) return;
    else next = [...current, name];
    applyClass({
      cls,
      level,
      subclass,
      chosenSkills: next,
      equipLabel: equipLabelFromMeta(),
      fsName: currentFS,
    });
  }
  function handleEquipChange(label: string) {
    if (!cls) return;
    applyClass({
      cls,
      level,
      subclass,
      chosenSkills: skillsFromMeta(),
      equipLabel: label,
      fsName: currentFS,
    });
  }
  function handleFightingStyleChange(name: string) {
    if (!cls) return;
    applyClass({
      cls,
      level,
      subclass,
      chosenSkills: skillsFromMeta(),
      equipLabel: equipLabelFromMeta(),
      fsName: name,
    });
  }
  function skillsFromMeta(): string[] {
    return (meta.skills ?? []).map((k) =>
      k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    );
  }
  function equipLabelFromMeta(): string {
    if (!meta.inventory_items?.length && !meta.gold) return "";
    return (
      cls?.starting_equipment.find(
        (opt) =>
          opt.gold === (meta.gold ?? 0) && opt.items.length === (meta.inventory_items?.length ?? 0),
      )?.label ?? ""
    );
  }

  const chosenSkillsLive = skillsFromMeta();
  const equipChosen = equipLabelFromMeta();

  // Origin feat detection (sourced from background)
  const originNames = new Set(ALL_FEATS.filter((f) => f.category === "Origin").map((f) => f.name));
  const originFeat = (c.feats ?? []).find((f) => originNames.has(f));

  return (
    <section className="wizard-step">
      <h2>Class</h2>

      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Pick class and level</h3>
        <div className="class-row">
          <div className="wizard-step__field">
            <label
              className="wizard-step__field-label wizard-step__field-label--required"
              htmlFor="cls-select"
            >
              Class
            </label>
            <select
              id="cls-select"
              className="wizard-step__select"
              value={selectedClassName}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              <option value="">Select…</option>
              {ALL_CLASSES.map((x) => (
                <option key={x.id} value={x.name}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="wizard-step__field">
            <label
              className="wizard-step__field-label wizard-step__field-label--required"
              htmlFor="cls-level"
            >
              Level
            </label>
            <input
              id="cls-level"
              className="wizard-step__input"
              type="number"
              min={1}
              max={20}
              value={cls ? level : ""}
              disabled={!cls}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
            />
          </div>
        </div>

        {cls && cls.subclasses.length > 0 && (
          <div className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor="cls-sub">
              {cls.name} subclass
              {level < cls.subclass_level && ` (unlocks at level ${cls.subclass_level})`}
            </label>
            <select
              id="cls-sub"
              className="wizard-step__select"
              value={c.subclass ?? ""}
              disabled={level < cls.subclass_level}
              onChange={(e) => handleSubclassChange(e.target.value)}
            >
              <option value="">Select…</option>
              {cls.subclasses.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {cls && (
        <>
          <div className="wizard-step__section">
            <h3 className="wizard-step__section-title">Grants</h3>
            <div className="class-summary">
              <span className="class-summary__label">Hit Die</span>
              <span className="class-summary__value">
                d{cls.hit_die} (HP max set to {c.hit_points_max ?? 0})
              </span>
              <span className="class-summary__label">Saves</span>
              <span className="class-summary__value">{cls.saving_throws.join(", ")}</span>
              <span className="class-summary__label">Prof Bonus</span>
              <span className="class-summary__value">+{profBonus(level)}</span>
              {cls.spellcasting && (
                <>
                  <span className="class-summary__label">Spellcasting</span>
                  <span className="class-summary__value">
                    {cls.spellcasting.ability} (
                    {cls.spellcasting.pact_magic ? "Pact Magic" : "spell slots auto-set"})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Origin feat (display-only, from background) */}
          {originFeat && (
            <div className="wizard-step__section">
              <h3 className="wizard-step__section-title">Origin Feat (from background)</h3>
              <div className="class-summary">
                <span className="class-summary__label">Feat</span>
                <span className="class-summary__value">{originFeat}</span>
              </div>
            </div>
          )}

          {/* Skill picker */}
          <div className="wizard-step__section">
            <h3 className="wizard-step__section-title">
              Skill proficiencies (choose {cls.skill_choice_count} — picked{" "}
              {chosenSkillsLive.length}/{cls.skill_choice_count})
            </h3>
            <div className="class-skill-list">
              {cls.skill_choices.map((sk) => {
                const checked = chosenSkillsLive.includes(sk);
                const disabled = !checked && chosenSkillsLive.length >= cls.skill_choice_count;
                return (
                  <label key={sk} className={disabled ? "disabled" : ""}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSkill(sk)}
                    />
                    {sk}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Fighting Style */}
          {needsFS && (
            <div className="wizard-step__section">
              <h3 className="wizard-step__section-title">Fighting Style</h3>
              <select
                className="wizard-step__select"
                value={currentFS}
                onChange={(e) => handleFightingStyleChange(e.target.value)}
              >
                <option value="">Select…</option>
                {ALL_FS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              {currentFS && (
                <p style={{ marginTop: 8, fontSize: "0.88rem", color: "#ccc" }}>
                  {ALL_FS.find((s) => s.name === currentFS)?.description}
                </p>
              )}
            </div>
          )}

          {/* Equipment */}
          <div className="wizard-step__section">
            <h3 className="wizard-step__section-title">Starting equipment</h3>
            <div className="bg-equip-options">
              {cls.starting_equipment.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  className={`bg-equip-card ${equipChosen === opt.label ? "bg-equip-card--selected" : ""}`}
                  onClick={() => handleEquipChange(opt.label)}
                >
                  <div className="bg-equip-card__title">Option {opt.label}</div>
                  {opt.items.length > 0 && (
                    <ul className="bg-equip-card__items">
                      {opt.items.map((it, i) => (
                        <li key={i}>• {it}</li>
                      ))}
                    </ul>
                  )}
                  <div className="bg-equip-card__gold">{opt.gold} GP</div>
                </button>
              ))}
            </div>
          </div>

          {/* ASI / Feat picker — one panel per ASI level reached */}
          {asiLevelsReached.length > 0 && (
            <div className="wizard-step__section">
              <h3 className="wizard-step__section-title">Ability Score Improvements / Feats</h3>
              {asiLevelsReached.map((asiLv) => {
                const pick = meta.asi_picks?.[asiLv];
                const isEpic = asiLv >= 19;
                const abilities = draft.abilities as Record<string, number>;
                // Don't filter out this panel's own current pick — let it stay selectable
                const takenByOthers = (c.feats ?? []).filter((n) => n !== pick?.feat);
                const eligible = ALL_FEATS.filter((f) =>
                  featIsEligible(f, level, abilities, takenByOthers, isEpic, !!cls.spellcasting),
                );
                return (
                  <AsiPanel
                    key={asiLv}
                    level={asiLv}
                    pick={pick}
                    eligibleFeats={eligible}
                    onPick={(p) => applyAsiPick(asiLv, p)}
                    onClear={() => clearAsiPick(asiLv)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASI picker sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AsiPanel(props: {
  level: number;
  pick: AsiPick | undefined;
  eligibleFeats: FeatDef[];
  onPick: (p: AsiPick) => void;
  onClear: () => void;
}) {
  const { level, pick, eligibleFeats, onPick, onClear } = props;
  const mode = pick?.type ?? "";

  const setType = (t: "asi" | "feat") => {
    if (t === "asi") {
      onPick({
        type: "asi",
        asi_mode: "plus2",
        abilities: [{ ab: "strength", amount: 2 }],
      });
    } else {
      onPick({ type: "feat" });
    }
  };

  return (
    <div className="asi-panel">
      <div className="asi-panel__header">Level {level}</div>
      <div className="asi-panel__row">
        <label>
          <input
            type="radio"
            name={`asi-${level}`}
            checked={mode === "asi"}
            onChange={() => setType("asi")}
          />{" "}
          Ability Score Improvement
        </label>
        <label>
          <input
            type="radio"
            name={`asi-${level}`}
            checked={mode === "feat"}
            onChange={() => setType("feat")}
          />{" "}
          Take a Feat
        </label>
        {pick && (
          <button type="button" className="asi-panel__clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {mode === "asi" && pick && <AsiBranch pick={pick} onChange={onPick} />}
      {mode === "feat" && pick && (
        <FeatBranch pick={pick} feats={eligibleFeats} onChange={onPick} />
      )}
    </div>
  );
}

function AsiBranch({ pick, onChange }: { pick: AsiPick; onChange: (p: AsiPick) => void }) {
  const mode = pick.asi_mode ?? "plus2";
  const abs = pick.abilities ?? [];

  return (
    <div className="asi-panel__body">
      <div className="asi-panel__row">
        <label>
          <input
            type="radio"
            checked={mode === "plus2"}
            onChange={() =>
              onChange({
                ...pick,
                asi_mode: "plus2",
                abilities: [{ ab: abs[0]?.ab ?? "strength", amount: 2 }],
              })
            }
          />{" "}
          +2 to one
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "plus1plus1"}
            onChange={() =>
              onChange({
                ...pick,
                asi_mode: "plus1plus1",
                abilities: [
                  { ab: abs[0]?.ab ?? "strength", amount: 1 },
                  { ab: abs[1]?.ab ?? "dexterity", amount: 1 },
                ],
              })
            }
          />{" "}
          +1 to two
        </label>
      </div>
      {mode === "plus2" ? (
        <select
          value={abs[0]?.ab ?? "strength"}
          onChange={(e) => onChange({ ...pick, abilities: [{ ab: e.target.value, amount: 2 }] })}
        >
          {ABILITIES_ALL.map((a) => (
            <option key={a} value={a}>
              {a.slice(0, 3).toUpperCase()}
            </option>
          ))}
        </select>
      ) : (
        <>
          <select
            value={abs[0]?.ab ?? "strength"}
            onChange={(e) =>
              onChange({
                ...pick,
                abilities: [
                  { ab: e.target.value, amount: 1 },
                  abs[1] ?? { ab: "dexterity", amount: 1 },
                ],
              })
            }
          >
            {ABILITIES_ALL.map((a) => (
              <option key={a} value={a}>
                {a.slice(0, 3).toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={abs[1]?.ab ?? "dexterity"}
            onChange={(e) =>
              onChange({
                ...pick,
                abilities: [
                  abs[0] ?? { ab: "strength", amount: 1 },
                  { ab: e.target.value, amount: 1 },
                ],
              })
            }
          >
            {ABILITIES_ALL.filter((a) => a !== (abs[0]?.ab ?? "strength")).map((a) => (
              <option key={a} value={a}>
                {a.slice(0, 3).toUpperCase()}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

function FeatBranch({
  pick,
  feats,
  onChange,
}: {
  pick: AsiPick;
  feats: FeatDef[];
  onChange: (p: AsiPick) => void;
}) {
  const chosen = feats.find((f) => f.name === pick.feat) ?? null;
  const abInc = chosen?.grants?.ability_increase;
  const isMagicInitiate = chosen?.name === "Magic Initiate";

  return (
    <div className="asi-panel__body asi-panel__body--stack">
      <div className="asi-panel__field">
        <label className="asi-panel__label">Feat</label>
        <select
          className="asi-panel__select"
          value={pick.feat ?? ""}
          onChange={(e) => {
            const f = feats.find((x) => x.name === e.target.value);
            const next: AsiPick = { type: "feat", feat: e.target.value || undefined };
            if (f?.grants?.ability_increase) {
              next.feat_ability_choice = {
                ab: f.grants.ability_increase.from[0],
                amount: f.grants.ability_increase.amount,
              };
            }
            if (f?.grants?.hp_bonus_per_level) next.feat_hp_bonus = f.grants.hp_bonus_per_level;
            if (f?.grants?.initiative_proficiency) next.feat_init_prof = true;
            onChange(next);
          }}
        >
          <option value="">{feats.length === 0 ? "No eligible feats" : "Select a feat…"}</option>
          {feats.map((f) => (
            <option key={f.id} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {chosen && <p className="asi-panel__desc">{chosen.summary}</p>}

      {abInc && abInc.from.length > 1 && (
        <div className="asi-panel__field">
          <label className="asi-panel__label">Ability score</label>
          <select
            className="asi-panel__select asi-panel__select--narrow"
            value={pick.feat_ability_choice?.ab ?? abInc.from[0]}
            onChange={(e) =>
              onChange({
                ...pick,
                feat_ability_choice: { ab: e.target.value, amount: abInc.amount },
              })
            }
          >
            {abInc.from.map((a) => (
              <option key={a} value={a}>
                {a.toUpperCase()} (+{abInc.amount})
              </option>
            ))}
          </select>
        </div>
      )}

      {isMagicInitiate && (
        <div className="asi-panel__field">
          <label className="asi-panel__label">Spells (free text for now)</label>
          <input
            type="text"
            className="asi-panel__input"
            placeholder="e.g. Light, Sacred Flame; Cure Wounds"
            value={pick.feat_magic_initiate_note ?? ""}
            onChange={(e) => onChange({ ...pick, feat_magic_initiate_note: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
