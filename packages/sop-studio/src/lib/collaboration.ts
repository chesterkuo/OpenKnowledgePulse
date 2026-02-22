import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────

export interface CollaborationPeer {
  agentId: string;
  connectedAt: string;
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

export interface CollaborationState {
  /** Whether the WebSocket is currently connected */
  connected: boolean;
  /** List of peers currently collaborating on this SOP */
  peers: CollaborationPeer[];
  /** Number of connected peers */
  peerCount: number;
  /** Send an update message to all collaborators */
  sendUpdate: (payload: unknown) => void;
  /** Send a cursor position update */
  sendCursor: (payload: { x: number; y: number; nodeId?: string }) => void;
  /** Register a callback for incoming update messages */
  onUpdate: (handler: (message: CollaborationMessage) => void) => () => void;
  /** Register a callback for incoming cursor messages */
  onCursor: (handler: (message: CollaborationMessage) => void) => () => void;
  /** Last error message, if any */
  error: string | null;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

export interface UseCollaborationOptions {
  /** The base URL of the registry (defaults to localStorage kp_registry_url) */
  registryUrl?: string;
  /** Agent ID to identify this collaborator */
  agentId?: string;
  /** Whether to auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect delay in ms after disconnect (default: 3000) */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
}

// ── Helper: derive WS URL from registry URL ──────────────

function deriveWsUrl(registryUrl: string, sopId: string): string {
  const url = registryUrl.replace(/\/$/, "");
  // Convert http(s) to ws(s)
  const wsUrl = url.replace(/^http/, "ws");
  return `${wsUrl}/v1/sop/${encodeURIComponent(sopId)}/collaborate`;
}

function getDefaultRegistryUrl(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("kp_registry_url") || "http://localhost:8080";
  }
  return "http://localhost:8080";
}

function getDefaultAgentId(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("kp_agent_id") || `anon-${Date.now()}`;
  }
  return `anon-${Date.now()}`;
}

// ── useCollaboration Hook ────────────────────────────────

/**
 * React hook for real-time collaborative SOP editing.
 *
 * Connects via WebSocket to the KnowledgePulse registry and tracks
 * peer presence. Provides methods to broadcast changes and receive
 * updates from other collaborators.
 *
 * @param sopId - The SOP ID to collaborate on
 * @param options - Configuration options
 * @returns CollaborationState with connection status, peers, and messaging methods
 *
 * @example
 * ```tsx
 * function SOPEditor({ sopId }: { sopId: string }) {
 *   const { connected, peers, sendUpdate, onUpdate } = useCollaboration(sopId);
 *
 *   useEffect(() => {
 *     const unsub = onUpdate((msg) => {
 *       console.log("Received update:", msg.payload);
 *     });
 *     return unsub;
 *   }, [onUpdate]);
 *
 *   return (
 *     <div>
 *       <p>{connected ? "Connected" : "Disconnected"}</p>
 *       <p>{peers.length} collaborators online</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCollaboration(
  sopId: string,
  options: UseCollaborationOptions = {},
): CollaborationState {
  const {
    registryUrl,
    agentId,
    autoConnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<CollaborationPeer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateHandlersRef = useRef<Set<(msg: CollaborationMessage) => void>>(new Set());
  const cursorHandlersRef = useRef<Set<(msg: CollaborationMessage) => void>>(new Set());
  const resolvedRegistryUrl = registryUrl || getDefaultRegistryUrl();
  const resolvedAgentId = agentId || getDefaultAgentId();

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    try {
      const wsUrl = deriveWsUrl(resolvedRegistryUrl, sopId);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send initial join with agent identification
        ws.send(
          JSON.stringify({
            type: "join",
            sopId,
            agentId: resolvedAgentId,
            timestamp: new Date().toISOString(),
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as CollaborationMessage;

          switch (message.type) {
            case "join":
            case "leave":
            case "presence": {
              // Update peer list from presence payload
              const payload = message.payload as
                | { peers?: CollaborationPeer[]; count?: number }
                | undefined;
              if (payload?.peers) {
                setPeers(payload.peers);
              }
              break;
            }
            case "update":
            case "sync": {
              for (const handler of updateHandlersRef.current) {
                handler(message);
              }
              break;
            }
            case "cursor": {
              for (const handler of cursorHandlersRef.current) {
                handler(message);
              }
              break;
            }
            case "error": {
              const errPayload = message.payload as { message?: string } | undefined;
              setError(errPayload?.message || "Unknown collaboration error");
              break;
            }
          }
        } catch {
          // Ignore unparseable messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
      };

      wsRef.current = ws;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, [sopId, resolvedRegistryUrl, resolvedAgentId, reconnectDelay, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    // Prevent auto-reconnect on intentional disconnect
    reconnectAttemptsRef.current = maxReconnectAttempts;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setPeers([]);
  }, [maxReconnectAttempts]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  const sendUpdate = useCallback(
    (payload: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "update",
            sopId,
            agentId: resolvedAgentId,
            payload,
            timestamp: new Date().toISOString(),
          } satisfies CollaborationMessage),
        );
      }
    },
    [sopId, resolvedAgentId],
  );

  const sendCursor = useCallback(
    (payload: { x: number; y: number; nodeId?: string }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "cursor",
            sopId,
            agentId: resolvedAgentId,
            payload,
            timestamp: new Date().toISOString(),
          } satisfies CollaborationMessage),
        );
      }
    },
    [sopId, resolvedAgentId],
  );

  const onUpdate = useCallback(
    (handler: (message: CollaborationMessage) => void): (() => void) => {
      updateHandlersRef.current.add(handler);
      return () => {
        updateHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const onCursor = useCallback(
    (handler: (message: CollaborationMessage) => void): (() => void) => {
      cursorHandlersRef.current.add(handler);
      return () => {
        cursorHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [autoConnect, connect]);

  return {
    connected,
    peers,
    peerCount: peers.length,
    sendUpdate,
    sendCursor,
    onUpdate,
    onCursor,
    error,
    disconnect,
    reconnect,
  };
}
