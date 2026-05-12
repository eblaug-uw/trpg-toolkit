// ============================================================
// TEMPLATE — copy this file and rename it for your feature
// e.g. TreasureGenerator.tsx, XpCalculator.tsx
// ============================================================

import { useState } from "react";
// TODO: Replace DndTemplate and fetchDndTemplate with your service's exports
import { fetchDndTemplate, type DndTemplate } from "../services/_template";

// TODO: Rename this function to match your component, e.g. TreasureGenerator
export default function FeatureTemplate() {
  // What the user types in the search box
  const [query, setQuery] = useState<string>("");
  // Result from the API — null until a search is made
  // TODO: Replace DndTemplate with your own interface
  const [result, setResult] = useState<DndTemplate | null>(null);
  // Error message if the API call fails
  const [error, setError] = useState<string>("");
  // Disables the button while the API call is in progress
  const [loading, setLoading] = useState<boolean>(false);

  // Runs when the user submits the form
  // TODO: If your feature doesn't need a search input (e.g. random generation),
  //       remove the form and call the fetch function directly on a button click
  async function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      // TODO: Replace fetchDndTemplate with your fetch function
      const data = await fetchDndTemplate(query);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* TODO: Update the title */}
      <h2>Feature Name</h2>

      {/* TODO: If your feature uses a search input, keep this form.
               If it's a calculator or generator, replace with your own inputs/buttons. */}
      <form
        onSubmit={handleSearch}
        style={{ display: "flex", justifyContent: "center", gap: "8px" }}
      >
        <input
          type="text"
          // TODO: Update placeholder text with real examples for your endpoint
          placeholder="e.g. example-item-name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </form>

      {/* Shows error message if fetch failed */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* TODO: Replace the fields below with the ones from your interface */}
      {result && (
        <div>
          <h3>{result.name}</h3>
          {/* TODO: Add more fields here, e.g.: */}
          {/* <p><strong>Type:</strong> {result.type}</p> */}
          {/* <p><strong>Value:</strong> {result.cost?.quantity} {result.cost?.unit}</p> */}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADDING TO THE APP
// Once your component is ready, open App.jsx and:
// 1. Import it:  import YourComponent from "./components/YourComponent"
// 2. Add it inside the ruleSet === "5.0" block
// ============================================================
