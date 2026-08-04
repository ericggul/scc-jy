export const SCORE_TICKS_PER_QUARTER = 120;
export const SCORE_BAR_TICKS = SCORE_TICKS_PER_QUARTER * 4;

export type ScorePitch = {
  pitch: string;
  step: number;
};

export type ScoreArticulation = "accent" | "marcato" | "staccato";

export type ScoreVoiceEvent = {
  id: string;
  onset: number;
  duration: 30 | 60 | 120 | 180 | 240 | 360 | 480;
  pitches: readonly ScorePitch[];
  rest?: boolean;
  articulation?: ScoreArticulation;
  dynamic?: "ff" | "fff";
};

export type ScoreVoice = {
  id: string;
  staff: number;
  clef: "treble" | "bass";
  stem: 1 | -1;
  events: readonly ScoreVoiceEvent[];
};

export type LatentScoreEvent = ScoreVoiceEvent & {
  sequence: number;
  staff: number;
  clef: ScoreVoice["clef"];
  revealId: string;
};

type PitchInput = readonly [pitch: string, step?: number];
type EventInput = Omit<ScoreVoiceEvent, "id" | "pitches"> & {
  pitches?: readonly PitchInput[];
};

const TREBLE_STEPS: Record<string, number> = {
  C: -2,
  D: -1,
  E: 0,
  F: 1,
  G: 2,
  A: 3,
  B: 4,
};

const BASS_STEPS: Record<string, number> = {
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 0,
  A: 1,
  B: 2,
};

function staffStep(pitch: string, clef: ScoreVoice["clef"]) {
  const match = /^([A-G])(?:#|b)?(-?\d+)$/.exec(pitch);
  if (!match) return 0;
  const [, letter, octaveText] = match;
  const octave = Number(octaveText);
  if (clef === "bass") return BASS_STEPS[letter] + (octave - 2) * 7;
  return TREBLE_STEPS[letter] + (octave - 4) * 7;
}

function voice(
  id: string,
  staff: number,
  clef: ScoreVoice["clef"],
  stem: ScoreVoice["stem"],
  inputs: readonly EventInput[],
): ScoreVoice {
  return {
    id,
    staff,
    clef,
    stem,
    events: inputs.map((input, index) => ({
      ...input,
      id: `${id}-${String(index + 1).padStart(2, "0")}`,
      pitches: (input.pitches ?? []).map(([pitch, explicitStep]) => ({
        pitch,
        step: explicitStep ?? staffStep(pitch, clef),
      })),
    })),
  };
}

const melody = ["F5", "E5", "E5", "G5", "F5", "E5", "E5", "A#5"] as const;

const strings = Array.from({ length: 16 }, (_, index): EventInput => {
  const upperPitch = index % 2 === 0 ? melody[index / 2] : null;
  return {
    onset: index * 30,
    duration: 30,
    pitches: [
      ["C#4"],
      ["G4"],
      ["A#4"],
      ...(upperPitch ? ([[upperPitch]] as const) : []),
    ],
    articulation: index % 4 === 0 ? "accent" : undefined,
    dynamic: index === 0 ? "fff" : undefined,
  };
});

// Gustav Mahler, Symphony No. 1 in D major, movement IV. This excerpt begins
// at tick 51,840 (sequencer bar 109; the number is not asserted as the printed
// edition's rehearsal or measure number).
// This is a five-staff concert-pitch reduction of the 1998 Lucarelli sequence,
// checked against the 1906 Universal Edition full score. Its timing retains the
// source's 120 PPQ values: 30 = sixteenth, 60 = eighth, 180 = dotted quarter.
export const MAHLER_ONE_IV_109_VOICES: readonly ScoreVoice[] = [
  voice(
    "woodwind-melody",
    0,
    "treble",
    1,
    melody.map((pitch, index) => ({
      onset: index * 60,
      duration: 60,
      pitches: [[pitch]],
      articulation: index === 0 || index === 3 || index === 7 ? "accent" : undefined,
      dynamic: index === 0 ? "ff" : undefined,
    })),
  ),
  voice("woodwind-harmony", 1, "treble", -1, [
    {
      onset: 0,
      duration: 480,
      pitches: [["C#4"], ["G4"], ["A#4"]],
      dynamic: "ff",
    },
  ]),
  voice("trumpets", 2, "treble", 1, [
    {
      onset: 0,
      duration: 120,
      pitches: [["C#5"]],
      articulation: "marcato",
      dynamic: "fff",
    },
    { onset: 120, duration: 60, pitches: [["C5"]] },
    { onset: 180, duration: 60, pitches: [["A#4"]] },
    { onset: 240, duration: 120, pitches: [["C#5"]] },
    { onset: 360, duration: 60, pitches: [["C5"]] },
    { onset: 420, duration: 60, pitches: [["A#4"]] },
  ]),
  voice("trombones", 2, "treble", -1, [
    {
      onset: 0,
      duration: 60,
      pitches: [["A#4"]],
      articulation: "accent",
      dynamic: "ff",
    },
    { onset: 60, duration: 180, pitches: [], rest: true },
    { onset: 240, duration: 240, pitches: [], rest: true },
  ]),
  voice("strings", 3, "treble", 1, strings),
  voice("basses", 4, "bass", -1, [
    {
      onset: 0,
      duration: 180,
      pitches: [["F2"], ["F3"]],
      articulation: "accent",
      dynamic: "ff",
    },
    { onset: 180, duration: 60, pitches: [["C2"], ["C3"]], articulation: "accent" },
    { onset: 240, duration: 180, pitches: [["F2"], ["F3"]], articulation: "accent" },
    { onset: 420, duration: 60, pitches: [["C2"], ["C3"]], articulation: "accent" },
  ]),
];

export const MAHLER_ONE_IV_109: readonly LatentScoreEvent[] =
  MAHLER_ONE_IV_109_VOICES.flatMap((scoreVoice) =>
    scoreVoice.events.map((event) => ({
      ...event,
      sequence: event.onset,
      staff: scoreVoice.staff,
      clef: scoreVoice.clef,
      revealId: event.id,
    })),
  );

export const MUSIC_SHEET_TITLE =
  "Mahler — Symphony No. 1, movement IV (concert-pitch reduction)";
