"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CvFirstSheet } from "../1";
import { generateCv, parametersFromPointer } from "../1/generator";
import { getCvStyle } from "../1/styles";
import type { CvDocument } from "../1/types";

const GRID_SIZE = 100;
const CENTER_INDEX = Math.floor(GRID_SIZE / 2);
const SETTLE_DELAY_MS = 140;
const RENDER_SPAN = 15;
const ZOOM_LEVELS = [0.1, 0.2, 0.35, 0.5, 0.7, 1, 1.3] as const;

type PageSize = {
  width: number;
  height: number;
};

type RenderRange = {
  startColumn: number;
  endColumn: number;
  startRow: number;
  endRow: number;
};

type GridCell = {
  id: string;
  column: number;
  row: number;
  xRatio: number;
  yRatio: number;
};

type CvTransform = (cv: CvDocument, cell: GridCell) => CvDocument;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBasePageSize(): PageSize {
  if (typeof window === "undefined") {
    return { width: 760, height: (760 * 297) / 210 };
  }

  const width = Math.min(window.innerWidth - 24, ((window.innerHeight - 24) * 210) / 297, 760);

  return {
    width: Math.max(180, width),
    height: (Math.max(180, width) * 297) / 210,
  };
}

function getRenderRange(plane: HTMLElement, pageSize: PageSize, zoom: number): RenderRange {
  const cellWidth = pageSize.width * zoom;
  const cellHeight = pageSize.height * zoom;
  const centerColumn = clamp(Math.floor((plane.scrollLeft + plane.clientWidth / 2) / cellWidth), 0, GRID_SIZE - 1);
  const centerRow = clamp(Math.floor((plane.scrollTop + plane.clientHeight / 2) / cellHeight), 0, GRID_SIZE - 1);
  const columnSpan = RENDER_SPAN;
  const rowSpan = RENDER_SPAN;
  const startColumn = clamp(Math.floor(centerColumn - columnSpan / 2), 0, Math.max(0, GRID_SIZE - columnSpan));
  const startRow = clamp(Math.floor(centerRow - rowSpan / 2), 0, Math.max(0, GRID_SIZE - rowSpan));

  return {
    startColumn,
    endColumn: Math.min(GRID_SIZE - 1, startColumn + columnSpan - 1),
    startRow,
    endRow: Math.min(GRID_SIZE - 1, startRow + rowSpan - 1),
  };
}

function createCells(range: RenderRange): GridCell[] {
  const cells: GridCell[] = [];

  for (let row = range.startRow; row <= range.endRow; row += 1) {
    for (let column = range.startColumn; column <= range.endColumn; column += 1) {
      cells.push({
        id: `cv2-${column}-${row}`,
        column,
        row,
        xRatio: column / (GRID_SIZE - 1),
        yRatio: row / (GRID_SIZE - 1),
      });
    }
  }

  return cells;
}

function CvPlaneCell({ cell, pageSize, zoom, transformCv }: { cell: GridCell; pageSize: PageSize; zoom: number; transformCv?: CvTransform }) {
  const parameters = parametersFromPointer(cell.xRatio, cell.yRatio);
  const generatedCv = generateCv(parameters);
  const cv = transformCv ? transformCv(generatedCv, cell) : generatedCv;
  const style = getCvStyle(cv.styleIndex);

  return (
    <section
      className="absolute grid place-items-start overflow-hidden"
      style={{
        left: cell.column * pageSize.width * zoom,
        top: cell.row * pageSize.height * zoom,
        width: pageSize.width * zoom,
        height: pageSize.height * zoom,
      }}
    >
      <div
        style={{
          width: pageSize.width,
          height: pageSize.height,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        <CvFirstSheet cv={cv} style={style} />
      </div>
      <div className="sr-only">
        Grid column {cell.column}, row {cell.row}. X parameter {cell.xRatio.toFixed(2)}, Y parameter {cell.yRatio.toFixed(2)}. {cv.yearsOfExperience} years in {cv.industry.label}; {cv.targetTitle}.
      </div>
    </section>
  );
}

export function CvPlane({ transformCv, label = "CV two" }: { transformCv?: CvTransform; label?: string }) {
  const planeRef = useRef<HTMLElement | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const renderFrameRef = useRef<number | null>(null);
  const settlingRef = useRef(false);
  const initialCenterRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(() => getBasePageSize());
  const [zoomIndex, setZoomIndex] = useState(3);
  const zoom = ZOOM_LEVELS[zoomIndex];
  const [renderRange, setRenderRange] = useState<RenderRange>({
    startColumn: CENTER_INDEX - 7,
    endColumn: CENTER_INDEX + 7,
    startRow: CENTER_INDEX - 7,
    endRow: CENTER_INDEX + 7,
  });
  const cells = useMemo(() => createCells(renderRange), [renderRange]);

  const centerOnCell = useCallback(
    (column: number, row: number, behavior: ScrollBehavior) => {
      const plane = planeRef.current;

      if (!plane) {
        return;
      }

      const cellWidth = pageSize.width * zoom;
      const cellHeight = pageSize.height * zoom;
      settlingRef.current = true;
      plane.scrollTo({
        left: column * cellWidth - (plane.clientWidth - cellWidth) / 2,
        top: row * cellHeight - (plane.clientHeight - cellHeight) / 2,
        behavior,
      });
      window.setTimeout(
        () => {
          settlingRef.current = false;
        },
        behavior === "smooth" ? 280 : 0,
      );
    },
    [pageSize.height, pageSize.width, zoom],
  );

  const updateRenderRange = useCallback(() => {
    const plane = planeRef.current;

    if (!plane) {
      return;
    }

    const nextRange = getRenderRange(plane, pageSize, zoom);
    setRenderRange((previousRange) => {
      if (
        previousRange.startColumn === nextRange.startColumn &&
        previousRange.endColumn === nextRange.endColumn &&
        previousRange.startRow === nextRange.startRow &&
        previousRange.endRow === nextRange.endRow
      ) {
        return previousRange;
      }

      return nextRange;
    });
  }, [pageSize, zoom]);

  const centerOnNearest = useCallback(
    (behavior: ScrollBehavior) => {
      const plane = planeRef.current;

      if (!plane) {
        return;
      }

      const cellWidth = pageSize.width * zoom;
      const cellHeight = pageSize.height * zoom;
      const column = clamp(Math.round((plane.scrollLeft + plane.clientWidth / 2 - cellWidth / 2) / cellWidth), 0, GRID_SIZE - 1);
      const row = clamp(Math.round((plane.scrollTop + plane.clientHeight / 2 - cellHeight / 2) / cellHeight), 0, GRID_SIZE - 1);
      centerOnCell(column, row, behavior);
    },
    [centerOnCell, pageSize.height, pageSize.width, zoom],
  );

  const changeZoom = useCallback(
    (direction: -1 | 1) => {
      const plane = planeRef.current;

      if (!plane) {
        return;
      }

      const cellWidth = pageSize.width * zoom;
      const cellHeight = pageSize.height * zoom;
      const centerColumn = clamp((plane.scrollLeft + plane.clientWidth / 2) / cellWidth, 0, GRID_SIZE - 1);
      const centerRow = clamp((plane.scrollTop + plane.clientHeight / 2) / cellHeight, 0, GRID_SIZE - 1);
      const nextZoomIndex = clamp(zoomIndex + direction, 0, ZOOM_LEVELS.length - 1);

      if (nextZoomIndex === zoomIndex) {
        return;
      }

      const nextZoom = ZOOM_LEVELS[nextZoomIndex];
      setZoomIndex(nextZoomIndex);
      requestAnimationFrame(() => {
        plane.scrollTo({
          left: centerColumn * pageSize.width * nextZoom - plane.clientWidth / 2,
          top: centerRow * pageSize.height * nextZoom - plane.clientHeight / 2,
          behavior: "instant",
        });
      });
    },
    [pageSize.height, pageSize.width, zoom, zoomIndex],
  );

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (!initialCenterRef.current) {
        centerOnCell(CENTER_INDEX, CENTER_INDEX, "instant");
        initialCenterRef.current = true;
      }

      updateRenderRange();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [centerOnCell, mounted, updateRenderRange]);

  useEffect(() => {
    const plane = planeRef.current;

    function handleScroll() {
      if (renderFrameRef.current === null) {
        renderFrameRef.current = requestAnimationFrame(() => {
          updateRenderRange();
          renderFrameRef.current = null;
        });
      }

      if (settlingRef.current) {
        return;
      }

      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }

      settleTimerRef.current = window.setTimeout(() => {
        centerOnNearest("smooth");
        settleTimerRef.current = null;
      }, SETTLE_DELAY_MS);
    }

    plane?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      plane?.removeEventListener("scroll", handleScroll);

      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }

      if (renderFrameRef.current !== null) {
        cancelAnimationFrame(renderFrameRef.current);
      }
    };
  }, [centerOnNearest, updateRenderRange]);

  useEffect(() => {
    function handleResize() {
      setPageSize(getBasePageSize());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    updateRenderRange();
  }, [updateRenderRange]);

  return (
    <main ref={planeRef} className="fixed inset-0 overflow-auto overscroll-contain bg-white text-black">
      {mounted ? (
        <>
          <div
            className="relative"
            style={
              {
                width: pageSize.width * zoom * GRID_SIZE,
                height: pageSize.height * zoom * GRID_SIZE,
                "--cv-page-width": `${pageSize.width}px`,
                "--cv-page-height": `${pageSize.height}px`,
              } as CSSProperties
            }
          >
            {cells.map((cell) => (
              <CvPlaneCell key={cell.id} cell={cell} pageSize={pageSize} zoom={zoom} transformCv={transformCv} />
            ))}
          </div>
          <div className="fixed bottom-3 left-3 z-20 flex items-center gap-1 border border-black bg-white text-black">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center border-r border-black text-[18px] leading-none disabled:text-[#999]"
              disabled={zoomIndex === 0}
              onClick={() => changeZoom(-1)}
              aria-label="Zoom out"
            >
              -
            </button>
            <p className="w-14 text-center text-[11px] font-bold tabular-nums">{Math.round(zoom * 100)}%</p>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center border-l border-black text-[18px] leading-none disabled:text-[#999]"
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              onClick={() => changeZoom(1)}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <div className="sr-only">
            {label} is a virtualized {GRID_SIZE} by {GRID_SIZE} plane. It renders {cells.length} nearby CV sheets out of {GRID_SIZE * GRID_SIZE} possible positions.
          </div>
        </>
      ) : null}
    </main>
  );
}

export default function CvTwo() {
  return <CvPlane />;
}
