"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  type MenuEntry,
  type MenuId,
} from "./menu-data";
import {
  macosSloganRows,
  type MacosSloganRow,
} from "./rows";
import styles from "./macos-menu-bar.module.css";

function formatMenuBarTime(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(date);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(
    date,
  );
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${weekday} ${day} ${month} ${hour}:${minute}`;
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.appleIcon}
      viewBox="3 2.4 20.2 24.8"
    >
      <path d="M19.67 15.44c.03-3.03 2.48-4.49 2.59-4.56-1.41-2.07-3.61-2.35-4.39-2.38-1.87-.19-3.65 1.1-4.6 1.1-.95 0-2.42-1.07-3.98-1.04-2.05.03-3.94 1.19-5 3.02-2.13 3.69-.55 9.16 1.53 12.16 1.01 1.46 2.22 3.11 3.8 3.05 1.53-.06 2.11-.99 3.96-.99 1.85 0 2.37.99 3.98.96 1.64-.03 2.68-1.49 3.69-2.96 1.16-1.7 1.64-3.34 1.67-3.43-.04-.02-3.21-1.23-3.25-4.93ZM16.64 6.53c.84-1.02 1.41-2.44 1.25-3.86-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.35-1.28 3.74 1.35.1 2.73-.69 3.58-1.71Z" />
    </svg>
  );
}

function WifiIcon({ level }: { level: 0 | 1 | 2 | 3 }) {
  return (
    <svg
      aria-hidden="true"
      className={`${styles.statusIcon} ${styles.wifiIcon}`}
      viewBox="0 0 18 14"
      fill="none"
    >
      <path
        d="M1.25 4.34a12.36 12.36 0 0 1 15.5 0"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        opacity={level >= 3 ? 1 : 0.22}
      />
      <path
        d="M3.63 7.04a8.57 8.57 0 0 1 10.74 0"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        opacity={level >= 2 ? 1 : 0.22}
      />
      <path
        d="M6.15 9.66a4.48 4.48 0 0 1 5.7 0"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        opacity={level >= 1 ? 1 : 0.22}
      />
      <circle
        cx="9"
        cy="12.35"
        r="1.02"
        fill="currentColor"
        opacity={level >= 1 ? 1 : 0.3}
      />
      {level === 0 ? (
        <path
          d="M3 1.75 15.25 13"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function BatteryIcon({
  percentage,
  charging,
}: {
  percentage: number;
  charging: boolean;
}) {
  const fillWidth = Math.max(1.6, 20.2 * (percentage / 100));

  return (
    <svg
      aria-hidden="true"
      className={`${styles.statusIcon} ${styles.batteryIcon}`}
      viewBox="0 0 28 14"
      fill="none"
    >
      <rect
        x=".75"
        y="1.25"
        width="23.2"
        height="11.5"
        rx="3"
        stroke="currentColor"
        strokeOpacity=".9"
        strokeWidth="1.5"
      />
      <path
        d="M25 4.25c1.25.38 2 1.28 2 2.75s-.75 2.37-2 2.75v-5.5Z"
        fill="currentColor"
        fillOpacity=".72"
      />
      <rect
        x="2.25"
        y="2.75"
        width={fillWidth}
        height="8.5"
        rx="1.6"
        fill="currentColor"
      />
      {charging ? (
        <path
          d="m13.2 2.8-3.1 4.6h2.55l-.95 3.8 4.2-5.35h-2.7V2.8Z"
          fill={percentage >= 45 ? "#000" : "currentColor"}
        />
      ) : null}
    </svg>
  );
}

function focusMenuItem(
  event: KeyboardEvent<HTMLButtonElement>,
  direction: 1 | -1,
) {
  const menu = event.currentTarget.closest<HTMLElement>("[role='menu']");

  if (!menu) return;

  const items = Array.from(
    menu.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)"),
  ).filter(
    (item) => item.offsetParent !== null && item.closest("[role='menu']") === menu,
  );
  const currentIndex = items.indexOf(event.currentTarget);
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  items[nextIndex]?.focus();
}

function MenuEntries({
  entries,
  onSelect,
}: {
  entries: readonly MenuEntry[];
  onSelect: () => void;
}) {
  return entries.map((entry) => {
    if (entry.kind === "separator") {
      return <div key={entry.id} role="separator" className={styles.separator} />;
    }

    const hasChildren = Boolean(entry.children?.length);

    return (
      <div key={entry.id} className={styles.entryRoot}>
        <button
          type="button"
          role="menuitem"
          disabled={entry.disabled}
          aria-haspopup={hasChildren ? "menu" : undefined}
          className={styles.menuEntry}
          onClick={() => {
            if (!hasChildren) onSelect();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              focusMenuItem(event, 1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              focusMenuItem(event, -1);
            } else if (event.key === "ArrowRight" && hasChildren) {
              event.preventDefault();
              requestAnimationFrame(() => {
                event.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(
                    "[role='menu'] [role='menuitem']:not(:disabled)",
                  )
                  ?.focus();
              });
            } else if (event.key === "ArrowLeft") {
              const parentPanel = event.currentTarget.closest<HTMLElement>(
                `.${styles.submenuPanel}`,
              );
              const parentEntry = parentPanel?.parentElement?.querySelector<HTMLButtonElement>(
                ":scope > [role='menuitem']",
              );

              if (parentEntry) {
                event.preventDefault();
                parentEntry.focus();
              }
            }
          }}
        >
          <span className={styles.entryLabel}>{entry.label}</span>
          {entry.shortcut ? (
            <span className={styles.shortcut} aria-hidden="true">
              {entry.shortcut}
            </span>
          ) : null}
          {hasChildren ? (
            <span className={styles.chevron} aria-hidden="true">
              ›
            </span>
          ) : null}
        </button>
        {entry.children ? (
          <div
            role="menu"
            aria-label={entry.label}
            className={`${styles.menuPanel} ${styles.submenuPanel}`}
          >
            <MenuEntries entries={entry.children} onSelect={onSelect} />
          </div>
        ) : null}
      </div>
    );
  });
}

function MenuBarRow({
  row,
  virtualMinute,
  runtimeStatus,
}: {
  row: MacosSloganRow;
  virtualMinute: number;
  runtimeStatus: MacosSloganRow["status"];
}) {
  const [selectedMenu, setSelectedMenu] = useState<MenuId | null>(null);
  const menuButtonRefs = useRef(new Map<MenuId, HTMLButtonElement>());
  const rowRef = useRef<HTMLElement>(null);
  const clock = formatMenuBarTime(
    new Date(
      (virtualMinute + row.status.timeOffsetMinutes) * 60_000,
    ),
  );

  useEffect(() => {
    if (selectedMenu === null) return;

    function closeFromOutside(event: PointerEvent) {
      if (!rowRef.current?.contains(event.target as Node)) {
        setSelectedMenu(null);
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, [selectedMenu]);

  function toggleMenu(id: MenuId) {
    setSelectedMenu((current) => (current === id ? null : id));
  }

  function focusTopMenu(currentId: MenuId, direction: 1 | -1) {
    const currentIndex = row.menus.findIndex((menu) => menu.id === currentId);
    const nextIndex =
      (currentIndex + direction + row.menus.length) % row.menus.length;
    const nextMenu = row.menus[nextIndex];

    setSelectedMenu(nextMenu.id);
    requestAnimationFrame(() => menuButtonRefs.current.get(nextMenu.id)?.focus());
  }

  function handleTopMenuKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    menuId: MenuId,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMenu(menuId);
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            `[data-menu-panel='${menuId}'] [role='menuitem']:not(:disabled)`,
          )
          ?.focus();
      });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTopMenu(menuId, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTopMenu(menuId, -1);
    } else if (event.key === "Escape") {
      setSelectedMenu(null);
    }
  }

  return (
    <nav
      ref={rowRef}
      aria-label={`${row.brand}: ${row.phrase}`}
      className={`${styles.menuBar} ${selectedMenu !== null ? styles.menuBarOpen : ""}`}
      onMouseLeave={() => setSelectedMenu(null)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setSelectedMenu(null);
          if (selectedMenu) menuButtonRefs.current.get(selectedMenu)?.focus();
        }
      }}
    >
      <div className={styles.menuGroup}>
        {row.menus.map((menu, menuIndex) => {
          const isAppleMenu = menuIndex === 0;
          const isAppMenu = menuIndex === 1;
          const isOpen = selectedMenu === menu.id;

          return (
            <div
              key={menu.id}
              className={styles.topMenuRoot}
              data-menu-kind={
                isAppleMenu ? "apple" : isAppMenu ? "brand" : "word"
              }
              data-word-index={isAppleMenu || isAppMenu ? undefined : menuIndex - 2}
              onMouseEnter={() => {
                setSelectedMenu(menu.id);
              }}
            >
              <button
                ref={(node) => {
                  if (node) menuButtonRefs.current.set(menu.id, node);
                  else menuButtonRefs.current.delete(menu.id);
                }}
                type="button"
                aria-label={isAppleMenu ? "Apple menu" : undefined}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={`${isAppleMenu ? styles.appleButton : styles.menuButton} ${isAppMenu ? styles.appName : ""} ${isOpen ? styles.selected : ""}`}
                onClick={() => toggleMenu(menu.id)}
                onKeyDown={(event) => handleTopMenuKeyDown(event, menu.id)}
              >
                {isAppleMenu ? <AppleIcon /> : menu.label}
              </button>
              {isOpen ? (
                <div
                  role="menu"
                  aria-label={`${menu.label} menu`}
                  data-menu-panel={menu.id}
                  className={styles.menuPanel}
                >
                  <MenuEntries
                    entries={menu.entries}
                    onSelect={() => setSelectedMenu(null)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={styles.statusGroup} aria-label="System status">
        <span
          className={styles.batteryWrap}
          aria-label={`Battery ${Math.round(runtimeStatus.batteryPercent)} percent${runtimeStatus.charging ? ", charging" : ""}`}
        >
          <BatteryIcon
            percentage={runtimeStatus.batteryPercent}
            charging={runtimeStatus.charging}
          />
        </span>
        <span aria-label={`Wi-Fi signal level ${runtimeStatus.wifiLevel} of 3`}>
          <WifiIcon level={runtimeStatus.wifiLevel} />
        </span>
        <time className={styles.clock}>{clock}</time>
      </div>
    </nav>
  );
}

export default function MacosMenuBarOne() {
  const [simulation, setSimulation] = useState(() => ({
    virtualMinute: Math.floor(
      new Date(2026, 6, 10, 16, 15).getTime() / 60_000,
    ),
    statuses: macosSloganRows.map((row) => ({ ...row.status })),
    randomSeed: 0x6d_61_63_27,
  }));
  const [stackLayout, setStackLayout] = useState({
    rowCount: 26,
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSimulation((current) => {
        let randomSeed = current.randomSeed;
        const nextRandom = () => {
          randomSeed =
            (Math.imul(randomSeed, 1_664_525) + 1_013_904_223) >>> 0;
          return randomSeed / 4_294_967_296;
        };
        const statuses = current.statuses.map((status) => {
          let charging = status.charging;
          let batteryPercent = status.batteryPercent;

          if (charging) {
            batteryPercent += 0.12 + nextRandom() * 0.18;

            if (batteryPercent >= 99.5 || nextRandom() < 0.0025) {
              charging = false;
            }
          } else {
            batteryPercent -= 0.025 + nextRandom() * 0.055;

            if (batteryPercent <= 7 || nextRandom() < 0.0012) {
              charging = true;
            }
          }

          batteryPercent = Math.max(2, Math.min(100, batteryPercent));

          let wifiLevel = status.wifiLevel;
          if (nextRandom() < 0.026) {
            if (wifiLevel === 0) {
              wifiLevel = nextRandom() < 0.72 ? 1 : 0;
            } else if (wifiLevel === 3) {
              wifiLevel = nextRandom() < 0.7 ? 2 : 3;
            } else {
              wifiLevel = (wifiLevel + (nextRandom() < 0.5 ? -1 : 1)) as
                | 0
                | 1
                | 2
                | 3;
            }
          }

          return {
            ...status,
            batteryPercent,
            charging,
            wifiLevel,
          };
        });

        return {
          virtualMinute: current.virtualMinute + 1,
          statuses,
          randomSeed,
        };
      });
    }, 1_000 / 6);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function syncStackLayout() {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const rowCount = Math.min(
        macosSloganRows.length,
        Math.max(1, Math.floor(viewportHeight / 38)),
      );

      setStackLayout({ rowCount });
    }

    syncStackLayout();
    window.addEventListener("resize", syncStackLayout);
    window.visualViewport?.addEventListener("resize", syncStackLayout);

    return () => {
      window.removeEventListener("resize", syncStackLayout);
      window.visualViewport?.removeEventListener("resize", syncStackLayout);
    };
  }, []);

  return (
    <main className={styles.desktop}>
      <section
        aria-label="Mythic marketing menu bars"
        className={styles.rowStack}
        style={{
          gridTemplateRows: `repeat(${stackLayout.rowCount}, minmax(0, 1fr))`,
        }}
      >
        {macosSloganRows.slice(0, stackLayout.rowCount).map((row, rowIndex) => (
          <MenuBarRow
            key={row.id}
            row={row}
            virtualMinute={simulation.virtualMinute}
            runtimeStatus={simulation.statuses[rowIndex] ?? row.status}
          />
        ))}
      </section>
    </main>
  );
}
