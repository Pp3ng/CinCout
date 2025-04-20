/**
 * WebSocket handler utility
 * Provides common WebSocket functionality for route handlers
 */
import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";

// Extended WebSocket interface to add properties
export interface ExtendedWebSocket extends WebSocket {
  sessionId?: string;
  isAlive?: boolean;
  _pongTimeout?: NodeJS.Timeout; // Added property for pong timeout
}

// Global event emitter for WebSocket events
export const webSocketEvents = new EventEmitter();

/**
 * Setup WebSocket connection with basic handlers
 * @param {WebSocketServer} wss - WebSocket server instance
 * @param {Function} messageHandler - Function to handle incoming messages
 */
export const setupWebSocketServer = (
  wss: WebSocketServer,
  messageHandler: (ws: ExtendedWebSocket, data: any) => void
): void => {
  // Setup heartbeat interval checker
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const extWs = ws as ExtendedWebSocket;
      if (!extWs.isAlive) {
        console.log(
          `Terminating stale WS connection (${
            (extWs as any)._socket?.remoteAddress || "unknown"
          })`
        );
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
      // If no pong within 10s, will be terminated in next round
      extWs._pongTimeout = setTimeout(() => {
        if (!extWs.isAlive) extWs.terminate();
      }, 10000);
    });
  }, 30000);

  // Cleanup interval on server close
  wss.on("close", () => clearInterval(interval));

  wss.on("connection", (ws: WebSocket) => {
    const extWs = ws as ExtendedWebSocket;

    // Create unique session ID for each connection
    const sessionId = uuidv4();
    extWs.sessionId = sessionId;

    // Set isAlive flag for heartbeat
    extWs.isAlive = true;

    // Handle pong messages - client is alive
    extWs.on("pong", () => {
      extWs.isAlive = true;
      clearTimeout(extWs._pongTimeout); // Clear pong timeout when pong is received
    });

    // Set up auto-close timeout - if 3 minutes with no activity, close connection
    const autoCloseTimeout = setTimeout(() => {
      if (extWs.readyState === WebSocket.OPEN) {
        extWs.close();
      }
    }, 180000); // 3 minutes timeout

    // Handle incoming messages
    extWs.on("message", (message: Buffer | string | ArrayBuffer | Buffer[]) => {
      try {
        // Reset timeout on any message
        clearTimeout(autoCloseTimeout);

        const data = JSON.parse(
          typeof message === "string" ? message : message.toString()
        );

        // Call the message handler provided by the route
        messageHandler(extWs, data);
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        extWs.send(
          JSON.stringify({
            type: "error",
            message: "Error processing request: " + (error as Error).message,
            timestamp: Date.now(),
          })
        );
      }
    });

    // Handle WebSocket close
    extWs.on("close", () => {
      clearTimeout(autoCloseTimeout);
      clearTimeout(extWs._pongTimeout); // Clear pong timeout on close

      // Emit event for session closure so handlers can clean up resources
      webSocketEvents.emit("websocket-close", { sessionId });
    });

    // Send session ID back to client
    extWs.send(
      JSON.stringify({
        type: "connected",
        sessionId,
        timestamp: Date.now(),
      })
    );
  });
};

/**
 * Send a JSON message through WebSocket
 * @param {ExtendedWebSocket} ws - WebSocket connection
 * @param {any} data - Data to send (will be JSON stringified)
 * @returns {boolean} Whether message was sent successfully
 */
export const sendWebSocketMessage = (
  ws: ExtendedWebSocket,
  data: any
): boolean => {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          ...data,
          timestamp: Date.now(),
        })
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error sending WebSocket message:", error);
    return false;
  }
};
