"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createSocialStorySystem,
  stepSocialStorySystem,
} from "../model/social-stories";
import type { StoryInfluence } from "../model/types";
import styles from "./story-tray.module.css";

const REFERENCE_STORY_SIZE = 93;
const DEFAULT_ICON_SIZE = 50;
const MIN_ICON_SIZE = 28;
const MAX_ICON_SIZE = REFERENCE_STORY_SIZE;
const DEFAULT_STORY_GAP = 32;
const MAX_STORY_GAP = 80;
const STORY_LABEL_HEIGHT = 20;
const SIMULATION_STEP_MILLISECONDS = 210;

type GridSize = {
  columns: number;
  rows: number;
};

type StageSize = {
  width: number;
  height: number;
};

type StorySurface = "empty" | "white";

type InfluenceGeometry = {
  id: string;
  path: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

const surfaceOptions: readonly { label: string; value: StorySurface }[] = [
  { label: "empty", value: "empty" },
  { label: "white", value: "white" },
];

function getGridSize(
  width: number,
  height: number,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
): GridSize {
  return {
    columns: Math.max(1, Math.floor((width + storyGap) / (storySize + storyGap))),
    rows: Math.max(1, Math.floor((height + storyGap) / (storyRowHeight + storyGap))),
  };
}

function getSurfaceStyle(surface: StorySurface): CSSProperties {
  if (surface === "empty") return { backgroundColor: "#242a2f" };
  return { backgroundColor: "#fff" };
}

function storyCenter(
  index: number,
  stage: StageSize,
  grid: GridSize,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
) {
  const gridWidth = grid.columns * storySize + (grid.columns - 1) * storyGap;
  const gridHeight = grid.rows * storyRowHeight + (grid.rows - 1) * storyGap;
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);

  return {
    x: (stage.width - gridWidth) / 2 + storySize / 2 + column * (storySize + storyGap),
    y: (stage.height - gridHeight) / 2 + storySize / 2 + row * (storyRowHeight + storyGap),
  };
}

function getInfluenceGeometry(
  influence: StoryInfluence,
  stage: StageSize,
  grid: GridSize,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
): InfluenceGeometry | null {
  const source = storyCenter(influence.source, stage, grid, storySize, storyRowHeight, storyGap);
  const target = storyCenter(influence.target, stage, grid, storySize, storyRowHeight, storyGap);
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 1) return null;

  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const edgeOffset = Math.min(storySize * 0.48, distance * 0.28);
  const startX = source.x + unitX * edgeOffset;
  const startY = source.y + unitY * edgeOffset;
  const endX = target.x - unitX * edgeOffset;
  const endY = target.y - unitY * edgeOffset;
  const bendDirection = (influence.source * 17 + influence.target * 13) % 2 === 0 ? 1 : -1;
  const bend = Math.min(18, distance * 0.16) * bendDirection;
  const controlX = (startX + endX) / 2 - unitY * bend;
  const controlY = (startY + endY) / 2 + unitX * bend;

  return {
    id: influence.id,
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    startX,
    startY,
    endX,
    endY,
  };
}

export function InstagramSocialStoryTray() {
  const gridRef = useRef<HTMLUListElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ columns: 1, rows: 1 });
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [testSurface, setTestSurface] = useState<StorySurface>("empty");
  const [iconSize, setIconSize] = useState(DEFAULT_ICON_SIZE);
  const [storyGap, setStoryGap] = useState(DEFAULT_STORY_GAP);
  const [showLabels, setShowLabels] = useState(false);
  const [system, setSystem] = useState(() => createSocialStorySystem(1, 1));
  const storyRowHeight = iconSize + (showLabels ? STORY_LABEL_HEIGHT : 0);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridSize = () => {
      const nextStage = { width: grid.clientWidth, height: grid.clientHeight };
      const nextGrid = getGridSize(
        nextStage.width,
        nextStage.height,
        iconSize,
        storyRowHeight,
        storyGap,
      );
      setStageSize((current) => (
        current.width === nextStage.width && current.height === nextStage.height ? current : nextStage
      ));
      setGridSize((current) => (
        current.columns === nextGrid.columns && current.rows === nextGrid.rows ? current : nextGrid
      ));
    };

    updateGridSize();
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [iconSize, storyGap, storyRowHeight]);

  useEffect(() => {
    let nextSystem = createSocialStorySystem(gridSize.columns, gridSize.rows, Date.now());
    let timer: number;
    let active = true;

    const scheduleStep = () => {
      timer = window.setTimeout(() => {
        if (!active) return;
        if (document.visibilityState !== "hidden") {
          nextSystem = stepSocialStorySystem(nextSystem, Date.now());
          setSystem(nextSystem);
        }
        scheduleStep();
      }, SIMULATION_STEP_MILLISECONDS);
    };

    timer = window.setTimeout(() => {
      if (!active) return;
      setSystem(nextSystem);
      scheduleStep();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [gridSize]);

  const gridStyle = {
    "--grid-columns": gridSize.columns,
    "--grid-rows": gridSize.rows,
    "--story-size": `${iconSize}px`,
    "--story-row-height": `${storyRowHeight}px`,
    "--story-gap": `${storyGap}px`,
    "--story-ring-padding": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-separator": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
  } as CSSProperties;
  const influenceGeometry = useMemo(() => system.influences.map((influence) => (
    getInfluenceGeometry(influence, stageSize, gridSize, iconSize, storyRowHeight, storyGap)
  )).filter((influence): influence is InfluenceGeometry => influence !== null), [
    gridSize,
    iconSize,
    stageSize,
    storyGap,
    storyRowHeight,
    system.influences,
  ]);

  return (
    <main aria-label="Instagram stories influenced by nearby stories" className={styles.screen}>
      <section className={styles.gridStage}>
        {stageSize.width > 0 && stageSize.height > 0 ? (
          <svg aria-hidden="true" className={styles.influenceLayer} viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}>
            <defs>
              {influenceGeometry.map((influence) => (
                <linearGradient gradientUnits="userSpaceOnUse" id={`influence-${influence.id}`} key={influence.id} x1={influence.startX} x2={influence.endX} y1={influence.startY} y2={influence.endY}>
                  <stop offset="0%" stopColor="#ffbd5b" stopOpacity="0.16" />
                  <stop offset="62%" stopColor="#fa4aa5" stopOpacity="0.76" />
                  <stop offset="100%" stopColor="#ffd06a" stopOpacity="1" />
                </linearGradient>
              ))}
            </defs>
            {influenceGeometry.map((influence) => (
              <g className={styles.influence} key={influence.id}>
                <path className={styles.influencePath} d={influence.path} pathLength="1" stroke={`url(#influence-${influence.id})`} />
                <circle className={styles.influenceTarget} cx={influence.endX} cy={influence.endY} r="2.25" />
              </g>
            ))}
          </svg>
        ) : null}
        <ul className={styles.storyGrid} ref={gridRef} style={gridStyle}>
          {system.nodes.map((story) => {
            const storyState = system.states[story.index];
            const isEmpty = storyState?.status === "empty";
            const isNew = storyState?.status === "new";
            const isViewing = storyState?.status === "viewing";
            const isLeaving = storyState?.status === "leaving";

            return (
              <li className={styles.gridItem} key={story.id}>
                <span className={`${styles.story} ${isEmpty ? styles.storyEmpty : isLeaving ? styles.storyLeaving : ""}`}>
                  <span className={`${styles.storyRing} ${isNew ? styles.storyRingNew : isViewing ? styles.storyRingViewing : styles.storyRingPlain}`}>
                    <span aria-hidden="true" className={styles.logoSurface} style={getSurfaceStyle(testSurface)} />
                  </span>
                  {showLabels ? <span className={styles.storyLabel}>{story.handle}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Story surface test" className={styles.controls}>
        <div className={styles.controlActions}>
          <div className={styles.actions}>
            {surfaceOptions.map((option) => (
              <button aria-pressed={testSurface === option.value} key={option.value} onClick={() => setTestSurface(option.value)} type="button">
                {option.label}
              </button>
            ))}
            <button aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)} type="button">
              text {showLabels ? "active" : "inactive"}
            </button>
          </div>
          <label className={styles.sizeControl}>
            <span>size</span>
            <input aria-label="Story icon size" max={MAX_ICON_SIZE} min={MIN_ICON_SIZE} onChange={(event) => setIconSize(Number(event.currentTarget.value))} step="1" type="range" value={iconSize} />
            <output>{iconSize}px</output>
          </label>
          <label className={styles.sizeControl}>
            <span>margin</span>
            <input aria-label="Space between story icons" max={MAX_STORY_GAP} min="0" onChange={(event) => setStoryGap(Number(event.currentTarget.value))} step="1" type="range" value={storyGap} />
            <output>{storyGap}px</output>
          </label>
        </div>
      </section>
    </main>
  );
}
