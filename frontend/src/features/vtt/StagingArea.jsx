import { useVttSession } from "../../context/VttSessionContext";

/**
 * Displays newly created mobs and PCs before they are placed onto the map.
 */
function StagingArea() {
  // Get staged tokens and staging actions from the shared VTT session.
  const { stagingParticipants, deployFromStaging, removeFromStaging } = useVttSession();

  return (
    <aside
      style={{
        position: "absolute",
        left: 16,
        top: 16,
        width: "260px",
        maxHeight: "70vh",
        overflowY: "auto",
        background: "rgba(34, 34, 34, 0.95)",
        color: "white",
        border: "1px solid #444",
        borderRadius: "12px",
        padding: "12px",
        zIndex: 10,
      }}
    >
      <h2 style={{ margin: "0 0 8px" }}>Staging Area</h2>

      {/* Explain what this panel is used for. */}
      <p style={{ margin: "0 0 12px", color: "#aaa", fontSize: "0.85rem" }}>
        New mobs and PCs are added here before being placed on the map.
      </p>

      {/* Show a message when there are no staged tokens. */}
      {stagingParticipants.length === 0 ? (
        <p style={{ margin: 0, color: "#aaa" }}>No staged tokens.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {/* Display each staged mob or PC. */}
          {stagingParticipants.map((participant) => (
            <li
              key={participant.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "8px 0",
                borderTop: "1px solid #444",
              }}
            >
              {/* Basic token details. */}
              <div>
                <strong>{participant.name}</strong>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>
                  {participant.type} | HP {participant.hit_points}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                {/* Move the token from staging onto the actual VTT map. */}
                <button type="button" onClick={() => deployFromStaging(participant.id)}>
                  Move to Map
                </button>

                {/* Remove the token from staging if it was added by mistake. */}
                <button type="button" onClick={() => removeFromStaging(participant.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default StagingArea;
