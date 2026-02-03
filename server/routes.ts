import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { MessageSchema, type FileRegistry, type TransferType } from "@shared/schema";
import { fileStore } from "./storage";
import { config } from "./config";
import { logger } from "./logger";

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_FILE_TYPE = "application/octet-stream";

/** Normalize MIME type; accepts any file type (no blocklist). Empty/unknown → application/octet-stream. */
const normalizeFileType = (fileType?: string | null) => {
  if (!fileType) {
    return DEFAULT_FILE_TYPE;
  }
  const trimmed = fileType.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_FILE_TYPE;
};

/** Normalize share code for consistent lookup (cross-device, different keyboards) */
const normalizeCode = (code: string | undefined | null): string => {
  if (code == null || typeof code !== "string") return "";
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const buildDownloadUrl = (code: string, fileIndex: number) =>
  `/api/files/${code}/${fileIndex}/download`;

type RegistryMap = Map<string, FileRegistry>;

type FileMeta = {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileIndex: number;
  totalChunks?: number;
};

export async function registerRoutes(app: Express): Promise<Server> {
  await fileStore.ensureBaseDir();

  const httpServer = createServer(app);
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    maxPayload: config.wsMaxPayloadBytes,
    perMessageDeflate: false,
  });
  const fileRegistry: RegistryMap = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, registry] of fileRegistry.entries()) {
      if (now - registry.createdAt.getTime() > config.fileTtlMs) {
        logger.info({ code }, "Cleaning up expired transfer");
        void cleanupRegistryEntry(code, registry, fileRegistry);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  httpServer.on("close", () => clearInterval(cleanupInterval));

  wss.on("connection", (ws) => {
    logger.info("Client connected");

    ws.on("message", (raw) => {
      void (async () => {
        try {
          const parsed = JSON.parse(raw.toString());
          const message = MessageSchema.parse(parsed);

          switch (message.type) {
            case "register-file":
              await handleRegisterFile(message, ws);
              break;
            case "request-file":
              await handleRequestFile(message, ws);
              break;
            case "file-data":
              await handleFileData(message, ws);
              break;
            case "download-success":
              handleDownloadAck(message, "success");
              break;
            case "download-error":
              handleDownloadAck(message, "error");
              break;
            default:
              logger.warn({ type: message.type }, "Unknown message type received");
          }
        } catch (error) {
          logger.error({ error }, "Invalid WebSocket message received");
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            }),
          );
        }
      })();
    });

    ws.on("close", () => {
      logger.info("Client disconnected");
      for (const [code, registry] of fileRegistry.entries()) {
        if (registry.senderWs === ws) {
          notifySenderDisconnected(code, registry);
          void cleanupRegistryEntry(code, registry, fileRegistry);
        }
        registry.requesters?.delete(ws);
      }
    });

    ws.on("error", (error) => {
      logger.error({ error }, "WebSocket error");
    });
  });

  async function handleRegisterFile(message: any, ws: WebSocket) {
    const { code: rawCode, fileName: rawFileName, fileSize: rawFileSize, fileType, fileIndex = 0, totalFiles = 1, totalChunks } = message;
    const code = normalizeCode(rawCode);
    const fileSize = typeof rawFileSize === "number" && !Number.isNaN(rawFileSize) ? rawFileSize : 0;
    const fileName = (rawFileName != null && String(rawFileName).trim()) ? String(rawFileName).trim() : `file-${fileIndex}`;

    if (!code) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Missing required fields",
        }),
      );
      return;
    }

    if (fileSize < 0) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid file size",
        }),
      );
      return;
    }

    const registry = getOrCreateRegistry(code, totalFiles, message.transferType || "internet", ws);
    const safeFileType = normalizeFileType(fileType);
    const file = await upsertFileEntry(registry, { fileName, fileSize, fileType: safeFileType, fileIndex, totalChunks });

    if (fileSize === 0) {
      file.completed = true;
      notifyRequestersFileReady(registry, file);
    }

    ws.send(
      JSON.stringify({
        type: "file-registered",
        code,
        fileIndex,
      }),
    );
  }

  async function handleRequestFile(message: any, ws: WebSocket) {
    const code = normalizeCode(message.code);

    if (!code) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Code is required",
        }),
      );
      return;
    }

    const registry = fileRegistry.get(code);
    if (!registry) {
      ws.send(
        JSON.stringify({
          type: "file-not-found",
          code,
        }),
      );
      return;
    }

    if (!registry.requesters) {
      registry.requesters = new Set();
    }
    registry.requesters.add(ws);

    for (const file of registry.files) {
      ws.send(
        JSON.stringify({
          type: "file-available",
          code,
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileType: file.fileType,
          fileIndex: file.fileIndex,
          totalFiles: registry.totalFiles,
          isReady: file.completed,
          downloadUrl: file.completed ? buildDownloadUrl(code, file.fileIndex) : undefined,
          receivedBytes: file.receivedBytes,
        }),
      );
    }
  }

  async function handleFileData(message: any, ws: WebSocket) {
    const { data, fileName, fileIndex = 0, isLastChunk } = message;
    const code = normalizeCode(message.code);

    if (!code || !data || !fileName) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Code, fileName and data are required",
        }),
      );
      return;
    }

    const registry = fileRegistry.get(code);
    if (!registry) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "File not registered",
        }),
      );
      return;
    }

    const fileNameNorm = (fileName || "").toLowerCase();
    const file = registry.files.find(
      (f) => f.fileIndex === fileIndex && (f.fileName === fileName || f.fileName.toLowerCase() === fileNameNorm)
    );
    if (!file) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "File metadata missing",
        }),
      );
      return;
    }

    const bytesWritten = await fileStore.appendBase64Chunk(file.filePath, data);
    file.receivedBytes += bytesWritten;

    if (isLastChunk || file.receivedBytes >= file.fileSize) {
      file.completed = true;
      notifyRequestersFileReady(registry, file);
    }

    ws.send(
      JSON.stringify({
        type: "file-stored",
        code,
        fileIndex,
      }),
    );
  }

  function handleDownloadAck(message: any, status: "success" | "error") {
    const { fileName, totalFiles, completedFiles } = message;
    const code = normalizeCode(message.code);
    const registry = fileRegistry.get(code);

    if (!registry || !registry.senderWs || registry.senderWs.readyState !== WebSocket.OPEN) {
      return;
    }

    registry.senderWs.send(
      JSON.stringify({
        type: "download-acknowledgment",
        status,
        code,
        fileName,
        totalFiles,
        completedFiles,
        message:
          status === "success"
            ? `File${totalFiles && totalFiles > 1 ? "s" : ""} downloaded successfully`
            : `Download failed for ${fileName || "file"}`,
      }),
    );
  }

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      activeFiles: fileRegistry.size,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/ping", (_req, res) => {
    res.json({ status: "SecureShare", version: "1.0.0" });
  });

  app.get("/files/:code", (req, res) => {
    const code = normalizeCode(req.params.code);
    const registry = fileRegistry.get(code);

    if (!registry) {
      return res.status(404).json({ error: "File not found" });
    }

    const files = registry.files.map((file) => ({
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileType: file.fileType,
      fileIndex: file.fileIndex,
      isReady: file.completed,
      downloadUrl: file.completed ? buildDownloadUrl(code, file.fileIndex) : undefined,
    }));

    res.json({ code, files });
  });

  app.get("/api/files/:code/:fileIndex/download", async (req, res) => {
    const code = normalizeCode(req.params.code);
    const fileIndex = req.params.fileIndex;
    const registry = fileRegistry.get(code);

    if (!registry) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = registry.files.find((f) => f.fileIndex === Number(fileIndex));
    if (!file || !file.completed) {
      return res.status(404).json({ error: "File not ready" });
    }

    res.setHeader("Content-Type", file.fileType || "application/octet-stream");
    res.setHeader("Content-Length", file.fileSize.toString());
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );

    const stream = fileStore.createReadStream(file.filePath);
    stream.on("error", (error) => {
      logger.error({ error }, "Download stream failed");
      res.status(500).end();
    });
    stream.pipe(res);
  });

  app.post("/api/register-local-file", async (req, res) => {
    const { code: rawCode, fileName, fileSize, fileType, data, fileIndex = 0, totalFiles = 1 } = req.body;
    const code = normalizeCode(rawCode);

    if (!code || !fileName || typeof fileSize !== "number" || fileSize <= 0 || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const registry = getOrCreateRegistry(code, totalFiles, "local");
    const safeFileType = normalizeFileType(fileType);
    const file = await upsertFileEntry(registry, { fileName, fileSize, fileType: safeFileType, fileIndex });
    const bytesWritten = await fileStore.appendBase64Chunk(file.filePath, data);
    file.receivedBytes += bytesWritten;
    file.completed = true;
    notifyRequestersFileReady(registry, file);

    res.json({ success: true, downloadUrl: buildDownloadUrl(code, fileIndex) });
  });

  app.post("/api/register-local-file-meta", async (req, res) => {
    const { code: rawCode, fileName, fileSize, fileType, fileIndex = 0, totalFiles = 1, totalChunks } = req.body;
    const code = normalizeCode(rawCode);

    if (!code || !fileName || typeof fileSize !== "number" || fileSize <= 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const registry = getOrCreateRegistry(code, totalFiles, "local");
    const safeFileType = normalizeFileType(fileType);
    await upsertFileEntry(registry, { fileName, fileSize, fileType: safeFileType, fileIndex, totalChunks });

    res.json({ success: true, message: "Metadata registered" });
  });

  app.post("/api/upload-local-chunk", async (req, res) => {
    const { code: rawCode, fileIndex = 0, data, isLastChunk } = req.body;
    const code = normalizeCode(rawCode);

    if (!code || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const registry = fileRegistry.get(code);
    if (!registry) {
      return res.status(404).json({ error: "File registry not found" });
    }

    const file = registry.files.find((f) => f.fileIndex === fileIndex);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const bytesWritten = await fileStore.appendBase64Chunk(file.filePath, data);
    file.receivedBytes += bytesWritten;

    if (isLastChunk || file.receivedBytes >= file.fileSize) {
      file.completed = true;
      notifyRequestersFileReady(registry, file);
    }

    const progress = Math.round((file.receivedBytes / file.fileSize) * 100);
    res.json({ success: true, progress });
  });

  async function cleanupRegistryEntry(code: string, registry: FileRegistry, registryMap: RegistryMap) {
    for (const file of registry.files) {
      await fileStore.deleteFile(file.filePath);
    }
    await fileStore.deleteCodeFolder(code);
    registryMap.delete(code);
  }

  function notifyRequestersFileReady(registry: FileRegistry, file: FileRegistry["files"][number]) {
    if (!registry.requesters) {
      return;
    }

    const payload = JSON.stringify({
      type: "file-ready",
      code: registry.code,
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileType: file.fileType,
      fileIndex: file.fileIndex,
      totalFiles: registry.totalFiles,
      downloadUrl: buildDownloadUrl(registry.code, file.fileIndex),
      isReady: true,
    });

    registry.requesters.forEach((requester) => {
      if (requester.readyState === WebSocket.OPEN) {
        requester.send(payload);
      }
    });
  }

  function notifySenderDisconnected(code: string, registry: FileRegistry) {
    if (!registry.requesters || registry.requesters.size === 0) {
      return;
    }

    const payload = JSON.stringify({
      type: "sender-disconnected",
      code,
      message: "Sender disconnected. Please request the files again.",
    });

    registry.requesters.forEach((requester) => {
      if (requester.readyState === WebSocket.OPEN) {
        requester.send(payload);
      }
    });
  }

  function getOrCreateRegistry(code: string, totalFiles: number, transferType: TransferType, senderWs?: WebSocket | null) {
    let registry = fileRegistry.get(code);

    if (!registry) {
      registry = {
        code,
        files: [],
        totalFiles,
        createdAt: new Date(),
        transferType,
        senderWs: senderWs ?? null,
        requesters: new Set<WebSocket>(),
      };
      fileRegistry.set(code, registry);
      return registry;
    }

    registry.totalFiles = Math.max(registry.totalFiles, totalFiles);
    if (senderWs) {
      registry.senderWs = senderWs;
    }

    if (!registry.requesters) {
      registry.requesters = new Set<WebSocket>();
    }

    return registry;
  }

  async function upsertFileEntry(registry: FileRegistry, meta: FileMeta) {
    let file = registry.files.find((f) => f.fileIndex === meta.fileIndex);

    if (!file) {
      const filePath = await fileStore.prepareFilePath(registry.code, meta.fileIndex, meta.fileName);
      file = {
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        fileType: meta.fileType,
        fileIndex: meta.fileIndex,
        filePath,
        receivedBytes: 0,
        completed: false,
        totalChunks: meta.totalChunks,
      };
      registry.files.push(file);
      return file;
    }

    await fileStore.deleteFile(file.filePath);
    file.filePath = await fileStore.prepareFilePath(registry.code, meta.fileIndex, meta.fileName);
    file.fileName = meta.fileName;
    file.fileSize = meta.fileSize;
    file.fileType = meta.fileType;
    file.receivedBytes = 0;
    file.completed = false;
    file.totalChunks = meta.totalChunks;
    return file;
  }

  return httpServer;
}
