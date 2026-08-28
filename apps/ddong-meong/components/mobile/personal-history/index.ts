import { meditationContents } from "../../model/content-catalog";
import type {
  DdongMeongArchiveEntry,
  DdongMeongSessionOutcome,
} from "../../model/types";
import { readSavedNickname } from "../identity";

const storageKey = "ddong-meong:personal-sessions:v1";
const participantStorageKey = "ddong-meong:participant";
const legacyMapStorageKey = "ddong-meong:my-poop-map:records";
const legacyHistoryStorageKey = "ddong-meong:local-meditation-history";
const storageVersion = 1;
const maximumEntries = 500;
const storageChangeEvent = "ddong-meong:personal-sessions-changed";

const knownContent: ReadonlyMap<string, string> = new Map(
  meditationContents.map((content) => [content.slug, content.title]),
);
const allOutcomes: ReadonlySet<DdongMeongSessionOutcome> = new Set([
  "completed",
  "flushed",
  "left",
  "backgrounded",
  "idle",
  "overflowed",
]);
const completedOutcomes: ReadonlySet<DdongMeongSessionOutcome> = new Set([
  "completed",
  "flushed",
  "overflowed",
]);

type PersonalSessionStore = {
  records: DdongMeongArchiveEntry[];
  version: number;
};

export type PersonalSessionInput = {
  contentSlug: string;
  contentTitle: string;
  durationMs: number;
  endedAt: number;
  interactionCount: number;
  nickname?: string;
  outcome: DdongMeongSessionOutcome;
  startedAt: number;
};

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isKnownOutcome(value: unknown): value is DdongMeongSessionOutcome {
  return typeof value === "string" && allOutcomes.has(value as DdongMeongSessionOutcome);
}

function isArchiveEntry(value: unknown): value is DdongMeongArchiveEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.contentSlug === "string" &&
    knownContent.has(entry.contentSlug) &&
    typeof entry.contentTitle === "string" &&
    typeof entry.dayKey === "string" &&
    typeof entry.nickname === "string" &&
    typeof entry.participantId === "string" &&
    isTimestamp(entry.startedAt) &&
    isTimestamp(entry.endedAt) &&
    typeof entry.durationMs === "number" &&
    Number.isFinite(entry.durationMs) &&
    entry.durationMs >= 0 &&
    typeof entry.interactionCount === "number" &&
    Number.isSafeInteger(entry.interactionCount) &&
    entry.interactionCount >= 0 &&
    isKnownOutcome(entry.outcome)
  );
}

function koreanDayKey(timestamp: number) {
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

function createIdentifier(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}${crypto.randomUUID()}`;
  }

  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function cleanRecords(entries: DdongMeongArchiveEntry[]) {
  const byId = new Map<string, DdongMeongArchiveEntry>();

  for (const entry of entries) {
    if (!isArchiveEntry(entry)) continue;
    byId.set(entry.id, entry);
  }

  return [...byId.values()]
    .sort(
      (first, second) =>
        second.endedAt - first.endedAt || first.id.localeCompare(second.id),
    )
    .slice(0, maximumEntries);
}

function readStore() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return undefined;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }

    const value = parsed as Partial<PersonalSessionStore>;
    return value.version === storageVersion && Array.isArray(value.records)
      ? cleanRecords(value.records)
      : undefined;
  } catch {
    return undefined;
  }
}

function writeStore(records: DdongMeongArchiveEntry[]) {
  try {
    const value: PersonalSessionStore = {
      records: cleanRecords(records),
      version: storageVersion,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(value));
    window.dispatchEvent(new Event(storageChangeEvent));
    return value.records;
  } catch {
    return undefined;
  }
}

function readLegacyMapRecords() {
  try {
    const stored = window.localStorage.getItem(legacyMapStorageKey);
    if (!stored) return [] as DdongMeongArchiveEntry[];
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) return cleanRecords(parsed);
    if (!parsed || typeof parsed !== "object") return [];

    const value = parsed as Partial<PersonalSessionStore>;
    return Array.isArray(value.records) ? cleanRecords(value.records) : [];
  } catch {
    return [];
  }
}

function readLegacyHistory() {
  try {
    const stored = window.localStorage.getItem(legacyHistoryStorageKey);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [] as DdongMeongArchiveEntry[];

    const participantId = getPersonalParticipantId();
    const nickname = readSavedNickname() ?? "이름 없는 사람";
    return parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const entry = value as Record<string, unknown>;
      if (
        typeof entry.slug !== "string" ||
        !knownContent.has(entry.slug) ||
        !isTimestamp(entry.completedAt) ||
        typeof entry.didFinish !== "boolean"
      ) {
        return [];
      }

      return [
        {
          contentSlug: entry.slug,
          contentTitle: knownContent.get(entry.slug)!,
          dayKey: koreanDayKey(entry.completedAt),
          durationMs: 0,
          endedAt: entry.completedAt,
          id: `legacy-${entry.completedAt}-${entry.slug}`,
          interactionCount: 0,
          nickname,
          outcome: entry.didFinish ? "completed" : "left",
          participantId,
          startedAt: entry.completedAt,
        } satisfies DdongMeongArchiveEntry,
      ];
    });
  } catch {
    return [];
  }
}

function ensureStore() {
  const stored = readStore();
  if (stored) return stored;

  return (
    writeStore([...readLegacyMapRecords(), ...readLegacyHistory()]) ??
    ([] as DdongMeongArchiveEntry[])
  );
}

export function getPersonalParticipantId() {
  if (typeof window === "undefined") return "";

  try {
    const persistentId = window.localStorage.getItem(participantStorageKey);
    if (persistentId && persistentId.length <= 128) return persistentId;

    const tabId = window.sessionStorage.getItem(participantStorageKey);
    const participantId =
      tabId && tabId.length <= 128 ? tabId : createIdentifier("participant-");
    window.localStorage.setItem(participantStorageKey, participantId);
    window.sessionStorage.setItem(participantStorageKey, participantId);
    return participantId;
  } catch {
    return createIdentifier("participant-");
  }
}

export function readPersonalSessionRecords() {
  if (typeof window === "undefined") return [] as DdongMeongArchiveEntry[];
  return ensureStore();
}

export function readPersonalPoopMapRecords() {
  return readPersonalSessionRecords().filter((entry) =>
    completedOutcomes.has(entry.outcome),
  );
}

export function recordPersonalSession(input: PersonalSessionInput) {
  if (typeof window === "undefined" || !knownContent.has(input.contentSlug)) {
    return false;
  }

  const endedAt = Math.max(0, Math.floor(input.endedAt));
  const startedAt = Math.min(endedAt, Math.max(0, Math.floor(input.startedAt)));
  const record: DdongMeongArchiveEntry = {
    contentSlug: input.contentSlug,
    contentTitle: input.contentTitle.trim().slice(0, 160) || knownContent.get(input.contentSlug)!,
    dayKey: koreanDayKey(endedAt),
    durationMs: Math.min(
      endedAt - startedAt,
      Math.max(0, Math.floor(input.durationMs)),
    ),
    endedAt,
    id: createIdentifier("personal-"),
    interactionCount: Math.max(0, Math.floor(input.interactionCount)),
    nickname: input.nickname?.trim().slice(0, 16) || readSavedNickname() || "이름 없는 사람",
    outcome: input.outcome,
    participantId: getPersonalParticipantId(),
    startedAt,
  };

  return Boolean(writeStore([...ensureStore(), record]));
}

export function subscribeToPersonalSessionRecords(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const receiveStorageChange = (event: StorageEvent) => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener("storage", receiveStorageChange);
  window.addEventListener(storageChangeEvent, listener);

  return () => {
    window.removeEventListener("storage", receiveStorageChange);
    window.removeEventListener(storageChangeEvent, listener);
  };
}
