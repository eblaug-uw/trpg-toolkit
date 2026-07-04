import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../services/supabaseClient";
import { useSession } from "../hooks/useSession";
import type { WizardStepId } from "../features/character-wizard/wizardSchema";

const STORAGE_KEY = "trpg:character-draft";

// ─── Types ────────────────────────────────────────────────────
export interface CharacterDraft {
  characters: Record<string, unknown>;
  abilities: Record<string, unknown>;
  skills: Record<string, unknown>;
  speed: Record<string, unknown>;
  currency: Record<string, unknown>;
  spell_slots: Record<string, unknown>;
  personality: Record<string, unknown>;
  appearance: Record<string, unknown>;
  attacks: Array<Record<string, unknown>>;
  inventory: Array<Record<string, unknown>>;
  spells: Array<Record<string, unknown>>;
  features_traits: Array<Record<string, unknown>>;
  /** Internal step state — never persisted to DB. Tracks deltas (e.g. ASI) so
   *  re-picking can undo cleanly. */
  _meta?: Record<string, unknown>;
}

const EMPTY_DRAFT: CharacterDraft = {
  characters: {},
  abilities: {},
  skills: {},
  speed: {},
  currency: {},
  spell_slots: {},
  personality: {},
  appearance: {},
  attacks: [],
  inventory: [],
  spells: [],
  features_traits: [],
  _meta: {},
};

type TableKey = keyof Omit<CharacterDraft, "_meta">;

interface PersistedDraft {
  draft: CharacterDraft;
  characterId: string | null;
  campaignId: string | null;
}

interface CharacterDraftContextValue {
  draft: CharacterDraft;
  characterId: string | null;
  campaignId: string | null;
  loading: boolean;
  error: Error | null;
  loadFromSupabase: (characterId: string, campaignId: string) => Promise<void>;
  deleteCharacter: (characterId: string) => Promise<void>;
  hasStoredDraft: (forCampaignId: string) => boolean;
  peekStoredDraft: () => PersistedDraft | null;
  updateDraft: <T extends TableKey | "_meta">(
    table: T,
    patch: T extends TableKey ? Partial<CharacterDraft[T]> : Record<string, unknown>,
  ) => void;
  setTable: <T extends TableKey>(table: T, value: CharacterDraft[T]) => void;
  commitStep: (stepId: WizardStepId, campaignIdOverride?: string) => Promise<void>;
  startBlank: (campaignId: string) => void;
  startFromPdf: (parsed: Partial<CharacterDraft>, campaignId: string) => void;
  resume: () => void;
  reset: () => void;
}

const CharacterDraftContext = createContext<CharacterDraftContextValue | null>(null);

// ─── Persistence helpers ──────────────────────────────────────
function readStorage(): PersistedDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedDraft;
  } catch {
    return null;
  }
}
function writeStorage(value: PersistedDraft | null) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota / disabled — ignore */
  }
}

// ─── Provider ─────────────────────────────────────────────────
export function CharacterDraftProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [draft, setDraft] = useState<CharacterDraft>(EMPTY_DRAFT);
  const [characterId, setCharacterIdState] = useState<string | null>(null);
  const characterIdRef = useRef<string | null>(null);
  const setCharacterId = (id: string | null) => {
    characterIdRef.current = id;
    setCharacterIdState(id);
  };
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (campaignId === null) return;
    writeStorage({ draft, characterId, campaignId });
  }, [draft, characterId, campaignId]);

  const updateDraft = useCallback(
    <T extends TableKey | "_meta">(
      table: T,
      patch: T extends TableKey ? Partial<CharacterDraft[T]> : Record<string, unknown>,
    ) => {
      setDraft((prev) => {
        if (table === "_meta") {
          return {
            ...prev,
            _meta: { ...(prev._meta ?? {}), ...(patch as Record<string, unknown>) },
          };
        }
        const cur = prev[table];
        if (Array.isArray(cur)) return prev;
        return { ...prev, [table]: { ...(cur as object), ...patch } };
      });
    },
    [],
  );
  const loadFromSupabase = useCallback(async (cid: string, campaign: string) => {
    setLoading(true);
    setError(null);
    try {
      const [
        charsRes,
        abRes,
        skRes,
        speedRes,
        persRes,
        appRes,
        currRes,
        slotsRes,
        ftRes,
        spRes,
        invRes,
      ] = await Promise.all([
        supabase.from("characters").select().eq("id", cid).single(),
        supabase.from("abilities").select().eq("id", cid).maybeSingle(),
        supabase.from("skills").select().eq("id", cid).maybeSingle(),
        supabase.from("speed").select().eq("id", cid).maybeSingle(),
        supabase.from("personality").select().eq("id", cid).maybeSingle(),
        supabase.from("appearance").select().eq("id", cid).maybeSingle(),
        supabase.from("currency").select().eq("id", cid).maybeSingle(),
        supabase.from("spell_slots").select().eq("id", cid).maybeSingle(),
        supabase.from("features_traits").select().eq("character_id", cid),
        supabase.from("spells").select().eq("character_id", cid),
        supabase.from("inventory").select().eq("character_id", cid),
      ]);
      if (charsRes.error) throw charsRes.error;

      const strip = <T extends Record<string, unknown>>(row: T | null | undefined): Partial<T> => {
        if (!row) return {};
        const { user_id, character_id, id, ...rest } = row as Record<string, unknown>;
        return rest as Partial<T>;
      };

      const next: CharacterDraft = {
        ...EMPTY_DRAFT,
        characters: strip(charsRes.data) as CharacterDraft["characters"],
        abilities: strip(abRes.data) as CharacterDraft["abilities"],
        skills: strip(skRes.data) as CharacterDraft["skills"],
        speed: strip(speedRes.data) as CharacterDraft["speed"],
        personality: strip(persRes.data) as CharacterDraft["personality"],
        appearance: strip(appRes.data) as CharacterDraft["appearance"],
        currency: strip(currRes.data) as CharacterDraft["currency"],
        spell_slots: strip(slotsRes.data) as CharacterDraft["spell_slots"],
        features_traits: (ftRes.data ?? []).map((r) =>
          strip(r),
        ) as CharacterDraft["features_traits"],
        spells: (spRes.data ?? []).map((r) => strip(r)) as CharacterDraft["spells"],
        inventory: (invRes.data ?? []).map((r) => {
          const s = strip(r) as Record<string, unknown>;
          return { ...s, source: (r as { notes?: string }).notes ?? "manual" };
        }),
      };

      setDraft(next);
      setCharacterId(cid); // wrapper updates both state and ref
      setCampaignId(campaign);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Delete character (sub-tables first, then characters) ──
  const deleteCharacter = useCallback(async (cid: string) => {
    const subById = [
      "abilities",
      "skills",
      "speed",
      "personality",
      "appearance",
      "currency",
      "spell_slots",
    ];
    const subByCharId = ["features_traits", "spells", "inventory"];

    await Promise.all([
      ...subById.map((t) => supabase.from(t).delete().eq("id", cid)),
      ...subByCharId.map((t) => supabase.from(t).delete().eq("character_id", cid)),
    ]);
    const { error } = await supabase.from("characters").delete().eq("id", cid);
    if (error) throw error;
  }, []);
  const setTable = useCallback(<T extends TableKey>(table: T, value: CharacterDraft[T]) => {
    setDraft((prev) => ({ ...prev, [table]: value }));
  }, []);

  const startBlank = useCallback((cid: string) => {
    setDraft(EMPTY_DRAFT);
    setCharacterId(null);
    setCampaignId(cid);
    setError(null);
  }, []);

  const startFromPdf = useCallback((parsed: Partial<CharacterDraft>, cid: string) => {
    setDraft({ ...EMPTY_DRAFT, ...parsed });
    setCharacterId(null);
    setCampaignId(cid);
    setError(null);
  }, []);

  const resume = useCallback(() => {
    const stored = readStorage();
    if (!stored) return;
    setDraft(stored.draft);
    setCharacterId(stored.characterId);
    setCampaignId(stored.campaignId);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setCharacterId(null);
    setCampaignId(null);
    setError(null);
    writeStorage(null);
  }, []);

  const hasStoredDraft = useCallback((forCampaignId: string) => {
    const stored = readStorage();
    if (!stored || stored.campaignId !== forCampaignId) return false;
    const name = (stored.draft?.characters as { name?: string } | undefined)?.name;
    return typeof name === "string" && name.trim().length > 0;
  }, []);

  const peekStoredDraft = useCallback(() => readStorage(), []);

  // ── commitStep ─────────────────────────────────────────────
  const commitStep = useCallback(
    async (stepId: WizardStepId, campaignIdOverride?: string) => {
      if (!session) throw new Error("Not signed in");
      const effectiveCampaignId = campaignIdOverride ?? campaignId;
      if (!effectiveCampaignId) throw new Error("No campaign selected");
      setLoading(true);
      setError(null);

      try {
        if (stepId === "basic_info") {
          await commitBasicInfo();
        } else {
          // Defensive: if Basic Info was never committed (e.g. user jumped past it),
          // create the character row first so subsequent commits have something to attach to.
          if (!characterIdRef.current) await commitBasicInfo();

          if (stepId === "abilities") await commitAbilities();
          else if (stepId === "species") await commitSpecies();
          else if (stepId === "background") await commitBackground();
          else if (stepId === "class") await commitClass();
          else if (stepId === "equipment") await commitEquipment();
          else console.warn(`commitStep(${stepId}) not yet implemented`);
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }

      // ── basic_info ────────────────────────────────────────
      async function commitBasicInfo() {
        const charPayload = {
          user_id: session!.user.id,
          campaign_id: effectiveCampaignId,
          ...draft.characters,
        };

        let id = characterIdRef.current;

        if (!id) {
          const { data, error: insErr } = await supabase
            .from("characters")
            .insert(charPayload)
            .select()
            .single();
          if (insErr) throw insErr;
          id = data.id as string;
          setCharacterId(id);

          if (Object.keys(draft.personality).length) {
            await supabase.from("personality").insert({
              id,
              user_id: session!.user.id,
              ...draft.personality,
            });
          }
          if (Object.keys(draft.appearance).length) {
            await supabase.from("appearance").insert({
              id,
              user_id: session!.user.id,
              ...draft.appearance,
            });
          }
        } else {
          await supabase.from("characters").update(draft.characters).eq("id", id);
          if (Object.keys(draft.personality).length) {
            await supabase
              .from("personality")
              .upsert({ id, user_id: session!.user.id, ...draft.personality });
          }
          if (Object.keys(draft.appearance).length) {
            await supabase
              .from("appearance")
              .upsert({ id, user_id: session!.user.id, ...draft.appearance });
          }
        }
      }

      // ── abilities ─────────────────────────────────────────
      async function commitAbilities() {
        if (!characterIdRef.current)
          throw new Error("Character row missing — complete Basic Info first");
        const id = characterIdRef.current;
        if (!Object.keys(draft.abilities).length) return;

        const ABILITY_COLUMNS = new Set<string>([
          "strength",
          "dexterity",
          "constitution",
          "intelligence",
          "wisdom",
          "charisma",
          "strength_proficiency",
          "dexterity_proficiency",
          "constitution_proficiency",
          "intelligence_proficiency",
          "wisdom_proficiency",
          "charisma_proficiency",
        ]);

        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(draft.abilities)) {
          if (ABILITY_COLUMNS.has(k)) clean[k] = v;
        }

        const { error: upErr } = await supabase.from("abilities").upsert({
          id,
          user_id: session!.user.id,
          ...clean,
        });
        if (upErr) throw upErr;
      }

      // ── species ───────────────────────────────────────────
      async function commitSpecies() {
        if (!characterIdRef.current)
          throw new Error("Character row missing — complete Basic Info first");
        const id = characterIdRef.current;
        const userId = session!.user.id;

        await supabase
          .from("characters")
          .update({
            species: (draft.characters.species as string | undefined) ?? null,
            subspecies: (draft.characters.subspecies as string | undefined) ?? null,
            size: (draft.characters.size as string | undefined) ?? null,
          })
          .eq("id", id);

        if (Object.values(draft.speed).some((v) => v !== null && v !== undefined)) {
          const { error: spdErr } = await supabase.from("speed").upsert({
            id,
            user_id: userId,
            ...draft.speed,
          });
          if (spdErr) throw spdErr;
        }

        await supabase
          .from("features_traits")
          .delete()
          .eq("character_id", id)
          .eq("source", "species");
        const speciesTraits = (
          draft.features_traits as Array<{ name?: string; description?: string; source?: string }>
        ).filter((t) => t.source === "species");
        if (speciesTraits.length) {
          const { error: ftErr } = await supabase.from("features_traits").insert(
            speciesTraits.map((t) => ({
              character_id: id,
              user_id: userId,
              name: t.name,
              source: "species",
              description: t.description,
            })),
          );
          if (ftErr) throw ftErr;
        }

        await supabase.from("spells").delete().eq("character_id", id).eq("source", "species");
        const speciesSpells = (
          draft.spells as Array<{
            name?: string;
            level?: number;
            prepared?: boolean;
            school?: string | null;
            notes?: string | null;
            source?: string;
          }>
        ).filter((s) => s.source === "species");
        if (speciesSpells.length) {
          const { error: spErr } = await supabase.from("spells").insert(
            speciesSpells.map((s) => ({
              character_id: id,
              user_id: userId,
              name: s.name,
              level: s.level,
              prepared: s.prepared ?? false,
              school: s.school ?? null,
              notes: s.notes ?? null,
              source: "species",
            })),
          );
          if (spErr) throw spErr;
        }
      }

      // ── background ────────────────────────────────────────
      async function commitBackground() {
        if (!characterIdRef.current)
          throw new Error("Character row missing — complete Basic Info first");
        const id = characterIdRef.current;
        const userId = session!.user.id;

        await supabase
          .from("characters")
          .update({
            background: (draft.characters.background as string | undefined) ?? null,
            feats: (draft.characters.feats as string[] | undefined) ?? [],
            tool: (draft.characters.tool as string[] | undefined) ?? [],
          })
          .eq("id", id);

        if (Object.keys(draft.abilities).length) {
          const { error } = await supabase.from("abilities").upsert({
            id,
            user_id: userId,
            ...draft.abilities,
          });
          if (error) throw error;
        }

        if (Object.keys(draft.skills).length) {
          const { error } = await supabase.from("skills").upsert({
            id,
            user_id: userId,
            ...draft.skills,
          });
          if (error) throw error;
        }

        if (Object.keys(draft.currency).length) {
          const { error } = await supabase.from("currency").upsert({
            id,
            user_id: userId,
            ...draft.currency,
          });
          if (error) throw error;
        }

        await supabase.from("inventory").delete().eq("character_id", id).eq("notes", "background");
        const bgItems = (
          draft.inventory as Array<{ name?: string; quantity?: number; source?: string }>
        ).filter((i) => i.source === "background");
        if (bgItems.length) {
          const { error } = await supabase.from("inventory").insert(
            bgItems.map((i) => ({
              character_id: id,
              user_id: userId,
              name: i.name,
              quantity: i.quantity ?? 1,
              equipped: false,
              notes: "background",
            })),
          );
          if (error) throw error;
        }
      }

      // ── equipment ─────────────────────────────────────────
      async function commitEquipment() {
        if (!characterIdRef.current)
          throw new Error("Character row missing — complete Basic Info first");
        const id = characterIdRef.current;
        const userId = session!.user.id;

        if (Object.keys(draft.currency).length) {
          const { error } = await supabase
            .from("currency")
            .upsert({ id, user_id: userId, ...draft.currency });
          if (error) throw error;
        }

        await supabase.from("inventory").delete().eq("character_id", id).eq("notes", "manual");
        const manualItems = (
          draft.inventory as Array<{
            name?: string;
            quantity?: number;
            equipped?: boolean;
            source?: string;
          }>
        ).filter((i) => i.source === "manual");
        if (manualItems.length) {
          const { error } = await supabase.from("inventory").insert(
            manualItems.map((i) => ({
              character_id: id,
              user_id: userId,
              name: i.name,
              quantity: i.quantity ?? 1,
              equipped: !!i.equipped,
              notes: "manual",
            })),
          );
          if (error) throw error;
        }
      }

      // ── class ─────────────────────────────────────────────
      async function commitClass() {
        if (!characterIdRef.current)
          throw new Error("Character row missing — complete Basic Info first");
        const id = characterIdRef.current;
        const userId = session!.user.id;

        await supabase
          .from("characters")
          .update({
            class: (draft.characters.class as string[] | undefined) ?? [],
            level: (draft.characters.level as number | undefined) ?? 1,
            subclass: (draft.characters.subclass as string | undefined) ?? null,
            hit_dice: (draft.characters.hit_dice as number | undefined) ?? null,
            hit_points_max: (draft.characters.hit_points_max as number | undefined) ?? null,
            hit_points: (draft.characters.hit_points as number | undefined) ?? null,
            proficiency_bonus: (draft.characters.proficiency_bonus as number | undefined) ?? null,
            spellcasting_ability:
              (draft.characters.spellcasting_ability as string | undefined) ?? null,
            feats: (draft.characters.feats as string[] | undefined) ?? [],
            tool: (draft.characters.tool as string[] | undefined) ?? [],
          })
          .eq("id", id);

        if (Object.keys(draft.abilities).length) {
          await supabase.from("abilities").upsert({ id, user_id: userId, ...draft.abilities });
        }

        if (Object.keys(draft.skills).length) {
          await supabase.from("skills").upsert({ id, user_id: userId, ...draft.skills });
        }

        if (Object.keys(draft.spell_slots).length) {
          await supabase.from("spell_slots").upsert({ id, user_id: userId, ...draft.spell_slots });
        }

        if (Object.keys(draft.currency).length) {
          await supabase.from("currency").upsert({ id, user_id: userId, ...draft.currency });
        }

        await supabase
          .from("features_traits")
          .delete()
          .eq("character_id", id)
          .eq("source", "class");
        const classTraits = (
          draft.features_traits as Array<{ name?: string; description?: string; source?: string }>
        ).filter((t) => t.source === "class");
        if (classTraits.length) {
          await supabase.from("features_traits").insert(
            classTraits.map((t) => ({
              character_id: id,
              user_id: userId,
              name: t.name,
              source: "class",
              description: t.description,
            })),
          );
        }

        await supabase.from("inventory").delete().eq("character_id", id).eq("notes", "class");
        const classItems = (
          draft.inventory as Array<{ name?: string; quantity?: number; source?: string }>
        ).filter((i) => i.source === "class");
        if (classItems.length) {
          await supabase.from("inventory").insert(
            classItems.map((i) => ({
              character_id: id,
              user_id: userId,
              name: i.name,
              quantity: i.quantity ?? 1,
              equipped: false,
              notes: "class",
            })),
          );
        }
      }
    },
    [session, campaignId, draft],
  );

  return (
    <CharacterDraftContext.Provider
      value={{
        draft,
        characterId,
        campaignId,
        loading,
        error,
        hasStoredDraft,
        peekStoredDraft,
        updateDraft,
        setTable,
        commitStep,
        startBlank,
        startFromPdf,
        resume,
        reset,
        loadFromSupabase,
        deleteCharacter,
      }}
    >
      {children}
    </CharacterDraftContext.Provider>
  );
}

export function useCharacterDraft(): CharacterDraftContextValue {
  const ctx = useContext(CharacterDraftContext);
  if (!ctx) throw new Error("useCharacterDraft outside CharacterDraftProvider");
  return ctx;
}
