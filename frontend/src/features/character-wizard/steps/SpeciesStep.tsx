import { useState } from "react";
import { useCharacterDraft } from "../../../context/CharacterDraftContext";
import speciesData from "../../../data/species_55.json";
import "../../../style/CharacterWizard.css";

interface SpeciesSpell {
  name: string;
  level: number;
  ability?: string;
}
interface SpeciesTrait {
  name: string;
  description: string;
}
interface Subspecies {
  name: string;
  traits: SpeciesTrait[];
  spells?: SpeciesSpell[];
  speed_override?: {
    walk?: number;
    fly?: number | null;
    swim?: number | null;
    climb?: number | null;
    burrow?: number | null;
  };
}
interface Species {
  id: string;
  name: string;
  size: string[];
  creature_type: string;
  creature_subtype?: string;
  speed: {
    walk: number | null;
    fly: number | null;
    swim: number | null;
    climb: number | null;
    burrow: number | null;
  };
  languages: string[];
  traits: SpeciesTrait[];
  spells: SpeciesSpell[];
  subspecies: Subspecies[];
  source: string;
}

const ALL_SPECIES = speciesData.species as Species[];

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return m ? m[0].trim() : text;
}

type CharFields = { species?: string; subspecies?: string; size?: string };

export default function SpeciesStep() {
  const { draft, updateDraft, setTable } = useCharacterDraft();
  const c = draft.characters as CharFields;
  const speed = draft.speed as {
    walk?: number;
    fly?: number | null;
    swim?: number | null;
    climb?: number | null;
    burrow?: number | null;
  };

  const species = ALL_SPECIES.find((s) => s.name === c.species) ?? null;
  const subspecies = species?.subspecies.find((sub) => sub.name === c.subspecies) ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function rebuildDerivedDraft(s: Species | null, sub: Subspecies | null) {
    // Strip existing species-sourced entries
    const otherTraits = (draft.features_traits as Array<{ source?: string }>).filter(
      (t) => t.source !== "species",
    );
    const otherSpells = (draft.spells as Array<{ source?: string }>).filter(
      (sp) => sp.source !== "species",
    );

    if (!s) {
      setTable("features_traits", otherTraits);
      setTable("spells", otherSpells);
      return;
    }

    const traits = [
      ...s.traits.map((t) => ({ name: t.name, source: "species", description: t.description })),
      ...(sub
        ? sub.traits.map((t) => ({
            name: `${sub.name}: ${t.name}`,
            source: "species",
            description: t.description,
          }))
        : []),
    ];
    const spells = [
      ...s.spells.map((sp) => ({
        name: sp.name,
        level: sp.level,
        prepared: false,
        school: null,
        notes: sp.ability ? `Spellcasting ability: ${sp.ability}` : null,
        source: "species",
      })),
      ...(sub?.spells ?? []).map((sp) => ({
        name: sp.name,
        level: sp.level,
        prepared: false,
        school: null,
        notes: sp.ability ? `Spellcasting ability: ${sp.ability}` : null,
        source: "species",
      })),
    ];
    setTable("features_traits", [...otherTraits, ...traits]);
    setTable("spells", [...otherSpells, ...spells]);
  }

  function applySpeed(s: Species, sub: Subspecies | null) {
    const merged = { ...s.speed, ...(sub?.speed_override ?? {}) };
    updateDraft("speed", merged);
  }

  function handleSpeciesChange(speciesName: string) {
    if (!speciesName) {
      updateDraft("characters", { species: undefined, subspecies: undefined, size: undefined });
      rebuildDerivedDraft(null, null);
      return;
    }
    const next = ALL_SPECIES.find((s) => s.name === speciesName);
    if (!next) return;

    const autoSize = next.size.length === 1 ? next.size[0] : undefined;

    updateDraft("characters", {
      species: next.name,
      subspecies: undefined,
      size: autoSize,
    });
    applySpeed(next, null);
    rebuildDerivedDraft(next, null);
    setExpanded(new Set());
  }

  function handleSubspeciesChange(name: string) {
    if (!species) return;
    const sub = species.subspecies.find((s) => s.name === name) ?? null;
    updateDraft("characters", { subspecies: sub?.name ?? undefined });
    applySpeed(species, sub);
    rebuildDerivedDraft(species, sub);
  }

  function handleSizeChange(size: string) {
    updateDraft("characters", { size: size || undefined });
  }

  function handleSpeedChange(key: keyof typeof speed, value: string) {
    const num = value === "" ? null : Number(value);
    updateDraft("speed", { [key]: num });
  }

  // ── Render ──────────────────────────────────────────
  const displayTraits = species
    ? [
        ...species.traits.map((t) => ({ ...t, _prefix: "" })),
        ...(subspecies
          ? subspecies.traits.map((t) => ({ ...t, _prefix: `${subspecies.name}: ` }))
          : []),
      ]
    : [];

  const displaySpells = species ? [...species.spells, ...(subspecies?.spells ?? [])] : [];

  return (
    <section className="wizard-step">
      <h2>Species</h2>

      {/* Pick species */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Choose your species</h3>
        <div className="wizard-step__field">
          <label
            className="wizard-step__field-label wizard-step__field-label--required"
            htmlFor="sp-species"
          >
            Species
          </label>
          <select
            id="sp-species"
            className="wizard-step__select"
            value={c.species ?? ""}
            onChange={(e) => handleSpeciesChange(e.target.value)}
          >
            <option value="">Select…</option>
            {ALL_SPECIES.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subspecies (conditional) */}
        {species && species.subspecies.length > 0 && (
          <div className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor="sp-subspecies">
              Lineage / Subspecies
            </label>
            <select
              id="sp-subspecies"
              className="wizard-step__select"
              value={c.subspecies ?? ""}
              onChange={(e) => handleSubspeciesChange(e.target.value)}
            >
              <option value="">Select…</option>
              {species.subspecies.map((sub) => (
                <option key={sub.name} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Size (conditional + required) */}
        {species && (
          <div className="wizard-step__field">
            <label
              className="wizard-step__field-label wizard-step__field-label--required"
              htmlFor="sp-size"
            >
              Size
            </label>
            {species.size.length === 1 ? (
              <input id="sp-size" className="wizard-step__input" value={species.size[0]} readOnly />
            ) : (
              <select
                id="sp-size"
                className="wizard-step__select"
                value={c.size ?? ""}
                onChange={(e) => handleSizeChange(e.target.value)}
              >
                <option value="">Select…</option>
                {species.size.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Speed */}
      {species && (
        <div className="wizard-step__section">
          <h3 className="wizard-step__section-title">Speed (ft)</h3>
          <div className="wizard-step__row">
            {(["walk", "fly", "swim", "climb", "burrow"] as const).map((k) => (
              <div key={k} className="wizard-step__field">
                <label className="wizard-step__field-label" htmlFor={`sp-speed-${k}`}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </label>
                <input
                  id={`sp-speed-${k}`}
                  className="wizard-step__input"
                  type="number"
                  min={0}
                  value={speed[k] ?? ""}
                  onChange={(e) => handleSpeedChange(k, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traits */}
      {species && (
        <div className="wizard-step__section">
          <h3 className="wizard-step__section-title">Traits</h3>
          {displayTraits.map((t) => {
            const key = `${t._prefix}${t.name}`;
            const first = firstSentence(t.description);
            const hasMore = first.length < t.description.length;
            const open = expanded.has(key);
            return (
              <div key={key} className="species-trait">
                <div className="species-trait__name">
                  {t._prefix}
                  {t.name}
                </div>
                <div className="species-trait__body">
                  {open || !hasMore ? t.description : first}
                  {hasMore && (
                    <button
                      type="button"
                      className="species-trait__toggle"
                      onClick={() => toggleExpand(key)}
                    >
                      {open ? "Read less" : "Read more"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Spells */}
      {species && displaySpells.length > 0 && (
        <div className="wizard-step__section">
          <h3 className="wizard-step__section-title">Granted spells</h3>
          {displaySpells.map((sp, i) => (
            <div key={`${sp.name}-${i}`} className="species-spell">
              <span className="species-spell__level">
                {sp.level === 0 ? "Cantrip" : `Level ${sp.level}`}
              </span>
              <strong>{sp.name}</strong>
              {sp.ability && (
                <span style={{ color: "#aaa" }}> — pick ability at use: {sp.ability}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
