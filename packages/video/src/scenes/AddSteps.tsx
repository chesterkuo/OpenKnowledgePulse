import { type Node, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import StepNode from "@/components/nodes/StepNode";
import { sopToFlow } from "@/lib/sop-to-flow";
import { Cursor } from "../components/Cursor";
import { demoSOP } from "../data/demo-sop";
import { SPRING_SNAPPY } from "../lib/animations";

const nodeTypes = { stepNode: StepNode };

/** Frames between each step node reveal */
const STAGGER = 30;

export const AddSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { nodes: allNodes } = sopToFlow(demoSOP);
  const stepNodes = allNodes.filter((n) => n.type === "stepNode");

  // Progressively reveal step nodes with spring animation
  const visibleNodes: Node[] = stepNodes
    .map((node, i) => {
      const revealFrame = i * STAGGER + 10;
      if (frame < revealFrame) return null;

      const progress = spring({
        frame: frame - revealFrame,
        fps,
        config: SPRING_SNAPPY,
      });

      return {
        ...node,
        // Animate position: start 80px below, spring to final
        position: {
          x: node.position.x,
          y: node.position.y + (1 - progress) * 80,
        },
        style: { opacity: progress },
      };
    })
    .filter((n): n is Node => n !== null);

  // Cursor follows the latest appearing node
  const latestIdx = Math.min(
    stepNodes.length - 1,
    Math.floor((frame - 10) / STAGGER),
  );
  const targetNode = stepNodes[Math.max(0, latestIdx)];
  const cursorX = targetNode ? targetNode.position.x + 160 : 460;
  const cursorY = targetNode ? targetNode.position.y + 30 : 70;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050D16",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      {/* Editor chrome header */}
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

      {/* ReactFlow canvas */}
      <div style={{ flex: 1, height: "calc(100% - 56px)" }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={visibleNodes}
            edges={[]}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            defaultViewport={{ x: 500, y: 50, zoom: 0.85 }}
            proOptions={{ hideAttribution: true }}
          />
        </ReactFlowProvider>
      </div>

      <Cursor x={cursorX + 500} y={cursorY + 50 + 56} showFrom={5} />
    </AbsoluteFill>
  );
};
