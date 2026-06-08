export type WizardStepId =
  | "basic_info"
  | "abilities"
  | "species"
  | "background"
  | "class"
  | "equipment"
  | "review";

export interface WizardStep {
  /** Stable identifier — also used as the URL slug (with hyphens). */
  readonly id: WizardStepId;
  /** Display label shown in the wizard's tab strip. */
  readonly title: string;
  /** 1-based position in the linear flow. */
  readonly order: number;
  /** DB tables this step writes to. Drives the autosave service. */
  readonly tables: readonly string[];
  /**
   * Dotted paths the user must fill in before "Next" enables.
   * e.g. "characters.name" means draft.characters.name must be truthy.
   * Empty array = no requirements; Next always enabled.
   */
  readonly requiredFields: readonly string[];
  /** Optional help text for the step header. */
  readonly description?: string;
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    id: "basic_info",
    title: "Basic Info",
    order: 1,
    tables: ["characters", "personality", "appearance"],
    requiredFields: ["characters.name"],
    description: "Name, alignment, personality, and appearance.",
  },
  {
    id: "abilities",
    title: "Abilities",
    order: 2,
    tables: ["abilities"],
    requiredFields: [],
    description: "Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma.",
  },
  {
    id: "species",
    title: "Species",
    order: 3,
    tables: ["characters", "speed", "features_traits", "spells"],
    requiredFields: ["characters.species", "characters.size"],
    description:
      "Pick your character's species. Speed, size, traits, and any bonus spells are set here.",
  },
  {
    id: "background",
    title: "Background",
    order: 4,
    tables: ["characters", "abilities", "skills", "features_traits", "inventory", "currency"],
    requiredFields: ["characters.background"],
    description:
      "Pick your character's background. Skill proficiencies, tool, feat, ASI, and starting equipment are set here.",
  },
  {
    id: "class",
    title: "Class",
    order: 5,
    tables: [
      "characters",
      "abilities",
      "skills",
      "features_traits",
      "spells",
      "spell_slots",
      "inventory",
      "currency",
    ],
    requiredFields: ["characters.class", "characters.level"],
    description:
      "Pick your class and level. Saving throws, skills, features, fighting style, and equipment are set here.",
  },
  {
    id: "equipment",
    title: "Equipment",
    order: 6,
    tables: ["characters", "currency", "attacks", "inventory"],
    requiredFields: [],
    description: "Starting equipment, weapons, and currency.",
  },
  {
    id: "review",
    title: "Review",
    order: 7,
    tables: [],
    requiredFields: [],
    description: "Final check before saving the character.",
  },
] as const;

// ─── Nav helpers ──────────────────────────────────────────────

/** URL slug for a step (basic_info → basic-info). */
export function stepSlug(id: WizardStepId): string {
  return id.replace(/_/g, "-");
}

/** Reverse of stepSlug. Returns null for unknown slugs. */
export function stepIdFromSlug(slug: string): WizardStepId | null {
  const id = slug.replace(/-/g, "_") as WizardStepId;
  return WIZARD_STEPS.some((s) => s.id === id) ? id : null;
}

export function getStep(id: WizardStepId): WizardStep {
  const step = WIZARD_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown wizard step: ${id}`);
  return step;
}

export function getNextStep(id: WizardStepId): WizardStep | null {
  const current = getStep(id);
  return WIZARD_STEPS.find((s) => s.order === current.order + 1) ?? null;
}

export function getPreviousStep(id: WizardStepId): WizardStep | null {
  const current = getStep(id);
  return WIZARD_STEPS.find((s) => s.order === current.order - 1) ?? null;
}

/** True if every required field has a truthy value in the draft. */
export function isStepComplete(id: WizardStepId, draft: object): boolean {
  const step = getStep(id);
  return step.requiredFields.every((path) => {
    const [table, column] = path.split(".");
    const tableObj = (draft as Record<string, unknown>)[table] as
      | Record<string, unknown>
      | undefined;
    const value = tableObj?.[column];
    return value !== undefined && value !== null && value !== "";
  });
}
