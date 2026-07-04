import { useState, useMemo, useEffect, useRef } from "react";
import { useCharacterDraft } from "../../../context/CharacterDraftContext";
import backgroundData from "../../../data/backgrounds_55.json";
import "../../../style/CharacterWizard.css";

interface EquipOption {
  label: string;
  items: string[];
  gold: number;
}
interface Background {
  id: string;
  name: string;
  source: string;
  feat: string;
  ability_score_options: string[];
  skill_proficiencies: string[];
  tool_proficiency: string | null;
  language: string | null;
  equipment_options: EquipOption[];
  description: string;
}

const ALL_BGS = backgroundData.backgrounds;
const SOURCES = Array.from(new Set(ALL_BGS.map((b) => b.source))).sort();

// Lower + underscore = matches skills table column prefix
function skillKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}
function abilityKey(name: string): string {
  return name.toLowerCase();
}

type AsiMode = "" | "split" | "spread";
type Equip = "" | "A" | "B";

interface BgMeta {
  background_id?: string;
  asi_deltas?: Record<string, number>; // ability_key → delta applied
  feat?: string;
  tool?: string;
  skills?: string[]; // skill_keys
  inventory_items?: string[]; // names appended
  gold?: number; // gp added
}

export default function BackgroundStep() {
  const { draft, updateDraft, setTable } = useCharacterDraft();
  const charFields = draft.characters as { background?: string; feats?: string[]; tool?: string[] };
  const meta = (draft as { _meta?: { background?: BgMeta } })._meta?.background ?? {};

  // ── Filter / search state
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // ── Background pick + sub-choices
  const selectedBg = ALL_BGS.find((b) => b.name === charFields.background) ?? null;

  const [asiMode, setAsiMode] = useState<AsiMode>("");
  const [asi2, setAsi2] = useState<string>("");
  const [asi1, setAsi1] = useState<string>("");
  const [equip, setEquip] = useState<Equip>("");

  // Re-init ASI/equip pickers from _meta when background changes externally
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || !selectedBg) return;
    initRef.current = true;
    if (meta.asi_deltas) {
      const entries = Object.entries(meta.asi_deltas);
      if (entries.some(([, d]) => d === 2)) {
        setAsiMode("split");
        setAsi2(entries.find(([, d]) => d === 2)?.[0] ?? "");
        setAsi1(entries.find(([, d]) => d === 1)?.[0] ?? "");
      } else if (entries.length === 3) {
        setAsiMode("spread");
      }
    }
  }, [selectedBg, meta.asi_deltas]);

  // ── Filtered list
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ALL_BGS.filter((b) => {
      if (sourceFilter && b.source !== sourceFilter) return false;
      if (term && !b.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [sourceFilter, search]);

  // ── Apply / undo helpers
  function undoMeta(m: BgMeta) {
    // Subtract ASI
    if (m.asi_deltas) {
      const next: Record<string, unknown> = { ...draft.abilities };
      for (const [k, d] of Object.entries(m.asi_deltas)) {
        const cur = Number(next[k] ?? 0);
        next[k] = cur - d;
      }
      setTable("abilities", next);
    }
    // Strip feat from feats[]
    if (m.feat) {
      const cur = charFields.feats ?? [];
      updateDraft("characters", { feats: cur.filter((f) => f !== m.feat) });
    }
    // Strip tool
    if (m.tool) {
      const cur = charFields.tool ?? [];
      updateDraft("characters", { tool: cur.filter((t) => t !== m.tool) });
    }
    // Reset skill profs
    if (m.skills?.length) {
      const next = { ...draft.skills };
      for (const k of m.skills) next[`${k}_proficiency`] = false;
      setTable("skills", next as typeof draft.skills);
    }
    // Remove inventory items
    if (m.inventory_items?.length) {
      const cur = draft.inventory as Array<{ name?: string; source?: string }>;
      const removed = new Set(m.inventory_items);
      setTable(
        "inventory",
        cur.filter((it) => !(it.source === "background" && it.name && removed.has(it.name))),
      );
    }
    // Subtract gold
    if (m.gold) {
      const curCurrency = draft.currency as { gp?: number };
      updateDraft("currency", { gp: Number(curCurrency.gp ?? 0) - m.gold });
    }
  }

  function applyBackgroundBasics(bg: Background) {
    // Push feat onto feats[]
    const curFeats = charFields.feats ?? [];
    const newFeats = curFeats.includes(bg.feat) ? curFeats : [...curFeats, bg.feat];
    // Push tool
    const curTool = charFields.tool ?? [];
    const newTool =
      bg.tool_proficiency && !curTool.includes(bg.tool_proficiency)
        ? [...curTool, bg.tool_proficiency]
        : curTool;
    updateDraft("characters", {
      background: bg.name,
      feats: newFeats,
      tool: newTool,
    });
    // Set skill proficiencies
    const skillKeys = bg.skill_proficiencies.map(skillKey);
    const skillsPatch = { ...draft.skills };
    for (const k of skillKeys) skillsPatch[`${k}_proficiency`] = true;
    setTable("skills", skillsPatch as typeof draft.skills);
    // Record in meta
    setMeta({
      background_id: bg.id,
      feat: bg.feat,
      tool: bg.tool_proficiency ?? undefined,
      skills: skillKeys,
      asi_deltas: {},
      inventory_items: [],
      gold: 0,
    });
  }

  function setMeta(m: BgMeta) {
    const draftAny = draft as { _meta?: Record<string, unknown> };
    const nextMeta = { ...(draftAny._meta ?? {}), background: m };
    updateDraft("_meta" as never, nextMeta as never);
  }

  function patchMeta(patch: Partial<BgMeta>) {
    setMeta({ ...(meta ?? {}), ...patch });
  }

  function handleBackgroundChange(name: string) {
    // Undo previous
    if (Object.keys(meta).length) undoMeta(meta);
    setAsiMode("");
    setAsi2("");
    setAsi1("");
    setEquip("");

    if (!name) {
      updateDraft("characters", { background: undefined });
      setMeta({});
      return;
    }
    const bg = ALL_BGS.find((b) => b.name === name);
    if (!bg) return;
    applyBackgroundBasics(bg);
  }

  function applyAsi(mode: AsiMode, two: string, one: string) {
    if (!selectedBg) return;
    // Undo previous ASI deltas
    if (meta.asi_deltas) {
      const undo: BgMeta = { asi_deltas: meta.asi_deltas };
      undoMeta(undo);
    }
    const newDeltas: Record<string, number> = {};
    if (mode === "split" && two && one && two !== one) {
      newDeltas[abilityKey(two)] = 2;
      newDeltas[abilityKey(one)] = 1;
    } else if (mode === "spread") {
      for (const ab of selectedBg.ability_score_options) newDeltas[abilityKey(ab)] = 1;
    }
    // Apply new
    if (Object.keys(newDeltas).length) {
      const next: Record<string, unknown> = { ...draft.abilities };
      for (const [k, d] of Object.entries(newDeltas)) {
        const cur = Number(next[k] ?? 0);
        next[k] = cur + d;
      }
      setTable("abilities", next);
    }
    patchMeta({ asi_deltas: newDeltas });
  }

  function handleAsiMode(mode: AsiMode) {
    setAsiMode(mode);
    if (mode === "spread") {
      setAsi2("");
      setAsi1("");
      applyAsi("spread", "", "");
    } else if (mode === "split" && asi2 && asi1 && asi2 !== asi1) {
      applyAsi("split", asi2, asi1);
    } else if (mode === "") {
      applyAsi("", "", "");
    }
  }

  function handleAsi2(stat: string) {
    setAsi2(stat);
    if (asiMode === "split" && stat && asi1 && stat !== asi1) {
      applyAsi("split", stat, asi1);
    }
  }
  function handleAsi1(stat: string) {
    setAsi1(stat);
    if (asiMode === "split" && asi2 && stat && asi2 !== stat) {
      applyAsi("split", asi2, stat);
    }
  }

  function handleEquip(choice: Equip) {
    if (!selectedBg) return;
    // Undo previous equipment
    if (meta.inventory_items?.length || meta.gold) {
      undoMeta({ inventory_items: meta.inventory_items, gold: meta.gold });
    }
    setEquip(choice);
    if (!choice) {
      patchMeta({ inventory_items: [], gold: 0 });
      return;
    }
    const opt = selectedBg.equipment_options.find((o) => o.label === choice);
    if (!opt) return;
    // Push items into inventory with source='background'
    const additions = opt.items.map((name) => ({
      name,
      quantity: 1,
      equipped: false,
      source: "background",
    }));
    setTable("inventory", [...draft.inventory, ...additions]);
    // Add gold
    const cur = (draft.currency as { gp?: number }).gp ?? 0;
    updateDraft("currency", { gp: Number(cur) + opt.gold });
    patchMeta({ inventory_items: opt.items, gold: opt.gold });
  }

  // ── Render
  return (
    <section className="wizard-step">
      <h2>Background</h2>

      {/* Filters */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Choose your background</h3>
        <div className="bg-filters">
          <select
            className="wizard-step__select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="wizard-step__input"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="wizard-step__field">
          <label
            className="wizard-step__field-label wizard-step__field-label--required"
            htmlFor="bg-select"
          >
            Background
          </label>
          <select
            id="bg-select"
            className="wizard-step__select"
            value={charFields.background ?? ""}
            onChange={(e) => handleBackgroundChange(e.target.value)}
          >
            <option value="">Select…</option>
            {visible.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name} — {b.source}
              </option>
            ))}
          </select>
          {visible.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: "#888", marginTop: 4 }}>
              No backgrounds match filters.
            </p>
          )}
        </div>
      </div>

      {/* Summary + sub-choices */}
      {selectedBg && (
        <>
          <div className="wizard-step__section">
            <h3 className="wizard-step__section-title">Grants</h3>
            <div className="bg-summary">
              <span className="bg-summary__label">Skills</span>
              <span className="bg-summary__value">{selectedBg.skill_proficiencies.join(", ")}</span>
              <span className="bg-summary__label">Tool</span>
              <span className="bg-summary__value">{selectedBg.tool_proficiency ?? "—"}</span>
              <span className="bg-summary__label">Feat</span>
              <span className="bg-summary__value">{selectedBg.feat}</span>
              <span className="bg-summary__label">Description</span>
              <span className="bg-summary__value">{selectedBg.description}</span>
            </div>
          </div>

          {/* ASI */}
          <div className="wizard-step__section">
            <h3 className="wizard-step__section-title">
              Ability Score Increase ({selectedBg.ability_score_options.join(", ")})
            </h3>
            <div className="wizard-step__field">
              <label className="wizard-step__field-label">Distribution</label>
              <div className="bg-asi-pick">
                <label>
                  <input
                    type="radio"
                    checked={asiMode === "split"}
                    onChange={() => handleAsiMode("split")}
                  />{" "}
                  +2 / +1 (different abilities)
                </label>
                <label>
                  <input
                    type="radio"
                    checked={asiMode === "spread"}
                    onChange={() => handleAsiMode("spread")}
                  />{" "}
                  +1 to all three
                </label>
              </div>
            </div>

            {asiMode === "split" && (
              <div className="bg-asi-pick">
                <div className="wizard-step__field">
                  <label className="wizard-step__field-label">+2 to</label>
                  <select
                    className="wizard-step__select"
                    value={asi2}
                    onChange={(e) => handleAsi2(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {selectedBg.ability_score_options.map((ab) => (
                      <option key={ab} value={ab} disabled={ab === asi1}>
                        {ab}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="wizard-step__field">
                  <label className="wizard-step__field-label">+1 to</label>
                  <select
                    className="wizard-step__select"
                    value={asi1}
                    onChange={(e) => handleAsi1(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {selectedBg.ability_score_options.map((ab) => (
                      <option key={ab} value={ab} disabled={ab === asi2}>
                        {ab}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Equipment */}
          <div className="wizard-step__section">
            <h3 className="wizard-step__section-title">Starting equipment</h3>
            <div className="bg-equip-options">
              {selectedBg.equipment_options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  className={`bg-equip-card ${equip === opt.label ? "bg-equip-card--selected" : ""}`}
                  onClick={() => handleEquip(opt.label as Equip)}
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
        </>
      )}
    </section>
  );
}
