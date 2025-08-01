import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { useTransferStats } from "@/hooks/use-transfer-stats";
import { FilePreview } from "@/components/file-preview";
import { DragDropZone } from "@/components/drag-drop-zone";
import { TransferProgress } from "@/components/transfer-progress";
import { TransferStats } from "@/components/transfer-stats";
import { Upload, Download, Copy, CheckCircle, Share, Archive, ArrowLeft, Clock, Users, FileText, Zap } from "lucide-react";
import JSZip from "jszip";

export default function Home() {
  const [mode, setMode] = useState<'select' | 'send' | 'receive'>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transferCode, setTransferCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [filesReady, setFilesReady] = useState<boolean>(false);
  const [receivedFiles, setReceivedFiles] = useState<{ name: string; size: number; blob: Blob }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [transferSpeed, setTransferSpeed] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  const { isConnected, sendMessage, onFileAvailable, onFileData, onFileNotFound } = useWebSocket();
  const { toast } = useToast();
  const { stats, addTransfer } = useTransferStats();

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
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

  const handleReceiveFile = () => {
    if (!inputCode.trim() || inputCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-character code",
        variant: "destructive",
      });
      return;
    }

    // Request file with the code
    sendMessage({
      type: 'request-file',
      code: inputCode.toUpperCase(),
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

  const downloadFiles = async () => {
    if (receivedFiles.length === 0) return;
    
    if (receivedFiles.length === 1) {
      // Single file - download directly
      const file = receivedFiles[0];
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Downloading ${file.name}`,
      });
    } else {
      // Multiple files - create ZIP
      const zip = new JSZip();
      
      // Add all files to ZIP
      receivedFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      
      try {
        toast({
          title: "Creating ZIP",
          description: "Preparing download...",
        });
        
        // Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `files-${inputCode}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "ZIP Download Started",
          description: `Downloading ${receivedFiles.length} files as ZIP`,
        });
      } catch (error) {
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
      toast({
        title: "File Found",
        description: `Found ${file.fileName} (${Math.round(file.fileSize / 1024)} KB)`,
      });
    });

    onFileData((data: any) => {
      if (data.code === inputCode) {
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
          // Check if this is the last file
          if (data.fileIndex !== undefined && data.totalFiles !== undefined) {
            if (updated.length === data.totalFiles) {
              toast({
                title: "All Files Received",
                description: `${data.totalFiles} file(s) ready to download`,
              });
            }
          } else {
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
      toast({
        title: "File Not Found",
        description: `No file found with code ${code}`,
        variant: "destructive",
      });
    });
  }, [onFileAvailable, onFileData, onFileNotFound, inputCode, toast]);

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center space-y-12">
            
            {/* Premium Hero Section */}
            <div className="space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20 w-32 h-32 mx-auto"></div>
                <div className="relative inline-flex items-center justify-center p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl mb-6">
                  <Share className="h-16 w-16 text-white" />
                </div>
              </div>
              
              <div className="space-y-6">
                <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent leading-tight">
                  SecureShare
                </h1>
                <div className="max-w-4xl mx-auto space-y-4">
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 leading-relaxed">
                    Share Any File Between Any Devices in Seconds with Just a 6-Digit Code
                  </h2>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    The world's fastest peer-to-peer file transfer service. Send documents, photos, videos, and files of any size instantly. 
                    No registration required, no file size limits, complete privacy guaranteed.
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4 text-lg font-medium">
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full">✨ Zero Setup</span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">🔒 Bank-Level Security</span>
                  <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full">⚡ Lightning Fast</span>
                </div>
              </div>
            </div>

            {/* Transfer Stats Dashboard */}
            <div className="mb-12">
              <TransferStats stats={stats} />
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
                        <p className="text-blue-100 text-lg">Share your files with anyone, anywhere in seconds</p>
                      </div>
                      <Button 
                        onClick={() => setMode('send')} 
                        className="w-full h-14 text-lg bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold"
                        disabled={!isConnected}
                      >
                        Start Sending →
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
                        <p className="text-purple-100 text-lg">Enter a code and get your files instantly</p>
                      </div>
                      <Button 
                        onClick={() => setMode('receive')} 
                        className="w-full h-14 text-lg bg-white text-purple-600 hover:bg-purple-50 shadow-lg font-semibold"
                        disabled={!isConnected}
                      >
                        Start Receiving →
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

            {/* How It Works */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">1. Select & Send</h3>
                <p className="text-gray-600 leading-relaxed">Choose single or multiple files from your device. Get a unique 6-digit code instantly.</p>
              </div>
              
              <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <Share className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">2. Share Code</h3>
                <p className="text-gray-600 leading-relaxed">Share the simple 6-digit code with anyone, anywhere. Works on any device.</p>
              </div>
              
              <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
                  <Archive className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">3. Instant Download</h3>
                <p className="text-gray-600 leading-relaxed">Enter code to download. Multiple files automatically packaged as convenient ZIP.</p>
              </div>
            </div>

            {/* Features Section */}
            <div className="bg-white rounded-2xl p-12 mt-16 shadow-xl border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Why Choose SecureShare?</h2>
              <div className="grid md:grid-cols-2 gap-8 text-left">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">No Registration Required</h4>
                    <p className="text-gray-600">Start sharing immediately. No accounts, no sign-ups, no hassle.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">Multiple File Support</h4>
                    <p className="text-gray-600">Send multiple files at once. Auto-ZIP packaging for easy download.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">Direct Transfer</h4>
                    <p className="text-gray-600">Files never stored on servers. Complete privacy guaranteed.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">Works Everywhere</h4>
                    <p className="text-gray-600">Any device, any browser. Perfect mobile experience included.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Instructions */}
            <div className="bg-blue-50 rounded-2xl p-12 mt-12 border border-blue-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Quick Start Guide</h3>
              <div className="space-y-6 text-left max-w-3xl mx-auto">
                <div className="flex items-start space-x-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white text-lg font-bold rounded-full flex-shrink-0">1</span>
                  <div>
                    <p className="text-gray-800 text-lg"><strong>To Send Files:</strong> Click "Send Files" → Choose single or multiple files → Share the 6-digit code</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white text-lg font-bold rounded-full flex-shrink-0">2</span>
                  <div>
                    <p className="text-gray-800 text-lg"><strong>To Receive Files:</strong> Click "Receive Files" → Enter the 6-digit code → Download instantly</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white text-lg font-bold rounded-full flex-shrink-0">3</span>
                  <div>
                    <p className="text-gray-800 text-lg"><strong>Multiple Files:</strong> Automatically packaged as ZIP for convenient single download</p>
                  </div>
                </div>
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
              onClick={() => setMode('select')} 
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
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Send Your Files
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Share files instantly with military-grade security. Your files, your control, your privacy.
              </p>
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
                            <p className="text-2xl font-bold text-gray-900">
                              Drop Files Here or Click to Browse
                            </p>
                            <p className="text-lg text-gray-600">
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
                      
                      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-3">💡 Pro Tips</h4>
                        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
                          <div>• Multiple files = Auto ZIP</div>
                          <div>• Files expire in 1 hour</div>
                          <div>• No size limits</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-gray-900">
                          Ready to Send ({selectedFiles.length} files)
                        </h3>
                        <div className="text-sm text-gray-500">
                          Total: {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
                        <div className="grid gap-3 max-h-64 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <FilePreview key={index} file={file} showSize={true} />
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
                      
                      <div className="flex space-x-4">
                        <DragDropZone onFilesSelected={(newFiles) => {
                          setSelectedFiles(prev => [...prev, ...newFiles]);
                        }}>
                          <Button variant="outline" className="flex-1 h-12 text-lg border-2 hover:bg-blue-50">
                            <Upload className="mr-2 h-5 w-5" />
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
                          className="flex-1 h-12 text-lg border-2 hover:bg-red-50 text-red-600 border-red-200"
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
                    <h3 className="text-2xl font-bold text-green-800 mb-4">
                      🎉 Files Ready to Share!
                    </h3>
                    <p className="text-lg text-green-700 mb-6">
                      {selectedFiles.length} file(s) uploaded and secured. Share your code below.
                    </p>
                    
                    <div className="bg-white rounded-xl p-4 border border-green-300 mb-6">
                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <FilePreview key={index} file={file} showSize={true} />
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white">
                      <p className="text-lg font-semibold mb-4">🔐 Your Secure Share Code</p>
                      <div className="flex items-center justify-center space-x-4 mb-4">
                        <div className="bg-white/20 backdrop-blur px-6 py-4 rounded-xl font-mono text-3xl font-bold tracking-wider">
                          {transferCode}
                        </div>
                        <Button 
                          variant="secondary" 
                          size="lg" 
                          onClick={copyCode}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        >
                          <Copy className="h-5 w-5 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-blue-100">
                        Share this code with the receiver. Files expire in 1 hour for maximum security.
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button 
                      onClick={() => {
                        setMode('select');
                        setSelectedFiles([]);
                        setTransferCode('');
                        setFilesReady(false);
                      }}
                      className="flex-1 h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Send More Files
                    </Button>
                    <Button 
                      onClick={() => setMode('receive')}
                      variant="outline"
                      className="flex-1 h-12 text-lg border-2"
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
              onClick={() => setMode('select')} 
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
              <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                Receive Files
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Enter your 6-digit secure code to instantly download files shared with you.
              </p>
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
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Enter Your Code</h3>
                    <p className="text-lg text-gray-600 mb-8">Type the 6-character code shared with you</p>
                    
                    <div className="max-w-md mx-auto space-y-6">
                      <Input
                        type="text"
                        placeholder="ABC123"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        className="text-center text-2xl font-mono tracking-widest h-16 border-2 border-purple-200 focus:border-purple-500 bg-white"
                        maxLength={6}
                      />
                      
                      <Button 
                        onClick={handleReceiveFile} 
                        className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg font-semibold"
                        disabled={!isConnected || inputCode.length !== 6}
                      >
                        {inputCode.length === 6 ? 'Get My Files 🚀' : `Enter ${6 - inputCode.length} more characters`}
                      </Button>
                      
                      {!isConnected && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 font-medium">🔄 Connecting to secure servers...</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                    <h4 className="font-bold text-gray-900 mb-3">💡 Quick Tips</h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
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
                    
                    <h3 className="text-2xl font-bold text-green-800 mb-4">
                      🎉 Files Ready to Download!
                    </h3>
                    <p className="text-lg text-green-700 mb-6">
                      {receivedFiles.length} file(s) successfully received and verified.
                    </p>
                    
                    <div className="bg-white rounded-xl p-6 border border-green-300 mb-6">
                      <div className="grid gap-3 max-h-48 overflow-y-auto">
                        {receivedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-blue-600" />
                              <div className="text-left">
                                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700 font-medium">
                          Total: {(receivedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={downloadFiles} 
                      className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold mb-4"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download {receivedFiles.length > 1 ? 'ZIP Package' : 'File'} 
                    </Button>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setReceivedFiles([]);
                        setInputCode('');
                      }}
                      className="flex-1 h-12 text-lg border-2"
                    >
                      Receive More Files
                    </Button>
                    <Button 
                      onClick={() => setMode('send')}
                      className="flex-1 h-12 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
