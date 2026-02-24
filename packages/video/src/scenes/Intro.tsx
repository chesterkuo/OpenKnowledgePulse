import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { fadeIn, scaleIn, SPRING_BOUNCY } from "../lib/animations";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = scaleIn(frame, fps, 0, SPRING_BOUNCY);
  const titleOpacity = fadeIn(frame, 15, 20);
  const subtitleOpacity = fadeIn(frame, 30, 20);
  const glowOpacity = fadeIn(frame, 5, 30);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050D16",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      {/* Cyan glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,222,255,0.15) 0%, transparent 70%)",
          opacity: glowOpacity,
        }}
      />

      {/* KP Logo — octopus silhouette */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 32,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          {/* Stylized octopus head */}
          <ellipse cx="60" cy="45" rx="35" ry="30" fill="#1A3C58" />
          <ellipse cx="60" cy="45" rx="30" ry="25" fill="#0D2438" />
          {/* Eyes */}
          <circle cx="48" cy="42" r="6" fill="#4ADEFF" />
          <circle cx="72" cy="42" r="6" fill="#4ADEFF" />
          <circle cx="49" cy="41" r="2.5" fill="white" />
          <circle cx="73" cy="41" r="2.5" fill="white" />
          {/* Tentacles */}
          <path
            d="M30 65 Q25 85 20 95"
            stroke="#12B5A8"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M40 70 Q38 90 35 100"
            stroke="#1E7EC8"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M50 72 Q50 92 48 102"
            stroke="#18A06A"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M60 73 Q60 93 60 103"
            stroke="#E07A20"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M70 72 Q70 92 72 102"
            stroke="#18A06A"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M80 70 Q82 90 85 100"
            stroke="#1E7EC8"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M90 65 Q95 85 100 95"
            stroke="#12B5A8"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          fontSize: 64,
          fontWeight: 800,
          color: "#EEF6FF",
          letterSpacing: "0.04em",
        }}
      >
        SOP Studio
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          fontSize: 24,
          fontWeight: 400,
          color: "#4A7FA5",
          marginTop: 12,
          letterSpacing: "0.08em",
        }}
      >
        Visual Workflow Builder
      </div>
    </AbsoluteFill>
  );
};
