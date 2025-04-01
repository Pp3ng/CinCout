// WebSocket handling module
const WebCppSocket = (function() {
  // Private variables
  let socket;
  let sessionId;
  let pingInterval;
  let reconnectTimeout;
  let isReconnecting = false;
  let messageHandler = null;
  let statusUpdateCallback = null;
  
  /**
   * Initialize WebSocket connection
   */
  function initWebSocket() {
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
        pingInterval = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
          }
        }, 20000); // Send ping every 20 seconds
      };
      
      socket.onmessage = (event) => {
        console.log('WebSocket message received:', event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''));
        if (messageHandler) {
          messageHandler(event);
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        updateStatus('Disconnected');
        
        // Clear ping interval
        if (pingInterval) {
          clearInterval(pingInterval);
        }
        
        // Only try to reconnect if page is still active and we're not already reconnecting
        if (document.visibilityState === 'visible' && !isReconnecting) {
          isReconnecting = true;
          reconnectTimeout = setTimeout(() => {
            initWebSocket(); // Try to reconnect
          }, 3000);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('Connection Error');
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      updateStatus('Connection Failed');
      
      // Try to reconnect if page is still active
      if (document.visibilityState === 'visible' && !isReconnecting) {
        isReconnecting = true;
        reconnectTimeout = setTimeout(() => {
          initWebSocket(); // Try to reconnect
        }, 5000); // Wait longer after an error
      }
    }
  }
  
  /**
   * Check WebSocket connection and reconnect if needed
   * @returns {Promise} Resolves when connection is ready
   */
  function ensureConnection() {
    return new Promise((resolve, reject) => {
      // If socket exists and is open, we're good to go
      if (socket && socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      // If socket exists but is connecting, wait for it
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        const onOpen = () => {
          socket.removeEventListener('open', onOpen);
          socket.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (err) => {
          socket.removeEventListener('open', onOpen);
          socket.removeEventListener('error', onError);
          reject(new Error('Connection failed while waiting'));
        };
        
        socket.addEventListener('open', onOpen);
        socket.addEventListener('error', onError);
        return;
      }
      
      // Otherwise, try to reconnect
      initWebSocket();
      
      // Set up listener for connection
      const checkConnection = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection);
          clearTimeout(connectionTimeout);
          resolve();
        }
      }, 100);
      
      // Set a timeout for connection attempts
      const connectionTimeout = setTimeout(() => {
        clearInterval(checkConnection);
        reject(new Error('Connection timed out'));
      }, 5000);
    });
  }

  /**
   * Send data through WebSocket
   * @param {Object} data - Data to send
   * @returns {Promise} Resolves when data is sent
   */
  function sendData(data) {
    return ensureConnection().then(() => {
      socket.send(JSON.stringify(data));
    });
  }
  
  /**
   * Update status display
   * @param {string} status - Status text to display
   */
  function updateStatus(status) {
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
  
  // Public API
  return {
    init: function(msgHandler, statusCallback) {
      messageHandler = msgHandler;
      statusUpdateCallback = statusCallback;
      initWebSocket();
    },
    reconnect: function() {
      initWebSocket();
    },
    sendData: sendData,
    ensureConnection: ensureConnection,
    getSessionId: function() {
      return sessionId;
    },
    setSessionId: function(id) {
      sessionId = id;
    },
    isConnected: function() {
      return socket && socket.readyState === WebSocket.OPEN;
    }
  };
})();
