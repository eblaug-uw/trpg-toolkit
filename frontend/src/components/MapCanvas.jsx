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

function cellToPixel(cellX, cellY, gridSize, gridOffsetX, gridOffsetY) {
  const offX = ((gridOffsetX % gridSize) + gridSize) % gridSize;
  const offY = ((gridOffsetY % gridSize) + gridSize) % gridSize;
  return {
    x: Math.round(offX + cellX * gridSize + gridSize / 2),
    y: Math.round(offY + cellY * gridSize + gridSize / 2),
  };
}

function parseMeasureMode(mode) {
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
function snapToCenter(px, py, size, gridSize, gridOffsetX, gridOffsetY) {
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

function tokensOverLap(aCell, aSize, bCell, bSize) {
  return (
    aCell.x < bCell.x + bSize &&
    aCell.x + aSize > bCell.x &&
    aCell.y < bCell.y + bSize &&
    aCell.y + aSize > bCell.y
  );
}
const MapCanvas = forwardRef(
  (
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
  ) => {
    /* --States-- */
    const stageRef = useRef(null);
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [imgSize, setImgSize] = useState(null); // { width, height } of the loaded map's natural pixels
    const [imgElement, setImgElement] = useState(null); // HTMLImageElement handed to <KonvaImage>
    const [measureLine, setMeasureLine] = useState(null);
    const [shapePos, setShapePos] = useState(null);
    const [shapeRotation, setShapeRotation] = useState(0);
    const [shapeAimMode, setShapeAimMode] = useState("moving");
    const [statusPopup, setStatusPopup] = useState(null);

    /* --Constants-- */
    const SCALE_BY = 1.05;
    const GRID_COLOR = "rgba(0,0,0,0.6)";

    const handleWheel = (e) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();

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

    const zoomBy = (factor) => {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      const oldScale = stage.scaleX();
      const newScale = Math.max(minScale, Math.min(maxScale, oldScale * factor));

      const center = {
        x: containerSize.width / 2,
        y: containerSize.height / 2,
      };

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

    const getStagePointerPos = () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      const scale = stage.scaleX();
      return {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale,
      };
    };

    const handleMeasureClick = () => {
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
          // rotating: angle from origin to cursor
          const angle = Math.atan2(pos.y - shapePos.y, pos.x - shapePos.x);
          setShapeRotation(angle);
        }
      }
    };

    const handleMeasureContextMenu = (e) => {
      if (measureMode !== "distance") return;
      e.evt.preventDefault();
      setMeasureLine(null);
    };

    useImperativeHandle(ref, () => ({
      zoomIn: () => zoomBy(SCALE_BY),
      zoomOut: () => zoomBy(1 / SCALE_BY),
    }));
    // Compute draw dimensions: scale up small maps to "cover" the viewport,
    // leave maps that are already bigger than the viewport at natural size.
    const scale = imgSize
      ? Math.max(
          1,
          Math.max(containerSize.width / imgSize.width, containerSize.height / imgSize.height),
        )
      : 1;
    const drawWidth = imgSize ? imgSize.width * scale : 0;
    const drawHeight = imgSize ? imgSize.height * scale : 0;

    const gridLine = [];
    if (imgSize) {
      const offX = ((gridOffsetX % gridSize) + gridSize) % gridSize;
      const offY = ((gridOffsetY % gridSize) + gridSize) % gridSize;

      for (let x = offX; x <= drawWidth; x += gridSize) {
        const px = Math.round(x);
        gridLine.push({ points: [x, 0, x, drawHeight], key: `v${x}` });
      }
      for (let y = offY; y <= drawHeight; y += gridSize) {
        const py = Math.round(y);
        gridLine.push({ points: [0, y, drawWidth, y], key: `h${y}` });
      }
    }

    const fitScale =
      imgSize && containerSize.width > 0 && drawWidth > 0
        ? Math.min(containerSize.width / drawWidth, containerSize.height / drawHeight)
        : 1;
    const minScale = Math.min(1, fitScale);
    const maxScale = 1;

    const clampPosition = (pos, currentScale) => {
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

    /* --Effects-- */
    // Whenever the user picks a new map, load it as an Image and capture
    // both the HTMLImageElement (for Konva) and its natural pixel dimensions.
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

    // Keep windowSize state in sync with the browser viewport.
    // Cleanup removes the listener when the component unmounts.
    useEffect(() => {
      if (!containerRef.current) return;

      const observer = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width, height });
      });

      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, []);

    // Center the Stage on the image whenever a new map loads
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

    /* --Render-- */
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
                if (!p.cell) {
                  return null;
                }
                const size = p.size ?? 1;
                const centerX = p.cell.x + (size - 1) / 2;
                const centerY = p.cell.y + (size - 1) / 2;
                const { x, y } = cellToPixel(centerX, centerY, gridSize, gridOffsetX, gridOffsetY);
                const renderX = Math.round(x);
                const renderY = Math.round(y);
                const radius = size * gridSize * 0.4;
                const fontSize = Math.max(10, gridSize / 5);
                const activeStatuses = p.statuses ?? [];
                const statusCount = activeStatuses.length;
                const statusBadgeRadius = Math.max(8, Math.min(13, radius * 0.34));
                const statusBadgeOffset = radius * 0.66;

                const mapCols = Math.floor(drawWidth / gridSize);
                const mapRows = Math.floor(drawHeight / gridSize);

                return (
                  <Group
                    key={p.id}
                    x={renderX}
                    y={renderY}
                    draggable={measureMode === null}
                    onDragStart={(e) => {
                      e.cancelBubble = true;
                    }}
                    onMouseEnter={() => {
                      if (statusCount > 0) {
                        setStatusPopup({
                          x: renderX + radius + 10,
                          y: renderY - radius,
                          statuses: activeStatuses,
                        });
                      }
                    }}
                    onMouseLeave={() => setStatusPopup(null)}
                    onDragEnd={(e) => {
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
                    {statusCount > 0 && (
                      <Circle
                        radius={radius + 5}
                        stroke="#a855f7"
                        strokeWidth={3}
                        dash={[8, 5]}
                        opacity={0.95}
                        shadowColor="#a855f7"
                        shadowBlur={14}
                        listening={false}
                      />
                    )}
                    <Circle
                      radius={radius}
                      fill={p.type === "monster" ? "#dd1414" : "#3498db"}
                      stroke={statusCount > 0 ? "#f5d0fe" : "black"}
                      strokeWidth={statusCount > 0 ? 2 : 1}
                    />
                    {statusCount > 0 && (
                      <>
                        <Circle
                          x={statusBadgeOffset}
                          y={-statusBadgeOffset}
                          radius={statusBadgeRadius}
                          fill="#6b4eff"
                          stroke="white"
                          strokeWidth={1}
                          shadowColor="black"
                          shadowBlur={5}
                          listening={false}
                        />
                        <Text
                          x={statusBadgeOffset - statusBadgeRadius}
                          y={-statusBadgeOffset - statusBadgeRadius * 0.65}
                          text={String(statusCount)}
                          width={statusBadgeRadius * 2}
                          fontSize={Math.max(9, statusBadgeRadius * 1.05)}
                          fill="white"
                          align="center"
                          fontStyle="bold"
                          listening={false}
                        />
                      </>
                    )}
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

              {statusPopup && (
                <Label x={statusPopup.x} y={statusPopup.y} listening={false}>
                  <Tag fill="rgba(35, 26, 54, 0.94)" cornerRadius={5} />
                  <Text
                    text={statusPopup.statuses
                      .map((status) => `${status.name} (${status.turnsRemaining}t)`)
                      .join("\n")}
                    padding={7}
                    fontSize={13}
                    fill="white"
                    lineHeight={1.25}
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
                    const sidePx = (parsed.size * gridSize) / 5;
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
                    const radiusPx = (parsed.size * gridSize) / 5;
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
                    // D&D 5e cone: at distance L from origin, the cone is L wide
                    const lengthPx = (parsed.size * gridSize) / 5;
                    const halfWidth = lengthPx / 2;
                    return (
                      <>
                        <Line
                          points={[
                            0,
                            0, // origin
                            lengthPx,
                            -halfWidth, // top corner
                            lengthPx,
                            halfWidth, // bottom corner
                          ]}
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
                    const lengthPx = (parsed.length * gridSize) / 5;
                    const widthPx = (parsed.width * gridSize) / 5;
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
  },
);

export default MapCanvas;
