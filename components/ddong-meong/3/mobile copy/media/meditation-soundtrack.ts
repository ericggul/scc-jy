const soundtrackElementId = "ddong-meong-3-meditation-soundtrack";
let scheduledStop = 0;

export const meditationSoundtrackPath =
  "/ddong-meong/3/river-flows-in-you.mp3";

function getSoundtrackElement() {
  if (typeof document === "undefined") return null;

  const existing = document.getElementById(soundtrackElementId);
  if (existing instanceof HTMLAudioElement) return existing;

  const audio = document.createElement("audio");
  audio.id = soundtrackElementId;
  audio.src = meditationSoundtrackPath;
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.68;
  audio.setAttribute("playsinline", "");
  audio.hidden = true;
  document.body.append(audio);
  return audio;
}

export function playMeditationSoundtrack({ restart = false } = {}) {
  const audio = getSoundtrackElement();
  if (!audio) return;

  window.clearTimeout(scheduledStop);
  scheduledStop = 0;
  if (restart) audio.currentTime = 0;
  void audio.play().catch(() => {
    // Direct URL entry may be blocked until the first user interaction.
  });
}

export function stopMeditationSoundtrack() {
  const audio = getSoundtrackElement();
  if (!audio) return;

  window.clearTimeout(scheduledStop);
  scheduledStop = 0;
  audio.pause();
  audio.currentTime = 0;
}

export function scheduleMeditationSoundtrackStop() {
  if (typeof window === "undefined") return;

  window.clearTimeout(scheduledStop);
  scheduledStop = window.setTimeout(stopMeditationSoundtrack, 120);
}
