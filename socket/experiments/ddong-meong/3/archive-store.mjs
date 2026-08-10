import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const archivePath = join(
  process.cwd(),
  "data",
  "ddong-meong",
  "3",
  "archive.json",
);
const maximumEntries = 5_000;

function isArchiveEntry(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.nickname === "string" &&
    typeof value.contentSlug === "string" &&
    typeof value.contentTitle === "string" &&
    typeof value.participantId === "string" &&
    typeof value.dayKey === "string" &&
    Number.isFinite(value.startedAt) &&
    Number.isFinite(value.endedAt) &&
    Number.isFinite(value.durationMs) &&
    Number.isFinite(value.interactionCount) &&
    (value.outcome === "completed" ||
      value.outcome === "flushed" ||
      value.outcome === "left")
  );
}

export function loadDdongMeongArchive() {
  try {
    const parsed = JSON.parse(readFileSync(archivePath, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArchiveEntry).slice(0, maximumEntries);
  } catch {
    return [];
  }
}

export function saveDdongMeongArchive(entries) {
  try {
    mkdirSync(dirname(archivePath), { recursive: true });
    writeFileSync(
      archivePath,
      JSON.stringify(entries.slice(0, maximumEntries), null, 2),
      "utf8",
    );
  } catch {
    // The active process still retains today's history when a deployment has
    // no writable local disk.
  }
}
