import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type { StepNodeData } from "../../lib/sop-to-flow";

export type StepNodeType = Node<StepNodeData, "stepNode">;

export default function StepNode({ data, selected }: NodeProps<StepNodeType>) {
  return (
    <div
      className={`rounded-lg shadow-md border-2 bg-white min-w-[220px] max-w-[300px] ${
        selected ? "border-blue-600 ring-2 ring-blue-300" : "border-blue-400"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className="bg-blue-500 text-white px-4 py-2 rounded-t-md">
        <div className="font-semibold text-sm truncate">{data.step}</div>
      </div>
      <div className="px-4 py-3">
        <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">
          {data.instruction || "No instruction provided"}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  );
}
