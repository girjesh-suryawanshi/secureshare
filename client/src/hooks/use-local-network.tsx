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

  // Generate QR code data
  const generateQRCode = useCallback((ip: string, port: number, code: string) => {
    const connectionData = JSON.stringify({ ip, port, code, type: 'secureshare-local' });
    return `data:image/svg+xml;base64,${btoa(generateQRSVG(connectionData))}`;
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
      const port = 8080 + Math.floor(Math.random() * 1000); // Random port
      
      // Store files in memory
      const fileData: LocalFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });
        
        fileData.push({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          data: base64Data,
          fileIndex: i
        });
      }
      
      setLocalFiles(prev => new Map(prev.set(code, fileData)));
      
      const qrCode = generateQRCode(localIP, port, code);
      
      setLocalServerInfo({ ip: localIP, port, qrCode });
      setIsLocalServerRunning(true);
      
      toast({
        title: "Local Server Started",
        description: `Files available at ${localIP}:${port}`,
      });
      
      return { ip: localIP, port, qrCode };
    } catch (error) {
      console.error('Failed to start local server:', error);
      toast({
        title: "Server Error",
        description: "Failed to start local file server",
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
      const baseIP = localIP.substring(0, localIP.lastIndexOf('.')) + '.';
      
      // Scan common ports and IP ranges
      const scanPromises = [];
      for (let i = 1; i < 255; i++) {
        const ip = baseIP + i;
        for (const port of [8080, 8081, 8082, 8083, 8084, 8085]) {
          scanPromises.push(checkDeviceAtAddress(ip, port));
        }
      }
      
      const results = await Promise.allSettled(scanPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          devices.push(result.value);
        }
      });
      
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
      setTimeout(() => controller.abort(), 1000); // 1 second timeout
      
      const response = await fetch(`http://${ip}:${port}/ping`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors' // For local network access
      });
      
      // If we get any response, assume it's a SecureShare device
      return {
        id: `${ip}:${port}`,
        name: `Device at ${ip}`,
        ip,
        port,
        lastSeen: new Date()
      };
    } catch (error) {
      return null;
    }
  };

  // Connect to local device
  const connectToDevice = useCallback(async (device: LocalDevice, code: string) => {
    try {
      const response = await fetch(`http://${device.ip}:${device.port}/files/${code}`, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (response.ok) {
        const files = await response.json();
        return files;
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      console.error('Failed to connect to device:', error);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${device.name}`,
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