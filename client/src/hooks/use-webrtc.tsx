import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, createFileChunks, reconstructFileFromChunks } from "@/lib/file-utils";
import type { SelectedFile, FileTransferRequest, FileChunk, PeerConnection } from "@shared/schema";

interface FileTransferState {
  fileName: string;
  totalSize: number;
  receivedChunks: Map<number, string>;
  totalChunks: number;
  progress: number;
}

interface IncomingFileRequest {
  id: string;
  fromPeer: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

export function useWebRTC(sendSignalingMessage: (message: any) => void) {
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [dataChannels, setDataChannels] = useState<Map<string, RTCDataChannel>>(new Map());
  const [incomingFileRequests, setIncomingFileRequests] = useState<IncomingFileRequest[]>([]);
  const [activeTransfers, setActiveTransfers] = useState<Map<string, FileTransferState>>(new Map());
  const { toast } = useToast();

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers });
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          targetId: peerId,
          data: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        toast({
          title: "Device Connected",
          description: `Successfully connected to ${peerId}`,
        });
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        toast({
          title: "Device Disconnected",
          description: `Lost connection to ${peerId}`,
          variant: "destructive",
        });
        setPeerConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
        setDataChannels(prev => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
      }
    };

    return pc;
  }, [sendSignalingMessage, toast]);

  const setupDataChannel = useCallback((channel: RTCDataChannel, peerId: string) => {
    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      setDataChannels(prev => new Map(prev).set(peerId, channel));
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      setDataChannels(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'file-transfer-request') {
          const request: IncomingFileRequest = {
            id: `${peerId}-${Date.now()}`,
            fromPeer: peerId,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            totalChunks: data.chunks,
          };
          setIncomingFileRequests(prev => [...prev, request]);
        } else if (data.type === 'file-chunk') {
          handleFileChunk(data, peerId);
        } else if (data.type === 'transfer-accepted') {
          // Start sending file chunks
          toast({
            title: "Transfer Accepted",
            description: `${peerId} accepted the file transfer`,
          });
        } else if (data.type === 'transfer-declined') {
          toast({
            title: "Transfer Declined",
            description: `${peerId} declined the file transfer`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
  }, [toast]);

  const handleFileChunk = useCallback((chunk: FileChunk, peerId: string) => {
    const transferKey = `${peerId}-${chunk.fileName}`;
    
    setActiveTransfers(prev => {
      const newMap = new Map(prev);
      let transfer = newMap.get(transferKey);
      
      if (!transfer) {
        transfer = {
          fileName: chunk.fileName,
          totalSize: 0,
          receivedChunks: new Map(),
          totalChunks: chunk.totalChunks,
          progress: 0,
        };
      }
      
      transfer.receivedChunks.set(chunk.chunkIndex, chunk.data);
      transfer.progress = (transfer.receivedChunks.size / transfer.totalChunks) * 100;
      
      newMap.set(transferKey, transfer);
      
      // If all chunks received, reconstruct file
      if (transfer.receivedChunks.size === transfer.totalChunks) {
        setTimeout(() => {
          reconstructFileFromChunks(transfer!.receivedChunks, chunk.fileName, chunk.totalChunks);
          newMap.delete(transferKey);
          toast({
            title: "File Received",
            description: `Successfully received ${chunk.fileName}`,
          });
        }, 100);
      }
      
      return newMap;
    });
  }, [toast]);

  const connectToPeer = useCallback(async (targetId: string) => {
    try {
      const pc = createPeerConnection(targetId);
      setPeerConnections(prev => new Map(prev).set(targetId, pc));

      // Create data channel
      const dataChannel = pc.createDataChannel('fileTransfer', {
        ordered: true,
      });
      setupDataChannel(dataChannel, targetId);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignalingMessage({
        type: 'offer',
        targetId,
        data: offer,
      });

      toast({
        title: "Connecting...",
        description: `Attempting to connect to ${targetId}`,
      });
    } catch (error) {
      console.error('Error connecting to peer:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate connection",
        variant: "destructive",
      });
    }
  }, [createPeerConnection, setupDataChannel, sendSignalingMessage, toast]);

  const sendFiles = useCallback(async (files: SelectedFile[], peerId: string) => {
    const channel = dataChannels.get(peerId);
    if (!channel || channel.readyState !== 'open') {
      toast({
        title: "No Connection",
        description: "No active connection to send files",
        variant: "destructive",
      });
      return;
    }

    for (const selectedFile of files) {
      const { file } = selectedFile;
      
      // Send file transfer request
      const transferRequest: FileTransferRequest = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        chunks: Math.ceil(file.size / (16 * 1024)), // 16KB chunks
      };

      channel.send(JSON.stringify({
        type: 'file-transfer-request',
        ...transferRequest,
      }));

      // Wait for acceptance (in real implementation, this would be handled by events)
      // For now, we'll start sending after a short delay
      setTimeout(async () => {
        const chunks = await createFileChunks(file);
        for (let i = 0; i < chunks.length; i++) {
          const chunk: FileChunk = {
            fileName: file.name,
            chunkIndex: i,
            totalChunks: chunks.length,
            data: chunks[i],
          };

          channel.send(JSON.stringify({
            type: 'file-chunk',
            ...chunk,
          }));

          // Small delay between chunks to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }, 1000);
    }
  }, [dataChannels, toast]);

  const acceptFileTransfer = useCallback((requestId: string) => {
    const request = incomingFileRequests.find(r => r.id === requestId);
    if (!request) return;

    const channel = dataChannels.get(request.fromPeer);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({ type: 'transfer-accepted' }));
      
      setIncomingFileRequests(prev => prev.filter(r => r.id !== requestId));
      
      toast({
        title: "Transfer Accepted",
        description: `Accepting ${request.fileName} from ${request.fromPeer}`,
      });
    }
  }, [incomingFileRequests, dataChannels, toast]);

  const declineFileTransfer = useCallback((requestId: string) => {
    const request = incomingFileRequests.find(r => r.id === requestId);
    if (!request) return;

    const channel = dataChannels.get(request.fromPeer);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({ type: 'transfer-declined' }));
    }

    setIncomingFileRequests(prev => prev.filter(r => r.id !== requestId));
    
    toast({
      title: "Transfer Declined",
      description: `Declined ${request.fileName} from ${request.fromPeer}`,
    });
  }, [incomingFileRequests, dataChannels, toast]);

  // Handle incoming signaling messages via ref to avoid stale closures
  const handleSignalingMessage = useCallback(async (message: any) => {
    const { type, fromId, data } = message;

    switch (type) {
      case 'offer':
        try {
          const pc = createPeerConnection(fromId);
          setPeerConnections(prev => new Map(prev).set(fromId, pc));

          // Set up data channel handler for incoming connections
          pc.ondatachannel = (event) => {
            setupDataChannel(event.channel, fromId);
          };

          await pc.setRemoteDescription(data);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendSignalingMessage({
            type: 'answer',
            targetId: fromId,
            data: answer,
          });
        } catch (error) {
          console.error('Error handling offer:', error);
        }
        break;

      case 'answer':
        try {
          setPeerConnections(prev => {
            const pc = prev.get(fromId);
            if (pc) {
              pc.setRemoteDescription(data);
            }
            return prev;
          });
        } catch (error) {
          console.error('Error handling answer:', error);
        }
        break;

      case 'ice-candidate':
        try {
          setPeerConnections(prev => {
            const pc = prev.get(fromId);
            if (pc) {
              pc.addIceCandidate(data);
            }
            return prev;
          });
        } catch (error) {
          console.error('Error handling ICE candidate:', error);
        }
        break;
    }
  }, [createPeerConnection, setupDataChannel, sendSignalingMessage]);

  // Expose the handler for use by parent component
  useEffect(() => {
    (window as any).handleWebRTCSignaling = handleSignalingMessage;
    return () => {
      delete (window as any).handleWebRTCSignaling;
    };
  }, [handleSignalingMessage]);

  return {
    peerConnections,
    dataChannels,
    connectToPeer,
    sendFiles,
    incomingFileRequests,
    acceptFileTransfer,
    declineFileTransfer,
    activeTransfers,
  };
}
