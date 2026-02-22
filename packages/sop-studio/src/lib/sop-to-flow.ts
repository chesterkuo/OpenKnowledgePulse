import type { Node, Edge } from "@xyflow/react";

/**
 * Shape of each step in an ExpertSOP.decision_tree
 */
export interface DecisionTreeStep {
  step: string;
  instruction: string;
  criteria?: Record<string, string>;
  conditions?: Record<string, { action: string; sla_min?: number }>;
  tool_suggestions?: Array<{ name: string; when: string }>;
}

/** Data stored on a StepNode */
export interface StepNodeData extends Record<string, unknown> {
  nodeType: "step";
  step: string;
  instruction: string;
}

/** Data stored on a ConditionNode */
export interface ConditionNodeData extends Record<string, unknown> {
  nodeType: "condition";
  parentStep: string;
  criteria: Record<string, string>;
  conditions: Record<string, { action: string; sla_min?: number }>;
}

/** Data stored on a ToolNode */
export interface ToolNodeData extends Record<string, unknown> {
  nodeType: "tool";
  parentStep: string;
  name: string;
  when: string;
}

export type FlowNodeData = StepNodeData | ConditionNodeData | ToolNodeData;

const X_CENTER = 300;
const Y_SPACING = 200;
const TOOL_X_OFFSET = 350;
const CONDITION_X_OFFSET = -350;

/**
 * Converts an ExpertSOP decision_tree array into React Flow nodes and edges.
 * Auto-layout: vertical tree with spacing.
 */
export function sopToFlow(decisionTree: DecisionTreeStep[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Map step names to their node IDs for edge creation
  const stepNameToId = new Map<string, string>();

  // First pass: create step nodes and register their IDs
  decisionTree.forEach((entry, index) => {
    const stepId = `step-${index}`;
    stepNameToId.set(entry.step, stepId);
  });

  let currentY = 0;

  decisionTree.forEach((entry, index) => {
    const stepId = `step-${index}`;

    // Create the step node
    nodes.push({
      id: stepId,
      type: "stepNode",
      position: { x: X_CENTER, y: currentY },
      data: {
        nodeType: "step",
        step: entry.step,
        instruction: entry.instruction,
      } satisfies StepNodeData,
    });

    // Connect to next step in sequence (if no conditions)
    if (
      index < decisionTree.length - 1 &&
      (!entry.conditions || Object.keys(entry.conditions).length === 0)
    ) {
      edges.push({
        id: `edge-${stepId}-to-step-${index + 1}`,
        source: stepId,
        target: `step-${index + 1}`,
        type: "smoothstep",
      });
    }

    // Create condition node if step has criteria/conditions
    if (
      entry.conditions &&
      Object.keys(entry.conditions).length > 0
    ) {
      const conditionId = `condition-${index}`;
      nodes.push({
        id: conditionId,
        type: "conditionNode",
        position: { x: X_CENTER + CONDITION_X_OFFSET, y: currentY + Y_SPACING * 0.5 },
        data: {
          nodeType: "condition",
          parentStep: entry.step,
          criteria: entry.criteria || {},
          conditions: entry.conditions,
        } satisfies ConditionNodeData,
      });

      // Edge from step to condition
      edges.push({
        id: `edge-${stepId}-to-${conditionId}`,
        source: stepId,
        target: conditionId,
        type: "smoothstep",
      });

      // Edges from condition to target steps
      Object.entries(entry.conditions).forEach(
        ([condKey, condValue]) => {
          const targetStepId = stepNameToId.get(condValue.action);
          if (targetStepId) {
            edges.push({
              id: `edge-${conditionId}-to-${targetStepId}-${condKey}`,
              source: conditionId,
              sourceHandle: `condition-${condKey}`,
              target: targetStepId,
              type: "smoothstep",
              label: condKey,
            });
          }
        }
      );
    }

    // Create tool nodes
    if (entry.tool_suggestions && entry.tool_suggestions.length > 0) {
      entry.tool_suggestions.forEach((tool, toolIndex) => {
        const toolId = `tool-${index}-${toolIndex}`;
        nodes.push({
          id: toolId,
          type: "toolNode",
          position: {
            x: X_CENTER + TOOL_X_OFFSET,
            y: currentY + toolIndex * 100,
          },
          data: {
            nodeType: "tool",
            parentStep: entry.step,
            name: tool.name,
            when: tool.when,
          } satisfies ToolNodeData,
        });

        // Edge from step to tool
        edges.push({
          id: `edge-${stepId}-to-${toolId}`,
          source: stepId,
          target: toolId,
          type: "smoothstep",
          animated: true,
        });
      });
    }

    currentY += Y_SPACING;
  });

  return { nodes, edges };
}
