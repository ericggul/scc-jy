"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import styles from "./swarm.module.css";
import {
  createCursorField,
  createGrid,
  getAnchoredCells,
  getCellAtPoint,
  settleCursorField,
  stepCursorField,
  SWARM_FOUR_SETTINGS,
  type CellAnchor,
  type CursorAgent,
  type CursorFieldSettings,
  type Grid,
} from "./model";

type CursorSwarmProps = {
  cursorCount: number;
  cursorScale: number;
  settings: CursorFieldSettings;
  initialCollisionPrevention?: boolean;
  controls?: {
    minCursorCount: number;
    maxCursorCount: number;
    cursorCountStep: number;
  };
};

type TracePoint = {
  x: number;
  y: number;
};

const CURSOR_TIP_ANGLE = Math.atan2(-8.4, -5.2);

function drawCursor(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
) {
  const angle = Math.atan2(cursor.vy, cursor.vx) - CURSOR_TIP_ANGLE;

  context.save();
  context.translate(cursor.x, cursor.y);
  context.rotate(angle);
  context.scale(cursorScale, cursorScale);
  context.beginPath();
  context.moveTo(-5.2, -8.4);
  context.lineTo(5.5, 0.3);
  context.lineTo(1.1, 1.5);
  context.lineTo(4.4, 7.2);
  context.lineTo(2.2, 8.5);
  context.lineTo(-1.2, 2.9);
  context.lineTo(-4.1, 5.7);
  context.closePath();
  context.fill();
  context.restore();
}

function drawField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: Grid,
  anchors: readonly CellAnchor[],
) {
  context.fillStyle = "#f4f4f1";
  context.fillRect(0, 0, width, height);

  const selectedCells = getAnchoredCells(anchors, grid, width, height);
  if (selectedCells.length > 0) {
    context.fillStyle = "#11110f";
    for (const selectedCell of selectedCells) {
      context.fillRect(
        selectedCell.x,
        selectedCell.y,
        selectedCell.width,
        selectedCell.height,
      );
    }
  }

  context.strokeStyle = "rgba(17, 17, 15, 0.58)";
  context.lineWidth = 1;
  context.beginPath();

  for (let column = 0; column <= grid.columns; column += 1) {
    const x = Math.round(grid.originX + column * grid.cellSize) + 0.5;

    for (let row = 0; row <= grid.rows; row += 1) {
      const y = Math.round(grid.originY + row * grid.cellSize) + 0.5;
      context.moveTo(x - 2.25, y);
      context.lineTo(x + 2.25, y);
      context.moveTo(x, y - 2.25);
      context.lineTo(x, y + 2.25);
    }
  }

  context.stroke();
}

function getTracePoints(
  previousPoint: TracePoint,
  nextPoint: TracePoint,
  cellSize: number,
) {
  const distance = Math.hypot(
    nextPoint.x - previousPoint.x,
    nextPoint.y - previousPoint.y,
  );
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, cellSize / 3)));

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return {
      x: previousPoint.x + (nextPoint.x - previousPoint.x) * progress,
      y: previousPoint.y + (nextPoint.y - previousPoint.y) * progress,
    };
  });
}

function getCellKey(column: number, row: number) {
  return `${column}:${row}`;
}

export function CursorSwarm({
  cursorCount,
  cursorScale,
  settings,
  initialCollisionPrevention = true,
  controls,
}: CursorSwarmProps) {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const cursorsRef = useRef<CursorAgent[]>([]);
  const gridRef = useRef<Grid | null>(null);
  const selectionRef = useRef<CellAnchor[]>([]);
  const tracePointRef = useRef<TracePoint | null>(null);
  const collisionPreventionRef = useRef(initialCollisionPrevention);
  const [activeCursorCount, setActiveCursorCount] = useState(cursorCount);
  const [collisionPrevention, setCollisionPrevention] = useState(
    initialCollisionPrevention,
  );

  const updateCollisionPrevention = (enabled: boolean) => {
    collisionPreventionRef.current = enabled;
    setCollisionPrevention(enabled);
  };

  const selectTrace = useCallback(
    (points: readonly TracePoint[]) => {
      const canvas = cursorCanvasRef.current;
      const grid = gridRef.current;
      if (!canvas || !grid || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        return;
      }

      const currentSelections = selectionRef.current;
      const existingCellKeys = new Set(
        getAnchoredCells(
          currentSelections,
          grid,
          canvas.clientWidth,
          canvas.clientHeight,
        ).map((cell) => getCellKey(cell.column, cell.row)),
      );
      const nextSelections = [...currentSelections];

      for (const point of points) {
        const cell = getCellAtPoint(point.x, point.y, grid);
        const cellKey = getCellKey(cell.column, cell.row);
        if (existingCellKeys.has(cellKey)) continue;

        existingCellKeys.add(cellKey);
        nextSelections.push({
          xRatio: cell.centerX / canvas.clientWidth,
          yRatio: cell.centerY / canvas.clientHeight,
        });
      }

      if (nextSelections.length === currentSelections.length) return;

      selectionRef.current = nextSelections;
      const selectedCells = getAnchoredCells(
        nextSelections,
        grid,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      cursorsRef.current = settleCursorField(
        cursorsRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
        selectedCells,
        settings,
        collisionPreventionRef.current,
      );

      const backgroundCanvas = backgroundCanvasRef.current;
      const backgroundContext = backgroundCanvas?.getContext("2d");
      if (backgroundContext) {
        drawField(
          backgroundContext,
          canvas.clientWidth,
          canvas.clientHeight,
          grid,
          nextSelections,
        );
      }
    },
    [settings],
  );

  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    if (!canvas || !backgroundCanvas) return;

    const context = canvas.getContext("2d");
    const backgroundContext = backgroundCanvas.getContext("2d");
    if (!context || !backgroundContext) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let elapsedSeconds = 0;

    const sizeCanvases = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const grid = createGrid(bounds.width, bounds.height, settings);

      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      backgroundCanvas.width = Math.round(bounds.width * pixelRatio);
      backgroundCanvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      gridRef.current = grid;
      cursorsRef.current = createCursorField(
        activeCursorCount,
        bounds.width,
        bounds.height,
        settings,
      );
      const selectedCells = getAnchoredCells(
        selectionRef.current,
        grid,
        bounds.width,
        bounds.height,
      );

      cursorsRef.current = settleCursorField(
        cursorsRef.current,
        bounds.width,
        bounds.height,
        selectedCells,
        settings,
        collisionPreventionRef.current,
      );

      drawField(
        backgroundContext,
        bounds.width,
        bounds.height,
        grid,
        selectionRef.current,
      );
    };

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;
      const grid = gridRef.current;

      if (!reduceMotion.matches && grid) {
        elapsedSeconds += deltaSeconds;
        const selectedCells = getAnchoredCells(
          selectionRef.current,
          grid,
          width,
          height,
        );
        cursorsRef.current = stepCursorField(
          cursorsRef.current,
          width,
          height,
          deltaSeconds,
          elapsedSeconds,
          selectedCells,
          settings,
          collisionPreventionRef.current,
        );
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#11110f";
      for (const cursor of cursorsRef.current) {
        drawCursor(context, cursor, cursorScale);
      }

      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvases();
    const resizeObserver = new ResizeObserver(sizeCanvases);
    resizeObserver.observe(canvas);
    frameRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [activeCursorCount, cursorScale, settings]);

  const finishTrace = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tracePointRef.current = null;
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={backgroundCanvasRef}
        className={styles.backgroundCanvas}
        aria-hidden="true"
      />
      <canvas
        ref={cursorCanvasRef}
        className={styles.cursorCanvas}
        aria-label="A field of moving mouse cursors. Click or drag across cells to make a continuous black trace and gather cursor groups around every selected cell."
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          const point = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          tracePointRef.current = point;
          selectTrace([point]);
        }}
        onPointerMove={(event) => {
          const previousPoint = tracePointRef.current;
          if (!previousPoint || !event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }

          const bounds = event.currentTarget.getBoundingClientRect();
          const nextPoint = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          selectTrace(
            getTracePoints(
              previousPoint,
              nextPoint,
              gridRef.current?.cellSize ?? settings.cellMin,
            ),
          );
          tracePointRef.current = nextPoint;
        }}
        onPointerUp={finishTrace}
        onPointerCancel={finishTrace}
        onLostPointerCapture={() => {
          tracePointRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            selectionRef.current = [];
            const backgroundCanvas = backgroundCanvasRef.current;
            const grid = gridRef.current;
            const backgroundContext = backgroundCanvas?.getContext("2d");
            if (backgroundCanvas && grid && backgroundContext) {
              drawField(
                backgroundContext,
                event.currentTarget.clientWidth,
                event.currentTarget.clientHeight,
                grid,
                [],
              );
            }
            return;
          }

          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectTrace([
            {
              x: event.currentTarget.clientWidth / 2,
              y: event.currentTarget.clientHeight / 2,
            },
          ]);
        }}
      />
      {controls ? (
        <section className={styles.controlBar} aria-label="Cursor configuration">
          <label className={styles.cursorCountControl}>
            <span>
              cursors <output>{activeCursorCount}</output>
            </span>
            <input
              aria-label="Cursor count"
              max={controls.maxCursorCount}
              min={controls.minCursorCount}
              onChange={(event) => setActiveCursorCount(Number(event.target.value))}
              step={controls.cursorCountStep}
              type="range"
              value={activeCursorCount}
            />
          </label>
          <label className={styles.collisionControl}>
            <input
              checked={collisionPrevention}
              onChange={(event) => updateCollisionPrevention(event.target.checked)}
              type="checkbox"
            />
            <span>avoid overlap</span>
          </label>
        </section>
      ) : null}
    </main>
  );
}

export default function SwarmFour() {
  return (
    <CursorSwarm
      cursorCount={200}
      cursorScale={1}
      settings={SWARM_FOUR_SETTINGS}
      initialCollisionPrevention={false}
      controls={{
        minCursorCount: 50,
        maxCursorCount: 1000,
        cursorCountStep: 50,
      }}
    />
  );
}
