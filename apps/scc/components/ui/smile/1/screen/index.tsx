"use client";

import type { CSSProperties } from "react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createSmileAutomaton,
  getSmileVotes,
  SMILE_STEP_MILLISECONDS,
  stepSmileAutomaton,
} from "../model/data";
import type { SmileResponse, SmileVote } from "../model/types";
import styles from "./smile-grid.module.css";

type GridSize = {
  columns: number;
  rows: number;
};

const INITIAL_GRID_SIZE: GridSize = { columns: 1, rows: 1 };

function getGridSize(
  width: number,
  height: number,
  voteSize: number,
  gap: number,
): GridSize {
  return {
    columns: Math.max(1, Math.ceil((width + gap) / (voteSize + gap))),
    rows: Math.max(1, Math.ceil((height + gap) / (voteSize + gap))),
  };
}

type MouthGeometry = readonly [
  number, number,
  number, number, number, number, number, number,
  number, number, number, number, number, number,
  number, number, number, number, number, number,
  number, number, number, number, number, number,
];

const mouthGeometry: Record<SmileResponse, MouthGeometry> = {
  satisfied: [
    20, 36.75,
    21.35, 37.5, 22.1, 39.45, 23.9, 40.7,
    26.1, 42.25, 28.85, 43.15, 32, 43.15,
    35.15, 43.15, 37.9, 42.25, 40.1, 40.7,
    41.9, 39.45, 42.65, 37.5, 44, 36.75,
  ],
  neutral: [
    20, 40.65,
    21.35, 40.65, 22.1, 40.65, 23.9, 40.65,
    26.1, 40.65, 28.85, 40.65, 32, 40.65,
    35.15, 40.65, 37.9, 40.65, 40.1, 40.65,
    41.9, 40.65, 42.65, 40.65, 44, 40.65,
  ],
  dissatisfied: [
    20, 44.55,
    21.35, 43.8, 22.1, 41.85, 23.9, 40.6,
    26.1, 39.05, 28.85, 38.15, 32, 38.15,
    35.15, 38.15, 37.9, 39.05, 40.1, 40.6,
    41.9, 41.85, 42.65, 43.8, 44, 44.55,
  ],
};

const MOUTH_MORPH_MILLISECONDS = 500;

type MouthMorph = {
  path: SVGPathElement;
  from: MouthGeometry;
  to: MouthGeometry;
  startedAt: number;
};

const activeMouthMorphs = new Set<MouthMorph>();
let mouthMorphFrame: number | null = null;

function cubicPath(points: readonly number[], progress = 1) {
  const at = (index: number) => (
    points[index]! * progress
  );

  return `M${at(0)} ${at(1)} C${at(2)} ${at(3)} ${at(4)} ${at(5)} ${at(6)} ${at(7)} C${at(8)} ${at(9)} ${at(10)} ${at(11)} ${at(12)} ${at(13)} C${at(14)} ${at(15)} ${at(16)} ${at(17)} ${at(18)} ${at(19)} C${at(20)} ${at(21)} ${at(22)} ${at(23)} ${at(24)} ${at(25)}`;
}

function interpolateCubicPath(
  from: MouthGeometry,
  to: MouthGeometry,
  progress: number,
) {
  const points = from.map((value, index) => (
    value + (to[index]! - value) * progress
  ));
  return cubicPath(points);
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress ** 3
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

function renderMouthMorphs(timestamp: number) {
  mouthMorphFrame = null;

  for (const morph of activeMouthMorphs) {
    const progress = Math.min(
      1,
      (timestamp - morph.startedAt) / MOUTH_MORPH_MILLISECONDS,
    );
    morph.path.setAttribute(
      "d",
      interpolateCubicPath(morph.from, morph.to, easeInOutCubic(progress)),
    );

    if (progress === 1) {
      activeMouthMorphs.delete(morph);
    }
  }

  if (activeMouthMorphs.size > 0) {
    mouthMorphFrame = window.requestAnimationFrame(renderMouthMorphs);
  }
}

function startMouthMorph(
  path: SVGPathElement,
  from: MouthGeometry,
  to: MouthGeometry,
) {
  for (const morph of activeMouthMorphs) {
    if (morph.path === path) {
      activeMouthMorphs.delete(morph);
    }
  }

  path.setAttribute("d", cubicPath(from));
  const morph = { path, from, to, startedAt: window.performance.now() };
  activeMouthMorphs.add(morph);

  if (mouthMorphFrame === null) {
    mouthMorphFrame = window.requestAnimationFrame(renderMouthMorphs);
  }

  return () => {
    activeMouthMorphs.delete(morph);
  };
}

function FaceIcon({
  previousResponse,
  response,
}: {
  previousResponse: SmileResponse;
  response: SmileResponse;
}) {
  const shouldAnimateMouth = previousResponse !== response;
  const mouthRef = useRef<SVGPathElement>(null);

  useLayoutEffect(() => {
    if (!shouldAnimateMouth || !mouthRef.current) {
      return;
    }

    return startMouthMorph(
      mouthRef.current,
      mouthGeometry[previousResponse],
      mouthGeometry[response],
    );
  }, [previousResponse, response, shouldAnimateMouth]);

  return (
    <svg aria-hidden="true" className={styles.face} viewBox="0 0 64 64">
      <circle
        cx="32"
        cy="32"
        fill="none"
        r="24.5"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      <circle cx="23" cy="26" fill="currentColor" r="2.25" />
      <circle cx="41" cy="26" fill="currentColor" r="2.25" />
      <path
        className={styles.mouth}
        d={cubicPath(mouthGeometry[response])}
        ref={mouthRef}
      />
    </svg>
  );
}

const SmileVoteButton = memo(function SmileVoteButton({
  label,
  response,
}: Pick<SmileVote, "label" | "response">) {
  const previousResponseRef = useRef(response);
  const previousResponse = previousResponseRef.current;

  useEffect(() => {
    previousResponseRef.current = response;
  }, [response]);

  return (
    <button
      aria-label={label}
      className={styles.vote}
      data-response={response}
      type="button"
    >
      <FaceIcon previousResponse={previousResponse} response={response} />
    </button>
  );
});

export function SmileGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>(INITIAL_GRID_SIZE);
  const [automaton, setAutomaton] = useState(() => createSmileAutomaton(1, 1));

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    let animationFrame: number | null = null;
    const updateGridSize = () => {
      const vote = grid.querySelector<HTMLButtonElement>("button");
      if (!vote) return;

      const gridStyles = window.getComputedStyle(grid);
      const voteBounds = vote.getBoundingClientRect();
      const next = getGridSize(
        grid.clientWidth,
        grid.clientHeight,
        voteBounds.width,
        Number.parseFloat(gridStyles.columnGap),
      );

      setGridSize((current) => (
        current.columns === next.columns && current.rows === next.rows
          ? current
          : next
      ));
    };

    const scheduleGridSizeUpdate = () => {
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateGridSize();
      });
    };

    scheduleGridSizeUpdate();
    const observer = new ResizeObserver(scheduleGridSizeUpdate);
    observer.observe(grid);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setAutomaton((current) => (
      current.columns === gridSize.columns && current.rows === gridSize.rows
        ? current
        : createSmileAutomaton(gridSize.columns, gridSize.rows)
    ));
  }, [gridSize]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let interval: number | null = null;

    const advance = () => {
      if (motionQuery.matches) return;

      setAutomaton((current) => (
        current.columns === gridSize.columns && current.rows === gridSize.rows
          ? stepSmileAutomaton(current)
          : current
      ));
    };

    const updateInterval = () => {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }

      if (!motionQuery.matches) {
        interval = window.setInterval(advance, SMILE_STEP_MILLISECONDS);
      }
    };

    updateInterval();
    motionQuery.addEventListener("change", updateInterval);

    return () => {
      if (interval !== null) {
        window.clearInterval(interval);
      }
      motionQuery.removeEventListener("change", updateInterval);
    };
  }, [gridSize]);

  const votes = useMemo(
    () => getSmileVotes(automaton),
    [automaton],
  );
  const gridStyle = {
    "--vote-columns": gridSize.columns,
    "--vote-rows": gridSize.rows,
  } as CSSProperties;

  return (
    <main aria-label="Smile feedback field" className={styles.screen}>
      <div className={styles.voteGrid} ref={gridRef} style={gridStyle}>
        {votes.map((vote) => (
          <SmileVoteButton
            key={vote.id}
            label={vote.label}
            response={vote.response}
          />
        ))}
      </div>
    </main>
  );
}
