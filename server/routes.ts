import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { MessageSchema, type FileRegistry } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for file sharing
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const fileRegistry = new Map<string, FileRegistry>();

  // Clean up old files every 10 minutes (files expire after 1 hour)
  setInterval(() => {
    const now = new Date();
    const registryArray = Array.from(fileRegistry.entries());
    for (const [code, fileData] of registryArray) {
      if (now.getTime() - fileData.createdAt.getTime() > 60 * 60 * 1000) { // 1 hour
        fileRegistry.delete(code);
        console.log(`Cleaned up expired file: ${code}`);
      }
    }
  }, 10 * 60 * 1000);

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        const validatedMessage = MessageSchema.parse(message);

        switch (validatedMessage.type) {
          case 'register-file':
            handleRegisterFile(validatedMessage, ws);
            break;
          
          case 'request-file':
            handleRequestFile(validatedMessage, ws);
            break;
          
          case 'file-data':
            handleFileData(validatedMessage, ws);
            break;
          
          default:
            console.log('Unknown message type:', validatedMessage.type);
        }
      } catch (error) {
        console.error('Invalid message received:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  function handleRegisterFile(message: any, ws: WebSocket) {
    const { code, fileName, fileSize, fileType } = message;
    
    if (!code || !fileName || !fileSize || !fileType) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Missing required fields',
      }));
      return;
    }

    // Store file metadata (actual file data will come in chunks)
    fileRegistry.set(code, {
      code,
      fileName,
      fileSize,
      fileType,
      data: '', // Will be populated by file-data messages
      createdAt: new Date(),
    });

    console.log(`File registered with code: ${code} - ${fileName}`);
    
    ws.send(JSON.stringify({
      type: 'file-registered',
      code,
    }));
  }

  function handleRequestFile(message: any, ws: WebSocket) {
    const { code } = message;
    
    if (!code) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Code is required',
      }));
      return;
    }

    const fileData = fileRegistry.get(code);
    if (!fileData) {
      ws.send(JSON.stringify({
        type: 'file-not-found',
        code,
      }));
      return;
    }

    // Send file metadata first
    ws.send(JSON.stringify({
      type: 'file-available',
      code,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
    }));

    // If file data is available, send it immediately
    if (fileData.data) {
      ws.send(JSON.stringify({
        type: 'file-data',
        code,
        fileName: fileData.fileName,
        data: fileData.data,
      }));
    }

    console.log(`File requested with code: ${code}`);
  }

  function handleFileData(message: any, ws: WebSocket) {
    const { code, data } = message;
    
    if (!code || !data) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Code and data are required',
      }));
      return;
    }

    const fileData = fileRegistry.get(code);
    if (!fileData) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'File not registered',
      }));
      return;
    }

    // Store the file data
    fileData.data = data;
    fileRegistry.set(code, fileData);

    console.log(`File data stored for code: ${code}`);
    
    ws.send(JSON.stringify({
      type: 'file-stored',
      code,
    }));
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      activeFiles: fileRegistry.size,
      timestamp: new Date().toISOString(),
    });
  });

  return httpServer;
}
