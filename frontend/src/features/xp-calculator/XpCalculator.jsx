export default function XpCalculator({ participants = [] }) {
  // DM 58: Players are pulled from the current encounter participants
  const playerCount = participants.filter((participant) => {
    return participant.type === "player";
  }).length;

  // DM 58: Mob XP is pulled from monster data already attached to encounter participants
  const totalXp = participants
    .filter((participant) => {
      return participant.type === "monster";
    })
    .reduce((sum, participant) => {
      const xpValue =
        participant.xp ??
        participant.experience ??
        participant.monster?.xp ??
        participant.monster?.experience ??
        participant.data?.xp ??
        participant.data?.experience ??
        0;

      return sum + Number(xpValue);
    }, 0);

  // Calculates how much XP each player receives
  const xpPerPlayer = totalXp > 0 && playerCount > 0 ? Math.floor(totalXp / playerCount) : null;

  return (
    <section>
      {/* DM 58: Displays the total XP from the mobs in the encounter */}
      <p>Total XP: {totalXp}</p>

      {/* DM 58: Displays the number of players in the encounter */}
      <p>Number of Players: {playerCount}</p>

      {/* Displays the calculated XP per player */}
      {xpPerPlayer !== null ? (
        <p>XP per player: {xpPerPlayer}</p>
      ) : (
        <p>Add players and mobs to calculate XP.</p>
      )}
    </section>
  );
}
