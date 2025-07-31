import { z } from "zod";

// WebSocket message types
export const SignalingMessageSchema = z.object({
  type: z.enum(['offer', 'answer', 'ice-candidate', 'connection-request', 'connection-response', 'error']),
  connectionId: z.string(),
  targetId: z.string().optional(),
  data: z.any().optional(),
});

export const ConnectionRequestSchema = z.object({
  type: z.literal('connection-request'),
  connectionId: z.string(),
  targetId: z.string(),
});

export const FileTransferRequestSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.string(),
  chunks: z.number(),
});

export const FileChunkSchema = z.object({
  fileName: z.string(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  data: z.string(), // base64 encoded
});

export type SignalingMessage = z.infer<typeof SignalingMessageSchema>;
export type ConnectionRequest = z.infer<typeof ConnectionRequestSchema>;
export type FileTransferRequest = z.infer<typeof FileTransferRequestSchema>;
export type FileChunk = z.infer<typeof FileChunkSchema>;

// Connection and transfer states
export interface PeerConnection {
  id: string;
  name: string;
  status: 'connecting' | 'connected' | 'disconnected';
  deviceType: 'desktop' | 'mobile' | 'unknown';
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  direction: 'sending' | 'receiving';
  peerId: string;
  speed?: number;
  timeRemaining?: number;
}

export interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}
