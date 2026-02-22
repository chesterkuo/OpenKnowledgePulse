import { Hono } from "hono";

// ── Types ─────────────────────────────────────────────────

export interface CollaborationPeer {
  agentId: string;
  connectedAt: string;
}

export interface CollaborationRoom {
  sopId: string;
  peers: Map<string, CollaborationPeer>; // keyed by a unique connection ID
}

export type CollaborationMessageType =
  | "join"
  | "leave"
  | "presence"
  | "update"
  | "sync"
  | "cursor"
  | "error";

export interface CollaborationMessage {
  type: CollaborationMessageType;
  sopId: string;
  agentId?: string;
  payload?: unknown;
  timestamp: string;
}

// ── CollaborationManager ─────────────────────────────────

/**
 * Manages collaboration rooms and peer presence for real-time SOP editing.
 * Each SOP being collaboratively edited has its own "room" with a set of
 * connected peers. The manager tracks joins/leaves and can broadcast
 * messages to all peers in a room.
 */
export class CollaborationManager {
  private rooms: Map<string, CollaborationRoom> = new Map();
  private connections: Map<string, { sopId: string; connId: string }> = new Map();
  private connectionCounter = 0;

  /** Generate a unique connection ID */
  generateConnectionId(): string {
    this.connectionCounter += 1;
    return `conn-${this.connectionCounter}-${Date.now()}`;
  }

  /** Join a collaboration room. Returns the connection ID for tracking. */
  join(sopId: string, agentId: string, connId?: string): string {
    const connectionId = connId ?? this.generateConnectionId();

    let room = this.rooms.get(sopId);
    if (!room) {
      room = { sopId, peers: new Map() };
      this.rooms.set(sopId, room);
    }

    room.peers.set(connectionId, {
      agentId,
      connectedAt: new Date().toISOString(),
    });

    this.connections.set(connectionId, { sopId, connId: connectionId });

    return connectionId;
  }

  /** Leave a collaboration room by connection ID. Returns true if the peer was found. */
  leave(connectionId: string): boolean {
    const info = this.connections.get(connectionId);
    if (!info) return false;

    const room = this.rooms.get(info.sopId);
    if (!room) {
      this.connections.delete(connectionId);
      return false;
    }

    const removed = room.peers.delete(connectionId);
    this.connections.delete(connectionId);

    // Clean up empty rooms
    if (room.peers.size === 0) {
      this.rooms.delete(info.sopId);
    }

    return removed;
  }

  /** Get the presence list for a given SOP room. */
  getPresence(sopId: string): CollaborationPeer[] {
    const room = this.rooms.get(sopId);
    if (!room) return [];
    return Array.from(room.peers.values());
  }

  /** Get active peer count for a room. */
  getPeerCount(sopId: string): number {
    const room = this.rooms.get(sopId);
    return room ? room.peers.size : 0;
  }

  /** Check if a specific agent is in a room. */
  isAgentInRoom(sopId: string, agentId: string): boolean {
    const room = this.rooms.get(sopId);
    if (!room) return false;
    for (const peer of room.peers.values()) {
      if (peer.agentId === agentId) return true;
    }
    return false;
  }

  /** Get all active room IDs. */
  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  /** Get total number of active rooms. */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /** Get the SOP ID associated with a connection. */
  getConnectionRoom(connectionId: string): string | undefined {
    return this.connections.get(connectionId)?.sopId;
  }

  /** Get all connection IDs in a room (for broadcasting). */
  getRoomConnectionIds(sopId: string): string[] {
    const room = this.rooms.get(sopId);
    if (!room) return [];
    return Array.from(room.peers.keys());
  }

  /** Build a presence message for a room. */
  buildPresenceMessage(sopId: string): CollaborationMessage {
    return {
      type: "presence",
      sopId,
      payload: {
        peers: this.getPresence(sopId),
        count: this.getPeerCount(sopId),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /** Build a join notification message. */
  buildJoinMessage(sopId: string, agentId: string): CollaborationMessage {
    return {
      type: "join",
      sopId,
      agentId,
      payload: {
        peers: this.getPresence(sopId),
        count: this.getPeerCount(sopId),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /** Build a leave notification message. */
  buildLeaveMessage(sopId: string, agentId: string): CollaborationMessage {
    return {
      type: "leave",
      sopId,
      agentId,
      payload: {
        peers: this.getPresence(sopId),
        count: this.getPeerCount(sopId),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Singleton manager ────────────────────────────────────

export const collaborationManager = new CollaborationManager();

// ── WebSocket handler for Bun.serve ──────────────────────

/** Map from WebSocket instance to connection metadata */
const wsConnections = new WeakMap<
  WebSocket,
  { connectionId: string; sopId: string; agentId: string }
>();

/**
 * Creates a Bun-compatible WebSocket handler object.
 * This should be passed to `Bun.serve({ websocket: ... })`.
 */
export function createWebSocketHandler(manager: CollaborationManager = collaborationManager) {
  return {
    open(ws: WebSocket) {
      // Connection metadata is attached during upgrade via ws.data
      const data = (ws as unknown as { data?: { sopId?: string; agentId?: string } }).data;
      const sopId = data?.sopId ?? "unknown";
      const agentId = data?.agentId ?? "anonymous";

      const connectionId = manager.join(sopId, agentId);
      wsConnections.set(ws, { connectionId, sopId, agentId });

      // Send presence to the newly connected client
      ws.send(JSON.stringify(manager.buildJoinMessage(sopId, agentId)));
    },

    message(ws: WebSocket, message: string | Buffer) {
      const meta = wsConnections.get(ws);
      if (!meta) return;

      try {
        const parsed = JSON.parse(
          typeof message === "string" ? message : message.toString(),
        ) as CollaborationMessage;

        // Relay update/sync/cursor messages to room peers
        if (
          parsed.type === "update" ||
          parsed.type === "sync" ||
          parsed.type === "cursor"
        ) {
          const outgoing: CollaborationMessage = {
            ...parsed,
            sopId: meta.sopId,
            agentId: meta.agentId,
            timestamp: new Date().toISOString(),
          };

          // Note: In a real deployment, you'd iterate over all WebSocket connections
          // in the room and send to each. This handler provides the structure;
          // the actual broadcast requires access to the WebSocket set which is
          // managed by the Bun server runtime.
          ws.send(JSON.stringify(outgoing));
        }
      } catch {
        ws.send(
          JSON.stringify({
            type: "error",
            sopId: meta.sopId,
            payload: { message: "Invalid message format" },
            timestamp: new Date().toISOString(),
          } satisfies CollaborationMessage),
        );
      }
    },

    close(ws: WebSocket) {
      const meta = wsConnections.get(ws);
      if (!meta) return;

      manager.leave(meta.connectionId);
      wsConnections.delete(ws);

      // Note: leave broadcast would be sent to remaining room peers
      // via the server's connection tracking in production.
    },
  };
}

// ── HTTP routes (presence + upgrade info) ────────────────

export function wsCollaborateRoutes(manager: CollaborationManager = collaborationManager) {
  const app = new Hono();

  /**
   * GET /v1/sop/:id/collaborate/presence
   * Returns current collaborators for a given SOP.
   */
  app.get("/:id/collaborate/presence", (c) => {
    const sopId = c.req.param("id");
    const peers = manager.getPresence(sopId);
    return c.json({
      sopId,
      peers,
      count: peers.length,
    });
  });

  /**
   * GET /v1/sop/:id/collaborate
   * Returns WebSocket connection info.
   * In production, this endpoint handles the WebSocket upgrade via Bun.serve.
   * For HTTP clients, it returns connection metadata.
   */
  app.get("/:id/collaborate", (c) => {
    const sopId = c.req.param("id");
    const upgradeHeader = c.req.header("upgrade");

    // If this is not a WebSocket upgrade request, return connection info
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      const peers = manager.getPresence(sopId);
      return c.json({
        sopId,
        wsPath: `/v1/sop/${sopId}/collaborate`,
        protocol: "knowledgepulse-collab-v1",
        peers,
        count: peers.length,
      });
    }

    // For WebSocket upgrade requests in Bun, the upgrade is handled
    // at the Bun.serve level, not within Hono routes.
    // Return 426 if somehow reached without proper upgrade handling.
    return c.json(
      { error: "WebSocket upgrade must be handled by the server runtime" },
      426,
    );
  });

  /**
   * GET /v1/sop/collaborate/rooms
   * Returns all active collaboration rooms.
   */
  app.get("/collaborate/rooms", (c) => {
    const rooms = manager.getActiveRooms();
    const roomInfo = rooms.map((sopId) => ({
      sopId,
      peers: manager.getPresence(sopId),
      count: manager.getPeerCount(sopId),
    }));
    return c.json({
      rooms: roomInfo,
      totalRooms: rooms.length,
    });
  });

  return app;
}
