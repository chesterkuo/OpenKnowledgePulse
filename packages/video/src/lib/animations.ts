import { interpolate, spring, type SpringConfig } from "remotion";

/** Spring presets */
export const SPRING_SNAPPY: SpringConfig = {
  damping: 12,
  mass: 0.5,
  stiffness: 200,
};

export const SPRING_GENTLE: SpringConfig = {
  damping: 15,
  mass: 0.8,
  stiffness: 120,
};

export const SPRING_BOUNCY: SpringConfig = {
  damping: 10,
  mass: 0.6,
  stiffness: 180,
};

/** Fade in opacity from 0 to 1 over a frame range */
export function fadeIn(
  frame: number,
  startFrame: number,
  durationFrames: number,
): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Fade out opacity from 1 to 0 over a frame range */
export function fadeOut(
  frame: number,
  startFrame: number,
  durationFrames: number,
): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Slide in from a direction using spring physics */
export function slideIn(
  frame: number,
  fps: number,
  delayFrames: number,
  direction: "left" | "right" | "top" | "bottom",
  distance = 200,
  config: SpringConfig = SPRING_SNAPPY,
): number {
  const progress = spring({
    frame: frame - delayFrames,
    fps,
    config,
  });

  const sign =
    direction === "left" || direction === "top" ? -1 : 1;
  return interpolate(progress, [0, 1], [sign * distance, 0]);
}

/** Scale in from 0 to 1 using spring physics */
export function scaleIn(
  frame: number,
  fps: number,
  delayFrames: number,
  config: SpringConfig = SPRING_BOUNCY,
): number {
  return spring({
    frame: frame - delayFrames,
    fps,
    config,
  });
}

/** Interpolate opacity for edge appearance (simple fade) */
export function edgeFadeIn(
  frame: number,
  startFrame: number,
  durationFrames = 15,
): number {
  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
}

/** Typing effect — returns number of visible characters */
export function typingProgress(
  frame: number,
  startFrame: number,
  totalChars: number,
  charsPerFrame = 1.5,
): number {
  const elapsed = Math.max(0, frame - startFrame);
  return Math.min(Math.floor(elapsed * charsPerFrame), totalChars);
}
