declare module "compression" {
  import { RequestHandler } from "express";
  function compression(options?: compression.CompressionOptions): RequestHandler;
  namespace compression {
    interface CompressionOptions {
      level?: number;
      threshold?: number | string;
      chunkSize?: number;
      memLevel?: number;
      filter?: (req: unknown, res: unknown) => boolean;
    }
  }
  export = compression;
}
