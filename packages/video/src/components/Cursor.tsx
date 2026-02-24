import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface CursorProps {
  x: number;
  y: number;
  clickAtFrame?: number;
  showFrom?: number;
}

export const Cursor: React.FC<CursorProps> = ({
  x,
  y,
  clickAtFrame,
  showFrom = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < showFrom) return null;

  // Click ripple effect
  const isClicking =
    clickAtFrame !== undefined && frame >= clickAtFrame && frame < clickAtFrame + 20;
  const rippleScale = isClicking
    ? spring({
        frame: frame - clickAtFrame,
        fps,
        config: { damping: 15, mass: 0.5, stiffness: 200 },
      })
    : 0;
  const rippleOpacity = isClicking
    ? interpolate(frame - clickAtFrame, [0, 20], [0.6, 0], {
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {/* Click ripple */}
      {isClicking && (
        <div
          style={{
            position: "absolute",
            left: -20,
            top: -20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "2px solid #4ADEFF",
            opacity: rippleOpacity,
            transform: `scale(${1 + rippleScale * 1.5})`,
          }}
        />
      )}
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          transform: isClicking ? "scale(0.85)" : "scale(1)",
          transition: "transform 0.05s",
        }}
      >
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill="white"
          stroke="#050D16"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
