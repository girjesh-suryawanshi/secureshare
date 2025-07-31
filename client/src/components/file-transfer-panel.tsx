import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, getFileIcon, getFileIconColor } from "@/lib/file-utils";
import { Upload, FolderOpen, Send, X, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { SelectedFile, FileTransfer, PeerConnection } from "@shared/schema";

interface FileTransferPanelProps {
  selectedFiles: SelectedFile[];
  setSelectedFiles: (files: SelectedFile[]) => void;
  transfers: FileTransfer[];
  onSendFiles: (files: SelectedFile[], peerId: string) => void;
  connectedPeers: PeerConnection[];
}

export function FileTransferPanel({ 
  selectedFiles, 
  setSelectedFiles, 
  transfers, 
  onSendFiles,
  connectedPeers 
}: FileTransferPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: SelectedFile[] = Array.from(files).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setSelectedFiles([...selectedFiles, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(selectedFiles.filter(f => f.id !== fileId));
  };

  const handleSendFiles = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to send",
        variant: "destructive",
      });
      return;
    }

    if (connectedPeers.length === 0) {
      toast({
        title: "No Connected Devices",
        description: "Please connect to a device first",
        variant: "destructive",
      });
      return;
    }

    // For simplicity, send to the first connected peer
    // In a real app, you'd let the user choose
    const targetPeer = connectedPeers[0];
    onSendFiles(selectedFiles, targetPeer.id);
    setSelectedFiles([]);
  };

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  const getTransferStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-material-green" />;
      case 'failed':
        return <AlertCircle className="text-material-red" />;
      case 'active':
        return <div className="w-4 h-4 border-2 border-material-blue border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="text-gray-400" />;
    }
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* File Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <Upload className="text-material-blue mr-2" />
            Send Files
          </h2>
          
          {/* Drop Zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-material-blue transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to select
            </h3>
            <p className="text-gray-600 mb-4">
              Support for all file types up to browser limits
            </p>
            <Button className="bg-material-blue hover:bg-blue-600">
              <FolderOpen className="mr-2 h-4 w-4" />
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">
                Selected Files ({selectedFiles.length})
              </h4>
              
              <div className="space-y-2 mb-4">
                {selectedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center flex-1">
                      <i className={`${getFileIcon(file.name)} ${getFileIconColor(file.name)} text-xl mr-3`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-material-red"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Total: <span className="font-medium">{formatFileSize(totalSize)}</span>
                </div>
                <Button 
                  onClick={handleSendFiles}
                  className="bg-material-orange hover:bg-orange-600"
                  disabled={connectedPeers.length === 0}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Files
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Status */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <Send className="text-material-blue mr-2" />
            Transfer Status
          </h2>

          {transfers.length > 0 ? (
            <div className="space-y-6">
              {/* Active Transfers */}
              {transfers.filter(t => t.status === 'active').map((transfer) => (
                <div key={transfer.id} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <i className={`${getFileIcon(transfer.fileName)} ${getFileIconColor(transfer.fileName)} text-lg mr-3`} />
                      <div>
                        <p className="font-medium text-gray-900">{transfer.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {transfer.direction === 'sending' ? 'To:' : 'From:'} {transfer.peerId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {Math.round((transfer.progress / 100) * transfer.fileSize / 1024 / 1024 * 10) / 10} MB / {Math.round(transfer.fileSize / 1024 / 1024 * 10) / 10} MB
                      </p>
                      <p className="text-sm text-gray-500">
                        {Math.round(transfer.progress)}% • {transfer.timeRemaining || 0}s remaining
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-material-green h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${transfer.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Speed: {transfer.speed || 0} KB/s</span>
                    <span>P2P Connection</span>
                  </div>
                </div>
              ))}

              {/* Transfer Queue */}
              {transfers.filter(t => t.status === 'pending').length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">
                    Queue ({transfers.filter(t => t.status === 'pending').length} files)
                  </h4>
                  
                  {transfers.filter(t => t.status === 'pending').map((transfer) => (
                    <div key={transfer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <i className={`${getFileIcon(transfer.fileName)} ${getFileIconColor(transfer.fileName)} text-lg mr-3`} />
                        <div>
                          <p className="font-medium text-gray-900">{transfer.fileName}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(transfer.fileSize)} • Waiting
                          </p>
                        </div>
                      </div>
                      <Clock className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Transfers */}
              {transfers.filter(t => t.status === 'completed' || t.status === 'failed').length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Transfers</h4>
                  
                  <div className="space-y-2">
                    {transfers
                      .filter(t => t.status === 'completed' || t.status === 'failed')
                      .slice(0, 5)
                      .map((transfer) => (
                        <div key={transfer.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center">
                            {getTransferStatusIcon(transfer.status)}
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{transfer.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {transfer.status === 'completed' ? 'Completed' : 'Failed'} • {formatFileSize(transfer.fileSize)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs ${
                            transfer.status === 'completed' ? 'text-material-green' : 'text-material-red'
                          }`}>
                            {transfer.status === 'completed' ? 'Complete' : 'Failed'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Send className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No active transfers</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
