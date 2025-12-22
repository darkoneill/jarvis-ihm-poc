import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

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

// Store connected clients
const clients = new Set<WebSocket>();

// Alert thresholds
const THRESHOLDS = {
  GPU_TEMP_WARNING: 75,
  GPU_TEMP_CRITICAL: 85,
  CPU_USAGE_WARNING: 80,
  CPU_USAGE_CRITICAL: 95,
  MEMORY_USAGE_WARNING: 85,
  MEMORY_USAGE_CRITICAL: 95,
  UPS_BATTERY_WARNING: 30,
  UPS_BATTERY_CRITICAL: 15,
};

// Initialize WebSocket server
export function initWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WebSocket] Client connected");
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: "status",
      node: "jarvis-server",
      status: "online",
      timestamp: new Date().toISOString(),
    }));

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (error) {
        console.error("[WebSocket] Invalid message:", error);
      }
    });

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error: Error) => {
      console.error("[WebSocket] Error:", error);
      clients.delete(ws);
    });
  });

  // Start monitoring simulation
  startMonitoringSimulation();

  console.log("[WebSocket] Server initialized on /ws");
  return wss;
}

// Handle incoming client messages
function handleClientMessage(ws: WebSocket, message: Record<string, unknown>) {
  switch (message.type) {
    case "subscribe":
      // Client subscribes to specific alert categories
      console.log("[WebSocket] Client subscribed to:", message.categories);
      break;
    case "ping":
      ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
      break;
    default:
      console.log("[WebSocket] Unknown message type:", message.type);
  }
}

// Broadcast message to all connected clients
export function broadcast(message: WSMessage) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Send alert to all clients
export function sendAlert(
  severity: AlertMessage["severity"],
  category: AlertMessage["category"],
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  broadcast({
    type: "alert",
    severity,
    category,
    title,
    message,
    timestamp: new Date().toISOString(),
    data,
  });
}

// Check thresholds and send alerts
function checkThresholds(metrics: {
  gpuTemp?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  upsBattery?: number;
}) {
  // GPU Temperature
  if (metrics.gpuTemp !== undefined) {
    if (metrics.gpuTemp >= THRESHOLDS.GPU_TEMP_CRITICAL) {
      sendAlert(
        "critical",
        "hardware",
        "Surchauffe GPU Critique",
        `Température GPU: ${metrics.gpuTemp}°C. Arrêt d'urgence recommandé.`,
        { temperature: metrics.gpuTemp, threshold: THRESHOLDS.GPU_TEMP_CRITICAL }
      );
    } else if (metrics.gpuTemp >= THRESHOLDS.GPU_TEMP_WARNING) {
      sendAlert(
        "warning",
        "hardware",
        "Température GPU Élevée",
        `Température GPU: ${metrics.gpuTemp}°C. Surveillance recommandée.`,
        { temperature: metrics.gpuTemp, threshold: THRESHOLDS.GPU_TEMP_WARNING }
      );
    }
  }

  // CPU Usage
  if (metrics.cpuUsage !== undefined) {
    if (metrics.cpuUsage >= THRESHOLDS.CPU_USAGE_CRITICAL) {
      sendAlert(
        "critical",
        "hardware",
        "Charge CPU Critique",
        `Utilisation CPU: ${metrics.cpuUsage}%. Performances dégradées.`,
        { usage: metrics.cpuUsage, threshold: THRESHOLDS.CPU_USAGE_CRITICAL }
      );
    } else if (metrics.cpuUsage >= THRESHOLDS.CPU_USAGE_WARNING) {
      sendAlert(
        "warning",
        "hardware",
        "Charge CPU Élevée",
        `Utilisation CPU: ${metrics.cpuUsage}%. Surveillance recommandée.`,
        { usage: metrics.cpuUsage, threshold: THRESHOLDS.CPU_USAGE_WARNING }
      );
    }
  }

  // Memory Usage
  if (metrics.memoryUsage !== undefined) {
    if (metrics.memoryUsage >= THRESHOLDS.MEMORY_USAGE_CRITICAL) {
      sendAlert(
        "critical",
        "hardware",
        "Mémoire Critique",
        `Utilisation RAM: ${metrics.memoryUsage}%. Risque d'OOM.`,
        { usage: metrics.memoryUsage, threshold: THRESHOLDS.MEMORY_USAGE_CRITICAL }
      );
    } else if (metrics.memoryUsage >= THRESHOLDS.MEMORY_USAGE_WARNING) {
      sendAlert(
        "warning",
        "hardware",
        "Mémoire Élevée",
        `Utilisation RAM: ${metrics.memoryUsage}%. Surveillance recommandée.`,
        { usage: metrics.memoryUsage, threshold: THRESHOLDS.MEMORY_USAGE_WARNING }
      );
    }
  }

  // UPS Battery
  if (metrics.upsBattery !== undefined) {
    if (metrics.upsBattery <= THRESHOLDS.UPS_BATTERY_CRITICAL) {
      sendAlert(
        "critical",
        "hardware",
        "Batterie UPS Critique",
        `Niveau UPS: ${metrics.upsBattery}%. Arrêt imminent recommandé.`,
        { battery: metrics.upsBattery, threshold: THRESHOLDS.UPS_BATTERY_CRITICAL }
      );
    } else if (metrics.upsBattery <= THRESHOLDS.UPS_BATTERY_WARNING) {
      sendAlert(
        "warning",
        "hardware",
        "Batterie UPS Faible",
        `Niveau UPS: ${metrics.upsBattery}%. Préparez l'arrêt.`,
        { battery: metrics.upsBattery, threshold: THRESHOLDS.UPS_BATTERY_WARNING }
      );
    }
  }
}

// Simulation for demo purposes
let simulationInterval: NodeJS.Timeout | null = null;

function startMonitoringSimulation() {
  if (simulationInterval) return;

  // Send periodic metrics updates
  simulationInterval = setInterval(() => {
    if (clients.size === 0) return;

    // Simulate random metrics with occasional spikes
    const random = Math.random();
    const gpuTemp = 50 + Math.random() * 30 + (random > 0.95 ? 20 : 0);
    const cpuUsage = 20 + Math.random() * 60 + (random > 0.98 ? 30 : 0);
    const memoryUsage = 30 + Math.random() * 50;
    const upsBattery = 85 + Math.random() * 15;

    // Broadcast metrics
    broadcast({
      type: "metrics",
      category: "gpu",
      value: Math.round(gpuTemp * 10) / 10,
      unit: "°C",
      timestamp: new Date().toISOString(),
    });

    broadcast({
      type: "metrics",
      category: "cpu",
      value: Math.round(cpuUsage),
      unit: "%",
      timestamp: new Date().toISOString(),
    });

    // Check thresholds
    checkThresholds({
      gpuTemp,
      cpuUsage,
      memoryUsage,
      upsBattery,
    });

  }, 5000); // Every 5 seconds
}

export function stopMonitoringSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

// Get connected clients count
export function getConnectedClientsCount(): number {
  return clients.size;
}
