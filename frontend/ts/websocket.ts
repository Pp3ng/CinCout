// WebSocket communication module
let socket: WebSocket | null = null;
let sessionId: string | null = null;
let messageHandler: ((event: MessageEvent) => void) | null = null;
let compilationState: string = "idle"; // idle, compiling, or running
let isProcessRunning: boolean = false;

export const resetState = () => {
  socket = null;
  sessionId = null;
  compilationState = "idle";
  isProcessRunning = false;
};

export const CinCoutSocket = {
  init(handler: (event: MessageEvent) => void) {
    messageHandler = handler;
  },

  async sendData(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }

      try {
        socket.send(JSON.stringify(data));
        resolve();
      } catch (e) {
        console.error("Error sending data:", e);
        reject(e);
      }
    });
  },

  isConnected(): boolean {
    return socket !== null && socket.readyState === WebSocket.OPEN;
  },

  getSessionId(): string | null {
    return sessionId;
  },

  setSessionId(id: string): void {
    sessionId = id;
  },

  async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    await initWebSocket();
    isProcessRunning = true;
  },

  disconnect(): void {
    isProcessRunning = false;
    compilationState = "idle";

    if (socket) {
      try {
        socket.onclose = null;
        socket.close();
        socket = null;
        sessionId = null;
      } catch (e) {
        console.error("Error closing WebSocket:", e);
      }
    }
  },

  setProcessRunning(running: boolean): void {
    isProcessRunning = running;
  },

  isProcessRunning(): boolean {
    return isProcessRunning;
  },

  updateStateFromMessage(type: string): void {
    switch (type) {
      case "compiling":
        compilationState = "compiling";
        isProcessRunning = true;
        break;
      case "compile-success":
        compilationState = "running";
        isProcessRunning = true;
        break;
      case "compile-error":
      case "exit":
        compilationState = "idle";
        isProcessRunning = false;
        break;
    }
  },

  getCompilationState(): string {
    return compilationState;
  },
};

// Attach to window for global access
(window as any).CinCoutSocket = CinCoutSocket;
(window as any).resetCompilationState = resetState;

function initWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Ensure no existing connection
    if (socket) {
      try {
        socket.onclose = null;
        socket.close();
        socket = null;
      } catch (e) {
        console.error("Error closing existing WebSocket:", e);
      }
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    try {
      socket = new WebSocket(`${protocol}//${host}`);

      socket.onopen = () => {
        resolve(socket as WebSocket);
      };

      socket.onmessage = (event: MessageEvent) => {
        if (messageHandler) {
          messageHandler(event);
        }
      };

      socket.onclose = (event: CloseEvent) => {
        console.log("WebSocket connection closed", event.code, event.reason);
        socket = null;
        sessionId = null;
        resetState();
      };

      socket.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
        reject(error);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      reject(error);
    }
  });
}
