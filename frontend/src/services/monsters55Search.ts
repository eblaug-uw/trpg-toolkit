import { supabase } from "./supabaseClient";

export interface Monster55 {
  name: string;
  cr: number | null;
  type: string | null;
  size: string | null;
  ac: number | null;
  hp: number | null;
  speed: string | null;
  str: number | null;
  dex: number | null;
  con: number | null;
  int: number | null;
  wis: number | null;
  cha: number | null;
  alignment: string | null;
  legendary: boolean | null;
  habitat: string | null;
  source: string | null;
  image_url: string | null;
  initiative: string | null;
  skills: string | null;
  senses: string | null;
  languages: string | null;
  xp: number | null;
  immunities: string | null;
  resistances: string | null;
  vulnerabilities: string | null;
  treasure: string | null;
  traits: string | null;
  actions: string | null;
  bonus_actions: string | null;
  reactions: string | null;
  legendary_actions: string | null;
}

const db = () => supabase.schema("references").from("monsters");

export async function fetchMonster55ByName(name: string): Promise<Monster55> {
  const { data, error } = await db().select("*").ilike("name", name.trim()).single();

  if (error) throw new Error(`Monster "${name}" not found: ${error.message}`);
  return data as Monster55;
}

export async function searchMonsters55(query: string, limit = 20): Promise<Monster55[]> {
  const { data, error } = await db()
    .select("*")
    .ilike("name", `%${query.trim()}%`)
    .order("name")
    .limit(limit);

  if (error) throw new Error(`Monster search failed: ${error.message}`);
  return (data ?? []) as Monster55[];
}

export async function fetchMonsters55ByCR(cr: number): Promise<Monster55[]> {
  const { data, error } = await db().select("*").eq("cr", cr).order("name");

  if (error) throw new Error(`CR lookup failed: ${error.message}`);
  return (data ?? []) as Monster55[];
}

export async function fetchMonsters55ForParty(
  maxCR: number,
  type?: string,
  habitat?: string,
  limit = 150,
): Promise<Monster55[]> {
  let query = db().select("*").lte("cr", maxCR).order("name").limit(limit);

  if (type) query = query.ilike("type", `%${type}%`);
  if (habitat) query = query.ilike("habitat", `%${habitat}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Party fetch failed: ${error.message}`);
  return (data ?? []) as Monster55[];
}

export async function fetchMonsters55ByType(type: string): Promise<Monster55[]> {
  const { data, error } = await db().select("*").ilike("type", `%${type.trim()}%`).order("name");

  if (error) throw new Error(`Type lookup failed: ${error.message}`);
  return (data ?? []) as Monster55[];
}
