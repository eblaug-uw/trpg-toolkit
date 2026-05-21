import { createContext, useContext, useEffect, useState } from "react";
import seedEncounters from "../data/encounters.json";
import { useCampaigns } from "./CampaignsContext";

const EncountersContext = createContext(null);

const STORAGE_KEY = "trpg:encounters";

function loadInitialEncounters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  // Normalize seed entries so any missing fields get safe defaults.
  return seedEncounters.map((e) => ({
    campaignId: null,
    vttState: null,
    ...e,
  }));
}

export function EncountersProvider({ children }) {
  const [encounters, setEncounters] = useState(loadInitialEncounters);
  const { linkEncounter } = useCampaigns();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(encounters));
    } catch {
      // localStorage full or unavailable; safe to ignore for now
    }
  }, [encounters]);

  function addEncounter(campaignId, title) {
    const newEncounter = {
      id: crypto.randomUUID(),
      title,
      campaignId,
      vttState: null,
    };
    setEncounters((prev) => [...prev, newEncounter]);
    linkEncounter(campaignId, newEncounter.id);
    return newEncounter;
  }

  function saveVttState(encounterId, vttState) {
    setEncounters((prev) => {
      if (!prev.some((e) => e.id === encounterId)) return prev;
      return prev.map((e) => (e.id === encounterId ? { ...e, vttState } : e));
    });
  }

  return (
    <EncountersContext.Provider value={{ encounters, addEncounter, saveVttState }}>
      {children}
    </EncountersContext.Provider>
  );
}

export function useEncounters() {
  return useContext(EncountersContext);
}
