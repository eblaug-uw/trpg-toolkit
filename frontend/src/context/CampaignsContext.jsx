import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useSession } from "../hooks/useSession";

const CampaignsContext = createContext(null);

export function CampaignsProvider({ children }) {
  const { session, loading: sessionLoading } = useSession();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (sessionLoading) return; // wait — session still being determined
    if (!session) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error);
        else setCampaigns(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  async function addCampaign(title) {
    if (!session) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ user_id: session.user.id, title })
      .select()
      .single();
    if (error) throw error;
    setCampaigns((prev) => [...prev, data]);
    return data;
  }

  async function updateCampaign(id, patch) {
    const { data, error } = await supabase
      .from("campaigns")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setCampaigns((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  }

  async function deleteCampaign(id) {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw error;
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <CampaignsContext.Provider
      value={{ campaigns, loading, error, addCampaign, updateCampaign, deleteCampaign }}
    >
      {children}
    </CampaignsContext.Provider>
  );
}

export function useCampaigns() {
  return useContext(CampaignsContext);
}
