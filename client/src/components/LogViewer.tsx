import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertTriangle, Bug, CheckCircle, Info, Pause, Play, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  source: "N0" | "N1" | "N2" | "SYSTEM";
  message: string;
  traceId?: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterText, setFilterText] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isConnected } = useWebSocket("/ws/logs", {
    onMessage: (data) => {
      if (isPaused) return;
      // Expecting data to be LogEntry or array of LogEntry
      const newLogs = Array.isArray(data) ? data : [data];
      // Ensure timestamp is Date object
      const processedLogs = newLogs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
      setLogs((prev) => [...prev.slice(-999), ...processedLogs]);
    }
  });

  // Simulate incoming logs ONLY if not connected (Fallback)
  useEffect(() => {
    if (isPaused || isConnected) return;

    const interval = setInterval(() => {
      const levels: LogEntry["level"][] = ["INFO", "INFO", "INFO", "DEBUG", "WARN", "ERROR"];
      const sources: LogEntry["source"][] = ["N0", "N1", "N2", "SYSTEM"];
      const messages = [
        "Processing user request...",
        "Memory usage at 45%",
        "Connection established with OpenAI API",
        "Retrying connection to Redis...",
        "Failed to parse JSON response",
        "Garbage collection started",
        "N1 Investigator spawned for deep analysis",
        "Reflex N0 triggered safety guard",
      ];

      const newLog: LogEntry = {
        id: Date.now().toString() + Math.random().toString(),
        timestamp: new Date(),
        level: levels[Math.floor(Math.random() * levels.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        traceId: Math.random().toString(36).substring(7),
      };

      setLogs((prev) => [...prev.slice(-999), newLog]); // Keep last 1000 logs
    }, 800);

    return () => clearInterval(interval);
  }, [isPaused, isConnected]);

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
    const matchesLevel = filterLevel === "ALL" || log.level === filterLevel;
    return matchesText && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "INFO": return "text-green-500";
      case "WARN": return "text-orange-500";
      case "ERROR": return "text-red-500";
      case "DEBUG": return "text-blue-500";
      default: return "text-muted-foreground";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "INFO": return <CheckCircle className="h-3 w-3" />;
      case "WARN": return <AlertTriangle className="h-3 w-3" />;
      case "ERROR": return <Bug className="h-3 w-3" />;
      case "DEBUG": return <Info className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
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
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={() => setLogs([])}
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
                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-muted-foreground/30 text-muted-foreground">
                  {log.source}
                </Badge>
              </div>
              
              <div className="truncate text-foreground/90 group-hover:whitespace-normal group-hover:break-all">
                {log.message}
                {log.traceId && (
                  <span className="ml-2 text-[10px] text-muted-foreground opacity-50">
                    tid:{log.traceId}
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
        <span>{filteredLogs.length} logs affichés (Total: {logs.length})</span>
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-green-500" : "bg-orange-500")}></span>
          <span>{isPaused ? "PAUSED" : (isConnected ? "LIVE (WS)" : "LIVE (SIM)")}</span>
        </div>
      </div>
    </div>
  );
}
