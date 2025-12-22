import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Monitor,
  MonitorUp,
  ExternalLink,
  X,
  Settings2,
  RefreshCw,
  Maximize2,
  Minimize2,
  Link2,
  Link2Off,
} from "lucide-react";

// Module types that can be displayed in separate windows
type ModuleType = 
  | "dialogue"
  | "logs"
  | "tasks"
  | "hardware"
  | "calendar"
  | "knowledge"
  | "workflows"
  | "dashboard"
  | "plugins";

interface DetachedWindow {
  id: string;
  module: ModuleType;
  window: Window | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface MultiScreenManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODULE_CONFIG: Record<ModuleType, { name: string; icon: string; path: string }> = {
  dialogue: { name: "Dialogue", icon: "💬", path: "/" },
  logs: { name: "Logs", icon: "📋", path: "/logs" },
  tasks: { name: "Tâches", icon: "✓", path: "/tasks" },
  hardware: { name: "Hardware", icon: "🖥️", path: "/hardware" },
  calendar: { name: "Calendrier", icon: "📅", path: "/calendar" },
  knowledge: { name: "Connaissances", icon: "📚", path: "/knowledge" },
  workflows: { name: "Workflows", icon: "⚡", path: "/workflows" },
  dashboard: { name: "Dashboard", icon: "📊", path: "/dashboard" },
  plugins: { name: "Plugins", icon: "🔌", path: "/plugins" },
};

// Storage key for persisting window configuration
const STORAGE_KEY = "jarvis-multiscreen-config";

export function MultiScreenManager({ isOpen, onOpenChange }: MultiScreenManagerProps) {
  const [detachedWindows, setDetachedWindows] = useState<DetachedWindow[]>([]);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [selectedModule, setSelectedModule] = useState<ModuleType>("hardware");
  const windowRefs = useRef<Map<string, Window>>(new Map());
  const broadcastChannel = useRef<BroadcastChannel | null>(null);

  // Initialize broadcast channel for cross-window communication
  useEffect(() => {
    broadcastChannel.current = new BroadcastChannel("jarvis-multiscreen");
    
    broadcastChannel.current.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case "WINDOW_CLOSED":
          handleWindowClosed(data.windowId);
          break;
        case "SYNC_STATE":
          if (syncEnabled) {
            // Handle state synchronization
            console.log("Received sync state:", data);
          }
          break;
        case "NOTIFICATION":
          toast.info(data.message);
          break;
      }
    };

    return () => {
      broadcastChannel.current?.close();
    };
  }, [syncEnabled]);

  // Load saved configuration
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setSyncEnabled(config.syncEnabled ?? true);
      } catch (e) {
        console.error("Failed to load multiscreen config:", e);
      }
    }
  }, []);

  // Save configuration
  useEffect(() => {
    const config = {
      syncEnabled,
      windows: detachedWindows.map((w) => ({
        module: w.module,
        position: w.position,
        size: w.size,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [syncEnabled, detachedWindows]);

  // Handle window closed
  const handleWindowClosed = useCallback((windowId: string) => {
    setDetachedWindows((prev) => prev.filter((w) => w.id !== windowId));
    windowRefs.current.delete(windowId);
  }, []);

  // Check if windows are still open
  useEffect(() => {
    const checkInterval = setInterval(() => {
      detachedWindows.forEach((dw) => {
        const win = windowRefs.current.get(dw.id);
        if (win && win.closed) {
          handleWindowClosed(dw.id);
        }
      });
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [detachedWindows, handleWindowClosed]);

  // Open a new detached window
  const openDetachedWindow = (module: ModuleType) => {
    const config = MODULE_CONFIG[module];
    const windowId = `jarvis-${module}-${Date.now()}`;
    
    // Calculate window position (cascade effect)
    const offset = detachedWindows.length * 30;
    const width = 1200;
    const height = 800;
    const left = window.screenX + 100 + offset;
    const top = window.screenY + 100 + offset;

    // Build URL with window ID parameter
    const baseUrl = window.location.origin;
    const url = `${baseUrl}${config.path}?detached=true&windowId=${windowId}`;

    // Open new window
    const newWindow = window.open(
      url,
      windowId,
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );

    if (newWindow) {
      windowRefs.current.set(windowId, newWindow);
      
      const newDetachedWindow: DetachedWindow = {
        id: windowId,
        module,
        window: newWindow,
        position: { x: left, y: top },
        size: { width, height },
      };

      setDetachedWindows((prev) => [...prev, newDetachedWindow]);
      
      // Broadcast window opened event
      broadcastChannel.current?.postMessage({
        type: "WINDOW_OPENED",
        data: { windowId, module },
      });

      toast.success(`${config.name} ouvert dans une nouvelle fenêtre`);
    } else {
      toast.error("Impossible d'ouvrir la fenêtre. Vérifiez les paramètres de popup.");
    }
  };

  // Close a detached window
  const closeDetachedWindow = (windowId: string) => {
    const win = windowRefs.current.get(windowId);
    if (win && !win.closed) {
      win.close();
    }
    handleWindowClosed(windowId);
  };

  // Close all detached windows
  const closeAllWindows = () => {
    detachedWindows.forEach((dw) => {
      const win = windowRefs.current.get(dw.id);
      if (win && !win.closed) {
        win.close();
      }
    });
    setDetachedWindows([]);
    windowRefs.current.clear();
    toast.success("Toutes les fenêtres ont été fermées");
  };

  // Focus a detached window
  const focusWindow = (windowId: string) => {
    const win = windowRefs.current.get(windowId);
    if (win && !win.closed) {
      win.focus();
    }
  };

  // Broadcast message to all windows
  const broadcastToAll = (type: string, data: any) => {
    broadcastChannel.current?.postMessage({ type, data });
  };

  // Sync all windows
  const syncAllWindows = () => {
    broadcastToAll("SYNC_REQUEST", { timestamp: Date.now() });
    toast.success("Synchronisation envoyée à toutes les fenêtres");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Mode Multi-écran
          </DialogTitle>
          <DialogDescription>
            Détachez des modules dans des fenêtres séparées pour un affichage multi-moniteur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="sync-enabled"
                  checked={syncEnabled}
                  onCheckedChange={setSyncEnabled}
                />
                <Label htmlFor="sync-enabled" className="text-sm">
                  Synchronisation
                </Label>
                {syncEnabled ? (
                  <Link2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Link2Off className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={syncAllWindows}
                disabled={detachedWindows.length === 0}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Synchroniser
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={closeAllWindows}
                disabled={detachedWindows.length === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Tout fermer
              </Button>
            </div>
          </div>

          {/* Open New Window */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MonitorUp className="h-4 w-4" />
                Ouvrir un nouveau module
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedModule}
                  onValueChange={(value) => setSelectedModule(value as ModuleType)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODULE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => openDetachedWindow(selectedModule)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Windows */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Fenêtres actives
                <Badge variant="secondary" className="ml-2">
                  {detachedWindows.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detachedWindows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune fenêtre détachée active
                </p>
              ) : (
                <div className="space-y-2">
                  {detachedWindows.map((dw) => {
                    const config = MODULE_CONFIG[dw.module];
                    return (
                      <div
                        key={dw.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{config.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{config.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {dw.size.width}x{dw.size.height}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => focusWindow(dw.id)}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => closeDetachedWindow(dw.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Astuce :</strong> Déplacez les fenêtres sur différents moniteurs pour une vue étendue.</p>
            <p>🔄 La synchronisation permet de partager l'état entre toutes les fenêtres.</p>
            <p>⚠️ Assurez-vous que les popups sont autorisés dans votre navigateur.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to detect if running in a detached window
export function useDetachedWindow() {
  const [isDetached, setIsDetached] = useState(false);
  const [windowId, setWindowId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const detached = params.get("detached") === "true";
    const id = params.get("windowId");
    
    setIsDetached(detached);
    setWindowId(id);

    // Notify parent when closing
    if (detached && id) {
      window.addEventListener("beforeunload", () => {
        const channel = new BroadcastChannel("jarvis-multiscreen");
        channel.postMessage({
          type: "WINDOW_CLOSED",
          data: { windowId: id },
        });
        channel.close();
      });
    }
  }, []);

  return { isDetached, windowId };
}
