import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export interface WebSocketHook {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  onFileAvailable: (callback: (file: { code: string; fileName: string; fileSize: number; fileType: string }) => void) => void;
  onFileData: (callback: (data: { code: string; data: string }) => void) => void;
  onFileNotFound: (callback: (code: string) => void) => void;
  onDownloadAck: (callback: (data: { status: string; message: string; code: string }) => void) => void;
}

export function useWebSocket(): WebSocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const fileAvailableCallbackRef = useRef<((file: any) => void) | null>(null);
  const fileDataCallbackRef = useRef<((data: any) => void) | null>(null);
  const fileNotFoundCallbackRef = useRef<((code: string) => void) | null>(null);
  const downloadAckCallbackRef = useRef<((data: any) => void) | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
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
              break;

            case 'download-acknowledgment':
              if (downloadAckCallbackRef.current) {
                downloadAckCallbackRef.current(message);
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
      wsRef.current.send(JSON.stringify(message));
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
  };
}
