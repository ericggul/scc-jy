"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PopulationStateId } from "./model";

const MAX_VISIBLE_MARKS = 900;

function allocateAgeMarks(cohorts: number[], target: number) {
  const total = cohorts.reduce((sum, value) => sum + value, 0);
  if (target <= 0 || total <= 0) return [];
  const allocations = cohorts.map((value, age) => {
    const exact = (value / total) * target;
    return { age, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = target - allocations.reduce((sum, item) => sum + item.count, 0);
  for (const item of [...allocations].sort((a, b) => b.remainder - a.remainder || a.age - b.age)) {
    if (remaining <= 0) break;
    item.count += 1;
    remaining -= 1;
  }
  return allocations.flatMap(({ age, count }) => Array.from({ length: count }, () => age));
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

function personDimensions(age: number, juvenile: boolean, cell: number) {
  if (juvenile) {
    const progress = Math.min(Math.max(age / 17, 0), 1);
    return { width: cell * (0.38 + progress * 0.18), height: cell * (0.48 + progress * 0.42) };
  }
  const bandAge = Math.floor(age / 5) * 5;
  const seniorLoss = Math.max(0, bandAge - 60) / 50;
  return { width: cell * (0.53 + Math.min(bandAge, 50) / 500), height: cell * (0.9 - seniorLoss * 0.16) };
}

function GlyphDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <symbol id={`${prefix}-person`} viewBox="0 0 24 32">
        <circle cx="12" cy="5.3" r="4.1" fill="currentColor" />
        <path d="M7.1 11.2C7.1 9.7 8.4 8.5 10 8.5h4c1.6 0 2.9 1.2 2.9 2.7v8.1h-2.3V32h-4.8V19.3H7.1v-8.1Z" fill="currentColor" />
        <path d="M7.6 11.2 2.8 21.8M16.4 11.2l4.8 10.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.1" />
      </symbol>
      <symbol id={`${prefix}-grave`} viewBox="0 0 28 32">
        <path d="M6 30V12C6 5.9 9.5 2 14 2s8 3.9 8 10v18H6Z" fill="currentColor" />
        <path d="M10 12h8M14 8v8" fill="none" stroke="#f3f2ee" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M2 30h24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      </symbol>
    </defs>
  );
}

export function PopulationGlyphField({
  cohorts,
  count,
  state,
}: {
  cohorts?: number[];
  count: number;
  state: PopulationStateId;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const targetMarks = Math.min(MAX_VISIBLE_MARKS, Math.max(0, Math.round(count)));
  const ages = useMemo(
    () => state === "deceased"
      ? Array.from({ length: targetMarks }, () => 0)
      : allocateAgeMarks(cohorts ?? [], targetMarks),
    [cohorts, state, targetMarks],
  );
  const itemCount = state === "partnered" ? Math.ceil(ages.length / 2) : ages.length;
  const usableWidth = Math.max(size.width - 48, 1);
  const usableHeight = Math.max(size.height - 72, 1);
  const columns = Math.max(1, Math.ceil(Math.sqrt(itemCount * (usableWidth / usableHeight))));
  const rows = Math.max(1, Math.ceil(itemCount / columns));
  const cellWidth = usableWidth / columns;
  const cellHeight = usableHeight / rows;
  const cell = Math.min(cellWidth, cellHeight);
  const offsetX = (size.width - columns * cellWidth) / 2;
  const offsetY = 28;
  const dense = count > MAX_VISIBLE_MARKS;
  const symbolPrefix = `population-${state}`;

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      <svg aria-hidden="true" width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`}>
        <GlyphDefs prefix={symbolPrefix} />
        {state === "partnered"
          ? Array.from({ length: itemCount }, (_, itemIndex) => {
              const firstAge = ages[itemIndex * 2] ?? 30;
              const secondAge = ages[itemIndex * 2 + 1];
              const column = itemIndex % columns;
              const row = Math.floor(itemIndex / columns);
              const centerX = offsetX + column * cellWidth + cellWidth / 2;
              const bottom = offsetY + row * cellHeight + cellHeight * 0.92;
              const first = personDimensions(firstAge, false, cell);
              const second = personDimensions(secondAge ?? firstAge, false, cell);
              return (
                <g key={`pair-${itemIndex}`} opacity={dense ? 0.74 : 1}>
                  <use href={`#${symbolPrefix}-person`} x={centerX - first.width * 0.86} y={bottom - first.height} width={first.width} height={first.height} />
                  {secondAge === undefined ? null : <use href={`#${symbolPrefix}-person`} x={centerX - second.width * 0.14} y={bottom - second.height} width={second.width} height={second.height} />}
                </g>
              );
            })
          : ages.map((age, index) => {
              const column = index % columns;
              const row = Math.floor(index / columns);
              const centerX = offsetX + column * cellWidth + cellWidth / 2;
              const bottom = offsetY + row * cellHeight + cellHeight * 0.92;
              const dimensions = state === "deceased"
                ? { width: cell * 0.58, height: cell * 0.78 }
                : personDimensions(age, state === "juvenile", cell);
              return (
                <use
                  key={`${state}-${age}-${index}`}
                  href={state === "deceased" ? `#${symbolPrefix}-grave` : `#${symbolPrefix}-person`}
                  x={centerX - dimensions.width / 2}
                  y={bottom - dimensions.height}
                  width={dimensions.width}
                  height={dimensions.height}
                  opacity={dense ? 0.74 : 1}
                />
              );
            })}
      </svg>
    </div>
  );
}
