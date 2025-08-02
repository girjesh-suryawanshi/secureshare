import { z } from "zod";

// WebSocket message types
export const MessageSchema = z.object({
  type: z.enum(['register-file', 'request-file', 'file-available', 'file-data', 'file-not-found', 'file-registered', 'file-stored', 'download-success', 'download-error', 'download-acknowledgment', 'error']),
  code: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  data: z.string().optional(), // base64 encoded file data
  message: z.string().optional(), // error messages
  fileIndex: z.number().optional(), // for multiple files
  totalFiles: z.number().optional(), // total number of files
  completedFiles: z.number().optional(), // acknowledgment data
  status: z.string().optional(), // acknowledgment status
  error: z.string().optional(), // error details
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
  senderWs?: any; // WebSocket connection of the sender
}
