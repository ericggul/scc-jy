import type { DdongMeongArchiveEntry } from "../../model/types";
import { displayMeditationContentTitle } from "../../model/content-catalog";

export type ContentRanking = {
  slug: string;
  title: string;
  sessions: number;
  durationMs: number;
};

export type BuildingUsage = {
  building: string;
  sessions: number;
  durationMs: number;
};

export type ParticipantRanking = {
  participantId: string;
  nickname: string;
  sessions: number;
  durationMs: number;
};

function normalizeBuilding(building: string | undefined) {
  return building?.trim().toUpperCase() || null;
}

export function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분 ${seconds}초`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

export function getContentRankings(entries: DdongMeongArchiveEntry[]) {
  const rankings = new Map<string, ContentRanking>();

  entries.forEach((entry) => {
    const current = rankings.get(entry.contentSlug) ?? {
      slug: entry.contentSlug,
      title: displayMeditationContentTitle(entry.contentSlug, entry.contentTitle),
      sessions: 0,
      durationMs: 0,
    };
    current.sessions += 1;
    current.durationMs += entry.durationMs;
    rankings.set(entry.contentSlug, current);
  });

  return [...rankings.values()].sort(
    (first, second) =>
      second.sessions - first.sessions ||
      second.durationMs - first.durationMs ||
      first.title.localeCompare(second.title, "ko"),
  );
}

export function getParticipantRankings(entries: DdongMeongArchiveEntry[]) {
  const rankings = new Map<string, ParticipantRanking>();

  entries.forEach((entry) => {
    const current = rankings.get(entry.participantId) ?? {
      participantId: entry.participantId,
      nickname: entry.nickname,
      sessions: 0,
      durationMs: 0,
    };
    current.nickname = entry.nickname;
    current.sessions += 1;
    current.durationMs += entry.durationMs;
    rankings.set(entry.participantId, current);
  });

  return [...rankings.values()].sort(
    (first, second) =>
      second.durationMs - first.durationMs ||
      second.sessions - first.sessions ||
      first.nickname.localeCompare(second.nickname, "ko"),
  );
}

export function getBuildingUsage(entries: DdongMeongArchiveEntry[]) {
  const usage = new Map<string, BuildingUsage>();

  entries.forEach((entry) => {
    const building = normalizeBuilding(entry.entryContext?.building);
    if (!building) return;
    const current = usage.get(building) ?? {
      building,
      sessions: 0,
      durationMs: 0,
    };
    current.sessions += 1;
    current.durationMs += entry.durationMs;
    usage.set(building, current);
  });

  return [...usage.values()].sort(
    (first, second) =>
      second.sessions - first.sessions ||
      second.durationMs - first.durationMs ||
      first.building.localeCompare(second.building),
  );
}

export function getTotalDuration(entries: DdongMeongArchiveEntry[]) {
  return entries.reduce((total, entry) => total + entry.durationMs, 0);
}
