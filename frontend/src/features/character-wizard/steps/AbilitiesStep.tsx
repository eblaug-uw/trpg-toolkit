import { useCharacterDraft } from "../../../context/CharacterDraftContext";
import "../../../style/CharacterWizard.css";

type AbilityKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

const ABILITIES: { key: AbilityKey; label: string }[] = [
  { key: "strength", label: "Str" },
  { key: "dexterity", label: "Dex" },
  { key: "constitution", label: "Con" },
  { key: "intelligence", label: "Int" },
  { key: "wisdom", label: "Wis" },
  { key: "charisma", label: "Cha" },
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

function modifier(score: number | undefined): string {
  if (score === undefined || score === null || Number.isNaN(score)) return "—";
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export default function AbilitiesStep() {
  const { draft, updateDraft } = useCharacterDraft();
  const a = draft.abilities as Partial<Record<AbilityKey, number>>;

  function setScore(key: AbilityKey, value: string) {
    if (value === "") {
      updateDraft("abilities", { [key]: undefined });
      return;
    }
    const n = Math.max(1, Math.min(16, Number(value)));
    updateDraft("abilities", { [key]: n });
  }

  function applyStandardArray() {
    const patch: Partial<Record<AbilityKey, number>> = {};
    ABILITIES.forEach(({ key }, i) => {
      patch[key] = STANDARD_ARRAY[i];
    });
    updateDraft("abilities", patch);
  }

  return (
    <section className="wizard-step">
      <h2>Abilities</h2>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Set each ability score (1–16 at character creation).
      </p>

      <div className="wizard-step__section">
        <div className="abilities-grid">
          {ABILITIES.map(({ key, label }) => (
            <div key={key} className="ability-block">
              <div className="ability-block__label">{label}</div>
              <input
                className="ability-block__score"
                type="number"
                min={1}
                max={16}
                value={a[key] ?? ""}
                onChange={(e) => setScore(key, e.target.value)}
                aria-label={`${label} score`}
              />
              <div className="ability-block__modifier">{modifier(a[key])}</div>
            </div>
          ))}
        </div>

        <div className="abilities-prefill">
          <button type="button" className="abilities-prefill__button" onClick={applyStandardArray}>
            Use Standard Array (15, 14, 13, 12, 10, 8)
          </button>
          <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 8 }}>
            Fills Str→Cha in order. Edit any value to rearrange.
          </p>
        </div>
      </div>
    </section>
  );
}
