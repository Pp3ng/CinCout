import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';

const app = express();
const port = 9527;

// Create HTTP server and integrate with Express
const server = http.createServer(app);

// Setup WebSocket server with ping enabled
const wss = new WebSocketServer({ 
  server,
  // Add ping interval to detect disconnected clients
  clientTracking: true
});


// Global rate limiter for all API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // Limit each IP to 30 requests per minute
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after a minute',
  handler: (req: Request, res: Response, _next: NextFunction) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again after a minute',
    });
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Apply rate limiting to all API endpoints
app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, '../../frontend')));

// Import routes
import { router as compileRouter, setupWebSocketHandlers } from './routes/compile';
import memcheckRouter from './routes/memcheck';
import formatRouter from './routes/format';
import styleCheckRouter from './routes/styleCheck';
import templatesRouter from './routes/templates';

// Set up WebSocket handlers for compilation
setupWebSocketHandlers(wss);

// Set up heartbeat mechanism to keep connections alive
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws: any) {
    if (ws.isAlive === false) {
      console.log("Terminating inactive WebSocket connection");
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // check every 30 seconds

// Handle connection events
wss.on('connection', function connection(ws: any) {
  // Initialize the isAlive property when a connection is established
  ws.isAlive = true;
  
  // Handle pong messages from this connection
  ws.on('pong', function() {
    ws.isAlive = true;
  });
});

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
