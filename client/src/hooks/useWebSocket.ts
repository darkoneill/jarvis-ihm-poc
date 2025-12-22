import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

// Types for WebSocket messages
export interface AlertMessage {
  type: "alert";
  severity: "info" | "warning" | "critical";
  category: "hardware" | "system" | "security";
  title: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface MetricsMessage {
  type: "metrics";
  category: "cpu" | "gpu" | "memory" | "network" | "ups";
  value: number;
  unit: string;
  timestamp: string;
}

export interface StatusMessage {
  type: "status";
  node: string;
  status: "online" | "offline" | "degraded";
  timestamp: string;
}

export type WSMessage = AlertMessage | MetricsMessage | StatusMessage;

interface UseWebSocketOptions {
  onAlert?: (alert: AlertMessage) => void;
  onMetrics?: (metrics: MetricsMessage) => void;
  onStatus?: (status: StatusMessage) => void;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  showToasts?: boolean;
  autoConnect?: boolean;
  reconnectInterval?: number;
}

interface WebSocketState {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  alerts: AlertMessage[];
  metrics: Record<string, MetricsMessage>;
}

export function useWebSocket(url: string = "/ws", options: UseWebSocketOptions = {}) {
  const {
    onAlert,
    onMetrics,
    onStatus,
    onMessage,
    onOpen,
    onClose,
    onError,
    showToasts = true,
    autoConnect = true,
    reconnectInterval = 3000,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    alerts: [],
    metrics: {},
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const handleAlert = useCallback((alert: AlertMessage) => {
    setState(prev => ({
      ...prev,
      alerts: [alert, ...prev.alerts].slice(0, 50), // Keep last 50 alerts
    }));

    onAlert?.(alert);

    if (showToasts) {
      switch (alert.severity) {
        case "critical":
          toast.error(alert.title, {
            description: alert.message,
            duration: 10000,
          });
          break;
        case "warning":
          toast.warning(alert.title, {
            description: alert.message,
            duration: 7000,
          });
          break;
        case "info":
          toast.info(alert.title, {
            description: alert.message,
            duration: 5000,
          });
          break;
      }
    }
  }, [onAlert, showToasts]);

  const handleMetrics = useCallback((metrics: MetricsMessage) => {
    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [metrics.category]: metrics,
      },
    }));

    onMetrics?.(metrics);
  }, [onMetrics]);

  const handleStatus = useCallback((status: StatusMessage) => {
    onStatus?.(status);

    if (showToasts && status.status !== "online") {
      toast.warning(`Node ${status.node}`, {
        description: `Status: ${status.status}`,
      });
    }
  }, [onStatus, showToasts]);

  const connect = useCallback(() => {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = url.startsWith("ws") ? url : `${protocol}//${window.location.host}${url}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setState(prev => ({ ...prev, isConnected: true }));
        reconnectAttempts.current = 0;
        onOpen?.();
        
        // Subscribe to all categories
        ws.send(JSON.stringify({
          type: "subscribe",
          categories: ["hardware", "system", "security"],
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          setState(prev => ({
            ...prev,
            lastMessage: message,
          }));

          onMessage?.(message);

          switch (message.type) {
            case "alert":
              handleAlert(message);
              break;
            case "metrics":
              handleMetrics(message);
              break;
            case "status":
              handleStatus(message);
              break;
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setState(prev => ({ ...prev, isConnected: false }));
        wsRef.current = null;
        onClose?.();

        // Auto-reconnect logic
        if (autoConnect && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        onError?.(error);
        ws.close();
      };

    } catch (error) {
      console.error("[WebSocket] Failed to connect:", error);
      if (autoConnect) {
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      }
    }
  }, [url, autoConnect, reconnectInterval, onOpen, onClose, onError, onMessage, handleAlert, handleMetrics, handleStatus]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Not connected. Message not sent.");
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setState(prev => ({ ...prev, alerts: [] }));
  }, []);

  // Connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected: state.isConnected,
    lastMessage: state.lastMessage,
    alerts: state.alerts,
    metrics: state.metrics,
    connect,
    disconnect,
    sendMessage,
    clearAlerts,
  };
}
