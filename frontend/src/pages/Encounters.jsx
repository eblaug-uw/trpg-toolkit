import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import Card from "../components/Card";
import Modal from "../components/Modal";
import NewEncounterForm from "../components/NewEncounterForm";
import CharacterSidebar from "../components/CharacterSidebar";
import { useCampaigns } from "../context/CampaignsContext";
import { useEncounters } from "../context/EncountersContext";
import charactersData from "../data/characters.json";
import LoadEncounterButton from "../components/LoadEncounterButton";
import "../style/CardGrid.css";
import "../style/EncountersPage.css";

function Encounters() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaigns } = useCampaigns();
  const { encounters: allEncounters, addEncounter } = useEncounters();
  const campaign = campaigns.find((c) => c.id === id);

  const [mode, setMode] = useState("edit");
  const [newOpen, setNewOpen] = useState(false);

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

  const encounters = allEncounters.filter((e) => campaign.encounterIds.includes(e.id));
  const characters = charactersData.filter((ch) => campaign.characterIds.includes(ch.id));

  function handleAddCharacter() {
    console.log("Add character to campaign:", campaign.id);
  }

  function handleManageCharacter(character) {
    console.log("Manage character:", character.id);
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
        />
      </div>

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="New Encounter">
        <NewEncounterForm onCreate={handleCreateEncounter} onCancel={() => setNewOpen(false)} />
      </Modal>
    </div>
  );
}

export default Encounters;
