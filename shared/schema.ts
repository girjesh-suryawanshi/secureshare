import { z } from "zod";

// Transfer types
export type TransferType = 'internet' | 'local';

// WebSocket message types
export const MessageSchema = z.object({
  type: z.enum([
    'register-file',
    'request-file',
    'file-available',
    'file-data',
    'file-ready',
    'file-not-found',
    'file-registered',
    'file-stored',
    'download-success',
    'download-error',
    'download-acknowledgment',
    'local-discovery',
    'local-offer',
    'local-answer',
    'sender-disconnected',
    'error'
  ]),
  code: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  data: z.string().optional(), // base64 encoded file data
  message: z.string().optional(), // error messages
  fileIndex: z.number().optional(), // for multiple files
  totalFiles: z.number().optional(), // total number of files
  totalChunks: z.number().optional(),
  chunkIndex: z.number().optional(),
  chunkSize: z.number().optional(),
  isLastChunk: z.boolean().optional(),
  completedFiles: z.number().optional(), // acknowledgment data
  status: z.string().optional(), // acknowledgment status
  error: z.string().optional(), // error details
  transferType: z.enum(['internet', 'local']).optional(), // transfer method
  localIp: z.string().optional(), // local network IP
  localPort: z.number().optional(), // local network port
  deviceName: z.string().optional(), // device identifier
  downloadUrl: z.string().optional(),
  isReady: z.boolean().optional(),
  receivedBytes: z.number().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// File registry for code-based transfers
export interface FileRegistry {
  code: string;
  files: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    fileIndex: number;
    filePath: string;
    receivedBytes: number;
    completed: boolean;
    totalChunks?: number;
  }>;
  totalFiles: number;
  createdAt: Date;
  transferType: TransferType;
  senderWs?: any; // WebSocket connection of the sender
  requesters?: Set<any>; // WebSocket connections of requesters waiting for files
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

// WebRTC / P2P file transfer types
export interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

export interface FileTransferRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
  chunks: number;
}

export interface FileChunk {
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  data: string;
}

export interface PeerConnection {
  id: string;
  name?: string;
  deviceType?: string;
  status?: 'connected' | 'connecting' | 'disconnected';
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'active' | 'pending' | 'completed' | 'failed';
  progress?: number;
  direction?: 'sending' | 'receiving';
  peerId?: string;
  timeRemaining?: number;
  speed?: number;
}
