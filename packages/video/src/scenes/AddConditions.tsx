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
import { sopToFlow } from "@/lib/sop-to-flow";
import { demoSOP } from "../data/demo-sop";
import { edgeFadeIn, SPRING_SNAPPY } from "../lib/animations";

const nodeTypes = { stepNode: StepNode, conditionNode: ConditionNode };

export const AddConditions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { nodes: allNodes, edges: allEdges } = sopToFlow(demoSOP);
  const stepNodes = allNodes.filter((n) => n.type === "stepNode");
  const conditionNodes = allNodes.filter((n) => n.type === "conditionNode");

  // All step nodes are already visible (carried from previous scene)
  const visibleNodes: Node[] = [...stepNodes];

  // Condition node slides in from the left
  const condRevealFrame = 20;
  const conditionEdges: Edge[] = [];

  for (let i = 0; i < conditionNodes.length; i++) {
    const node = conditionNodes[i];
    const revealFrame = condRevealFrame + i * 40;

    if (frame < revealFrame) continue;

    const progress = spring({
      frame: frame - revealFrame,
      fps,
      config: SPRING_SNAPPY,
    });

    visibleNodes.push({
      ...node,
      position: {
        x: node.position.x - (1 - progress) * 300,
        y: node.position.y,
      },
      style: { opacity: progress },
    });

    // Edge from step to condition
    const relatedEdges = allEdges.filter(
      (e) => e.target === node.id || e.source === node.id,
    );
    for (const edge of relatedEdges) {
      const edgeRevealFrame = revealFrame + 15;
      if (frame < edgeRevealFrame) continue;
      conditionEdges.push({
        ...edge,
        style: { opacity: edgeFadeIn(frame, edgeRevealFrame, 15) },
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
            color: "#E07A20",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Adding conditions...
        </div>
      </div>

      <div style={{ flex: 1, height: "calc(100% - 56px)" }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={visibleNodes}
            edges={conditionEdges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            defaultViewport={{ x: 500, y: 50, zoom: 0.7 }}
            proOptions={{ hideAttribution: true }}
          />
        </ReactFlowProvider>
      </div>
    </AbsoluteFill>
  );
};
