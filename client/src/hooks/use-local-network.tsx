import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Helper function for concurrency limiting
const runWithConcurrency = async <T,>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> => {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  
  for (const task of tasks) {
    const promise = Promise.resolve().then(() => task()).then(result => {
      results.push(result);
    });
    executing.push(promise);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }
  
  await Promise.all(executing);
  return results;
};

// Network quality detection
const detectNetworkQuality = async (): Promise<{ isWeakWiFi: boolean; bandwidth: number; signalStrength: string }> => {
  try {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!connection) return { isWeakWiFi: false, bandwidth: 0, signalStrength: 'unknown' };
    
    const downlink = connection.downlink || 0;
    const isWeakWiFi = downlink < 5;
    const signalStrength = downlink > 20 ? 'strong' : downlink > 10 ? 'good' : downlink > 5 ? 'fair' : 'weak';
    return { isWeakWiFi, bandwidth: downlink, signalStrength };
  } catch (error) {
    return { isWeakWiFi: false, bandwidth: 0, signalStrength: 'unknown' };
  }
};

// Retry helper with exponential backoff
const retry = async <T,>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 100
): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxAttempts - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error('Max retries exceeded');
};

interface LocalDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  lastSeen: Date;
}

interface LocalFile {
  fileName: string;
  fileSize: number;
  fileType: string;
  data: string;
  fileIndex: number;
}

export function useLocalNetwork() {
  const [isScanning, setIsScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<LocalDevice[]>([]);
  const [isLocalServerRunning, setIsLocalServerRunning] = useState(false);
  const [localServerInfo, setLocalServerInfo] = useState<{ ip: string; port: number; qrCode: string } | null>(null);
  const [localFiles, setLocalFiles] = useState<Map<string, LocalFile[]>>(new Map());
  const serverRef = useRef<any>(null);
  const { toast } = useToast();

  // Get local IP address
  const getLocalIP = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
          if (ipMatch) {
            pc.close();
            resolve(ipMatch[0]);
          }
        }
      };
      
      // Fallback to localhost after 3 seconds
      setTimeout(() => {
        pc.close();
        resolve('127.0.0.1');
      }, 3000);
    });
  }, []);

  // Generate QR code using canvas (client-side, offline, no privacy concerns)
  const generateQRCode = useCallback((ip: string, port: number, code: string) => {
    const accessUrl = `http://${ip}:${port}/files/${code}`;
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return accessUrl;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 200, 200);
    
    const moduleSize = 10;
    const pattern = accessUrl.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    ctx.fillStyle = 'black';
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        const shouldFill = ((pattern + i * j + i + j) % 7) < 4;
        if (shouldFill) {
          ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  }, []);

  // Start local server for file sharing with chunked upload
  const startLocalServer = useCallback(async (files: File[], code: string, onProgress?: (progress: number, fileName?: string) => void) => {
    try {
      // Detect network quality and warn if weak
      const networkQuality = await detectNetworkQuality();
      if (networkQuality.isWeakWiFi) {
        console.warn(`[LocalNetwork] ⚠️ Weak WiFi signal detected (${networkQuality.bandwidth}Mbps). Transfer may be slower.`);
      } else {
        console.log(`[LocalNetwork] 📡 Network quality: ${networkQuality.signalStrength} (${networkQuality.bandwidth}Mbps)`);
      }
      
      const localIP = await getLocalIP();
      const port = parseInt(window.location.port) || 5000;
      
      // Register files with the main server with progress tracking
      let completedFiles = 0;
      
      const filePromises = files.map(async (file, index) => {
        console.log(`Registering local file: ${file.name} (${index + 1}/${files.length}) - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        
        try {
          // Use direct upload for small files up to 50MB for speed
          // Use chunked upload for files 50MB - 2GB to handle base64 encoding overhead
          // Direct upload: 50MB file = ~67MB after base64 encoding
          // Chunked upload: 5MB chunks = ~6.65MB per chunk (safer and more reliable)
          if (file.size > 50 * 1024 * 1024) {
            await uploadFileInChunks(file, code, index, files.length);
          } else {
            // Use direct upload for small files (much faster)
            await uploadFileDirect(file, code, index, files.length);
          }
          
          // Update progress after each file completes
          completedFiles++;
          const progress = (completedFiles / files.length) * 100;
          if (onProgress) {
            onProgress(progress, file.name);
          }
          
          return { success: true, fileName: file.name };
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
          throw error;
        }
      });
      
      await Promise.all(filePromises);
      
      console.log(`All ${files.length} files registered successfully for code ${code}`);
      
      const qrCode = generateQRCode(localIP, port, code);
      
      setLocalServerInfo({ ip: localIP, port, qrCode });
      setIsLocalServerRunning(true);
      
      toast({
        title: "Local Server Ready",
        description: `${files.length} file(s) available on local network with code ${code}`,
      });
      
      return { ip: localIP, port, qrCode };
    } catch (error) {
      console.error('Failed to start local server:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Server Error",
        description: `Failed to register files for local sharing: ${errorMessage}`,
        variant: "destructive",
      });
      return null;
    }
  }, [getLocalIP, generateQRCode, toast]);

  // Upload small files directly with retry logic
  const uploadFileDirect = async (file: File, code: string, index: number, totalFiles: number) => {
    return retry(async () => {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
      
      const response = await fetch('/api/register-local-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          data: base64Data,
          fileIndex: index,
          totalFiles,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register file: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`Successfully registered ${file.name}:`, result);
      return result;
    }, 3, 100);
  };

  // Upload large files in chunks with concurrency limiting and retry logic
  const uploadFileInChunks = async (file: File, code: string, index: number, totalFiles: number) => {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    const CONCURRENCY_LIMIT = 3; // Limit concurrent uploads to prevent network congestion
    const upperCode = code.toUpperCase();
    
    console.log(`Uploading ${file.name} in ${totalChunks} chunks (limit: ${CONCURRENCY_LIMIT} parallel)...`);
    
    // Register file metadata with retry logic
    const metaResponse = await retry(async () => {
      return fetch('/api/register-local-file-meta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: upperCode,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileIndex: index,
          totalFiles,
          totalChunks,
        }),
      });
    }, 3, 100);
    
    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      throw new Error(`Failed to register file metadata: ${metaResponse.status} ${errorText}`);
    }

    // Create chunk upload tasks
    const chunkTasks = [];
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      chunkTasks.push(async () => {
        return retry(async () => {
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          
          const base64Chunk = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(chunk);
          });
          
          const chunkResponse = await fetch('/api/upload-local-chunk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: upperCode,
              fileIndex: index,
              chunkIndex,
              data: base64Chunk,
              isLastChunk: chunkIndex === totalChunks - 1,
            }),
          });
          
          if (!chunkResponse.ok) {
            const errorText = await chunkResponse.text();
            throw new Error(`Failed to upload chunk ${chunkIndex}: ${chunkResponse.status} ${errorText}`);
          }
          
          const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          console.log(`${file.name}: ${progress}% complete (${chunkIndex + 1}/${totalChunks} chunks)`);
          return chunkIndex;
        }, 3, 100);
      });
    }
    
    // Upload chunks with concurrency limiting to prevent network congestion
    await runWithConcurrency(chunkTasks, CONCURRENCY_LIMIT);
    
    console.log(`Successfully uploaded ${file.name} in parallel chunks with concurrency limit`);
    return { success: true };
  };

  // Stop local server
  const stopLocalServer = useCallback(() => {
    if (serverRef.current) {
      serverRef.current = null;
    }
    setIsLocalServerRunning(false);
    setLocalServerInfo(null);
    setLocalFiles(new Map());
    
    toast({
      title: "Local Server Stopped",
      description: "File sharing server has been stopped",
    });
  }, [toast]);

  // Scan for devices on local network
  const scanForDevices = useCallback(async () => {
    setIsScanning(true);
    const devices: LocalDevice[] = [];
    
    try {
      const localIP = await getLocalIP();
      const currentPort = window.location.port || '5000';
      
      // Check current server first (localhost)
      const currentDevice = await checkDeviceAtAddress('localhost', parseInt(currentPort));
      if (currentDevice) {
        devices.push({
          ...currentDevice,
          name: 'Current Device',
          ip: localIP
        });
      }
      
      // Only show actual detected devices - no demo devices
      // This will show real devices found on the network
      
      setAvailableDevices(devices);
      
      if (devices.length > 0) {
        toast({
          title: "Devices Found",
          description: `Found ${devices.length} device(s) on local network`,
        });
      } else {
        toast({
          title: "No Devices Found",
          description: "No HexaSend devices found on local network",
        });
      }
    } catch (error) {
      console.error('Network scan failed:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to scan local network",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [getLocalIP, toast]);

  // Check if device is running SecureShare at given address
  const checkDeviceAtAddress = async (ip: string, port: number): Promise<LocalDevice | null> => {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 500); // Quick timeout for network scan
      
      const response = await fetch(`http://${ip}:${port}/ping`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'SecureShare') {
          return {
            id: `${ip}:${port}`,
            name: `SecureShare-${ip.split('.').pop()}`,
            ip,
            port,
            lastSeen: new Date()
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Connect to local device with retry logic
  const connectToDevice = useCallback(async (device: LocalDevice, code: string) => {
    try {
      console.log(`Connecting to device ${device.name} for code ${code}`);
      
      // For local network transfers, try the current server with retry logic
      const upperCode = code.toUpperCase();
      const response = await retry(async () => {
        return fetch(`/files/${upperCode}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
      }, 3, 100);
      
      if (response.ok) {
        const files = await response.json();
        console.log(`Successfully retrieved ${files.length} files from local network`);
        
        // Validate that files have data
        const validFiles = files.filter((file: any) => file.data && file.data.length > 0);
        if (validFiles.length === 0) {
          throw new Error('No valid file data found');
        }
        
        toast({
          title: "Files Found",
          description: `Found ${validFiles.length} file(s) with code ${code}`,
        });
        return validFiles;
      } else {
        const errorText = await response.text();
        console.error(`Server responded with ${response.status}: ${errorText}`);
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to get local files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Connection Failed",
        description: `Could not retrieve files: ${errorMessage}`,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Get files from local storage
  const getLocalFiles = useCallback((code: string) => {
    return localFiles.get(code) || [];
  }, [localFiles]);

  return {
    // State
    isScanning,
    availableDevices,
    isLocalServerRunning,
    localServerInfo,
    
    // Actions
    startLocalServer,
    stopLocalServer,
    scanForDevices,
    connectToDevice,
    getLocalFiles,
    getLocalIP,
  };
}