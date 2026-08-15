export const lyricCues = [
  ["The signal keeps", "its own time"],
  ["The light arrives", "before the sound"],
  ["No one waits", "for the last train"],
  ["We carry the", "same transmission"],
] as const;

export const lyricWordTimings = [
  { word: "The", durationMs: 250, cueIndex: 0 },
  { word: "signal", durationMs: 320, cueIndex: 0 },
  { word: "keeps", durationMs: 390, cueIndex: 0 },
  { word: "its", durationMs: 230, cueIndex: 0 },
  { word: "own", durationMs: 310, cueIndex: 0 },
  { word: "time", durationMs: 600, cueIndex: 0 },
  { word: "The", durationMs: 260, cueIndex: 1 },
  { word: "light", durationMs: 360, cueIndex: 1 },
  { word: "arrives", durationMs: 560, cueIndex: 1 },
  { word: "before", durationMs: 420, cueIndex: 1 },
  { word: "the", durationMs: 220, cueIndex: 1 },
  { word: "sound", durationMs: 680, cueIndex: 1 },
  { word: "No", durationMs: 280, cueIndex: 2 },
  { word: "one", durationMs: 260, cueIndex: 2 },
  { word: "waits", durationMs: 440, cueIndex: 2 },
  { word: "for", durationMs: 210, cueIndex: 2 },
  { word: "the", durationMs: 190, cueIndex: 2 },
  { word: "last", durationMs: 330, cueIndex: 2 },
  { word: "train", durationMs: 640, cueIndex: 2 },
  { word: "We", durationMs: 300, cueIndex: 3 },
  { word: "carry", durationMs: 400, cueIndex: 3 },
  { word: "the", durationMs: 220, cueIndex: 3 },
  { word: "same", durationMs: 370, cueIndex: 3 },
  { word: "transmission", durationMs: 760, cueIndex: 3 },
] as const;

export const lyricWords = lyricWordTimings.map(({ word }) => word);

export const lyricCycleDurationMs = lyricWordTimings.reduce(
  (total, { durationMs }) => total + durationMs,
  0,
);
