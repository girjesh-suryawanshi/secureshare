import { z } from "zod";

// WebSocket message types
export const MessageSchema = z.object({
  type: z.enum(['register-file', 'request-file', 'file-available', 'file-data', 'file-not-found', 'file-registered', 'file-stored', 'error']),
  code: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  data: z.string().optional(), // base64 encoded file data
  message: z.string().optional(), // error messages
});

export type Message = z.infer<typeof MessageSchema>;

// File registry for code-based transfers
export interface FileRegistry {
  code: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  data: string; // base64 encoded
  createdAt: Date;
}
