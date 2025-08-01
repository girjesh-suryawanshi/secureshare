// SecureShare - Vercel Serverless API
const files = new Map();

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;

  try {
    if (method === 'POST' && url === '/api/upload') {
      const { files: uploadedFiles } = req.body;
      
      if (!uploadedFiles || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const code = generateCode();
      
      // Store files with expiration (1 hour)
      const expirationTime = Date.now() + (60 * 60 * 1000);
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
      return res.json({ code });
    }

    if (method === 'GET' && url.startsWith('/api/download/')) {
      const code = url.split('/api/download/')[1];
      
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
      
      return res.json({ files: fileData.files });
    }

    if (method === 'GET' && url === '/api/health') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Route not found
    return res.status(404).json({ error: 'Route not found' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}