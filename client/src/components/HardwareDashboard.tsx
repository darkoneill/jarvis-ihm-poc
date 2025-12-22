import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Activity, Battery, Cpu, Database, HardDrive, Loader2, Network, RefreshCw, Server, Thermometer, Zap } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Types for Hardware Data
interface NodeStats {
  cpuUsage: number;
  ramUsage: number;
  gpuUsage: number;
  temp: number;
  power: number;
}

interface NetworkStats {
  timestamp: string;
  inbound: number;
  outbound: number;
}

export function HardwareDashboard() {
  // State
  const [orchestrator, setOrchestrator] = useState<NodeStats>({ cpuUsage: 45, ramUsage: 32, gpuUsage: 12, temp: 65, power: 250 });
  const [reflex, setReflex] = useState<NodeStats>({ cpuUsage: 20, ramUsage: 15, gpuUsage: 5, temp: 42, power: 45 });
  const [networkHistory, setNetworkHistory] = useState<NetworkStats[]>([]);
  const [upsBattery, setUpsBattery] = useState(100);
  const [latency, setLatency] = useState(0.4);
  const [isLive, setIsLive] = useState(true);
  
  // Refs for alert throttling
  const lastTempAlert = useRef<number>(0);
  const lastUpsAlert = useRef<number>(0);

  // tRPC queries with auto-refresh
  const systemMetrics = trpc.hardware.getMetrics.useQuery(undefined, {
    refetchInterval: isLive ? 3000 : false,
  });
  
  const dgxMetrics = trpc.hardware.getDgxSparkMetrics.useQuery(undefined, {
    refetchInterval: isLive ? 3000 : false,
  });
  
  const jetsonMetrics = trpc.hardware.getJetsonThorMetrics.useQuery(undefined, {
    refetchInterval: isLive ? 3000 : false,
  });
  
  const infraMetrics = trpc.hardware.getInfrastructureMetrics.useQuery(undefined, {
    refetchInterval: isLive ? 5000 : false,
  });

  // Update state from tRPC data
  useEffect(() => {
    if (dgxMetrics.data) {
      const dgx = dgxMetrics.data;
      setOrchestrator({
        cpuUsage: dgx.cpu.usage,
        ramUsage: dgx.memory.usagePercent,
        gpuUsage: dgx.gpu.usage,
        temp: dgx.cpu.temperature,
        power: dgx.cpu.usage * 5 + 100, // Simulated power based on usage
      });
    }
  }, [dgxMetrics.data]);

  useEffect(() => {
    if (jetsonMetrics.data) {
      const jetson = jetsonMetrics.data;
      setReflex({
        cpuUsage: jetson.soc.usage,
        ramUsage: jetson.memory.usagePercent,
        gpuUsage: jetson.gpu.usage,
        temp: jetson.soc.temperature,
        power: jetson.soc.usage + 20,
      });
      setLatency(jetson.latency.reflexLoop / 1000); // Convert to ms
    }
  }, [jetsonMetrics.data]);

  useEffect(() => {
    if (infraMetrics.data) {
      setUpsBattery(infraMetrics.data.ups.batteryPercent);
    }
  }, [infraMetrics.data]);

  // Update network history
  useEffect(() => {
    if (systemMetrics.data) {
      const net = systemMetrics.data.network;
      setNetworkHistory(prev => {
        const newPoint = {
          timestamp: new Date().toLocaleTimeString(),
          inbound: (net.rx / 1024 / 1024) % 100, // Convert to Mbps (simulated)
          outbound: (net.tx / 1024 / 1024) % 50,
        };
        return [...prev.slice(-20), newPoint];
      });
    }
  }, [systemMetrics.data]);

  const checkThresholds = (orchTemp: number, reflexTemp: number, ups: number) => {
    const now = Date.now();
    const COOLDOWN = 60000;

    if ((orchTemp > 80 || reflexTemp > 80) && now - lastTempAlert.current > COOLDOWN) {
      toast.error("Alerte Surchauffe !", {
        description: `Température critique détectée : Orchestrator ${orchTemp.toFixed(1)}°C / Reflex ${reflexTemp.toFixed(1)}°C`,
        duration: 5000,
      });
      lastTempAlert.current = now;
    }

    if (ups < 20 && now - lastUpsAlert.current > COOLDOWN) {
      toast.warning("Batterie UPS Faible", {
        description: `Niveau de batterie critique : ${ups.toFixed(1)}%. Arrêt imminent recommandé.`,
        duration: 8000,
      });
      lastUpsAlert.current = now;
    }
  };

  // Check thresholds when data changes
  useEffect(() => {
    checkThresholds(orchestrator.temp, reflex.temp, upsBattery);
  }, [orchestrator.temp, reflex.temp, upsBattery]);

  const isLoading = systemMetrics.isLoading || dgxMetrics.isLoading || jetsonMetrics.isLoading;
  const hasData = dgxMetrics.data || jetsonMetrics.data;

  const getStatusColor = (usage: number) => {
    if (usage > 90) return "text-red-500";
    if (usage > 70) return "text-orange-500";
    return "text-green-500";
  };

  const getTempColor = (temp: number) => {
    if (temp > 80) return "text-red-500";
    if (temp > 70) return "text-orange-500";
    return "text-blue-500";
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024 / 1024).toFixed(1)}T`;
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}G`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
    return `${(bytes / 1024).toFixed(1)}K`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-2">
        
        {/* Top Bar: Global Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Monitoring Hardware</h2>
            {hasData && (
              <Badge variant="outline" className="text-green-500 border-green-500/30">
                API Connectée
              </Badge>
            )}
            {!hasData && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                Mode Simulation
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={cn("gap-2", isLive && "text-green-500")}
            >
              <Activity className={cn("h-4 w-4", isLive && "animate-pulse")} />
              {isLive ? "Live" : "Paused"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                systemMetrics.refetch();
                dgxMetrics.refetch();
                jetsonMetrics.refetch();
                infraMetrics.refetch();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Santé Globale</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-green-500">OPTIMAL</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Conso. Totale</p>
                <h3 className="text-lg font-bold font-mono">{(orchestrator.power + reflex.power).toFixed(0)} W</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Battery className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">UPS (APC 3000VA)</p>
                <h3 className="text-lg font-bold font-mono">{upsBattery.toFixed(1)}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Latence N2-N0</p>
                <h3 className="text-lg font-bold font-mono">{latency.toFixed(1)} ms</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compute Nodes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Orchestrator Node */}
          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Nœud Orchestrateur (DGX Spark)</CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-green-500/10 text-green-500 border-green-500/20">ONLINE</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">CPU Load</div>
                  <div className={cn("text-2xl font-bold font-mono", getStatusColor(orchestrator.cpuUsage))}>
                    {orchestrator.cpuUsage.toFixed(0)}%
                  </div>
                  <Progress value={orchestrator.cpuUsage} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">RAM (1TB)</div>
                  <div className={cn("text-2xl font-bold font-mono", getStatusColor(orchestrator.ramUsage))}>
                    {orchestrator.ramUsage.toFixed(0)}%
                  </div>
                  <Progress value={orchestrator.ramUsage} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">GPU Load</div>
                  <div className={cn("text-2xl font-bold font-mono", getStatusColor(orchestrator.gpuUsage))}>
                    {orchestrator.gpuUsage.toFixed(0)}%
                  </div>
                  <Progress value={orchestrator.gpuUsage} className="h-1.5" />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Thermometer className="h-4 w-4" /> Temp
                  </div>
                  <span className={cn("font-mono font-bold", getTempColor(orchestrator.temp))}>
                    {orchestrator.temp.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HardDrive className="h-4 w-4" /> NVMe RAG
                  </div>
                  <span className="font-mono font-bold text-green-500">
                    {dgxMetrics.data ? formatBytes(dgxMetrics.data.storage.nvme.used) : "1.2T"} / 15T
                  </span>
                </div>
              </div>
              
              {dgxMetrics.data && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">GPU:</span> {dgxMetrics.data.gpu.count}x {dgxMetrics.data.gpu.model} • 
                  <span className="font-medium ml-2">CPU:</span> {dgxMetrics.data.cpu.model}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reflex Node */}
          <Card className="border-purple-500/20 shadow-lg shadow-purple-500/5">
            <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-base">Nœud Réflexe (Jetson Thor)</CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-green-500/10 text-green-500 border-green-500/20">ONLINE</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">SoC Load</div>
                  <div className={cn("text-2xl font-bold font-mono", getStatusColor(reflex.cpuUsage))}>
                    {reflex.cpuUsage.toFixed(0)}%
                  </div>
                  <Progress value={reflex.cpuUsage} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">RAM (128G)</div>
                  <div className={cn("text-2xl font-bold font-mono", getStatusColor(reflex.ramUsage))}>
                    {reflex.ramUsage.toFixed(0)}%
                  </div>
                  <Progress value={reflex.ramUsage} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">NPU Load</div>
                  <div className={cn("text-2xl font-bold font-mono", getStatusColor(reflex.gpuUsage))}>
                    {reflex.gpuUsage.toFixed(0)}%
                  </div>
                  <Progress value={reflex.gpuUsage} className="h-1.5" />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Thermometer className="h-4 w-4" /> Temp
                  </div>
                  <span className={cn("font-mono font-bold", getTempColor(reflex.temp))}>
                    {reflex.temp.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4" /> Latence
                  </div>
                  <span className="font-mono font-bold text-green-500">
                    {jetsonMetrics.data ? jetsonMetrics.data.latency.reflexLoop : 42} ms
                  </span>
                </div>
              </div>
              
              {jetsonMetrics.data && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">SoC:</span> {jetsonMetrics.data.soc.model} • 
                  <span className="font-medium ml-2">Camera:</span> {jetsonMetrics.data.camera.resolution} @ {jetsonMetrics.data.camera.fps}fps
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Network & Storage Infrastructure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Graph */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Network className="h-4 w-4" /> Trafic Réseau (Switch 25GbE)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkHistory}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="inbound" stroke="#10B981" fillOpacity={1} fill="url(#colorIn)" name="Inbound (Mbps)" />
                  <Area type="monotone" dataKey="outbound" stroke="#3B82F6" fillOpacity={1} fill="url(#colorOut)" name="Outbound (Mbps)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Storage & Backup */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" /> Stockage & Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">NVMe RAG (15To)</span>
                  <span className="font-mono">{infraMetrics.data?.storage?.nas?.usedPercent || 45}%</span>
                </div>
                <Progress value={infraMetrics.data?.storage?.nas?.usedPercent || 45} className="h-2 bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SSD Logs (1To)</span>
                  <span className="font-mono">78%</span>
                </div>
                <Progress value={78} className="h-2 bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">NAS Backup</span>
                  <span className="font-mono text-green-500">{infraMetrics.data?.storage?.nas?.raidStatus || "RAID 5 - OK"}</span>
                </div>
                <Progress value={100} className="h-2 bg-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        {systemMetrics.data && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Informations Système (Sandbox)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Hostname:</span>
                  <span className="ml-2 font-mono">{systemMetrics.data.system.hostname}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">CPU:</span>
                  <span className="ml-2 font-mono">{systemMetrics.data.system.cpuCount} cores</span>
                </div>
                <div>
                  <span className="text-muted-foreground">RAM:</span>
                  <span className="ml-2 font-mono">{formatBytes(systemMetrics.data.memory.total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Uptime:</span>
                  <span className="ml-2 font-mono">{systemMetrics.data.system.uptime.formatted}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
