import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, Copy, QrCode, Smartphone, Monitor, Plug } from "lucide-react";
import type { PeerConnection } from "@shared/schema";

interface ConnectionPanelProps {
  connectionId: string | null;
  connectedPeers: PeerConnection[];
  onConnect: (targetId: string) => void;
  isConnected: boolean;
}

export function ConnectionPanel({ 
  connectionId, 
  connectedPeers, 
  onConnect, 
  isConnected 
}: ConnectionPanelProps) {
  const [targetConnectionId, setTargetConnectionId] = useState("");
  const { toast } = useToast();

  const handleCopyConnectionId = async () => {
    if (!connectionId) return;
    
    try {
      await navigator.clipboard.writeText(connectionId);
      toast({
        title: "Connection ID Copied",
        description: "Share this ID with the other device",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleConnect = () => {
    if (!targetConnectionId.trim()) {
      toast({
        title: "Invalid ID",
        description: "Please enter a valid connection ID",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for WebSocket connection",
        variant: "destructive",
      });
      return;
    }

    onConnect(targetConnectionId.trim().toUpperCase());
    setTargetConnectionId("");
  };

  const handleGenerateQR = () => {
    if (!connectionId) return;
    
    // In a real implementation, this would generate a QR code
    toast({
      title: "QR Code Generated",
      description: "QR code ready for scanning",
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="text-material-green" />;
      case 'desktop':
        return <Monitor className="text-material-green" />;
      default:
        return <Monitor className="text-material-green" />;
    }
  };

  return (
    <div className="lg:col-span-1 space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <Link className="text-material-blue mr-2" />
            Device Connection
          </h2>
          
          {/* Connection ID Display */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Your Connection ID
            </Label>
            <div className="flex items-center">
              <Input
                value={connectionId || "Connecting..."}
                readOnly
                className="flex-1 font-mono bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={handleCopyConnectionId}
                disabled={!connectionId}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share this ID with the other device
            </p>
          </div>

          {/* Connect to Device */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Connect to Device
            </Label>
            <div className="flex">
              <Input
                placeholder="Enter connection ID (e.g., DEF-456-ABC)"
                value={targetConnectionId}
                onChange={(e) => setTargetConnectionId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                className="flex-1 rounded-r-none"
              />
              <Button
                onClick={handleConnect}
                disabled={!isConnected || !targetConnectionId.trim()}
                className="bg-material-green hover:bg-green-600 rounded-l-none"
              >
                <Plug className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code Option */}
          <div className="border-t border-gray-200 pt-6">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <QrCode className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Scan QR code to connect</p>
              <Button
                variant="link"
                size="sm"
                onClick={handleGenerateQR}
                disabled={!connectionId}
                className="mt-2 text-material-blue"
              >
                Generate QR Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Monitor className="text-material-blue mr-2" />
            Connected Devices
          </h3>
          
          {connectedPeers.length > 0 ? (
            <div className="space-y-3">
              {connectedPeers.map((peer) => (
                <div key={peer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="mr-3">
                      {getDeviceIcon(peer.deviceType ?? 'desktop')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{peer.name}</p>
                      <p className="text-sm text-gray-500">{peer.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      peer.status === 'connected' ? 'bg-material-green' : 
                      peer.status === 'connecting' ? 'bg-material-amber' : 'bg-material-red'
                    }`} />
                    <span className="text-sm text-gray-600 capitalize">{peer.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Monitor className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No devices connected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
