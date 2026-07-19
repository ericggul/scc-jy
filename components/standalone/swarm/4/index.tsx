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
  scaleCursorFieldSettings,
  settleCursorField,
  stepCursorField,
  SWARM_FOUR_SETTINGS,
  type CellAnchor,
  type CursorAgent,
  type CursorFieldSettings,
  type CursorMotionProfile,
  type Grid,
} from "./model";

type CursorSwarmProps = {
  cursorCount: number;
  cursorScale: number;
  settings: CursorFieldSettings;
  initialCollisionPrevention?: boolean;
  initialGoldfish?: boolean;
  sideGoldfishView?: boolean;
  motionProfile?: CursorMotionProfile;
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

type FieldTheme = "light" | "dark";
type AgentGlyph = "cursor" | "goldfish";
type GridMark = "dot" | "cross";

type FieldPalette = {
  paper: string;
  ink: string;
  selectedCell: string;
  grid: string;
  goldfish: string;
};

const CURSOR_TIP_ANGLE = Math.atan2(-8.4, -5.2);
const FIELD_PALETTES: Record<FieldTheme, FieldPalette> = {
  light: {
    paper: "#f4f4f1",
    ink: "#11110f",
    selectedCell: "#11110f",
    grid: "rgba(17, 17, 15, 0.58)",
    goldfish: "#9e782e",
  },
  dark: {
    paper: "#0d0e0d",
    ink: "#eceee8",
    selectedCell: "#eceee8",
    grid: "rgba(236, 238, 232, 0.52)",
    goldfish: "#d8b66a",
  },
};

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

function drawGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  palette: FieldPalette,
  sideView = false,
) {
  const angle = Math.atan2(cursor.vy, cursor.vx);
  const sideTilt = Math.max(
    -0.28,
    Math.min(0.28, Math.atan2(cursor.vy, Math.max(18, Math.abs(cursor.vx)))),
  );
  const sideYawScale =
    0.04 + Math.min(1, Math.abs(cursor.vx) / 24) * 0.96;

  context.save();
  context.translate(cursor.x, cursor.y);
  if (sideView) {
    context.scale(
      (cursor.vx >= 0 ? 1 : -1) * cursorScale * sideYawScale,
      cursorScale,
    );
    context.rotate(sideTilt);
  } else {
    context.rotate(angle);
    context.scale(cursorScale, cursorScale);
  }
  context.fillStyle = palette.goldfish;

  context.beginPath();
  context.moveTo(6.4, 0);
  context.bezierCurveTo(4.1, -3.9, -1.9, -4.45, -5.45, -1.7);
  context.quadraticCurveTo(-6.25, 0, -5.45, 1.7);
  context.bezierCurveTo(-1.9, 4.45, 4.1, 3.9, 6.4, 0);
  context.fill();

  context.beginPath();
  context.moveTo(-5.15, -1.62);
  context.lineTo(-10.3, -5.15);
  context.lineTo(-8.55, 0);
  context.lineTo(-10.3, 5.15);
  context.lineTo(-5.15, 1.62);
  context.closePath();
  context.fill();

  context.fillStyle = palette.paper;
  context.beginPath();
  context.arc(4.05, -1.05, 0.58, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: Grid,
  anchors: readonly CellAnchor[],
  palette: FieldPalette,
  gridMark: GridMark,
) {
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, width, height);

  const selectedCells = getAnchoredCells(anchors, grid, width, height);
  if (selectedCells.length > 0) {
    context.fillStyle = palette.selectedCell;
    for (const selectedCell of selectedCells) {
      context.fillRect(
        selectedCell.x,
        selectedCell.y,
        selectedCell.width,
        selectedCell.height,
      );
    }
  }

  if (gridMark === "dot") {
    context.fillStyle = palette.grid;

    for (let column = 0; column <= grid.columns; column += 1) {
      const x = Math.round(grid.originX + column * grid.cellSize);

      for (let row = 0; row <= grid.rows; row += 1) {
        const y = Math.round(grid.originY + row * grid.cellSize);
        context.fillRect(x, y, 1, 1);
      }
    }

    return;
  }

  context.strokeStyle = palette.grid;
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
  initialGoldfish = false,
  sideGoldfishView = false,
  motionProfile = "cursor",
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
  const themeRef = useRef<FieldTheme>("dark");
  const agentGlyphRef = useRef<AgentGlyph>(
    initialGoldfish ? "goldfish" : "cursor",
  );
  const gridMarkRef = useRef<GridMark>("dot");
  const agentScaleRef = useRef(1);
  const constraintSettingsRef = useRef(scaleCursorFieldSettings(settings, 1));
  const [activeCursorCount, setActiveCursorCount] = useState(cursorCount);
  const [collisionPrevention, setCollisionPrevention] = useState(
    initialCollisionPrevention,
  );
  const [theme, setTheme] = useState<FieldTheme>("dark");
  const [agentGlyph, setAgentGlyph] = useState<AgentGlyph>(
    initialGoldfish ? "goldfish" : "cursor",
  );
  const [agentScale, setAgentScale] = useState(1);
  const [gridMark, setGridMark] = useState<GridMark>("dot");

  const updateCollisionPrevention = (enabled: boolean) => {
    collisionPreventionRef.current = enabled;
    setCollisionPrevention(enabled);
  };

  const updateTheme = (darkMode: boolean) => {
    const nextTheme: FieldTheme = darkMode ? "dark" : "light";
    themeRef.current = nextTheme;
    setTheme(nextTheme);
  };

  const updateAgentGlyph = (goldfish: boolean) => {
    const nextGlyph: AgentGlyph = goldfish ? "goldfish" : "cursor";
    agentGlyphRef.current = nextGlyph;
    setAgentGlyph(nextGlyph);
  };

  const updateAgentScale = (nextScale: number) => {
    agentScaleRef.current = nextScale;
    constraintSettingsRef.current = scaleCursorFieldSettings(settings, nextScale);
    setAgentScale(nextScale);
  };

  const updateGridMark = (crossMark: boolean) => {
    const nextMark: GridMark = crossMark ? "cross" : "dot";
    gridMarkRef.current = nextMark;
    setGridMark(nextMark);
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
        constraintSettingsRef.current,
        collisionPreventionRef.current,
        motionProfile,
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
          FIELD_PALETTES[themeRef.current],
          gridMarkRef.current,
        );
      }
    },
    [motionProfile],
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
        constraintSettingsRef.current,
        motionProfile,
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
        constraintSettingsRef.current,
        collisionPreventionRef.current,
        motionProfile,
      );

      drawField(
        backgroundContext,
        bounds.width,
        bounds.height,
        grid,
        selectionRef.current,
        FIELD_PALETTES[themeRef.current],
        gridMarkRef.current,
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
          constraintSettingsRef.current,
          collisionPreventionRef.current,
          agentScaleRef.current,
          motionProfile,
        );
      }

      context.clearRect(0, 0, width, height);
      const palette = FIELD_PALETTES[themeRef.current];
      const effectiveCursorScale = cursorScale * agentScaleRef.current;
      context.fillStyle = palette.ink;
      for (const cursor of cursorsRef.current) {
        if (agentGlyphRef.current === "goldfish") {
          drawGoldfish(
            context,
            cursor,
            effectiveCursorScale,
            palette,
            sideGoldfishView,
          );
        } else {
          drawCursor(context, cursor, effectiveCursorScale);
        }
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
  }, [
    activeCursorCount,
    cursorScale,
    motionProfile,
    settings,
    sideGoldfishView,
  ]);

  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    const grid = gridRef.current;
    const backgroundContext = backgroundCanvas?.getContext("2d");
    if (!canvas || !grid || !backgroundContext) return;

    drawField(
      backgroundContext,
      canvas.clientWidth,
      canvas.clientHeight,
      grid,
      selectionRef.current,
      FIELD_PALETTES[theme],
      gridMark,
    );
  }, [theme, gridMark]);

  const finishTrace = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tracePointRef.current = null;
  };

  return (
    <main className={styles.page} data-theme={theme}>
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
                FIELD_PALETTES[themeRef.current],
                gridMarkRef.current,
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
      <section className={styles.controlBar} aria-label="Field controls">
        {controls ? (
          <>
            <label className={styles.cursorCountControl}>
              <span>
                cursors <output>{activeCursorCount}</output>
              </span>
              <input
                aria-label="Cursor count"
                max={controls.maxCursorCount}
                min={controls.minCursorCount}
                onChange={(event) =>
                  setActiveCursorCount(Number(event.target.value))
                }
                step={controls.cursorCountStep}
                type="range"
                value={activeCursorCount}
              />
            </label>
            <label className={styles.collisionControl}>
              <input
                checked={collisionPrevention}
                onChange={(event) =>
                  updateCollisionPrevention(event.target.checked)
                }
                type="checkbox"
              />
              <span>avoid overlap</span>
            </label>
          </>
        ) : null}
        <label className={styles.glyphSizeControl}>
          <span>
            scale <output>{agentScale.toFixed(2)}×</output>
          </span>
          <input
            aria-label="Agent scale"
            max="2"
            min="0.5"
            onChange={(event) => updateAgentScale(Number(event.target.value))}
            step="0.05"
            type="range"
            value={agentScale}
          />
        </label>
        <label className={styles.themeControl}>
          <input
            checked={theme === "dark"}
            onChange={(event) => updateTheme(event.target.checked)}
            type="checkbox"
          />
          <span>dark mode</span>
        </label>
        <label className={styles.glyphControl}>
          <input
            checked={agentGlyph === "goldfish"}
            onChange={(event) => updateAgentGlyph(event.target.checked)}
            type="checkbox"
          />
          <span>goldfish</span>
        </label>
        <label className={styles.gridMarkControl}>
          <input
            checked={gridMark === "cross"}
            onChange={(event) => updateGridMark(event.target.checked)}
            type="checkbox"
          />
          <span>corner +</span>
        </label>
      </section>
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
