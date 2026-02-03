import { promises as fs } from "fs";
import { createReadStream } from "fs";
import path from "path";
import os from "os";
import type { ReadStream } from "fs";
import { config } from "./config";

/** Sanitize filename for disk; preserves all extensions (e.g. .heic, .docx). */
const sanitize = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

export class FileDiskStore {
  private baseDir: string;

  constructor() {
    this.baseDir = config.uploadDir
      ? path.resolve(config.uploadDir)
      : path.join(os.tmpdir(), "secureshare");
  }

  async ensureBaseDir() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async prepareFilePath(code: string, fileIndex: number, originalName: string) {
    await this.ensureBaseDir();
    const safeName = sanitize(originalName || "file");
    const codeDir = path.join(this.baseDir, code);
    await fs.mkdir(codeDir, { recursive: true });
    const filePath = path.join(codeDir, `${fileIndex}-${Date.now()}-${safeName}`);
    await fs.writeFile(filePath, "");
    return filePath;
  }

  async appendBase64Chunk(filePath: string, base64Chunk: string) {
    const buffer = Buffer.from(base64Chunk, "base64");
    await fs.appendFile(filePath, buffer);
    return buffer.length;
  }

  createReadStream(filePath: string): ReadStream {
    return createReadStream(filePath);
  }

  async deleteFile(filePath: string) {
    await fs.rm(filePath, { force: true });
  }

  async deleteCodeFolder(code: string) {
    const codeDir = path.join(this.baseDir, code);
    await fs.rm(codeDir, { recursive: true, force: true });
  }
}

export const fileStore = new FileDiskStore();
