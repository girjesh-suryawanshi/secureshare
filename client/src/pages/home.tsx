import { useState } from "react";
import { ConnectionPanel } from "@/components/connection-panel";
import { FileTransferPanel } from "@/components/file-transfer-panel";
import { IncomingFiles } from "@/components/incoming-files";
import { StatusBar } from "@/components/status-bar";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useWebSocket } from "@/hooks/use-websocket";
import { Share, Wifi } from "lucide-react";
import type { SelectedFile, FileTransfer, PeerConnection } from "@shared/schema";

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<PeerConnection[]>([]);

  const { isConnected: wsConnected, connectionId, sendMessage } = useWebSocket();
  const { 
    peerConnections, 
    connectToPeer, 
    sendFiles, 
    incomingFileRequests,
    acceptFileTransfer,
    declineFileTransfer 
  } = useWebRTC(sendMessage);

  const connectionStatus = wsConnected ? 'connected' : 'disconnected';
  const webrtcStatus = peerConnections.size > 0 ? 'WebRTC Connected' : 'WebRTC Ready';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Share className="text-material-blue text-2xl mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">SecureShare</h1>
              <span className="ml-2 px-2 py-1 bg-material-green text-white text-xs rounded-full">P2P</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 animate-pulse-slow ${
                  connectionStatus === 'connected' ? 'bg-material-green' : 'bg-material-red'
                }`} />
                <span className="text-sm text-gray-600 capitalize">{connectionStatus}</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <Wifi className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <ConnectionPanel
            connectionId={connectionId}
            connectedPeers={connectedPeers}
            onConnect={connectToPeer}
            isConnected={wsConnected}
          />
          
          <FileTransferPanel
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            transfers={transfers}
            onSendFiles={sendFiles}
            connectedPeers={connectedPeers}
          />
        </div>

        <IncomingFiles
          incomingRequests={incomingFileRequests}
          onAccept={acceptFileTransfer}
          onDecline={declineFileTransfer}
        />
      </main>

      <StatusBar
        webrtcStatus={webrtcStatus}
        activeTransfers={transfers.filter(t => t.status === 'active').length}
        queuedTransfers={transfers.filter(t => t.status === 'pending').length}
        completedTransfers={transfers.filter(t => t.status === 'completed').length}
      />
    </div>
  );
}
