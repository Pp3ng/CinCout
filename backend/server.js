const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
const port = 9527;

// Create HTTP server and integrate with Express
const server = http.createServer(app);

// Setup WebSocket server with ping enabled
const wss = new WebSocket.Server({ 
  server,
  // Add ping interval to detect disconnected clients
  clientTracking: true
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

// Import routes
const { router: compileRouter, setupWebSocketHandlers } = require('./routes/compile');
const memcheckRouter = require('./routes/memcheck');
const formatRouter = require('./routes/format');
const styleCheckRouter = require('./routes/styleCheck');
const templatesRouter = require('./routes/templates');

// Set up WebSocket handlers for compilation
setupWebSocketHandlers(wss);

// Set up heartbeat mechanism to keep connections alive
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log("Terminating inactive WebSocket connection");
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping('', false, true); // send ping frame to client
  });
}, 30000); // check every 30 seconds

// Clean up on server close
wss.on('close', function close() {
  clearInterval(interval);
});

// Use routes
app.use('/api/compile', compileRouter);
app.use('/api/memcheck', memcheckRouter);
app.use('/api/format', formatRouter);
app.use('/api/styleCheck', styleCheckRouter);
app.use('/api/templates', templatesRouter);

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});