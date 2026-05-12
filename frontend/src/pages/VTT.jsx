/* --Imports-- */
import { useState, useRef, useEffect } from "react"; // React core hooks
import { useNavigate } from "react-router-dom"; // Routing
import { CombatTracker } from "../services/combatTracker"; // Combat tracker service
import MonsterSearch from "../components/MonsterSearch"; // Table Look - Monster
import EquipmentSearch from "../components/EquipmentSearch"; // Table Look - Equipment
import XpCalculator from "../features/xp-calculator/XpCalculator"; // XP Calculator
import ImageUploader from "../components/ImageUploader"; // Upload-image
import MapBackgroundPicker from "../components/MapBackgroundPicker"; // Pick-Map
import Modal from "../components/Modal"; // generic modal
import TopBar from "../components/TopBar"; // Top Nav
import MapCanvas from "../components/MapCanvas"; // Konva canvas
import PillMapContorl from "../components/PillMapContorl";
import TreasureGenerator from "../features/loot-generator/TreasureGenerator";
import PillGrid from "../components/PillGrid";
import PillZoom from "../components/PillZoom"; // Hover ZoomPill
import PillRight from "../components/PillRight"; // Right NavPill
import PillBottom from "../components/PillBottom";
import PillMeasure from "../components/PillMeasure"; // Bottom NavPill
import InitiativeTracker from "../components/InitiativeTracker"; // Initiative panel
import AddParticipantForm from "../components/AddParticipantForm"; // Add character form
import ParticipantSheet from "../components/ParticipantSheet";
import EnemyGenerator from "../features/enemy-generator"; // Selected participant sheet
import { AiFillThunderbolt } from "react-icons/ai";
function VTT() {
  /* --States-- */
  const navigate = useNavigate();
  const mapCanvasRef = useRef(null);
  const combatRef = useRef(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null); // URL of currently selected map image
  const [openModal, setOpenModal] = useState(null); // Which modal is open
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
  const [mapInfo, setMapInfo] = useState(0); //{ x, y }

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
  /* --Constants-- */
  const modalTitles = {
    // Title shown in the modal header for each modal type
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
    // Picks the body content for the modal based on which one is open
    switch (openModal) {
      case "image":
        return <ImageUploader />;
      case "map":
        return (
          <MapBackgroundPicker
            onSelect={setBackgroundUrl}
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

        {/* Right-side pill: loot + stats */}

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
          />
        </PillMapContorl>

        {/* Bottom pill: image / map / character / lookup tables */}

        {/* Generic modal — body is fanned out by openModal value */}
        <Modal
          isOpen={openModal !== null}
          onClose={() => setOpenModal(null)}
          title={modalTitles[openModal] ?? ""}
        >
          {renderModalContent()}
        </Modal>
      </div>
    </div>
  );
}

export default VTT;
