// Mock treasure data for now.
// This can later be replaced with API data.
const treasureTable = {
  Beast: ["Claw Necklace", "Fur Pelt", "Sharp Fang"],
  Undead: ["Ancient Coin", "Bone Fragment", "Cursed Ring"],
  Dragon: ["Gold Hoard", "Dragon Scale", "Flame Gem"],
  Humanoid: ["Coin Pouch", "Rusty Dagger", "Leather Boots"],
};

// Gets treasure items based on the selected MOB type
export function generateTreasure(mobType) {
  return treasureTable[mobType] || [];
}
