"use client";

import type { CSSProperties } from "react";
import { memo, useEffect, useRef, useState } from "react";
import styles from "./grid-network.module.css";
import {
  createGridNetworkAutomaton,
  gridNetworkEdgeId,
  gridNetworkStatesDiffer,
  setGridNetworkBackgroundState,
  stepGridNetworkBackground,
  stepGridNetworkBorder,
  toneForState,
  type GridNetworkCell,
  type GridNetworkCellState,
} from "./model";

const BACKGROUND_STEP_MILLISECONDS = 76;
const BORDER_STEP_MILLISECONDS = 113;

type GridCellProps = Readonly<{
  cell: GridNetworkCell;
  backgroundState: GridNetworkCellState;
  borderState: GridNetworkCellState;
  eastVisible: boolean;
  southVisible: boolean;
  southEastVisible: boolean;
  northEastVisible: boolean;
  eastActive: boolean;
  southActive: boolean;
  southEastActive: boolean;
  northEastActive: boolean;
  columns: number;
  rows: number;
}>;

const GridCell = memo(function GridCell({
  cell,
  backgroundState,
  borderState,
  eastVisible,
  southVisible,
  southEastVisible,
  northEastVisible,
  eastActive,
  southActive,
  southEastActive,
  northEastActive,
  columns,
  rows,
}: GridCellProps) {
  const backgroundTone = toneForState(backgroundState);
  const borderTone = toneForState(borderState);

  return (
    <button
      className={styles.cell}
      data-column={cell.column}
      data-grid-cell=""
      data-row={cell.row}
      data-state={backgroundState}
      data-tone={backgroundTone}
      data-border-tone={borderTone}
      type="button"
      aria-label={`Row ${cell.row + 1}, column ${cell.column + 1}: ${backgroundTone} background, ${borderTone} diagonal border. Press to change the background.`}
    >
      {cell.column < columns - 1 && eastVisible && (
        <span
          className={styles.eastEdge}
          data-active={eastActive ? "true" : "false"}
          aria-hidden="true"
        />
      )}
      {cell.row < rows - 1 && southVisible && (
        <span
          className={styles.southEdge}
          data-active={southActive ? "true" : "false"}
          aria-hidden="true"
        />
      )}
      {cell.column < columns - 1 && cell.row < rows - 1 && southEastVisible && (
        <span
          className={styles.southEastEdge}
          data-active={southEastActive ? "true" : "false"}
          aria-hidden="true"
        />
      )}
      {cell.column < columns - 1 && cell.row > 0 && northEastVisible && (
        <span
          className={styles.northEastEdge}
          data-active={northEastActive ? "true" : "false"}
          aria-hidden="true"
        />
      )}
    </button>
  );
});

function cellAtEventTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>("button[data-grid-cell]");
  if (!button) return null;

  const column = Number(button.dataset.column);
  const row = Number(button.dataset.row);
  if (!Number.isInteger(column) || !Number.isInteger(row)) return null;

  return {
    column,
    row,
    state: button.dataset.state === "1" ? 1 : 0,
  } as const;
}

export default function GridNetworkOne() {
  const [automaton, setAutomaton] = useState(() => createGridNetworkAutomaton());
  const paintStateRef = useRef<GridNetworkCellState | null>(null);
  const gridStyle = {
    "--grid-columns": `${automaton.network.columns}`,
    "--grid-rows": `${automaton.network.rows}`,
  } as CSSProperties;

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let backgroundTimer: number | null = null;
    let borderTimer: number | null = null;
    let active = true;

    const stop = () => {
      if (backgroundTimer !== null) window.clearTimeout(backgroundTimer);
      if (borderTimer !== null) window.clearTimeout(borderTimer);
      backgroundTimer = null;
      borderTimer = null;
    };

    const scheduleBackground = () => {
      if (!active || reducedMotion.matches || document.visibilityState === "hidden") return;
      backgroundTimer = window.setTimeout(() => {
        if (!active) return;
        setAutomaton((current) => stepGridNetworkBackground(current));
        backgroundTimer = null;
        scheduleBackground();
      }, BACKGROUND_STEP_MILLISECONDS);
    };

    const scheduleBorder = () => {
      if (!active || reducedMotion.matches || document.visibilityState === "hidden") return;
      borderTimer = window.setTimeout(() => {
        if (!active) return;
        setAutomaton((current) => stepGridNetworkBorder(current));
        borderTimer = null;
        scheduleBorder();
      }, BORDER_STEP_MILLISECONDS);
    };

    const syncScheduler = () => {
      stop();
      scheduleBackground();
      scheduleBorder();
    };

    scheduleBackground();
    scheduleBorder();
    reducedMotion.addEventListener("change", syncScheduler);
    document.addEventListener("visibilitychange", syncScheduler);

    return () => {
      active = false;
      stop();
      reducedMotion.removeEventListener("change", syncScheduler);
      document.removeEventListener("visibilitychange", syncScheduler);
    };
  }, []);

  return (
    <main
      className={styles.page}
      onPointerCancel={() => {
        paintStateRef.current = null;
      }}
      onPointerLeave={() => {
        paintStateRef.current = null;
      }}
      onPointerUp={() => {
        paintStateRef.current = null;
      }}
    >
      <section
        className={styles.network}
        style={gridStyle}
        aria-label={`A ${automaton.network.columns} by ${automaton.network.rows} black and white cellular automaton. Backgrounds change from cardinal neighbours and inset borders change from diagonal neighbours. Press or drag across cells to set the background state.`}
        onPointerDown={(event) => {
          const cell = cellAtEventTarget(event.target);
          if (!cell) return;
          const state: GridNetworkCellState = cell.state === 1 ? 0 : 1;
          paintStateRef.current = state;
          setAutomaton((current) => (
            setGridNetworkBackgroundState(current, cell.column, cell.row, state)
          ));
        }}
        onPointerMove={(event) => {
          const state = paintStateRef.current;
          if ((event.buttons & 1) === 0 || state === null) return;
          const cell = cellAtEventTarget(event.target);
          if (!cell) return;
          setAutomaton((current) => (
            setGridNetworkBackgroundState(current, cell.column, cell.row, state)
          ));
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const cell = cellAtEventTarget(event.target);
          if (!cell) return;
          event.preventDefault();
          const state: GridNetworkCellState = cell.state === 1 ? 0 : 1;
          setAutomaton((current) => (
            setGridNetworkBackgroundState(current, cell.column, cell.row, state)
          ));
        }}
      >
        {automaton.network.cells.map((cell) => (
          <GridCell
            key={cell.id}
            cell={cell}
            backgroundState={automaton.backgroundStates[cell.index]! as GridNetworkCellState}
            borderState={automaton.borderStates[cell.index]! as GridNetworkCellState}
            eastVisible={gridNetworkStatesDiffer(
              automaton.backgroundStates,
              automaton.network,
              cell.column,
              cell.row,
              cell.column + 1,
              cell.row,
            )}
            southVisible={gridNetworkStatesDiffer(
              automaton.backgroundStates,
              automaton.network,
              cell.column,
              cell.row,
              cell.column,
              cell.row + 1,
            )}
            southEastVisible={gridNetworkStatesDiffer(
              automaton.borderStates,
              automaton.network,
              cell.column,
              cell.row,
              cell.column + 1,
              cell.row + 1,
            )}
            northEastVisible={gridNetworkStatesDiffer(
              automaton.borderStates,
              automaton.network,
              cell.column,
              cell.row,
              cell.column + 1,
              cell.row - 1,
            )}
            eastActive={automaton.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(
              cell.column,
              cell.row,
              cell.column + 1,
              cell.row,
            ))}
            southActive={automaton.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(
              cell.column,
              cell.row,
              cell.column,
              cell.row + 1,
            ))}
            southEastActive={automaton.borderInfluencedEdgeIds.has(gridNetworkEdgeId(
              cell.column,
              cell.row,
              cell.column + 1,
              cell.row + 1,
            ))}
            northEastActive={automaton.borderInfluencedEdgeIds.has(gridNetworkEdgeId(
              cell.column,
              cell.row,
              cell.column + 1,
              cell.row - 1,
            ))}
            columns={automaton.network.columns}
            rows={automaton.network.rows}
          />
        ))}
      </section>
    </main>
  );
}
