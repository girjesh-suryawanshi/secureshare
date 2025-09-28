import { useState, useEffect } from "react";
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
import JSZip from "jszip";
import type { TransferType } from "@shared/schema";

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

  const { isConnected, sendMessage, onFileAvailable, onFileData, onFileNotFound, onDownloadAck } = useWebSocket();
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

  const handleFilesSelected = async (files: File[]) => {
    if (files.length > 0) {
      setSelectedFiles(files);
      setIsUploading(true);
      setUploadProgress(0);
      
      const code = generateCode();
      setTransferCode(code);
      
      // Handle local network transfer
      if (transferType === 'local') {
        const serverInfo = await startLocalServer(files, code);
        if (serverInfo) {
          setUploadProgress(100);
          setIsUploading(false);
          setFilesReady(true);
          toast({
            title: "Local Server Ready",
            description: `Files available on local network. Share code ${code}`,
          });
        }
        return;
      }
      
      const startTime = Date.now();
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      // Process all files with progress tracking
      const filePromises = files.map((file, index) => {
        return new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            
            // Register each file with the same code but different index
            sendMessage({
              type: 'register-file',
              code: code,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              fileIndex: index,
              totalFiles: files.length,
              transferType: transferType,
            });

            // Send file data
            sendMessage({
              type: 'file-data',
              code: code,
              fileName: file.name,
              data: base64Data,
              fileIndex: index,
            });
            
            // Update progress
            const progress = ((index + 1) / files.length) * 100;
            setUploadProgress(progress);
            
            // Calculate transfer speed and estimated time
            const elapsedTime = (Date.now() - startTime) / 1000;
            const bytesProcessed = files.slice(0, index + 1).reduce((sum, f) => sum + f.size, 0);
            const speed = bytesProcessed / elapsedTime;
            const remaining = totalSize - bytesProcessed;
            const eta = remaining / speed;
            
            setTransferSpeed(formatSpeed(speed));
            setEstimatedTime(eta > 0 ? formatTime(eta) : '');
            
            resolve();
          };
          reader.readAsDataURL(file);
        });
      });

      // Wait for all files to be processed
      await Promise.all(filePromises);
      
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
    if (!inputCode.trim() || inputCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-character code",
        variant: "destructive",
      });
      return;
    }

    const upperCode = inputCode.toUpperCase();
    setIsReceiving(true);
    setReceiveProgress(10);

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
          const files = await response.json();
          console.log(`Found ${files.length} files on local network`);
          setReceiveProgress(60);
          
          // Validate that files have data
          const validFiles = files.filter((file: any) => file.data && file.data.length > 0);
          if (validFiles.length === 0) {
            throw new Error('No valid file data found');
          }
          
          // Convert files to blobs and set as received files
          const processedFiles = validFiles.map((file: any) => {
            try {
              // Decode base64 data to binary
              const binaryString = atob(file.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              return {
                name: file.fileName,
                size: file.fileSize,
                blob: new Blob([bytes], { type: file.fileType || 'application/octet-stream' })
              };
            } catch (error) {
              console.error(`Error processing file ${file.fileName}:`, error);
              throw error;
            }
          });
          
          setReceivedFiles(processedFiles);
          setReceiveProgress(100);
          setTimeout(() => {
            setIsReceiving(false);
            setReceiveProgress(0);
          }, 1000);
          
          // Add transfer stats for each file
          processedFiles.forEach(file => {
            addTransfer({
              type: 'received',
              fileName: file.name,
              size: file.size
            });
          });
          
          toast({
            title: "Files Received Locally",
            description: `${validFiles.length} file(s) received from local network`,
          });
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

    // Internet transfer - existing logic
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
          
          // Send success acknowledgment to sender
          sendMessage({
            type: 'download-success',
            code: inputCode,
            fileName: 'Multiple files',
            totalFiles: receivedFiles.length,
            completedFiles: receivedFiles.length
          });
        }, 1000);
        
        toast({
          title: "ZIP Download Started",
          description: `Downloading ${receivedFiles.length} files as ZIP`,
        });
      } catch (error) {
        setIsDownloading(false);
        setDownloadProgress(0);
        
        // Send error acknowledgment to sender
        sendMessage({
          type: 'download-error',
          code: inputCode,
          fileName: 'ZIP creation',
          error: 'Failed to create ZIP file'
        });
        
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
    onFileAvailable((file) => {
      setReceiveProgress(30);
      
      // Set expected files count from the first file metadata
      if (file.totalFiles && expectedFilesCount === 0) {
        setExpectedFilesCount(file.totalFiles);
        console.log(`Expecting ${file.totalFiles} total files`);
      }
      
      toast({
        title: "File Found",
        description: `Found ${file.fileName} (${Math.round(file.fileSize / 1024)} KB) - ${file.fileIndex + 1}/${file.totalFiles}`,
      });
    });

    onFileData((data: any) => {
      if (data.code === inputCode) {
        setReceiveProgress(50);
        
        // Convert base64 back to blob
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and add to received files
        const blob = new Blob([bytes]);
        const newFile = {
          name: data.fileName || 'downloaded-file',
          size: blob.size,
          blob: blob,
        };

        // Add to transfer stats
        addTransfer({
          type: 'received',
          fileName: newFile.name,
          size: newFile.size
        });

        setReceivedFiles(prev => {
          const updated = [...prev, newFile];
          const newReceivedCount = updated.length;
          setReceivedFilesCount(newReceivedCount);
          
          // Check if this is the last file
          if (data.fileIndex !== undefined && data.totalFiles !== undefined) {
            // Update expected count if not set
            if (expectedFilesCount === 0) {
              setExpectedFilesCount(data.totalFiles);
            }
            
            const progress = 50 + ((newReceivedCount / data.totalFiles) * 40); // 50-90%
            setReceiveProgress(progress);
            
            console.log(`Received ${newReceivedCount}/${data.totalFiles} files`);
            
            if (newReceivedCount === data.totalFiles) {
              setReceiveProgress(100);
              setTimeout(() => {
                setIsReceiving(false);
                setReceiveProgress(0);
              }, 1000);
              
              toast({
                title: "✅ All Files Received!",
                description: `${data.totalFiles} file(s) ready to download`,
              });
            } else {
              toast({
                title: `📥 File ${newReceivedCount}/${data.totalFiles} Received`,
                description: `${data.fileName} - ${data.totalFiles - newReceivedCount} files remaining`,
              });
            }
          } else {
            setReceiveProgress(90);
            setTimeout(() => {
              setIsReceiving(false);
              setReceiveProgress(0);
            }, 500);
            
            toast({
              title: "File Received",
              description: "File is ready to download",
            });
          }
          return updated;
        });
      }
    });

    onFileNotFound((code) => {
      setIsReceiving(false);
      setReceiveProgress(0);
      toast({
        title: "File Not Found",
        description: `No file found with code ${code}`,
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
  }, [onFileAvailable, onFileData, onFileNotFound, onDownloadAck, inputCode, toast]);

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

            {/* Transfer Type Selection */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Choose Transfer Method</h3>
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
                    <div className="font-medium">Internet Transfer</div>
                    <div className="text-xs mt-1">Works anywhere</div>
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
                    <div className="font-medium">Local Network</div>
                    <div className="text-xs mt-1">Same WiFi/Hotspot</div>
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
                        className="w-full h-12 text-base bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold"
                        disabled={!isConnected}
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
                        className="w-full h-12 text-base bg-white text-purple-600 hover:bg-purple-50 shadow-lg font-semibold"
                        disabled={!isConnected}
                      >
                        Start Receiving {transferType === 'local' ? '(Local)' : ''}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {!isConnected && (
                <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 font-medium">🔄 Connecting to secure servers...</p>
                </div>
              )}
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
                      <DragDropZone onFilesSelected={handleFilesSelected}>
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
                              Support for any file type • Multiple files automatically ZIP packaged
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
                          <div>• Multiple files = Auto ZIP</div>
                          <div>• Files expire in 1 hour</div>
                          <div>• No size limits</div>
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
                      
                      {isUploading && (
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                          <TransferProgress
                            progress={uploadProgress}
                            transferSpeed={transferSpeed}
                            estimatedTime={estimatedTime}
                            fileName={selectedFiles.length > 1 ? `${selectedFiles.length} files` : selectedFiles[0]?.name}
                          />
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <DragDropZone onFilesSelected={(newFiles) => {
                          setSelectedFiles(prev => [...prev, ...newFiles]);
                        }}>
                          <Button variant="outline" className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2 hover:bg-blue-50">
                            <Upload className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                            Add More Files
                          </Button>
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
                    <p className="text-sm md:text-lg text-green-700 mb-6">
                      {selectedFiles.length} file(s) uploaded and secured. Share your code below.
                    </p>
                    
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
                        <div className="bg-white/20 backdrop-blur px-4 md:px-6 py-3 md:py-4 rounded-xl font-mono text-xl md:text-3xl font-bold tracking-wider">
                          {transferCode}
                        </div>
                        <Button 
                          variant="secondary" 
                          size="lg" 
                          onClick={copyCode}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full sm:w-auto"
                        >
                          <Copy className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                          Copy
                        </Button>
                      </div>
                      {transferType === 'local' && localServerInfo ? (
                        <div className="mt-6 p-4 bg-white/10 rounded-xl">
                          <div className="grid md:grid-cols-2 gap-4 items-center">
                            <div>
                              <p className="text-white/90 text-sm mb-2">
                                <Wifi className="w-4 h-4 inline mr-2" />
                                Server: {localServerInfo.ip}:{localServerInfo.port}
                              </p>
                              <p className="text-white/80 text-xs">
                                Devices on same WiFi/hotspot can download using the code above
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="bg-white p-3 rounded-lg inline-block">
                                <img src={localServerInfo.qrCode} alt="QR Code" className="w-20 h-20" />
                              </div>
                              <p className="text-white/80 text-xs mt-2">QR Code for quick access</p>
                            </div>
                          </div>
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
                        type="text"
                        placeholder="ABC123"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        className="text-center text-lg md:text-2xl font-mono tracking-widest h-12 md:h-16 border-2 border-purple-200 focus:border-purple-500 bg-white"
                        maxLength={6}
                      />
                      
                      <Button 
                        onClick={handleReceiveFile} 
                        className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg font-semibold"
                        disabled={(transferType === 'internet' && !isConnected) || inputCode.length !== 6 || isReceiving}
                      >
                        {isReceiving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Receiving Files...
                          </>
                        ) : inputCode.length === 6 ? 'Get My Files 🚀' : `Enter ${6 - inputCode.length} more characters`}
                      </Button>

                      {isReceiving && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Receiving files...</span>
                            <span>{Math.round(receiveProgress)}%</span>
                          </div>
                          <Progress value={receiveProgress} className="h-2" />
                        </div>
                      )}
                      
                      {!isConnected && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 font-medium">🔄 Connecting to secure servers...</p>
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
                                className="ml-2 text-xs px-2 py-1 h-7"
                                disabled={isDownloading}
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
                          className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isDownloading || (expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount)}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating ZIP...
                            </>
                          ) : (expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount) ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Waiting for {expectedFilesCount - receivedFilesCount} more files...
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Download All as ZIP ({receivedFiles.length} files)
                            </>
                          )}
                        </Button>
                        {isDownloading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Preparing download...</span>
                              <span>{Math.round(downloadProgress)}%</span>
                            </div>
                            <Progress value={downloadProgress} className="h-2" />
                          </div>
                        )}
                        {expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-center text-xs md:text-sm text-yellow-700 font-medium">
                              ⏳ Still receiving files... {receivedFilesCount}/{expectedFilesCount} completed
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
                          className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isDownloading || (expectedFilesCount > 1 && receivedFilesCount < expectedFilesCount)}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Downloading...
                            </>
                          ) : (expectedFilesCount > 1 && receivedFilesCount < expectedFilesCount) ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Waiting for {expectedFilesCount - receivedFilesCount} more files...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Download File
                            </>
                          )}
                        </Button>
                        {isDownloading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Download in progress...</span>
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
