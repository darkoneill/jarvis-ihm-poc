import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";
import { getPrometheusClient, JARVIS_METRICS } from "../_core/prometheus";

const execAsync = promisify(exec);

// Helper to safely execute commands
async function safeExec(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command, { timeout: 5000 });
    return stdout.trim();
  } catch {
    return "";
  }
}

// Parse memory info from /proc/meminfo
function parseMemInfo(meminfo: string): { total: number; used: number; free: number } {
  const lines = meminfo.split("\n");
  const values: Record<string, number> = {};
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s+(\d+)/);
    if (match) {
      values[match[1]] = parseInt(match[2], 10) * 1024; // Convert from KB to bytes
    }
  }
  
  const total = values["MemTotal"] || 0;
  const free = values["MemFree"] || 0;
  const buffers = values["Buffers"] || 0;
  const cached = values["Cached"] || 0;
  const available = values["MemAvailable"] || (free + buffers + cached);
  
  return {
    total,
    used: total - available,
    free: available,
  };
}

// Parse CPU stats from /proc/stat
function parseCpuUsage(stat: string): number {
  const lines = stat.split("\n");
  const cpuLine = lines.find(l => l.startsWith("cpu "));
  if (!cpuLine) return 0;
  
  const parts = cpuLine.split(/\s+/).slice(1).map(Number);
  const idle = parts[3] + (parts[4] || 0); // idle + iowait
  const total = parts.reduce((a, b) => a + b, 0);
  
  return total > 0 ? Math.round(((total - idle) / total) * 100) : 0;
}

// Get disk usage
async function getDiskUsage(): Promise<{ total: number; used: number; free: number; percent: number }> {
  try {
    const output = await safeExec("df -B1 / | tail -1");
    const parts = output.split(/\s+/);
    if (parts.length >= 4) {
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const free = parseInt(parts[3], 10);
      return {
        total,
        used,
        free,
        percent: total > 0 ? Math.round((used / total) * 100) : 0,
      };
    }
  } catch {}
  return { total: 0, used: 0, free: 0, percent: 0 };
}

// Get network stats
async function getNetworkStats(): Promise<{ rx: number; tx: number; interface: string }> {
  try {
    const output = await safeExec("cat /proc/net/dev");
    const lines = output.split("\n");
    
    for (const line of lines) {
      if (line.includes("eth0") || line.includes("ens") || line.includes("enp")) {
        const parts = line.split(/\s+/).filter(Boolean);
        if (parts.length >= 10) {
          return {
            interface: parts[0].replace(":", ""),
            rx: parseInt(parts[1], 10),
            tx: parseInt(parts[9], 10),
          };
        }
      }
    }
  } catch {}
  return { rx: 0, tx: 0, interface: "unknown" };
}

// Get CPU temperature (if available)
async function getCpuTemperature(): Promise<number | null> {
  try {
    const temp = await safeExec("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null");
    if (temp) {
      return parseInt(temp, 10) / 1000;
    }
    
    const sensors = await safeExec("sensors 2>/dev/null | grep -i 'core 0' | head -1");
    const match = sensors.match(/\+(\d+\.?\d*)/);
    if (match) {
      return parseFloat(match[1]);
    }
  } catch {}
  return null;
}

// Get load average
function getLoadAverage(): { load1: number; load5: number; load15: number } {
  const loads = os.loadavg();
  return {
    load1: Math.round(loads[0] * 100) / 100,
    load5: Math.round(loads[1] * 100) / 100,
    load15: Math.round(loads[2] * 100) / 100,
  };
}

// Get uptime
function getUptime(): { seconds: number; formatted: string } {
  const seconds = os.uptime();
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let formatted = "";
  if (days > 0) formatted += `${days}j `;
  if (hours > 0) formatted += `${hours}h `;
  formatted += `${minutes}m`;
  
  return { seconds, formatted: formatted.trim() };
}

// Récupérer les métriques depuis Prometheus si disponible
async function getPrometheusMetrics() {
  const prometheus = getPrometheusClient();
  if (!prometheus) return null;
  
  try {
    const isHealthy = await prometheus.healthCheck();
    if (!isHealthy) return null;
    
    const [cpuUsage, memoryUsage, gpuTemp, gpuUsage, diskUsage] = await Promise.all([
      prometheus.queryScalar(JARVIS_METRICS.CPU_USAGE).catch(() => null),
      prometheus.queryScalar(JARVIS_METRICS.MEMORY_USAGE_PERCENT).catch(() => null),
      prometheus.queryScalar(JARVIS_METRICS.GPU_TEMPERATURE).catch(() => null),
      prometheus.queryScalar(JARVIS_METRICS.GPU_UTILIZATION).catch(() => null),
      prometheus.queryScalar(JARVIS_METRICS.DISK_USAGE_PERCENT).catch(() => null),
    ]);
    
    return {
      source: 'prometheus' as const,
      cpu: cpuUsage !== null ? Math.round(cpuUsage) : null,
      memory: memoryUsage !== null ? Math.round(memoryUsage) : null,
      gpuTemp: gpuTemp !== null ? Math.round(gpuTemp) : null,
      gpuUsage: gpuUsage !== null ? Math.round(gpuUsage) : null,
      disk: diskUsage !== null ? Math.round(diskUsage) : null,
    };
  } catch {
    return null;
  }
}

export const hardwareRouter = router({
  getMetrics: publicProcedure.query(async () => {
    // Essayer Prometheus d'abord
    const prometheusMetrics = await getPrometheusMetrics();
    
    // Fallback vers les métriques locales
    const [meminfo, cpustat, diskInfo, networkInfo, cpuTemp] = await Promise.all([
      safeExec("cat /proc/meminfo"),
      safeExec("cat /proc/stat"),
      getDiskUsage(),
      getNetworkStats(),
      getCpuTemperature(),
    ]);
    
    const memory = parseMemInfo(meminfo);
    const cpuUsage = parseCpuUsage(cpustat);
    const loadAvg = getLoadAverage();
    const uptime = getUptime();
    
    const cpuCount = os.cpus().length;
    const cpuModel = os.cpus()[0]?.model || "Unknown CPU";
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    
    return {
      timestamp: new Date().toISOString(),
      source: prometheusMetrics?.source || 'local',
      prometheusConnected: prometheusMetrics !== null,
      system: {
        hostname,
        platform,
        arch,
        cpuModel,
        cpuCount,
        uptime,
      },
      cpu: {
        usage: prometheusMetrics?.cpu ?? cpuUsage,
        temperature: cpuTemp,
        loadAverage: loadAvg,
      },
      memory: {
        total: memory.total,
        used: memory.used,
        free: memory.free,
        usagePercent: prometheusMetrics?.memory ?? (memory.total > 0 ? Math.round((memory.used / memory.total) * 100) : 0),
      },
      disk: {
        ...diskInfo,
        percent: prometheusMetrics?.disk ?? diskInfo.percent,
      },
      network: networkInfo,
      gpu: {
        available: prometheusMetrics?.gpuTemp !== null || prometheusMetrics?.gpuUsage !== null,
        name: "NVIDIA GPU",
        temperature: prometheusMetrics?.gpuTemp ?? null,
        usage: prometheusMetrics?.gpuUsage ?? null,
        memoryUsed: null,
        memoryTotal: null,
      },
    };
  }),

  // Vérifier le statut de Prometheus
  getPrometheusStatus: publicProcedure.query(async () => {
    const prometheus = getPrometheusClient();
    if (!prometheus) {
      return {
        configured: false,
        connected: false,
        url: null,
        error: 'PROMETHEUS_URL non configuré',
      };
    }
    
    try {
      const isHealthy = await prometheus.healthCheck();
      return {
        configured: true,
        connected: isHealthy,
        url: process.env.PROMETHEUS_URL,
        error: isHealthy ? null : 'Prometheus ne répond pas',
      };
    } catch (error) {
      return {
        configured: true,
        connected: false,
        url: process.env.PROMETHEUS_URL,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }),

  // Métriques DGX Spark (avec Prometheus si disponible)
  getDgxSparkMetrics: publicProcedure.query(async () => {
    const prometheus = getPrometheusClient();
    let prometheusData = null;
    
    if (prometheus) {
      try {
        const [cpuUsage, memUsage, gpuTemp, gpuUsage] = await Promise.all([
          prometheus.queryScalar(JARVIS_METRICS.CPU_USAGE),
          prometheus.queryScalar(JARVIS_METRICS.MEMORY_USAGE_PERCENT),
          prometheus.queryScalar(JARVIS_METRICS.GPU_TEMPERATURE),
          prometheus.queryScalar(JARVIS_METRICS.GPU_UTILIZATION),
        ]);
        
        prometheusData = { cpuUsage, memUsage, gpuTemp, gpuUsage };
      } catch {}
    }
    
    return {
      node: "DGX Spark (Orchestrator N2)",
      status: prometheusData ? 'connected' : 'simulated',
      source: prometheusData ? 'prometheus' : 'simulation',
      cpu: {
        model: "AMD EPYC 7742 64-Core",
        cores: 128,
        usage: prometheusData?.cpuUsage ?? Math.round(Math.random() * 30 + 10),
        temperature: Math.round(Math.random() * 15 + 45),
      },
      memory: {
        total: 1024 * 1024 * 1024 * 1024,
        used: Math.round(Math.random() * 200 + 100) * 1024 * 1024 * 1024,
        usagePercent: prometheusData?.memUsage ?? Math.round(Math.random() * 20 + 10),
      },
      gpu: {
        model: "NVIDIA A100 80GB",
        count: 8,
        usage: prometheusData?.gpuUsage ?? Math.round(Math.random() * 40 + 20),
        temperature: prometheusData?.gpuTemp ?? Math.round(Math.random() * 20 + 50),
        memoryUsed: Math.round(Math.random() * 30 + 10),
        memoryTotal: 80,
      },
      storage: {
        nvme: {
          total: 15 * 1024 * 1024 * 1024 * 1024,
          used: Math.round(Math.random() * 5 + 2) * 1024 * 1024 * 1024 * 1024,
          health: "GOOD",
        },
      },
    };
  }),

  // Métriques Jetson Thor
  getJetsonThorMetrics: publicProcedure.query(async () => {
    return {
      node: "Jetson Thor (Reflex N0)",
      status: "simulated",
      soc: {
        model: "NVIDIA Thor SoC",
        usage: Math.round(Math.random() * 50 + 30),
        temperature: Math.round(Math.random() * 15 + 55),
      },
      memory: {
        total: 128 * 1024 * 1024 * 1024,
        used: Math.round(Math.random() * 40 + 20) * 1024 * 1024 * 1024,
        usagePercent: Math.round(Math.random() * 30 + 20),
      },
      gpu: {
        model: "Blackwell GPU (integrated)",
        usage: Math.round(Math.random() * 60 + 30),
        temperature: Math.round(Math.random() * 15 + 60),
      },
      latency: {
        reflexLoop: Math.round(Math.random() * 20 + 35),
        visionPipeline: Math.round(Math.random() * 10 + 15),
      },
      camera: {
        status: "active",
        fps: 60,
        resolution: "4K",
      },
    };
  }),

  // Infrastructure metrics
  getInfrastructureMetrics: publicProcedure.query(async () => {
    return {
      ups: {
        model: "APC Smart-UPS 3000VA",
        status: "online",
        batteryPercent: Math.round(Math.random() * 10 + 90),
        loadPercent: Math.round(Math.random() * 20 + 40),
        runtimeMinutes: Math.round(Math.random() * 30 + 60),
        inputVoltage: Math.round(Math.random() * 10 + 225),
      },
      network: {
        firewall: {
          model: "pfSense",
          status: "active",
          throughput: Math.round(Math.random() * 500 + 100),
        },
        switch: {
          model: "Cisco SG350-28P",
          ports: 28,
          activeConnections: Math.round(Math.random() * 10 + 5),
        },
        latency: {
          internal: Math.round(Math.random() * 2 + 0.5),
          external: Math.round(Math.random() * 20 + 10),
        },
      },
      storage: {
        nas: {
          model: "Synology DS920+",
          status: "healthy",
          usedPercent: Math.round(Math.random() * 30 + 40),
          raidStatus: "RAID 5 - Optimal",
        },
      },
    };
  }),
});
