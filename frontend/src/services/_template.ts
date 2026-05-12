// ============================================================
// TEMPLATE — copy this file and rename it for your feature
// e.g. dndTreasureSearch.ts, dndXpCalculator.ts
// ============================================================

// Base API URL — all 5.0 features use this. Do not change unless switching ruleset.
const DND_API_BASE = "https://www.dnd5eapi.co/api/2014";

// TODO: Replace this interface with the fields your API endpoint returns.
// Tip: paste the endpoint URL in your browser to see the full JSON response,
// then add the fields you need here.
// Example endpoints to explore:
//   /api/2014/monsters        — full monster list
//   /api/2014/spells          — full spell list
//   /api/2014/magic-items     — treasure / magic items
//   /api/2014/classes         — character classes
//   /api/2014/equipment       — weapons, armor, gear
export interface DndTemplate {
  index: string; // unique slug used in API calls
  name: string; // display name
  // TODO: add more fields from the API response
}

// TODO: Rename this function to match your feature, e.g. fetchDndTreasure()
// TODO: Update the endpoint path — replace "endpoint" with the correct one
//       e.g. "spells", "magic-items", "monsters"
export async function fetchDndTemplate(itemName: string): Promise<DndTemplate> {
  // Converts user input to a URL-safe slug: "Fire Ball" → "fire-ball"
  const slug = itemName.trim().toLowerCase().replace(/\s+/g, "-");

  const response = await fetch(`${DND_API_BASE}/endpoint/${slug}`, {
    headers: { Accept: "application/json" },
  });

  // Throws an error that the component will catch and display to the user
  if (!response.ok) {
    throw new Error(`"${itemName}" not found (${response.status})`);
  }

  return response.json();
}

// ============================================================
// NEED A LIST INSTEAD OF A SINGLE ITEM?
// Some features (random generation, dropdowns) need the full list first.
// Use this pattern to fetch all items, then pick from them:
// ============================================================
//
// export async function fetchAllDndTemplates(): Promise<{ results: DndTemplate[] }> {
//   const response = await fetch(`${DND_API_BASE}/endpoint`, {
//     headers: { Accept: "application/json" },
//   });
//   if (!response.ok) throw new Error("Failed to fetch list");
//   return response.json();
// }
