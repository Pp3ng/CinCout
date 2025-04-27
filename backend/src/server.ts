import cluster from "cluster";
import os from "os";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import helmet from "helmet";

// Routes & WebSockets
import { setupCompileWebSocketHandlers } from "./ws/compile";
import formatRouter from "./routes/format";
import styleCheckRouter from "./routes/styleCheck";
import templatesRouter from "./routes/templates";
import assemblyRouter from "./routes/assembly";
import memcheckRouter from "./routes/memcheck";
import { initSessionService } from "./utils/sessionService";

const numCPUs = os.cpus().length;
const port = 9527;

// WebSocket compression options
const wsOptions = {
  perMessageDeflate: {
    zlibDeflateOptions: {
      level: 6, // Compression level (1-9, 6 is default)
      memLevel: 8, // Memory allocation for compression (1-9, 8 is default)
      chunkSize: 1024 * 64, // Processing chunk size
    },
    serverNoContextTakeover: true, // Disable context takeover on server
    clientNoContextTakeover: true, // Disable context takeover on client
    serverMaxWindowBits: 10, // Lower window size for server compression
    concurrencyLimit: 10, // Limit concurrent compression operations
    threshold: 1024, // Only compress messages larger than this size
  },
  clientTracking: true, // Keep track of connected clients
};

if (cluster.isPrimary) {
  // Master process
  console.log(`Master ${process.pid} is running`);
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, _code, _signal) => {
    // resart worker if it dies
    console.warn(`Worker ${worker.process.pid} died, forking a new one`);
    cluster.fork();
  });
} else {
  // Worker processes start here
  const app = express();

  // Custom log format
  app.use(
    morgan(
      ':remote-addr - [:date[clf]] ":method :url HTTP/:http-version" ' +
        ':status :res[content-length] ":referrer" ":user-agent"'
    )
  );

  app.use(
    compression({
      filter: (req, res) => {
        if (
          res.getHeader("Content-Length") &&
          parseInt(res.getHeader("Content-Length") as string) < 1024
        ) {
          return false;
        }
        return compression.filter(req, res);
      },
      brotli: {
        enabled: true,
        params: { [require("zlib").constants.BROTLI_PARAM_QUALITY]: 5 },
      },
      level: 6,
    })
  ); // Response compression

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(
    helmet({
      // Disable content security policy (i don't know why it doesn't allow loading my own scripts)
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Global rate limiting
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many requests, please try again later.",
    handler: (req: Request, res: Response) => {
      morgan(`Rate limit exceeded for IP: ${req.ip}`)(req, res, () => {});
      res.status(429).json({ error: "Rate limit exceeded" });
    },
  });
  app.use("/api/", apiLimiter);

  // Static files
  app.use(
    express.static(path.join(__dirname, "../../frontend/dist"), {
      etag: true, // enable ETag
      lastModified: true, // verify last modified
      maxAge: "1d", // 1 day
      index: "index.html", // default file
      setHeaders: (res, path) => {
        // Set custom headers for specific file types
        if (
          path.endsWith(".js") ||
          path.endsWith(".css") ||
          path.endsWith(".woff2")
        ) {
          res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
        }
      },
    })
  );

  const server = http.createServer(app);

  // Enhance HTTP Server
  server.keepAliveTimeout = 61 * 1000; // Client Keep-Alive timeout
  server.headersTimeout = 65 * 1000; // Headers timeout

  // Initialize session service
  initSessionService();

  // WebSocket
  const wss = new WebSocketServer({ server, ...wsOptions });
  setupCompileWebSocketHandlers(wss);

  // Mount routes
  app.use("/api/format", formatRouter);
  app.use("/api/styleCheck", styleCheckRouter);
  app.use("/api/templates", templatesRouter);
  app.use("/api/assembly", assemblyRouter);
  app.use("/api/memcheck", memcheckRouter);

  // Start server
  server.listen(port, /* backlog */ 1024, () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });
}
