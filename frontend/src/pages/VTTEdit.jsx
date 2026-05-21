/* --Imports-- */
import { useRef, useState } from "react";
import { useVttSession } from "../context/VttSessionContext";
import { useCampaigns } from "../context/CampaignsContext";
import { useEncounters } from "../context/EncountersContext";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import MapCanvas from "../components/MapCanvas";
import PillMapContorl from "../components/PillMapContorl";
import PillZoom from "../components/PillZoom";
import PillGrid from "../components/PillGrid";
import PillBottom from "../components/PillBottom";
import Modal from "../components/Modal";
import ImageUploader from "../components/ImageUploader";
import MapBackgroundPicker from "../components/MapBackgroundPicker";
import AddParticipantForm from "../components/AddParticipantForm";
import MonsterSearch from "../components/MonsterSearch";
import EnemyGenerator from "../features/enemy-generator";
import SaveEncounterModal from "../components/SaveEncounterModal";
import ParticipantSheet from "../components/ParticipantSheet";
import StagingArea from "../features/vtt/StagingArea";

function VTTEdit() {
  /* --States-- */
  const mapCanvasRef = useRef(null);
  const [openModal, setOpenModal] = useState(null);
  const navigate = useNavigate();

  const {
    grid: { showGrid, pixelsPerFoot, gridFineTune, gridOffsetX, gridOffsetY },
    setShowGrid,
    setPixelsPerFoot,
    setGridFineTune,
    setGridOffsetX,
    setGridOffsetY,
    backgroundUrl,
    setBackground,
    participants,

    // DM 56: GM controls for mob visibility by layer.
    mobVisibilityByLayer,
    toggleMobVisibilityForLayer,

    // DM 48: Current active map layer state
    currentLayer,
    setCurrentLayer,

    addParticipant,
    addToStaging,
    removeParticipant,
    moveToken,
    damage,
    heal,
    selectedParticipant,
    setSelectedParticipant,
    setMapInfo,
    currentVttState,
    saveCurrent,
    encounterId,
  } = useVttSession();

  const { campaigns } = useCampaigns();
  const { encounters, addEncounter } = useEncounters();

  /* --Constants-- */
  const gridSize = Math.max(4, 5 * pixelsPerFoot + gridFineTune);

  // DM 48: Only display tokens from the active layer
  const visibleParticipants = participants.filter((participant) => {
    const participantLayer = participant.layer ?? 1;
    return participantLayer === currentLayer;
  });

  const modalTitles = {
    image: "Upload Image",
    map: "Set Map Background",
    person: "Add Character",
    tables: "Lookup Tables",
    "radom in counter": "Enemy Generator",
  };

  const renderModalContent = () => {
    switch (openModal) {
      case "image":
        return <ImageUploader />;
      case "map":
        return (
          <MapBackgroundPicker
            onSelect={(url, name) => setBackground(url, name)}
            pixelsPerFoot={pixelsPerFoot}
            onChangePixelsPerFoot={setPixelsPerFoot}
          />
        );
      case "person":
        return <AddParticipantForm onAdd={addToStaging} />;
      case "tables":
        // Edit-mode tables modal: MonsterSearch only.
        // EquipmentSearch is play-mode only — added when VTTPlay lands.
        return <MonsterSearch />;
      case "radom in counter":
        return <EnemyGenerator onAdd={addToStaging} />;
      default:
        return null;
    }
  };

  /* --Handlers-- */
  function handleSaveExisting(encId) {
    saveCurrent(encId);
    setOpenModal(null);
  }

  function handleSaveNew(campaignId, title) {
    const created = addEncounter(campaignId, title);
    saveCurrent(created.id);
    setOpenModal(null);
  }

  function handleExportFile(vttState) {
    const blob = new Blob([JSON.stringify(vttState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `encounter-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handlePlayClick() {
    if (encounterId) saveCurrent(encounterId);
    navigate(`/vtt/play${encounterId ? `?encounterId=${encounterId}` : ""}`);
  }

  /* --Render-- */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          boxSizing: "border-box",
          overflow: "hidden",
          background: "#2a3439",
          position: "relative",
        }}
      >
        <MapCanvas
          ref={mapCanvasRef}
          backgroundUrl={backgroundUrl}
          showGrid={showGrid}
          gridSize={gridSize}
          gridOffsetX={gridOffsetX}
          gridOffsetY={gridOffsetY}
          participants={visibleParticipants}
          onMapReady={setMapInfo}
          onMoveToken={moveToken}
          measureMode={null}
        />

        {/* DM 56: GM controls for revealing mobs to players by layer. */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 96,
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(34, 34, 34, 0.9)",
            color: "white",
            fontWeight: 600,
            zIndex: 20,
          }}
        >
          <span>Mob visibility</span>
          {[1, 2, 3].map((layer) => {
            const isVisible = Boolean(mobVisibilityByLayer[layer]);

            return (
              <button
                key={layer}
                type="button"
                aria-label={`Toggle mobs visible on layer ${layer}`}
                onClick={() => toggleMobVisibilityForLayer(layer)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid #666",
                  background: isVisible ? "#4a6fa5" : "#333",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {`L${layer} ${isVisible ? "Visible" : "Hidden"}`}
              </button>
            );
          })}
        </div>
        <StagingArea />

        {/* DM 48: Layer controls */}
        <div
          style={{
            position: "absolute",
            top: 64,
            right: 96,
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(34, 34, 34, 0.9)",
            color: "white",
            fontWeight: 600,
            zIndex: 20,
          }}
        >
          <span>Layer {currentLayer}</span>
          {[1, 2, 3].map((layer) => (
            <button
              key={layer}
              type="button"
              aria-label={`Show layer ${layer}`}
              onClick={() => setCurrentLayer(layer)}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid #666",
                background: currentLayer === layer ? "#4a6fa5" : "#333",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {layer}
            </button>
          ))}
        </div>

        <ParticipantSheet
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          onRemove={removeParticipant}
          onDamage={damage}
          onHeal={heal}
        />

        <PillMapContorl>
          <PillZoom
            onZoomIn={() => mapCanvasRef.current?.zoomIn()}
            onZoomOut={() => mapCanvasRef.current?.zoomOut()}
          />
          <PillGrid
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((g) => !g)}
            pixelsPerFoot={pixelsPerFoot}
            onChangePixelsPerFoot={setPixelsPerFoot}
            gridFineTune={gridFineTune}
            onChangeGridFineTune={setGridFineTune}
            gridOffsetX={gridOffsetX}
            onChangeGridOffsetX={setGridOffsetX}
            gridOffsetY={gridOffsetY}
            onChangeGridOffsetY={setGridOffsetY}
          />
          <PillBottom
            onImage={() => setOpenModal("image")}
            onMap={() => setOpenModal("map")}
            onAddCharacter={() => setOpenModal("person")}
            onEnemyGenerator={() => setOpenModal("radom in counter")}
            onTables={() => setOpenModal("tables")}
            onSaveEncounter={() => setOpenModal("saveEncounter")}
          />
        </PillMapContorl>

        {/* Edit → Play handoff. Placeholder until VTTPlay lands. */}
        <button
          type="button"
          aria-label="Switch to play mode"
          onClick={handlePlayClick}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: "#4a6fa5",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Play →
        </button>

        <Modal
          isOpen={openModal !== null && openModal !== "saveEncounter"}
          onClose={() => setOpenModal(null)}
          title={modalTitles[openModal] ?? ""}
        >
          {renderModalContent()}
        </Modal>

        <SaveEncounterModal
          isOpen={openModal === "saveEncounter"}
          vttState={currentVttState}
          campaigns={campaigns}
          encounters={encounters}
          onSaveExisting={handleSaveExisting}
          onSaveNew={handleSaveNew}
          onExportFile={handleExportFile}
          onClose={() => setOpenModal(null)}
        />
      </div>
    </div>
  );
}

export default VTTEdit;
