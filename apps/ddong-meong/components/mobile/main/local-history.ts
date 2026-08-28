import type { MeditationContentSlug } from "../../model/content-catalog";
import { readPersonalSessionRecords } from "../personal-history";

type LocalMeditationHistoryEntry = {
  completedAt: number;
  didFinish: boolean;
  slug: MeditationContentSlug;
};

type LocalMeditationResumePoint = {
  slug: MeditationContentSlug;
  viewedAt: number;
};

const resumeStorageKey = "ddong-meong:local-meditation-resume";
const resumeRetentionMs = 30 * 60 * 1000;

function isFresh(timestamp: unknown, now: number): timestamp is number {
  return (
    typeof timestamp === "number" &&
    Number.isFinite(timestamp) &&
    timestamp <= now &&
    now - timestamp <= resumeRetentionMs
  );
}

function readStoredValue(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredValue(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Resume placement is optional when browser storage is unavailable.
  }
}

export function readLocalMeditationHistory() {
  return readPersonalSessionRecords().map(
    (entry) =>
      ({
        completedAt: entry.endedAt,
        didFinish:
          entry.outcome === "completed" ||
          entry.outcome === "flushed" ||
          entry.outcome === "overflowed",
        slug: entry.contentSlug as MeditationContentSlug,
      }) satisfies LocalMeditationHistoryEntry,
  );
}

export function readLocalMeditationResumePoint() {
  if (typeof window === "undefined") return undefined;

  const stored = readStoredValue(resumeStorageKey);
  const now = Date.now();
  if (
    typeof stored !== "object" ||
    stored === null ||
    typeof stored.slug !== "string" ||
    !isFresh(stored.viewedAt, now)
  ) {
    try {
      window.localStorage.removeItem(resumeStorageKey);
    } catch {
      // Resume placement is optional when browser storage is unavailable.
    }
    return undefined;
  }

  return stored as LocalMeditationResumePoint;
}

export function markLocalMeditationViewed(slug: MeditationContentSlug) {
  if (typeof window === "undefined") return;
  writeStoredValue(resumeStorageKey, { slug, viewedAt: Date.now() });
}
