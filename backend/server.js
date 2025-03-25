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

// Setup WebSocket server
const wss = new WebSocket.Server({ server });

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

// Set up WebSocket handlers for compilation
setupWebSocketHandlers(wss);

// Use routes
app.use('/api/compile', compileRouter);
app.use('/api/memcheck', memcheckRouter);
app.use('/api/format', formatRouter);
app.use('/api/styleCheck', styleCheckRouter);

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 