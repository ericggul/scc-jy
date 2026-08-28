import { meditationContents } from "../../../model/content-catalog";
import type {
  DdongMeongArchiveEntry,
  DdongMeongSessionOutcome,
} from "../../../model/types";

const dayMs = 24 * 60 * 60 * 1_000;
const outcomes: readonly DdongMeongSessionOutcome[] = [
  "completed",
  "completed",
  "completed",
  "flushed",
  "idle",
  "overflowed",
];

function createRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function getKoreanDayKey(timestamp: number) {
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

export function createEventFieldTestDataset({
  count = 100,
  now,
  seed,
}: {
  count?: number;
  now: number;
  seed: number;
}): DdongMeongArchiveEntry[] {
  const random = createRandom(seed);

  return Array.from({ length: count }, (_, index) => {
    const content = meditationContents[
      Math.floor(random() * meditationContents.length)
    ];
    const durationMs = Math.round(
      8_000 + Math.pow(random(), 0.78) * 265_000,
    );
    const endedAt = now - Math.floor(random() * 7 * dayMs);

    return {
      contentSlug: content.slug,
      contentTitle: content.title,
      dayKey: getKoreanDayKey(endedAt),
      durationMs,
      endedAt,
      id: `event-field-test-${seed}-${index}`,
      interactionCount: Math.floor(random() * 28),
      nickname: `테스트 ${String(index + 1).padStart(3, "0")}`,
      outcome: outcomes[Math.floor(random() * outcomes.length)],
      participantId: `event-field-test-participant-${seed}-${Math.floor(random() * 16)}`,
      startedAt: endedAt - durationMs,
    };
  }).sort(
    (first, second) =>
      second.endedAt - first.endedAt || first.id.localeCompare(second.id),
  );
}
