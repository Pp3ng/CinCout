/**
 * CinCout Server
 * Main entry point for the application
 */
import cluster from "cluster";
import os from "os";
import Koa from "koa";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import path from "path";
import http from "http";
import ratelimit from "koa-ratelimit";
import compress from "koa-compress";
import helmet from "koa-helmet";
import serve from "koa-static";
import zlib from "zlib";
import { Context } from "koa";
import { AppError } from "./types";

// Routes & WebSockets
import { setupSocketHandlers } from "./ws/webSocketManager";
import formatRouter from "./routes/format";
import styleCheckRouter from "./routes/styleCheck";
import templatesRouter from "./routes/templates";
import assemblyRouter from "./routes/assembly";
import memcheckRouter from "./routes/memcheck";

// Determine number of worker processes
const numCPUs = os.cpus().length;
// Use environment variable for port or default to 9527
const port = parseInt(process.env.PORT || "9527", 10);

/**
 * Configure and start a worker process
 */
function startWorker() {
  // Create Koa application
  const app = new Koa();

  // Add error handler
  app.use(async (ctx: Context, next: () => Promise<any>) => {
    try {
      await next();
    } catch (err) {
      const error = err as Error;
      const status =
        error instanceof AppError ? (error as AppError).status : 500;

      // Set HTTP status
      ctx.status = status;

      // Set error response
      ctx.body = {
        success: false,
        error: error.message || "Internal Server Error",
      };

      // Emit error event for logging
      ctx.app.emit("error", error, ctx);
    }
  });

  // Compression middleware
  app.use(
    compress({
      filter: (content_type: string) => {
        return /text|javascript|json/i.test(content_type);
      },
      threshold: 1024, // Only compress if above threshold
      br: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
        },
      },
      gzip: {
        level: 6,
      },
    })
  );

  // CORS middleware
  app.use(cors());

  // Body parser middleware
  app.use(bodyParser());

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Rate limiter middleware
  const rateLimitDb = new Map();
  app.use(
    ratelimit({
      driver: "memory",
      db: rateLimitDb,
      duration: 60 * 1000, // 1 minute
      max: 30, // limit each IP to 30 requests per duration
      errorMessage: "Rate limit exceeded",
      id: (ctx: Context) => ctx.ip,
      whitelist: (_ctx: Context) => {
        // Optional whitelist function
        return false;
      },
      disableHeader: false,
    })
  );

  // Static files middleware
  app.use(
    serve(path.join(__dirname, "../../frontend/dist"), {
      maxage: 86400000, // 1 day in milliseconds
      index: "index.html",
      setHeaders: (res: any, filepath: string) => {
        if (filepath.endsWith(".js") || filepath.endsWith(".css")) {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
      },
    })
  );

  // Create HTTP server
  const server = http.createServer(app.callback());

  // Enhance HTTP Server
  server.keepAliveTimeout = 61 * 1000; // Client Keep-Alive timeout (61 seconds)
  server.headersTimeout = 65 * 1000; // Headers timeout (65 seconds)

  // Setup Socket.IO handlers
  setupSocketHandlers(server);

  // Set up main router
  const apiRouter = new Router({ prefix: "/api" });

  // Mount sub-routers
  apiRouter.use(
    "/format",
    formatRouter.routes(),
    formatRouter.allowedMethods()
  );
  apiRouter.use(
    "/styleCheck",
    styleCheckRouter.routes(),
    styleCheckRouter.allowedMethods()
  );
  apiRouter.use(
    "/templates",
    templatesRouter.routes(),
    templatesRouter.allowedMethods()
  );
  apiRouter.use(
    "/assembly",
    assemblyRouter.routes(),
    assemblyRouter.allowedMethods()
  );
  apiRouter.use(
    "/memcheck",
    memcheckRouter.routes(),
    memcheckRouter.allowedMethods()
  );

  // Use the router middleware
  app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

  // Custom 404 handler
  app.use((ctx: Context) => {
    ctx.status = 404;
    ctx.body = {
      success: false,
      error: "Not Found",
      path: ctx.path,
    };
  });

  // Error handler
  app.on("error", (err, ctx) => {
    const errorDetails = {
      message: err.message,
      status: ctx.status,
      path: ctx.path,
      method: ctx.method,
      ip: ctx.ip,
    };

    console.error("Server error:", errorDetails, err.stack);
  });

  // Start server
  server.listen(port, () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });

  // Handle unexpected errors
  process.on("uncaughtException", (err) => {
    console.error(`Uncaught exception in worker ${process.pid}:`, err);
  });

  process.on("unhandledRejection", (reason) => {
    console.error(`Unhandled rejection in worker ${process.pid}:`, reason);
  });
}

// Main application entry point
if (cluster.isPrimary) {
  // Master process
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart workers if they die
  cluster.on("exit", (worker, code, signal) => {
    console.warn(
      `Worker ${worker.process.pid} died (${signal || code}), forking a new one`
    );
    cluster.fork();
  });

  // Log when a worker comes online
  cluster.on("online", (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });
} else {
  // Worker process
  startWorker();
}
