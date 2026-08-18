"use client";

import { useEffect, useSyncExternalStore } from "react";
import type {
  DdongMeongArchiveEntry,
  DdongMeongSessionOutcome,
} from "../../model/types";
import { isDdongMeongEntryContext } from "../../model/entry-context";

const cacheKey = "ddong-meong:screen-archive";
const retentionMs = 30 * 24 * 60 * 60 * 1000;
const maximumEntries = 500;
const emptyArchive: DdongMeongArchiveEntry[] = [];
const listeners = new Set<() => void>();

let browserArchive: DdongMeongArchiveEntry[] | null = null;

const outcomes: ReadonlySet<DdongMeongSessionOutcome> = new Set([
  "completed",
  "flushed",
  "left",
  "backgrounded",
  "idle",
  "overflowed",
]);

function isArchiveEntry(value: unknown): value is DdongMeongArchiveEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.contentSlug === "string" &&
    typeof entry.contentTitle === "string" &&
    typeof entry.dayKey === "string" &&
    typeof entry.id === "string" &&
    typeof entry.interactionCount === "number" &&
    typeof entry.nickname === "string" &&
    typeof entry.participantId === "string" &&
    typeof entry.startedAt === "number" &&
    typeof entry.endedAt === "number" &&
    typeof entry.durationMs === "number" &&
    typeof entry.outcome === "string" &&
    (entry.entryContext === undefined ||
      isDdongMeongEntryContext(entry.entryContext)) &&
    outcomes.has(entry.outcome as DdongMeongSessionOutcome)
  );
}

function retainRecent(entries: DdongMeongArchiveEntry[], now = Date.now()) {
  const cutoff = now - retentionMs;
  const byId = new Map<string, DdongMeongArchiveEntry>();

  for (const entry of entries) {
    if (!isArchiveEntry(entry) || entry.endedAt < cutoff) continue;
    byId.set(entry.id, entry);
  }

  return [...byId.values()]
    .sort((first, second) => second.endedAt - first.endedAt)
    .slice(0, maximumEntries);
}

function equalArchive(
  first: DdongMeongArchiveEntry[],
  second: DdongMeongArchiveEntry[],
) {
  return (
    first.length === second.length &&
    first.every(
      (entry, index) =>
        entry.id === second[index]?.id &&
        entry.endedAt === second[index]?.endedAt,
    )
  );
}

function readArchive() {
  try {
    const stored = window.localStorage.getItem(cacheKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? retainRecent(parsed.filter(isArchiveEntry))
      : [];
  } catch {
    return [];
  }
}

function writeArchive(entries: DdongMeongArchiveEntry[]) {
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(entries));
  } catch {
    // Live screen data still renders if storage is unavailable.
  }
}

function getBrowserArchive() {
  if (typeof window === "undefined") return emptyArchive;
  if (browserArchive) return browserArchive;

  browserArchive = readArchive();
  return browserArchive;
}

function publishArchive(next: DdongMeongArchiveEntry[]) {
  const current = getBrowserArchive();
  if (equalArchive(current, next)) return;

  browserArchive = next;
  writeArchive(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const receiveStorageChange = (event: StorageEvent) => {
    if (event.key !== cacheKey) return;
    browserArchive = readArchive();
    listener();
  };

  window.addEventListener("storage", receiveStorageChange);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", receiveStorageChange);
  };
}

export function getKoreanDayKey(timestamp = Date.now()) {
  const values = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    values.find((value) => value.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function useBrowserArchive(socketArchive: DdongMeongArchiveEntry[]) {
  const archive = useSyncExternalStore(
    subscribe,
    getBrowserArchive,
    () => emptyArchive,
  );

  useEffect(() => {
    publishArchive(retainRecent([...getBrowserArchive(), ...socketArchive]));
  }, [socketArchive]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      publishArchive(retainRecent(getBrowserArchive()));
    }, 60 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  return archive;
}
