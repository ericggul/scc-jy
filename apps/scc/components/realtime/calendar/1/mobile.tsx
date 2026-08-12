"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GRID_COLUMNS,
  GRID_ROWS,
  lifeProfilesInSnakeOrder,
  lifeProfilesSortedByName,
  MOBILE_GRID_COLUMNS,
  MOBILE_GRID_ROWS,
  POPULATION_SIZE,
  SELECTION_ROWS,
  VISIBLE_COLUMNS,
  VISIBLE_ROWS,
} from "./data";
import { useCalendarSocket } from "./use-calendar-socket";

const OVERSCAN_ROWS = 8;
const FOCUS_ROW = Math.floor(VISIBLE_ROWS * 0.42);
const SCROLL_ROW_STEP = 4;
const SELECTION_SEND_INTERVAL = 120;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function profileIdsAt(row: number, rowCount: number) {
  return Array.from({ length: rowCount }, (_, rowOffset) =>
    Array.from({ length: VISIBLE_COLUMNS }, (_, columnOffset) => {
      const index = (row + rowOffset) * GRID_COLUMNS + columnOffset;
      return lifeProfilesInSnakeOrder[index]?.id;
    }),
  ).flat().filter((id): id is string => Boolean(id));
}

export default function CalendarOneMobile() {
  const scrollRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const selectionTimerRef = useRef<number | null>(null);
  const lastSelectionSentAtRef = useRef(0);
  const pendingSelectionRef = useRef<{
    profileIds: readonly string[];
    row: number;
  } | null>(null);
  const [firstVisibleRow, setFirstVisibleRow] = useState(0);
  const focusVisualRow = Math.min(
    firstVisibleRow + FOCUS_ROW,
    MOBILE_GRID_ROWS - 1,
  );
  const selectionRow = Math.min(
    Math.floor(focusVisualRow * MOBILE_GRID_COLUMNS / GRID_COLUMNS),
    GRID_ROWS - SELECTION_ROWS,
  );
  const selectedProfileIds = useMemo(
    () => profileIdsAt(selectionRow, SELECTION_ROWS),
    [selectionRow],
  );
  const renderedProfiles = useMemo(() => {
    const firstRow = Math.max(0, firstVisibleRow - OVERSCAN_ROWS);
    const lastRow = Math.min(
      MOBILE_GRID_ROWS,
      firstVisibleRow + VISIBLE_ROWS + OVERSCAN_ROWS,
    );
    return {
      firstRow,
      profiles: lifeProfilesSortedByName.slice(
        firstRow * MOBILE_GRID_COLUMNS,
        lastRow * MOBILE_GRID_COLUMNS,
      ),
    };
  }, [firstVisibleRow]);
  const { connected, sendSelection } = useCalendarSocket({ role: "mobile" });

  useEffect(() => {
    if (!connected) {
      if (selectionTimerRef.current !== null) {
        window.clearTimeout(selectionTimerRef.current);
        selectionTimerRef.current = null;
      }
      return;
    }

    pendingSelectionRef.current = {
      profileIds: selectedProfileIds,
      row: selectionRow,
    };

    const sendLatestSelection = () => {
      selectionTimerRef.current = null;
      const selection = pendingSelectionRef.current;
      if (!selection) return;
      lastSelectionSentAtRef.current = performance.now();
      sendSelection(selection.profileIds, {
        row: selection.row,
        column: 0,
        rows: SELECTION_ROWS,
        columns: VISIBLE_COLUMNS,
        totalRows: GRID_ROWS,
        totalColumns: GRID_COLUMNS,
      });
    };

    const elapsed = performance.now() - lastSelectionSentAtRef.current;
    if (lastSelectionSentAtRef.current === 0 || elapsed >= SELECTION_SEND_INTERVAL) {
      sendLatestSelection();
      return;
    }

    if (selectionTimerRef.current === null) {
      selectionTimerRef.current = window.setTimeout(
        sendLatestSelection,
        SELECTION_SEND_INTERVAL - elapsed,
      );
    }
  }, [connected, selectedProfileIds, selectionRow, sendSelection]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
    }
  }, []);

  function updateSelectionFromScroll() {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const element = scrollRef.current;
      if (!element) return;
      const cellHeight = element.clientHeight / VISIBLE_ROWS;
      const rawRow = clamp(
        Math.round(element.scrollTop / cellHeight),
        0,
        MOBILE_GRID_ROWS - VISIBLE_ROWS,
      );
      const nextRow = Math.min(
        Math.round(rawRow / SCROLL_ROW_STEP) * SCROLL_ROW_STEP,
        MOBILE_GRID_ROWS - VISIBLE_ROWS,
      );
      setFirstVisibleRow((current) => current === nextRow ? current : nextRow);
    });
  }

  return (
    <main
      ref={scrollRef}
      className="h-dvh w-dvw overflow-x-hidden overflow-y-scroll overscroll-y-contain bg-white text-black"
      onScroll={updateSelectionFromScroll}
    >
      <section
        aria-label={`${POPULATION_SIZE.toLocaleString("ko-KR")}명의 가나다순 생애 명부`}
        className="relative w-full border-l border-t border-black bg-white text-black"
        style={{
          height: `${(MOBILE_GRID_ROWS / VISIBLE_ROWS) * 100}dvh`,
        }}
      >
        <div
          className="absolute inset-x-0 grid"
          style={{
            gridTemplateColumns: `repeat(${MOBILE_GRID_COLUMNS}, minmax(0, 1fr))`,
            top: `${(renderedProfiles.firstRow / VISIBLE_ROWS) * 100}dvh`,
          }}
        >
          {renderedProfiles.profiles.map((profile, index) => {
            const row = renderedProfiles.firstRow
              + Math.floor(index / MOBILE_GRID_COLUMNS);
            const isFocused = row === focusVisualRow;

            return (
              <article
                key={profile.id}
                className={`box-border flex min-w-0 items-center justify-center overflow-hidden border-b border-r border-black bg-white px-px text-center text-[clamp(9px,2.6vw,12px)] leading-none tracking-[-0.08em] transition-[border-width,font-weight] duration-150 ${
                  isFocused ? "border-y-2 font-semibold" : "font-normal"
                }`}
                style={{
                  fontFamily: '"AppleMyungjo", serif',
                  height: `calc(100dvh / ${VISIBLE_ROWS})`,
                }}
              >
                {profile.name}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
