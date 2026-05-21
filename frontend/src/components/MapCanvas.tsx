import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Line,
  Group,
  Circle,
  Text,
  Label,
  Tag,
  Rect,
} from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { AppliedStatus } from "../services/statusesService";

type TokenParticipant = {
  id: string;
  name: string;
  type: string;
  cell?: { x: number; y: number };
  size?: number;
  statuses?: AppliedStatus[];
};

type Props = {
  backgroundUrl: string | null;
  showGrid: boolean;
  gridSize?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  participants?: TokenParticipant[];
  onMapReady?: (info: { width: number; height: number }) => void;
  onMoveToken?: (id: string, cell: { x: number; y: number }) => void;
  measureMode: string | null;
};

type MapCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
};

function cellToPixel(
  cellX: number,
  cellY: number,
  gridSize: number,
  gridOffsetX: number,
  gridOffsetY: number,
) {
  const offX = ((gridOffsetX % gridSize) + gridSize) % gridSize;
  const offY = ((gridOffsetY % gridSize) + gridSize) % gridSize;
  return {
    x: Math.round(offX + cellX * gridSize + gridSize / 2),
    y: Math.round(offY + cellY * gridSize + gridSize / 2),
  };
}

function parseMeasureMode(mode: string | null) {
  if (!mode) return null;
  const [kind, sizePart] = mode.split("-");
  if (kind === "distance") return { kind };
  if (kind === "square" || kind === "circle" || kind === "cone") {
    return { kind, size: parseInt(sizePart, 10) };
  }
  if (kind === "line") {
    const [length, width] = sizePart.split("x").map((n) => parseInt(n, 10));
    return { kind, length, width };
  }
  return null;
}

function snapToCenter(
  px: number,
  py: number,
  size: number,
  gridSize: number,
  gridOffsetX: number,
  gridOffsetY: number,
) {
  const offX = ((gridOffsetX % gridSize) + gridSize) % gridSize;
  const offY = ((gridOffsetY % gridSize) + gridSize) % gridSize;
  const col = Math.round((px - offX - (size * gridSize) / 2) / gridSize);
  const row = Math.round((py - offY - (size * gridSize) / 2) / gridSize);
  return {
    col,
    row,
    x: offX + col * gridSize + (size * gridSize) / 2,
    y: offY + row * gridSize + (size * gridSize) / 2,
  };
}

function tokensOverLap(
  aCell: { x: number; y: number },
  aSize: number,
  bCell: { x: number; y: number },
  bSize: number,
) {
  return (
    aCell.x < bCell.x + bSize &&
    aCell.x + aSize > bCell.x &&
    aCell.y < bCell.y + bSize &&
    aCell.y + aSize > bCell.y
  );
}

const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  {
    backgroundUrl,
    showGrid,
    gridSize = 50,
    gridOffsetX = 0,
    gridOffsetY = 0,
    participants = [],
    onMapReady,
    onMoveToken,
    measureMode,
  },
  ref,
) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [measureLine, setMeasureLine] = useState<{
    anchor: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [shapePos, setShapePos] = useState<{ x: number; y: number } | null>(null);
  const [shapeRotation, setShapeRotation] = useState(0);
  const [shapeAimMode, setShapeAimMode] = useState<"moving" | "rotating">("moving");
  const [statusPopup, setStatusPopup] = useState<{
    statuses: AppliedStatus[];
    x: number;
    y: number;
  } | null>(null);

  const SCALE_BY = 1.05;
  const GRID_COLOR = "rgba(0,0,0,0.6)";

  const scale = imgSize
    ? Math.max(
        1,
        Math.max(containerSize.width / imgSize.width, containerSize.height / imgSize.height),
      )
    : 1;
  const drawWidth = imgSize ? imgSize.width * scale : 0;
  const drawHeight = imgSize ? imgSize.height * scale : 0;

  const fitScale =
    imgSize && containerSize.width > 0 && drawWidth > 0
      ? Math.min(containerSize.width / drawWidth, containerSize.height / drawHeight)
      : 1;
  const minScale = Math.min(1, fitScale);
  const maxScale = 1;

  const clampPosition = (pos: { x: number; y: number }, currentScale: number) => {
    const scaledWidth = drawWidth * currentScale;
    const scaledHeight = drawHeight * currentScale;
    const x =
      scaledWidth >= containerSize.width
        ? Math.min(0, Math.max(containerSize.width - scaledWidth, pos.x))
        : (containerSize.width - scaledWidth) / 2;
    const y =
      scaledHeight >= containerSize.height
        ? Math.min(0, Math.max(containerSize.height - scaledHeight, pos.y))
        : (containerSize.height - scaledHeight) / 2;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
    stage.scale({ x: clampedScale, y: clampedScale });
    stage.position(
      clampPosition(
        {
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        },
        clampedScale,
      ),
    );
  };

  const zoomBy = (factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const newScale = Math.max(minScale, Math.min(maxScale, oldScale * factor));
    const center = { x: containerSize.width / 2, y: containerSize.height / 2 };
    const centerPointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };
    stage.scale({ x: newScale, y: newScale });
    stage.position(
      clampPosition(
        {
          x: center.x - centerPointTo.x * newScale,
          y: center.y - centerPointTo.y * newScale,
        },
        newScale,
      ),
    );
  };

  const getStagePointerPos = (): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const s = stage.scaleX();
    return {
      x: (pointer.x - stage.x()) / s,
      y: (pointer.y - stage.y()) / s,
    };
  };

  const handleMeasureClick = () => {
    setStatusPopup(null);
    if (measureMode === "distance") {
      const pos = getStagePointerPos();
      if (!pos) return;
      setMeasureLine({ anchor: pos, end: pos });
      return;
    }
    if (measureMode && (measureMode.startsWith("cone-") || measureMode.startsWith("line-"))) {
      setShapeAimMode((prev) => (prev === "moving" ? "rotating" : "moving"));
    }
  };

  const handleMeasureMouseMove = () => {
    const pos = getStagePointerPos();
    if (!pos) return;
    if (measureMode === "distance") {
      if (measureLine) {
        setMeasureLine((prev) => (prev ? { ...prev, end: pos } : null));
      }
      return;
    }
    if (measureMode && (measureMode.startsWith("square-") || measureMode.startsWith("circle-"))) {
      setShapePos(pos);
      return;
    }
    if (measureMode && (measureMode.startsWith("cone-") || measureMode.startsWith("line-"))) {
      if (shapeAimMode === "moving" || !shapePos) {
        setShapePos(pos);
      } else {
        const angle = Math.atan2(pos.y - shapePos.y, pos.x - shapePos.x);
        setShapeRotation(angle);
      }
    }
  };

  const handleMeasureContextMenu = (e: KonvaEventObject<MouseEvent>) => {
    if (measureMode !== "distance") return;
    e.evt.preventDefault();
    setMeasureLine(null);
  };

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomBy(SCALE_BY),
    zoomOut: () => zoomBy(1 / SCALE_BY),
  }));

  const gridLine: { points: number[]; key: string }[] = [];
  if (imgSize) {
    const offX = ((gridOffsetX % gridSize) + gridSize) % gridSize;
    const offY = ((gridOffsetY % gridSize) + gridSize) % gridSize;
    for (let x = offX; x <= drawWidth; x += gridSize) {
      gridLine.push({ points: [x, 0, x, drawHeight], key: `v${x}` });
    }
    for (let y = offY; y <= drawHeight; y += gridSize) {
      gridLine.push({ points: [0, y, drawWidth, y], key: `h${y}` });
    }
  }

  useEffect(() => {
    if (!backgroundUrl) {
      setImgSize(null);
      setImgElement(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImgElement(img);
    };
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Intentionally only re-centers when a new image loads, not on resize

  useEffect(() => {
    if (imgSize && stageRef.current) {
      stageRef.current.scale({ x: 1, y: 1 });
      stageRef.current.position({
        x: Math.round(containerSize.width - drawWidth) / 2,
        y: Math.round(containerSize.height - drawHeight) / 2,
      });
    }
  }, [imgElement]);

  useEffect(() => {
    if (!imgSize || !gridSize || !onMapReady) return;
    const width = Math.floor(drawWidth / gridSize);
    const height = Math.floor(drawHeight / gridSize);
    onMapReady({ width, height });
  }, [imgSize, drawWidth, drawHeight, gridSize, onMapReady]);

  useEffect(() => {
    if (measureMode !== "distance") {
      setMeasureLine(null);
    }
    const isShape =
      measureMode &&
      (measureMode.startsWith("square-") ||
        measureMode.startsWith("circle-") ||
        measureMode.startsWith("cone-") ||
        measureMode.startsWith("line-"));
    if (!isShape) {
      setShapePos(null);
    }
    setShapeAimMode("moving");
    setShapeRotation(0);
  }, [measureMode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        cursor: measureMode ? "crosshair" : "default",
      }}
    >
      {imgElement && (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          draggable={measureMode === null}
          onWheel={handleWheel}
          onClick={handleMeasureClick}
          onTap={handleMeasureClick}
          onMouseMove={handleMeasureMouseMove}
          onContextmenu={handleMeasureContextMenu}
          dragBoundFunc={(pos) => {
            const stage = stageRef.current;
            const currentScale = stage ? stage.scaleX() : 1;
            return clampPosition(pos, currentScale);
          }}
        >
          <Layer>
            <KonvaImage image={imgElement} width={drawWidth} height={drawHeight} />
            {showGrid &&
              gridLine.map((line) => (
                <Line key={line.key} points={line.points} stroke={GRID_COLOR} strokeWidth={2} />
              ))}

            {participants.map((p) => {
              if (!p.cell) return null;
              const size = p.size ?? 1;
              const centerX = p.cell.x + (size - 1) / 2;
              const centerY = p.cell.y + (size - 1) / 2;
              const { x, y } = cellToPixel(centerX, centerY, gridSize, gridOffsetX, gridOffsetY);
              const renderX = Math.round(x);
              const renderY = Math.round(y);
              const radius = size * gridSize * 0.4;
              const fontSize = Math.max(10, gridSize / 5);
              const mapCols = Math.floor(drawWidth / gridSize);
              const mapRows = Math.floor(drawHeight / gridSize);

              return (
                <Group
                  key={p.id}
                  x={renderX}
                  y={renderY}
                  draggable={measureMode === null}
                  onDragStart={(e: KonvaEventObject<DragEvent>) => {
                    e.cancelBubble = true;
                  }}
                  onDragEnd={(e: KonvaEventObject<DragEvent>) => {
                    const dropX = e.target.x();
                    const dropY = e.target.y();
                    const snapped = snapToCenter(
                      dropX,
                      dropY,
                      size,
                      gridSize,
                      gridOffsetX,
                      gridOffsetY,
                    );
                    const clampedCol = Math.max(0, Math.min(mapCols - size, snapped.col));
                    const clampedRow = Math.max(0, Math.min(mapRows - size, snapped.row));
                    const newCell = { x: clampedCol, y: clampedRow };
                    const occupied = participants.some(
                      (other) =>
                        other.id !== p.id &&
                        other.cell &&
                        tokensOverLap(newCell, size, other.cell, other.size ?? 1),
                    );
                    if (occupied) {
                      e.target.position({ x, y });
                      return;
                    }
                    onMoveToken?.(p.id, newCell);
                  }}
                >
                  <Circle
                    radius={radius}
                    fill={p.type === "monster" ? "#dd1414" : "#3498db"}
                    stroke="black"
                    strokeWidth={1}
                  />
                  <Text
                    text={p.name}
                    fontSize={fontSize}
                    fill="white"
                    align="center"
                    width={size * gridSize}
                    offsetX={(size * gridSize) / 2}
                    offsetY={-radius - 4}
                  />
                </Group>
              );
            })}

            {participants.map((p) => {
              if (!p.cell || !(p.statuses ?? []).length) return null;
              const size = p.size ?? 1;
              const centerX = p.cell.x + (size - 1) / 2;
              const centerY = p.cell.y + (size - 1) / 2;
              const { x, y } = cellToPixel(centerX, centerY, gridSize, gridOffsetX, gridOffsetY);
              const renderX = Math.round(x);
              const renderY = Math.round(y);
              const radius = size * gridSize * 0.4;
              return (
                <Circle
                  key={`${p.id}-ring`}
                  x={renderX}
                  y={renderY}
                  radius={radius + 5}
                  fill="transparent"
                  stroke="#e67e22"
                  strokeWidth={3}
                  dash={[6, 4]}
                  onClick={(e: KonvaEventObject<MouseEvent>) => {
                    e.cancelBubble = true;
                    setStatusPopup({
                      statuses: p.statuses ?? [],
                      x: renderX,
                      y: renderY - radius - 20,
                    });
                  }}
                />
              );
            })}

            {statusPopup && (
              <Label x={statusPopup.x} y={statusPopup.y}>
                <Tag fill="rgba(20,20,20,0.92)" cornerRadius={6} stroke="#e67e22" strokeWidth={1} />
                <Text
                  text={statusPopup.statuses
                    .map(
                      (s) =>
                        `${s.name} (${s.turnsRemaining}t)${s.effect_summary ? `\n  ${s.effect_summary}` : ""}`,
                    )
                    .join("\n\n")}
                  padding={8}
                  fontSize={12}
                  fill="white"
                  width={220}
                  wrap="word"
                  lineHeight={1.4}
                  listening={false}
                />
              </Label>
            )}

            {measureLine &&
              gridSize > 0 &&
              (() => {
                const dx = measureLine.end.x - measureLine.anchor.x;
                const dy = measureLine.end.y - measureLine.anchor.y;
                const lengthPx = Math.sqrt(dx * dx + dy * dy);
                const lengthFt = (lengthPx * 5) / gridSize;
                const midX = (measureLine.anchor.x + measureLine.end.x) / 2;
                const midY = (measureLine.anchor.y + measureLine.end.y) / 2;
                return (
                  <>
                    <Line
                      points={[
                        measureLine.anchor.x,
                        measureLine.anchor.y,
                        measureLine.end.x,
                        measureLine.end.y,
                      ]}
                      stroke="#3498db"
                      strokeWidth={3}
                      dash={[10, 6]}
                      listening={false}
                    />
                    <Label x={midX} y={midY} listening={false}>
                      <Tag fill="rgba(34, 34, 34, 0.9)" cornerRadius={4} />
                      <Text
                        text={`${lengthFt.toFixed(1)} ft`}
                        padding={6}
                        fontSize={14}
                        fill="white"
                        fontStyle="bold"
                      />
                    </Label>
                  </>
                );
              })()}

            {shapePos &&
              gridSize > 0 &&
              (() => {
                const parsed = parseMeasureMode(measureMode);
                if (!parsed) return null;
                const fillColor = "rgba(52, 152, 219, 0.3)";
                const strokeColor = "#3498db";
                const rotationDeg = (shapeRotation * 180) / Math.PI;

                if (parsed.kind === "square") {
                  const sidePx = ((parsed.size ?? 0) * gridSize) / 5;
                  return (
                    <Rect
                      x={shapePos.x - sidePx / 2}
                      y={shapePos.y - sidePx / 2}
                      width={sidePx}
                      height={sidePx}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={2}
                      listening={false}
                    />
                  );
                }

                if (parsed.kind === "circle") {
                  const radiusPx = ((parsed.size ?? 0) * gridSize) / 5;
                  return (
                    <Circle
                      x={shapePos.x}
                      y={shapePos.y}
                      radius={radiusPx}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={2}
                      listening={false}
                    />
                  );
                }

                if (parsed.kind === "cone") {
                  const lengthPx = ((parsed.size ?? 0) * gridSize) / 5;
                  const halfWidth = lengthPx / 2;
                  return (
                    <>
                      <Line
                        points={[0, 0, lengthPx, -halfWidth, lengthPx, halfWidth]}
                        x={shapePos.x}
                        y={shapePos.y}
                        rotation={rotationDeg}
                        closed
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={2}
                        listening={false}
                      />
                      <Circle
                        x={shapePos.x}
                        y={shapePos.y}
                        radius={4}
                        fill={shapeAimMode === "rotating" ? "#e67e22" : strokeColor}
                        listening={false}
                      />
                    </>
                  );
                }

                if (parsed.kind === "line") {
                  const lengthPx = ((parsed.length ?? 0) * gridSize) / 5;
                  const widthPx = ((parsed.width ?? 0) * gridSize) / 5;
                  return (
                    <>
                      <Rect
                        x={shapePos.x}
                        y={shapePos.y}
                        width={lengthPx}
                        height={widthPx}
                        offsetY={widthPx / 2}
                        rotation={rotationDeg}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={2}
                        listening={false}
                      />
                      <Circle
                        x={shapePos.x}
                        y={shapePos.y}
                        radius={4}
                        fill={shapeAimMode === "rotating" ? "#e67e22" : strokeColor}
                        listening={false}
                      />
                    </>
                  );
                }

                return null;
              })()}
          </Layer>
        </Stage>
      )}
    </div>
  );
});

export default MapCanvas;
