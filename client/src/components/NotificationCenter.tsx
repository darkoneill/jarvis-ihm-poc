import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useWebSocket, AlertMessage } from "@/hooks/useWebSocket";
import { AlertCircle, AlertTriangle, Bell, CheckCircle, Info, Trash2, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAudioAlerts, AlertType } from "@/hooks/useAudioAlerts";

export function NotificationCenter() {
  const { isConnected, alerts, clearAlerts } = useWebSocket("/ws", {
    showToasts: true,
  });
  const [isOpen, setIsOpen] = useState(false);
  const { playAlert, initAudioContext } = useAudioAlerts();
  const lastAlertCountRef = useRef(0);

  // Play sound when new alerts arrive
  useEffect(() => {
    if (alerts.length > lastAlertCountRef.current) {
      const newAlerts = alerts.slice(0, alerts.length - lastAlertCountRef.current);
      newAlerts.forEach((alert) => {
        // Map alert type to sound
        let soundType: AlertType | null = null;
        const message = alert.message.toLowerCase();
        
        if (message.includes("gpu") && alert.severity === "critical") {
          soundType = "gpu_critical";
        } else if (message.includes("gpu") && alert.severity === "warning") {
          soundType = "gpu_warning";
        } else if (message.includes("ups") && alert.severity === "critical") {
          soundType = "ups_critical";
        } else if (message.includes("ups") && alert.severity === "warning") {
          soundType = "ups_warning";
        } else if (message.includes("réseau") || message.includes("network")) {
          soundType = "network_down";
        } else if (alert.severity === "critical") {
          soundType = "system_error";
        }
        
        if (soundType) {
          playAlert(soundType);
        }
      });
    }
    lastAlertCountRef.current = alerts.length;
  }, [alerts, playAlert]);

  // Initialize audio context on first interaction
  const handleOpenChange = (open: boolean) => {
    if (open) {
      initAudioContext();
    }
    setIsOpen(open);
  };

  const unreadCount = alerts.length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;

  const getSeverityIcon = (severity: AlertMessage["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityBg = (severity: AlertMessage["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/20";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20";
      case "info":
        return "bg-blue-500/10 border-blue-500/20";
      default:
        return "bg-muted/50 border-border/50";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn("h-5 w-5", criticalCount > 0 && "text-red-500")} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center",
              criticalCount > 0 ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"
            )}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Badge variant="outline" className={cn(
                "text-[10px] gap-1",
                isConnected ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"
              )}>
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnected ? "Live" : "Offline"}
              </Badge>
            </div>
            {alerts.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearAlerts}>
                <Trash2 className="h-3 w-3" />
                Effacer
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Aucune notification</p>
                  <p className="text-xs opacity-70">Les alertes système apparaîtront ici</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {alerts.map((alert, index) => (
                    <div
                      key={`${alert.timestamp}-${index}`}
                      className={cn(
                        "p-3 border-b border-border/30 last:border-0",
                        getSeverityBg(alert.severity)
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">{alert.title}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatTime(alert.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {alert.message}
                          </p>
                          <Badge variant="outline" className="text-[9px] mt-1 h-4 px-1">
                            {alert.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
