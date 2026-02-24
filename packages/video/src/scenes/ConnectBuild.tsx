import {
  type Edge,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import ConditionNode from "@/components/nodes/ConditionNode";
import StepNode from "@/components/nodes/StepNode";
import ToolNode from "@/components/nodes/ToolNode";
import { sopToFlow } from "@/lib/sop-to-flow";
import { demoSOP } from "../data/demo-sop";
import { edgeFadeIn } from "../lib/animations";

const nodeTypes = {
  stepNode: StepNode,
  conditionNode: ConditionNode,
  toolNode: ToolNode,
};

export const ConnectBuild: React.FC = () => {
  const frame = useCurrentFrame();

  const { nodes, edges: allEdges } = sopToFlow(demoSOP);

  // All nodes are visible; progressively reveal remaining edges
  const edgesPerBatch = Math.ceil(allEdges.length / 4);
  const visibleEdges: Edge[] = allEdges
    .map((edge, i) => {
      const batchIndex = Math.floor(i / edgesPerBatch);
      const revealFrame = batchIndex * 20 + 5;
      if (frame < revealFrame) return null;
      return {
        ...edge,
        style: { opacity: edgeFadeIn(frame, revealFrame, 20) },
      };
    })
    .filter((e): e is Edge => e !== null);

  // Viewport zoom-out animation
  const zoom = interpolate(frame, [30, 120], [0.7, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const viewX = interpolate(frame, [30, 120], [450, 550], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const viewY = interpolate(frame, [30, 120], [50, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
            color: "#12B5A8",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Connecting workflow...
        </div>
      </div>

      <div style={{ flex: 1, height: "calc(100% - 56px)" }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
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
            defaultViewport={{ x: viewX, y: viewY, zoom }}
            proOptions={{ hideAttribution: true }}
          />
        </ReactFlowProvider>
      </div>
    </AbsoluteFill>
  );
};
