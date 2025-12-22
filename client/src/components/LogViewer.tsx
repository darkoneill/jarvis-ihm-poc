import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertTriangle, Bug, CheckCircle, Database, Info, Pause, Play, RefreshCw, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "CRITICAL";
  source: "N0" | "N1" | "N2" | "IHM" | "SYSTEM";
  message: string;
  traceId?: string;
}

// Mapper les niveaux de log du backend vers le frontend
function mapLevel(level: string): LogEntry["level"] {
  switch (level.toLowerCase()) {
    case "info": return "INFO";
    case "warn": return "WARN";
    case "error": return "ERROR";
    case "debug": return "DEBUG";
    case "critical": return "CRITICAL";
    default: return "INFO";
  }
}

// Mapper les sources du backend vers le frontend
function mapSource(layer: string): LogEntry["source"] {
  switch (layer.toUpperCase()) {
    case "N0": return "N0";
    case "N1": return "N1";
    case "N2": return "N2";
    case "IHM": return "IHM";
    default: return "SYSTEM";
  }
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterText, setFilterText] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Récupérer les logs depuis le backend
  const { data: logsData, refetch } = trpc.logs.getRecent.useQuery(
    { 
      limit: 500,
      layer: filterSource === "ALL" ? "all" : filterSource.toLowerCase() as "N0" | "N1" | "N2" | "IHM",
      level: filterLevel === "ALL" ? "all" : filterLevel.toLowerCase() as "debug" | "info" | "warn" | "error" | "critical",
    },
    { 
      refetchInterval: isPaused ? false : 2000,
      staleTime: 1000,
    }
  );

  // Récupérer les stats
  const { data: stats } = trpc.logs.getStats.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Récupérer le statut Redis
  const { data: redisStatus } = trpc.logs.getRedisStatus.useQuery();

  // Mutation pour vider les logs
  const clearLogs = trpc.logs.clear.useMutation({
    onSuccess: () => {
      setLogs([]);
      refetch();
    },
  });

  // Mettre à jour les logs quand les données changent
  useEffect(() => {
    if (logsData?.logs) {
      const mappedLogs: LogEntry[] = logsData.logs.map((log, index) => ({
        id: `${log.timestamp}-${index}`,
        timestamp: new Date(log.timestamp),
        level: mapLevel(log.level),
        source: mapSource(log.layer),
        message: log.message,
        traceId: log.source,
      }));
      setLogs(mappedLogs);
    }
  }, [logsData]);

  // Auto-scroll
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter((log) => {
    const matchesText = log.message.toLowerCase().includes(filterText.toLowerCase()) || 
                        log.source.toLowerCase().includes(filterText.toLowerCase()) ||
                        log.traceId?.toLowerCase().includes(filterText.toLowerCase());
    return matchesText;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "INFO": return "text-green-500";
      case "WARN": return "text-orange-500";
      case "ERROR": return "text-red-500";
      case "DEBUG": return "text-blue-500";
      case "CRITICAL": return "text-red-600 font-bold";
      default: return "text-muted-foreground";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "INFO": return <CheckCircle className="h-3 w-3" />;
      case "WARN": return <AlertTriangle className="h-3 w-3" />;
      case "ERROR": return <Bug className="h-3 w-3" />;
      case "DEBUG": return <Info className="h-3 w-3" />;
      case "CRITICAL": return <AlertTriangle className="h-3 w-3 animate-pulse" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "N0": return "border-purple-500/50 text-purple-400";
      case "N1": return "border-blue-500/50 text-blue-400";
      case "N2": return "border-cyan-500/50 text-cyan-400";
      case "IHM": return "border-green-500/50 text-green-400";
      default: return "border-muted-foreground/30 text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrer les logs..." 
            className="pl-8 h-8 text-xs font-mono" 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Niveau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="DEBUG">DEBUG</SelectItem>
            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes</SelectItem>
            <SelectItem value="N0">N0 (Reflex)</SelectItem>
            <SelectItem value="N1">N1 (Planner)</SelectItem>
            <SelectItem value="N2">N2 (LLM)</SelectItem>
            <SelectItem value="IHM">IHM</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Stats rapides */}
        {stats && (
          <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="text-purple-400">N0:{stats.byLayer.N0}</span>
            <span className="text-blue-400">N1:{stats.byLayer.N1}</span>
            <span className="text-cyan-400">N2:{stats.byLayer.N2}</span>
            {stats.byLevel.error > 0 && (
              <span className="text-red-400">ERR:{stats.byLevel.error}</span>
            )}
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={() => refetch()}
          title="Rafraîchir"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? "Reprendre" : "Pause"}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={() => clearLogs.mutate()}
          title="Vider les logs"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Logs Table Header */}
      <div className="grid grid-cols-[140px_80px_60px_1fr] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
        <div>TIMESTAMP</div>
        <div>LEVEL</div>
        <div>SOURCE</div>
        <div>MESSAGE</div>
      </div>

      {/* Logs List */}
      <ScrollArea className="flex-1 bg-black/90 font-mono text-xs" ref={scrollRef}>
        <div className="flex flex-col min-w-full">
          {filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="grid grid-cols-[140px_80px_60px_1fr] gap-2 px-4 py-1 hover:bg-white/5 border-b border-white/5 last:border-0 items-center group"
            >
              <div className="text-muted-foreground opacity-70">
                {log.timestamp.toISOString().split('T')[1].slice(0, -1)}
              </div>
              
              <div className={cn("flex items-center gap-1.5 font-bold", getLevelColor(log.level))}>
                {getLevelIcon(log.level)}
                {log.level}
              </div>
              
              <div>
                <Badge variant="outline" className={cn("text-[10px] h-4 px-1 py-0", getSourceColor(log.source))}>
                  {log.source}
                </Badge>
              </div>
              
              <div className="truncate text-foreground/90 group-hover:whitespace-normal group-hover:break-all">
                {log.message}
                {log.traceId && (
                  <span className="ml-2 text-[10px] text-muted-foreground opacity-50">
                    src:{log.traceId}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-muted-foreground italic">
              Aucun log ne correspond aux critères.
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Footer Status */}
      <div className="px-2 py-1 bg-muted/30 border-t border-border text-[10px] text-muted-foreground flex justify-between">
        <span>{filteredLogs.length} logs affichés (Buffer: {logsData?.total || 0})</span>
        <div className="flex items-center gap-3">
          {/* Redis Status */}
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              redisStatus?.connected ? "bg-green-500" : "bg-orange-500"
            )}></span>
            <span>{redisStatus?.mode === 'redis' ? 'Redis' : 'Simulation'}</span>
          </div>
          
          {/* Live Status */}
          <div className="flex items-center gap-1">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              isPaused ? "bg-orange-500" : "bg-green-500 animate-pulse"
            )}></span>
            <span>{isPaused ? "PAUSED" : "LIVE"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
