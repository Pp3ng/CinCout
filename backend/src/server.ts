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
import logger from "koa-logger";
import helmet from "koa-helmet";
import serve from "koa-static";
import zlib from "zlib";
import { Context } from "koa";

// Routes & WebSockets
import { setupCompileSocketHandlers } from "./ws/compile";
import formatRouter from "./routes/format";
import styleCheckRouter from "./routes/styleCheck";
import templatesRouter from "./routes/templates";
import assemblyRouter from "./routes/assembly";
import memcheckRouter from "./routes/memcheck";
import { initSessionService } from "./utils/sessionService";

const numCPUs = os.cpus().length;
const port = 9527;

// Socket.IO will handle its own compression

if (cluster.isPrimary) {
  // Master process
  console.log(`Master ${process.pid} is running`);
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, _code, _signal) => {
    // restart worker if it dies
    console.warn(`Worker ${worker.process.pid} died, forking a new one`);
    cluster.fork();
  });
} else {
  // Worker processes start here
  const app = new Koa();

  app.use(logger());

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

  // Body parser
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

  // Rate limiter using Redis or Memory
  const db = new Map();
  app.use(
    ratelimit({
      driver: "memory",
      db: db,
      duration: 60 * 1000, // 1 minute
      max: 30, // limit each IP to 30 requests per duration
      errorMessage: "Rate limit exceeded", // Changed from object to string
      id: (ctx: Context) => ctx.ip,
      whitelist: (_ctx: Context) => {
        // Optional whitelist function
        return false;
      },
      disableHeader: false,
    })
  );

  // Static files - koa-static middleware
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
  server.keepAliveTimeout = 61 * 1000; // Client Keep-Alive timeout
  server.headersTimeout = 65 * 1000; // Headers timeout

  // Initialize session service
  initSessionService();

  // Setup Socket.IO handlers
  setupCompileSocketHandlers(server);

  // Set up main router
  const router = new Router({ prefix: "/api" });

  // Mount sub-routers
  router.use("/format", formatRouter.routes(), formatRouter.allowedMethods());
  router.use(
    "/styleCheck",
    styleCheckRouter.routes(),
    styleCheckRouter.allowedMethods()
  );
  router.use(
    "/templates",
    templatesRouter.routes(),
    templatesRouter.allowedMethods()
  );
  router.use(
    "/assembly",
    assemblyRouter.routes(),
    assemblyRouter.allowedMethods()
  );
  router.use(
    "/memcheck",
    memcheckRouter.routes(),
    memcheckRouter.allowedMethods()
  );

  // Use the router middleware
  app.use(router.routes()).use(router.allowedMethods());

  // Error handler
  app.on("error", (err, ctx) => {
    console.error("Server error", err, ctx);
  });

  // Start server
  server.listen(port, 1024, () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });
}
