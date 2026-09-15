import fs from "fs";
import path from "path";
import { Writable } from "stream";
import zlib from "zlib";

interface RotatorOptions {
  maxSizeBytes?: number; // Default 5 MB per file
  maxFiles?: number;     // Default 5 files (Total cap: ~25 MB)
  compressOld?: boolean; // Compress rotated files with gzip (.gz)
}

/**
 * Creates a stream Writable that automatically rotates log files when reaching maxSizeBytes.
 * Deletes log files exceeding maxFiles to ensure disk space remains bounded.
 */
export class RotatingFileStream extends Writable {
  private filePath: string;
  private maxSizeBytes: number;
  private maxFiles: number;
  private compressOld: boolean;
  private currentSizeBytes: number = 0;
  private writeStream: fs.WriteStream | null = null;

  constructor(filePath: string, options: RotatorOptions = {}) {
    super();
    this.filePath = path.resolve(filePath);
    this.maxSizeBytes = options.maxSizeBytes ?? 5 * 1024 * 1024; // 5 MB
    this.maxFiles = options.maxFiles ?? 5; // 5 files max
    this.compressOld = options.compressOld ?? true;

    this.initStream();
  }

  private initStream() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const stats = fs.statSync(this.filePath);
        this.currentSizeBytes = stats.size;
      } catch {
        this.currentSizeBytes = 0;
      }
    } else {
      this.currentSizeBytes = 0;
    }

    this.writeStream = fs.createWriteStream(this.filePath, { flags: "a" });
  }

  private rotateSync() {
    try {
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      // Purge oldest file if maxFiles reached
      const oldestExt = this.compressOld ? `.log.gz` : `.log`;
      const oldestPath = `${this.filePath}.${this.maxFiles}${oldestExt}`;
      if (fs.existsSync(oldestPath)) {
        try {
          fs.unlinkSync(oldestPath);
        } catch {}
      }

      // Shift existing rotated files down
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const currentExt = this.compressOld && i > 1 ? `.log.gz` : `.log`;
        const nextExt = this.compressOld ? `.log.gz` : `.log`;

        const src = `${this.filePath}.${i}${currentExt}`;
        const dest = `${this.filePath}.${i + 1}${nextExt}`;

        if (fs.existsSync(src)) {
          try {
            fs.renameSync(src, dest);
          } catch {}
        }
      }

      // Rotate current active audit.log to audit.log.1 (or gzip it)
      const targetRotatedPath = `${this.filePath}.1.log`;
      if (fs.existsSync(this.filePath)) {
        fs.renameSync(this.filePath, targetRotatedPath);

        if (this.compressOld) {
          const gzTarget = `${this.filePath}.1.log.gz`;
          try {
            const fileData = fs.readFileSync(targetRotatedPath);
            const compressed = zlib.gzipSync(fileData);
            fs.writeFileSync(gzTarget, compressed);
            fs.unlinkSync(targetRotatedPath);
          } catch {
            // Keep uncompressed if gzip fails
          }
        }
      }
    } catch (err) {
      console.error("[logRotator] Error during log rotation:", err);
    } finally {
      this.initStream();
    }
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);

    if (this.currentSizeBytes + len >= this.maxSizeBytes) {
      this.rotateSync();
    }

    if (this.writeStream) {
      this.writeStream.write(chunk, encoding, (err) => {
        if (!err) {
          this.currentSizeBytes += len;
        }
        callback(err);
      });
    } else {
      callback(new Error("Write stream not initialized"));
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    if (this.writeStream) {
      this.writeStream.end(callback);
    } else {
      callback();
    }
  }
}

export function createRotatingLogStream(filePath: string, options?: RotatorOptions): Writable {
  return new RotatingFileStream(filePath, options);
}
