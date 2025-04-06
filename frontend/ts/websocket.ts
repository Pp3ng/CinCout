// WebSocket handling module
const WebCppSocket = (function() {
  // Private variables
  let socket: WebSocket | null = null;
  let sessionId: string | null = null;
  let pingInterval: number | null = null;
  let reconnectTimeout: number | null = null;
  let isReconnecting: boolean = false;
  let messageHandler: ((event: MessageEvent) => void) | null = null;
  let statusUpdateCallback: ((status: string) => void) | null = null;
  
  /**
   * Initialize WebSocket connection
   */
  function initWebSocket(): void {
    // Clear any existing ping intervals and reconnect timeouts
    if (pingInterval) {
      clearInterval(pingInterval);
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    // Close any existing connection
    if (socket) {
      try {
        socket.close();
      } catch (e) {
        console.error('Error closing existing WebSocket:', e);
      }
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    try {
      socket = new WebSocket(`${protocol}//${host}`);
      
      socket.onopen = () => {
        updateStatus('Ready');
        isReconnecting = false;
        
        // Set up ping interval to keep connection alive
        pingInterval = window.setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
          }
        }, 20000); // Send ping every 20 seconds
      };
      
      socket.onmessage = (event: MessageEvent) => {
        console.log('WebSocket message received:', event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''));
        if (messageHandler) {
          messageHandler(event);
        }
      };
      
      socket.onclose = (event: CloseEvent) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        updateStatus('Disconnected');
        
        // Clear ping interval
        if (pingInterval) {
          clearInterval(pingInterval);
        }
        
        // Only try to reconnect if page is still active and we're not already reconnecting
        if (document.visibilityState === 'visible' && !isReconnecting) {
          isReconnecting = true;
          reconnectTimeout = window.setTimeout(() => {
            initWebSocket(); // Try to reconnect
          }, 3000);
        }
      };
      
      socket.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        updateStatus('Connection Error');
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      updateStatus('Connection Failed');
      
      // Try to reconnect if page is still active
      if (document.visibilityState === 'visible' && !isReconnecting) {
        isReconnecting = true;
        reconnectTimeout = window.setTimeout(() => {
          initWebSocket(); // Try to reconnect
        }, 5000); // Wait longer after an error
      }
    }
  }
  
  /**
   * Check WebSocket connection and reconnect if needed
   * @returns {Promise<void>} Resolves when connection is ready
   */
  function ensureConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // If socket exists and is open, we're good to go
      if (socket && socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      // If socket exists but is connecting, wait for it
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        const onOpen = () => {
          if (socket) {
            socket.removeEventListener('open', onOpen);
            socket.removeEventListener('error', onError);
          }
          resolve();
        };
        
        const onError = (err: Event) => {
          if (socket) {
            socket.removeEventListener('open', onOpen);
            socket.removeEventListener('error', onError);
          }
          reject(new Error('Connection failed while waiting'));
        };
        
        socket.addEventListener('open', onOpen);
        socket.addEventListener('error', onError);
        return;
      }
      
      // Otherwise, try to reconnect
      initWebSocket();
      
      // Set up listener for connection
      const checkConnection = window.setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection);
          clearTimeout(connectionTimeout);
          resolve();
        }
      }, 100);
      
      // Set a timeout for connection attempts
      const connectionTimeout = window.setTimeout(() => {
        clearInterval(checkConnection);
        reject(new Error('Connection timed out'));
      }, 5000);
    });
  }

  /**
   * Send data through WebSocket
   * @param {any} data - Data to send
   * @returns {Promise<void>} Resolves when data is sent
   */
  function sendData(data: any): Promise<void> {
    return ensureConnection().then(() => {
      // Add session ID to all messages
      if (sessionId) {
        data.sessionId = sessionId;
      }
      
      // Add timestamp
      data.timestamp = Date.now();
      
      // Send data
      if (socket) {
        socket.send(JSON.stringify(data));
      }
    });
  }
  
  /**
   * Reconnect the WebSocket connection and restore session if possible
   */
  function reconnect(): void {
    const previousSessionId = sessionId;
    initWebSocket();
    
    // After connection, try to restore the session
    if (previousSessionId) {
      ensureConnection().then(() => {
        sendData({
          type: 'restore_session',
          previousSessionId: previousSessionId
        });
      }).catch(err => {
        console.error('Failed to restore session:', err);
      });
    }
  }

  /**
   * Update status display
   * @param {string} status - Status text to display
   */
  function updateStatus(status: string): void {
    if (statusUpdateCallback) {
      statusUpdateCallback(status);
    }
  }
  
  // Add document visibility event listener
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Check if we need to reconnect
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        initWebSocket();
      }
    }
  });
  
  // Add visibility change handler for better reconnection on tab focus
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Check connection health when the tab becomes visible
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log('Tab visible, reconnecting WebSocket...');
        reconnect();
      } else {
        // Check if the connection is still responsive by sending a ping
        console.log('Tab visible, checking connection health...');
        try {
          sendData({
            type: 'ping',
            timestamp: Date.now()
          }).catch(() => {
            console.log('Ping failed, reconnecting...');
            reconnect();
          });
        } catch (e) {
          console.error('Error sending ping:', e);
          reconnect();
        }
      }
    }
  });
  
  // Public API
  return {
    init: function(msgHandler: (event: MessageEvent) => void, statusCallback: (status: string) => void): void {
      messageHandler = msgHandler;
      statusUpdateCallback = statusCallback;
      initWebSocket();
    },
    reconnect: reconnect,
    sendData: sendData,
    ensureConnection: ensureConnection,
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
(window as any).WebCppSocket = WebCppSocket;
