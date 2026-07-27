// Instagram-style bounds: a video's own natural ratio is honored between
// these two limits (the card/fullscreen box just matches it exactly, no
// bars) and clamped outside them. Clamping also caps the damage from
// expo-av occasionally misreporting `naturalSize` for videos whose
// rotation is stored as stream metadata rather than swapped dimensions —
// worst case is slightly-off letterboxing, never a broken layout.
// Bounds scaled down (÷1.25 vs. the original 4:5/1.91 Instagram-style caps)
// so every feed media box renders 25% taller for the same width — gives
// vertically-shot photos/videos more room instead of being squeezed into a
// landscape-biased box.
const MIN_RATIO = 0.8 / 1.25; // was 4:5 portrait cap
const MAX_RATIO = 1.91 / 1.25; // was landscape cap
const DEFAULT_RATIO = 16 / 9 / 1.25;

// rawRatio is width/height. Returns the ratio the video's box should
// render at, and whether that differs from the raw ratio enough that
// letterbox/pillarbox bars (and therefore the blurred background layer)
// are actually needed.
export function clampAspectRatio(rawRatio) {
  if (!rawRatio || !Number.isFinite(rawRatio) || rawRatio <= 0) {
    return { displayRatio: DEFAULT_RATIO, needsBlur: false };
  }
  const displayRatio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, rawRatio));
  const needsBlur = Math.abs(displayRatio - rawRatio) > 0.01;
  return { displayRatio, needsBlur };
}
