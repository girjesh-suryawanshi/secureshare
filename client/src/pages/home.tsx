import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocalNetwork } from "@/hooks/use-local-network";
import { useToast } from "@/hooks/use-toast";
import { useTransferStats } from "@/hooks/use-transfer-stats";
import { FilePreview } from "@/components/file-preview";
import { DragDropZone } from "@/components/drag-drop-zone";
import { TransferProgress } from "@/components/transfer-progress";
import { TransferStats } from "@/components/transfer-stats";
import { Upload, Download, Copy, CheckCircle, Share, Archive, ArrowLeft, Clock, Users, FileText, Zap, Loader2, Wifi, Globe, QrCode, Search, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import JSZip from "jszip";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "./blog";
import type { TransferType } from "@shared/schema";

const FILE_CHUNK_SIZE = 256 * 1024; // 256KB

const getLatestBlogPosts = () => {
  return blogPosts.slice(0, 3);
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
};

type DownloadJob = {
  code: string;
  downloadUrl: string;
  fileName: string;
  fileType?: string;
  fileIndex: number;
  totalFiles?: number;
  isLocal?: boolean;
};

export default function Home() {
  const [mode, setMode] = useState<'select' | 'send' | 'receive'>('select');
  const [transferType, setTransferType] = useState<TransferType>('internet');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transferCode, setTransferCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [filesReady, setFilesReady] = useState<boolean>(false);
  const [receivedFiles, setReceivedFiles] = useState<{ name: string; size: number; blob: Blob }[]>([]);
  const [expectedFilesCount, setExpectedFilesCount] = useState<number>(0);
  const [receivedFilesCount, setReceivedFilesCount] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [transferSpeed, setTransferSpeed] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [receiveProgress, setReceiveProgress] = useState<number>(0);
  const [isReceiving, setIsReceiving] = useState<boolean>(false);
  const [acknowledgments, setAcknowledgments] = useState<Array<{id: string, message: string, status: string, timestamp: Date}>>([]);
  const [copyJustDone, setCopyJustDone] = useState(false);
  const [uploadingFileIndex, setUploadingFileIndex] = useState<number>(0);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const [isPreparingLocal, setIsPreparingLocal] = useState(false);
  const downloadedFileKeys = useRef<Set<string>>(new Set());
  const receiveRequestCodeRef = useRef<string | null>(null);
  const receiveRetryCountRef = useRef<number>(0);
  const receiveRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receiveCodeInputRef = useRef<HTMLInputElement>(null);

  const { isConnected, reconnect, sendMessage, onFileAvailable, onFileReady, onFileNotFound, onDownloadAck, onSenderDisconnected } = useWebSocket();
  const { 
    isScanning, 
    availableDevices, 
    isLocalServerRunning, 
    localServerInfo,
    startLocalServer,
    stopLocalServer,
    scanForDevices,
    connectToDevice,
    getLocalFiles
  } = useLocalNetwork();
  const { toast } = useToast();
  const { stats, addTransfer } = useTransferStats();
  const fileKey = (code: string, index: number) => `${code}-${index}`;

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log('Generated code:', code);
    return code;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    return `${Math.round(bytesPerSecond / (1024 * 1024))} MB/s`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const resetReceiveState = () => {
    setReceivedFiles([]);
    setExpectedFilesCount(0);
    setReceivedFilesCount(0);
    downloadedFileKeys.current.clear();
  };

  const downloadFileJob = useCallback(async (job: DownloadJob) => {
    if (!job.downloadUrl) return;
    const key = fileKey(job.code, job.fileIndex);
    if (downloadedFileKeys.current.has(key)) {
      return;
    }
    downloadedFileKeys.current.add(key);

    try {
      setIsReceiving(true);
      setReceiveProgress((prev) => (prev < 20 ? 20 : prev));

      const response = await fetch(job.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;
      const contentLength = Number(response.headers.get("Content-Length")) || 0;

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            downloadedBytes += value.length;
            if (contentLength > 0) {
              const chunkProgress = (downloadedBytes / contentLength) * 40;
              setReceiveProgress((prev) => Math.min(95, 30 + chunkProgress));
            }
          }
        }
      } else {
        const blob = await response.blob();
        chunks.push(new Uint8Array(await blob.arrayBuffer()));
        downloadedBytes = blob.size;
      }

      const blob = new Blob(chunks, { type: job.fileType || 'application/octet-stream' });
      const completedFile = {
        name: job.fileName,
        size: blob.size,
        blob,
      };

      setReceivedFiles((prev) => [...prev, completedFile]);
      setExpectedFilesCount((prev) => (prev === 0 && job.totalFiles ? job.totalFiles : prev));
      setReceivedFilesCount((prev) => {
        const nextCount = prev + 1;
        const totalExpected = job.totalFiles || expectedFilesCount || nextCount;
        const progressBase = totalExpected > 0 ? 50 + (nextCount / totalExpected) * 40 : 90;
        setReceiveProgress(Math.min(95, progressBase));

        if (nextCount >= totalExpected) {
          setReceiveProgress(100);
          setTimeout(() => {
            setIsReceiving(false);
            setReceiveProgress(0);
          }, 800);

          if (!job.isLocal) {
            sendMessage({
              type: 'download-success',
              code: job.code,
              fileName: 'All files',
              totalFiles: totalExpected,
              completedFiles: totalExpected,
            });
          }
        }

        return nextCount;
      });

      addTransfer({
        type: 'received',
        fileName: job.fileName,
        size: blob.size,
      });
    } catch (error) {
      downloadedFileKeys.current.delete(key);
      console.error('Failed to download file', error);
      toast({
        title: 'Download Failed',
        description: job.fileName,
        variant: 'destructive',
      });

      if (!job.isLocal) {
        sendMessage({
          type: 'download-error',
          code: job.code,
          fileName: job.fileName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, [addTransfer, expectedFilesCount, sendMessage, toast, transferType]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length > 0) {
      setSelectedFiles(files);
      setIsUploading(true);
      setUploadProgress(0);
      
      const code = generateCode();
      setTransferCode(code);
      
      // Handle local network transfer
      if (transferType === 'local') {
        setIsPreparingLocal(true);
        try {
          const serverInfo = await startLocalServer(files, code, (progress, fileName) => {
            setUploadProgress(progress);
            if (fileName && files.length > 1) {
              toast({
                title: `📤 Uploading Files... ${Math.round(progress)}%`,
                description: `${fileName} uploaded - ${Math.round((files.length * progress) / 100)} of ${files.length} files`,
              });
            }
          });
        
        if (serverInfo) {
          setUploadProgress(100);
          setIsUploading(false);
          setFilesReady(true);
          toast({
            title: "✅ Local Server Ready",
            description: `${files.length} file(s) available on local network. Share code ${code}`,
          });
        }
        } finally {
          setIsPreparingLocal(false);
        }
        return;
      }
      
      const startTime = Date.now();
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      let uploadedBytes = 0;

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const fileSize = file.size ?? 0;
        const fileName = (file.name && file.name.trim()) || `file-${index}`;
        const fileType = file.type && file.type.trim() ? file.type : "application/octet-stream";
        const totalChunks = Math.ceil(Math.max(fileSize, 1) / FILE_CHUNK_SIZE);

        setUploadingFileIndex(index);
        setUploadingFileName(fileName);

        try {
          sendMessage({
            type: 'register-file',
            code,
            fileName,
            fileSize,
            fileType,
            fileIndex: index,
            totalFiles: files.length,
            totalChunks,
            transferType,
          });

          let offset = 0;
          let chunkIndex = 0;
          const size = file.size ?? 0;
          while (offset < size) {
            const slice = file.slice(offset, offset + FILE_CHUNK_SIZE);
            const buffer = await slice.arrayBuffer();
            const chunkData = arrayBufferToBase64(buffer);

            sendMessage({
              type: 'file-data',
              code,
              fileName,
              data: chunkData,
              fileIndex: index,
              chunkIndex,
              isLastChunk: offset + slice.size >= size,
            });

            offset += slice.size;
            chunkIndex += 1;
            uploadedBytes += slice.size;

            const progress = (uploadedBytes / totalSize) * 100;
            setUploadProgress(progress);

            const elapsedSeconds = Math.max((Date.now() - startTime) / 1000, 1);
            const speed = uploadedBytes / elapsedSeconds;
            setTransferSpeed(formatSpeed(speed));

            const remainingBytes = totalSize - uploadedBytes;
            const etaSeconds = remainingBytes / Math.max(speed, 1);
            setEstimatedTime(etaSeconds > 0 ? formatTime(etaSeconds) : '');

            await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error(`Upload failed for ${fileName}:`, err);
          toast({
            title: "Upload failed",
            description: `${fileName}: ${msg}. Try local network transfer for HEIC/large files.`,
            variant: "destructive",
          });
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
      }
      
      setIsUploading(false);
      setFilesReady(true);
      
      // Add to transfer stats
      files.forEach(file => {
        addTransfer({
          type: 'sent',
          fileName: file.name,
          size: file.size,
          code
        });
      });
      toast({
        title: "Files Ready",
        description: `${files.length} file(s) ready. Share code ${code}`,
      });
    }
  };

  const handleReceiveFile = async () => {
    const normalized = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized || normalized.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-character code (letters and numbers only)",
        variant: "destructive",
      });
      return;
    }

    const upperCode = normalized;
    setIsReceiving(true);
    setReceiveProgress(10);
    resetReceiveState();

    // Handle local network transfer
    if (transferType === 'local') {
      try {
        console.log(`Looking for files with code: ${upperCode}`);
        setReceiveProgress(30);
        
        // Try to get files directly from current server (local network)
        const response = await fetch(`/files/${upperCode}`, {
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

          setExpectedFilesCount(readyFiles.length);
          for (const file of readyFiles) {
            await downloadFileJob({
              code: upperCode,
              downloadUrl: file.downloadUrl,
              fileName: file.fileName,
              fileType: file.fileType,
              fileIndex: file.fileIndex,
              totalFiles: readyFiles.length,
              isLocal: true,
            });
          }

          toast({
            title: "Files Received Locally",
            description: `${readyFiles.length} file(s) received from local network`,
          });
          setIsReceiving(false);
          setReceiveProgress(0);
          return;
        } else {
          const errorText = await response.text();
          console.error(`Server responded with ${response.status}: ${errorText}`);
          throw new Error(`File not found on local network`);
        }
      } catch (error) {
        console.error('Failed to get local files:', error);
        setIsReceiving(false);
        setReceiveProgress(0);
        toast({
          title: "File Not Found",
          description: `No files found with code ${upperCode} on local network`,
          variant: "destructive",
        });
        return;
      }
    }

    // Internet transfer - set refs so we can retry on file-not-found (cross-device race)
    receiveRequestCodeRef.current = upperCode;
    receiveRetryCountRef.current = 0;
    console.log('Requesting file with code:', upperCode);
    sendMessage({
      type: 'request-file',
      code: upperCode,
    });

    toast({
      title: "Requesting File",
      description: "Looking for file with that code...",
    });
  };

  const copyCode = async () => {
    if (!transferCode) return;
    
    try {
      await navigator.clipboard.writeText(transferCode);
      setCopyJustDone(true);
      setTimeout(() => setCopyJustDone(false), 2000);
      toast({
        title: "Code Copied",
        description: "Share this code with the receiver",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadSingleFile = (file: any) => {
    setIsDownloading(true);
    setDownloadProgress(20);
    
    // Simulate progressive download for user feedback
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadProgress(0);
    }, 1500);
    
    toast({
      title: "Download Started",
      description: `Downloading ${file.name}`,
    });
  };

  const downloadFiles = async () => {
    if (receivedFiles.length === 0) return;
    
    if (receivedFiles.length === 1) {
      // Single file - download directly
      downloadSingleFile(receivedFiles[0]);
    } else {
      // Multiple files - create ZIP with progress
      setIsDownloading(true);
      setDownloadProgress(0);
      
      const zip = new JSZip();
      
      // Add all files to ZIP with progress updates
      receivedFiles.forEach((file, index) => {
        zip.file(file.name, file.blob);
        setDownloadProgress((index + 1) / receivedFiles.length * 30); // 30% for file processing
      });
      
      try {
        toast({
          title: "Creating ZIP",
          description: "Preparing download...",
        });
        
        setDownloadProgress(40);
        
        // Generate ZIP file with progress callback
        const zipBlob = await zip.generateAsync({ 
          type: "blob",
          streamFiles: true
        }, (metadata) => {
          const progress = 40 + (metadata.percent * 0.5); // 40-90% for ZIP creation
          setDownloadProgress(progress);
        });
        
        setDownloadProgress(95);
        
        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `files-${inputCode}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setDownloadProgress(100);
        
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 1000);
        
        toast({
          title: "ZIP Download Started",
          description: `Downloading ${receivedFiles.length} files as ZIP`,
        });
      } catch (error) {
        setIsDownloading(false);
        setDownloadProgress(0);
        
        toast({
          title: "ZIP Creation Failed",
          description: "Could not create ZIP file",
          variant: "destructive",
        });
      }
    }
  };

  // Set up WebSocket event handlers
  useEffect(() => {
    const activeCode = inputCode.toUpperCase();

    onFileAvailable((file) => {
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;
      setReceiveProgress(30);
      if (file.totalFiles && expectedFilesCount === 0) {
        setExpectedFilesCount(file.totalFiles);
      }

      toast({
        title: "File Found",
        description: `Found ${file.fileName} (${Math.round(file.fileSize / 1024)} KB)`
          + (file.totalFiles ? ` - ${(file.fileIndex ?? 0) + 1}/${file.totalFiles}` : ''),
      });

      if (file.isReady && file.downloadUrl) {
        downloadFileJob({
          code: file.code || activeCode,
          downloadUrl: file.downloadUrl,
          fileName: file.fileName,
          fileType: file.fileType,
          fileIndex: file.fileIndex ?? 0,
          totalFiles: file.totalFiles,
        });
      }
    });

    onFileReady((data: any) => {
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;
      if (data.downloadUrl) {
        downloadFileJob({
          code: data.code || activeCode,
          downloadUrl: data.downloadUrl,
          fileName: data.fileName,
          fileType: data.fileType,
          fileIndex: data.fileIndex || 0,
          totalFiles: data.totalFiles,
        });
      }
    });

    onFileNotFound((code) => {
      const requestedCode = receiveRequestCodeRef.current ?? code;
      const isOurRequest = receiveRequestCodeRef.current != null;

      if (isOurRequest && receiveRetryCountRef.current < 3) {
        receiveRetryCountRef.current += 1;
        const attempt = receiveRetryCountRef.current;
        toast({
          title: "Still looking...",
          description: `File not ready yet. Retrying (${attempt}/3)... Ask sender to finish uploading.`,
        });
        receiveRetryTimeoutRef.current = setTimeout(() => {
          sendMessage({ type: 'request-file', code: requestedCode });
        }, 2000);
        return;
      }

      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;
      setIsReceiving(false);
      setReceiveProgress(0);
      toast({
        title: "File Not Found",
        description: code ? `No file found with code ${code}. Make sure the sender has shared the files first.` : "No file found. Check the code and try again.",
        variant: "destructive",
      });
    });

    onDownloadAck((data: any) => {
      const newAck = {
        id: Math.random().toString(36).substr(2, 9),
        message: data.message,
        status: data.status,
        timestamp: new Date()
      };
      
      setAcknowledgments(prev => [newAck, ...prev.slice(0, 4)]); // Keep last 5 acknowledgments
      
      toast({
        title: data.status === 'success' ? "✅ Files Downloaded!" : "❌ Download Failed",
        description: data.message,
        variant: data.status === 'success' ? "default" : "destructive",
      });
    });

    onSenderDisconnected((data: any) => {
      console.log('Sender disconnected:', data);
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }
      setIsReceiving(false);
      setReceiveProgress(0);
      setReceivedFiles([]);
      setExpectedFilesCount(0);
      setReceivedFilesCount(0);
      
      toast({
        title: "❌ Sender Disconnected",
        description: "The sender closed their browser. Files are no longer available. Please ask them to share again.",
        variant: "destructive",
      });
    });

    return () => {
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }
    };
  }, [downloadFileJob, expectedFilesCount, inputCode, onDownloadAck, onFileAvailable, onFileNotFound, onFileReady, onSenderDisconnected, sendMessage, toast]);

  // Auto-focus code input when entering receive mode
  useEffect(() => {
    if (mode === "receive" && receiveCodeInputRef.current) {
      receiveCodeInputRef.current.focus();
    }
  }, [mode]);

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center space-y-12">
            
            {/* Clean Hero Section */}
            <div className="space-y-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20 w-32 h-32 mx-auto"></div>
                <div className="relative inline-flex items-center justify-center p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl mb-6">
                  <Share className="h-16 w-16 text-white" />
                </div>
              </div>
              
              <div className="space-y-8">
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent leading-tight">
                  HexaSend
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-700 max-w-3xl mx-auto leading-relaxed">
                  Share Any File in Seconds with Just a 6-Digit Code
                </h2>
                
                <div className="flex flex-wrap justify-center gap-3 text-sm md:text-base font-medium">
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full">Zero Setup</span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">Secure</span>
                  <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full">Lightning Fast</span>
                </div>
              </div>
            </div>

            {/* Transfer Stats Dashboard */}
            <div className="mb-12">
              <TransferStats stats={stats} />
            </div>

            {/* Connection status pill – visible near transfer type */}
            <div className="flex justify-center mb-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                transferType === 'local' ? 'bg-green-100 text-green-800' :
                isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  transferType === 'local' ? 'bg-green-500' :
                  isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
                }`} />
                {transferType === 'local' ? 'Local mode – no server needed' : isConnected ? 'Connected' : 'Connecting…'}
              </div>
            </div>

            {/* Transfer Type Selection */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center">Choose Transfer Method</h3>
                <p className="text-sm text-gray-500 text-center mb-4">Internet works everywhere; Local is faster on the same WiFi.</p>
                {transferType === 'local' && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4 text-center">Both devices must be on the same WiFi or hotspot.</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTransferType('internet')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      transferType === 'internet'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Globe className="h-8 w-8 mx-auto mb-2" />
                    <div className="font-medium">Internet – works anywhere</div>
                    <div className="text-xs mt-1">Uses server connection</div>
                    <Badge variant={transferType === 'internet' ? 'default' : 'outline'} className="mt-2">
                      {isConnected ? 'Ready' : 'Connecting...'}
                    </Badge>
                  </button>
                  
                  <button
                    onClick={() => setTransferType('local')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      transferType === 'local'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Wifi className="h-8 w-8 mx-auto mb-2" />
                    <div className="font-medium">Local WiFi – same network, faster</div>
                    <div className="text-xs mt-1">No server needed</div>
                    <Badge variant={transferType === 'local' ? 'default' : 'outline'} className="mt-2">
                      High Speed
                    </Badge>
                  </button>
                </div>
              </div>
            </div>

            {/* Premium Action Cards */}
            <div className="max-w-2xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Send Files Card */}
                <Card className="group hover:scale-105 transition-all duration-300 shadow-2xl border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="p-8 relative z-10">
                    <div className="text-center space-y-6">
                      <div className="bg-white/20 rounded-2xl p-4 w-fit mx-auto">
                        <Upload className="h-12 w-12 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Send Files</h3>
                        <p className="text-blue-100">Share files instantly</p>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setTimeout(() => setMode('send'), 100);
                        }} 
                        className="w-full h-12 text-base bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                        disabled={transferType === 'internet' && !isConnected}
                        title={transferType === 'internet' && !isConnected ? 'Connect to the server first' : undefined}
                      >
                        Start Sending {transferType === 'local' ? '(Local)' : ''}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Receive Files Card */}
                <Card className="group hover:scale-105 transition-all duration-300 shadow-2xl border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="p-8 relative z-10">
                    <div className="text-center space-y-6">
                      <div className="bg-white/20 rounded-2xl p-4 w-fit mx-auto">
                        <Download className="h-12 w-12 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Receive Files</h3>
                        <p className="text-purple-100">Enter code and download</p>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setTimeout(() => setMode('receive'), 100);
                        }} 
                        className="w-full h-12 text-base bg-white text-purple-600 hover:bg-purple-50 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                        disabled={transferType === 'internet' && !isConnected}
                        title={transferType === 'internet' && !isConnected ? 'Connect to the server first' : undefined}
                      >
                        Start Receiving {transferType === 'local' ? '(Local)' : ''}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {transferType === 'internet' && !isConnected && (
                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-amber-800 font-medium">🔄 Connecting to secure servers…</p>
                  <p className="text-amber-700 text-sm mt-1">Check your internet or try again in a moment.</p>
                  <Button variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100" onClick={reconnect}>
                    Retry connection
                  </Button>
                </div>
              )}
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto mt-16 text-left">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Frequently Asked Questions</h3>
              <div className="space-y-3">
                <details className="bg-white rounded-lg p-4 border border-gray-100">
                  <summary className="font-medium cursor-pointer">How long do transfer codes last?</summary>
                  <p className="mt-2 text-gray-600">
                    Codes expire after 1 hour for security. If you need another transfer, generate a new code.
                  </p>
                </details>
                <details className="bg-white rounded-lg p-4 border border-gray-100">
                  <summary className="font-medium cursor-pointer">Are my files stored on HexaSend servers?</summary>
                  <p className="mt-2 text-gray-600">
                    Files are held temporarily in server memory only during active transfers and are deleted after transfer or expiration.
                  </p>
                </details>
                <details className="bg-white rounded-lg p-4 border border-gray-100">
                  <summary className="font-medium cursor-pointer">Do I need an account to use HexaSend?</summary>
                  <p className="mt-2 text-gray-600">
                    No. HexaSend works without signup—simply send files and share the short code with your recipient.
                  </p>
                </details>
                <details className="bg-white rounded-lg p-4 border border-gray-100">
                  <summary className="font-medium cursor-pointer">Is there a file size limit?</summary>
                  <p className="mt-2 text-gray-600">
                    File size depends on your device and browser memory. For very large files, use local WiFi mode for best performance.
                  </p>
                </details>
              </div>
            </div>

            {/* Simple How It Works */}
            <div className="grid md:grid-cols-3 gap-8 mt-16 mx-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Send Files</h3>
                <p className="text-gray-600">Select files and get a code</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                  <Share className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Share Code</h3>
                <p className="text-gray-600">Give the 6-digit code to anyone</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
                  <Download className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Download</h3>
                <p className="text-gray-600">Enter code and download files</p>
              </div>
            </div>

            {/* Blog Section */}
            <div className="mt-16">
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Latest from Our Blog</h3>
              <div className="grid md:grid-cols-3 gap-8">
                {getLatestBlogPosts().map((post) => {
                  const IconComponent = post.icon;
                  return (
                    <Card
                      key={post.id}
                      className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {post.category}
                          </span>
                        </div>

                        <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h4>

                        <p className="text-gray-600 mb-4 leading-relaxed">{post.excerpt}</p>

                        <Link href={`/blog/${post.slug}`}>
                          <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition-all group-hover:scale-105">
                            <span>Read Article</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="text-center mt-12">
                <Link href="/blog">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    View All Articles
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'send') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  setMode('select');
                  // Clear all files and state when going back from send mode
                  setSelectedFiles([]);
                  setUploadProgress(0);
                  setIsUploading(false);
                  setFilesReady(false);
                  setTransferCode('');
                  setAcknowledgments([]);
                  if (transferType === 'local' && isLocalServerRunning) {
                    stopLocalServer();
                  }
                }, 100);
              }} 
              className="mb-6 text-lg hover:bg-white/80 transition-all duration-200"
            >
              ← Back to Home
            </Button>

            <div className="text-center mb-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-2xl opacity-30 w-24 h-24 mx-auto"></div>
                <div className="relative inline-flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl">
                  <Upload className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Send Your Files {transferType === 'local' ? '(Local Network)' : ''}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
                {transferType === 'local' 
                  ? 'Share files at high speed on your local network. Perfect for large files!' 
                  : 'Share files instantly with military-grade security. Your files, your control, your privacy.'
                }
              </p>
              {transferType === 'local' && (
                <div className="mt-4">
                  <Badge variant="secondary" className="text-sm">
                    <Wifi className="w-4 h-4 mr-2" />
                    Local Network Mode - High Speed Transfer
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">

              {!filesReady ? (
                <div className="space-y-8">
                  {selectedFiles.length === 0 ? (
                    <div className="text-center">
                      <DragDropZone onFilesSelected={handleFilesSelected} ariaLabel="Choose files to send. All file types supported.">
                        <div className="p-12 space-y-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20 w-20 h-20 mx-auto"></div>
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 w-fit mx-auto">
                              <Upload className="h-16 w-16 text-white" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-lg md:text-2xl font-bold text-gray-900">
                              Drop Files Here or Click to Browse
                            </p>
                            <p className="text-sm md:text-lg text-gray-600">
                              All file types (images, documents, videos, HEIC, etc.) • Internet & local network • Multiple files auto ZIP
                            </p>
                            <div className="flex justify-center space-x-4 text-sm font-medium">
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">✓ Secure</span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">✓ Fast</span>
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">✓ Private</span>
                            </div>
                          </div>
                        </div>
                      </DragDropZone>
                      
                      <div className="mt-8 p-4 md:p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-3 text-sm md:text-base">💡 Pro Tips</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm text-gray-700">
                          <div>• All file types allowed</div>
                          <div>• Multiple files = Auto ZIP</div>
                          <div>• No size limits • 1hr expiry</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-lg md:text-2xl font-bold text-gray-900">
                          Ready to Send ({selectedFiles.length} files)
                        </h3>
                        <div className="text-sm text-gray-500">
                          Total: {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedFiles.length} file(s), {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(1)} MB total. Click the area below to add more or continue.
                      </p>
                      
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
                        <div className="grid gap-3 max-h-64 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <FilePreview file={file} showSize={true} />
                              <Button
                                onClick={() => {
                                  setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                }}
                                variant="outline"
                                size="sm"
                                className="ml-3 text-red-600 hover:bg-red-50 border-red-200 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {(isUploading || isPreparingLocal) && (
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                          {isPreparingLocal ? (
                            <div className="flex items-center gap-3">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                              <p className="text-sm font-medium text-gray-700">Preparing local server…</p>
                            </div>
                          ) : (
                            <TransferProgress
                              progress={uploadProgress}
                              transferSpeed={transferSpeed}
                              estimatedTime={estimatedTime}
                              fileName={selectedFiles.length > 1 ? `File ${uploadingFileIndex + 1} of ${selectedFiles.length}: ${uploadingFileName}` : (selectedFiles[0]?.name ?? uploadingFileName)}
                            />
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <DragDropZone onFilesSelected={(newFiles) => {
                          setSelectedFiles(prev => [...prev, ...newFiles]);
                        }} ariaLabel="Add more files to this transfer.">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2 hover:bg-blue-50 min-h-[44px] focus-visible:ring-2">
                                <Upload className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                                Add More Files
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add more files to this transfer.</TooltipContent>
                          </Tooltip>
                        </DragDropZone>
                        <Button 
                          onClick={() => {
                            setSelectedFiles([]);
                            setUploadProgress(0);
                            setIsUploading(false);
                          }}
                          variant="outline"
                          className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2 hover:bg-red-50 text-red-600 border-red-200"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-8">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-8">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 w-16 h-16 mx-auto"></div>
                      <div className="relative bg-green-500 rounded-2xl p-4 w-fit mx-auto">
                        <CheckCircle className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg md:text-2xl font-bold text-green-800 mb-4">
                      🎉 Files Ready to Share!
                    </h3>
                    <p className="text-sm md:text-lg text-green-700 mb-2">
                      {selectedFiles.length} file(s) uploaded and secured.
                    </p>
                    <p className="text-sm text-green-600 mb-6">Share the code below with the receiver.</p>
                    
                    <div className="bg-white rounded-xl p-4 border border-green-300 mb-6">
                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <FilePreview file={file} showSize={true} />
                            <Button
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                              }}
                              variant="outline"
                              size="sm"
                              className="ml-3 text-red-600 hover:bg-red-50 border-red-200 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 md:p-6 text-white">
                      <p className="text-sm md:text-lg font-semibold mb-4">
                        {transferType === 'local' ? '🏠 Local Network Share Code' : '🔐 Your Secure Share Code'}
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
                        <div
                          className="bg-white/20 backdrop-blur px-4 md:px-6 py-3 md:py-4 rounded-xl font-mono text-xl md:text-3xl font-bold tracking-wider"
                          role="text"
                          aria-label={transferCode ? `Share code: ${transferCode}` : undefined}
                        >
                          {transferCode}
                        </div>
                        <Button 
                          variant="secondary" 
                          size="lg" 
                          onClick={copyCode}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full sm:w-auto min-h-[44px] focus-visible:ring-2"
                        >
                          <Copy className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                          {copyJustDone ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      {transferType === 'local' && localServerInfo ? (
                        <div className="mt-6 p-4 bg-white/10 rounded-xl">
                          <p className="text-white/90 text-sm mb-1">
                            <Wifi className="w-4 h-4 inline mr-2" />
                            Server: {localServerInfo.ip}:{localServerInfo.port}
                          </p>
                          <p className="text-white/80 text-xs">
                            Devices on the same WiFi/hotspot: open HexaSend, choose Receive, and enter the code above.
                          </p>
                        </div>
                      ) : (
                        <p className="text-blue-100 text-sm md:text-base">
                          Share this code with the receiver. Files expire in 1 hour for maximum security.
                        </p>
                      )}
                    </div>
                  </div>

                  {acknowledgments.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                      <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📱 Download Status 
                        <span className="text-sm font-normal text-gray-600">({acknowledgments.length} update{acknowledgments.length > 1 ? 's' : ''})</span>
                      </h4>
                      <div className="space-y-3">
                        {acknowledgments.slice(0, 3).map((ack) => (
                          <div key={ack.id} className={`p-4 rounded-xl border-l-4 ${
                            ack.status === 'success' 
                              ? 'bg-green-50 border-l-green-500 text-green-800' 
                              : 'bg-red-50 border-l-red-500 text-red-800'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{ack.status === 'success' ? '✅' : '❌'}</span>
                                <div>
                                  <p className="font-medium">{ack.message}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {ack.timestamp.toLocaleTimeString()} • {ack.timestamp.toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {acknowledgments.length > 3 && (
                          <p className="text-center text-sm text-gray-500 pt-2">
                            ... and {acknowledgments.length - 3} more update{acknowledgments.length - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => {
                          setMode('select');
                          setSelectedFiles([]);
                          setTransferCode('');
                          setFilesReady(false);
                          setAcknowledgments([]);
                          if (transferType === 'local' && isLocalServerRunning) {
                            stopLocalServer();
                          }
                        }, 100);
                      }}
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Send More Files
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => setMode('receive'), 100);
                      }}
                      variant="outline"
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2"
                    >
                      Receive Files
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'receive') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  setMode('select');
                  // Clear state when going back from receive mode
                  setInputCode('');
                  setReceivedFiles([]);
                  setExpectedFilesCount(0);
                  setReceivedFilesCount(0);
                  setIsReceiving(false);
                  setReceiveProgress(0);
                }, 100);
              }} 
              className="mb-6 text-lg hover:bg-white/80 transition-all duration-200"
            >
              ← Back to Home
            </Button>

            <div className="text-center mb-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-2xl opacity-30 w-24 h-24 mx-auto"></div>
                <div className="relative inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl">
                  <Download className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                Receive Files {transferType === 'local' ? '(Local Network)' : ''}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
                {transferType === 'local' 
                  ? 'Enter code to receive files from devices on your local network.' 
                  : 'Enter your 6-digit secure code to instantly download files shared with you.'
                }
              </p>
              {transferType === 'local' && (
                <div className="mt-4">
                  <Badge variant="secondary" className="text-sm">
                    <Wifi className="w-4 h-4 mr-2" />
                    Local Network Mode - High Speed Transfer
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">

              {receivedFiles.length === 0 ? (
                <div className="text-center space-y-8">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-200">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-20 w-16 h-16 mx-auto"></div>
                      <div className="relative bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-4 w-fit mx-auto">
                        <Download className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">
                      {transferType === 'local' ? 'Local Network Code' : 'Enter Your Code'}
                    </h3>
                    <p className="text-sm md:text-lg text-gray-600 mb-8">
                      {transferType === 'local' 
                        ? 'Enter the code from a device on your local network' 
                        : 'Type the 6-character code shared with you'
                      }
                    </p>
                    
                    {transferType === 'local' && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">Available Devices</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={scanForDevices}
                            disabled={isScanning}
                            className="text-xs"
                          >
                            {isScanning ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Scanning...
                              </>
                            ) : (
                              <>
                                <Search className="w-3 h-3 mr-1" />
                                Scan Network
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {availableDevices.length > 0 ? (
                          <div className="space-y-2">
                            {availableDevices.map((device) => (
                              <div key={device.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  <Wifi className="w-4 h-4 text-green-500" />
                                  <span className="text-sm font-medium">{device.name}</span>
                                  <span className="text-xs text-gray-500">{device.ip}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">Online</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 text-center py-2">
                            {isScanning ? 'Scanning for devices...' : `${availableDevices.length} devices found. Click scan to search for HexaSend devices.`}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="max-w-md mx-auto space-y-6">
                      <Input
                        ref={receiveCodeInputRef}
                        type="text"
                        inputMode="text"
                        autoComplete="one-time-code"
                        placeholder="e.g. ABC123"
                        value={inputCode}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                          setInputCode(normalized);
                        }}
                        className="text-center text-lg md:text-2xl font-mono tracking-widest h-12 md:h-16 border-2 border-purple-200 focus:border-purple-500 bg-white min-h-[44px] focus-visible:ring-2"
                        maxLength={8}
                        aria-label="Enter 6-digit share code"
                      />
                      
                      <Button 
                        onClick={handleReceiveFile} 
                        className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                        disabled={(transferType === 'internet' && !isConnected) || inputCode.length !== 6 || isReceiving}
                        title={inputCode.length !== 6 ? "Enter a 6-character code" : transferType === 'internet' && !isConnected ? "Connect to the server first" : undefined}
                      >
                        {isReceiving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Receiving files…
                          </>
                        ) : inputCode.length === 6 ? 'Get My Files 🚀' : `Enter ${6 - inputCode.length} more characters`}
                      </Button>
                      {inputCode.length === 6 && !isReceiving && (
                        <p className="text-xs text-gray-500 text-center">We&apos;ll look for files with this code.</p>
                      )}

                      {isReceiving && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm text-gray-600">
                            {receiveProgress < 20 ? "Looking for files…" : receiveProgress < 100 ? "Requesting files…" : "Receiving files…"}
                            {expectedFilesCount > 1 && receivedFilesCount > 0 && ` Received ${receivedFilesCount} of ${expectedFilesCount} files.`}
                          </p>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>{receiveProgress < 20 ? "Requesting…" : "Receiving…"}</span>
                            <span>{Math.round(receiveProgress)}%</span>
                          </div>
                          <Progress value={receiveProgress} className="h-2" />
                          <p className="text-xs text-gray-500">If the sender just started, we&apos;ll retry automatically.</p>
                        </div>
                      )}
                      
                      {transferType === 'internet' && !isConnected && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 font-medium">🔄 Connecting to secure servers…</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 md:p-6 border border-blue-200">
                    <h4 className="font-bold text-gray-900 mb-3 text-sm md:text-base">💡 Quick Tips</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm text-gray-700">
                      <div>• Codes are case-insensitive</div>
                      <div>• Files download instantly</div>
                      <div>• Multiple files come as ZIP</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-8">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-8">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 w-16 h-16 mx-auto"></div>
                      <div className="relative bg-green-500 rounded-2xl p-4 w-fit mx-auto">
                        <CheckCircle className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg md:text-2xl font-bold text-green-800 mb-4">
                      {expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount 
                        ? `📥 Receiving Files... (${receivedFilesCount}/${expectedFilesCount})`
                        : `🎉 Files Ready to Download!`
                      }
                    </h3>
                    <p className="text-sm md:text-lg text-green-700 mb-6">
                      {expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount 
                        ? `${receivedFilesCount} of ${expectedFilesCount} files received. Please wait for all files to complete.`
                        : `${receivedFiles.length} file(s) successfully received and verified.`
                      }
                    </p>
                    
                    <div className="bg-white rounded-xl p-4 md:p-6 border border-green-300 mb-6">
                      <div className="grid gap-2 md:gap-3 max-h-48 overflow-y-auto">
                        {receivedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                              <div className="text-left min-w-0 flex-1">
                                <p className="font-medium text-gray-900 truncate text-sm md:text-base">{file.name}</p>
                                <p className="text-xs md:text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            {receivedFiles.length > 1 && (
                              <Button
                                onClick={() => downloadSingleFile(file)}
                                size="sm"
                                variant="outline"
                                className="ml-2 text-xs px-2 py-1 h-7 min-h-[44px] min-w-[44px] focus-visible:ring-2"
                                disabled={isDownloading}
                                aria-label={`Download ${file.name}`}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-2 md:p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs md:text-sm text-blue-700 font-medium">
                          Total: {(receivedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    
                    {receivedFiles.length > 1 ? (
                      <div className="space-y-3 mb-4">
                        <Button 
                          onClick={downloadFiles} 
                          className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:ring-2"
                          disabled={isDownloading || (expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount)}
                          aria-label={`Download all ${receivedFiles.length} files as ZIP`}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating ZIP…
                            </>
                          ) : (expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount) ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Waiting for {expectedFilesCount - receivedFilesCount} more files…
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Download All as ZIP ({receivedFiles.length} files)
                            </>
                          )}
                        </Button>
                        <p className="text-center text-xs text-gray-500">ZIP will be named files-{inputCode || "code"}.zip.</p>
                        {isDownloading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Preparing download…</span>
                              <span>{Math.round(downloadProgress)}%</span>
                            </div>
                            <Progress value={downloadProgress} className="h-2" />
                          </div>
                        )}
                        {expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-center text-xs md:text-sm text-yellow-700 font-medium">
                              ⏳ Still receiving files… {receivedFilesCount}/{expectedFilesCount} completed
                            </p>
                            <p className="text-center text-xs text-yellow-600 mt-1">
                              Download will be enabled when all files are received
                            </p>
                          </div>
                        ) : (
                          <p className="text-center text-xs md:text-sm text-gray-600">
                            Or download individual files using the buttons above
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 mb-4">
                        <Button 
                          onClick={downloadFiles} 
                          className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:ring-2"
                          disabled={isDownloading || (expectedFilesCount > 1 && receivedFilesCount < expectedFilesCount)}
                          aria-label={receivedFiles[0] ? `Download ${receivedFiles[0].name}` : "Download file"}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Downloading…
                            </>
                          ) : (expectedFilesCount > 1 && receivedFilesCount < expectedFilesCount) ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Waiting for {expectedFilesCount - receivedFilesCount} more files…
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              {receivedFiles[0] ? (receivedFiles[0].name.length > 25 ? "Download File" : `Download ${receivedFiles[0].name}`) : "Download File"}
                            </>
                          )}
                        </Button>
                        {isDownloading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Download in progress…</span>
                              <span>{Math.round(downloadProgress)}%</span>
                            </div>
                            <Progress value={downloadProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <Button 
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => {
                          setReceivedFiles([]);
                          setInputCode('');
                          setExpectedFilesCount(0);
                          setReceivedFilesCount(0);
                        }, 100);
                      }}
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2"
                    >
                      Receive More Files
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => setMode('send'), 100);
                      }}
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Send Files
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
