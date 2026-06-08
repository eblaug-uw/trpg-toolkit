import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import Card from "../components/Card";
import Modal from "../components/Modal";
import NewEncounterForm from "../components/NewEncounterForm";
import CharacterSidebar from "../components/CharacterSidebar";
import { useCampaigns } from "../context/CampaignsContext";
import { useEncounters } from "../context/EncountersContext";
import { supabase } from "../services/supabaseClient"; // adjust path if different
import LoadEncounterButton from "../components/LoadEncounterButton";
import "../style/CardGrid.css";
import "../style/EncountersPage.css";
import { useCharacterDraft } from "../context/CharacterDraftContext";

function Encounters() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaigns } = useCampaigns();
  const { encounters: allEncounters, addEncounter } = useEncounters();
  const campaign = campaigns.find((c) => c.id === id);

  const [mode, setMode] = useState("edit");
  const [newOpen, setNewOpen] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [charsLoading, setCharsLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { deleteCharacter } = useCharacterDraft();

  useEffect(() => {
    if (!campaign?.id) return;
    let cancelled = false;
    setCharsLoading(true);
    supabase
      .from("characters")
      .select("id, name, player_name, species, class, level")
      .eq("campaign_id", campaign.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("characters fetch failed", error);
        setCharacters(data ?? []);
        setCharsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaign?.id]);

  if (!campaign) {
    return (
      <div className="app-shell">
        <TopBar />
        <div className="page">
          <p>
            Campaign not found. <Link to="/campaigns">Back to campaigns</Link>
          </p>
        </div>
      </div>
    );
  }

  const encounters = allEncounters.filter((e) => e.campaign_id === campaign.id);

  function handleAddCharacter() {
    navigate(`/campaigns/${campaign.id}/characters/new`);
  }

  function handleManageCharacter(character) {
    navigate(`/campaigns/${campaign.id}/characters/${character.id}/edit/basic-info`);
  }

  function handleDeleteCharacter(character) {
    setDeleteTarget(character);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCharacter(deleteTarget.id);
      setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(`Delete failed: ${err.message || err}`);
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenEncounter(encounter) {
    if (mode === "play") {
      navigate(`/vtt/${mode}?encounterId=${encounter.id}`);
    } else {
      navigate(`/vtt/edit?encounterId=${encounter.id}`);
    }
  }

  function handleCreateEncounter(title) {
    addEncounter(campaign.id, title);
    setNewOpen(false);
  }

  return (
    <div className="app-shell">
      <TopBar />

      <div className="encounters-shell">
        <main className="encounters-main">
          <Link to="/campaigns" className="back-link">
            &larr; Campaigns
          </Link>
          <h1>{campaign.title}</h1>

          <h2 className="encounters-section-title">Encounters</h2>
          <div className="encounters-actions">
            <button className="page-create-btn" onClick={() => setNewOpen(true)}>
              New Encounter
            </button>
            <LoadEncounterButton campaignId={campaign.id} />
          </div>
          <div className="mode-toggle" role="group" aria-label="Mode">
            <button
              className={mode === "edit" ? "mode-toggle-btn active" : "mode-toggle-btn"}
              onClick={() => setMode("edit")}
            >
              Edit
            </button>
            <button
              className={mode === "play" ? "mode-toggle-btn active" : "mode-toggle-btn"}
              onClick={() => setMode("play")}
            >
              Play
            </button>
          </div>

          {encounters.length === 0 ? (
            <p>No encounters yet.</p>
          ) : (
            <div className="card-grid">
              {encounters.map((e) => (
                <Card key={e.id} title={e.title} onClick={() => handleOpenEncounter(e)} />
              ))}
            </div>
          )}
        </main>

        <CharacterSidebar
          characters={characters}
          onAddCharacter={handleAddCharacter}
          onManageCharacter={handleManageCharacter}
          onDeleteCharacter={handleDeleteCharacter}
        />
      </div>

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="New Encounter">
        <NewEncounterForm onCreate={handleCreateEncounter} onCancel={() => setNewOpen(false)} />
      </Modal>
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete character"
      >
        <p style={{ color: "#eee" }}>
          Delete <strong>{deleteTarget?.name}</strong>? {"This can't be undone."}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            style={{
              background: "#7a2828",
              color: "#eee",
              padding: "6px 14px",
              border: "1px solid #844",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default Encounters;
