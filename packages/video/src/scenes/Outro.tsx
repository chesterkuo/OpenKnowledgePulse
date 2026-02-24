import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fadeIn, fadeOut } from "../lib/animations";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const overlayOpacity = fadeIn(frame, 0, 30);
  const textOpacity = fadeIn(frame, 15, 20);
  const fadeToBlack = fadeIn(frame, 60, 30);

  return (
    <AbsoluteFill
      style={{
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      {/* Dark overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: "#050D16",
          opacity: overlayOpacity,
        }}
      />

      {/* Branding content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: fadeOut(frame, 60, 20),
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "#EEF6FF",
              letterSpacing: "0.04em",
              marginBottom: 16,
            }}
          >
            KnowledgePulse
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: "#12B5A8",
              letterSpacing: "0.08em",
              marginBottom: 32,
            }}
          >
            Open Knowledge Sharing Protocol
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#4A7FA5",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            openknowledgepulse.org
          </div>
        </div>
      </AbsoluteFill>

      {/* Final fade to black */}
      <AbsoluteFill
        style={{
          backgroundColor: "#050D16",
          opacity: fadeToBlack,
        }}
      />
    </AbsoluteFill>
  );
};
