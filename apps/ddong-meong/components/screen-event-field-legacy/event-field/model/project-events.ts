import { meditationContents } from "../../../model/content-catalog";
import type { DdongMeongArchiveEntry } from "../../../model/types";

const maximumEntries = 500;
const minimumTimelineSpanMs = 6 * 60 * 60 * 1_000;
const contentIndexBySlug = new Map<string, number>(
  meditationContents.map(({ slug }, index) => [slug, index]),
);

export type EventFieldPoint = {
  entry: DdongMeongArchiveEntry;
  index: number;
  rotation: number;
  x: number;
  y: number;
  z: number;
};

function hash(value: string) {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeContent(slug: string) {
  const index = contentIndexBySlug.get(slug) ?? 0;
  const divisor = Math.max(1, meditationContents.length - 1);
  return index / divisor;
}

export function formatEventTime(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "numeric",
    timeZone: "Asia/Seoul",
  }).format(timestamp);
}

export function projectEventField(
  archive: DdongMeongArchiveEntry[],
): EventFieldPoint[] {
  const entries = archive
    .slice()
    .sort(
      (first, second) =>
        first.endedAt - second.endedAt || first.id.localeCompare(second.id),
    )
    .slice(-maximumEntries);

  const firstEndedAt = entries[0]?.endedAt ?? 0;
  const lastEndedAt = entries.at(-1)?.endedAt ?? firstEndedAt;
  const timelineSpan = Math.max(
    minimumTimelineSpanMs,
    lastEndedAt - firstEndedAt,
  );
  const timelineCenter = (firstEndedAt + lastEndedAt) / 2;
  const timelineStart = timelineCenter - timelineSpan / 2;

  return entries
    .map((entry, index) => {
      const time = clamp(
        (entry.endedAt - timelineStart) / timelineSpan,
        0,
        1,
      );
      const duration = clamp(
        entry.durationMs / ((4 * 60 + 33) * 1_000),
        0,
        1,
      );
      const content = normalizeContent(entry.contentSlug);

      return {
        entry,
        index,
        rotation: (hash(entry.id) / 0xffff_ffff) * Math.PI * 2,
        x: -11.4 + time * 22.8,
        y: 0.44 + duration * 7.2,
        z: -7.2 + content * 14.4,
      };
    });
}
