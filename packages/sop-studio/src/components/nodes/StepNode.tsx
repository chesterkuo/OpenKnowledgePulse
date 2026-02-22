import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type { StepNodeData } from "../../lib/sop-to-flow";

export type StepNodeType = Node<StepNodeData, "stepNode">;

export default function StepNode({ data, selected }: NodeProps<StepNodeType>) {
  return (
    <div
      className={`bg-kp-panel border-l-4 border-l-kp-blue border border-kp-border rounded-md shadow-lg shadow-kp-blue/10 min-w-[220px] max-w-[300px] ${
        selected ? "ring-2 ring-kp-blue ring-offset-2 ring-offset-kp-dark" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-kp-blue !w-3 !h-3" />
      <div className="bg-kp-blue/20 text-kp-heading px-4 py-2 rounded-t-md">
        <div className="font-semibold text-sm truncate">{data.step}</div>
      </div>
      <div className="px-4 py-3">
        <p className="text-kp-text text-xs leading-relaxed whitespace-pre-wrap">
          {data.instruction || "No instruction provided"}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-kp-blue !w-3 !h-3" />
    </div>
  );
}
