import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useSession } from "../hooks/useSession";

const EncountersContext = createContext(null);

export function EncountersProvider({ children }) {
  const { session, loading: sessionLoading } = useSession();
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (sessionLoading) return; // wait — session still being determined
    if (!session) {
      setEncounters([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    supabase
      .from("encounters")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error);
        else setEncounters(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  async function addEncounter(campaignId, title, vttState = null) {
    if (!session) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("encounters")
      .insert({
        user_id: session.user.id,
        campaign_id: campaignId,
        title,
        vtt_state: vttState,
      })
      .select()
      .single();
    if (error) throw error;
    setEncounters((prev) => [...prev, data]);
    return data;
  }

  async function saveVttState(encounterId, vttState) {
    const { data, error } = await supabase
      .from("encounters")
      .update({ vtt_state: vttState })
      .eq("id", encounterId)
      .select()
      .single();
    if (error) throw error;
    setEncounters((prev) => prev.map((e) => (e.id === encounterId ? data : e)));
    return data;
  }

  async function deleteEncounter(id) {
    const { error } = await supabase.from("encounters").delete().eq("id", id);
    if (error) throw error;
    setEncounters((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <EncountersContext.Provider
      value={{ encounters, loading, error, addEncounter, saveVttState, deleteEncounter }}
    >
      {children}
    </EncountersContext.Provider>
  );
}

export function useEncounters() {
  return useContext(EncountersContext);
}
