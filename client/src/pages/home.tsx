import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Copy, CheckCircle, Share, Archive, ArrowLeft } from "lucide-react";
import JSZip from "jszip";

export default function Home() {
  const [mode, setMode] = useState<'select' | 'send' | 'receive'>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transferCode, setTransferCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [filesReady, setFilesReady] = useState<boolean>(false);
  const [receivedFiles, setReceivedFiles] = useState<{ name: string; size: number; blob: Blob }[]>([]);

  const { isConnected, sendMessage, onFileAvailable, onFileData, onFileNotFound } = useWebSocket();
  const { toast } = useToast();

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      const code = generateCode();
      setTransferCode(code);
      
      // Process all files
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
            
            resolve();
          };
          reader.readAsDataURL(file);
        });
      });

      // Wait for all files to be processed
      await Promise.all(filePromises);
      
      setFilesReady(true);
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

    onFileData((data) => {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto py-12">
          <div className="text-center space-y-8">
            {/* Hero Section */}
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-4">
                <Share className="h-12 w-12 text-blue-600" />
              </div>
              <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
                SecureShare
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Share files instantly across devices with just a 6-digit code. No accounts, no limits, no complexity.
              </p>
              <p className="text-lg text-blue-600 font-medium">
                Simple • Secure • Lightning Fast
              </p>
            </div>

            {/* Main Action Card */}
            <div className="max-w-md mx-auto">
              <Card className="shadow-xl border-0">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <Button 
                      onClick={() => setMode('send')} 
                      className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700 shadow-lg"
                      disabled={!isConnected}
                    >
                      <Upload className="mr-3 h-6 w-6" />
                      Send Files
                    </Button>
                    
                    <Button 
                      onClick={() => setMode('receive')} 
                      variant="outline" 
                      className="w-full h-16 text-xl border-2 hover:bg-gray-50 shadow-lg"
                      disabled={!isConnected}
                    >
                      <Download className="mr-3 h-6 w-6" />
                      Receive Files
                    </Button>

                    {!isConnected && (
                      <p className="text-sm text-red-600 mt-4">Connecting to server...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Button 
              variant="ghost" 
              onClick={() => setMode('select')} 
              className="mb-4"
            >
              ← Back
            </Button>

            <div className="text-center">
              <Upload className="h-16 w-16 text-blue-600 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send Files</h2>

              {!filesReady ? (
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                      multiple
                    />
                    <label htmlFor="file-input" className="cursor-pointer block">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Click to select files</p>
                      <p className="text-sm text-gray-500 mt-1">You can select multiple files</p>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-800">{selectedFiles.length} file(s) selected</p>
                    <div className="text-sm text-green-600 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="truncate">{file.name}</span>
                          <span>{Math.round(file.size / 1024)} KB</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      Total: {Math.round(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024)} KB
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 mb-2">Share this code:</p>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="bg-white px-4 py-2 rounded border font-mono text-lg font-bold">
                        {transferCode}
                      </div>
                      <Button variant="outline" size="sm" onClick={copyCode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    The receiver should enter this code to download all files
                  </p>

                  <Button 
                    onClick={() => {
                      setMode('select');
                      setSelectedFiles([]);
                      setTransferCode('');
                      setFilesReady(false);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Send More Files
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'receive') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Button 
              variant="ghost" 
              onClick={() => setMode('select')} 
              className="mb-4"
            >
              ← Back
            </Button>

            <div className="text-center">
              <Download className="h-16 w-16 text-blue-600 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-gray-900 mb-6">Receive Files</h2>

              {receivedFiles.length === 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 mb-4">Enter the 6-character code:</p>
                    <Input
                      type="text"
                      placeholder="ABC123"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      className="text-center text-lg font-mono"
                      maxLength={6}
                    />
                  </div>

                  <Button 
                    onClick={handleReceiveFile}
                    className="w-full"
                    disabled={inputCode.length !== 6}
                  >
                    Get File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-800">{receivedFiles.length} file(s) received</p>
                    <div className="text-sm text-green-600 max-h-32 overflow-y-auto">
                      {receivedFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="truncate">{file.name}</span>
                          <span>{Math.round(file.size / 1024)} KB</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      Total: {Math.round(receivedFiles.reduce((acc, f) => acc + f.size, 0) / 1024)} KB
                    </p>
                  </div>

                  <Button onClick={downloadFiles} className="w-full">
                    {receivedFiles.length === 1 ? (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download File
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Download as ZIP
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={() => {
                      setMode('select');
                      setInputCode('');
                      setReceivedFiles([]);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Receive More Files
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
