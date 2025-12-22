import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

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
  
  // This gives instantaneous values, not delta - for demo purposes
  // In production, you'd track deltas between measurements
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
    // Try thermal zone first
    const temp = await safeExec("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null");
    if (temp) {
      return parseInt(temp, 10) / 1000;
    }
    
    // Try sensors command
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

export const hardwareRouter = router({
  getMetrics: publicProcedure.query(async () => {
    // Read system info
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
    
    // System info
    const cpuCount = os.cpus().length;
    const cpuModel = os.cpus()[0]?.model || "Unknown CPU";
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    
    return {
      timestamp: new Date().toISOString(),
      system: {
        hostname,
        platform,
        arch,
        cpuModel,
        cpuCount,
        uptime,
      },
      cpu: {
        usage: cpuUsage,
        temperature: cpuTemp,
        loadAverage: loadAvg,
      },
      memory: {
        total: memory.total,
        used: memory.used,
        free: memory.free,
        usagePercent: memory.total > 0 ? Math.round((memory.used / memory.total) * 100) : 0,
      },
      disk: diskInfo,
      network: networkInfo,
      // Simulated GPU data for DGX Spark / Jetson Thor (would use nvidia-smi in production)
      gpu: {
        available: false,
        name: "Simulated GPU",
        temperature: null,
        usage: null,
        memoryUsed: null,
        memoryTotal: null,
      },
    };
  }),

  // Simulated metrics for DGX Spark node
  getDgxSparkMetrics: publicProcedure.query(async () => {
    // In production, this would SSH to the DGX Spark or use an agent
    return {
      node: "DGX Spark (Orchestrator N2)",
      status: "simulated",
      cpu: {
        model: "AMD EPYC 7742 64-Core",
        cores: 128,
        usage: Math.round(Math.random() * 30 + 10), // 10-40%
        temperature: Math.round(Math.random() * 15 + 45), // 45-60°C
      },
      memory: {
        total: 1024 * 1024 * 1024 * 1024, // 1TB
        used: Math.round(Math.random() * 200 + 100) * 1024 * 1024 * 1024, // 100-300GB
        usagePercent: Math.round(Math.random() * 20 + 10), // 10-30%
      },
      gpu: {
        model: "NVIDIA A100 80GB",
        count: 8,
        usage: Math.round(Math.random() * 40 + 20), // 20-60%
        temperature: Math.round(Math.random() * 20 + 50), // 50-70°C
        memoryUsed: Math.round(Math.random() * 30 + 10), // 10-40GB per GPU
        memoryTotal: 80,
      },
      storage: {
        nvme: {
          total: 15 * 1024 * 1024 * 1024 * 1024, // 15TB
          used: Math.round(Math.random() * 5 + 2) * 1024 * 1024 * 1024 * 1024, // 2-7TB
          health: "GOOD",
        },
      },
    };
  }),

  // Simulated metrics for Jetson Thor node
  getJetsonThorMetrics: publicProcedure.query(async () => {
    // In production, this would query the Jetson Thor via API
    return {
      node: "Jetson Thor (Reflex N0)",
      status: "simulated",
      soc: {
        model: "NVIDIA Thor SoC",
        usage: Math.round(Math.random() * 50 + 30), // 30-80%
        temperature: Math.round(Math.random() * 15 + 55), // 55-70°C
      },
      memory: {
        total: 128 * 1024 * 1024 * 1024, // 128GB unified
        used: Math.round(Math.random() * 40 + 20) * 1024 * 1024 * 1024, // 20-60GB
        usagePercent: Math.round(Math.random() * 30 + 20), // 20-50%
      },
      gpu: {
        model: "Blackwell GPU (integrated)",
        usage: Math.round(Math.random() * 60 + 30), // 30-90%
        temperature: Math.round(Math.random() * 15 + 60), // 60-75°C
      },
      latency: {
        reflexLoop: Math.round(Math.random() * 20 + 35), // 35-55ms
        visionPipeline: Math.round(Math.random() * 10 + 15), // 15-25ms
      },
      camera: {
        status: "active",
        fps: 60,
        resolution: "4K",
      },
    };
  }),

  // Infrastructure metrics (UPS, Network, etc.)
  getInfrastructureMetrics: publicProcedure.query(async () => {
    return {
      ups: {
        model: "APC Smart-UPS 3000VA",
        status: "online",
        batteryPercent: Math.round(Math.random() * 10 + 90), // 90-100%
        loadPercent: Math.round(Math.random() * 20 + 40), // 40-60%
        runtimeMinutes: Math.round(Math.random() * 30 + 60), // 60-90 min
        inputVoltage: Math.round(Math.random() * 10 + 225), // 225-235V
      },
      network: {
        firewall: {
          model: "pfSense",
          status: "active",
          throughput: Math.round(Math.random() * 500 + 100), // 100-600 Mbps
        },
        switch: {
          model: "Cisco SG350-28P",
          ports: 28,
          activeConnections: Math.round(Math.random() * 10 + 5), // 5-15
        },
        latency: {
          internal: Math.round(Math.random() * 2 + 0.5), // 0.5-2.5ms
          external: Math.round(Math.random() * 20 + 10), // 10-30ms
        },
      },
      storage: {
        nas: {
          model: "Synology DS920+",
          status: "healthy",
          usedPercent: Math.round(Math.random() * 30 + 40), // 40-70%
          raidStatus: "RAID 5 - Optimal",
        },
      },
    };
  }),
});
