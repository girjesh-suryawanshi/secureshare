import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const [localServerInfo, setLocalServerInfo] = useState<{ ip: string; port: number } | null>(null);
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

  // Start local server for file sharing with chunked upload
  const startLocalServer = useCallback(async (files: File[], code: string, onProgress?: (progress: number, fileName?: string) => void) => {
    try {
      const localIP = await getLocalIP();
      const port = parseInt(window.location.port) || 5000;
      
      // Register files with the main server with progress tracking
      let completedFiles = 0;
      
      const filePromises = files.map(async (file, index) => {
        console.log(`Registering local file: ${file.name} (${index + 1}/${files.length}) - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        
        try {
          // Use direct upload for all files up to 200MB for better speed
          // Only use chunked upload for extremely large files
          if (file.size > 200 * 1024 * 1024) {
            await uploadFileInChunks(file, code, index, files.length);
          } else {
            // Use direct upload for most files (much faster)
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
      
      setLocalServerInfo({ ip: localIP, port });
      setIsLocalServerRunning(true);
      
      toast({
        title: "Local Server Ready",
        description: `${files.length} file(s) available on local network with code ${code}`,
      });
      
      return { ip: localIP, port };
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
  }, [getLocalIP, toast]);

  // Convert File/Blob to base64 using ArrayBuffer (works for HEIC and all binary types; readAsDataURL can fail on HEIC in some browsers)
  const fileToBase64 = (blob: Blob | File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
        }
        resolve(btoa(binary));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });

  // Upload small files directly (all file types supported, including HEIC)
  const uploadFileDirect = async (file: File, code: string, index: number, totalFiles: number) => {
    const base64Data = await fileToBase64(file);

    const fileName = (file.name && file.name.trim()) || `file-${index}`;
    const fileSize = file.size ?? 0;
    const fileType = (file.type && file.type.trim()) ? file.type : 'application/octet-stream';

    const response = await fetch('/api/register-local-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        fileName,
        fileSize,
        fileType,
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
  };

  // Upload large files in chunks for better performance (only for extremely large files >200MB)
  const uploadFileInChunks = async (file: File, code: string, index: number, totalFiles: number) => {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks for faster upload
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    console.log(`Uploading ${file.name} in ${totalChunks} chunks (5MB each)...`);
    
    const fileName = (file.name && file.name.trim()) || `file-${index}`;
    const fileSize = file.size ?? 0;
    const fileType = (file.type && file.type.trim()) ? file.type : 'application/octet-stream';

    // First, register the file metadata
    const metaResponse = await fetch('/api/register-local-file-meta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        fileName,
        fileSize,
        fileType,
        fileIndex: index,
        totalFiles,
        totalChunks,
      }),
    });
    
    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      throw new Error(`Failed to register file metadata: ${metaResponse.status} ${errorText}`);
    }
    
    // Upload chunks in parallel for much faster speed
    const chunkPromises = [];
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const chunkPromise = (async (idx: number) => {
        const start = idx * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const base64Chunk = await fileToBase64(chunk);

        const chunkResponse = await fetch('/api/upload-local-chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            fileIndex: index,
            chunkIndex: idx,
            data: base64Chunk,
            isLastChunk: idx === totalChunks - 1,
          }),
        });
        
        if (!chunkResponse.ok) {
          const errorText = await chunkResponse.text();
          throw new Error(`Failed to upload chunk ${idx}: ${chunkResponse.status} ${errorText}`);
        }
        
        // Show progress
        const progress = Math.round(((idx + 1) / totalChunks) * 100);
        console.log(`${file.name}: ${progress}% complete (${idx + 1}/${totalChunks} chunks)`);
        return idx;
      })(chunkIndex);
      
      chunkPromises.push(chunkPromise);
    }
    
    // Upload all chunks in parallel
    await Promise.all(chunkPromises);
    
    console.log(`Successfully uploaded ${file.name} in parallel chunks`);
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

  // Connect to local device (or current server for local files)
  const connectToDevice = useCallback(async (device: LocalDevice, code: string) => {
    try {
      console.log(`Connecting to device ${device.name} for code ${code}`);
      
      // For local network transfers, try the current server first
      const response = await fetch(`/files/${code}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const payload = await response.json();
        const files = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.files)
            ? payload.files
            : [];

        const readyFiles = files.filter((file: any) => file.downloadUrl);
        if (readyFiles.length === 0) {
          throw new Error('No ready files found');
        }

        toast({
          title: "Files Found",
          description: `Found ${readyFiles.length} file(s) with code ${code}`,
        });
        return readyFiles;
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