import { useState } from "react";

export default function XpCalculator() {
  // Stores the total XP from the encounter
  const [totalXp, setTotalXp] = useState("");

  // Stores the number of players who should receive XP
  const [playerCount, setPlayerCount] = useState("");

  // Stores the calculated XP amount for each player
  const [xpPerPlayer, setXpPerPlayer] = useState(null);

  // Calculates how much XP each player receives
  function handleCalculateXp() {
    const xpValue = Number(totalXp);
    const playerValue = Number(playerCount);

    // Stops the calculation if the user enters invalid numbers
    if (xpValue <= 0 || playerValue <= 0) {
      alert("Please enter total XP and number of players greater than 0.");
      return;
    }

    // Divides the total XP by the number of players and rounds down to a whole XP value
    const calculatedXp = Math.floor(xpValue / playerValue);
    setXpPerPlayer(calculatedXp);
  }

  return (
    <section>
      {/* Input for the total XP from the encounter */}
      <label htmlFor="total-xp">Total XP:</label>
      <input
        id="total-xp"
        type="number"
        min="1"
        value={totalXp}
        onChange={(event) => setTotalXp(event.target.value)}
      />

      {/* Input for the number of players */}
      <label htmlFor="player-count">Number of Players:</label>
      <input
        id="player-count"
        type="number"
        min="1"
        value={playerCount}
        onChange={(event) => setPlayerCount(event.target.value)}
      />

      {/* Button that runs the XP calculation */}
      <button onClick={handleCalculateXp}>Calculate XP</button>

      {/* Displays the calculated XP per player */}
      {xpPerPlayer !== null && <p>XP per player: {xpPerPlayer}</p>}
    </section>
  );
}
