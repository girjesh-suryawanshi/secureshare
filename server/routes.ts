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
    for (const [code, registry] of registryArray) {
      if (now.getTime() - registry.createdAt.getTime() > 60 * 60 * 1000) { // 1 hour
        fileRegistry.delete(code);
        console.log(`Cleaned up expired files: ${code}`);
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
          
          case 'download-success':
            handleDownloadAck(validatedMessage, 'success');
            break;
          
          case 'download-error':
            handleDownloadAck(validatedMessage, 'error');
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
    const { code, fileName, fileSize, fileType, fileIndex, totalFiles } = message;
    
    if (!code || !fileName || !fileSize || !fileType) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Missing required fields',
      }));
      return;
    }

    console.log(`Registering file: ${fileName} with code: ${code}`);

    // Get or create file registry entry
    let registry = fileRegistry.get(code);
    if (!registry) {
      registry = {
        code,
        files: [],
        totalFiles: totalFiles || 1,
        createdAt: new Date(),
        senderWs: ws, // Store sender's WebSocket connection
      };
      fileRegistry.set(code, registry);
      console.log(`Created new registry for code: ${code}`);
    }

    // Add or update file in registry
    const existingFileIndex = registry.files.findIndex(f => f.fileIndex === (fileIndex || 0));
    const fileData = {
      fileName,
      fileSize,
      fileType,
      data: '', // Will be populated by file-data messages
      fileIndex: fileIndex || 0,
    };

    if (existingFileIndex >= 0) {
      registry.files[existingFileIndex] = fileData;
    } else {
      registry.files.push(fileData);
    }

    console.log(`File registered with code: ${code} - ${fileName} (${fileIndex + 1}/${totalFiles})`);
    
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

    console.log(`File request received for code: ${code}`);
    console.log(`Registry has ${fileRegistry.size} entries:`, Array.from(fileRegistry.keys()));

    const registry = fileRegistry.get(code);
    if (!registry) {
      console.log(`No registry found for code: ${code}`);
      ws.send(JSON.stringify({
        type: 'file-not-found',
        code,
      }));
      return;
    }

    console.log(`Registry found for code: ${code}, files: ${registry.files.length}, totalFiles: ${registry.totalFiles}`);

    // Send file metadata for all files
    registry.files.forEach(file => {
      ws.send(JSON.stringify({
        type: 'file-available',
        code,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        fileIndex: file.fileIndex,
        totalFiles: registry.totalFiles,
      }));

      // If file data is available, send it immediately
      if (file.data) {
        ws.send(JSON.stringify({
          type: 'file-data',
          code,
          fileName: file.fileName,
          data: file.data,
          fileIndex: file.fileIndex,
          totalFiles: registry.totalFiles,
        }));
      }
    });

    console.log(`Files requested with code: ${code} (${registry.files.length} files)`);
  }

  function handleFileData(message: any, ws: WebSocket) {
    const { code, data, fileName, fileIndex } = message;
    
    if (!code || !data) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Code and data are required',
      }));
      return;
    }

    const registry = fileRegistry.get(code);
    if (!registry) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'File not registered',
      }));
      return;
    }

    // Find and update the specific file
    const fileToUpdate = registry.files.find(f => 
      f.fileIndex === (fileIndex || 0) && f.fileName === fileName
    );
    
    if (fileToUpdate) {
      fileToUpdate.data = data;
      console.log(`File data stored for code: ${code} - ${fileName} (${fileIndex + 1}/${registry.totalFiles})`);
    } else {
      console.log(`File not found in registry: ${code} - ${fileName}`);
    }
    
    ws.send(JSON.stringify({
      type: 'file-stored',
      code,
    }));
  }

  function handleDownloadAck(message: any, status: 'success' | 'error') {
    const { code, fileName, totalFiles, completedFiles } = message;
    
    const registry = fileRegistry.get(code);
    if (!registry || !registry.senderWs) {
      return; // No sender to notify
    }

    // Check if sender's WebSocket is still connected
    if (registry.senderWs.readyState === WebSocket.OPEN) {
      registry.senderWs.send(JSON.stringify({
        type: 'download-acknowledgment',
        status,
        code,
        fileName,
        totalFiles,
        completedFiles,
        message: status === 'success' 
          ? `File${totalFiles && totalFiles > 1 ? 's' : ''} downloaded successfully by recipient`
          : `Download failed for ${fileName || 'file'}`
      }));
      
      console.log(`Sent ${status} acknowledgment for code: ${code}`);
    }
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
