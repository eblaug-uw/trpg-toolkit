/* --Imports-- */
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CombatTracker } from "../services/combatTracker";
import MonsterSearch from "../components/MonsterSearch";
import EquipmentSearch from "../components/EquipmentSearch";
import XpCalculator from "../features/xp-calculator/XpCalculator";
import ImageUploader from "../components/ImageUploader";
import MapBackgroundPicker from "../components/MapBackgroundPicker";
import Modal from "../components/Modal";
import TopBar from "../components/TopBar";
import MapCanvas from "../components/MapCanvas";
import PillMapContorl from "../components/PillMapContorl";
import TreasureGenerator from "../features/loot-generator/TreasureGenerator";
import PillGrid from "../components/PillGrid";
import PillZoom from "../components/PillZoom";
import PillRight from "../components/PillRight";
import PillBottom from "../components/PillBottom";
import PillMeasure from "../components/PillMeasure";
import InitiativeTracker from "../components/InitiativeTracker";
import AddParticipantForm from "../components/AddParticipantForm";
import ParticipantSheet from "../components/ParticipantSheet";
import EnemyGenerator from "../features/enemy-generator";
import SaveEncounterModal from "../components/SaveEncounterModal";
import { useCampaigns } from "../context/CampaignsContext";
import { useEncounters } from "../context/EncountersContext";
import { serializeVttState } from "../features/vtt/encounter/serialize";

function VTT() {
  /* --States-- */
  const navigate = useNavigate();
  const mapCanvasRef = useRef(null);
  const combatRef = useRef(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [backgroundRef, setBackgroundRef] = useState(null); // { bucket, name } — stable id
  const [openModal, setOpenModal] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [pixelsPerFoot, setPixelsPerFoot] = useState(10);
  const [gridFineTune, setGridFineTune] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [initiativeQueue, setInitiativeQueue] = useState([]);
  const [combatActive, setCombatActive] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [gridOffsetX, setGridOffsetX] = useState(0);
  const [gridOffsetY, setGridOffsetY] = useState(0);
  const [measureMode, setMeasureMode] = useState(null);
  const [mapInfo, setMapInfo] = useState(0);

  const { campaigns } = useCampaigns();
  const { encounters, addEncounter, saveVttState } = useEncounters();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && measureMode !== null) {
        setMeasureMode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [measureMode]);

  // Pull the current ordered participant list out of the CombatTracker queue,
  // carrying the rolled initiative total so the UI can display and edit it.
  function syncQueue() {
    if (combatRef.current) {
      setInitiativeQueue(
        combatRef.current.queue.map((e) => ({ ...e.entity, initiativeTotal: e.total })),
      );
    }
  }

  function handleRemoveParticipant(id) {
    setParticipants((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        setCombatActive(false);
        setInitiativeQueue([]);
        combatRef.current = null;
        return next;
      }
      return next;
    });
    if (combatRef.current) {
      combatRef.current.queue = combatRef.current.queue.filter((e) => e.entity.id !== id);
      syncQueue();
    } else {
      setInitiativeQueue((prev) => prev.filter((p) => p.id !== id));
    }
    setSelectedParticipant(null);
  }

  function updateHp(id, calc) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, hit_points: calc(p) } : p)));
    if (combatRef.current) {
      combatRef.current.queue.forEach((entry) => {
        if (entry.entity.id === id) {
          entry.entity = { ...entry.entity, hit_points: calc(entry.entity) };
        }
      });
      syncQueue();
    } else {
      setInitiativeQueue((prev) =>
        prev.map((p) => (p.id === id ? { ...p, hit_points: calc(p) } : p)),
      );
    }
    setSelectedParticipant((prev) =>
      prev?.id === id ? { ...prev, hit_points: calc(prev) } : prev,
    );
  }

  function handleDamage(id, amount) {
    updateHp(id, (p) => Math.max(0, p.hit_points - amount));
  }

  function handleHeal(id, amount) {
    updateHp(id, (p) => Math.min(p.data.hit_points ?? p.data.hp, p.hit_points + amount));
  }

  function handleRoll() {
    if (participants.length === 0) return;
    combatRef.current = new CombatTracker(participants);
    syncQueue();
    setCombatActive(true);
  }

  function handleNextTurn() {
    if (!combatRef.current) return;
    combatRef.current.nextTurn();
    syncQueue();
  }

  function handleAdjustInitiative(name, total) {
    if (!combatRef.current) return;
    combatRef.current.adjustInitiative(name, total);
    syncQueue();
  }

  function handleAddParticipant(participant) {
    const size = participant.size ?? 1;
    const cell = mapInfo
      ? {
          x: Math.max(
            0,
            Math.min(mapInfo.width - size, Math.floor(mapInfo.width / 2) - Math.floor(size / 2)),
          ),
          y: Math.max(
            0,
            Math.min(mapInfo.height - size, Math.floor(mapInfo.height / 2) - Math.floor(size / 2)),
          ),
        }
      : { x: 0, y: 0 };
    setParticipants((prev) => [...prev, { ...participant, cell }]);
  }

  function handleMoveToken(id, cell) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, cell } : p)));
  }

  /* --Encounter save-- */
  const currentVttState = useMemo(
    () =>
      serializeVttState({
        showGrid,
        pixelsPerFoot,
        gridFineTune,
        gridOffsetX,
        gridOffsetY,
        backgroundRef,
        participants,
        combat: {
          active: combatActive,
          round: combatRef.current?.round ?? 1,
          queue: (combatRef.current?.queue ?? []).map((e) => ({
            participantId: e.entity.id,
            total: e.total,
            dex: e.dex,
          })),
        },
        viewport: null,
      }),
    [
      showGrid,
      pixelsPerFoot,
      gridFineTune,
      gridOffsetX,
      gridOffsetY,
      backgroundRef,
      participants,
      combatActive,
      initiativeQueue,
    ],
  );

  function handleSaveExisting(encounterId, vttState) {
    console.log("[Encounter Save] overwrite", encounterId, vttState);
    saveVttState(encounterId, vttState);
    setOpenModal(null);
  }

  function handleSaveNew(campaignId, title, vttState) {
    const created = addEncounter(campaignId, title);
    console.log("[Encounter Save] new", { campaignId, encounterId: created.id, title }, vttState);
    saveVttState(created.id, vttState);
    setOpenModal(null);
  }

  function handleExportFile(vttState) {
    console.log("[Encounter Save] export", vttState);
    const blob = new Blob([JSON.stringify(vttState, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `encounter-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* --Constants-- */
  const modalTitles = {
    image: "Upload Image",
    map: "Set Map Background",
    person: "Add Character",
    tables: "Lookup Tables",
    dollar: "Loot",
    chart: "Stats",
    xp: "XP Calculator",
    "radom in counter": "Enemy Generator",
  };

  const gridSize = Math.max(4, 5 * pixelsPerFoot + gridFineTune);

  const renderModalContent = () => {
    switch (openModal) {
      case "image":
        return <ImageUploader />;
      case "map":
        return (
          <MapBackgroundPicker
            onSelect={(url, name) => {
              setBackgroundUrl(url);
              setBackgroundRef({ bucket: "maps", name });
            }}
            pixelsPerFoot={pixelsPerFoot}
            onChangePixelsPerFoot={setPixelsPerFoot}
          />
        );
      case "person":
        return <AddParticipantForm onAdd={handleAddParticipant} />;
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
        return <XpCalculator />;
      case "radom in counter":
        return <EnemyGenerator onAdd={handleAddParticipant} />;
      default:
        return null;
    }
  };

  /* --Render-- */
  return (
    /* Outer flex column: TopBar on top, canvas fills the rest*/
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar />
      {/* Canvas area: holds the Konva Stage and floating toolbar pills */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          boxSizing: "border-box",
          overflow: "hidden",
          background: "#2a3439",
        }}
      >
        {/* Konva canvas: only renders once a map image has loaded */}
        <MapCanvas
          ref={mapCanvasRef}
          backgroundUrl={backgroundUrl}
          showGrid={showGrid}
          gridSize={gridSize}
          gridOffsetX={gridOffsetX}
          gridOffsetY={gridOffsetY}
          participants={participants}
          onMapReady={setMapInfo}
          onMoveToken={handleMoveToken}
          measureMode={measureMode}
        />

        {/* Initiative tracker overlay */}
        <InitiativeTracker
          participants={participants}
          queue={initiativeQueue}
          combatActive={combatActive}
          onRoll={handleRoll}
          onNext={handleNextTurn}
          onSelect={setSelectedParticipant}
          onDamage={handleDamage}
          onHeal={handleHeal}
          onAdjustInitiative={handleAdjustInitiative}
        />

        {/* Participant sheet for selected character */}
        <ParticipantSheet
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          onRemove={handleRemoveParticipant}
          onDamage={handleDamage}
          onHeal={handleHeal}
        />

        {/* Lower-right pill: map control */}
        <PillMapContorl>
          <PillZoom
            onZoomIn={() => mapCanvasRef.current?.zoomIn()}
            onZoomOut={() => mapCanvasRef.current?.zoomOut()}
          />
          <PillMeasure measureMode={measureMode} onSetMeasureMode={setMeasureMode} />
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
          <PillRight
            onLoot={() => setOpenModal("dollar")}
            onStats={() => setOpenModal("chart")}
            onXpCalc={() => setOpenModal("xp")}
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

        {/* Generic modal — body is fanned out by openModal value */}
        <Modal
          isOpen={openModal !== null && openModal !== "saveEncounter"}
          onClose={() => setOpenModal(null)}
          title={modalTitles[openModal] ?? ""}
        >
          {renderModalContent()}
        </Modal>

        {/* Save encounter modal — its own component because it has its own layout */}
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

export default VTT;
