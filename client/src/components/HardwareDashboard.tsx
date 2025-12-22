import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Activity, Battery, Cpu, Database, HardDrive, Network, Server, Thermometer, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { useRef } from "react";

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
  // Simulated Data State
  const [orchestrator, setOrchestrator] = useState<NodeStats>({ cpuUsage: 45, ramUsage: 32, gpuUsage: 12, temp: 65, power: 250 });
  const [reflex, setReflex] = useState<NodeStats>({ cpuUsage: 20, ramUsage: 15, gpuUsage: 5, temp: 42, power: 45 });
  const [networkHistory, setNetworkHistory] = useState<NetworkStats[]>([]);
  const [upsBattery, setUpsBattery] = useState(100);
  
  // Refs for alert throttling
  const lastTempAlert = useRef<number>(0);
  const lastUpsAlert = useRef<number>(0);

  const checkThresholds = (orchTemp: number, reflexTemp: number, ups: number) => {
    const now = Date.now();
    const COOLDOWN = 60000; // 1 minute cooldown

    // Check Temperature
    if ((orchTemp > 80 || reflexTemp > 80) && now - lastTempAlert.current > COOLDOWN) {
      toast.error("Alerte Surchauffe !", {
        description: `Température critique détectée : Orchestrator ${orchTemp.toFixed(1)}°C / Reflex ${reflexTemp.toFixed(1)}°C`,
        duration: 5000,
      });
      lastTempAlert.current = now;
    }

    // Check UPS
    if (ups < 20 && now - lastUpsAlert.current > COOLDOWN) {
      toast.warning("Batterie UPS Faible", {
        description: `Niveau de batterie critique : ${ups.toFixed(1)}%. Arrêt imminent recommandé.`,
        duration: 8000,
      });
      lastUpsAlert.current = now;
    }
  };

  const { isConnected } = useWebSocket("/ws/hardware", {
    onMessage: (data) => {
      if (data.orchestrator) setOrchestrator(data.orchestrator);
      if (data.reflex) setReflex(data.reflex);
      if (data.upsBattery) setUpsBattery(data.upsBattery);
      if (data.network) {
        setNetworkHistory(prev => [...prev.slice(-20), data.network]);
      }
      
      // Check thresholds on real data
      if (data.orchestrator && data.reflex && data.upsBattery) {
        checkThresholds(data.orchestrator.temp, data.reflex.temp, data.upsBattery);
      }
    }
  });

  // Simulation Loop (Fallback)
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(() => {
      // Update Nodes
      setOrchestrator(prev => ({
        cpuUsage: Math.min(100, Math.max(0, prev.cpuUsage + (Math.random() * 10 - 5))),
        ramUsage: Math.min(100, Math.max(0, prev.ramUsage + (Math.random() * 2 - 1))),
        gpuUsage: Math.min(100, Math.max(0, prev.gpuUsage + (Math.random() * 20 - 10))),
        temp: Math.min(90, Math.max(40, prev.temp + (Math.random() * 2 - 1))),
        power: Math.min(500, Math.max(100, prev.power + (Math.random() * 50 - 25))),
      }));

      setReflex(prev => ({
        cpuUsage: Math.min(100, Math.max(0, prev.cpuUsage + (Math.random() * 15 - 7))),
        ramUsage: Math.min(100, Math.max(0, prev.ramUsage + (Math.random() * 5 - 2))),
        gpuUsage: Math.min(100, Math.max(0, prev.gpuUsage + (Math.random() * 10 - 5))),
        temp: Math.min(80, Math.max(35, prev.temp + (Math.random() * 3 - 1.5))),
        power: Math.min(100, Math.max(20, prev.power + (Math.random() * 10 - 5))),
      }));

      // Update Network History
      setNetworkHistory(prev => {
        const newPoint = {
          timestamp: new Date().toLocaleTimeString(),
          inbound: Math.random() * 100, // Mbps
          outbound: Math.random() * 50, // Mbps
        };
        return [...prev.slice(-20), newPoint];
      });

      // Simulate UPS discharge slightly
      setUpsBattery(prev => {
        const newVal = Math.max(15, prev - 0.05); // Faster discharge for testing alerts
        return newVal;
      });
      
      // Check thresholds on simulated data
      checkThresholds(orchestrator.temp, reflex.temp, upsBattery);

    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

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

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-2">
        
        {/* Top Bar: Global Status */}
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
                  {!isConnected && <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-500/50 text-orange-500">SIM</Badge>}
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
                <p className="text-xs text-muted-foreground font-medium">UPS (APC 1500VA)</p>
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
                <h3 className="text-lg font-bold font-mono">0.4 ms</h3>
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
                  <div className="text-xs text-muted-foreground">RAM (128G)</div>
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
                    1.2T / 4T
                  </span>
                </div>
              </div>
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
                    42 ms
                  </span>
                </div>
              </div>
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
                  <span className="text-muted-foreground">NVMe RAG (2To)</span>
                  <span className="font-mono">45%</span>
                </div>
                <Progress value={45} className="h-2 bg-muted" />
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
                  <span className="text-muted-foreground">Backup Externe</span>
                  <span className="font-mono text-green-500">OK (Hier 03:00)</span>
                </div>
                <Progress value={100} className="h-2 bg-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
