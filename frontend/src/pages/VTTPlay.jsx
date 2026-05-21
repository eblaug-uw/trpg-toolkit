/* --Imports-- */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVttSession } from "../context/VttSessionContext";
import { useCampaigns } from "../context/CampaignsContext";
import { useEncounters } from "../context/EncountersContext";
import TopBar from "../components/TopBar";
import MapCanvas from "../components/MapCanvas";
import PillMapContorl from "../components/PillMapContorl";
import PillZoom from "../components/PillZoom";
import PillMeasure from "../components/PillMeasure";
import PillRight from "../components/PillRight";
import PillBottom from "../components/PillBottom";
import Modal from "../components/Modal";
import MonsterSearch from "../components/MonsterSearch";
import EquipmentSearch from "../components/EquipmentSearch";
import TreasureGenerator from "../features/loot-generator/TreasureGenerator";
import XpCalculator from "../features/xp-calculator/XpCalculator";
import SaveEncounterModal from "../components/SaveEncounterModal";
import InitiativeTracker from "../components/InitiativeTracker";
import ParticipantSheet from "../components/ParticipantSheet";

function VTTPlay() {
  /* --State-- */
  const navigate = useNavigate();
  const mapCanvasRef = useRef(null);
  const [openModal, setOpenModal] = useState(null);
  const [measureMode, setMeasureMode] = useState(null);

  const {
    encounterId,
    grid: { showGrid, pixelsPerFoot, gridFineTune, gridOffsetX, gridOffsetY },
    backgroundUrl,
    participants,

    // DM 56: Player view uses mob visibility by layer.
    mobVisibilityByLayer,

    moveToken,
    damage,
    heal,
    removeParticipant,
    selectedParticipant,
    setSelectedParticipant,
    setMapInfo,
    combatActive,
    initiativeQueue,
    roll,
    nextTurn,
    adjustInitiative,
    applyStatus,
    removeStatus,
    currentVttState,
    saveCurrent,
  } = useVttSession();

  const { campaigns } = useCampaigns();
  const { encounters, addEncounter } = useEncounters();

  /* --Constants-- */
  const gridSize = Math.max(4, 5 * pixelsPerFoot + gridFineTune);

  // DM 56: Hide mobs from players unless the GM revealed their layer.
  const visibleParticipants = participants.filter((participant) => {
    if (participant.type !== "monster") {
      return true;
    }

    const participantLayer = participant.layer ?? 1;
    return Boolean(mobVisibilityByLayer[participantLayer]);
  });

  const modalTitles = {
    tables: "Lookup Tables",
    dollar: "Loot",
    chart: "Stats",
    xp: "XP Calculator",
  };

  /* --Escape cancels measure mode-- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && measureMode !== null) setMeasureMode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [measureMode]);

  /* --Handlers-- */
  function handleEditClick() {
    if (encounterId) saveCurrent(encounterId);
    navigate(`/vtt/edit${encounterId ? `?encounterId=${encounterId}` : ""}`);
  }

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

  const renderModalContent = () => {
    switch (openModal) {
      case "tables":
        return (
          <>
            <MonsterSearch />
            <EquipmentSearch />
          </>
        );
      case "dollar":
        return <TreasureGenerator />;
      case "chart":
        return <p>Coming Soon</p>;
      case "xp":
        // DM 58: Pass encounter participants so XP values can be calculated automatically.
        return <XpCalculator participants={participants} />;
      default:
        return null;
    }
  };

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
          measureMode={measureMode}
        />

        <InitiativeTracker
          participants={participants}
          queue={initiativeQueue}
          combatActive={combatActive}
          onRoll={roll}
          onNext={nextTurn}
          onSelect={setSelectedParticipant}
          onDamage={damage}
          onHeal={heal}
          onAdjustInitiative={adjustInitiative}
          onApplyStatus={applyStatus}
          onRemoveStatus={removeStatus}
        />

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
          <PillMeasure measureMode={measureMode} onSetMeasureMode={setMeasureMode} />
          <PillRight
            onLoot={() => setOpenModal("dollar")}
            onStats={() => setOpenModal("chart")}
            onXpCalc={() => setOpenModal("xp")}
          />
          <PillBottom
            onTables={() => setOpenModal("tables")}
            onSaveEncounter={() => setOpenModal("saveEncounter")}
          />
        </PillMapContorl>

        <button
          type="button"
          aria-label="Switch to edit mode"
          onClick={handleEditClick}
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
          ← Edit
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

export default VTTPlay;
