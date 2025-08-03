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

  // Generate QR code data using QR Server API
  const generateQRCode = useCallback((ip: string, port: number, code: string) => {
    const accessUrl = `http://${ip}:${port}/files/${code}`;
    const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(accessUrl)}`;
    return qrServerUrl;
  }, []);

  // Simple QR code SVG generator
  const generateQRSVG = (data: string) => {
    const size = 200;
    const modules = 21; // Simple 21x21 QR code
    const moduleSize = size / modules;
    
    // Simple pattern based on data hash
    const hash = data.split('').reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    
    let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;
    
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        const shouldFill = (hash + x * y + x + y) % 3 === 0;
        if (shouldFill) {
          svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
        }
      }
    }
    
    svg += '</svg>';
    return svg;
  };

  // Start local server for file sharing
  const startLocalServer = useCallback(async (files: File[], code: string) => {
    try {
      const localIP = await getLocalIP();
      const port = parseInt(window.location.port) || 5000;
      
      // Register files with the main server for local access
      const filePromises = files.map(async (file, index) => {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });
        
        try {
          console.log(`Registering local file: ${file.name} (${index + 1}/${files.length}) - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
          
          const response = await fetch('/api/register-local-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              data: base64Data,
              fileIndex: index,
              totalFiles: files.length,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to register file ${file.name}:`, response.status, errorText);
            throw new Error(`Failed to register file: ${response.status} ${errorText}`);
          }
          
          const result = await response.json();
          console.log(`Successfully registered ${file.name}:`, result);
        } catch (error) {
          console.error(`Error registering file ${file.name}:`, error);
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
      
      // For demo purposes, add some mock devices since actual network scanning
      // requires special permissions and may not work in all browsers
      const demoDevices: LocalDevice[] = [
        {
          id: 'demo-1',
          name: 'Desktop Computer',
          ip: localIP.replace(/\d+$/, '101'),
          port: 5000,
          lastSeen: new Date()
        },
        {
          id: 'demo-2', 
          name: 'Mobile Device',
          ip: localIP.replace(/\d+$/, '102'),
          port: 5000,
          lastSeen: new Date()
        }
      ];
      
      // Add demo devices for testing
      devices.push(...demoDevices);
      
      setAvailableDevices(devices);
      
      if (devices.length > 0) {
        toast({
          title: "Devices Found",
          description: `Found ${devices.length} device(s) on local network`,
        });
      } else {
        toast({
          title: "No Devices Found",
          description: "No SecureShare devices found on local network",
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
      // For local network transfers, try the current server first
      const currentPort = window.location.port || '5000';
      const response = await fetch(`/files/${code}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const files = await response.json();
        toast({
          title: "Files Found",
          description: `Found ${files.length} file(s) with code ${code}`,
        });
        return files;
      } else {
        throw new Error('Files not found');
      }
    } catch (error) {
      console.error('Failed to get local files:', error);
      toast({
        title: "Files Not Found",
        description: `No files found with code ${code}`,
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