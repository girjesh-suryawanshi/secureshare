import fs from "fs";
import path from "path";
import pino from "pino";
import { config } from "./config";

// Ensure logs directory exists at project root
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

import { createRotatingLogStream } from "./services/logRotator";

const auditFilePath = path.join(logsDir, "audit.log");
const auditStream = createRotatingLogStream(auditFilePath, {
  maxSizeBytes: 5 * 1024 * 1024, // 5 MB per file
  maxFiles: 5,                   // Max 5 rotated files (~25 MB total cap)
  compressOld: true,             // Gzip old logs automatically
});

// Remove old heavy debug log file if it exists to keep workspace clean
const oldLogPath = path.join(logsDir, "secureshare.log");
if (fs.existsSync(oldLogPath)) {
  try {
    fs.unlinkSync(oldLogPath);
  } catch {}
}

// Standard console logger (no debug HTTP dumps to file)
export const logger = pino({
  level: config.logLevel,
  base: undefined,
});

// Dedicated audit logger strictly saving compliance and security events to logs/audit.log
export const auditLogger = pino(
  {
    level: "info",
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "email",
        "firstName",
        "lastName",
        "fileName",
        "oldFileName",
        "newFileName",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
  },
  auditStream
);
