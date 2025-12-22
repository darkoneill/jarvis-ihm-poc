import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Settings,
  X,
  Clock,
  LayoutGrid,
} from "lucide-react";

// Widget components (simplified versions for presentation)
import { SystemStatusWidget, HardwareMetricsWidget, RecentTasksWidget, UpcomingJobsWidget, ClockWidget } from "@/components/dashboard/widgets";

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresentationWidget {
  id: string;
  type: string;
  title: string;
}

const DEFAULT_WIDGETS: PresentationWidget[] = [
  { id: "system_status", type: "system_status", title: "Statut Système" },
  { id: "hardware_metrics", type: "hardware_metrics", title: "Métriques Hardware" },
  { id: "tasks", type: "tasks", title: "Tâches" },
  { id: "jobs", type: "jobs", title: "Jobs Planifiés" },
  { id: "clock", type: "clock", title: "Horloge" },
];

export function PresentationMode({ isOpen, onClose }: PresentationModeProps) {
  const [currentWidgetIndex, setCurrentWidgetIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(10); // seconds
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch dashboard config
  const { data: dashboardData } = trpc.dashboard.getConfig.useQuery(undefined, {
    enabled: isOpen,
  });

  const widgets: PresentationWidget[] = dashboardData?.widgets 
    ? dashboardData.widgets.map((w: any) => ({ id: w.id, type: w.type, title: w.title }))
    : DEFAULT_WIDGETS;

  // Auto-rotation
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentWidgetIndex((prev) => (prev + 1) % widgets.length);
    }, rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, rotationInterval, widgets.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          setCurrentWidgetIndex((prev) => (prev - 1 + widgets.length) % widgets.length);
          break;
        case "ArrowRight":
          setCurrentWidgetIndex((prev) => (prev + 1) % widgets.length);
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case "Escape":
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, widgets.length, isFullscreen, onClose]);

  // Auto-hide controls
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const renderWidget = (widget: PresentationWidget) => {
    switch (widget.type) {
      case "system_status":
        return <SystemStatusWidget />;
      case "hardware_metrics":
        return <HardwareMetricsWidget />;
      case "tasks":
        return <RecentTasksWidget />;
      case "jobs":
        return <UpcomingJobsWidget />;
      case "clock":
        return <ClockWidget />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Widget non disponible
          </div>
        );
    }
  };

  if (!isOpen) return null;

  const currentWidget = widgets[currentWidgetIndex];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-10 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-background to-transparent">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <LayoutGrid className="h-3 w-3" />
              Mode Présentation
            </Badge>
            <Badge variant="secondary" className="gap-2">
              <Clock className="h-3 w-3" />
              {rotationInterval}s
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          <div className="mb-4 text-center">
            <h2 className="text-3xl font-bold">{currentWidget?.title}</h2>
          </div>
          <div className="bg-card rounded-xl border p-8 min-h-[400px]">
            {currentWidget && renderWidget(currentWidget)}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="p-4 bg-gradient-to-t from-background to-transparent">
          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mb-4">
            {widgets.map((widget, index) => (
              <button
                key={widget.id}
                onClick={() => setCurrentWidgetIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentWidgetIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentWidgetIndex((prev) => (prev - 1 + widgets.length) % widgets.length)
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentWidgetIndex((prev) => (prev + 1) % widgets.length)
              }
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Rotation interval slider */}
            <div className="flex items-center gap-2 ml-4 bg-muted/50 rounded-lg px-3 py-1">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[rotationInterval]}
                onValueChange={([value]) => setRotationInterval(value)}
                min={5}
                max={60}
                step={5}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground w-8">{rotationInterval}s</span>
            </div>
          </div>

          {/* Keyboard hints */}
          <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span>← → Navigation</span>
            <span>Espace: Pause/Play</span>
            <span>F: Plein écran</span>
            <span>Échap: Quitter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
