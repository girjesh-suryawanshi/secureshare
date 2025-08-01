// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer } from "ws";

// shared/schema.ts
import { z } from "zod";
var MessageSchema = z.object({
  type: z.enum(["register-file", "request-file", "file-available", "file-data", "file-not-found", "file-registered", "file-stored", "error"]),
  code: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  data: z.string().optional(),
  // base64 encoded file data
  message: z.string().optional(),
  // error messages
  fileIndex: z.number().optional(),
  // for multiple files
  totalFiles: z.number().optional()
  // total number of files
});

// server/routes.ts
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const fileRegistry = /* @__PURE__ */ new Map();
  setInterval(() => {
    const now = /* @__PURE__ */ new Date();
    const registryArray = Array.from(fileRegistry.entries());
    for (const [code, registry] of registryArray) {
      if (now.getTime() - registry.createdAt.getTime() > 60 * 60 * 1e3) {
        fileRegistry.delete(code);
        console.log(`Cleaned up expired files: ${code}`);
      }
    }
  }, 10 * 60 * 1e3);
  wss.on("connection", (ws) => {
    console.log("Client connected");
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        const validatedMessage = MessageSchema.parse(message);
        switch (validatedMessage.type) {
          case "register-file":
            handleRegisterFile(validatedMessage, ws);
            break;
          case "request-file":
            handleRequestFile(validatedMessage, ws);
            break;
          case "file-data":
            handleFileData(validatedMessage, ws);
            break;
          default:
            console.log("Unknown message type:", validatedMessage.type);
        }
      } catch (error) {
        console.error("Invalid message received:", error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Invalid message format"
        }));
      }
    });
    ws.on("close", () => {
      console.log("Client disconnected");
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
  function handleRegisterFile(message, ws) {
    const { code, fileName, fileSize, fileType, fileIndex, totalFiles } = message;
    if (!code || !fileName || !fileSize || !fileType) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Missing required fields"
      }));
      return;
    }
    let registry = fileRegistry.get(code);
    if (!registry) {
      registry = {
        code,
        files: [],
        totalFiles: totalFiles || 1,
        createdAt: /* @__PURE__ */ new Date()
      };
      fileRegistry.set(code, registry);
    }
    const existingFileIndex = registry.files.findIndex((f) => f.fileIndex === (fileIndex || 0));
    const fileData = {
      fileName,
      fileSize,
      fileType,
      data: "",
      // Will be populated by file-data messages
      fileIndex: fileIndex || 0
    };
    if (existingFileIndex >= 0) {
      registry.files[existingFileIndex] = fileData;
    } else {
      registry.files.push(fileData);
    }
    console.log(`File registered with code: ${code} - ${fileName} (${fileIndex + 1}/${totalFiles})`);
    ws.send(JSON.stringify({
      type: "file-registered",
      code
    }));
  }
  function handleRequestFile(message, ws) {
    const { code } = message;
    if (!code) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Code is required"
      }));
      return;
    }
    const registry = fileRegistry.get(code);
    if (!registry) {
      ws.send(JSON.stringify({
        type: "file-not-found",
        code
      }));
      return;
    }
    registry.files.forEach((file) => {
      ws.send(JSON.stringify({
        type: "file-available",
        code,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        fileIndex: file.fileIndex,
        totalFiles: registry.totalFiles
      }));
      if (file.data) {
        ws.send(JSON.stringify({
          type: "file-data",
          code,
          fileName: file.fileName,
          data: file.data,
          fileIndex: file.fileIndex,
          totalFiles: registry.totalFiles
        }));
      }
    });
    console.log(`Files requested with code: ${code} (${registry.files.length} files)`);
  }
  function handleFileData(message, ws) {
    const { code, data, fileName, fileIndex } = message;
    if (!code || !data) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Code and data are required"
      }));
      return;
    }
    const registry = fileRegistry.get(code);
    if (!registry) {
      ws.send(JSON.stringify({
        type: "error",
        message: "File not registered"
      }));
      return;
    }
    const fileToUpdate = registry.files.find(
      (f) => f.fileIndex === (fileIndex || 0) && f.fileName === fileName
    );
    if (fileToUpdate) {
      fileToUpdate.data = data;
      console.log(`File data stored for code: ${code} - ${fileName} (${fileIndex + 1}/${registry.totalFiles})`);
    } else {
      console.log(`File not found in registry: ${code} - ${fileName}`);
    }
    ws.send(JSON.stringify({
      type: "file-stored",
      code
    }));
  }
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      activeFiles: fileRegistry.size,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
