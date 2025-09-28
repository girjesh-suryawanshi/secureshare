import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { MessageSchema, type FileRegistry } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server optimized for large file transfers (Phase 1)
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    maxPayload: 500 * 1024 * 1024, // 500MB max payload for very large files
    perMessageDeflate: false, // Disable compression for faster binary transfer
    clientTracking: true // Enable client tracking for better connection management
  });
  const fileRegistry = new Map<string, FileRegistry>();
  const waitingReceivers = new Map<string, WebSocket[]>(); // Track receivers waiting for files

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
          
          case 'file-chunk-data':
            handleFileChunkData(validatedMessage, ws);
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
        transferType: message.transferType || 'internet', // Use provided transfer type or default to internet
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
      chunks: new Map() as Map<number, string>, // For chunked uploads
      receivedChunks: 0,
      totalChunks: 0,
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

  // Helper function to notify waiting receivers when a file is complete
  function notifyWaitingReceivers(code: string, file: any, registry: FileRegistry) {
    const receivers = waitingReceivers.get(code);
    if (receivers && receivers.length > 0) {
      console.log(`Notifying ${receivers.length} waiting receivers for ${file.fileName}`);
      
      receivers.forEach(receiverWs => {
        try {
          receiverWs.send(JSON.stringify({
            type: 'file-data',
            code,
            fileName: file.fileName,
            data: file.data,
            fileIndex: file.fileIndex,
            totalFiles: registry.totalFiles,
          }));
        } catch (error) {
          console.error('Error notifying receiver:', error);
        }
      });

      // Clear the waiting receivers for this file
      waitingReceivers.delete(code);
    }
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
      } else {
        // If file is not yet complete (chunks still being assembled), track this receiver
        console.log(`File ${file.fileName} not yet complete, adding receiver to waiting list...`);
        
        // Add this WebSocket to the waiting list for this code
        if (!waitingReceivers.has(code)) {
          waitingReceivers.set(code, []);
        }
        const receivers = waitingReceivers.get(code)!;
        if (!receivers.includes(ws)) {
          receivers.push(ws);
        }
      }
    });

    console.log(`Files requested with code: ${code} (${registry.files.length} files)`);
  }

  // Handle optimized chunked file data (much faster!)
  function handleFileChunkData(message: any, ws: WebSocket) {
    const { code, data, fileName, fileIndex, chunkIndex, totalChunks, isLastChunk } = message;
    
    if (!code || !data || fileName === undefined) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Code, data, and fileName are required',
      }));
      return;
    }

    const registry = fileRegistry.get(code);
    if (!registry) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'File registry not found',
      }));
      return;
    }

    // Find the file in the registry (using any to bypass type issues temporarily)
    const file: any = registry.files.find(f => f.fileIndex === (fileIndex || 0));
    if (!file) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'File not found in registry',
      }));
      return;
    }

    // Initialize chunks map if needed
    if (!file.chunks) {
      file.chunks = new Map();
      file.totalChunks = totalChunks;
      file.receivedChunks = 0;
    }

    // Store the chunk
    file.chunks.set(chunkIndex, data);
    file.receivedChunks = (file.receivedChunks || 0) + 1;

    console.log(`Chunk ${chunkIndex}/${totalChunks} received for ${fileName} (${file.receivedChunks}/${file.totalChunks})`);

    // If all chunks received, assemble the file
    if (file.receivedChunks === file.totalChunks) {
      const sortedChunks = Array.from(file.chunks.entries())
        .sort((a: any, b: any) => a[0] - b[0])
        .map((entry: any) => entry[1]);
      
      file.data = sortedChunks.join('');
      delete file.chunks; // Clean up chunks to save memory
      delete file.totalChunks;
      delete file.receivedChunks;
      
      console.log(`File assembled: ${fileName} - ${(file.fileSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Notify the sender that file is stored
      ws.send(JSON.stringify({
        type: 'file-stored',
        code,
        fileIndex: fileIndex,
        fileName: fileName
      }));

      // CRITICAL FIX: Notify all waiting receivers that this file is now available
      notifyWaitingReceivers(code, file, registry);
    }
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
    
    // Find file info to include fileIndex
    const file = registry.files.find(f => f.fileName === fileName);
    ws.send(JSON.stringify({
      type: 'file-stored',
      code,
      fileIndex: file?.fileIndex || 0,
      fileName: fileName
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

  // Local network file sharing endpoints
  app.get("/ping", (_req, res) => {
    res.json({ status: "SecureShare", version: "1.0.0" });
  });

  app.get("/files/:code", (req, res) => {
    const { code } = req.params;
    const registry = fileRegistry.get(code);
    
    if (!registry) {
      return res.status(404).json({ error: "File not found" });
    }

    // Return file metadata and data
    const files = registry.files.map(file => ({
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileType: file.fileType,
      data: file.data,
      fileIndex: file.fileIndex
    }));

    res.json(files);
  });

  // Register files for local network sharing
  app.post("/api/register-local-file", (req, res) => {
    const { code, fileName, fileSize, fileType, data, fileIndex, totalFiles } = req.body;
    
    if (!code || !fileName || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Log file size for debugging large files
    const fileSizeMB = fileSize ? (fileSize / 1024 / 1024).toFixed(2) : 'unknown';
    console.log(`Registering large file: ${fileName} - ${fileSizeMB}MB (${fileIndex + 1}/${totalFiles})`);

    // Get or create file registry entry
    let registry = fileRegistry.get(code);
    if (!registry) {
      registry = {
        code,
        files: [],
        totalFiles: totalFiles || 1,
        createdAt: new Date(),
        transferType: 'local',
        senderWs: null, // No WebSocket for local transfers
      };
      fileRegistry.set(code, registry);
      console.log(`Created new local registry for code: ${code}`);
    }

    // Add file to registry
    const fileData = {
      fileName,
      fileSize,
      fileType,
      data,
      fileIndex: fileIndex || 0,
    };

    registry.files.push(fileData);
    console.log(`Local file registered: ${fileName} with code: ${code} (${registry.files.length}/${totalFiles})`);

    res.json({ success: true, message: "File registered for local sharing" });
  });

  // Register file metadata for chunked upload (large files)
  app.post("/api/register-local-file-meta", (req, res) => {
    const { code, fileName, fileSize, fileType, fileIndex, totalFiles, totalChunks } = req.body;
    
    if (!code || !fileName || !fileSize) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`Registering chunked file metadata: ${fileName} - ${fileSizeMB}MB (${totalChunks} chunks)`);

    // Get or create file registry entry
    let registry = fileRegistry.get(code);
    if (!registry) {
      registry = {
        code,
        files: [],
        totalFiles: totalFiles || 1,
        createdAt: new Date(),
        transferType: 'local',
        senderWs: null,
      };
      fileRegistry.set(code, registry);
      console.log(`Created new local registry for code: ${code}`);
    }

    // Create file entry for chunked upload
    const fileData: any = {
      fileName,
      fileSize,
      fileType,
      data: '', // Will be built from chunks
      fileIndex: fileIndex || 0,
      chunks: new Map<number, string>(), // Store chunks temporarily
      totalChunks,
      receivedChunks: 0,
    };

    registry.files.push(fileData);
    console.log(`File metadata registered: ${fileName} with code: ${code}`);

    res.json({ success: true, message: "File metadata registered for chunked upload" });
  });

  // Upload file chunk
  app.post("/api/upload-local-chunk", (req, res) => {
    const { code, fileIndex, chunkIndex, data, isLastChunk } = req.body;
    
    if (!code || fileIndex === undefined || chunkIndex === undefined || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const registry = fileRegistry.get(code);
    if (!registry) {
      return res.status(404).json({ error: "File registry not found" });
    }

    const file: any = registry.files.find(f => f.fileIndex === fileIndex);
    if (!file || !file.chunks) {
      return res.status(404).json({ error: "File not found in registry" });
    }

    // Store chunk
    file.chunks.set(chunkIndex, data);
    file.receivedChunks = (file.receivedChunks || 0) + 1;

    console.log(`Chunk ${chunkIndex} received for ${file.fileName} (${file.receivedChunks}/${file.totalChunks})`);

    // If all chunks received, assemble the file
    if (file.receivedChunks === file.totalChunks) {
      const sortedChunks = Array.from(file.chunks.entries())
        .sort((a: any, b: any) => a[0] - b[0])
        .map((entry: any) => entry[1]);
      
      file.data = sortedChunks.join('');
      delete file.chunks; // Clean up chunks to save memory
      delete file.totalChunks;
      delete file.receivedChunks;
      
      console.log(`File assembled: ${file.fileName} - ${(file.fileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    res.json({ 
      success: true, 
      message: isLastChunk ? "File upload completed" : "Chunk uploaded successfully",
      progress: Math.round((file.receivedChunks / file.totalChunks) * 100)
    });
  });

  return httpServer;
}
