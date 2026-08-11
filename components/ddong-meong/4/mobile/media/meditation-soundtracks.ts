export type MeditationSoundtrack = {
  id: string;
  label: string;
  sourcePath: string;
  mood: string;
  license: string;
  attribution: string;
  sourceUrl: string | null;
};

// This is intentionally only a catalog. The player continues to use the
// existing soundtrack until a later experiment assigns a track per content.
export const meditationSoundtracks = [
  {
    id: "current",
    label: "Current soundtrack",
    sourcePath: "/ddong-meong/4/audio/river-flows-in-you.mp3",
    mood: "Current shared baseline",
    license: "Not recorded in this repository; verify before distribution.",
    attribution: "Existing repository asset; attribution was not supplied.",
    sourceUrl: null,
  },
  {
    id: "airport-lounge",
    label: "Airport Lounge",
    sourcePath: "/ddong-meong/4/audio/airport-lounge.mp3",
    mood: "Light, airy terminal-lounge jazz",
    license: "CC BY 4.0",
    attribution:
      "\"Airport Lounge\" Kevin MacLeod (incompetech.com), CC BY 4.0.",
    sourceUrl:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100806",
  },
  {
    id: "bossa-bossa",
    label: "BossaBossa",
    sourcePath: "/ddong-meong/4/audio/bossa-bossa.mp3",
    mood: "Slow, unhurried bossa nova",
    license: "CC BY 4.0",
    attribution:
      "\"BossaBossa\" Kevin MacLeod (incompetech.com), CC BY 4.0.",
    sourceUrl:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600055",
  },
  {
    id: "casa-bossa-nova",
    label: "Casa Bossa Nova",
    sourcePath: "/ddong-meong/4/audio/casa-bossa-nova.mp3",
    mood: "Warm waiting-room bossa nova",
    license: "CC BY 4.0",
    attribution:
      "\"Casa Bossa Nova\" Kevin MacLeod (incompetech.com), CC BY 4.0.",
    sourceUrl:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600012",
  },
  {
    id: "lobby-time",
    label: "Lobby Time",
    sourcePath: "/ddong-meong/4/audio/lobby-time.mp3",
    mood: "Retro hotel-lobby piano and vibes",
    license: "CC BY 4.0",
    attribution:
      "\"Lobby Time\" Kevin MacLeod (incompetech.com), CC BY 4.0.",
    sourceUrl:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600054",
  },
  {
    id: "local-forecast-elevator",
    label: "Local Forecast - Elevator",
    sourcePath: "/ddong-meong/4/audio/local-forecast-elevator.mp3",
    mood: "Deliberately low-fi elevator / rest-stop ambience",
    license: "CC BY 4.0",
    attribution:
      "\"Local Forecast - Elevator\" Kevin MacLeod (incompetech.com), CC BY 4.0.",
    sourceUrl:
      "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300012",
  },
] as const satisfies readonly MeditationSoundtrack[];

export const currentMeditationSoundtrack = meditationSoundtracks[0];
