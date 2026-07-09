"use client";

import type { PointerEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

type TabId = "home" | "reels" | "messages" | "search" | "profile";

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "home", label: "Home", icon: <HomeIcon /> },
  { id: "reels", label: "Reels", icon: <ReelsIcon /> },
  { id: "messages", label: "Messages", icon: <MessagesIcon /> },
  { id: "search", label: "Search", icon: <SearchIcon /> },
  { id: "profile", label: "Profile", icon: <ProfileAvatar /> },
];

function defaultTabForRow(index: number) {
  return tabs[index % tabs.length].id;
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className="h-7 w-7">
      <path d="M4.8 12.7 14 4.5l9.2 8.2v9.6c0 .55-.45 1-1 1h-5.35v-7.15h-5.7v7.15H5.8c-.55 0-1-.45-1-1v-9.6Z" />
    </svg>
  );
}

function ReelsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className="h-7 w-7">
      <rect
        x="4.6"
        y="4.9"
        width="18.8"
        height="18.2"
        rx="5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5.5 10.8h17M9.8 5.2l4 5.6M16.4 5.2l4 5.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="m12.2 14.2 5 2.9-5 2.9v-5.8Z" fill="currentColor" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className="h-7 w-7">
      <path
        d="M24.2 4.7 16.5 23l-4.3-8.7-8.6-4.1 20.6-5.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.05"
      />
      <path
        d="m12.2 14.3 5.45-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.05"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className="h-7 w-7">
      <path
        d="m23.25 23.25-5.35-5.35m2.75-5.9a8.75 8.75 0 1 1-17.5 0 8.75 8.75 0 0 1 17.5 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.15"
      />
    </svg>
  );
}

function ProfileAvatar() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-[conic-gradient(from_20deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)] p-[2px]">
      <span className="h-full w-full rounded-full border border-white/70 bg-[radial-gradient(circle_at_35%_28%,#ffe8d5_0_18%,#9b593c_19%_33%,#202020_34%_48%,#6d8fbd_49%_66%,#16233a_67%_100%)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]" />
    </span>
  );
}

function TabButton({
  label,
  children,
  active = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className="relative grid h-[50px] min-w-0 select-none place-items-center text-current outline-none transition-transform active:scale-[0.92] focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span
        className={`relative grid place-items-center transition-[opacity,transform,filter] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          active
            ? "scale-[1.08] opacity-100 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]"
            : "scale-100 opacity-[0.64]"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

export default function SnsTwo() {
  const [activeTabs, setActiveTabs] = useState<TabId[]>(() =>
    Array.from({ length: 8 }, (_, index) => defaultTabForRow(index)),
  );
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragRow, setDragRow] = useState<number | null>(null);
  const [barCount, setBarCount] = useState(8);

  useEffect(() => {
    function syncBarCount() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      const verticalMargin = Math.max(20, Math.min(42, height * 0.038));
      const rowHeight = Math.max(58, Math.min(72, height * 0.082));
      const nextCount = Math.max(5, Math.floor((height - verticalMargin * 2) / rowHeight));
      setBarCount(nextCount);
      setActiveTabs((current) =>
        Array.from({ length: nextCount }, (_, index) => current[index] ?? defaultTabForRow(index)),
      );
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
    setActiveTabs((current) =>
      current.map((value, index) => (index === rowIndex ? tabId : value)),
    );
  }

  function selectOffset(rowIndex: number, offset: number) {
    const activeTab = activeTabs[rowIndex] ?? "home";
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const nextIndex = Math.max(0, Math.min(tabs.length - 1, activeIndex + offset));
    setRowTab(rowIndex, tabs[nextIndex].id);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (dragStart === null || dragRow === null) {
      return;
    }

    const delta = event.clientX - dragStart;
    setDragStart(null);
    setDragRow(null);

    if (Math.abs(delta) < 32) {
      return;
    }

    selectOffset(dragRow, delta < 0 ? 1 : -1);
  }

  return (
    <main
      className="fixed inset-0 h-dvh touch-none select-none overflow-hidden overscroll-none bg-[linear-gradient(180deg,#f7f7f7_0%,#ffffff_42%,#f1f1f1_100%)] text-black caret-transparent [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onPointerCancel={() => {
        setDragStart(null);
        setDragRow(null);
      }}
      onPointerUp={handlePointerUp}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <section
        aria-label="Instagram navigation stack"
        className="mx-auto grid h-full w-full max-w-[470px] gap-[clamp(6px,1.1dvh,12px)] overflow-hidden px-[clamp(12px,4vw,18px)] py-[max(clamp(12px,3.8dvh,34px),env(safe-area-inset-top))] pb-[max(clamp(12px,3.8dvh,34px),env(safe-area-inset-bottom))]"
        style={{
          gridTemplateRows: `repeat(${barCount}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: barCount }, (_, rowIndex) => (
          <nav
            key={`sns-2-nav-${rowIndex}`}
            aria-label={`Instagram primary navigation ${rowIndex + 1}`}
            onPointerDown={(event) => {
              setDragStart(event.clientX);
              setDragRow(rowIndex);
            }}
            className="min-h-0 rounded-[999px] border border-white/60 bg-white/58 px-1.5 shadow-[0_14px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl"
          >
            <div className="relative h-full min-h-[48px]">
              {(() => {
                const activeTab = activeTabs[rowIndex] ?? "home";
                const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

                return (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute left-1.5 top-1/2 h-[calc(100%-8px)] min-h-10 rounded-full bg-white/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(255,255,255,0.22),0_10px_24px_rgba(0,0,0,0.1)] transition-[transform,width,opacity,filter] duration-[440ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        width: "calc((100% - 12px) / 5)",
                        transform: `translate3d(${activeIndex * 100}%, -50%, 0)`,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-1.5 top-1/2 h-[calc(100%-16px)] min-h-8 rounded-full bg-white/24 blur-md transition-transform duration-[520ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        width: "calc((100% - 12px) / 5)",
                        transform: `translate3d(${activeIndex * 100}%, -50%, 0)`,
                      }}
                    />
                  </>
                );
              })()}
              <div className="relative grid h-full grid-cols-5 items-center">
                {tabs.map((tab) => (
                  <TabButton
                    key={`${rowIndex}-${tab.id}`}
                    label={tab.label}
                    active={(activeTabs[rowIndex] ?? "home") === tab.id}
                    onClick={() => setRowTab(rowIndex, tab.id)}
                  >
                    {tab.icon}
                  </TabButton>
                ))}
              </div>
            </div>
          </nav>
        ))}
      </section>
    </main>
  );
}
