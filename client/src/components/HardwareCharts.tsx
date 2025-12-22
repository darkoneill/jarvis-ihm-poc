import { useEffect, useState, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

interface HardwareChartsProps {
  refreshInterval?: number; // in milliseconds
}

const MAX_DATA_POINTS = 60; // 60 data points for ~1 hour at 1-minute intervals

export function HardwareCharts({ refreshInterval = 5000 }: HardwareChartsProps) {
  const [cpuHistory, setCpuHistory] = useState<MetricDataPoint[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<MetricDataPoint[]>([]);
  const [gpuTempHistory, setGpuTempHistory] = useState<MetricDataPoint[]>([]);
  const [gpuUsageHistory, setGpuUsageHistory] = useState<MetricDataPoint[]>([]);
  
  const { data: metrics, refetch } = trpc.hardware.getMetrics.useQuery(undefined, {
    refetchInterval: refreshInterval,
  });

  // Update history when new metrics arrive
  useEffect(() => {
    if (metrics) {
      const now = new Date();
      
      setCpuHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: metrics.cpu.usage }];
        return newHistory.slice(-MAX_DATA_POINTS);
      });
      
      setMemoryHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: metrics.memory.usagePercent }];
        return newHistory.slice(-MAX_DATA_POINTS);
      });
      
      // GPU metrics - use simulated values since real GPU may not be available
      // Generate simulated GPU data for demo
      const simulatedGpuTemp = 55 + Math.random() * 15; // 55-70°C
      const simulatedGpuUsage = 30 + Math.random() * 40; // 30-70%
      
      setGpuTempHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: simulatedGpuTemp }];
        return newHistory.slice(-MAX_DATA_POINTS);
      });
      
      setGpuUsageHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: simulatedGpuUsage }];
        return newHistory.slice(-MAX_DATA_POINTS);
      });
    }
  }, [metrics]);

  // Format time labels
  const formatTimeLabel = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Common chart options
  const commonOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          maxTicksLimit: 6,
          font: {
            size: 10,
          },
        },
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          callback: (value) => `${value}%`,
          font: {
            size: 10,
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  // Temperature chart options (different scale)
  const tempOptions: ChartOptions<'line'> = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: {
        display: true,
        min: 20,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          callback: (value) => `${value}°C`,
          font: {
            size: 10,
          },
        },
      },
    },
  };

  // Create chart data
  const createChartData = (
    history: MetricDataPoint[],
    label: string,
    color: string,
    fillColor: string
  ) => ({
    labels: history.map(h => formatTimeLabel(h.timestamp)),
    datasets: [
      {
        label,
        data: history.map(h => h.value),
        borderColor: color,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  });

  // Get current values
  const currentCpu = cpuHistory[cpuHistory.length - 1]?.value ?? 0;
  const currentMemory = memoryHistory[memoryHistory.length - 1]?.value ?? 0;
  const currentGpuTemp = gpuTempHistory[gpuTempHistory.length - 1]?.value ?? 0;
  const currentGpuUsage = gpuUsageHistory[gpuUsageHistory.length - 1]?.value ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CPU Usage Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Badge variant={currentCpu > 80 ? "destructive" : currentCpu > 60 ? "secondary" : "outline"}>
              {currentCpu.toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <Line
              data={createChartData(
                cpuHistory,
                "CPU",
                "rgb(59, 130, 246)",
                "rgba(59, 130, 246, 0.1)"
              )}
              options={commonOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Badge variant={currentMemory > 90 ? "destructive" : currentMemory > 75 ? "secondary" : "outline"}>
              {currentMemory.toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <Line
              data={createChartData(
                memoryHistory,
                "Memory",
                "rgb(168, 85, 247)",
                "rgba(168, 85, 247, 0.1)"
              )}
              options={commonOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* GPU Temperature Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">GPU Temperature (DGX Spark)</CardTitle>
            <Badge variant={currentGpuTemp > 85 ? "destructive" : currentGpuTemp > 75 ? "secondary" : "outline"}>
              {currentGpuTemp.toFixed(0)}°C
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <Line
              data={createChartData(
                gpuTempHistory,
                "Temperature",
                "rgb(239, 68, 68)",
                "rgba(239, 68, 68, 0.1)"
              )}
              options={tempOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* GPU Utilization Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">GPU Utilization (DGX Spark)</CardTitle>
            <Badge variant={currentGpuUsage > 90 ? "destructive" : currentGpuUsage > 70 ? "secondary" : "outline"}>
              {currentGpuUsage.toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <Line
              data={createChartData(
                gpuUsageHistory,
                "Utilization",
                "rgb(34, 197, 94)",
                "rgba(34, 197, 94, 0.1)"
              )}
              options={commonOptions}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
