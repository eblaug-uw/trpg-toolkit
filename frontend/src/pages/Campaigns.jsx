import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import Card from "../components/Card";
import Modal from "../components/Modal";
import NewCampaignForm from "../components/NewCampaignForm";
import { useCampaigns } from "../context/CampaignsContext";
import "../style/CardGrid.css";

function Campaigns() {
  const navigate = useNavigate();
  const { campaigns, addCampaign } = useCampaigns();
  const [newOpen, setNewOpen] = useState(false);

  function handleCreate(title) {
    const created = addCampaign(title);
    setNewOpen(false);
    navigate(`/campaigns/${created.id}/encounters`);
  }

  return (
    <div className="app-shell">
      <TopBar />

      <div className="page">
        <h1>Campaigns</h1>
        <button className="page-create-btn" onClick={() => setNewOpen(true)}>
          New Campaign
        </button>

        <div className="card-grid">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              title={campaign.title}
              onClick={() => navigate(`/campaigns/${campaign.id}/encounters`)}
            />
          ))}
        </div>

        <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="New Campaign">
          <NewCampaignForm onCreate={handleCreate} onCancel={() => setNewOpen(false)} />
        </Modal>
      </div>
    </div>
  );
}

export default Campaigns;
