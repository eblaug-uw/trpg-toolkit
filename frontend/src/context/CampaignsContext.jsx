import { createContext, useContext, useState } from "react";
import seedCampaigns from "../data/campaigns.json";

const CampaignsContext = createContext(null);

export function CampaignsProvider({ children }) {
  const [campaigns, setCampaigns] = useState(seedCampaigns);

  function addCampaign(title) {
    const newCampaign = {
      id: crypto.randomUUID(),
      title,
      encounterIds: [],
      characterIds: [],
    };
    setCampaigns((prev) => [...prev, newCampaign]);
    return newCampaign;
  }

  function linkEncounter(campaignId, encounterId) {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId ? { ...c, encounterIds: [...c.encounterIds, encounterId] } : c,
      ),
    );
  }

  return (
    <CampaignsContext.Provider value={{ campaigns, addCampaign, linkEncounter }}>
      {children}
    </CampaignsContext.Provider>
  );
}

export function useCampaigns() {
  return useContext(CampaignsContext);
}
