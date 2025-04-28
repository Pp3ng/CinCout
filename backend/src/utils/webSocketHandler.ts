/**
 * WebSocket Handler
 * Centralized utilities for WebSocket management
 */
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import { WebSocketMessage } from "../types";
import { v4 as uuidv4 } from "uuid";

// Define ExtendedWebSocket interface for local use
export interface ExtendedWebSocket extends WebSocket {
  sessionId: string;
  isAlive: boolean;
}

// Event emitter for WebSocket events
export const webSocketEvents = new EventEmitter();

// Ping interval in milliseconds
const PING_INTERVAL = 30000;

/**
 * Setup WebSocket server with standard configuration
 * @param {WebSocketServer} wss - WebSocket server to configure
 * @param {function} messageHandler - Handler for incoming messages
 */
export const setupWebSocketServer = (
  wss: WebSocketServer,
  messageHandler: (ws: ExtendedWebSocket, data: any) => void
): void => {
  // Connection handler
  wss.on("connection", (ws: WebSocket) => {
    const extendedWs = ws as ExtendedWebSocket;

    // Initialize properties
    extendedWs.isAlive = true;
    extendedWs.sessionId = uuidv4();

    // Send confirmation with session ID
    sendWebSocketMessage(extendedWs, {
      type: "connected",
      sessionId: extendedWs.sessionId,
    });

    // Handle messages
    ws.on("message", (message: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const data = JSON.parse(message.toString());
        messageHandler(extendedWs, data);
      } catch (error) {
        console.error("Error parsing message:", error);
        sendWebSocketMessage(extendedWs, {
          type: "error",
          message: "Invalid message format",
        });
      }
    });

    // Handle pong responses
    ws.on("pong", () => {
      extendedWs.isAlive = true;
    });

    // Handle close events
    ws.on("close", () => {
      if (extendedWs.sessionId) {
        webSocketEvents.emit("websocket-close", {
          sessionId: extendedWs.sessionId,
        });
      }
    });
  });

  // Setup heartbeat mechanism
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extendedWs = ws as ExtendedWebSocket;
      if (extendedWs.isAlive === false) {
        ws.terminate();
        return;
      }

      extendedWs.isAlive = false;
      ws.ping();
    });
  }, PING_INTERVAL);

  // Clean up interval on server close
  wss.on("close", () => {
    clearInterval(interval);
  });
};

/**
 * Send a formatted message to a WebSocket client
 * @param {ExtendedWebSocket} ws - WebSocket connection
 * @param {object} data - Data to send
 */
export const sendWebSocketMessage = (
  ws: ExtendedWebSocket,
  data: WebSocketMessage
): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
};
