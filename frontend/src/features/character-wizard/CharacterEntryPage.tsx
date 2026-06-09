import { useNavigate, useParams } from "react-router-dom";
import { useCharacterDraft } from "../../context/CharacterDraftContext";
import "../../style/CharacterWizard.css";

export default function CharacterEntryPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { startBlank, resume, hasStoredDraft, peekStoredDraft } = useCharacterDraft();

  if (!campaignId) return <p>Missing campaign.</p>;

  const showResume = hasStoredDraft(campaignId);
  const stored = showResume ? peekStoredDraft() : null;
  const storedName = (stored?.draft?.characters as { name?: string })?.name || "Unnamed";

  function goBlank() {
    startBlank(campaignId);
    navigate(`/campaigns/${campaignId}/characters/new/basic-info`);
  }

  function goResume() {
    resume();
    navigate(`/campaigns/${campaignId}/characters/new/basic-info`);
  }

  function goBackToCampaign() {
    navigate(`/campaigns/${campaignId}/encounters`);
  }

  return (
    <div className="wizard-page">
      <button onClick={goBackToCampaign} style={{ marginBottom: 16 }}>
        ← Back to Campaign
      </button>

      <h1>New Character</h1>
      <p>Choose how to start.</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
        <button onClick={goBlank} style={cardStyle}>
          <h3>Start blank</h3>
          <p>Build from scratch.</p>
        </button>

        {showResume && (
          <button onClick={goResume} style={cardStyle}>
            <h3>Resume draft</h3>
            <p>{storedName}</p>
          </button>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  textAlign: "left",
  background: "#2a3439",
  color: "#eee",
  border: "1px solid #555",
  borderRadius: 8,
  padding: 16,
  minWidth: 200,
  cursor: "pointer",
};
