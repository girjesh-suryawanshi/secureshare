import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Copy, CheckCircle, Share, Archive } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Share className="h-16 w-16 text-blue-600 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">File Share</h1>
            <p className="text-gray-600 mb-8">Share files directly between devices</p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => setMode('send')} 
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                disabled={!isConnected}
              >
                <Upload className="mr-2 h-5 w-5" />
                Send File
              </Button>
              
              <Button 
                onClick={() => setMode('receive')} 
                variant="outline" 
                className="w-full h-12 text-lg"
                disabled={!isConnected}
              >
                <Download className="mr-2 h-5 w-5" />
                Receive File
              </Button>
            </div>

            {!isConnected && (
              <p className="text-sm text-red-600 mt-4">Connecting to server...</p>
            )}
          </CardContent>
        </Card>
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
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send File</h2>

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
              <h2 className="text-xl font-bold text-gray-900 mb-6">Receive File</h2>

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
