// 5.0 mock monsters (used when 5.0 ruleset is selected)
const mockMonsters = [
  { name: "Goblin", cr: 0.25, habitat: "Forest", type: "Humanoid", group: "Tribe" },
  { name: "Orc", cr: 0.5, habitat: "Mountain", type: "Humanoid", group: "Warband" },
  { name: "Skeleton", cr: 0.25, habitat: "Dungeon", type: "Undead", group: "Horde" },
  { name: "Zombie", cr: 0.25, habitat: "Swamp", type: "Undead", group: "Horde" },
  { name: "Bandit", cr: 0.125, habitat: "Road", type: "Humanoid", group: "Gang" },
];

function getRandomMonster(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Used for 5.0: filters the mock list then picks randomly
export function generateMobParty(_targetCR, mobCount, habitat, type, group) {
  const filtered = mockMonsters.filter((m) => {
    return (
      (habitat === "Any" || m.habitat === habitat) &&
      (type === "Any" || m.type === type) &&
      (group === "Any" || m.group === group)
    );
  });
  if (filtered.length === 0) return [];
  return Array.from({ length: mobCount }, () => getRandomMonster(filtered));
}

// Used for 5.5e: picks randomly from an already-fetched array
export function pickRandomMonsters(monsters, count) {
  if (monsters.length === 0) return [];
  return Array.from({ length: count }, () => monsters[Math.floor(Math.random() * monsters.length)]);
}
