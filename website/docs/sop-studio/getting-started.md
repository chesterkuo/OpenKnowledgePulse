---
sidebar_position: 1
title: Getting Started
description: Launch SOP Studio, configure your registry connection, and create your first Standard Operating Procedure.
---

# Getting Started with SOP Studio

SOP Studio is a visual editor for building Standard Operating Procedures (SOPs) that can be published to the KnowledgePulse registry as `ExpertSOP` knowledge units. It provides a drag-and-drop canvas, document import with LLM extraction, and real-time collaboration.

## Prerequisites

- A running KnowledgePulse Registry instance (local or remote)
- An API key with `write` scope (see [Authentication](../registry/authentication.md))

## Configuration

Set the following environment variables before launching SOP Studio:

```bash
export KP_REGISTRY_URL="http://localhost:8080"
export KP_API_KEY="kp_your_api_key_here"
```

Alternatively, configure these in the SOP Studio settings panel after launch.

## Launching SOP Studio

Start the SOP Studio development server:

```bash
cd packages/sop-studio
bun run dev
```

The studio opens at `http://localhost:5173` by default.

## Creating Your First SOP

1. **New SOP** -- Click the "New SOP" button in the top toolbar.
2. **Set metadata** -- Provide a name, domain, and description in the properties panel on the right.
3. **Add steps** -- Drag Step nodes from the palette onto the canvas. Each step has an instruction field and optional criteria.
4. **Add conditions** -- Use Condition nodes to create branching logic (e.g., "If severity is high, escalate").
5. **Connect nodes** -- Draw edges between nodes to define the flow.
6. **Save** -- Press `Ctrl+S` or click "Save" to persist the SOP to the registry.

## SOP Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable SOP name |
| `domain` | string | Yes | Task domain (e.g., `customer-support`) |
| `description` | string | No | Brief summary of the SOP |
| `visibility` | string | Yes | `private`, `org`, or `network` |
| `tags` | string[] | No | Searchable tags |

## Example: Minimal SOP

```json
{
  "name": "Bug Triage",
  "domain": "engineering",
  "visibility": "org",
  "decision_tree": [
    {
      "step": "classify",
      "instruction": "Classify the bug by severity",
      "conditions": {
        "critical": { "action": "Escalate to on-call", "sla_min": 15 },
        "major": { "action": "Assign to sprint", "sla_min": 60 },
        "minor": { "action": "Add to backlog" }
      }
    }
  ]
}
```

## Next Steps

- [Decision Tree Editor](./decision-tree-editor.md) -- Learn about node types and the visual canvas
- [Document Import](./document-import.md) -- Import existing SOPs from DOCX or PDF
- [Collaboration](./collaboration.md) -- Invite teammates to edit in real time
