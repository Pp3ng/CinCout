// WebSocket handling module
const CinCoutSocket = (function() {
  // Private variables
  let socket: WebSocket | null = null;
  let sessionId: string | null = null;
  let messageHandler: ((event: MessageEvent) => void) | null = null;
  
  /**
   * Initialize WebSocket connection
   * @returns {Promise<WebSocket>} Promise that resolves with WebSocket
   */
  function initWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      // Ensure no existing connection
      if (socket) {
        try {
          socket.onclose = null;
          socket.close();
          socket = null;
        } catch (e) {
          console.error('Error closing existing WebSocket:', e);
        }
      }
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      try {
        console.log('Creating new WebSocket connection...');
        socket = new WebSocket(`${protocol}//${host}`);
        
        socket.onopen = () => {
          console.log('WebSocket connection established');
          resolve(socket);
        };
        
        socket.onmessage = (event: MessageEvent) => {
          if (messageHandler) {
            messageHandler(event);
          }
        };
        
        socket.onclose = (event: CloseEvent) => {
          console.log('WebSocket connection closed', event.code, event.reason);
          socket = null;
          sessionId = null;
        };
        
        socket.onerror = (error: Event) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Connect to the WebSocket server
   * @returns {Promise<void>} Promise that resolves when connection is ready
   */
  function connect(): Promise<void> {
    console.log('Connecting to WebSocket server...');
    return initWebSocket()
      .then(() => {
        return Promise.resolve();
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  /**
   * Send data through WebSocket
   * @param {any} data - Data to send
   * @returns {Promise<void>} Resolves when data is sent
   */
  function sendData(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      // Add session ID to all messages
      if (sessionId) {
        data.sessionId = sessionId;
      }
      
      // Add timestamp
      data.timestamp = Date.now();
      
      // Send data
      try {
        socket.send(JSON.stringify(data));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Close the WebSocket connection
   */
  function disconnect(): void {
    console.log('Disconnecting WebSocket...');
    
    if (socket) {
      // Send cleanup message
      if (socket.readyState === WebSocket.OPEN && sessionId) {
        try {
          socket.send(JSON.stringify({
            type: 'cleanup',
            sessionId: sessionId,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Error sending cleanup message:', e);
        }
      }
      
      // Close the connection
      try {
        socket.onclose = null; 
        socket.close();
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      
      socket = null;
      sessionId = null;
    }
  }
  
  // Public API
  return {
    init: function(msgHandler: (event: MessageEvent) => void): void {
      messageHandler = msgHandler;
    },
    connect: connect,
    disconnect: disconnect,
    sendData: sendData,
    getSessionId: function(): string | null {
      return sessionId;
    },
    setSessionId: function(id: string): void {
      sessionId = id;
    },
    isConnected: function(): boolean {
      return !!(socket && socket.readyState === WebSocket.OPEN);
    }
  };
})();

// Export to make it available as a global variable
(window as any).CinCoutSocket = CinCoutSocket;
