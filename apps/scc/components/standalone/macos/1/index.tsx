"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  type MenuEntry,
  type MenuCommand,
  type MenuId,
} from "./menu-data";
import {
  macosSloganRows,
  type MacosSloganRow,
} from "./rows";
import styles from "./macos-menu-bar.module.css";

type SearchResult = {
  pageId: number;
  title: string;
  excerpt: string;
};

type SearchResponse = {
  query: string;
  state: "loading" | "ready" | "error";
  results: readonly SearchResult[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createSearchDocument(response: SearchResponse) {
  const content =
    response.state === "loading"
      ? '<p class="message">Searching Wikipedia…</p>'
      : response.state === "error"
        ? '<p class="message">Results could not be loaded.</p>'
        : response.results.length === 0
          ? '<p class="message">No matching Wikipedia pages were found.</p>'
          : response.results
              .map(
                (result) => `
                  <article>
                    <a href="https://en.wikipedia.org/?curid=${result.pageId}" target="_blank" rel="noreferrer">
                      ${escapeHtml(result.title)}
                    </a>
                    <p>${escapeHtml(result.excerpt)}</p>
                  </article>
                `,
              )
              .join("");

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 22px 24px 40px;
            background: #fff;
            color: #202124;
            font: 14px/1.48 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
          }
          .source { margin: 0 0 18px; color: #6a6d72; font-size: 12px; }
          article { max-width: 640px; padding: 16px 0; border-top: 1px solid #e2e3e5; }
          article:first-of-type { border-top: 0; padding-top: 0; }
          a { color: #075eb7; font-size: 17px; font-weight: 600; text-decoration: none; }
          a:hover, a:focus { text-decoration: underline; }
          p { margin: 6px 0 0; }
          .message { color: #55585d; }
        </style>
      </head>
      <body>
        <p class="source">Wikipedia results for “${escapeHtml(response.query)}”</p>
        ${content}
      </body>
    </html>`;
}

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
  onSelect: (entry: MenuCommand) => void;
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
            if (!hasChildren) onSelect(entry);
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
  onOpenSearch,
}: {
  row: MacosSloganRow;
  virtualMinute: number;
  runtimeStatus: MacosSloganRow["status"];
  onOpenSearch: (name: string) => void;
}) {
  const [selectedMenu, setSelectedMenu] = useState<MenuId | null>(null);
  const menuButtonRefs = useRef(new Map<MenuId, HTMLButtonElement>());
  const rowRef = useRef<HTMLElement>(null);
  const clock = formatMenuBarTime(new Date(virtualMinute * 60_000));

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
      aria-label={row.brand}
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
                    onSelect={(entry) => {
                      setSelectedMenu(null);

                      if (entry.id === `${row.id}-brand-about`) {
                        onOpenSearch(row.brand);
                      }
                    }}
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
  const [virtualMinute] = useState(() => Math.floor(Date.now() / 60_000));
  const sharedStatus = macosSloganRows[0].status;
  const [searchName, setSearchName] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchResponse>({
    query: "",
    state: "loading",
    results: [],
  });
  const [stackLayout, setStackLayout] = useState({
    rowCount: 26,
  });

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

  const searchQuery = searchName ? `${searchName} Epstein file` : "";
  const wikipediaSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(searchQuery)}`;

  useEffect(() => {
    if (!searchName) return;

    const controller = new AbortController();
    const query = `${searchName} Epstein file`;
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      list: "search",
      format: "json",
      origin: "*",
      srlimit: "8",
      srsearch: query,
    }).toString();

    void fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Wikipedia search failed");
        return response.json() as Promise<{
          query?: {
            search?: Array<{ pageid: number; title: string; snippet: string }>;
          };
        }>;
      })
      .then((data) => {
        const parser = new DOMParser();
        const results = (data.query?.search ?? []).map((result) => ({
          pageId: result.pageid,
          title: result.title,
          excerpt:
            parser.parseFromString(result.snippet, "text/html").body
              .textContent ?? "",
        }));

        setSearchResponse({ query, state: "ready", results });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchResponse({ query, state: "error", results: [] });
      });

    return () => controller.abort();
  }, [searchName]);

  function openSearch(name: string) {
    const query = `${name} Epstein file`;
    setSearchName(name);
    setSearchResponse({ query, state: "loading", results: [] });
  }

  return (
    <main className={styles.desktop}>
      <section
        aria-label="Names appearing in the Epstein files"
        className={styles.rowStack}
        style={{
          gridTemplateRows: `repeat(${stackLayout.rowCount}, minmax(0, 1fr))`,
        }}
      >
        {macosSloganRows.slice(0, stackLayout.rowCount).map((row) => (
          <MenuBarRow
            key={row.id}
            row={row}
            virtualMinute={virtualMinute}
            runtimeStatus={sharedStatus}
            onOpenSearch={openSearch}
          />
        ))}
      </section>
      {searchName ? (
        <aside className={styles.searchWindow} aria-label={`${searchQuery} search results`}>
          <header className={styles.searchWindowBar}>
            <span className={styles.searchWindowTitle}>{searchQuery}</span>
            <div className={styles.searchWindowActions}>
              <a
                className={styles.searchWindowLink}
                href={wikipediaSearchUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Wikipedia
              </a>
              <button
                type="button"
                className={styles.searchWindowClose}
                aria-label="Close search results"
                onClick={() => setSearchName(null)}
              >
                ×
              </button>
            </div>
          </header>
          <iframe
            key={searchResponse.query}
            className={styles.searchFrame}
            srcDoc={createSearchDocument(searchResponse)}
            title={`${searchQuery} Wikipedia search results`}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
          />
        </aside>
      ) : null}
    </main>
  );
}
