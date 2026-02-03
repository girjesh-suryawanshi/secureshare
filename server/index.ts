import compression from "compression";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { config, isProduction } from "./config";
import { logger } from "./logger";

const app = express();
app.set("trust proxy", 1);

const requestLogger = pinoHttp({ logger });
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use(requestLogger);
const jsonLdScriptHashes = [
  "'sha256-XZvCzx836R3zaSDOFzc4EYBj48AAQk6oox2LzWAvftA='",
  "'sha256-MGV40mJVz/c+FWPWxYcJoyKZyybAE9K8T3UNLJKzTSU='",
];

const contentSecurityPolicyOptions = isProduction
  ? {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          ...jsonLdScriptHashes,
        ],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https://www.google-analytics.com"],
        connectSrc: [
          "'self'",
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com",
          "ws:",
          "wss:",
        ],
        frameSrc: ["'self'", "https://www.googletagmanager.com"],
        workerSrc: ["'self'", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    }
  : false;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: contentSecurityPolicyOptions,
}));
app.use(compression());
app.use(express.json({ limit: config.maxJsonBody }));
app.use(express.urlencoded({ extended: false, limit: config.maxUrlEncodedBody }));
app.use(limiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      logger.debug(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({ err, path: _req.path }, "Unhandled error" );
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // const port = parseInt(process.env.PORT || '5000', 10);
  // server.listen({
  //   port,
  //   host: "0.0.0.0",
  //   reusePort: true,
  // }, () => {
  //   log(`serving on port ${port}`);
  // });
 const port = config.port;
  const host = "0.0.0.0";

  // CRITICAL: Use server.listen() NOT app.listen()
  // The server object includes WebSocket support, app.listen() would break WebSocket
  server.listen(port, host, () => {
    logger.info(`Server listening on http://${host}:${port}`);
    logger.info(`WebSocket available at ws://${host}:${port}/ws`);
  });

})();
