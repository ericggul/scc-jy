import type { MeditationContentSlug } from "../../model/content-catalog";

type LocalMeditationHistoryEntry = {
  completedAt: number;
  didFinish: boolean;
  slug: MeditationContentSlug;
};

type LocalMeditationResumePoint = {
  slug: MeditationContentSlug;
  viewedAt: number;
};

const historyStorageKey = "ddong-meong:local-meditation-history";
const resumeStorageKey = "ddong-meong:local-meditation-resume";
const retentionMs = 30 * 60 * 1000;

function isLocalBrowser() {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

function isFresh(timestamp: unknown, now: number): timestamp is number {
  return (
    typeof timestamp === "number" &&
    Number.isFinite(timestamp) &&
    timestamp <= now &&
    now - timestamp <= retentionMs
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
    // Local-only testing helpers can fail silently when browser storage is blocked.
  }
}

export function readLocalMeditationHistory() {
  if (!isLocalBrowser()) return [] as LocalMeditationHistoryEntry[];

  const now = Date.now();
  const stored = readStoredValue(historyStorageKey);
  const entries = Array.isArray(stored)
    ? stored.filter(
        (entry): entry is LocalMeditationHistoryEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.slug === "string" &&
          typeof entry.didFinish === "boolean" &&
          isFresh(entry.completedAt, now),
      )
    : [];

  writeStoredValue(historyStorageKey, entries);
  return entries;
}

export function readLocalMeditationResumePoint() {
  if (!isLocalBrowser()) return undefined;

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
      // Local-only testing helpers can fail silently when browser storage is blocked.
    }
    return undefined;
  }

  return stored as LocalMeditationResumePoint;
}

export function markLocalMeditationViewed(slug: MeditationContentSlug) {
  if (!isLocalBrowser()) return;
  writeStoredValue(resumeStorageKey, { slug, viewedAt: Date.now() });
}

export function recordLocalMeditationHistory(
  slug: MeditationContentSlug,
  didFinish: boolean,
) {
  if (!isLocalBrowser()) return;

  const completedAt = Date.now();
  const history = readLocalMeditationHistory().filter(
    (entry) => entry.slug !== slug,
  );
  history.push({ completedAt, didFinish, slug });
  writeStoredValue(historyStorageKey, history);
}
