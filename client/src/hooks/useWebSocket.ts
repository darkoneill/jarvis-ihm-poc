import { useEffect, useRef, useState } from "react";

interface WebSocketOptions {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  autoConnect?: boolean;
}

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 3000,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = () => {
    // In development, we might want to proxy or use a full URL
    // For this PoC, we assume relative path works via Vite proxy or absolute URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = url.startsWith("ws") ? url : `${protocol}//${window.location.host}${url}`;
    
    // NOTE: For the PoC environment where backend might not be running, 
    // we will fail gracefully but keep the structure ready.
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onClose?.();
        // Auto reconnect
        if (autoConnect) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError?.(error);
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("WebSocket connection failed:", e);
      if (autoConnect) {
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      }
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url]);

  const sendMessage = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket is not connected. Message not sent.");
    }
  };

  return { isConnected, sendMessage };
}
