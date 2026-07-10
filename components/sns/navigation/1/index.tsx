"use client";

import type { PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type TabId =
  | "bed"
  | "birth"
  | "commute"
  | "education"
  | "work-day"
  | "meal"
  | "hospital"
  | "death"
  | "reels";

type InterfaceMode = "day" | "life";
type TabDefinition = { id: TabId; label: string; icon: ReactNode };

const dayTabs: readonly TabDefinition[] = [
  { id: "bed", label: "Bed", icon: <BedIcon /> },
  { id: "commute", label: "Commute", icon: <CommuteIcon /> },
  { id: "work-day", label: "Work", icon: <WorkIcon /> },
  { id: "meal", label: "Meal", icon: <MealIcon /> },
  { id: "reels", label: "Phone reels", icon: <PhoneReelsIcon /> },
];

const lifeTabs: readonly TabDefinition[] = [
  { id: "birth", label: "Birth", icon: <BirthIcon /> },
  { id: "education", label: "Education", icon: <EducationIcon /> },
  { id: "work-day", label: "Work", icon: <WorkIcon /> },
  { id: "hospital", label: "Hospital", icon: <HospitalIcon /> },
  { id: "death", label: "Death", icon: <DeathIcon /> },
];

const tabSets: Record<InterfaceMode, readonly TabDefinition[]> = {
  day: dayTabs,
  life: lifeTabs,
};

function defaultTabForRow(mode: InterfaceMode, index: number) {
  const tabs = tabSets[mode];
  return tabs[index % tabs.length].id;
}

function isTabId(
  value: string | undefined,
  tabs: readonly TabDefinition[],
): value is TabId {
  return tabs.some((tab) => tab.id === value);
}

const iconClassName = "h-7 w-7";
const iconStrokeWidth = 1.9;

function BedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        d="M4 23.5V8M4 17h20v6.5M7 17v-5.5h4.25c1.55 0 2.75 1.2 2.75 2.75V17m0-3.25h5.25A4.75 4.75 0 0 1 24 18.5M4 21.5h20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function BirthIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <circle
        cx="14"
        cy="6.75"
        r="3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="M9.25 10.75c-2.55 2.8-2.55 7.45-.1 10.35L14 25.5l4.85-4.4c2.45-2.9 2.45-7.55-.1-10.35A6.75 6.75 0 0 1 14 12.6a6.75 6.75 0 0 1-4.75-1.85Zm-.9 4.2 9.9 7.15m1.4-7.15-9.9 7.15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <circle cx="12.8" cy="6.35" r="0.45" fill="currentColor" />
      <circle cx="15.2" cy="6.35" r="0.45" fill="currentColor" />
      <path
        d="M13 7.75c.6.45 1.4.45 2 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function EducationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        d="M3.5 5.25H10a4 4 0 0 1 4 4v14.5a4 4 0 0 0-4-4H3.5V5.25Zm21 0H18a4 4 0 0 0-4 4v14.5a4 4 0 0 1 4-4h6.5V5.25Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function CommuteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <rect
        x="5.25"
        y="3.5"
        width="17.5"
        height="18.25"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="M6 10h16M9.25 17.5h.01M18.75 17.5h.01M9 21.75l-2 2.75m12-2.75 2 2.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="M10.75 6.75h6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <rect
        x="3.5"
        y="5"
        width="21"
        height="15.5"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="M10.5 24h7M14 20.5V24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function HospitalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <rect
        x="4"
        y="4.5"
        width="20"
        height="20"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="M14 7.25v7M10.5 10.75h7M8 17h.01M20 17h.01M10.5 24.5v-5h7v5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function DeathIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        d="M6 12a8 8 0 1 1 16 0c0 3.1-1.55 5.8-4 7.25V24h-8v-4.75C7.55 17.8 6 15.1 6 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <circle cx="10.5" cy="12.75" r="2" fill="currentColor" />
      <circle cx="17.5" cy="12.75" r="2" fill="currentColor" />
      <path d="m14 15.5-1.35 2.25h2.7L14 15.5Z" fill="currentColor" />
      <path
        d="M11 20.25V24M14 20.25V24M17 20.25V24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
      />
    </svg>
  );
}

function MealIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        d="M5 13.5h18c-.65 5.45-3.95 8.25-9 8.25s-8.35-2.8-9-8.25ZM8 24h12M10.5 10.25c-1.5-1.4-1.45-3 .1-4.5m4.25 4.5c-1.5-1.4-1.45-3 .1-4.5m4.25 4.5c-1.5-1.4-1.45-3 .1-4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function PhoneReelsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <rect
        x="7"
        y="2.75"
        width="14"
        height="22.5"
        rx="3.25"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="m12.15 10.25 5.25 3.25-5.25 3.25v-6.5ZM12.25 5.75h3.5M13.25 22.25h1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function TabButton({
  rowIndex,
  tabId,
  label,
  children,
  active = false,
  onActivate,
}: {
  rowIndex: number;
  tabId: TabId;
  label: string;
  children: ReactNode;
  active?: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      data-skate-row={rowIndex}
      data-skate-tab={tabId}
      onClick={(event) => {
        if (event.detail === 0) {
          onActivate();
        }
      }}
      className="relative grid h-[50px] min-w-0 select-none place-items-center text-current outline-none transition-transform active:scale-[0.92] focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span
        className={`relative grid place-items-center transition-[opacity,transform,filter] duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          active
            ? "scale-[1.08] opacity-100 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] saturate-100"
            : "scale-100 opacity-[0.38] saturate-50"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

export default function SnsNavigationOne() {
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>("day");
  const [activeTabsByMode, setActiveTabsByMode] = useState<
    Record<InterfaceMode, TabId[]>
  >(() => ({
    day: Array.from({ length: 8 }, (_, index) =>
      defaultTabForRow("day", index),
    ),
    life: Array.from({ length: 8 }, (_, index) =>
      defaultTabForRow("life", index),
    ),
  }));
  const [barCount, setBarCount] = useState(8);
  const activePointerIdsRef = useRef(new Set<number>());
  const tabs = tabSets[interfaceMode];
  const activeTabs = activeTabsByMode[interfaceMode];
  const fallbackTab = tabs[0].id;
  const interfaceLabel =
    interfaceMode === "day" ? "Human 24-hour cycle" : "Human life cycle";

  useEffect(() => {
    function syncBarCount() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      const verticalMargin = Math.max(20, Math.min(42, height * 0.038));
      const rowHeight = Math.max(58, Math.min(72, height * 0.082));
      const nextCount = Math.max(5, Math.floor((height - verticalMargin * 2) / rowHeight));
      setBarCount(nextCount);
      setActiveTabsByMode((current) => ({
        day: Array.from(
          { length: nextCount },
          (_, index) =>
            current.day[index] ?? defaultTabForRow("day", index),
        ),
        life: Array.from(
          { length: nextCount },
          (_, index) =>
            current.life[index] ?? defaultTabForRow("life", index),
        ),
      }));
    }

    syncBarCount();
    window.addEventListener("resize", syncBarCount);
    window.visualViewport?.addEventListener("resize", syncBarCount);

    return () => {
      window.removeEventListener("resize", syncBarCount);
      window.visualViewport?.removeEventListener("resize", syncBarCount);
    };
  }, []);

  function setRowTab(rowIndex: number, tabId: TabId) {
    setActiveTabsByMode((current) => {
      const currentRows = current[interfaceMode];

      if (
        rowIndex < 0 ||
        rowIndex >= currentRows.length ||
        currentRows[rowIndex] === tabId
      ) {
        return current;
      }

      return {
        ...current,
        [interfaceMode]: currentRows.map((value, index) =>
          index === rowIndex ? tabId : value,
        ),
      };
    });
  }

  function selectAtPoint(clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-skate-row][data-skate-tab]");

    if (!target) return;

    const rowIndex = Number(target.dataset.skateRow);
    const tabId = target.dataset.skateTab;

    if (Number.isInteger(rowIndex) && isTabId(tabId, tabs)) {
      setRowTab(rowIndex, tabId);
    }
  }

  function selectFromPointerEvent(event: PointerEvent<HTMLElement>) {
    const coalescedPoints = event.nativeEvent.getCoalescedEvents?.();
    const points =
      coalescedPoints && coalescedPoints.length > 0
        ? coalescedPoints
        : [event.nativeEvent];

    for (const point of points) {
      selectAtPoint(point.clientX, point.clientY);
    }
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (!activePointerIdsRef.current.has(event.pointerId)) return;

    selectFromPointerEvent(event);
    activePointerIdsRef.current.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main
      className="fixed inset-0 h-dvh touch-none select-none overflow-hidden overscroll-none bg-[linear-gradient(180deg,#f7f7f7_0%,#ffffff_42%,#f1f1f1_100%)] text-black caret-transparent [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onLostPointerCapture={(event) => {
        activePointerIdsRef.current.delete(event.pointerId);
      }}
      onPointerCancel={(event) => {
        activePointerIdsRef.current.delete(event.pointerId);
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        event.preventDefault();
        activePointerIdsRef.current.add(event.pointerId);
        event.currentTarget.setPointerCapture(event.pointerId);
        selectFromPointerEvent(event);
      }}
      onPointerMove={(event) => {
        if (activePointerIdsRef.current.has(event.pointerId)) {
          selectFromPointerEvent(event);
        }
      }}
      onPointerUp={finishPointer}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <section
        aria-label={`${interfaceLabel} navigation stack`}
        className="mx-auto grid h-full w-full max-w-[470px] gap-[clamp(6px,1.1dvh,12px)] overflow-hidden px-[clamp(12px,4vw,18px)] py-[max(clamp(12px,3.8dvh,34px),env(safe-area-inset-top))] pb-[max(clamp(12px,3.8dvh,34px),env(safe-area-inset-bottom))]"
        style={{
          gridTemplateRows: `repeat(${barCount}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: barCount }, (_, rowIndex) => (
          <nav
            key={`sns-navigation-1-nav-${rowIndex}`}
            aria-label={`${interfaceLabel} navigation ${rowIndex + 1}`}
            className="min-h-0 rounded-[999px] border border-white/60 bg-white/58 px-1.5 shadow-[0_14px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl"
          >
            <div className="relative h-full min-h-[48px]">
              {(() => {
                const activeTab = activeTabs[rowIndex] ?? fallbackTab;
                const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

                return (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 px-px py-1 transition-[left] duration-[560ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        left: `calc(${activeIndex} * (100% / ${tabs.length}))`,
                        width: `calc(100% / ${tabs.length})`,
                      }}
                    >
                      <span className="block h-full min-h-10 rounded-full border border-white/75 bg-white/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(255,255,255,0.3),0_10px_24px_rgba(0,0,0,0.13)]" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 px-px py-2 transition-[left] duration-[640ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        left: `calc(${activeIndex} * (100% / ${tabs.length}))`,
                        width: `calc(100% / ${tabs.length})`,
                      }}
                    >
                      <span className="block h-full min-h-8 rounded-full bg-white/38 blur-md" />
                    </span>
                  </>
                );
              })()}
              <div
                className="relative grid h-full items-center"
                style={{
                  gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
                }}
              >
                {tabs.map((tab) => (
                  <TabButton
                    key={`${rowIndex}-${tab.id}`}
                    rowIndex={rowIndex}
                    tabId={tab.id}
                    label={tab.label}
                    active={(activeTabs[rowIndex] ?? fallbackTab) === tab.id}
                    onActivate={() => setRowTab(rowIndex, tab.id)}
                  >
                    {tab.icon}
                  </TabButton>
                ))}
              </div>
            </div>
          </nav>
        ))}
      </section>
      <nav
        aria-label="Human cycle timescale"
        className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-3 z-50 flex gap-0.5 rounded-full border border-black/12 bg-white/72 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {(
          [
            { mode: "day", label: "24h" },
            { mode: "life", label: "Life" },
          ] as const
        ).map(({ mode, label }) => {
          const active = interfaceMode === mode;

          return (
            <button
              key={mode}
              type="button"
              aria-label={`Show ${label} interface`}
              aria-pressed={active}
              className={`grid h-8 min-w-10 place-items-center rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                active
                  ? "bg-black text-white"
                  : "text-black/45 hover:text-black"
              }`}
              onClick={() => setInterfaceMode(mode)}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
