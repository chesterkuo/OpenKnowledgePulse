---
sidebar_position: 4
title: Collaboration
description: Real-time collaborative editing of SOPs with WebSocket connections and presence indicators.
---

# Collaboration

SOP Studio supports real-time collaborative editing, allowing multiple users to work on the same SOP simultaneously. Changes are synchronized via WebSocket connections and conflicts are resolved automatically.

## Enabling Collaboration

Collaboration requires a running registry with WebSocket support. Ensure your registry instance is started with WebSocket enabled:

```bash
export KP_WEBSOCKET_ENABLED=true
bun run registry/src/index.ts
```

## Sharing an SOP

1. Open an SOP in the editor.
2. Click the "Share" button in the toolbar.
3. Copy the generated share link or invite collaborators by their agent ID.

### Access Levels

| Level | Permissions |
|-------|-------------|
| **Viewer** | Read-only access to the SOP |
| **Editor** | Can modify nodes, edges, and properties |
| **Owner** | Full control including sharing and deletion |

## Real-Time Editing

When multiple users edit the same SOP:

- **Cursor presence** -- Each collaborator's cursor is visible on the canvas with a colored indicator and their agent ID.
- **Node locking** -- When a user selects a node, it shows a colored border indicating who is editing it. Other users can still view but not modify that node until it is deselected.
- **Live updates** -- Node additions, deletions, edge changes, and property edits sync within milliseconds.

## WebSocket Connection

SOP Studio maintains a persistent WebSocket connection to the registry for real-time updates.

### Connection Lifecycle

```
1. Client opens SOP → WebSocket CONNECT to /v1/sop/:id/ws
2. Server sends current state + active collaborators
3. Client sends edits as JSON patches
4. Server broadcasts patches to all connected clients
5. Client closes tab → Server removes from presence list
```

### Reconnection

If the connection drops, SOP Studio automatically attempts to reconnect with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4+ | 8 seconds (max) |

Edits made while disconnected are queued locally and replayed upon reconnection.

## Conflict Resolution

SOP Studio uses an operational transformation (OT) strategy for conflict resolution:

- **Property edits** -- Last-write-wins with timestamp ordering. If two users edit the same node property simultaneously, the most recent edit takes precedence.
- **Structural changes** -- Node additions and deletions are commutative. Adding a node while another user deletes a different node applies both changes cleanly.
- **Edge conflicts** -- If a node is deleted while another user creates an edge to it, the edge creation is rejected and the user is notified.

## Presence Indicators

The collaborator bar at the top of the editor shows:

- Avatar or initials for each active collaborator
- Color-coded dot indicating their status (green = active, yellow = idle)
- Tooltip with agent ID and current selection

## Permissions and Security

- All WebSocket connections require a valid API key via the initial HTTP upgrade request.
- Collaborators must have at least `read` scope. `write` scope is required for editing.
- SOP visibility settings (`private`, `org`, `network`) control who can access the share link.
- WebSocket messages are validated against the same Zod schemas used by the REST API.
