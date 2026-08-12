"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { initialProfileIds, lifeProfiles, lifeProfilesById } from "./data";
import {
  createLifeEventDefinitions,
  displayedLifeEventKinds,
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

type AudibleEventKind = Extract<LifeEventKind, "birthday" | "memorial">;

type EventGroup = {
  kind: LifeEventKind;
  events: MaterializedLifeEvent[];
};

type ScreenPresentation = "almanac" | "compact" | "cell";

const rapidRegister = keyframes`
  0% { opacity: 0; transform: translate3d(0, -4px, 0); }
  72% { opacity: 0.96; transform: translate3d(0, 0, 0); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const EventCard = styled.div<{ $animate: boolean }>`
  box-sizing: border-box;
  width: calc(100% - 1px);
  min-width: 0;
  justify-self: start;
  overflow: hidden;
  border: 1px solid;
  border-radius: 4px;
  animation: ${({ $animate }) =>
    $animate
      ? css`${rapidRegister} 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both`
      : "none"};

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
  const colorRefs = useRef<[HTMLDivElement | null, HTMLDivElement | null]>([
    null,
    null,
  ]);
  const backgroundsRef = useRef<[string | null, string | null]>([null, null]);

  useEffect(() => {
    const layers = colorRefs.current;
    if (!layers[0] || !layers[1]) return;
    const concreteLayers: [HTMLDivElement, HTMLDivElement] = [layers[0], layers[1]];
    const currentOpacities = concreteLayers.map((layer) => {
      const opacity = Number.parseFloat(getComputedStyle(layer).opacity);
      layer.style.opacity = String(opacity);
      layer.getAnimations().forEach((animation) => animation.cancel());
      return opacity;
    }) as [number, number];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      concreteLayers[0].style.background = eventBackground ?? "transparent";
      concreteLayers[0].style.opacity = eventBackground ? "1" : "0";
      concreteLayers[1].style.opacity = "0";
      backgroundsRef.current = [eventBackground, null];
      return;
    }

    if (!eventBackground) {
      concreteLayers.forEach((layer, index) => {
        layer.style.opacity = "0";
        if (currentOpacities[index]! > 0.01) {
          layer.animate(
            [{ opacity: currentOpacities[index] }, { opacity: 0 }],
            { duration: 180, easing: "cubic-bezier(0.4, 0, 1, 1)" },
          );
        }
      });
      return;
    }

    const matchingLayer = backgroundsRef.current.findIndex(
      (background, index) =>
        background === eventBackground && currentOpacities[index]! > 0.01,
    );
    const incomingIndex = matchingLayer >= 0
      ? matchingLayer
      : currentOpacities[0] <= currentOpacities[1] ? 0 : 1;

    concreteLayers.forEach((layer, index) => {
      if (index === incomingIndex) return;
      const opacity = currentOpacities[index]!;
      layer.style.opacity = "0";
      if (opacity > 0.01) {
        layer.animate(
          [{ opacity }, { opacity: 0 }],
          { duration: 180, easing: "cubic-bezier(0.4, 0, 1, 1)" },
        );
      }
    });

    const incomingLayer = concreteLayers[incomingIndex]!;
    const isSameBackground = matchingLayer === incomingIndex;
    if (!isSameBackground) {
      incomingLayer.style.opacity = "0";
      incomingLayer.style.background = eventBackground;
      backgroundsRef.current[incomingIndex] = eventBackground;
    }
    incomingLayer.style.opacity = "1";
    incomingLayer.animate(
      [
        { opacity: isSameBackground ? currentOpacities[incomingIndex] : 0 },
        { opacity: 1 },
      ],
      {
        duration: isSameBackground ? 140 : 240,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    );

    return () => {
      concreteLayers.forEach((layer) => {
        if (layer.isConnected) layer.style.opacity = getComputedStyle(layer).opacity;
        layer.getAnimations().forEach((animation) => animation.cancel());
      });
    };
  }, [eventBackground, transitionToken]);

  return (
    <CalendarCell
      $background={baseBackground}
      $foreground={foreground}
      className={className}
    >
      {[0, 1].map((index) => (
        <div
          key={index}
          ref={(node) => {
            colorRefs.current[index as 0 | 1] = node;
          }}
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
      ))}
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
const eventKindOrder: readonly LifeEventKind[] = [
  "birth",
  "birthday",
  "death",
  "memorial",
];
const eventLabels: Record<LifeEventKind, string> = {
  birth: "태어남",
  birthday: "생일",
  death: "죽음",
  memorial: "기일",
};
const presentationLabels: Record<ScreenPresentation, string> = {
  almanac: "Record",
  compact: "Event",
  cell: "Cell",
};

function SoundIcon({ enabled }: { enabled: boolean }) {
  return (
    <svg aria-hidden="true" className="size-3.5" viewBox="0 0 20 20">
      <path d="M3 8h3l4-3v10l-4-3H3V8Z" fill="currentColor" />
      {enabled ? (
        <path d="M13 7c1.4 1.1 1.4 4.9 0 6M15.5 4.5c3.2 2.8 3.2 8.2 0 11" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      ) : (
        <path d="m13 8 4 4m0-4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      )}
    </svg>
  );
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
  return events.reduce<Record<string, MaterializedLifeEvent[]>>((dates, event) => {
    dates[event.date] = [...(dates[event.date] ?? []), event];
    return dates;
  }, {});
}

function groupEvents(events: readonly MaterializedLifeEvent[]): EventGroup[] {
  return eventKindOrder.flatMap((kind) => {
    const matchingEvents = events.filter((event) => event.kind === kind);
    return matchingEvents.length > 0 ? [{ kind, events: matchingEvents }] : [];
  });
}

function getNameColumnCount(eventCount: number) {
  if (eventCount >= 2) return 2;
  return 1;
}

function getEventYearLabel(event: MaterializedLifeEvent) {
  const profile = lifeProfilesById.get(event.profileId);
  if (!profile) return null;

  const eventYear = Number(event.date.slice(0, 4));
  if (event.kind === "birthday") {
    const birthYear = Number(profile.birthDate.slice(0, 4));
    return `D+${eventYear - birthYear}년`;
  }

  if (event.kind === "memorial") {
    const deathYear = Number(profile.deathDate.slice(0, 4));
    const yearsUntilDeath = deathYear - eventYear;
    if (yearsUntilDeath > 0) return `D-${yearsUntilDeath}년`;
    if (yearsUntilDeath < 0) return `D+${Math.abs(yearsUntilDeath)}년`;
    return "D+0년";
  }

  return null;
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

const legacyEventToneClasses: Record<LifeEventKind, string> = {
  birth: "border-[#4f8df6] bg-[#eef5ff] text-[#174ea6]",
  birthday: "border-[#50a46f] bg-[#effaf3] text-[#137333]",
  death: "border-[#222222] bg-[#f3f4f4] text-[#202124]",
  memorial: "border-[#9871f2] bg-[#f5f0ff] text-[#5f3dc4]",
};

const legacyDarkEventToneClasses: Record<LifeEventKind, string> = {
  birth: "border-[#2f66c8] bg-[#101b2c] text-[#8ab4f8]",
  birthday: "border-[#2e7d4f] bg-[#102118] text-[#81c995]",
  death: "border-[#5f6368] bg-[#202124] text-[#e8eaed]",
  memorial: "border-[#6f55c9] bg-[#1e1831] text-[#c3b4ff]",
};

const legacyCellColors: Record<"light" | "dark", Record<LifeEventKind, string>> = {
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

const legacyCellKindPriority: readonly LifeEventKind[] = [
  "death",
  "birth",
  "birthday",
  "memorial",
];

function createLegacyBandGradient(colors: readonly string[]) {
  if (colors.length === 1) return colors[0]!;

  const transitionWidth = Math.min(6, 18 / colors.length);
  const stops: string[] = [`${colors[0]} 0%`];

  for (let index = 0; index < colors.length - 1; index += 1) {
    const boundary = ((index + 1) / colors.length) * 100;
    stops.push(`${colors[index]} ${boundary - transitionWidth}%`);
    stops.push(`${colors[index + 1]} ${boundary + transitionWidth}%`);
  }

  stops.push(`${colors[colors.length - 1]} 100%`);
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

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

function getLegacyCellAppearance({
  events,
  isCurrentMonth,
  isDark,
  mode,
}: {
  events: readonly MaterializedLifeEvent[];
  isCurrentMonth: boolean;
  isDark: boolean;
  mode: Extract<ScreenPresentation, "compact" | "cell">;
}) {
  const baseBackground = isCurrentMonth
    ? isDark ? "#0f1115" : "#ffffff"
    : isDark ? "#13171d" : "#fafafa";
  if (mode === "compact" || events.length === 0) {
    return {
      baseBackground,
      eventBackground: null,
      foreground: isDark ? "#e8eaed" : "#3c4043",
    };
  }

  const palette = legacyCellColors[isDark ? "dark" : "light"];
  const kinds = legacyCellKindPriority.filter((kind) =>
    events.some((event) => event.kind === kind),
  );
  const colors = kinds.map((kind) => palette[kind]);
  const eventBackground = createLegacyBandGradient(colors);
  return {
    baseBackground,
    eventBackground,
    foreground: isDark ? "#ffffff" : "#202124",
  };
}

function LegacyCalendarSurface({
  eventsByDate,
  isDark,
  mode,
  monthDays,
  selectionRevision,
}: {
  eventsByDate: Record<string, MaterializedLifeEvent[]>;
  isDark: boolean;
  mode: Extract<ScreenPresentation, "compact" | "cell">;
  monthDays: readonly CalendarDay[];
  selectionRevision: number;
}) {
  const activeEventToneClasses = isDark
    ? legacyDarkEventToneClasses
    : legacyEventToneClasses;

  return (
    <div className="grid min-h-0 grid-cols-7 grid-rows-6">
      {monthDays.map((day) => {
        const dayEvents = eventsByDate[day.isoDate] ?? [];
        const cellAppearance = getLegacyCellAppearance({
          events: dayEvents,
          isCurrentMonth: day.isCurrentMonth,
          isDark,
          mode,
        });
        return (
          <AnimatedCalendarCell
            key={day.id}
            baseBackground={cellAppearance.baseBackground}
            eventBackground={cellAppearance.eventBackground}
            foreground={cellAppearance.foreground}
            transitionToken={`${selectionRevision}:${mode}:${dayEvents.map((event) => event.id).join("|")}`}
            className={`min-h-0 overflow-hidden border-b border-r p-1.5 sm:p-2 ${
              isDark ? "border-[#252a31]" : "border-[#e8eaed]"
            }`}
          >
            <div className="mb-1 flex justify-center sm:justify-start">
              <time
                dateTime={day.isoDate}
                className={`grid h-7 w-7 place-items-center rounded-full text-sm leading-none ${
                  day.isToday
                    ? "bg-[#1a73e8] font-medium text-white"
                    : mode === "cell" && dayEvents.length > 0
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
              </time>
            </div>

            <div className="grid min-w-0 gap-1 overflow-hidden">
              {dayEvents.slice(0, 3).map((event) => {
                const yearLabel = getEventYearLabel(event);
                return (
                  <EventCard
                    key={`${selectionRevision}-${event.id}`}
                    $animate={false}
                    className={`flex min-w-0 items-center gap-1 rounded border px-1.5 py-1 text-[10px] leading-tight sm:text-xs ${activeEventToneClasses[event.kind]}`}
                  >
                    <EventIcon kind={event.kind} />
                    <span className="hidden font-medium sm:inline">
                      {eventLabels[event.kind]}{" "}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{event.name}</span>
                    {yearLabel ? (
                      <span className="shrink-0 whitespace-nowrap text-[9px] font-medium tabular-nums opacity-65 sm:text-[10px]">
                        {yearLabel}
                      </span>
                    ) : null}
                  </EventCard>
                );
              })}
              {dayEvents.length > 3 ? (
                <div className={`truncate px-1.5 text-[10px] leading-tight sm:text-xs ${
                  mode === "cell"
                    ? "text-inherit opacity-70"
                    : isDark
                      ? "text-[#9aa0a6]"
                      : "text-[#5f6368]"
                }`}>
                  +{dayEvents.length - 3} more
                </div>
              ) : null}
            </div>
          </AnimatedCalendarCell>
        );
      })}
    </div>
  );
}

export default function CalendarOneScreen() {
  const [today] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [isDark, setIsDark] = useState(false);
  const [presentation, setPresentation] = useState<ScreenPresentation>("almanac");
  const [includeMemorials, setIncludeMemorials] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [profileIds, setProfileIds] = useState<readonly string[]>(initialProfileIds);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousAudibleEventsRef = useRef<Map<string, AudibleEventKind> | null>(
    null,
  );
  const pendingSoundKindsRef = useRef(new Set<AudibleEventKind>());
  const soundTimerRef = useRef<number | null>(null);
  const lastSoundAtRef = useRef(0);
  const receiveSelection = useCallback((selection: CalendarSelection) => {
    setProfileIds(selection.profileIds);
    setSelectionRevision(selection.revision);
  }, []);
  useCalendarSocket({ role: "screen", onSelection: receiveSelection });

  const playSoundCue = useCallback((kinds: ReadonlySet<AudibleEventKind>) => {
    const context = audioContextRef.current;
    if (!context || context.state !== "running" || kinds.size === 0) return;

    const startAt = context.currentTime + 0.004;
    const tones: Array<{
      duration: number;
      frequency: number;
      gain: number;
      offset: number;
      type: OscillatorType;
    }> = [];

    if (kinds.has("birthday")) {
      tones.push({
        duration: 0.1,
        frequency: 680,
        gain: 0.065,
        offset: kinds.has("memorial") ? 0.035 : 0,
        type: "sine",
      });
    }
    if (kinds.has("memorial")) {
      tones.push({
        duration: 0.14,
        frequency: 185,
        gain: 0.055,
        offset: 0,
        type: "triangle",
      });
    }

    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const toneStart = startAt + tone.offset;
      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
      envelope.gain.setValueAtTime(0.0001, toneStart);
      envelope.gain.exponentialRampToValueAtTime(tone.gain, toneStart + 0.007);
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        toneStart + tone.duration,
      );
      oscillator.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + tone.duration + 0.01);
    }
  }, []);

  const queueSoundCue = useCallback((kinds: ReadonlySet<AudibleEventKind>) => {
    kinds.forEach((kind) => pendingSoundKindsRef.current.add(kind));
    if (soundTimerRef.current !== null) return;

    const elapsed = performance.now() - lastSoundAtRef.current;
    const delay = Math.max(0, 140 - elapsed);
    soundTimerRef.current = window.setTimeout(() => {
      soundTimerRef.current = null;
      const queuedKinds = new Set(pendingSoundKindsRef.current);
      pendingSoundKindsRef.current.clear();
      lastSoundAtRef.current = performance.now();
      playSoundCue(queuedKinds);
    }, delay);
  }, [playSoundCue]);

  useEffect(() => () => {
    if (soundTimerRef.current !== null) {
      window.clearTimeout(soundTimerRef.current);
    }
    const context = audioContextRef.current;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  const monthDays = useMemo(
    () => getMonthDays(visibleMonth, today),
    [today, visibleMonth],
  );
  const visibleEventKinds = useMemo<readonly LifeEventKind[]>(
    () => includeMemorials
      ? [...displayedLifeEventKinds, "memorial"]
      : displayedLifeEventKinds,
    [includeMemorials],
  );
  const eventsByDate = useMemo(() => {
    const first = monthDays[0]?.isoDate;
    const last = monthDays[monthDays.length - 1]?.isoDate;
    if (!first || !last) return {};
    return getEventsByDate(eventStore.materialize({
      profileIds,
      startDate: first,
      endDate: last,
      kinds: visibleEventKinds,
    }));
  }, [monthDays, profileIds, visibleEventKinds]);
  const audibleEvents = useMemo(
    () => Object.values(eventsByDate)
      .flat()
      .filter(
        (event): event is MaterializedLifeEvent & { kind: AudibleEventKind } =>
          event.kind === "birthday" || event.kind === "memorial",
      ),
    [eventsByDate],
  );

  useEffect(() => {
    const nextEvents = new Map(
      audibleEvents.map((event) => [event.id, event.kind] as const),
    );
    const previousEvents = previousAudibleEventsRef.current;
    previousAudibleEventsRef.current = nextEvents;
    if (!previousEvents || !soundEnabled) return;

    const addedKinds = new Set<AudibleEventKind>();
    for (const [eventId, kind] of nextEvents) {
      if (!previousEvents.has(eventId)) addedKinds.add(kind);
    }
    if (addedKinds.size > 0) queueSoundCue(addedKinds);
  }, [audibleEvents, queueSoundCue, soundEnabled]);

  function goToMonth(offset: number) {
    setVisibleMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function resetToToday() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  async function toggleSound() {
    if (soundEnabled) {
      setSoundEnabled(false);
      pendingSoundKindsRef.current.clear();
      if (soundTimerRef.current !== null) {
        window.clearTimeout(soundTimerRef.current);
        soundTimerRef.current = null;
      }
      const context = audioContextRef.current;
      if (context?.state === "running") await context.suspend();
      return;
    }

    let context = audioContextRef.current;
    if (!context || context.state === "closed") {
      context = new AudioContext({ latencyHint: "interactive" });
      audioContextRef.current = context;
    }
    if (context.state !== "running") await context.resume();
    setSoundEnabled(true);
    playSoundCue(new Set<AudibleEventKind>(["birthday", "memorial"]));
  }

  const shellClasses = isDark
    ? "bg-[#0f1115] text-[#e8eaed]"
    : "bg-white text-[#202124]";
  const ruleClasses = isDark ? "border-[#2b2f36]" : "border-[#dadce0]";
  const mutedTextClasses = isDark ? "text-[#9aa0a6]" : "text-[#5f6368]";
  const quietTextClasses = isDark ? "text-[#6f747d]" : "text-[#9aa0a6]";

  return (
    <main className={`h-dvh overflow-hidden ${shellClasses}`}>
      <div className="flex h-full flex-col">
        <header
          className={`flex min-h-16 items-center justify-between gap-3 border-b px-3 py-3 sm:px-5 ${ruleClasses}`}
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

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div
              role="group"
              aria-label="Event display mode"
              className={`flex h-7 overflow-hidden rounded-full border p-0.5 sm:h-8 ${
                isDark ? "border-[#3c4043] bg-[#202124]" : "border-[#dadce0] bg-[#f8fafd]"
              }`}
            >
              {(["almanac", "compact", "cell"] as const).map((mode) => {
                const selected = presentation === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={selected}
                    className={`grid min-w-6 place-items-center rounded-full px-1 text-[10px] font-semibold tracking-[0.04em] transition sm:min-w-0 sm:px-3 sm:text-[11px] ${
                      selected
                        ? isDark
                          ? "bg-[#e8eaed] text-[#202124]"
                          : "bg-[#202124] text-white"
                        : isDark
                          ? "text-[#9aa0a6] hover:text-white"
                          : "text-[#5f6368] hover:text-black"
                    }`}
                    onClick={() => setPresentation(mode)}
                  >
                    <span className="sm:hidden" aria-hidden="true">
                      {mode === "almanac" ? "≡" : mode === "compact" ? "▭" : "■"}
                    </span>
                    <span className="hidden sm:inline">
                      {presentationLabels[mode]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="기일 포함"
              aria-pressed={includeMemorials}
              title="기일 포함"
              className={`grid h-7 min-w-7 grid-flow-col place-items-center gap-1 rounded-full border px-1.5 text-[10px] font-semibold transition sm:h-8 sm:px-2.5 sm:text-[11px] ${
                includeMemorials
                  ? isDark
                    ? "border-[#c3b4ff] bg-[#c3b4ff] text-[#1e1831]"
                    : "border-[#6f55c9] bg-[#6f55c9] text-white"
                  : isDark
                    ? "border-[#3c4043] bg-[#202124] text-[#9aa0a6]"
                    : "border-[#dadce0] bg-[#f8fafd] text-[#5f6368]"
              }`}
              onClick={() => setIncludeMemorials((current) => !current)}
            >
              <EventIcon kind="memorial" />
              <span className="hidden sm:inline">기일</span>
            </button>
            <button
              type="button"
              aria-label={soundEnabled ? "이벤트 사운드 끄기" : "이벤트 사운드 켜기"}
              aria-pressed={soundEnabled}
              title={soundEnabled ? "이벤트 사운드 끄기" : "이벤트 사운드 켜기"}
              className={`grid h-7 min-w-7 grid-flow-col place-items-center gap-1 rounded-full border px-1.5 text-[10px] font-semibold transition sm:h-8 sm:px-2.5 sm:text-[11px] ${
                soundEnabled
                  ? isDark
                    ? "border-[#e8eaed] bg-[#e8eaed] text-[#202124]"
                    : "border-[#202124] bg-[#202124] text-white"
                  : isDark
                    ? "border-[#3c4043] bg-[#202124] text-[#9aa0a6]"
                    : "border-[#dadce0] bg-[#f8fafd] text-[#5f6368]"
              }`}
              onClick={() => void toggleSound()}
            >
              <SoundIcon enabled={soundEnabled} />
              <span className="hidden sm:inline">Sound</span>
            </button>
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
          <div className={`grid grid-cols-7 border-b ${
            isDark ? "border-[#2b2f36] bg-[#0f1115]" : "border-[#dadce0] bg-white"
          }`}>
            {weekdayLabels.map((weekday) => (
              <div
                key={weekday}
                className={`px-1 py-2 text-center text-[11px] font-medium uppercase tracking-normal sm:text-xs ${mutedTextClasses}`}
              >
                {weekday}
              </div>
            ))}
          </div>

          {presentation === "almanac" ? (
            <div className="grid min-h-0 grid-cols-7 grid-rows-6">
              {monthDays.map((day) => {
              const dayEvents = eventsByDate[day.isoDate] ?? [];
              const eventGroups = groupEvents(dayEvents);
              const nameColumnCount = getNameColumnCount(dayEvents.length);
              const dayTextClasses = day.isCurrentMonth
                ? isDark ? "text-[#f0eee8]" : "text-[#1d1d1a]"
                : quietTextClasses;

              return (
                <article
                  key={day.id}
                  aria-label={`${day.isoDate}, ${dayEvents.length}개의 생애 사건`}
                  className={`group flex min-h-0 flex-col border-b border-r px-1.5 py-1.5 sm:px-2 sm:py-2 ${ruleClasses} ${dayTextClasses}`}
                >
                  <div className="flex shrink-0 items-start justify-between">
                    <time
                      dateTime={day.isoDate}
                      className={`text-[clamp(15px,1.6vw,26px)] font-normal leading-none tracking-[-0.06em] ${
                        day.isToday ? "underline decoration-[1.5px] underline-offset-4" : ""
                      }`}
                      style={{ fontFamily: '"Iowan Old Style", "AppleMyungjo", serif' }}
                    >
                      {day.dayNumber}
                    </time>
                    {dayEvents.length > 0 ? (
                      <span className={`pt-0.5 text-[8px] tracking-[0.12em] ${mutedTextClasses}`}>
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1.5 grid min-h-0 content-start gap-y-1 sm:mt-2 sm:gap-y-1.5">
                    {eventGroups.map((group) => (
                      <div
                        key={group.kind}
                        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1"
                      >
                        <span className={`pt-px text-[7px] font-medium tracking-[-0.06em] sm:text-[8px] ${mutedTextClasses}`}>
                          {eventLabels[group.kind]}
                        </span>
                        <div
                          className="grid min-w-0 gap-x-1 gap-y-0.5"
                          style={{
                            gridTemplateColumns: `repeat(${nameColumnCount}, minmax(0, 1fr))`,
                          }}
                        >
                          {group.events.map((event) => {
                            const yearLabel = getEventYearLabel(event);
                            return (
                              <span
                                key={event.id}
                                className="flex min-w-0 items-baseline gap-x-0.5 text-[clamp(8px,0.68vw,11px)] leading-[1.2] tracking-[-0.08em]"
                                title={`${eventLabels[event.kind]} ${event.name}${yearLabel ? ` ${yearLabel}` : ""}`}
                                style={{ fontFamily: '"AppleMyungjo", serif' }}
                              >
                                <span className="min-w-0 truncate">{event.name}</span>
                                {yearLabel ? (
                                  <span className={`shrink-0 text-[0.86em] font-medium tracking-[-0.06em] tabular-nums ${mutedTextClasses}`}>
                                    {yearLabel}
                                  </span>
                                ) : null}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
              })}
            </div>
          ) : (
            <LegacyCalendarSurface
              eventsByDate={eventsByDate}
              isDark={isDark}
              mode={presentation}
              monthDays={monthDays}
              selectionRevision={selectionRevision}
            />
          )}
        </section>
      </div>
    </main>
  );
}
