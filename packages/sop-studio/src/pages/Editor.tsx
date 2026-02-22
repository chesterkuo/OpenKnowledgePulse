import {
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "@xyflow/react/dist/style.css";

import PropertyPanel from "../components/PropertyPanel";
import ConditionNode from "../components/nodes/ConditionNode";
import StepNode from "../components/nodes/StepNode";
import ToolNode from "../components/nodes/ToolNode";
import { api } from "../lib/api";
import { flowToSop } from "../lib/flow-to-sop";
import { type DecisionTreeStep, sopToFlow } from "../lib/sop-to-flow";

/** API response shape for a single SOP */
interface StoredSOP {
  id: string;
  sop: {
    "@context": string;
    "@type": string;
    id: string;
    name: string;
    domain: string;
    metadata: Record<string, unknown>;
    source: {
      type: string;
      expert_id: string;
      credentials: string[];
    };
    decision_tree: DecisionTreeStep[];
    validation?: unknown;
  };
  version: number;
  status: "draft" | "pending_review" | "approved" | "rejected";
  visibility: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

const nodeTypes = {
  stepNode: StepNode,
  conditionNode: ConditionNode,
  toolNode: ToolNode,
};

function createBlankSOP(): StoredSOP {
  return {
    id: "",
    sop: {
      "@context": "https://knowledgepulse.dev/schema/v1",
      "@type": "ExpertSOP",
      id: "",
      name: "Untitled SOP",
      domain: "general",
      metadata: {
        version: "1.0.0",
        created: new Date().toISOString(),
        tags: [],
        quality_score: 0,
        usage: { success_rate: 0, uses: 0 },
      },
      source: {
        type: "human_expert",
        expert_id: "",
        credentials: [],
      },
      decision_tree: [
        {
          step: "Step 1",
          instruction: "Enter instruction here",
        },
      ],
    },
    version: 1,
    status: "draft",
    visibility: "private",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function EditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [storedSOP, setStoredSOP] = useState<StoredSOP | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Load SOP from API
  useEffect(() => {
    if (isNew) {
      const blank = createBlankSOP();
      setStoredSOP(blank);
      const { nodes: n, edges: e } = sopToFlow(blank.sop.decision_tree);
      setNodes(n);
      setEdges(e);
      return;
    }

    if (!id) return;

    setLoading(true);
    setError(null);

    (api.getSOP(id) as Promise<{ data: StoredSOP }>)
      .then((res) => {
        const data = res.data;
        setStoredSOP(data);
        const { nodes: n, edges: e } = sopToFlow(data.sop.decision_tree || []);
        setNodes(n);
        setEdges(e);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load SOP");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isNew, setNodes, setEdges]);

  // Keep selected node in sync with nodes state
  useEffect(() => {
    if (selectedNode) {
      const updated = nodes.find((n) => n.id === selectedNode.id);
      if (updated) {
        setSelectedNode(updated);
      } else {
        setSelectedNode(null);
      }
    }
  }, [nodes, selectedNode]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from PropertyPanel
  const handleNodeUpdate = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return { ...n, data: newData };
          }
          return n;
        }),
      );
    },
    [setNodes],
  );

  // Show a temporary status message
  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  // Save SOP
  const handleSave = useCallback(async () => {
    if (!storedSOP) return;

    setSaving(true);
    setError(null);

    try {
      const decisionTree = flowToSop(nodes, edges);
      const updatedSOP = {
        ...storedSOP.sop,
        decision_tree: decisionTree,
      };

      if (isNew) {
        const result = (await api.createSOP(updatedSOP)) as {
          data: StoredSOP;
        };
        setStoredSOP(result.data);
        showStatus("SOP created successfully");
        navigate(`/editor/${result.data.id}`, { replace: true });
      } else {
        const result = (await api.updateSOP(storedSOP.id, updatedSOP)) as {
          data: StoredSOP;
        };
        setStoredSOP(result.data);
        showStatus("SOP saved successfully");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save SOP");
    } finally {
      setSaving(false);
    }
  }, [storedSOP, nodes, edges, isNew, navigate, showStatus]);

  // Export SKILL.md
  const handleExport = useCallback(async () => {
    if (!storedSOP?.id || isNew) {
      setError("Save the SOP first before exporting");
      return;
    }

    try {
      const result = (await api.exportSkill(storedSOP.id)) as {
        data: { content: string };
      };
      // Download as file
      const blob = new Blob([result.data.content], {
        type: "text/markdown",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storedSOP.sop.name || "sop"}.SKILL.md`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus("SKILL.md exported");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export SKILL.md");
    }
  }, [storedSOP, isNew, showStatus]);

  // Submit for review
  const handleSubmitReview = useCallback(async () => {
    if (!storedSOP?.id || isNew) {
      setError("Save the SOP first before submitting for review");
      return;
    }

    try {
      const result = (await api.updateSOP(storedSOP.id, {
        ...storedSOP.sop,
        status: "pending_review",
      })) as { data: StoredSOP };
      setStoredSOP(result.data);
      showStatus("Submitted for review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit for review");
    }
  }, [storedSOP, isNew, showStatus]);

  // Delete SOP
  const handleDelete = useCallback(async () => {
    if (!storedSOP?.id || isNew) {
      navigate("/");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this SOP?")) {
      return;
    }

    try {
      await api.deleteSOP(storedSOP.id);
      showStatus("SOP deleted");
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete SOP");
    }
  }, [storedSOP, isNew, navigate, showStatus]);

  // Add a new step node
  const handleAddStep = useCallback(() => {
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const newNode: Node = {
      id: `step-${Date.now()}`,
      type: "stepNode",
      position: { x: 300, y: maxY + 200 },
      data: {
        nodeType: "step",
        step: `Step ${nodes.filter((n) => n.type === "stepNode").length + 1}`,
        instruction: "",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  // Add a new condition node
  const handleAddCondition = useCallback(() => {
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const newNode: Node = {
      id: `condition-${Date.now()}`,
      type: "conditionNode",
      position: { x: -50, y: maxY + 100 },
      data: {
        nodeType: "condition",
        parentStep: "",
        criteria: {},
        conditions: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  // Add a new tool node
  const handleAddTool = useCallback(() => {
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const newNode: Node = {
      id: `tool-${Date.now()}`,
      type: "toolNode",
      position: { x: 650, y: maxY + 100 },
      data: {
        nodeType: "tool",
        parentStep: "",
        name: "New Tool",
        when: "",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const miniMapNodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case "stepNode":
        return "#3b82f6";
      case "conditionNode":
        return "#f97316";
      case "toolNode":
        return "#22c55e";
      default:
        return "#6b7280";
    }
  }, []);

  // Memoize default viewport
  const defaultViewport = useMemo(() => ({ x: 50, y: 50, zoom: 0.8 }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading SOP...</p>
        </div>
      </div>
    );
  }

  if (error && !storedSOP) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            &larr; Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
            {storedSOP?.sop.name || "Untitled SOP"}
          </h1>
          {storedSOP?.status && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                storedSOP.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : storedSOP.status === "pending_review"
                    ? "bg-yellow-100 text-yellow-800"
                    : storedSOP.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {storedSOP.status.replace("_", " ")}
            </span>
          )}
          {statusMessage && (
            <span className="text-xs text-green-600 font-medium">{statusMessage}</span>
          )}
          {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Add node buttons */}
          <button
            type="button"
            onClick={handleAddStep}
            className="px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            + Step
          </button>
          <button
            type="button"
            onClick={handleAddCondition}
            className="px-3 py-1.5 text-xs font-medium border border-orange-300 text-orange-700 bg-orange-50 rounded-md hover:bg-orange-100"
          >
            + Condition
          </button>
          <button
            type="button"
            onClick={handleAddTool}
            className="px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 bg-green-50 rounded-md hover:bg-green-100"
          >
            + Tool
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Export SKILL.md
          </button>
          <button
            type="button"
            onClick={handleSubmitReview}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Submit for Review
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm font-medium border border-red-300 text-red-600 rounded-md hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Canvas + Property Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultViewport={defaultViewport}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap nodeColor={miniMapNodeColor} nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>
        <PropertyPanel selectedNode={selectedNode} onNodeUpdate={handleNodeUpdate} />
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
