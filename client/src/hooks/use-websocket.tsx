import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export interface WebSocketHook {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  onFileAvailable: (callback: (file: { code: string; fileName: string; fileSize: number; fileType: string; fileIndex?: number; totalFiles?: number }) => void) => void;
  onFileData: (callback: (data: { code: string; data: string }) => void) => void;
  onFileNotFound: (callback: (code: string) => void) => void;
  onDownloadAck: (callback: (data: { status: string; message: string; code: string }) => void) => void;
  onSenderDisconnected: (callback: (data: { code: string; message: string }) => void) => void;
}

export function useWebSocket(): WebSocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const fileAvailableCallbackRef = useRef<((file: any) => void) | null>(null);
  const fileDataCallbackRef = useRef<((data: any) => void) | null>(null);
  const fileNotFoundCallbackRef = useRef<((code: string) => void) | null>(null);
  const downloadAckCallbackRef = useRef<((data: any) => void) | null>(null);
  const senderDisconnectedCallbackRef = useRef<((data: any) => void) | null>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[WebSocket] Attempting to connect to: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] 📨 Received message:', message.type);

          switch (message.type) {
            case 'file-available':
              if (fileAvailableCallbackRef.current) {
                fileAvailableCallbackRef.current(message);
              }
              break;
            
            case 'file-data':
              if (fileDataCallbackRef.current) {
                fileDataCallbackRef.current(message);
              }
              break;
            
            case 'file-not-found':
              if (fileNotFoundCallbackRef.current) {
                fileNotFoundCallbackRef.current(message.code);
              }
              break;

            case 'file-registered':
              // File was successfully registered
              console.log('[WebSocket] ✅ File registered successfully');
              break;

            case 'download-acknowledgment':
              if (downloadAckCallbackRef.current) {
                downloadAckCallbackRef.current(message);
              }
              break;

            case 'sender-disconnected':
              if (senderDisconnectedCallbackRef.current) {
                senderDisconnectedCallbackRef.current(message);
              }
              break;

            case 'error':
              console.error('[WebSocket] ❌ Error from server:', message);
              // Check if this is a payload size error (common with large video files)
              if (message.message?.includes('payload') || message.message?.includes('large')) {
                console.error('[WebSocket] Large file error detected. This is likely due to WebSocket payload limits.');
                console.error('[WebSocket] Recommendation: Use Local Network transfer for files larger than 375MB.');
              }
              break;
          }
        } catch (error) {
          console.error('[WebSocket] ❌ Failed to parse message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] ⚠️ Disconnected. Reconnecting in 3 seconds...');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds with exponential backoff
        reconnectAttemptsRef.current += 1;
        const delayMs = Math.min(3000 * reconnectAttemptsRef.current, 30000); // Cap at 30s
        reconnectTimeoutRef.current = setTimeout(connect, delayMs);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] ❌ Connection error:', error);
        setIsConnected(false);
        
        // Log detailed error info for debugging large file issues
        console.error('[WebSocket] Error details:');
        console.error('[WebSocket]   - readyState:', wsRef.current?.readyState);
        console.error('[WebSocket]   - URL:', wsRef.current?.url);
      };

    } catch (error) {
      console.error('[WebSocket] ❌ Failed to initialize connection:', error);
      // Attempt to reconnect after 3 seconds
      reconnectAttemptsRef.current += 1;
      const delayMs = Math.min(3000 * reconnectAttemptsRef.current, 30000);
      reconnectTimeoutRef.current = setTimeout(connect, delayMs);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message);
      const messageSizeMB = messageString.length / 1024 / 1024;
      
      // Warn if message is getting close to payload limit
      if (messageSizeMB > 400) {
        console.warn(`[WebSocket] ⚠️  Large message being sent: ${messageSizeMB.toFixed(1)}MB`);
        console.warn(`[WebSocket] If this fails, try using Local Network transfer for very large files.`);
      }
      
      wsRef.current.send(messageString);
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  const onFileAvailable = useCallback((callback: (file: any) => void) => {
    fileAvailableCallbackRef.current = callback;
  }, []);

  const onFileData = useCallback((callback: (data: any) => void) => {
    fileDataCallbackRef.current = callback;
  }, []);

  const onFileNotFound = useCallback((callback: (code: string) => void) => {
    fileNotFoundCallbackRef.current = callback;
  }, []);

  const onDownloadAck = useCallback((callback: (data: any) => void) => {
    downloadAckCallbackRef.current = callback;
  }, []);

  const onSenderDisconnected = useCallback((callback: (data: any) => void) => {
    senderDisconnectedCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    sendMessage,
    onFileAvailable,
    onFileData,
    onFileNotFound,
    onDownloadAck,
    onSenderDisconnected,
  };
}
