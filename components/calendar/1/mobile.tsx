"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GRID_COLUMNS,
  GRID_ROWS,
  lifeProfilesInSnakeOrder,
  VISIBLE_COLUMNS,
  VISIBLE_ROWS,
} from "./data";
import { useCalendarSocket } from "./use-calendar-socket";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function profileIdsAt(row: number) {
  return Array.from({ length: VISIBLE_ROWS }, (_, rowOffset) =>
    Array.from({ length: VISIBLE_COLUMNS }, (_, columnOffset) => {
      const index = (row + rowOffset) * GRID_COLUMNS + columnOffset;
      return lifeProfilesInSnakeOrder[index]?.id;
    }),
  ).flat().filter((id): id is string => Boolean(id));
}

export default function CalendarOneMobile() {
  const scrollRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [firstVisibleRow, setFirstVisibleRow] = useState(0);
  const selectedProfileIds = useMemo(
    () => profileIdsAt(firstVisibleRow),
    [firstVisibleRow],
  );
  const { connected, sendSelection } = useCalendarSocket({ role: "mobile" });

  useEffect(() => {
    if (!connected) return;
    sendSelection(selectedProfileIds, {
      row: firstVisibleRow,
      column: 0,
      rows: VISIBLE_ROWS,
      columns: VISIBLE_COLUMNS,
      totalRows: GRID_ROWS,
      totalColumns: GRID_COLUMNS,
    });
  }, [connected, firstVisibleRow, selectedProfileIds, sendSelection]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  function updateSelectionFromScroll() {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const element = scrollRef.current;
      if (!element) return;
      const cellHeight = element.clientHeight / VISIBLE_ROWS;
      const nextRow = clamp(
        Math.round(element.scrollTop / cellHeight),
        0,
        GRID_ROWS - VISIBLE_ROWS,
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
        aria-label="2,500명의 가나다순 생애 명부"
        className="grid w-full border-l border-t border-black bg-white"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
        }}
      >
        {lifeProfilesInSnakeOrder.map((profile) => (
          <article
            key={profile.id}
            className="grid min-w-0 grid-cols-[38%_62%] overflow-hidden border-b border-r border-black bg-white"
            style={{
              fontFamily: '"AppleMyungjo", serif',
              height: `calc(100dvh / ${VISIBLE_ROWS})`,
            }}
          >
            <span className="flex h-full min-w-0 items-center justify-center truncate border-r border-black px-0.5 text-center text-[clamp(11px,2.6vw,14px)] font-normal leading-none tracking-[-0.075em]">
              {profile.name}
            </span>
            <span
              className="relative block h-full min-w-0 overflow-hidden text-[clamp(7px,1.65vw,9px)] font-normal leading-none tracking-[-0.06em] tabular-nums text-black"
              dir="ltr"
              style={{ fontFamily: '"AppleGothic", sans-serif' }}
            >
              <span
                style={{
                  left: "50%",
                  position: "absolute",
                  textAlign: "center",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.registrationNumber}
              </span>
            </span>
          </article>
        ))}
      </section>
    </main>
  );
}
