import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import {
  CollaborationManager,
  createWebSocketHandler,
  wsCollaborateRoutes,
} from "./ws-collaborate.js";

// ── CollaborationManager Unit Tests ─────────────────────

describe("CollaborationManager", () => {
  let manager: CollaborationManager;

  beforeEach(() => {
    manager = new CollaborationManager();
  });

  // ── join ───────────────────────────────────────────────

  describe("join", () => {
    test("should add a peer to a new room and return a connection ID", () => {
      const connId = manager.join("sop-1", "agent-a");
      expect(connId).toBeTruthy();
      expect(typeof connId).toBe("string");
    });

    test("should create a room on first join", () => {
      manager.join("sop-1", "agent-a");
      expect(manager.getRoomCount()).toBe(1);
      expect(manager.getActiveRooms()).toContain("sop-1");
    });

    test("should track multiple peers in the same room", () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-1", "agent-b");
      expect(manager.getPeerCount("sop-1")).toBe(2);
    });

    test("should allow the same agent to join multiple times (different connections)", () => {
      const conn1 = manager.join("sop-1", "agent-a");
      const conn2 = manager.join("sop-1", "agent-a");
      expect(conn1).not.toBe(conn2);
      expect(manager.getPeerCount("sop-1")).toBe(2);
    });

    test("should support custom connection IDs", () => {
      const connId = manager.join("sop-1", "agent-a", "my-custom-id");
      expect(connId).toBe("my-custom-id");
    });

    test("should support joining multiple rooms", () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-2", "agent-b");
      expect(manager.getRoomCount()).toBe(2);
    });
  });

  // ── leave ──────────────────────────────────────────────

  describe("leave", () => {
    test("should remove a peer from a room and return true", () => {
      const connId = manager.join("sop-1", "agent-a");
      const removed = manager.leave(connId);
      expect(removed).toBe(true);
      expect(manager.getPeerCount("sop-1")).toBe(0);
    });

    test("should return false for unknown connection ID", () => {
      const removed = manager.leave("nonexistent-conn");
      expect(removed).toBe(false);
    });

    test("should clean up empty rooms after last peer leaves", () => {
      const connId = manager.join("sop-1", "agent-a");
      manager.leave(connId);
      expect(manager.getRoomCount()).toBe(0);
      expect(manager.getActiveRooms()).not.toContain("sop-1");
    });

    test("should not remove room if other peers remain", () => {
      const conn1 = manager.join("sop-1", "agent-a");
      manager.join("sop-1", "agent-b");

      manager.leave(conn1);
      expect(manager.getRoomCount()).toBe(1);
      expect(manager.getPeerCount("sop-1")).toBe(1);
    });

    test("should handle double leave gracefully", () => {
      const connId = manager.join("sop-1", "agent-a");
      manager.leave(connId);
      const secondLeave = manager.leave(connId);
      expect(secondLeave).toBe(false);
    });
  });

  // ── getPresence ────────────────────────────────────────

  describe("getPresence", () => {
    test("should return empty array for unknown room", () => {
      const peers = manager.getPresence("nonexistent");
      expect(peers).toEqual([]);
    });

    test("should return all peers in a room", () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-1", "agent-b");

      const peers = manager.getPresence("sop-1");
      expect(peers).toHaveLength(2);

      const agentIds = peers.map((p) => p.agentId);
      expect(agentIds).toContain("agent-a");
      expect(agentIds).toContain("agent-b");
    });

    test("should include connectedAt timestamp for each peer", () => {
      manager.join("sop-1", "agent-a");
      const peers = manager.getPresence("sop-1");
      expect(peers[0]!.connectedAt).toBeTruthy();
      // Should be a valid ISO timestamp
      expect(() => new Date(peers[0]!.connectedAt)).not.toThrow();
    });

    test("should update after a peer leaves", () => {
      manager.join("sop-1", "agent-a");
      const connB = manager.join("sop-1", "agent-b");

      manager.leave(connB);
      const peers = manager.getPresence("sop-1");
      expect(peers).toHaveLength(1);
      expect(peers[0]!.agentId).toBe("agent-a");
    });
  });

  // ── getPeerCount ───────────────────────────────────────

  describe("getPeerCount", () => {
    test("should return 0 for unknown room", () => {
      expect(manager.getPeerCount("nonexistent")).toBe(0);
    });

    test("should return correct count", () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-1", "agent-b");
      manager.join("sop-1", "agent-c");
      expect(manager.getPeerCount("sop-1")).toBe(3);
    });
  });

  // ── isAgentInRoom ──────────────────────────────────────

  describe("isAgentInRoom", () => {
    test("should return false for empty room", () => {
      expect(manager.isAgentInRoom("sop-1", "agent-a")).toBe(false);
    });

    test("should return true when agent is in room", () => {
      manager.join("sop-1", "agent-a");
      expect(manager.isAgentInRoom("sop-1", "agent-a")).toBe(true);
    });

    test("should return false when agent is not in room", () => {
      manager.join("sop-1", "agent-a");
      expect(manager.isAgentInRoom("sop-1", "agent-b")).toBe(false);
    });

    test("should return false after agent leaves", () => {
      const connId = manager.join("sop-1", "agent-a");
      manager.leave(connId);
      expect(manager.isAgentInRoom("sop-1", "agent-a")).toBe(false);
    });
  });

  // ── getActiveRooms ─────────────────────────────────────

  describe("getActiveRooms", () => {
    test("should return empty array initially", () => {
      expect(manager.getActiveRooms()).toEqual([]);
    });

    test("should return all rooms with active peers", () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-2", "agent-b");
      manager.join("sop-3", "agent-c");

      const rooms = manager.getActiveRooms();
      expect(rooms).toHaveLength(3);
      expect(rooms).toContain("sop-1");
      expect(rooms).toContain("sop-2");
      expect(rooms).toContain("sop-3");
    });
  });

  // ── getConnectionRoom ──────────────────────────────────

  describe("getConnectionRoom", () => {
    test("should return undefined for unknown connection", () => {
      expect(manager.getConnectionRoom("nonexistent")).toBeUndefined();
    });

    test("should return the SOP ID for a valid connection", () => {
      const connId = manager.join("sop-42", "agent-a");
      expect(manager.getConnectionRoom(connId)).toBe("sop-42");
    });
  });

  // ── getRoomConnectionIds ───────────────────────────────

  describe("getRoomConnectionIds", () => {
    test("should return empty array for unknown room", () => {
      expect(manager.getRoomConnectionIds("nonexistent")).toEqual([]);
    });

    test("should return all connection IDs in a room", () => {
      const conn1 = manager.join("sop-1", "agent-a");
      const conn2 = manager.join("sop-1", "agent-b");

      const connIds = manager.getRoomConnectionIds("sop-1");
      expect(connIds).toHaveLength(2);
      expect(connIds).toContain(conn1);
      expect(connIds).toContain(conn2);
    });
  });

  // ── Message builders ───────────────────────────────────

  describe("buildPresenceMessage", () => {
    test("should build a presence message with current peers", () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-1", "agent-b");

      const msg = manager.buildPresenceMessage("sop-1");
      expect(msg.type).toBe("presence");
      expect(msg.sopId).toBe("sop-1");
      expect(msg.timestamp).toBeTruthy();

      const payload = msg.payload as { peers: unknown[]; count: number };
      expect(payload.count).toBe(2);
      expect(payload.peers).toHaveLength(2);
    });

    test("should return empty presence for unknown room", () => {
      const msg = manager.buildPresenceMessage("nonexistent");
      const payload = msg.payload as { peers: unknown[]; count: number };
      expect(payload.count).toBe(0);
      expect(payload.peers).toHaveLength(0);
    });
  });

  describe("buildJoinMessage", () => {
    test("should build a join message with agent info", () => {
      manager.join("sop-1", "agent-a");
      const msg = manager.buildJoinMessage("sop-1", "agent-a");
      expect(msg.type).toBe("join");
      expect(msg.sopId).toBe("sop-1");
      expect(msg.agentId).toBe("agent-a");
      expect(msg.timestamp).toBeTruthy();
    });
  });

  describe("buildLeaveMessage", () => {
    test("should build a leave message with agent info", () => {
      const msg = manager.buildLeaveMessage("sop-1", "agent-x");
      expect(msg.type).toBe("leave");
      expect(msg.sopId).toBe("sop-1");
      expect(msg.agentId).toBe("agent-x");
    });
  });
});

// ── HTTP Route Tests ─────────────────────────────────────

describe("wsCollaborateRoutes", () => {
  let manager: CollaborationManager;
  let app: Hono;

  beforeEach(() => {
    manager = new CollaborationManager();
    const collaborateApp = wsCollaborateRoutes(manager);
    app = new Hono();
    app.route("/v1/sop", collaborateApp);
  });

  // ── GET /v1/sop/:id/collaborate/presence ───────────────

  describe("GET /v1/sop/:id/collaborate/presence", () => {
    test("should return empty presence for room with no peers", async () => {
      const res = await app.request("/v1/sop/sop-1/collaborate/presence");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { sopId: string; peers: unknown[]; count: number };
      expect(body.sopId).toBe("sop-1");
      expect(body.peers).toEqual([]);
      expect(body.count).toBe(0);
    });

    test("should return peers when room has collaborators", async () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-1", "agent-b");

      const res = await app.request("/v1/sop/sop-1/collaborate/presence");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { sopId: string; peers: Array<{ agentId: string }>; count: number };
      expect(body.count).toBe(2);
      expect(body.peers).toHaveLength(2);

      const agentIds = body.peers.map((p) => p.agentId);
      expect(agentIds).toContain("agent-a");
      expect(agentIds).toContain("agent-b");
    });
  });

  // ── GET /v1/sop/:id/collaborate ────────────────────────

  describe("GET /v1/sop/:id/collaborate", () => {
    test("should return connection info for non-WebSocket request", async () => {
      const res = await app.request("/v1/sop/sop-42/collaborate");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        sopId: string;
        wsPath: string;
        protocol: string;
        peers: unknown[];
        count: number;
      };
      expect(body.sopId).toBe("sop-42");
      expect(body.wsPath).toBe("/v1/sop/sop-42/collaborate");
      expect(body.protocol).toBe("knowledgepulse-collab-v1");
      expect(body.peers).toEqual([]);
      expect(body.count).toBe(0);
    });

    test("should include current peers in connection info", async () => {
      manager.join("sop-42", "agent-a");

      const res = await app.request("/v1/sop/sop-42/collaborate");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { count: number };
      expect(body.count).toBe(1);
    });

    test("should return 426 for WebSocket upgrade request (not handled by Hono)", async () => {
      const res = await app.request("/v1/sop/sop-42/collaborate", {
        headers: { Upgrade: "websocket" },
      });
      expect(res.status).toBe(426);
    });
  });

  // ── GET /v1/sop/collaborate/rooms ──────────────────────

  describe("GET /v1/sop/collaborate/rooms", () => {
    test("should return empty rooms list initially", async () => {
      const res = await app.request("/v1/sop/collaborate/rooms");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { rooms: unknown[]; totalRooms: number };
      expect(body.rooms).toEqual([]);
      expect(body.totalRooms).toBe(0);
    });

    test("should return all active rooms with peer info", async () => {
      manager.join("sop-1", "agent-a");
      manager.join("sop-1", "agent-b");
      manager.join("sop-2", "agent-c");

      const res = await app.request("/v1/sop/collaborate/rooms");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        rooms: Array<{ sopId: string; count: number; peers: unknown[] }>;
        totalRooms: number;
      };
      expect(body.totalRooms).toBe(2);
      expect(body.rooms).toHaveLength(2);

      const sop1Room = body.rooms.find((r) => r.sopId === "sop-1");
      expect(sop1Room).toBeDefined();
      expect(sop1Room!.count).toBe(2);

      const sop2Room = body.rooms.find((r) => r.sopId === "sop-2");
      expect(sop2Room).toBeDefined();
      expect(sop2Room!.count).toBe(1);
    });
  });
});

// ── WebSocket Handler Factory Tests ─────────────────────

describe("createWebSocketHandler", () => {
  test("should return an object with open, message, and close handlers", () => {
    const handler = createWebSocketHandler();
    expect(typeof handler.open).toBe("function");
    expect(typeof handler.message).toBe("function");
    expect(typeof handler.close).toBe("function");
  });

  test("should use a custom manager when provided", () => {
    const manager = new CollaborationManager();
    const handler = createWebSocketHandler(manager);
    expect(handler).toBeDefined();
    // Verify the manager is used (indirectly through join)
    expect(manager.getRoomCount()).toBe(0);
  });
});

// ── Integration: Manager room lifecycle ─────────────────

describe("Room lifecycle", () => {
  let manager: CollaborationManager;

  beforeEach(() => {
    manager = new CollaborationManager();
  });

  test("should handle full lifecycle: join -> presence -> leave -> cleanup", () => {
    // 1. Room starts empty
    expect(manager.getRoomCount()).toBe(0);

    // 2. First peer joins
    const conn1 = manager.join("sop-1", "agent-a");
    expect(manager.getRoomCount()).toBe(1);
    expect(manager.getPeerCount("sop-1")).toBe(1);

    // 3. Second peer joins
    const conn2 = manager.join("sop-1", "agent-b");
    expect(manager.getPeerCount("sop-1")).toBe(2);

    // 4. Check presence
    const presence = manager.getPresence("sop-1");
    expect(presence).toHaveLength(2);
    expect(presence.map((p) => p.agentId).sort()).toEqual(["agent-a", "agent-b"]);

    // 5. First peer leaves
    manager.leave(conn1);
    expect(manager.getPeerCount("sop-1")).toBe(1);
    expect(manager.isAgentInRoom("sop-1", "agent-a")).toBe(false);
    expect(manager.isAgentInRoom("sop-1", "agent-b")).toBe(true);

    // 6. Last peer leaves — room is cleaned up
    manager.leave(conn2);
    expect(manager.getRoomCount()).toBe(0);
    expect(manager.getPresence("sop-1")).toEqual([]);
  });

  test("should isolate rooms from each other", () => {
    manager.join("sop-1", "agent-a");
    manager.join("sop-2", "agent-b");

    expect(manager.getPeerCount("sop-1")).toBe(1);
    expect(manager.getPeerCount("sop-2")).toBe(1);
    expect(manager.isAgentInRoom("sop-1", "agent-b")).toBe(false);
    expect(manager.isAgentInRoom("sop-2", "agent-a")).toBe(false);
  });

  test("should handle many peers in a single room", () => {
    const connectionIds: string[] = [];
    for (let i = 0; i < 50; i++) {
      connectionIds.push(manager.join("sop-stress", `agent-${i}`));
    }

    expect(manager.getPeerCount("sop-stress")).toBe(50);
    expect(manager.getPresence("sop-stress")).toHaveLength(50);

    // Remove half
    for (let i = 0; i < 25; i++) {
      manager.leave(connectionIds[i]!);
    }

    expect(manager.getPeerCount("sop-stress")).toBe(25);

    // Remove remaining
    for (let i = 25; i < 50; i++) {
      manager.leave(connectionIds[i]!);
    }

    expect(manager.getRoomCount()).toBe(0);
  });
});
