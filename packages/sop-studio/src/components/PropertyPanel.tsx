import type { Node } from "@xyflow/react";
import { type ChangeEvent, useCallback } from "react";
import type { ConditionNodeData, StepNodeData, ToolNodeData } from "../lib/sop-to-flow";

interface PropertyPanelProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

export default function PropertyPanel({ selectedNode, onNodeUpdate }: PropertyPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-kp-border bg-kp-navy p-6 flex items-center justify-center">
        <p className="text-kp-muted text-sm text-center">Select a node to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-kp-border bg-kp-navy overflow-y-auto">
      <div className="p-4 border-b border-kp-border">
        <h3 className="font-semibold text-kp-heading">Properties</h3>
        <p className="text-xs text-kp-muted mt-1">ID: {selectedNode.id}</p>
      </div>
      <div className="p-4">
        {selectedNode.type === "stepNode" && (
          <StepNodeProperties node={selectedNode} onUpdate={onNodeUpdate} />
        )}
        {selectedNode.type === "conditionNode" && (
          <ConditionNodeProperties node={selectedNode} onUpdate={onNodeUpdate} />
        )}
        {selectedNode.type === "toolNode" && (
          <ToolNodeProperties node={selectedNode} onUpdate={onNodeUpdate} />
        )}
      </div>
    </div>
  );
}

function StepNodeProperties({
  node,
  onUpdate,
}: {
  node: Node;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  const data = node.data as StepNodeData;

  const handleChange = useCallback(
    (field: string, value: string) => {
      onUpdate(node.id, { ...data, [field]: value });
    },
    [node.id, data, onUpdate],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-3 h-3 rounded-full bg-kp-blue" />
        <span className="text-sm font-medium text-kp-text">Step Node</span>
      </div>
      <div>
        <label htmlFor="step-name" className="block text-sm font-medium text-kp-muted mb-1">
          Step Name
        </label>
        <input
          id="step-name"
          type="text"
          value={data.step || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("step", e.target.value)}
          className="w-full px-3 py-2 bg-kp-dark border border-kp-border text-kp-text rounded-md text-sm focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none"
        />
      </div>
      <div>
        <label htmlFor="step-instruction" className="block text-sm font-medium text-kp-muted mb-1">
          Instruction
        </label>
        <textarea
          id="step-instruction"
          rows={6}
          value={data.instruction || ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            handleChange("instruction", e.target.value)
          }
          className="w-full px-3 py-2 bg-kp-dark border border-kp-border text-kp-text rounded-md text-sm focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none resize-y"
        />
      </div>
    </div>
  );
}

function ConditionNodeProperties({
  node,
  onUpdate,
}: {
  node: Node;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  const data = node.data as ConditionNodeData;
  const criteriaEntries = Object.entries(data.criteria || {});
  const conditionEntries = Object.entries(data.conditions || {});

  const updateCriteria = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      const newCriteria = { ...data.criteria };
      if (oldKey !== newKey) {
        delete newCriteria[oldKey];
      }
      newCriteria[newKey] = value;
      onUpdate(node.id, { ...data, criteria: newCriteria });
    },
    [node.id, data, onUpdate],
  );

  const removeCriteria = useCallback(
    (key: string) => {
      const newCriteria = { ...data.criteria };
      delete newCriteria[key];
      onUpdate(node.id, { ...data, criteria: newCriteria });
    },
    [node.id, data, onUpdate],
  );

  const addCriteria = useCallback(() => {
    const newCriteria = { ...data.criteria, "": "" };
    onUpdate(node.id, { ...data, criteria: newCriteria });
  }, [node.id, data, onUpdate]);

  const updateCondition = useCallback(
    (oldKey: string, newKey: string, action: string, slaMin?: number) => {
      const newConditions = { ...data.conditions };
      if (oldKey !== newKey) {
        delete newConditions[oldKey];
      }
      newConditions[newKey] = {
        action,
        ...(slaMin !== undefined ? { sla_min: slaMin } : {}),
      };
      onUpdate(node.id, { ...data, conditions: newConditions });
    },
    [node.id, data, onUpdate],
  );

  const removeCondition = useCallback(
    (key: string) => {
      const newConditions = { ...data.conditions };
      delete newConditions[key];
      onUpdate(node.id, { ...data, conditions: newConditions });
    },
    [node.id, data, onUpdate],
  );

  const addCondition = useCallback(() => {
    const newConditions = {
      ...data.conditions,
      "": { action: "" },
    };
    onUpdate(node.id, { ...data, conditions: newConditions });
  }, [node.id, data, onUpdate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-3 h-3 rounded-full bg-kp-orange" />
        <span className="text-sm font-medium text-kp-text">Condition Node</span>
      </div>

      {/* Criteria editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-kp-muted">Criteria</label>
          <button
            type="button"
            onClick={addCriteria}
            className="text-xs text-kp-teal hover:text-kp-cyan"
          >
            + Add
          </button>
        </div>
        {criteriaEntries.length === 0 && (
          <p className="text-xs text-kp-muted">No criteria defined</p>
        )}
        {criteriaEntries.map(([key, value], idx) => (
          <div key={idx} className="flex gap-1 mb-2 items-start">
            <input
              type="text"
              placeholder="Key"
              value={key}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateCriteria(key, e.target.value, value)
              }
              className="flex-1 px-2 py-1.5 bg-kp-dark border border-kp-border text-kp-text rounded text-xs focus:ring-1 focus:ring-kp-teal outline-none"
            />
            <input
              type="text"
              placeholder="Value"
              value={value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateCriteria(key, key, e.target.value)
              }
              className="flex-1 px-2 py-1.5 bg-kp-dark border border-kp-border text-kp-text rounded text-xs focus:ring-1 focus:ring-kp-teal outline-none"
            />
            <button
              type="button"
              onClick={() => removeCriteria(key)}
              className="text-kp-error/60 hover:text-kp-error px-1 py-1.5 text-xs"
              title="Remove"
            >
              X
            </button>
          </div>
        ))}
      </div>

      {/* Conditions editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-kp-muted">Conditions</label>
          <button
            type="button"
            onClick={addCondition}
            className="text-xs text-kp-teal hover:text-kp-cyan"
          >
            + Add
          </button>
        </div>
        {conditionEntries.length === 0 && (
          <p className="text-xs text-kp-muted">No conditions defined</p>
        )}
        {conditionEntries.map(([key, value], idx) => (
          <div key={idx} className="border border-kp-border rounded p-2 mb-2 space-y-1">
            <div className="flex gap-1 items-center">
              <input
                type="text"
                placeholder="Condition name"
                value={key}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateCondition(key, e.target.value, value.action, value.sla_min)
                }
                className="flex-1 px-2 py-1 bg-kp-dark border border-kp-border text-kp-text rounded text-xs focus:ring-1 focus:ring-kp-teal outline-none"
              />
              <button
                type="button"
                onClick={() => removeCondition(key)}
                className="text-kp-error/60 hover:text-kp-error px-1 text-xs"
                title="Remove"
              >
                X
              </button>
            </div>
            <input
              type="text"
              placeholder="Action (next step name)"
              value={value.action}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateCondition(key, key, e.target.value, value.sla_min)
              }
              className="w-full px-2 py-1 bg-kp-dark border border-kp-border text-kp-text rounded text-xs focus:ring-1 focus:ring-kp-teal outline-none"
            />
            <input
              type="number"
              placeholder="SLA (minutes, optional)"
              value={value.sla_min ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateCondition(
                  key,
                  key,
                  value.action,
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="w-full px-2 py-1 bg-kp-dark border border-kp-border text-kp-text rounded text-xs focus:ring-1 focus:ring-kp-teal outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolNodeProperties({
  node,
  onUpdate,
}: {
  node: Node;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  const data = node.data as ToolNodeData;

  const handleChange = useCallback(
    (field: string, value: string) => {
      onUpdate(node.id, { ...data, [field]: value });
    },
    [node.id, data, onUpdate],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-3 h-3 rounded-full bg-kp-green" />
        <span className="text-sm font-medium text-kp-text">Tool Node</span>
      </div>
      <div>
        <label htmlFor="tool-name" className="block text-sm font-medium text-kp-muted mb-1">
          Tool Name
        </label>
        <input
          id="tool-name"
          type="text"
          value={data.name || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("name", e.target.value)}
          className="w-full px-3 py-2 bg-kp-dark border border-kp-border text-kp-text rounded-md text-sm focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none"
        />
      </div>
      <div>
        <label htmlFor="tool-when" className="block text-sm font-medium text-kp-muted mb-1">
          When (trigger condition)
        </label>
        <textarea
          id="tool-when"
          rows={3}
          value={data.when || ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange("when", e.target.value)}
          className="w-full px-3 py-2 bg-kp-dark border border-kp-border text-kp-text rounded-md text-sm focus:ring-2 focus:ring-kp-teal focus:border-kp-teal outline-none resize-y"
        />
      </div>
    </div>
  );
}
