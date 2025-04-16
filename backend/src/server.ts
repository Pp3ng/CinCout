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
import fs from "fs";
import morgan from "morgan";
import helmet from "helmet";

// Routes & WebSockets
import {
  router as compileRouter,
  setupCompileWebSocketHandlers,
} from "./routes/compile";
import memcheckRouter from "./routes/memcheck";
import formatRouter from "./routes/format";
import styleCheckRouter from "./routes/styleCheck";
import templatesRouter from "./routes/templates";

const numCPUs = os.cpus().length;
const port = 9527;

if (cluster.isPrimary) {
  // Master process
  console.log(`Master ${process.pid} is running`);
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    // resart worker if it dies
    console.warn(`Worker ${worker.process.pid} died, forking a new one`);
    cluster.fork();
  });
} else {
  // Worker processes start here
  const app = express();
  // Create logs directory
  const logDir = path.join(__dirname, "../logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // API request logging middleware
  const accessLogStream = fs.createWriteStream(
    path.join(logDir, "access.log"),
    { flags: "a" }
  );

  // Custom log format including session source
  morgan.token("session-source", (req: Request) => {
    return req.headers["referer"] || req.headers["origin"] || "direct";
  });

  // Apply logging middleware - removed request-body from logging
  app.use(
    morgan(
      ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :session-source {}',
      {
        stream: accessLogStream,
      }
    )
  );

  // Console output simplified logs
  app.use(morgan(":method :url :status :response-time ms - :session-source"));

  app.use(compression()); // Response compression
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
      morgan(`Rate limit exceeded for IP: ${req.ip}`, {
        stream: accessLogStream,
      })(req, res, () => {});
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

  // WebSocket
  const wss = new WebSocketServer({ server, clientTracking: true });
  setupCompileWebSocketHandlers(wss);

  // Mount routes
  app.use("/api/compile", compileRouter);
  app.use("/api/memcheck", memcheckRouter);
  app.use("/api/format", formatRouter);
  app.use("/api/styleCheck", styleCheckRouter);
  app.use("/api/templates", templatesRouter);

  // Start server
  server.listen(port, /* backlog */ 1024, () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });
}
