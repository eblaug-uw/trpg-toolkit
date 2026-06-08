import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCharacterDraft } from "../../../context/CharacterDraftContext";
import { WIZARD_STEPS, type WizardStepId } from "../wizardSchema";
import "../../../style/CharacterWizard.css";

function stepSlug(id: WizardStepId): string {
  return id.replace(/_/g, "-");
}

const ORIGIN_FEAT_NAMES = new Set([
  "Alert",
  "Healer",
  "Lucky",
  "Magic Initiate",
  "Tough",
  "Skilled",
]);

export default function ReviewStep() {
  const { draft, commitStep, loading, reset } = useCharacterDraft();
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const c = draft.characters;
  const ab = draft.abilities;
  const sk = draft.skills;
  const speed = (draft.speed as { walk?: number }) ?? {};
  const currency =
    (draft.currency as {
      cp?: number;
      sp?: number;
      ep?: number;
      gp?: number;
      pp?: number;
    }) ?? {};
  const inventory =
    (draft.inventory as Array<{ name?: string; quantity?: number; source?: string }>) ?? [];
  const features = (draft.features_traits as Array<{ name?: string; source?: string }>) ?? [];
  const spells = (draft.spells as Array<{ name?: string }>) ?? [];

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      for (const step of WIZARD_STEPS) {
        if (step.id === "review") continue;
        await commitStep(step.id);
      }
      navigate(`/campaigns/${campaignId}/encounters`);
      reset();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function goTo(stepId: WizardStepId) {
    navigate(`/campaigns/${campaignId}/characters/new/${stepSlug(stepId)}`);
  }

  const totalCp =
    (currency.cp ?? 0) +
    (currency.sp ?? 0) * 10 +
    (currency.ep ?? 0) * 50 +
    (currency.gp ?? 0) * 100 +
    (currency.pp ?? 0) * 1000;

  const abMod = (val?: number) => Math.floor(((val ?? 10) - 10) / 2);
  const abFmt = (val?: number) =>
    val === null ? "—" : `${val} (${abMod(val) >= 0 ? "+" : ""}${abMod(val)})`;

  const cls = (c.class as string[] | undefined)?.[0];
  const lvl = c.level as number | undefined;
  const subclass = c.subclass as string | undefined;
  const feats = (c.feats as string[] | undefined) ?? [];
  const tools = (c.tool as string[] | undefined) ?? [];
  const originFeat = feats.find((f) => ORIGIN_FEAT_NAMES.has(f));

  const skillProfs = Object.keys(sk)
    .filter((k) => k.endsWith("_proficiency") && sk[k])
    .map((k) => k.replace(/_proficiency$/, "").replace(/_/g, " "))
    .map((s) => s.replace(/\b\w/g, (l) => l.toUpperCase()));

  return (
    <section className="wizard-step">
      <h2>Review</h2>
      <p style={{ color: "#ccc" }}>Verify everything below, then save the character.</p>

      <ReviewCard title="Basic Info" onEdit={() => goTo("basic_info")}>
        <Row label="Name" value={(c.name as string) ?? "—"} />
        <Row label="Alignment" value={(c.alignment as string) ?? "—"} />
        <Row label="Player" value={(c.player_name as string) ?? "—"} />
      </ReviewCard>

      <ReviewCard title="Abilities" onEdit={() => goTo("abilities")}>
        <div className="review-ab-grid">
          {(
            ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const
          ).map((a) => (
            <div key={a} className="review-ab-cell">
              <div className="review-ab-cell__label">{a.slice(0, 3).toUpperCase()}</div>
              <div className="review-ab-cell__value">{abFmt(ab[a] as number | undefined)}</div>
              {ab[`${a}_proficiency`] ? (
                <div className="review-ab-cell__save">save prof</div>
              ) : null}
            </div>
          ))}
        </div>
      </ReviewCard>

      <ReviewCard title="Species" onEdit={() => goTo("species")}>
        <Row label="Species" value={(c.species as string) ?? "—"} />
        <Row label="Size" value={(c.size as string) ?? "—"} />
        <Row label="Speed" value={`${speed.walk ?? "—"} ft (walk)`} />
        <Row
          label="Traits"
          value={
            features
              .filter((f) => f.source === "species")
              .map((f) => f.name)
              .filter(Boolean)
              .join(", ") || "—"
          }
        />
      </ReviewCard>

      <ReviewCard title="Background" onEdit={() => goTo("background")}>
        <Row label="Background" value={(c.background as string) ?? "—"} />
        <Row label="Tools" value={tools.join(", ") || "—"} />
        <Row label="Origin feat" value={originFeat ?? "—"} />
      </ReviewCard>

      <ReviewCard title="Class" onEdit={() => goTo("class")}>
        <Row label="Class" value={cls ?? "—"} />
        <Row label="Level" value={lvl?.toString() ?? "—"} />
        <Row label="Subclass" value={subclass ?? "—"} />
        <Row label="HP" value={`${(c.hit_points_max as number | undefined) ?? "—"}`} />
        <Row label="Prof Bonus" value={`+${(c.proficiency_bonus as number | undefined) ?? "—"}`} />
        <Row label="Skills" value={skillProfs.join(", ") || "—"} />
        <Row label="Feats" value={feats.join(", ") || "—"} />
        {spells.length > 0 && <Row label="Spells" value={`${spells.length} known/prepared`} />}
      </ReviewCard>

      <ReviewCard title="Equipment" onEdit={() => goTo("equipment")}>
        <Row label="Items" value={`${inventory.length}`} />
        <Row label="Currency" value={`${(totalCp / 100).toFixed(2)} gp total`} />
      </ReviewCard>

      {saveError && (
        <div className="review-error">
          <strong>Save failed:</strong> {saveError}
        </div>
      )}

      <div className="review-actions">
        <button
          type="button"
          className="review-save"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving…" : "Save & Finish"}
        </button>
      </div>
    </section>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="review-card">
      <div className="review-card__head">
        <h3 className="review-card__title">{title}</h3>
        <button type="button" className="review-card__edit" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="review-card__body">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-row">
      <span className="review-row__label">{label}</span>
      <span className="review-row__value">{value}</span>
    </div>
  );
}
