import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCharacterDraft } from "../../context/CharacterDraftContext";
import {
  WIZARD_STEPS,
  stepIdFromSlug,
  stepSlug,
  getNextStep,
  getPreviousStep,
  isStepComplete,
  type WizardStepId,
} from "./wizardSchema";

import BasicInfoStep from "./steps/BasicInfoStep";
import AbilitiesStep from "./steps/AbilitiesStep";
import SpeciesStep from "./steps/SpeciesStep";
import BackgroundStep from "./steps/BackgroundStep";
import ClassStep from "./steps/ClassStep";
import EquipmentStep from "./steps/EquipmentStep";
import ReviewStep from "./steps/ReviewStep";
import "../../style/CharacterWizard.css";

const STEP_COMPONENTS: Record<WizardStepId, React.FC> = {
  basic_info: BasicInfoStep,
  abilities: AbilitiesStep,
  species: SpeciesStep,
  background: BackgroundStep,
  class: ClassStep,
  equipment: EquipmentStep,
  review: ReviewStep,
};

export default function WizardContainer() {
  const {
    campaignId,
    characterId: editCharId,
    stepSlug: slug,
  } = useParams<{
    campaignId: string;
    characterId?: string;
    stepSlug: string;
  }>();
  const navigate = useNavigate();
  const {
    draft,
    loading,
    error,
    commitStep,
    campaignId: ctxCampaignId,
    characterId: ctxCharId,
    hasStoredDraft,
    startBlank,
    resume,
    loadFromSupabase,
  } = useCharacterDraft();

  useEffect(() => {
    if (!campaignId) return;
    if (editCharId) {
      // Edit mode — hydrate from Supabase if we haven't loaded this character yet
      if (ctxCharId === editCharId && ctxCampaignId === campaignId) return;
      loadFromSupabase(editCharId, campaignId).catch(() => {});
      return;
    }
    // New mode
    if (ctxCampaignId === campaignId && !ctxCharId) return;
    if (hasStoredDraft(campaignId)) {
      resume();
    } else {
      startBlank(campaignId);
    }
  }, [
    campaignId,
    editCharId,
    ctxCampaignId,
    ctxCharId,
    hasStoredDraft,
    resume,
    startBlank,
    loadFromSupabase,
  ]);

  const stepId = slug ? stepIdFromSlug(slug) : null;
  if (!stepId) return <p>Unknown step.</p>;
  if (!campaignId) return <p>Missing campaign.</p>;

  const StepComponent = STEP_COMPONENTS[stepId];
  const prev = getPreviousStep(stepId);
  const next = getNextStep(stepId);
  const canAdvance = isStepComplete(stepId, draft);

  async function handleNext() {
    try {
      await commitStep(stepId);
      if (next) navigate(`/campaigns/${campaignId}/characters/new/${stepSlug(next.id)}`);
      else navigate(`/campaigns/${campaignId}/encounters`); // done
    } catch {
      /* error surfaced via context.error */
    }
  }

  async function handleTabJump(targetId: WizardStepId) {
    // Commit the current step before navigating so progress isn't lost
    // and the character row exists for subsequent steps.
    try {
      await commitStep(stepId);
    } catch {
      /* error surfaced via context.error — still allow navigation */
    }
    navigate(`/campaigns/${campaignId}/characters/new/${stepSlug(targetId)}`);
  }

  return (
    <div className="wizard-page">
      {/* Tab strip */}
      <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {WIZARD_STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleTabJump(s.id)}
            style={{
              padding: "6px 12px",
              background: s.id === stepId ? "#3b82f6" : "#333",
              color: "#eee",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {s.order}. {s.title}
          </button>
        ))}
      </nav>

      {/* Current step */}
      <StepComponent />

      {/* Error display */}
      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error.message}
        </p>
      )}

      {/* Footer nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
        <button
          onClick={() =>
            prev && navigate(`/campaigns/${campaignId}/characters/new/${stepSlug(prev.id)}`)
          }
          disabled={!prev}
        >
          ← Previous
        </button>
        <button onClick={handleNext} disabled={!canAdvance || loading}>
          {loading ? "Saving…" : next ? "Next →" : "Finish"}
        </button>
      </div>
    </div>
  );
}
