import { partnerSoundClips } from "./content/partner-sounds.js";
const key = "erin-partner-audio-v1";
let fallback = { enabled: false, volume: 0.5 },
  playing = null,
  timer = null;
export function audioPreferences() {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    if (
      raw &&
      typeof raw.enabled === "boolean" &&
      typeof raw.volume === "number" &&
      Number.isFinite(raw.volume)
    )
      fallback = {
        enabled: raw.enabled,
        volume: Math.max(0, Math.min(1, raw.volume)),
      };
  } catch {
    /* default muted when storage is unavailable */
  }
  return { ...fallback };
}
export function setAudioPreferences(next) {
  fallback = {
    enabled: Boolean(next.enabled),
    volume: Math.max(0, Math.min(1, Number(next.volume) || 0)),
  };
  try {
    localStorage.setItem(key, JSON.stringify(fallback));
  } catch {
    /* session-only setting */
  }
  if (!fallback.enabled) stopPartnerSound();
  if (playing) playing.volume = fallback.volume;
  return { ...fallback };
}
export function installedSoundCount() {
  return Object.values(partnerSoundClips).reduce(
    (n, states) =>
      n + Object.values(states).reduce((m, clips) => m + clips.length, 0),
    0,
  );
}
export function stopPartnerSound() {
  clearTimeout(timer);
  playing?.pause();
  playing = null;
}
export async function playPartnerSound(id, state, variant = 0) {
  const prefs = audioPreferences();
  if (!prefs.enabled) return "muted";
  const clips = partnerSoundClips[id]?.[state];
  if (!clips?.length) return "not-installed";
  const clip = clips[Math.abs(variant) % clips.length];
  if (
    !/^\.\/public\/audio\/[a-zA-Z0-9_./-]+\.(mp3|wav|ogg|m4a)$/.test(
      clip.file,
    ) ||
    clip.file.includes("..")
  )
    return "invalid-path";
  stopPartnerSound();
  const audio = new Audio(clip.file);
  playing = audio;
  audio.volume = prefs.volume;
  try {
    await audio.play();
    if (playing === audio)
      timer = setTimeout(
        stopPartnerSound,
        Math.max(250, Math.min(3000, clip.maxMs || 1800)),
      );
    return "playing";
  } catch {
    if (playing === audio) playing = null;
    return "tap-to-enable";
  }
}
