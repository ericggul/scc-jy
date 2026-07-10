"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GRID_SIZE,
  lifeProfiles,
  VISIBLE_COLUMNS,
  VISIBLE_ROWS,
} from "./data";
import { useCalendarSocket } from "./use-calendar-socket";

type GridOrigin = { row: number; column: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatProfileDate(isoDate: string) {
  return isoDate.replaceAll("-", ".");
}

function profileIdsAt(origin: GridOrigin) {
  return Array.from({ length: VISIBLE_ROWS }, (_, rowOffset) =>
    Array.from({ length: VISIBLE_COLUMNS }, (_, columnOffset) => {
      const index = (origin.row + rowOffset) * GRID_SIZE + origin.column + columnOffset;
      return lifeProfiles[index]?.id;
    }),
  ).flat().filter((id): id is string => Boolean(id));
}

export default function CalendarOneMobile() {
  const scrollRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [origin, setOrigin] = useState<GridOrigin>({ row: 0, column: 0 });
  const selectedProfileIds = useMemo(
    () => profileIdsAt(origin),
    [origin],
  );
  const { connected, sendSelection } = useCalendarSocket({ role: "mobile" });

  useEffect(() => {
    if (!connected) return;
    sendSelection(selectedProfileIds, {
      ...origin,
      rows: VISIBLE_ROWS,
      columns: VISIBLE_COLUMNS,
    });
  }, [connected, origin, selectedProfileIds, sendSelection]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  function updateSelectionFromScroll() {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const element = scrollRef.current;
      if (!element) return;
      const cellWidth = element.clientWidth / VISIBLE_COLUMNS;
      const cellHeight = element.clientHeight / VISIBLE_ROWS;
      const next = {
        row: clamp(Math.round(element.scrollTop / cellHeight), 0, GRID_SIZE - VISIBLE_ROWS),
        column: clamp(
          Math.round(element.scrollLeft / cellWidth),
          0,
          GRID_SIZE - VISIBLE_COLUMNS,
        ),
      };
      setOrigin((current) =>
        current.row === next.row && current.column === next.column ? current : next,
      );
    });
  }

  return (
    <main
      ref={scrollRef}
      className="h-dvh w-dvw snap-both snap-mandatory overflow-scroll bg-[#f3f6f8] text-[#101214] overscroll-none"
      onScroll={updateSelectionFromScroll}
    >
      <section
        aria-label="2,500명의 생애 명부"
        className="grid w-max"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, calc(100dvw / ${VISIBLE_COLUMNS}))`,
        }}
      >
        {lifeProfiles.map((profile) => (
          <article
            key={profile.id}
            className="grid snap-start content-center border-b border-r border-[#aeb9c0] bg-[#f8fafb] px-[clamp(6px,2vw,14px)] py-1 font-sans"
            style={{
              height: `calc(100dvh / ${VISIBLE_ROWS})`,
              width: `calc(100dvw / ${VISIBLE_COLUMNS})`,
            }}
          >
            <h1 className="truncate text-[clamp(12px,3.8vw,19px)] font-semibold leading-none tracking-[-0.04em]">
              {profile.name}
            </h1>
            <dl className="mt-[clamp(3px,0.65dvh,7px)] grid gap-[2px] font-mono text-[clamp(8px,2.35vw,12px)] leading-none tabular-nums text-[#4d5960]">
              <div className="grid grid-cols-[1em_1fr] gap-1">
                <dt aria-label="출생">○</dt>
                <dd>{formatProfileDate(profile.birthDate)}</dd>
              </div>
              <div className="grid grid-cols-[1em_1fr] gap-1 text-[#111416]">
                <dt aria-label="사망">●</dt>
                <dd>{formatProfileDate(profile.deathDate)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
