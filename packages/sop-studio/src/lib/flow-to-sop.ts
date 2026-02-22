import type { Edge, Node } from "@xyflow/react";
import type {
  ConditionNodeData,
  DecisionTreeStep,
  StepNodeData,
  ToolNodeData,
} from "./sop-to-flow";

/**
 * Converts React Flow nodes and edges back into an ExpertSOP decision_tree array.
 * Preserves order based on top-to-bottom Y position of step nodes.
 */
export function flowToSop(nodes: Node[], edges: Edge[]): DecisionTreeStep[] {
  // Separate node types
  const stepNodes = nodes
    .filter((n) => n.type === "stepNode")
    .sort((a, b) => a.position.y - b.position.y);

  const _conditionNodes = nodes.filter((n) => n.type === "conditionNode");
  const _toolNodes = nodes.filter((n) => n.type === "toolNode");

  // Build edge lookup: source -> targets
  const edgesBySource = new Map<string, Edge[]>();
  for (const edge of edges) {
    const existing = edgesBySource.get(edge.source) || [];
    existing.push(edge);
    edgesBySource.set(edge.source, existing);
  }

  // Build reverse edge lookup: target -> sources
  const edgesByTarget = new Map<string, Edge[]>();
  for (const edge of edges) {
    const existing = edgesByTarget.get(edge.target) || [];
    existing.push(edge);
    edgesByTarget.set(edge.target, existing);
  }

  // Build a map of node id -> node for quick lookup
  const nodeMap = new Map<string, Node>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  return stepNodes.map((stepNode) => {
    const data = stepNode.data as StepNodeData;

    const result: DecisionTreeStep = {
      step: data.step,
      instruction: data.instruction,
    };

    // Find connected condition nodes
    const outEdges = edgesBySource.get(stepNode.id) || [];
    const connectedConditionIds = outEdges
      .filter((e) => {
        const target = nodeMap.get(e.target);
        return target?.type === "conditionNode";
      })
      .map((e) => e.target);

    // Merge criteria/conditions from connected condition nodes
    if (connectedConditionIds.length > 0) {
      const allCriteria: Record<string, string> = {};
      const allConditions: Record<string, { action: string; sla_min?: number }> = {};

      for (const condId of connectedConditionIds) {
        const condNode = nodeMap.get(condId);
        if (!condNode) continue;
        const condData = condNode.data as ConditionNodeData;

        // Copy criteria
        if (condData.criteria) {
          Object.assign(allCriteria, condData.criteria);
        }

        // Rebuild conditions from condition node's edges
        const condEdges = edgesBySource.get(condId) || [];
        for (const condEdge of condEdges) {
          const targetNode = nodeMap.get(condEdge.target);
          if (targetNode?.type === "stepNode") {
            const targetData = targetNode.data as StepNodeData;
            // Extract condition key from sourceHandle (format: "condition-<key>")
            const handleId = condEdge.sourceHandle || "";
            const condKey = handleId.replace("condition-", "");
            if (condKey) {
              // Look up the original condition data for sla_min
              const origCond = condData.conditions?.[condKey];
              allConditions[condKey] = {
                action: targetData.step,
                ...(origCond?.sla_min !== undefined ? { sla_min: origCond.sla_min } : {}),
              };
            }
          }
        }

        // Also include conditions from the condition node data that may not have edges
        if (condData.conditions) {
          for (const [key, value] of Object.entries(condData.conditions)) {
            if (!allConditions[key]) {
              allConditions[key] = value;
            }
          }
        }
      }

      if (Object.keys(allCriteria).length > 0) {
        result.criteria = allCriteria;
      }
      if (Object.keys(allConditions).length > 0) {
        result.conditions = allConditions;
      }
    }

    // Find connected tool nodes
    const connectedToolIds = outEdges
      .filter((e) => {
        const target = nodeMap.get(e.target);
        return target?.type === "toolNode";
      })
      .map((e) => e.target);

    if (connectedToolIds.length > 0) {
      result.tool_suggestions = connectedToolIds
        .map((toolId) => {
          const toolNode = nodeMap.get(toolId);
          if (!toolNode) return null;
          const toolData = toolNode.data as ToolNodeData;
          return { name: toolData.name, when: toolData.when };
        })
        .filter((t): t is { name: string; when: string } => t !== null);
    }

    return result;
  });
}
