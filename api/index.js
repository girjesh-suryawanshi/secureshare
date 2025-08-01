// Vercel serverless function wrapper for the Express app
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File storage in memory (for Vercel's stateless environment)
const files = new Map();
const connections = new Map();

// Generate random 6-digit alphanumeric code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const app = express();

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS headers for Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API Routes
app.post('/api/upload', (req, res) => {
  try {
    const { files: uploadedFiles } = req.body;
    
    if (!uploadedFiles || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const code = generateCode();
    
    // Store files with expiration (1 hour)
    const expirationTime = Date.now() + (60 * 60 * 1000); // 1 hour
    files.set(code, {
      files: uploadedFiles,
      timestamp: Date.now(),
      expirationTime
    });

    // Set timeout to cleanup expired files
    setTimeout(() => {
      files.delete(code);
    }, 60 * 60 * 1000);

    console.log(`Files uploaded with code: ${code}, Files count: ${uploadedFiles.length}`);
    res.json({ code });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

app.get('/api/download/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    if (!files.has(code)) {
      return res.status(404).json({ error: 'Code not found' });
    }

    const fileData = files.get(code);
    
    // Check if expired
    if (Date.now() > fileData.expirationTime) {
      files.delete(code);
      return res.status(404).json({ error: 'Code expired' });
    }

    console.log(`Files downloaded with code: ${code}, Files count: ${fileData.files.length}`);
    
    // Delete files after successful download
    files.delete(code);
    
    res.json({ files: fileData.files });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download files' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket functionality (limited in Vercel serverless)
app.get('/ws', (req, res) => {
  res.json({ message: 'WebSocket connections are handled separately in Vercel' });
});

// Export for Vercel
export default app;