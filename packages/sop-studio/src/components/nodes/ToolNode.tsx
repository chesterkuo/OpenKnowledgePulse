import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type { ToolNodeData } from "../../lib/sop-to-flow";

export type ToolNodeType = Node<ToolNodeData, "toolNode">;

export default function ToolNode({ data, selected }: NodeProps<ToolNodeType>) {
  return (
    <div
      className={`bg-kp-panel border-l-4 border-l-kp-green border border-kp-border rounded-md shadow-lg shadow-kp-green/10 min-w-[200px] max-w-[280px] ${
        selected ? "ring-2 ring-kp-green ring-offset-2 ring-offset-kp-dark" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-kp-green !w-3 !h-3" />
      <div className="bg-kp-green/20 text-kp-heading px-4 py-2 rounded-t-md">
        <div className="font-semibold text-sm flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17l-5.46-2.1a1 1 0 01-.64-.95V5.88a1 1 0 011.36-.95l5.46 2.1a1 1 0 01.64.95v6.24a1 1 0 01-1.36.95z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.04 8.87l-5.46 2.1a1 1 0 01-1.36-.95V3.78a1 1 0 011.36-.95l5.46 2.1a1 1 0 01.64.95v2.04a1 1 0 01-.64.95z"
            />
          </svg>
          {data.name}
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="text-kp-muted font-mono text-xs uppercase tracking-wide mb-1">When</div>
        <p className="text-kp-text text-xs leading-relaxed">{data.when || "No trigger defined"}</p>
      </div>
      {/* Tool nodes are endpoints - no source handle */}
    </div>
  );
}
