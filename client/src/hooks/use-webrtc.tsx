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
  const [pendingFileTransfers, setPendingFileTransfers] = useState<Map<string, boolean>>(new Map());
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

  // Track pending binary chunks awaiting metadata
  const pendingBinaryChunks = useRef<Map<string, {metadata: any, data: ArrayBuffer}>>(new Map());

  // Binary chunk handler with proper file reconstruction (Phase 1)
  const handleBinaryFileChunk = useCallback((data: ArrayBuffer, peerId: string, metadata?: any) => {
    if (!metadata) {
      // Store binary data temporarily until metadata arrives
      pendingBinaryChunks.current.set(`${peerId}-pending`, {metadata: null, data});
      return;
    }

    // Process binary chunk with metadata for file reconstruction
    const chunk: FileChunk = {
      fileName: metadata.fileName,
      chunkIndex: metadata.chunkIndex,
      totalChunks: metadata.totalChunks,
      data: new Uint8Array(data),
    };

    // Use existing reconstruction logic but with binary data
    const transferKey = `${peerId}-${chunk.fileName}`;
    
    setActiveTransfers(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(transferKey) || {
        fileName: chunk.fileName,
        totalSize: metadata.fileSize || 0,
        receivedChunks: new Map(),
        totalChunks: chunk.totalChunks,
        progress: 0,
      };

      existing.receivedChunks.set(chunk.chunkIndex, chunk.data);
      existing.progress = (existing.receivedChunks.size / existing.totalChunks) * 100;

      newMap.set(transferKey, existing);

      // If all chunks received, reconstruct file
      if (existing.receivedChunks.size === existing.totalChunks) {
        reconstructBinaryFile(existing, peerId);
        newMap.delete(transferKey);
      }

      return newMap;
    });

    console.log(`Binary chunk ${chunk.chunkIndex}/${chunk.totalChunks} received for ${chunk.fileName}`);
  }, []);

  // Reconstruct binary file from chunks
  const reconstructBinaryFile = useCallback((transfer: FileTransferState, peerId: string) => {
    try {
      // Sort chunks by index and concatenate binary data
      const sortedChunks = Array.from(transfer.receivedChunks.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, data]) => data);

      // Calculate total size
      const totalSize = sortedChunks.reduce((size, chunk) => size + chunk.length, 0);
      
      // Create combined binary array
      const combinedData = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of sortedChunks) {
        combinedData.set(chunk, offset);
        offset += chunk.length;
      }

      // Create blob and download
      const blob = new Blob([combinedData]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = transfer.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "File Received",
        description: `Successfully received ${transfer.fileName} (${formatFileSize(totalSize)})`,
      });
    } catch (error) {
      console.error('Error reconstructing binary file:', error);
      toast({
        title: "Error",
        description: "Failed to reconstruct received file",
        variant: "destructive",
      });
    }
  }, [toast]);

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

    // Track last metadata for binary chunks
    let lastChunkMetadata: any = null;

    channel.onmessage = (event) => {
      try {
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
          } else if (data.type === 'binary-chunk-metadata') {
            // Store metadata for next binary chunk
            lastChunkMetadata = data;
          } else if (data.type === 'file-chunk') {
            // Legacy JSON chunk handling for backward compatibility
            handleFileChunk(data, peerId);
          } else if (data.type === 'transfer-accepted') {
            // Set flag to start sending for this peer
            setPendingFileTransfers(prev => {
              const newMap = new Map(prev);
              newMap.set(peerId, true);
              return newMap;
            });
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
          // Handle binary chunk with metadata
          if (lastChunkMetadata) {
            handleBinaryFileChunk(event.data, peerId, lastChunkMetadata);
            lastChunkMetadata = null; // Reset after use
          } else {
            console.warn('Received binary chunk without metadata');
          }
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

      // Wait for acceptance, then stream file with proper gating (Phase 1 Fixed)
      const waitForAcceptanceAndSend = async () => {
        // Wait for acceptance signal
        while (!pendingFileTransfers.get(targetId)) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Starting optimized transfer for ${file.name} (${formatFileSize(file.size)})`);
        
        // Use streaming instead of preloading entire file
        const totalChunks = Math.ceil(file.size / chunkSize);
        let chunkIndex = 0;
        
        await streamFileChunks(file, chunkSize, async (chunk: Uint8Array) => {
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
          
          // Send metadata first, then binary chunk (critical fix)
          const metadata = {
            type: 'binary-chunk-metadata',
            fileName: file.name,
            fileSize: file.size,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
          };
          
          channel.send(JSON.stringify(metadata));
          
          // Immediately send binary chunk
          channel.send(chunk.buffer);
          
          chunkIndex++;
          
          // Smaller delay for 1MB chunks (better throughput)
          await new Promise(resolve => setTimeout(resolve, 5));
        });
        
        // Clear acceptance flag
        setPendingFileTransfers(prev => {
          const newMap = new Map(prev);
          newMap.delete(targetId);
          return newMap;
        });
        
        toast({
          title: "File Sent",
          description: `Successfully sent ${file.name} (${formatFileSize(file.size)}) using optimized streaming`,
        });
      };
      
      // Start the acceptance-gated transfer
      waitForAcceptanceAndSend().catch(error => {
        console.error('Error in optimized file transfer:', error);
        toast({
          title: "Transfer Error",
          description: `Failed to send ${file.name}`,
          variant: "destructive",
        });
      });
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
