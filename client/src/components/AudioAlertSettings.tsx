import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAudioAlerts, AlertType, ALERT_SOUNDS } from "@/hooks/useAudioAlerts";
import { cn } from "@/lib/utils";
import {
  Volume2,
  VolumeX,
  Play,
  AlertTriangle,
  AlertCircle,
  Wifi,
  CheckCircle2,
  MessageSquare,
  XCircle,
  Loader2,
} from "lucide-react";

const ALERT_ICONS: Record<AlertType, React.ElementType> = {
  gpu_warning: AlertTriangle,
  gpu_critical: AlertCircle,
  ups_warning: AlertTriangle,
  ups_critical: AlertCircle,
  network_down: Wifi,
  task_complete: CheckCircle2,
  message_received: MessageSquare,
  system_error: XCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function AudioAlertSettings() {
  const {
    settings,
    updateSettings,
    toggleMute,
    playTest,
    isPlaying,
    initAudioContext,
  } = useAudioAlerts();

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ volume: value[0] });
  };

  const handleTestSound = async (type: AlertType) => {
    // Initialize audio context on user interaction
    initAudioContext();
    await playTest(type);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Alertes Sonores
        </CardTitle>
        <CardDescription>
          Configurez les sons pour les notifications critiques
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Activer les alertes sonores</Label>
            <p className="text-sm text-muted-foreground">
              Jouer des sons pour les événements importants
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
          />
        </div>

        <Separator />

        {/* Volume control */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base flex items-center gap-2">
              {settings.volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              Volume
            </Label>
            <span className="text-sm text-muted-foreground">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <Slider
            value={[settings.volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.05}
            disabled={!settings.enabled}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Individual alert settings */}
        <div className="space-y-4">
          <Label className="text-base">Types d'alertes</Label>
          <div className="space-y-3">
            {ALERT_SOUNDS.map((alert) => {
              const Icon = ALERT_ICONS[alert.type];
              const isMuted = settings.mutedTypes.includes(alert.type);

              return (
                <div
                  key={alert.type}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isMuted && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        PRIORITY_COLORS[alert.priority]
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.name}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", PRIORITY_COLORS[alert.priority])}
                        >
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestSound(alert.type)}
                      disabled={!settings.enabled || isPlaying}
                      title="Tester le son"
                    >
                      {isPlaying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Switch
                      checked={!isMuted}
                      onCheckedChange={() => toggleMute(alert.type)}
                      disabled={!settings.enabled}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
