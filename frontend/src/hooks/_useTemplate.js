// ============================================================
// TEMPLATE — copy this file and rename it for your hook
// e.g. useMonsters.js, useMapImages.js, useEquipment.js
// ============================================================

import { useState, useEffect } from "react";
// TODO: Import any services or Supabase helpers you need, e.g.:
// import { listImages } from "../services/vttStorage";
// import { supabase } from "../services/supabaseClient";

// TODO: Rename this hook to match what it does, e.g. useMonsters
// Hook names must start with "use"
export function useTemplate() {
  // TODO: Replace with the data your hook fetches/tracks
  const [data, setData] = useState(null);
  // Shows a spinner or disables UI while loading
  const [loading, setLoading] = useState(true);
  // Holds an error message if something goes wrong
  const [error, setError] = useState("");

  useEffect(() => {
    // TODO: Replace this with your actual fetch or subscription logic
    async function load() {
      try {
        // const result = await yourServiceFunction();
        // setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();

    // TODO: If you set up a real-time subscription (e.g. supabase.channel),
    //       return a cleanup function that unsubscribes, like:
    // return () => subscription.unsubscribe();
  }, []); // TODO: Add dependencies if the fetch depends on props or state

  return { data, loading, error };
}

// ============================================================
// USING THIS HOOK IN A COMPONENT
// Import and destructure inside any component:
//
//   import { useTemplate } from "../hooks/useTemplate";
//
//   function MyComponent() {
//     const { data, loading, error } = useTemplate();
//     if (loading) return <p>Loading...</p>;
//     if (error)   return <p style={{ color: "red" }}>{error}</p>;
//     return <div>{/* render data here */}</div>;
//   }
// ============================================================
