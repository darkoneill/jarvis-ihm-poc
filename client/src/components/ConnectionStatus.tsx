import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Download, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

export function ConnectionStatus() {
  const {
    isOnline,
    isRegistered,
    updateAvailable,
    register,
    update,
    clearCache,
  } = useServiceWorker();

  const handleRegister = async () => {
    await register();
    toast.success("Mode hors-ligne activé", {
      description: "L'application peut maintenant fonctionner sans connexion",
    });
  };

  const handleUpdate = async () => {
    await update();
    toast.success("Mise à jour appliquée", {
      description: "L'application va se recharger",
    });
  };

  const handleClearCache = async () => {
    await clearCache();
    toast.success("Cache vidé", {
      description: "Les données en cache ont été supprimées",
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          {updateAvailable && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">État de la connexion</h4>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isOnline
                  ? "text-green-500 border-green-500/30"
                  : "text-red-500 border-red-500/30"
              )}
            >
              {isOnline ? "En ligne" : "Hors ligne"}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Mode hors-ligne
              </span>
              <span className={cn(
                "text-xs font-medium",
                isRegistered ? "text-green-500" : "text-muted-foreground"
              )}>
                {isRegistered ? "Activé" : "Désactivé"}
              </span>
            </div>

            {updateAvailable && (
              <div className="flex items-center justify-between py-1 px-2 bg-blue-500/10 rounded border border-blue-500/20">
                <span className="text-blue-500 text-xs">Mise à jour disponible</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUpdate}
                  className="h-6 text-xs text-blue-500 hover:text-blue-400"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Installer
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            {!isRegistered ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegister}
                className="flex-1 text-xs"
              >
                <CloudOff className="h-3 w-3 mr-1" />
                Activer hors-ligne
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  className="flex-1 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Vider cache
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>

          {!isOnline && (
            <p className="text-xs text-muted-foreground">
              Certaines fonctionnalités peuvent être limitées en mode hors-ligne.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
