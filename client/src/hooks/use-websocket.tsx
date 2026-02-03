import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export interface WebSocketHook {
  isConnected: boolean;
  reconnect: () => void;
  sendMessage: (message: any) => void;
  onFileAvailable: (callback: (file: { code: string; fileName: string; fileSize: number; fileType: string; fileIndex?: number; totalFiles?: number; isReady?: boolean; downloadUrl?: string; receivedBytes?: number }) => void) => void;
  onFileReady: (callback: (file: { code: string; downloadUrl: string; fileName: string; fileType?: string; fileIndex?: number; totalFiles?: number }) => void) => void;
  onFileNotFound: (callback: (code: string) => void) => void;
  onDownloadAck: (callback: (data: { status: string; message: string; code: string }) => void) => void;
  onSenderDisconnected: (callback: (data: { code: string; message: string }) => void) => void;
}

export function useWebSocket(): WebSocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const fileAvailableCallbackRef = useRef<((file: any) => void) | null>(null);
  const fileReadyCallbackRef = useRef<((file: any) => void) | null>(null);
  const fileNotFoundCallbackRef = useRef<((code: string) => void) | null>(null);
  const downloadAckCallbackRef = useRef<((data: any) => void) | null>(null);
  const senderDisconnectedCallbackRef = useRef<((data: any) => void) | null>(null);
  const { toast } = useToast();

  const sanitizePort = (value?: string | number | null) => {
    if (value === undefined || value === null) {
      return "";
    }
    const normalized = String(value).trim();
    if (!normalized || normalized === "undefined" || normalized === "null") {
      return "";
    }
    return normalized;
  };

  const resolveWebSocketUrl = () => {
    const explicit = import.meta.env.VITE_WS_URL as string | undefined;
    if (explicit) {
      if (explicit.startsWith("ws://") || explicit.startsWith("wss://")) {
        return explicit;
      }
      if (explicit.startsWith("http://") || explicit.startsWith("https://")) {
        const url = new URL(explicit);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return url.toString();
      }
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname || "localhost";
    const fallbackPort = sanitizePort(import.meta.env.VITE_WS_PORT as string | undefined);
    const browserPort = sanitizePort(window.location.port);
    const inferredPort = browserPort || fallbackPort || (hostname === "localhost" ? "5000" : "");
    const portSegment = inferredPort ? `:${inferredPort}` : "";
    return `${protocol}//${hostname}${portSegment}/ws`;
  };

  const connect = useCallback(() => {
    try {
      const wsUrl = resolveWebSocketUrl();
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket received message:', message);

          switch (message.type) {
            case 'file-available':
              if (fileAvailableCallbackRef.current) {
                fileAvailableCallbackRef.current(message);
              }
              break;
            
            case 'file-ready':
              if (fileReadyCallbackRef.current) {
                fileReadyCallbackRef.current(message);
              }
              break;
            
            case 'file-not-found':
              if (fileNotFoundCallbackRef.current) {
                fileNotFoundCallbackRef.current(message.code);
              }
              break;

            case 'file-registered':
              // File was successfully registered
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
              toast({
                title: "Error",
                description: message.message,
                variant: "destructive",
              });
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [toast]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket sending message:', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  const onFileAvailable = useCallback((callback: (file: any) => void) => {
    fileAvailableCallbackRef.current = callback;
  }, []);

  const onFileReady = useCallback((callback: (file: any) => void) => {
    fileReadyCallbackRef.current = callback;
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

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    connect();
  }, [connect]);

  return {
    isConnected,
    reconnect,
    sendMessage,
    onFileAvailable,
    onFileReady,
    onFileNotFound,
    onDownloadAck,
    onSenderDisconnected,
  };
}
