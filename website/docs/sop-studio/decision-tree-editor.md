---
sidebar_position: 2
title: Decision Tree Editor
description: Use the React Flow canvas to visually build SOP decision trees with step, condition, and tool nodes.
---

# Decision Tree Editor

The Decision Tree Editor is the core of SOP Studio. It provides a visual canvas powered by React Flow where you can build, connect, and configure SOP decision trees.

## Canvas Overview

The editor consists of three areas:

| Area | Purpose |
|------|---------|
| **Node palette** (left) | Drag node types onto the canvas |
| **Canvas** (center) | Visual graph of your decision tree |
| **Property panel** (right) | Edit the selected node's properties |

## Node Types

### Step Node

A Step node represents a single action or instruction in the SOP.

| Property | Type | Description |
|----------|------|-------------|
| `step` | string | Unique step identifier |
| `instruction` | string | What to do at this step |
| `criteria` | Record | Key-value pairs defining evaluation criteria |
| `tool_suggestions` | Array | Optional tools that can assist this step |

### Condition Node

A Condition node creates branching logic. Each outgoing edge represents a possible condition value.

| Property | Type | Description |
|----------|------|-------------|
| `field` | string | The field or variable to evaluate |
| `conditions` | Record | Maps condition values to actions |
| `sla_min` | number | Optional SLA in minutes per branch |

### Tool Node

A Tool node references an external MCP tool or API that should be invoked at a particular point in the flow.

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Tool name (must match MCP tool registry) |
| `when` | string | Condition under which to invoke the tool |
| `input_template` | Record | Default input parameters |

## Working with the Canvas

### Adding Nodes

Drag a node type from the left palette onto the canvas. The node appears with default properties that you can edit in the right panel.

### Connecting Nodes

Click on a node's output handle (bottom) and drag to another node's input handle (top) to create an edge. For Condition nodes, each edge can be labeled with the condition value it represents.

### Editing Properties

Select any node to view and edit its properties in the right panel. Changes are reflected in real time on the canvas.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save SOP |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Remove selected node or edge |
| `Ctrl+A` | Select all nodes |
| `Ctrl+D` | Duplicate selected node |

## Save and Export

### Save to Registry

Click "Save" or press `Ctrl+S` to persist the SOP to the connected KnowledgePulse Registry. The SOP is stored as an `ExpertSOP` knowledge unit.

### Export as Skill-MD

Click "Export > Skill-MD" to generate a `SKILL.md` file from the SOP. This produces a portable markdown file with KnowledgePulse extension fields.

```bash
# Exported SKILL.md structure
---
name: Bug Triage
description: Standard procedure for classifying and routing bugs
version: "1.0"
tags: [engineering, triage]
kp:
  domain: engineering
  knowledge_capture: true
  visibility: org
---

## Steps
1. Classify the bug by severity
   - **Critical**: Escalate to on-call (SLA: 15 min)
   - **Major**: Assign to sprint (SLA: 60 min)
   - **Minor**: Add to backlog
```

### Export as JSON

Click "Export > JSON" to download the raw `ExpertSOP` JSON structure for use with the SDK or API.

## Validation

The editor validates your decision tree in real time:

- **Disconnected nodes** -- Warns if any node has no incoming or outgoing edges
- **Missing instructions** -- Warns if a Step node has no instruction text
- **Duplicate step IDs** -- Errors if two nodes share the same step identifier
- **Circular references** -- Errors if the graph contains cycles

Validation issues appear as colored badges on affected nodes and in the bottom status bar.
