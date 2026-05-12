import { createContext, useContext, useState } from "react";
import seedEncounters from "../data/encounters.json";
import { useCampaigns } from "./CampaignsContext";

const EncountersContext = createContext(null);

export function EncountersProvider({ children }) {
  const [encounters, setEncounters] = useState(seedEncounters);
  const { linkEncounter } = useCampaigns();

  function addEncounter(campaignId, title) {
    const newEncounter = {
      id: crypto.randomUUID(),
      title,
    };
    setEncounters((prev) => [...prev, newEncounter]);
    linkEncounter(campaignId, newEncounter.id);
    return newEncounter;
  }

  return (
    <EncountersContext.Provider value={{ encounters, addEncounter }}>
      {children}
    </EncountersContext.Provider>
  );
}

export function useEncounters() {
  return useContext(EncountersContext);
}
