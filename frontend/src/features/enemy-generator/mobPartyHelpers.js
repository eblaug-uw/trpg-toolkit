// Mock MOB data for now.
// This can be replaced later with API data.
export const mobs = [
  { name: "Goblin", cr: 0.25, habitat: "Forest", type: "Humanoid", group: "Tribe" },
  { name: "Orc", cr: 0.5, habitat: "Mountain", type: "Humanoid", group: "Warband" },
  { name: "Skeleton", cr: 0.25, habitat: "Dungeon", type: "Undead", group: "Horde" },
  { name: "Zombie", cr: 0.25, habitat: "Swamp", type: "Undead", group: "Horde" },
  { name: "Bandit", cr: 0.125, habitat: "Road", type: "Humanoid", group: "Gang" },
];

// Filters MOBs by name, habitat, challenge rating, type, and group
export function filterMobs(searchTerm, habitat, challengeRating, type, group) {
  return mobs.filter((mob) => {
    const matchesSearch = mob.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHabitat = habitat === "Any" || mob.habitat === habitat;
    const matchesChallengeRating = challengeRating === "Any" || mob.cr === Number(challengeRating);
    const matchesType = type === "Any" || mob.type === type;
    const matchesGroup = group === "Any" || mob.group === group;

    return matchesSearch && matchesHabitat && matchesChallengeRating && matchesType && matchesGroup;
  });
}

// Adds a selected MOB to the current party
export function addMobToParty(party, mob) {
  return [...party, mob];
}

// Saves the current party into the saved party list
export function saveMobParty(savedParties, party) {
  return [...savedParties, party];
}
