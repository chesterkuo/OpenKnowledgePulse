import {
  type Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import ConditionNode from "@/components/nodes/ConditionNode";
import StepNode from "@/components/nodes/StepNode";
import ToolNode from "@/components/nodes/ToolNode";
import { sopToFlow } from "@/lib/sop-to-flow";
import { Cursor } from "../components/Cursor";
import { demoSOP } from "../data/demo-sop";
import { fadeIn, typingProgress, SPRING_SNAPPY } from "../lib/animations";

const nodeTypes = {
  stepNode: StepNode,
  conditionNode: ConditionNode,
  toolNode: ToolNode,
};

const SELECTED_NODE_INDEX = 0; // "Receive Ticket" step
const CLICK_FRAME = 20;
const PANEL_REVEAL_FRAME = 35;
const TYPING_START_FRAME = 60;

const TYPED_TEXT =
  "Acknowledge the customer support ticket within 5 minutes. Classify the issue by category and severity.";

export const PropertyEdit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { nodes: allNodes, edges } = sopToFlow(demoSOP);

  // Mark selected node
  const nodes: Node[] = allNodes.map((node, i) => {
    if (node.type === "stepNode" && node.id === `step-${SELECTED_NODE_INDEX}`) {
      return {
        ...node,
        selected: frame >= CLICK_FRAME,
      };
    }
    return node;
  });

  // Property panel slide-in
  const panelProgress =
    frame >= PANEL_REVEAL_FRAME
      ? spring({
          frame: frame - PANEL_REVEAL_FRAME,
          fps,
          config: SPRING_SNAPPY,
        })
      : 0;
  const panelX = interpolate(panelProgress, [0, 1], [400, 0]);
  const panelOpacity = panelProgress;

  // Typing effect
  const charsVisible = typingProgress(
    frame,
    TYPING_START_FRAME,
    TYPED_TEXT.length,
    1.2,
  );
  const displayedText = TYPED_TEXT.slice(0, charsVisible);

  // Cursor position: moves to node, then to panel
  const cursorX =
    frame < CLICK_FRAME
      ? interpolate(frame, [0, CLICK_FRAME], [960, 760], {
          extrapolateRight: "clamp",
        })
      : frame < TYPING_START_FRAME
        ? interpolate(frame, [CLICK_FRAME, TYPING_START_FRAME], [760, 1620], {
            extrapolateRight: "clamp",
          })
        : 1620;

  const cursorY =
    frame < CLICK_FRAME
      ? interpolate(frame, [0, CLICK_FRAME], [400, 110], {
          extrapolateRight: "clamp",
        })
      : frame < TYPING_START_FRAME
        ? interpolate(frame, [CLICK_FRAME, TYPING_START_FRAME], [110, 380], {
            extrapolateRight: "clamp",
          })
        : 380;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050D16",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          height: 56,
          backgroundColor: "#0C1A28",
          borderBottom: "1px solid #163248",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
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
          Customer Support Escalation
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, height: "calc(100% - 56px)" }}>
        {/* Flow canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              panOnDrag={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              preventScrolling={false}
              defaultViewport={{ x: 400, y: 50, zoom: 0.55 }}
              proOptions={{ hideAttribution: true }}
            />
          </ReactFlowProvider>
        </div>

        {/* Property panel */}
        <div
          style={{
            width: 380,
            backgroundColor: "#0C1A28",
            borderLeft: "1px solid #163248",
            transform: `translateX(${panelX}px)`,
            opacity: panelOpacity,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#EEF6FF",
              letterSpacing: "0.04em",
              borderBottom: "1px solid #163248",
              paddingBottom: 12,
            }}
          >
            Step Properties
          </div>

          {/* Step name field */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#4A7FA5",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Step Name
            </div>
            <div
              style={{
                backgroundColor: "#081828",
                border: "1px solid #163248",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                color: "#C8DDF0",
              }}
            >
              Receive Ticket
            </div>
          </div>

          {/* Instruction field with typing */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#4A7FA5",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Instruction
            </div>
            <div
              style={{
                backgroundColor: "#081828",
                border: `1px solid ${frame >= TYPING_START_FRAME ? "#1E7EC8" : "#163248"}`,
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                color: "#C8DDF0",
                minHeight: 80,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {displayedText}
              {frame >= TYPING_START_FRAME && charsVisible < TYPED_TEXT.length && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 14,
                    backgroundColor: "#1E7EC8",
                    marginLeft: 1,
                    opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                  }}
                />
              )}
            </div>
          </div>

          {/* Tool suggestions */}
          <div style={{ opacity: fadeIn(frame, PANEL_REVEAL_FRAME + 20, 15) }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#4A7FA5",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Tool Suggestions
            </div>
            <div
              style={{
                backgroundColor: "rgba(24,160,106,0.1)",
                border: "1px solid rgba(24,160,106,0.2)",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                color: "#18A06A",
              }}
            >
              Ticket Classifier
            </div>
          </div>
        </div>
      </div>

      <Cursor
        x={cursorX}
        y={cursorY}
        clickAtFrame={CLICK_FRAME}
        showFrom={5}
      />
    </AbsoluteFill>
  );
};
