import { useState } from "react";
import { addMobToParty, filterMobs, saveMobParty } from "./mobPartyHelpers";

export default function CreateMobParty() {
  // Stores the user's MOB name search
  const [searchTerm, setSearchTerm] = useState("");

  // Stores the selected filter values
  const [habitat, setHabitat] = useState("Any");
  const [challengeRating, setChallengeRating] = useState("Any");
  const [type, setType] = useState("Any");
  const [group, setGroup] = useState("Any");

  // Stores the MOBs currently added to the party
  const [party, setParty] = useState([]);

  // Stores saved parties created by the user
  const [savedParties, setSavedParties] = useState([]);

  // Gets the list of MOBs matching the search and filter values
  const filteredMobs = filterMobs(searchTerm, habitat, challengeRating, type, group);

  // Adds the selected MOB to the current party
  function handleAddMob(mob) {
    const updatedParty = addMobToParty(party, mob);
    setParty(updatedParty);
  }

  // Saves the current party for later use
  function handleSaveParty() {
    if (party.length === 0) {
      alert("Add at least one MOB before saving.");
      return;
    }

    const updatedSavedParties = saveMobParty(savedParties, party);
    setSavedParties(updatedSavedParties);
  }

  return (
    <section>
      <h2>Create a Party of MOBs</h2>
      <hr />

      <label htmlFor="mob-search">Search MOBs:</label>
      <input
        id="mob-search"
        type="text"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <label htmlFor="habitat">Habitat:</label>
      <select id="habitat" value={habitat} onChange={(event) => setHabitat(event.target.value)}>
        <option value="Any">Any</option>
        <option value="Forest">Forest</option>
        <option value="Mountain">Mountain</option>
        <option value="Dungeon">Dungeon</option>
        <option value="Swamp">Swamp</option>
        <option value="Road">Road</option>
      </select>

      <label htmlFor="challenge-rating">Challenge Rating:</label>
      <select
        id="challenge-rating"
        value={challengeRating}
        onChange={(event) => setChallengeRating(event.target.value)}
      >
        <option value="Any">Any</option>
        <option value="0.125">0.125</option>
        <option value="0.25">0.25</option>
        <option value="0.5">0.5</option>
      </select>

      <label htmlFor="type">Type:</label>
      <select id="type" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="Any">Any</option>
        <option value="Humanoid">Humanoid</option>
        <option value="Undead">Undead</option>
      </select>

      <label htmlFor="group">Group:</label>
      <select id="group" value={group} onChange={(event) => setGroup(event.target.value)}>
        <option value="Any">Any</option>
        <option value="Tribe">Tribe</option>
        <option value="Warband">Warband</option>
        <option value="Horde">Horde</option>
        <option value="Gang">Gang</option>
      </select>

      <h3>Available MOBs</h3>

      {filteredMobs.length > 0 ? (
        <ul>
          {filteredMobs.map((mob) => (
            <li key={mob.name}>
              {mob.name} | CR {mob.cr} | {mob.habitat} | {mob.type} | {mob.group}
              <button onClick={() => handleAddMob(mob)}>Add to Party</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No MOBs match the selected filters.</p>
      )}

      <h3>Current Party</h3>

      {party.length > 0 ? (
        <>
          <ul>
            {party.map((mob, index) => (
              <li key={`${mob.name}-${index}`}>
                {mob.name} | CR {mob.cr}
              </li>
            ))}
          </ul>

          <button onClick={handleSaveParty}>Save Party</button>
        </>
      ) : (
        <p>No MOBs added yet.</p>
      )}

      {savedParties.length > 0 && (
        <>
          <h3>Saved Parties</h3>

          {savedParties.map((savedParty, partyIndex) => (
            <div key={partyIndex}>
              <h4>Party {partyIndex + 1}</h4>
              <ul>
                {savedParty.map((mob, mobIndex) => (
                  <li key={`${mob.name}-${partyIndex}-${mobIndex}`}>
                    {mob.name} | CR {mob.cr}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
