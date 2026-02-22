import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ConditionNodeData } from "../../lib/sop-to-flow";

export type ConditionNodeType = Node<ConditionNodeData, "conditionNode">;

export default function ConditionNode({
  data,
  selected,
}: NodeProps<ConditionNodeType>) {
  const conditionKeys = data.conditions
    ? Object.keys(data.conditions)
    : [];
  const criteriaEntries = data.criteria
    ? Object.entries(data.criteria)
    : [];

  return (
    <div
      className={`rounded-lg shadow-md border-2 bg-white min-w-[220px] max-w-[320px] ${
        selected
          ? "border-orange-600 ring-2 ring-orange-300"
          : "border-orange-400"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-500 !w-3 !h-3"
      />
      <div className="bg-orange-500 text-white px-4 py-2 rounded-t-md">
        <div className="font-semibold text-sm">Condition</div>
        <div className="text-xs opacity-80 truncate">
          {data.parentStep}
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        {criteriaEntries.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Criteria
            </div>
            {criteriaEntries.map(([key, value]) => (
              <div key={key} className="text-xs text-gray-700">
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        )}
        {conditionKeys.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Branches
            </div>
            {conditionKeys.map((key) => (
              <div
                key={key}
                className="text-xs text-gray-700 flex items-center gap-1"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
                {key}
              </div>
            ))}
          </div>
        )}
        {conditionKeys.length === 0 && criteriaEntries.length === 0 && (
          <p className="text-xs text-gray-400">No conditions defined</p>
        )}
      </div>
      {/* One output handle per condition */}
      {conditionKeys.map((key, idx) => (
        <Handle
          key={key}
          type="source"
          position={Position.Bottom}
          id={`condition-${key}`}
          className="!bg-orange-500 !w-3 !h-3"
          style={{
            left: `${((idx + 1) / (conditionKeys.length + 1)) * 100}%`,
          }}
        />
      ))}
      {/* Fallback: a single output if no conditions */}
      {conditionKeys.length === 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-orange-500 !w-3 !h-3"
        />
      )}
    </div>
  );
}
