import { useCharacterDraft } from "../../../context/CharacterDraftContext";
import "../../../style/CharacterWizard.css";

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
  "Unaligned",
] as const;

type CharacterFields = {
  name?: string;
  player_name?: string;
  alignment?: string;
};
type PersonalityFields = {
  traits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
};
type AppearanceFields = {
  age?: number | string;
  height?: string;
  weight?: string;
  eyes?: string;
  skin?: string;
  hair?: string;
};

export default function BasicInfoStep() {
  const { draft, updateDraft } = useCharacterDraft();
  const c = draft.characters as CharacterFields;
  const p = draft.personality as PersonalityFields;
  const a = draft.appearance as AppearanceFields;

  return (
    <section className="wizard-step">
      <h2>Basic Info</h2>

      {/* Identity */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Identity</h3>

        <div className="wizard-step__field">
          <label
            className="wizard-step__field-label wizard-step__field-label--required"
            htmlFor="bi-name"
          >
            Character name
          </label>
          <input
            id="bi-name"
            className="wizard-step__input"
            value={c.name ?? ""}
            onChange={(e) => updateDraft("characters", { name: e.target.value })}
          />
        </div>

        <div className="wizard-step__row">
          <div className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor="bi-player">
              Player name
            </label>
            <input
              id="bi-player"
              className="wizard-step__input"
              value={c.player_name ?? ""}
              onChange={(e) => updateDraft("characters", { player_name: e.target.value })}
            />
          </div>

          <div className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor="bi-alignment">
              Alignment
            </label>
            <select
              id="bi-alignment"
              className="wizard-step__select"
              value={c.alignment ?? ""}
              onChange={(e) => updateDraft("characters", { alignment: e.target.value })}
            >
              <option value="">Select…</option>
              {ALIGNMENTS.map((al) => (
                <option key={al} value={al}>
                  {al}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Personality */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Personality</h3>

        {(
          [
            ["traits", "Personality traits"],
            ["ideals", "Ideals"],
            ["bonds", "Bonds"],
            ["flaws", "Flaws"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor={`bi-${key}`}>
              {label}
            </label>
            <textarea
              id={`bi-${key}`}
              className="wizard-step__textarea"
              value={p[key] ?? ""}
              onChange={(e) => updateDraft("personality", { [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {/* Appearance */}
      <div className="wizard-step__section">
        <h3 className="wizard-step__section-title">Appearance</h3>

        <div className="wizard-step__row">
          <div className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor="bi-age">
              Age
            </label>
            <input
              id="bi-age"
              className="wizard-step__input"
              type="number"
              min={0}
              value={a.age ?? ""}
              onChange={(e) =>
                updateDraft("appearance", {
                  age: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor="bi-height">
              Height
            </label>
            <input
              id="bi-height"
              className="wizard-step__input"
              placeholder='5\"8'
              value={a.height ?? ""}
              onChange={(e) => updateDraft("appearance", { height: e.target.value })}
            />
          </div>
          <div className="wizard-step__field">
            <label className="wizard-step__field-label" htmlFor="bi-weight">
              Weight
            </label>
            <input
              id="bi-weight"
              className="wizard-step__input"
              placeholder="150 lb"
              value={a.weight ?? ""}
              onChange={(e) => updateDraft("appearance", { weight: e.target.value })}
            />
          </div>
        </div>

        <div className="wizard-step__row">
          {(["eyes", "skin", "hair"] as const).map((key) => (
            <div key={key} className="wizard-step__field">
              <label className="wizard-step__field-label" htmlFor={`bi-${key}`}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              <input
                id={`bi-${key}`}
                className="wizard-step__input"
                value={a[key] ?? ""}
                onChange={(e) => updateDraft("appearance", { [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
