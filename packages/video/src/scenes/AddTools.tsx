import {
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import ConditionNode from "@/components/nodes/ConditionNode";
import StepNode from "@/components/nodes/StepNode";
import ToolNode from "@/components/nodes/ToolNode";
import { sopToFlow } from "@/lib/sop-to-flow";
import { demoSOP } from "../data/demo-sop";
import { edgeFadeIn, SPRING_SNAPPY } from "../lib/animations";

const nodeTypes = {
  stepNode: StepNode,
  conditionNode: ConditionNode,
  toolNode: ToolNode,
};

export const AddTools: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { nodes: allNodes, edges: allEdges } = sopToFlow(demoSOP);

  // Step + condition nodes are all visible (from previous scenes)
  const stepAndConditionNodes = allNodes.filter(
    (n) => n.type === "stepNode" || n.type === "conditionNode",
  );
  const toolNodes = allNodes.filter((n) => n.type === "toolNode");

  // Edges between steps and conditions (already visible)
  const existingEdges = allEdges.filter(
    (e) =>
      !toolNodes.some((t) => t.id === e.target) &&
      !toolNodes.some((t) => t.id === e.source),
  );

  const visibleNodes: Node[] = [...stepAndConditionNodes];
  const visibleEdges: Edge[] = [...existingEdges];

  // Tool nodes slide in from the right with staggered animation
  let toolIndex = 0;
  for (const node of toolNodes) {
    const revealFrame = 10 + toolIndex * 20;
    toolIndex++;

    if (frame < revealFrame) continue;

    const progress = spring({
      frame: frame - revealFrame,
      fps,
      config: SPRING_SNAPPY,
    });

    visibleNodes.push({
      ...node,
      position: {
        x: node.position.x + (1 - progress) * 250,
        y: node.position.y,
      },
      style: { opacity: progress },
    });

    // Tool edges (animated/dashed)
    const toolEdges = allEdges.filter((e) => e.target === node.id);
    for (const edge of toolEdges) {
      const edgeRevealFrame = revealFrame + 10;
      if (frame < edgeRevealFrame) continue;
      visibleEdges.push({
        ...edge,
        animated: true,
        style: {
          opacity: edgeFadeIn(frame, edgeRevealFrame, 15),
          strokeDasharray: "5,5",
        },
      });
    }
  }

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
        <div
          style={{
            marginLeft: 16,
            fontSize: 12,
            color: "#18A06A",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Adding tools...
        </div>
      </div>

      <div style={{ flex: 1, height: "calc(100% - 56px)" }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            defaultViewport={{ x: 450, y: 50, zoom: 0.65 }}
            proOptions={{ hideAttribution: true }}
          />
        </ReactFlowProvider>
      </div>
    </AbsoluteFill>
  );
};
