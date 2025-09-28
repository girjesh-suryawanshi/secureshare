import { z } from "zod";

// Transfer types
export type TransferType = 'internet' | 'local';

// WebSocket message types
export const MessageSchema = z.object({
  type: z.enum(['register-file', 'request-file', 'file-available', 'file-data', 'file-chunk-data', 'file-not-found', 'file-registered', 'file-stored', 'download-success', 'download-error', 'download-acknowledgment', 'local-discovery', 'local-offer', 'local-answer', 'error']),
  code: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  data: z.string().optional(), // base64 encoded file data
  chunkIndex: z.number().optional(), // for chunked uploads
  totalChunks: z.number().optional(), // total chunks for file
  isLastChunk: z.boolean().optional(), // is this the last chunk
  message: z.string().optional(), // error messages
  fileIndex: z.number().optional(), // for multiple files
  totalFiles: z.number().optional(), // total number of files
  completedFiles: z.number().optional(), // acknowledgment data
  status: z.string().optional(), // acknowledgment status
  error: z.string().optional(), // error details
  transferType: z.enum(['internet', 'local']).optional(), // transfer method
  localIp: z.string().optional(), // local network IP
  localPort: z.number().optional(), // local network port
  deviceName: z.string().optional(), // device identifier
});

export type Message = z.infer<typeof MessageSchema>;

// File registry for code-based transfers
export interface FileRegistry {
  code: string;
  files: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    data: string; // base64 encoded
    fileIndex: number;
  }>;
  totalFiles: number;
  createdAt: Date;
  transferType: TransferType;
  senderWs?: any; // WebSocket connection of the sender
  localIp?: string; // for local transfers
  localPort?: number; // for local transfers
  deviceName?: string; // device identifier
}

// Local network device discovery
export interface LocalDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  lastSeen: Date;
}
