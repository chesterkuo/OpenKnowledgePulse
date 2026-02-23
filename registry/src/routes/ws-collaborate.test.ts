import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import {
  CollaborationManager,
  type CollaborationMessage,
  createWebSocketHandler,
  wsCollaborateRoutes,
  wsConnectionMap,
} from "./ws-collaborate.js";

// ── Mock WebSocket helper ────────────────────────────────

/** Create a minimal mock WebSocket for testing broadcast behavior */
function createMockWebSocket(
  sopId: string,
  agentId: string,
): {
  ws: WebSocket;
  sent: string[];
} {
  const sent: string[] = [];
  const ws = {
    readyState: WebSocket.OPEN,
    data: { sopId, agentId },
    send(data: string) {
      sent.push(data);
    },
    close() {
      (this as { readyState: number }).readyState = WebSocket.CLOSED;
    },
  } as unknown as WebSocket;
  return { ws, sent };
}

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

      const body = (await res.json()) as {
        sopId: string;
        peers: Array<{ agentId: string }>;
        count: number;
      };
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

// ── WebSocket Broadcast Tests ────────────────────────────

describe("WebSocket broadcast", () => {
  let manager: CollaborationManager;
  let handler: ReturnType<typeof createWebSocketHandler>;

  beforeEach(() => {
    manager = new CollaborationManager();
    handler = createWebSocketHandler(manager);
    // Clear the module-level connection map before each test
    wsConnectionMap.clear();
  });

  afterEach(() => {
    wsConnectionMap.clear();
  });

  // ── open handler broadcast ──────────────────────────────

  describe("open handler — join broadcast", () => {
    test("should send join message to the connecting client", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      handler.open(ws1);

      expect(sent1).toHaveLength(1);
      const msg = JSON.parse(sent1[0]!) as CollaborationMessage;
      expect(msg.type).toBe("join");
      expect(msg.sopId).toBe("sop-1");
      expect(msg.agentId).toBe("agent-a");
    });

    test("should broadcast join message to existing peers when a new peer joins", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      handler.open(ws1);
      // ws1 got its own join message
      expect(sent1).toHaveLength(1);

      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      handler.open(ws2);

      // ws2 gets its own join confirmation
      expect(sent2).toHaveLength(1);
      const ws2JoinMsg = JSON.parse(sent2[0]!) as CollaborationMessage;
      expect(ws2JoinMsg.type).toBe("join");
      expect(ws2JoinMsg.agentId).toBe("agent-b");

      // ws1 should have received the broadcast of agent-b joining
      expect(sent1).toHaveLength(2);
      const broadcastMsg = JSON.parse(sent1[1]!) as CollaborationMessage;
      expect(broadcastMsg.type).toBe("join");
      expect(broadcastMsg.agentId).toBe("agent-b");
    });

    test("should not broadcast join to peers in different rooms", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      handler.open(ws1);

      const { ws: ws2 } = createMockWebSocket("sop-2", "agent-b");
      handler.open(ws2);

      // ws1 should only have its own join message, not agent-b's join to a different room
      expect(sent1).toHaveLength(1);
    });

    test("should register the WebSocket in the connection map", () => {
      const { ws: ws1 } = createMockWebSocket("sop-1", "agent-a");
      handler.open(ws1);

      expect(wsConnectionMap.size).toBe(1);
    });
  });

  // ── message handler broadcast ───────────────────────────

  describe("message handler — relay to room peers", () => {
    test("should broadcast update messages to all peers except sender", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      const { ws: ws3, sent: sent3 } = createMockWebSocket("sop-1", "agent-c");
      handler.open(ws1);
      handler.open(ws2);
      handler.open(ws3);

      // Clear join messages
      sent1.length = 0;
      sent2.length = 0;
      sent3.length = 0;

      // agent-a sends an update
      const updateMsg = JSON.stringify({
        type: "update",
        sopId: "sop-1",
        payload: { data: "hello" },
        timestamp: new Date().toISOString(),
      });
      handler.message(ws1, updateMsg);

      // sender (ws1) should NOT receive the broadcast
      expect(sent1).toHaveLength(0);

      // ws2 and ws3 should each receive the update
      expect(sent2).toHaveLength(1);
      expect(sent3).toHaveLength(1);

      const relayed = JSON.parse(sent2[0]!) as CollaborationMessage;
      expect(relayed.type).toBe("update");
      expect(relayed.agentId).toBe("agent-a");
      expect(relayed.sopId).toBe("sop-1");
    });

    test("should broadcast sync messages to all peers except sender", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      handler.open(ws1);
      handler.open(ws2);
      sent1.length = 0;
      sent2.length = 0;

      const syncMsg = JSON.stringify({
        type: "sync",
        sopId: "sop-1",
        payload: { version: 5 },
        timestamp: new Date().toISOString(),
      });
      handler.message(ws1, syncMsg);

      expect(sent1).toHaveLength(0);
      expect(sent2).toHaveLength(1);
      const relayed = JSON.parse(sent2[0]!) as CollaborationMessage;
      expect(relayed.type).toBe("sync");
    });

    test("should broadcast cursor messages to all peers except sender", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      handler.open(ws1);
      handler.open(ws2);
      sent1.length = 0;
      sent2.length = 0;

      const cursorMsg = JSON.stringify({
        type: "cursor",
        sopId: "sop-1",
        payload: { x: 100, y: 200 },
        timestamp: new Date().toISOString(),
      });
      handler.message(ws2, cursorMsg);

      // sender (ws2) should not receive
      expect(sent2).toHaveLength(0);
      // ws1 should receive the cursor
      expect(sent1).toHaveLength(1);
      const relayed = JSON.parse(sent1[0]!) as CollaborationMessage;
      expect(relayed.type).toBe("cursor");
      expect(relayed.agentId).toBe("agent-b");
    });

    test("should not broadcast non-relayable message types", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      handler.open(ws1);
      handler.open(ws2);
      sent1.length = 0;
      sent2.length = 0;

      const joinMsg = JSON.stringify({
        type: "join",
        sopId: "sop-1",
        timestamp: new Date().toISOString(),
      });
      handler.message(ws1, joinMsg);

      // Neither should receive anything for a non-relay type
      expect(sent1).toHaveLength(0);
      expect(sent2).toHaveLength(0);
    });

    test("should send error back to sender for invalid JSON", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      handler.open(ws1);
      handler.open(ws2);
      sent1.length = 0;
      sent2.length = 0;

      handler.message(ws1, "not valid json{{{");

      // Error goes to sender only
      expect(sent1).toHaveLength(1);
      const errMsg = JSON.parse(sent1[0]!) as CollaborationMessage;
      expect(errMsg.type).toBe("error");

      // Other peer should not receive the error
      expect(sent2).toHaveLength(0);
    });

    test("single peer in room receives no broadcast (edge case)", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      handler.open(ws1);
      sent1.length = 0;

      const updateMsg = JSON.stringify({
        type: "update",
        sopId: "sop-1",
        payload: { data: "solo" },
        timestamp: new Date().toISOString(),
      });
      handler.message(ws1, updateMsg);

      // No broadcast to self
      expect(sent1).toHaveLength(0);
    });

    test("should not send to peers with closed WebSocket", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      handler.open(ws1);
      handler.open(ws2);
      sent1.length = 0;
      sent2.length = 0;

      // Simulate ws2 having a closed connection (readyState != OPEN)
      (ws2 as unknown as { readyState: number }).readyState = WebSocket.CLOSED;

      const updateMsg = JSON.stringify({
        type: "update",
        sopId: "sop-1",
        payload: { data: "test" },
        timestamp: new Date().toISOString(),
      });
      handler.message(ws1, updateMsg);

      // ws2 should not receive anything since its readyState is CLOSED
      expect(sent2).toHaveLength(0);
      // sender also should not receive
      expect(sent1).toHaveLength(0);
    });

    test("should not send to peers in a different room", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      const { ws: ws3, sent: sent3 } = createMockWebSocket("sop-2", "agent-c");
      handler.open(ws1);
      handler.open(ws2);
      handler.open(ws3);
      sent1.length = 0;
      sent2.length = 0;
      sent3.length = 0;

      const updateMsg = JSON.stringify({
        type: "update",
        sopId: "sop-1",
        payload: { data: "room-1-only" },
        timestamp: new Date().toISOString(),
      });
      handler.message(ws1, updateMsg);

      // ws2 (same room) should receive
      expect(sent2).toHaveLength(1);
      // ws3 (different room) should NOT receive
      expect(sent3).toHaveLength(0);
    });
  });

  // ── close handler broadcast ─────────────────────────────

  describe("close handler — leave broadcast", () => {
    test("should broadcast leave message to remaining peers when a peer disconnects", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2, sent: sent2 } = createMockWebSocket("sop-1", "agent-b");
      const { ws: ws3, sent: sent3 } = createMockWebSocket("sop-1", "agent-c");
      handler.open(ws1);
      handler.open(ws2);
      handler.open(ws3);
      sent1.length = 0;
      sent2.length = 0;
      sent3.length = 0;

      // agent-b disconnects
      handler.close(ws2);

      // ws1 and ws3 should receive the leave message
      expect(sent1).toHaveLength(1);
      expect(sent3).toHaveLength(1);

      const leaveMsg = JSON.parse(sent1[0]!) as CollaborationMessage;
      expect(leaveMsg.type).toBe("leave");
      expect(leaveMsg.agentId).toBe("agent-b");
      expect(leaveMsg.sopId).toBe("sop-1");

      // ws2 (the one who left) should not receive
      expect(sent2).toHaveLength(0);
    });

    test("should not broadcast leave to peers in different rooms", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2 } = createMockWebSocket("sop-1", "agent-b");
      const { ws: ws3, sent: sent3 } = createMockWebSocket("sop-2", "agent-c");
      handler.open(ws1);
      handler.open(ws2);
      handler.open(ws3);
      sent1.length = 0;
      sent3.length = 0;

      handler.close(ws2);

      // ws1 (same room) should get leave
      expect(sent1).toHaveLength(1);
      // ws3 (different room) should not
      expect(sent3).toHaveLength(0);
    });

    test("should handle last peer leaving (no one to broadcast to)", () => {
      const { ws: ws1, sent: sent1 } = createMockWebSocket("sop-1", "agent-a");
      handler.open(ws1);
      sent1.length = 0;

      // No crash when the only peer leaves
      handler.close(ws1);
      expect(sent1).toHaveLength(0);
      expect(manager.getRoomCount()).toBe(0);
    });

    test("should clean up connection map on close", () => {
      const { ws: ws1 } = createMockWebSocket("sop-1", "agent-a");
      handler.open(ws1);
      expect(wsConnectionMap.size).toBe(1);

      handler.close(ws1);
      expect(wsConnectionMap.size).toBe(0);
    });

    test("should remove peer from manager on close", () => {
      const { ws: ws1 } = createMockWebSocket("sop-1", "agent-a");
      const { ws: ws2 } = createMockWebSocket("sop-1", "agent-b");
      handler.open(ws1);
      handler.open(ws2);
      expect(manager.getPeerCount("sop-1")).toBe(2);

      handler.close(ws1);
      expect(manager.getPeerCount("sop-1")).toBe(1);
      expect(manager.isAgentInRoom("sop-1", "agent-a")).toBe(false);
      expect(manager.isAgentInRoom("sop-1", "agent-b")).toBe(true);
    });

    test("should handle close for unknown WebSocket gracefully", () => {
      const { ws: unknownWs } = createMockWebSocket("sop-1", "agent-a");
      // Don't call open, just close directly
      handler.close(unknownWs);
      // Should not throw
      expect(wsConnectionMap.size).toBe(0);
    });
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
