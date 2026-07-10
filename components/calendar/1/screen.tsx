"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { initialProfileIds, lifeProfiles } from "./data";
import {
  createLifeEventDefinitions,
  LifeEventStore,
} from "./event-store";
import type {
  CalendarSelection,
  LifeEventKind,
  MaterializedLifeEvent,
} from "./types";
import { useCalendarSocket } from "./use-calendar-socket";

type CalendarDay = {
  id: string;
  isoDate: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

type AnimatedLifeEvent = MaterializedLifeEvent & {
  animationIndex: number;
};

type CalendarViewMode = "compact" | "cell";

const rapidRegister = keyframes`
  0% {
    opacity: 0;
    transform: translate3d(0, -7px, 0) scaleX(0.84);
  }

  38% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scaleX(1.055);
  }

  64% {
    transform: translate3d(2px, 0, 0) scaleX(0.985);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scaleX(1);
  }
`;

const EventCard = styled.div<{ $animate: boolean; $delay: number }>`
  animation: ${({ $animate }) =>
    $animate
      ? css`${rapidRegister} 260ms cubic-bezier(0.2, 0.9, 0.25, 1.15) both`
      : "none"};
  animation-delay: ${({ $delay }) => `${$delay}ms`};
  transform-origin: left center;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CalendarCell = styled.article<{
  $background: string;
  $foreground: string;
}>`
  position: relative;
  isolation: isolate;
  background: ${({ $background }) => $background};
  color: ${({ $foreground }) => $foreground};

  > :not([data-cell-color]) {
    position: relative;
    z-index: 1;
  }
`;

function AnimatedCalendarCell({
  baseBackground,
  children,
  className,
  eventBackground,
  foreground,
  transitionToken,
}: {
  baseBackground: string;
  children: ReactNode;
  className: string;
  eventBackground: string | null;
  foreground: string;
  transitionToken: string;
}) {
  const colorRef = useRef<HTMLDivElement | null>(null);
  const previousBackgroundRef = useRef<string | null>(null);

  useEffect(() => {
    const colorLayer = colorRef.current;
    if (!colorLayer) {
      return;
    }

    colorLayer.getAnimations().forEach((animation) => animation.cancel());
    const previousBackground = previousBackgroundRef.current;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      colorLayer.style.background = eventBackground ?? "transparent";
      colorLayer.style.opacity = eventBackground ? "1" : "0";
      previousBackgroundRef.current = eventBackground;
      return;
    }

    let cancelled = false;

    async function transitionColor(layer: HTMLDivElement) {
      const currentOpacity = Number.parseFloat(getComputedStyle(layer).opacity);

      if (!eventBackground) {
        layer.style.opacity = "0";
        if (currentOpacity > 0.01) {
          layer.animate(
            [{ opacity: currentOpacity }, { opacity: 0 }],
            { duration: 150, easing: "ease-out" },
          );
        }
        previousBackgroundRef.current = null;
        return;
      }

      if (previousBackground && previousBackground !== eventBackground) {
        const fadeOut = layer.animate(
          [{ opacity: currentOpacity }, { opacity: 0 }],
          { duration: 90, easing: "ease-in", fill: "forwards" },
        );
        await fadeOut.finished.catch(() => undefined);
        if (cancelled) return;
      }

      layer.style.background = eventBackground;
      layer.style.opacity = "1";
      layer.animate(
        [
          {
            opacity: previousBackground === eventBackground
              ? currentOpacity
              : 0.52,
          },
          { opacity: 1 },
        ],
        {
          duration: previousBackground === eventBackground ? 140 : 220,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        },
      );
      previousBackgroundRef.current = eventBackground;
    }

    void transitionColor(colorLayer);

    return () => {
      cancelled = true;
      colorLayer.style.opacity = getComputedStyle(colorLayer).opacity;
      colorLayer.getAnimations().forEach((animation) => animation.cancel());
    };
  }, [eventBackground, transitionToken]);

  return (
    <CalendarCell
      $background={baseBackground}
      $foreground={foreground}
      className={className}
    >
      <div
        ref={colorRef}
        data-cell-color
        aria-hidden="true"
        style={{
          background: "transparent",
          inset: 0,
          opacity: 0,
          pointerEvents: "none",
          position: "absolute",
          zIndex: 0,
        }}
      />
      {children}
    </CalendarCell>
  );
}

const eventStore = new LifeEventStore(
  createLifeEventDefinitions(lifeProfiles),
  lifeProfiles,
);
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});
const eventLabels: Record<LifeEventKind, string> = {
  birth: "태어남",
  birthday: "생일",
  death: "죽음",
  memorial: "기일",
};
const eventToneClasses: Record<LifeEventKind, string> = {
  birth: "border-[#4f8df6] bg-[#eef5ff] text-[#174ea6]",
  birthday: "border-[#50a46f] bg-[#effaf3] text-[#137333]",
  death: "border-[#222222] bg-[#f3f4f4] text-[#202124]",
  memorial: "border-[#9871f2] bg-[#f5f0ff] text-[#5f3dc4]",
};
const darkEventToneClasses: Record<LifeEventKind, string> = {
  birth: "border-[#2f66c8] bg-[#101b2c] text-[#8ab4f8]",
  birthday: "border-[#2e7d4f] bg-[#102118] text-[#81c995]",
  death: "border-[#5f6368] bg-[#202124] text-[#e8eaed]",
  memorial: "border-[#6f55c9] bg-[#1e1831] text-[#c3b4ff]",
};

const cellColors: Record<"light" | "dark", Record<LifeEventKind, string>> = {
  light: {
    birth: "#d8e8ff",
    birthday: "#d9f2e2",
    death: "#cfd3d6",
    memorial: "#ece5f7",
  },
  dark: {
    birth: "#17345c",
    birthday: "#173c27",
    death: "#34383d",
    memorial: "#382c50",
  },
};

const cellKindPriority: readonly LifeEventKind[] = [
  "death",
  "birth",
  "birthday",
  "memorial",
];

function EventIcon({ kind }: { kind: LifeEventKind }) {
  if (kind === "birth") {
    return (
      <svg aria-hidden="true" className="size-3.5 shrink-0 overflow-visible" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
        <path d="M10 1v4M10 15v4M1 10h4M15 10h4M3.6 3.6l2.8 2.8M13.6 13.6l2.8 2.8M16.4 3.6l-2.8 2.8M6.4 13.6l-2.8 2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (kind === "birthday") {
    return (
      <svg aria-hidden="true" className="size-3.5 shrink-0 overflow-visible" viewBox="0 0 20 20">
        <path d="M4 9.5h12v7H4zM4 12h12M10 5.5v4" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
        <path d="M10 1.8c1.35 1.35 1.6 2.35 0 3.7-1.6-1.35-1.35-2.35 0-3.7Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-3.5 shrink-0 overflow-visible" viewBox="0 0 20 20">
      <path d="M5 17V8.2a5 5 0 0 1 10 0V17H5ZM3 17h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M8 10h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function getCellAppearance({
  events,
  isCurrentMonth,
  isDark,
  viewMode,
}: {
  events: readonly AnimatedLifeEvent[];
  isCurrentMonth: boolean;
  isDark: boolean;
  viewMode: CalendarViewMode;
}) {
  const baseBackground = isCurrentMonth
    ? isDark ? "#0f1115" : "#ffffff"
    : isDark ? "#13171d" : "#fafafa";

  if (viewMode === "compact" || events.length === 0) {
    return {
      baseBackground,
      eventBackground: null,
      foreground: isDark ? "#e8eaed" : "#3c4043",
    };
  }

  const kinds = cellKindPriority.filter((kind) =>
    events.some((event) => event.kind === kind),
  );
  const palette = cellColors[isDark ? "dark" : "light"];
  const colors = kinds.map((kind) => palette[kind]);
  const background = colors.length === 1
    ? colors[0]!
    : `linear-gradient(135deg, ${colors.map((color, index) => {
        const start = (index / colors.length) * 100;
        const end = ((index + 1) / colors.length) * 100;
        return `${color} ${start}%, ${color} ${end}%`;
      }).join(", ")})`;

  return {
    baseBackground,
    eventBackground: background,
    foreground: isDark ? "#ffffff" : "#202124",
  };
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(monthDate: Date, today: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());
  const todayIso = toIsoDate(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const isoDate = toIsoDate(date);

    return {
      id: `day-${isoDate}`,
      isoDate,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: isoDate === todayIso,
    };
  });
}

function getEventsByDate(events: readonly MaterializedLifeEvent[]) {
  return events.reduce<Record<string, AnimatedLifeEvent[]>>((dates, event, index) => {
    dates[event.date] = [
      ...(dates[event.date] ?? []),
      { ...event, animationIndex: index },
    ];
    return dates;
  }, {});
}

function IconButton({
  label,
  children,
  onClick,
  isDark,
}: {
  label: string;
  children: string;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-full border text-lg leading-none transition active:scale-95 ${
        isDark
          ? "border-[#3c4043] text-[#e8eaed] hover:bg-[#202124]"
          : "border-[#dadce0] text-[#3c4043] hover:bg-[#f8fafd]"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function CalendarOneScreen() {
  const [today] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [isDark, setIsDark] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("cell");
  const [profileIds, setProfileIds] = useState<readonly string[]>(initialProfileIds);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const receiveSelection = useCallback((selection: CalendarSelection) => {
    setProfileIds(selection.profileIds);
    setSelectionRevision(selection.revision);
  }, []);
  useCalendarSocket({ role: "screen", onSelection: receiveSelection });

  const monthDays = useMemo(
    () => getMonthDays(visibleMonth, today),
    [today, visibleMonth],
  );
  const eventsByDate = useMemo(() => {
    const first = monthDays[0]?.isoDate;
    const last = monthDays[monthDays.length - 1]?.isoDate;
    if (!first || !last) return {};
    return getEventsByDate(eventStore.materialize({
      profileIds,
      startDate: first,
      endDate: last,
    }));
  }, [monthDays, profileIds]);
  const activeEventToneClasses = isDark
    ? darkEventToneClasses
    : eventToneClasses;

  function goToMonth(offset: number) {
    setVisibleMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function resetToToday() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <main
      className={`h-dvh overflow-hidden ${
        isDark ? "bg-[#0f1115] text-[#e8eaed]" : "bg-white text-[#202124]"
      }`}
    >
      <div className="flex h-full flex-col">
        <header
          className={`flex min-h-16 items-center justify-between gap-3 border-b px-3 py-3 sm:px-5 ${
            isDark ? "border-[#2b2f36]" : "border-[#dadce0]"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isDark
                  ? "border-[#3c4043] text-[#e8eaed] hover:bg-[#202124]"
                  : "border-[#dadce0] text-[#3c4043] hover:bg-[#f8fafd]"
              }`}
              onClick={resetToToday}
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <IconButton
                isDark={isDark}
                label="Previous month"
                onClick={() => goToMonth(-1)}
              >
                {"<"}
              </IconButton>
              <IconButton
                isDark={isDark}
                label="Next month"
                onClick={() => goToMonth(1)}
              >
                {">"}
              </IconButton>
            </div>
          </div>

          <h1
            className={`truncate text-[clamp(20px,4vw,32px)] font-normal leading-tight tracking-normal ${
              isDark ? "text-[#e8eaed]" : "text-[#3c4043]"
            }`}
          >
            {monthFormatter.format(visibleMonth)}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            <div
              role="group"
              aria-label="Event display mode"
              className={`flex h-7 overflow-hidden rounded-full border p-0.5 sm:h-8 ${
                isDark ? "border-[#3c4043] bg-[#202124]" : "border-[#dadce0] bg-[#f8fafd]"
              }`}
            >
              {(["compact", "cell"] as const).map((mode) => {
                const selected = viewMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={selected}
                    className={`grid min-w-6 place-items-center rounded-full px-1 text-[10px] font-semibold uppercase tracking-[0.04em] transition sm:min-w-0 sm:px-3 sm:text-[11px] ${
                      selected
                        ? isDark
                          ? "bg-[#e8eaed] text-[#202124]"
                          : "bg-[#202124] text-white"
                        : isDark
                          ? "text-[#9aa0a6] hover:text-white"
                          : "text-[#5f6368] hover:text-black"
                    }`}
                    onClick={() => setViewMode(mode)}
                  >
                    <span className="sm:hidden" aria-hidden="true">
                      {mode === "compact" ? "▭" : "■"}
                    </span>
                    <span className="hidden sm:inline">
                      {mode === "compact" ? "Event" : "Cell"}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-label="Toggle dark mode"
              aria-pressed={isDark}
              className={`relative h-7 w-12 rounded-full border transition sm:h-8 sm:w-14 ${
                isDark
                  ? "border-[#5f6368] bg-[#202124]"
                  : "border-[#dadce0] bg-[#f8fafd]"
              }`}
              onClick={() => setIsDark((current) => !current)}
            >
              <span
                className={`absolute top-1 grid size-5 place-items-center rounded-full transition sm:size-6 ${
                  isDark
                    ? "left-6 bg-[#8ab4f8] sm:left-7"
                    : "left-1 bg-white shadow-[0_1px_4px_rgba(60,64,67,0.32)]"
                }`}
              />
            </button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-rows-[auto_1fr]">
          <div
            className={`grid grid-cols-7 border-b ${
              isDark ? "border-[#2b2f36] bg-[#0f1115]" : "border-[#dadce0] bg-white"
            }`}
          >
            {weekdayLabels.map((weekday) => (
              <div
                key={`weekday-${weekday}`}
                className={`px-1 py-2 text-center text-[11px] font-medium uppercase tracking-normal sm:text-xs ${
                  isDark ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 grid-cols-7 grid-rows-6">
            {monthDays.map((day) => {
              const dayEvents = eventsByDate[day.isoDate] ?? [];
              const cellAppearance = getCellAppearance({
                events: dayEvents,
                isCurrentMonth: day.isCurrentMonth,
                isDark,
                viewMode,
              });
              return (
                <AnimatedCalendarCell
                  key={day.id}
                  baseBackground={cellAppearance.baseBackground}
                  eventBackground={cellAppearance.eventBackground}
                  foreground={cellAppearance.foreground}
                  transitionToken={`${selectionRevision}:${viewMode}:${dayEvents.map((event) => event.id).join("|")}`}
                  className={`min-h-0 border-b border-r p-1.5 sm:p-2 ${
                    isDark ? "border-[#252a31]" : "border-[#e8eaed]"
                  }`}
                >
                  <div className="mb-1 flex justify-center sm:justify-start">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-sm leading-none ${
                        day.isToday
                          ? "bg-[#1a73e8] font-medium text-white"
                          : viewMode === "cell" && dayEvents.length > 0
                            ? "text-inherit"
                          : day.isCurrentMonth
                            ? isDark
                              ? "text-[#e8eaed]"
                              : "text-[#3c4043]"
                            : isDark
                              ? "text-[#6f747d]"
                              : "text-[#9aa0a6]"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  <div className="grid min-w-0 gap-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventCard
                        key={`${selectionRevision}-${event.id}`}
                        $animate={viewMode === "compact"}
                        $delay={Math.min(event.animationIndex * 46, 368)}
                        className={`box-border flex w-full min-w-0 max-w-full items-center gap-1 overflow-hidden rounded border px-1.5 py-1 text-[10px] leading-tight sm:text-xs ${activeEventToneClasses[event.kind]}`}
                      >
                        <EventIcon kind={event.kind} />
                        <span className="hidden font-medium sm:inline">
                          {eventLabels[event.kind]}{" "}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {event.name}
                        </span>
                      </EventCard>
                    ))}
                    {dayEvents.length > 3 ? (
                      <div
                        className={`truncate px-1.5 text-[10px] leading-tight sm:text-xs ${
                          viewMode === "cell"
                            ? "text-inherit opacity-70"
                            : isDark
                              ? "text-[#9aa0a6]"
                              : "text-[#5f6368]"
                        }`}
                      >
                        +{dayEvents.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </AnimatedCalendarCell>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
