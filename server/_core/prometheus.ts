/**
 * PrometheusClient - Client pour récupérer les métriques depuis Prometheus
 * 
 * Ce client permet de récupérer les métriques hardware du DGX Spark et Jetson Thor
 * via l'API Prometheus.
 */

import { z } from 'zod';

// Schéma de réponse Prometheus
const PrometheusResultSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.object({
    resultType: z.enum(['vector', 'matrix', 'scalar', 'string']),
    result: z.array(z.object({
      metric: z.record(z.string(), z.string()),
      value: z.tuple([z.number(), z.string()]).optional(),
      values: z.array(z.tuple([z.number(), z.string()])).optional(),
    })),
  }).optional(),
  error: z.string().optional(),
  errorType: z.string().optional(),
});

type PrometheusResult = z.infer<typeof PrometheusResultSchema>;

export interface PrometheusConfig {
  url: string;
  timeout?: number;
  basicAuth?: {
    username: string;
    password: string;
  };
}

export interface MetricValue {
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

export interface RangeMetricValue {
  labels: Record<string, string>;
  values: Array<{ timestamp: number; value: number }>;
}

export class PrometheusClient {
  private config: PrometheusConfig;

  constructor(config: PrometheusConfig | string) {
    if (typeof config === 'string') {
      this.config = { url: config, timeout: 10000 };
    } else {
      this.config = { timeout: 10000, ...config };
    }
  }

  /**
   * Exécute une requête PromQL instantanée
   */
  async query(promql: string): Promise<MetricValue[]> {
    const url = new URL('/api/v1/query', this.config.url);
    url.searchParams.set('query', promql);

    const response = await this.fetch(url.toString());
    const data = PrometheusResultSchema.parse(response);

    if (data.status === 'error') {
      throw new Error(`Prometheus error: ${data.error}`);
    }

    if (!data.data || data.data.resultType !== 'vector') {
      return [];
    }

    return data.data.result.map((r) => ({
      labels: r.metric,
      value: r.value ? parseFloat(r.value[1]) : 0,
      timestamp: r.value ? r.value[0] * 1000 : Date.now(),
    }));
  }

  /**
   * Exécute une requête PromQL sur une plage de temps
   */
  async queryRange(
    promql: string,
    start: Date,
    end: Date,
    step: string = '15s'
  ): Promise<RangeMetricValue[]> {
    const url = new URL('/api/v1/query_range', this.config.url);
    url.searchParams.set('query', promql);
    url.searchParams.set('start', (start.getTime() / 1000).toString());
    url.searchParams.set('end', (end.getTime() / 1000).toString());
    url.searchParams.set('step', step);

    const response = await this.fetch(url.toString());
    const data = PrometheusResultSchema.parse(response);

    if (data.status === 'error') {
      throw new Error(`Prometheus error: ${data.error}`);
    }

    if (!data.data || data.data.resultType !== 'matrix') {
      return [];
    }

    return data.data.result.map((r) => ({
      labels: r.metric,
      values: (r.values || []).map(([ts, val]) => ({
        timestamp: ts * 1000,
        value: parseFloat(val),
      })),
    }));
  }

  /**
   * Récupère une valeur scalaire simple
   */
  async queryScalar(promql: string): Promise<number | null> {
    const results = await this.query(promql);
    return results.length > 0 ? results[0].value : null;
  }

  /**
   * Vérifie la connectivité avec Prometheus
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = new URL('/-/healthy', this.config.url);
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async fetch(url: string): Promise<unknown> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.config.basicAuth) {
      const credentials = Buffer.from(
        `${this.config.basicAuth.username}:${this.config.basicAuth.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 10000),
    });

    if (!response.ok) {
      throw new Error(`Prometheus HTTP error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Requêtes PromQL prédéfinies pour Jarvis
export const JARVIS_METRICS = {
  // CPU
  CPU_USAGE: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
  CPU_USAGE_PER_CORE: 'rate(node_cpu_seconds_total{mode!="idle"}[5m]) * 100',
  
  // Mémoire
  MEMORY_USAGE_PERCENT: '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100',
  MEMORY_AVAILABLE_GB: 'node_memory_MemAvailable_bytes / 1073741824',
  MEMORY_TOTAL_GB: 'node_memory_MemTotal_bytes / 1073741824',
  
  // GPU (NVIDIA)
  GPU_TEMPERATURE: 'nvidia_smi_temperature_gpu',
  GPU_UTILIZATION: 'nvidia_smi_utilization_gpu',
  GPU_MEMORY_USED_GB: 'nvidia_smi_memory_used_bytes / 1073741824',
  GPU_MEMORY_TOTAL_GB: 'nvidia_smi_memory_total_bytes / 1073741824',
  GPU_POWER_WATTS: 'nvidia_smi_power_draw_watts',
  
  // Disque
  DISK_USAGE_PERCENT: '(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100',
  DISK_AVAILABLE_GB: 'node_filesystem_avail_bytes{mountpoint="/"} / 1073741824',
  
  // Réseau
  NETWORK_RX_BYTES_RATE: 'rate(node_network_receive_bytes_total{device!="lo"}[5m])',
  NETWORK_TX_BYTES_RATE: 'rate(node_network_transmit_bytes_total{device!="lo"}[5m])',
  
  // Système
  UPTIME_SECONDS: 'node_time_seconds - node_boot_time_seconds',
  LOAD_AVERAGE_1M: 'node_load1',
  LOAD_AVERAGE_5M: 'node_load5',
  LOAD_AVERAGE_15M: 'node_load15',
};

// Singleton pour l'instance Prometheus
let prometheusInstance: PrometheusClient | null = null;

export function getPrometheusClient(): PrometheusClient | null {
  if (!prometheusInstance) {
    const url = process.env.PROMETHEUS_URL;
    if (url) {
      prometheusInstance = new PrometheusClient({
        url,
        basicAuth: process.env.PROMETHEUS_USER && process.env.PROMETHEUS_PASSWORD
          ? {
              username: process.env.PROMETHEUS_USER,
              password: process.env.PROMETHEUS_PASSWORD,
            }
          : undefined,
      });
    }
  }
  return prometheusInstance;
}
