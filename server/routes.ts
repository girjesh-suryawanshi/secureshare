import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { MessageSchema, type FileRegistry } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for file sharing with increased payload limits
  // IMPORTANT: Base64 encoding adds 33% overhead, so actual file limit is ~375MB
  // 500MB / 1.33 (base64 overhead) ≈ 375MB max uncompressed file size
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    maxPayload: 500 * 1024 * 1024, // 500MB max payload (accounts for large videos with base64 encoding)
    perMessageDeflate: false // Disable compression for faster transfer
  });
  const fileRegistry = new Map<string, FileRegistry>();

  // Clean up old files every 5 minutes (files expire after 1 hour)
  setInterval(() => {
    const now = new Date();
    const registryArray = Array.from(fileRegistry.entries());
    let cleanedCount = 0;
    const expiryTime = 60 * 60 * 1000; // 1 hour
    
    for (const [code, registry] of registryArray) {
      const ageMs = now.getTime() - registry.createdAt.getTime();
      if (ageMs > expiryTime) {
        fileRegistry.delete(code);
        const ageMin = Math.round(ageMs / 1000 / 60);
        console.log(`[Cleanup] 🗑️  Deleted expired code ${code} (age: ${ageMin} minutes)`);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[Cleanup] ✅ Cleaned up ${cleanedCount} expired registries. Current codes: ${fileRegistry.size}`);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes instead of 10

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
      // Find and notify any receivers waiting for files from this sender
      for (const [code, registry] of Array.from(fileRegistry.entries())) {
        if (registry.senderWs === ws) {
          console.log(`Sender disconnected for code: ${code}`);
          // Notify all receivers waiting for this code
          if (registry.requesters && registry.requesters.length > 0) {
            registry.requesters.forEach((requesterWs: any) => {
              if (requesterWs.readyState === WebSocket.OPEN) {
                requesterWs.send(JSON.stringify({
                  type: 'sender-disconnected',
                  code: code,
                  message: 'The sender has disconnected. Please try requesting the files again.'
                }));
                console.log(`Notified receiver of sender disconnection for code: ${code}`);
              }
            });
          }
          // Clean up the registry entry since sender is gone
          fileRegistry.delete(code);
          console.log(`Cleaned up registry for disconnected sender: ${code}`);
        }
      }
    });

    ws.on('error', (error: any) => {
      console.error('[WebSocket] ❌ Error:', error.message || error);
      
      // Log specific error types for debugging
      if (error.message?.includes('payload')) {
        console.error('[WebSocket] This may be a payload size error. Consider implementing chunked uploads for very large files.');
      }
      if (error.message?.includes('ECONNRESET') || error.message?.includes('EPIPE')) {
        console.error('[WebSocket] Connection reset - likely due to oversized message or network issue');
      }
    });
  });

  function handleRegisterFile(message: any, ws: WebSocket) {
    const { code, fileName, fileSize, fileType, fileIndex, totalFiles } = message;
    
    if (!code || !fileName || !fileSize || !fileType) {
      console.error('[Register] Invalid register-file message: missing required fields');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Missing required fields',
      }));
      return;
    }

    // CRITICAL: Normalize code to uppercase for consistency
    const upperCode = code.toUpperCase();
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`[Register] 📝 Registering: "${fileName}" (${fileSizeMB}MB) - File ${fileIndex + 1}/${totalFiles} - Code: ${upperCode}`);

    // Get or create file registry entry
    let registry = fileRegistry.get(upperCode);
    if (!registry) {
      registry = {
        code: upperCode,
        files: [],
        totalFiles: totalFiles || 1,
        createdAt: new Date(),
        transferType: message.transferType || 'internet',
        senderWs: ws,
      };
      fileRegistry.set(upperCode, registry);
      console.log(`[Register] 🆕 Created registry for code: ${upperCode} (expecting ${totalFiles} files)`);
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
      console.log(`[Register] 🔄 Updated file at index ${fileIndex}`);
    } else {
      registry.files.push(fileData);
      console.log(`[Register] ➕ Added file ${registry.files.length}/${registry.totalFiles}`);
    }

    console.log(`[Register] ✅ File "${fileName}" registered for code: ${upperCode}`);
    
    ws.send(JSON.stringify({
      type: 'file-registered',
      code: upperCode,
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

    const upperCode = code.toUpperCase();
    console.log(`[Request] 🔍 File request received for code: ${upperCode}`);
    console.log(`[Request] 📊 Registry status: ${fileRegistry.size} active code(s)`);
    
    if (fileRegistry.size > 0) {
      console.log(`[Request] 📋 Available codes:`, Array.from(fileRegistry.keys()).join(', '));
    } else {
      console.log(`[Request] ⚠️  Registry is empty - no active file shares`);
    }

    const registry = fileRegistry.get(upperCode);
    if (!registry) {
      const now = new Date();
      let errorReason = 'Code not found';
      const availableCodes = Array.from(fileRegistry.keys());
      
      // Check if maybe code exists with different case
      const caseInsensitiveMatch = availableCodes.find(c => c.toLowerCase() === upperCode.toLowerCase());
      
      if (caseInsensitiveMatch) {
        errorReason = `Use code: ${caseInsensitiveMatch} (case mismatch)`;
        console.log(`[Request] ⚠️  Case mismatch! Code ${upperCode} exists as ${caseInsensitiveMatch}`);
      } else {
        console.log(`[Request] ❌ No registry found for code: ${upperCode}`);
        console.log(`[Request] 💡 Possible reasons:`);
        console.log(`[Request]    1. Code expired (>1 hour old)`);
        console.log(`[Request]    2. Sender hasn't finished registering files yet`);
        console.log(`[Request]    3. Wrong code entered`);
        console.log(`[Request]    4. Server restarted`);
      }
      
      ws.send(JSON.stringify({
        type: 'file-not-found',
        code: upperCode,
        message: errorReason,
        availableCodes: availableCodes,
        timestamp: now.toISOString(),
      }));
      return;
    }

    console.log(`[Request] 📋 Registry found for code: ${code}`);
    console.log(`[Request] Expected: ${registry.totalFiles} files, Have: ${registry.files.length} files`);
    registry.files.forEach((f, i) => {
      console.log(`[Request]   File ${i}: "${f.fileName}" - Has data: ${f.data && f.data.length > 0 ? '✅' : '❌'}`);
    });

    // Store the requester's WebSocket for sending data when files arrive
    if (!registry.requesters) {
      registry.requesters = [];
    }
    registry.requesters.push(ws);

    // Wait for all files to be fully registered and have data
    // This handles timing issues where register-file arrives but file-data hasn't yet
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait (100ms * 50) - increased for multiple files
    
    const checkAndSendFiles = () => {
      attempts++;
      let allFilesReady = false;
      let filesWithData = 0;
      
      // Count files that have data
      registry.files.forEach(file => {
        if (file.data && file.data.length > 0) {
          filesWithData++;
        }
      });

      // Check conditions:
      // 1. Expected number of files registered
      // 2. All files have data
      if (registry.files.length > 0 && registry.files.length === registry.totalFiles) {
        allFilesReady = registry.files.every(file => file.data && file.data.length > 0);
      }

      if (allFilesReady) {
        // All files are ready, send them
        console.log(`[Request] ✅ All ${registry.files.length} files ready! Sending to requester...`);
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

          // Send file data immediately
          ws.send(JSON.stringify({
            type: 'file-data',
            code,
            fileName: file.fileName,
            data: file.data,
            fileIndex: file.fileIndex,
            totalFiles: registry.totalFiles,
          }));
        });
        console.log(`[Request] ✅ Files sent with code: ${code} (${registry.files.length} files)`);
      } else if (attempts < maxAttempts) {
        // Files not ready yet, try again in 100ms
        console.log(`[Request] ⏳ Attempt ${attempts}/${maxAttempts}: Have ${registry.files.length}/${registry.totalFiles} files registered, ${filesWithData}/${registry.files.length} with data`);
        setTimeout(checkAndSendFiles, 100);
      } else {
        // Timeout - send whatever is available
        console.warn(`[Request] ⚠️ Timeout after 5 seconds. Have ${registry.files.length}/${registry.totalFiles} files, ${filesWithData} with data`);
        if (filesWithData > 0) {
          // Send files that have data
          console.log(`[Request] 📤 Sending ${filesWithData} files that are ready...`);
          registry.files.forEach(file => {
            if (file.data && file.data.length > 0) {
              ws.send(JSON.stringify({
                type: 'file-available',
                code,
                fileName: file.fileName,
                fileSize: file.fileSize,
                fileType: file.fileType,
                fileIndex: file.fileIndex,
                totalFiles: registry.totalFiles,
              }));

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
        } else {
          ws.send(JSON.stringify({
            type: 'file-not-found',
            code,
            message: 'Files were registered but data not received yet. Please wait and try again.'
          }));
        }
      }
    };

    checkAndSendFiles();
  }

  function handleFileData(message: any, ws: WebSocket) {
    const { code, data, fileName, fileIndex } = message;
    
    if (!code || !data) {
      console.error('[FileData] Invalid file-data message: missing code or data');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Code and data are required',
      }));
      return;
    }
    
    // Warn if data is suspiciously large (indicates base64-encoded large file)
    // This helps diagnose video file issues
    if (data.length > 300 * 1024 * 1024) {
      const approximateOriginalSize = Math.round((data.length / 1.33) / 1024 / 1024);
      console.warn(`[FileData] ⚠️  Very large file data received: ${(data.length / 1024 / 1024).toFixed(1)}MB (base64 encoded, ~${approximateOriginalSize}MB original)`);
    }

    // Normalize code to uppercase for consistency
    const upperCode = code.toUpperCase();
    const registry = fileRegistry.get(upperCode);
    if (!registry) {
      console.error(`[FileData] ❌ No registry found for code: ${upperCode} when handling file-data`);
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
      const fileSizeMB = (data.length / 1024 / 1024).toFixed(2);
      console.log(`[FileData] ✅ Stored: "${fileName}" (${fileSizeMB}MB) - File ${fileIndex + 1}/${registry.totalFiles}`);
      
      // Send file data to any pending requesters
      if (registry.requesters && registry.requesters.length > 0) {
        registry.requesters.forEach((requesterWs: any) => {
          if (requesterWs.readyState === WebSocket.OPEN) {
            requesterWs.send(JSON.stringify({
              type: 'file-data',
              code: upperCode,
              fileName: fileToUpdate.fileName,
              data: fileToUpdate.data,
              fileIndex: fileToUpdate.fileIndex,
              totalFiles: registry.totalFiles,
            }));
            console.log(`[FileData] 📤 Sent late-arriving file to requester: "${fileName}"`);
          }
        });
      }
    } else {
      console.warn(`[FileData] ❌ File not found in registry for code: ${upperCode}`);
      console.warn(`[FileData] Looking for: "${fileName}" [index ${fileIndex}]`);
      console.warn(`[FileData] Available files:`, registry.files.map(f => `"${f.fileName}"[${f.fileIndex}]`).join(', '));
    }
    
    ws.send(JSON.stringify({
      type: 'file-stored',
      code: upperCode,
    }));
  }

  function handleDownloadAck(message: any, status: 'success' | 'error') {
    const { code, fileName, totalFiles, completedFiles } = message;
    
    // Normalize code to uppercase for consistency
    const upperCode = code.toUpperCase();
    const registry = fileRegistry.get(upperCode);
    if (!registry || !registry.senderWs) {
      return; // No sender to notify
    }

    // Check if sender's WebSocket is still connected
    if (registry.senderWs.readyState === WebSocket.OPEN) {
      registry.senderWs.send(JSON.stringify({
        type: 'download-acknowledgment',
        status,
        code: upperCode,
        fileName,
        totalFiles,
        completedFiles,
        message: status === 'success' 
          ? `File${totalFiles && totalFiles > 1 ? 's' : ''} downloaded successfully by recipient`
          : `Download failed for ${fileName || 'file'}`
      }));
      
      console.log(`Sent ${status} acknowledgment for code: ${upperCode}`);
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
    
    // Normalize code to uppercase for consistency
    const upperCode = code.toUpperCase();
    const registry = fileRegistry.get(upperCode);
    
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

    // Normalize code to uppercase for consistency
    const upperCode = code.toUpperCase();

    // Log file size for debugging large files
    const fileSizeMB = fileSize ? (fileSize / 1024 / 1024).toFixed(2) : 'unknown';
    console.log(`Registering large file: ${fileName} - ${fileSizeMB}MB (${fileIndex + 1}/${totalFiles})`);

    // Get or create file registry entry
    let registry = fileRegistry.get(upperCode);
    if (!registry) {
      registry = {
        code: upperCode,
        files: [],
        totalFiles: totalFiles || 1,
        createdAt: new Date(),
        transferType: 'local',
        senderWs: null, // No WebSocket for local transfers
      };
      fileRegistry.set(upperCode, registry);
      console.log(`Created new local registry for code: ${upperCode}`);
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
    console.log(`Local file registered: ${fileName} with code: ${upperCode} (${registry.files.length}/${totalFiles})`);

    res.json({ success: true, message: "File registered for local sharing" });
  });

  // Register file metadata for chunked upload (large files)
  app.post("/api/register-local-file-meta", (req, res) => {
    const { code, fileName, fileSize, fileType, fileIndex, totalFiles, totalChunks } = req.body;
    
    if (!code || !fileName || !fileSize) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Normalize code to uppercase for consistency
    const upperCode = code.toUpperCase();

    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`Registering chunked file metadata: ${fileName} - ${fileSizeMB}MB (${totalChunks} chunks)`);

    // Get or create file registry entry
    let registry = fileRegistry.get(upperCode);
    if (!registry) {
      registry = {
        code: upperCode,
        files: [],
        totalFiles: totalFiles || 1,
        createdAt: new Date(),
        transferType: 'local',
        senderWs: null,
      };
      fileRegistry.set(upperCode, registry);
      console.log(`Created new local registry for code: ${upperCode}`);
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
    console.log(`File metadata registered: ${fileName} with code: ${upperCode}`);

    res.json({ success: true, message: "File metadata registered for chunked upload" });
  });

  // Upload file chunk
  app.post("/api/upload-local-chunk", (req, res) => {
    const { code, fileIndex, chunkIndex, data, isLastChunk } = req.body;
    
    if (!code || fileIndex === undefined || chunkIndex === undefined || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Normalize code to uppercase for consistency
    const upperCode = code.toUpperCase();
    const registry = fileRegistry.get(upperCode);
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
        .sort(([a], [b]) => a - b)
        .map(([, data]) => data);
      
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
