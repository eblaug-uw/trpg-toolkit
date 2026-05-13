import { useMemo, useState } from "react";
import Modal from "./Modal";

function SaveEncounterModal({
  isOpen,
  vttState,
  campaigns,
  encounters,
  onSaveExisting,
  onSaveNew,
  onExportFile,
  onClose,
}) {
  const [campaignId, setCampaignId] = useState("");
  const [newName, setNewName] = useState("");

  const encountersInCampaign = useMemo(() => {
    if (!campaignId) return [];
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return [];
    return encounters.filter(
      (e) => e.campaignId === campaignId || campaign.encounterIds.includes(e.id),
    );
  }, [campaignId, campaigns, encounters]);

  const canSaveNew = newName.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Encounter">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 320 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Campaign
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            style={{
              padding: 6,
              background: "#333",
              color: "#eee",
              border: "1px solid #555",
              borderRadius: 4,
            }}
          >
            <option value="">Select campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        {campaignId && encountersInCampaign.length > 0 && (
          <div>
            <h3 style={{ margin: "8px 0", fontSize: "0.95rem", opacity: 0.85 }}>
              Overwrite existing
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {encountersInCampaign.map((e) => (
                <li
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{e.title}</span>
                  <button
                    onClick={() => onSaveExisting(e.id, vttState)}
                    aria-label={`Save to "${e.title}"`}
                    style={{ padding: "4px 8px" }}
                  >
                    {`Save to "${e.title}"`}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {campaignId && (
          <div>
            <h3 style={{ margin: "8px 0", fontSize: "0.95rem", opacity: 0.85 }}>Save as new</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Encounter name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  flex: 1,
                  padding: 6,
                  background: "#333",
                  color: "#eee",
                  border: "1px solid #555",
                  borderRadius: 4,
                }}
              />
              <button
                onClick={() => onSaveNew(campaignId, newName.trim(), vttState)}
                disabled={!canSaveNew}
              >
                Save as new
              </button>
            </div>
          </div>
        )}

        <hr style={{ width: "100%", opacity: 0.3, margin: "8px 0" }} />

        <button onClick={() => onExportFile(vttState)}>Export to file</button>
      </div>
    </Modal>
  );
}

export default SaveEncounterModal;
