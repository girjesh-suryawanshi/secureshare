import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, createFileChunks, reconstructFileFromChunks } from "@/lib/file-utils";

// Local interfaces for WebRTC file transfer
interface SelectedFile {
  file: File;
  id: string;
}

interface FileTransferRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
  chunks: number;
}

interface FileChunk {
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  data: Uint8Array; // Updated to use binary data
}

interface FileTransferState {
  fileName: string;
  totalSize: number;
  receivedChunks: Map<number, Uint8Array>; // Updated for binary chunks
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

  // New optimized binary chunk handler for Phase 1 (moved up for hoisting)
  const handleBinaryFileChunk = useCallback((data: ArrayBuffer, peerId: string) => {
    // For this phase, we'll still use the existing handler pattern
    // but optimized for binary data
    const uint8Array = new Uint8Array(data);
    // TODO: Add chunk metadata handling for proper reconstruction
    console.log(`Received binary chunk from ${peerId}: ${uint8Array.length} bytes`);
  }, []);

  const setupDataChannel = useCallback((channel: RTCDataChannel, peerId: string) => {
    // Optimize data channel for large file transfers (Phase 1)
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId} (optimized for binary transfer)`);
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
        // Handle both text (control messages) and binary (file chunks) data
        if (typeof event.data === 'string') {
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
          } else if (data.type === 'transfer-accepted') {
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
        } else if (event.data instanceof ArrayBuffer) {
          // Handle binary file chunk data (optimized for Phase 1)
          handleBinaryFileChunk(event.data, peerId);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
  }, [toast, handleBinaryFileChunk]);

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

      // Create optimized data channel for large file transfers (Phase 1)
      const dataChannel = pc.createDataChannel('fileTransfer', {
        ordered: true,
        maxRetransmits: 3,
        maxPacketLifeTime: 3000, // 3 seconds
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
      
      // Send file transfer request with optimized chunk size (Phase 1)
      const chunkSize = 1024 * 1024; // 1MB chunks (64x larger than before)
      const transferRequest: FileTransferRequest = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        chunks: Math.ceil(file.size / chunkSize),
      };

      channel.send(JSON.stringify({
        type: 'file-transfer-request',
        ...transferRequest,
      }));

      // Wait for acceptance and send optimized chunks (Phase 1)
      setTimeout(async () => {
        const chunks = await createFileChunks(file);
        for (let i = 0; i < chunks.length; i++) {
          // Send binary chunks directly instead of JSON (Phase 1 optimization)
          const binaryChunk = chunks[i];
          
          // Check buffer before sending to prevent overwhelming
          if (channel.bufferedAmount > 1024 * 1024) { // 1MB buffer threshold
            await new Promise(resolve => {
              const checkBuffer = () => {
                if (channel.bufferedAmount < 512 * 1024) { // Resume at 512KB
                  resolve(undefined);
                } else {
                  setTimeout(checkBuffer, 10);
                }
              };
              checkBuffer();
            });
          }
          
          // Send binary chunk directly (much faster than JSON)
          channel.send(binaryChunk.buffer);

          // Smaller delay for 1MB chunks (better throughput)
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        toast({
          title: "File Sent",
          description: `Successfully sent ${file.name} (${formatFileSize(file.size)})`,
        });
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
