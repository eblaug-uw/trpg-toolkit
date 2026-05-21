import { supabase } from "./supabaseClient";

export type Status = {
  id: string;
  name: string;
  stackable: boolean | null;
  default_duration_type: string | null;
  effect_summary: string | null;
};

export type AppliedStatus = {
  instanceId: string;
  statusId: string;
  name: string;
  turnsRemaining: number;
  effect_summary: string | null;
};

const db = () => supabase.schema("references").from("statuses");

export async function fetchAllStatuses(): Promise<Status[]> {
  const { data, error } = await db().select("*").order("name");
  if (error) throw new Error(`Failed to fetch statuses: ${error.message}`);
  return ((data ?? []) as Status[]).filter((status) => status.id && status.name);
}
