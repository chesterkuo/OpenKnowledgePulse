import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor } from "../components/Cursor";
import { fadeIn, slideIn, SPRING_SNAPPY } from "../lib/animations";

export const EmptyEditor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelOpacity = fadeIn(frame, 0, 15);
  const toolbarSlide = slideIn(frame, fps, 5, "top", 60, SPRING_SNAPPY);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050D16",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      {/* Editor chrome */}
      <div
        style={{
          opacity: panelOpacity,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 56,
            backgroundColor: "#0C1A28",
            borderBottom: "1px solid #163248",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            transform: `translateY(${toolbarSlide}px)`,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#EEF6FF",
              letterSpacing: "0.04em",
            }}
          >
            SOP Studio
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 12,
            }}
          >
            {/* Toolbar buttons */}
            {["+ Step", "+ Condition", "+ Tool"].map((label, i) => (
              <div
                key={label}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor:
                    i === 0
                      ? "rgba(30,126,200,0.2)"
                      : i === 1
                        ? "rgba(224,122,32,0.2)"
                        : "rgba(24,160,106,0.2)",
                  color:
                    i === 0 ? "#1E7EC8" : i === 1 ? "#E07A20" : "#18A06A",
                  border: `1px solid ${
                    i === 0
                      ? "rgba(30,126,200,0.3)"
                      : i === 1
                        ? "rgba(224,122,32,0.3)"
                        : "rgba(24,160,106,0.3)"
                  }`,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Empty canvas area */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#050D16",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Grid dots pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, #163248 1px, transparent 1px)",
              backgroundSize: "30px 30px",
              opacity: 0.5,
            }}
          />

          {/* Empty state text */}
          <div
            style={{
              color: "#4A7FA5",
              fontSize: 20,
              fontWeight: 400,
              opacity: fadeIn(frame, 20, 20),
            }}
          >
            Click &quot;+ Step&quot; to begin building your SOP
          </div>
        </div>
      </div>

      {/* Animated cursor moving toward + Step button */}
      <Cursor
        x={interpolateCursorX(frame)}
        y={interpolateCursorY(frame)}
        clickAtFrame={70}
        showFrom={30}
      />
    </AbsoluteFill>
  );
};

function interpolateCursorX(frame: number): number {
  const startX = 960;
  const endX = 1620;
  const progress = Math.min(1, Math.max(0, (frame - 30) / 40));
  const eased = 1 - Math.pow(1 - progress, 3);
  return startX + (endX - startX) * eased;
}

function interpolateCursorY(frame: number): number {
  const startY = 540;
  const endY = 28;
  const progress = Math.min(1, Math.max(0, (frame - 30) / 40));
  const eased = 1 - Math.pow(1 - progress, 3);
  return startY + (endY - startY) * eased;
}
