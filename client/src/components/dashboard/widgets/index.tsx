import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  HardDrive,
  MessageSquare,
  Play,
  Plus,
  Search,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

// System Status Widget
export function SystemStatusWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">État</span>
        <Badge variant="outline" className="text-green-500 border-green-500/30">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Opérationnel
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Uptime</span>
        <span className="text-sm font-mono">99.9%</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Version</span>
        <span className="text-sm font-mono">v5.9.2</span>
      </div>
    </div>
  );
}

// Hardware Metrics Widget
export function HardwareMetricsWidget() {
  const { data: metrics } = trpc.hardware.getMetrics.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const cpuUsage = metrics?.cpu?.usage ?? 0;
  const ramUsage = metrics?.memory?.usagePercent ?? 0;
  const diskUsage = metrics?.disk?.percent ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            CPU
          </span>
          <span className="font-mono">{cpuUsage.toFixed(1)}%</span>
        </div>
        <Progress value={cpuUsage} className="h-2" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            RAM
          </span>
          <span className="font-mono">{ramUsage.toFixed(1)}%</span>
        </div>
        <Progress value={ramUsage} className="h-2" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-purple-500" />
            Disque
          </span>
          <span className="font-mono">{diskUsage.toFixed(1)}%</span>
        </div>
        <Progress value={diskUsage} className="h-2" />
      </div>
    </div>
  );
}

// Recent Tasks Widget
export function RecentTasksWidget({ limit = 5 }: { limit?: number }) {
  const { data: tasks } = trpc.tasks.list.useQuery();
  const recentTasks = tasks?.slice(0, limit) || [];

  return (
    <div className="space-y-2">
      {recentTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune tâche récente
        </p>
      ) : (
        recentTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={cn(
                  "h-4 w-4",
                  task.status === "done"
                    ? "text-green-500"
                    : task.status === "in_progress"
                    ? "text-blue-500"
                    : "text-muted-foreground"
                )}
              />
              <span className="text-sm truncate max-w-[150px]">{task.title}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                task.priority === "critical" && "text-red-500 border-red-500/30",
                task.priority === "high" && "text-orange-500 border-orange-500/30",
                task.priority === "medium" && "text-yellow-500 border-yellow-500/30",
                task.priority === "low" && "text-green-500 border-green-500/30"
              )}
            >
              {task.priority}
            </Badge>
          </div>
        ))
      )}
      <Link href="/tasks">
        <Button variant="ghost" size="sm" className="w-full mt-2">
          Voir toutes les tâches
        </Button>
      </Link>
    </div>
  );
}

// Upcoming Jobs Widget
export function UpcomingJobsWidget({ limit = 3 }: { limit?: number }) {
  const { data: jobs } = trpc.scheduledJobs.list.useQuery();
  const upcomingJobs = jobs?.filter((j) => j.enabled).slice(0, limit) || [];

  return (
    <div className="space-y-2">
      {upcomingJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun job planifié
        </p>
      ) : (
        upcomingJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm truncate max-w-[150px]">{job.name}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {job.cronExpression}
            </span>
          </div>
        ))
      )}
      <Link href="/calendar">
        <Button variant="ghost" size="sm" className="w-full mt-2">
          Voir le calendrier
        </Button>
      </Link>
    </div>
  );
}

// Quick Actions Widget
export function QuickActionsWidget() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link href="/">
        <Button variant="outline" size="sm" className="w-full h-auto py-3 flex-col gap-1">
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs">Chat</span>
        </Button>
      </Link>
      <Link href="/tasks">
        <Button variant="outline" size="sm" className="w-full h-auto py-3 flex-col gap-1">
          <Plus className="h-4 w-4" />
          <span className="text-xs">Tâche</span>
        </Button>
      </Link>
      <Link href="/knowledge">
        <Button variant="outline" size="sm" className="w-full h-auto py-3 flex-col gap-1">
          <Search className="h-4 w-4" />
          <span className="text-xs">Recherche</span>
        </Button>
      </Link>
      <Link href="/workflows">
        <Button variant="outline" size="sm" className="w-full h-auto py-3 flex-col gap-1">
          <Play className="h-4 w-4" />
          <span className="text-xs">Workflow</span>
        </Button>
      </Link>
    </div>
  );
}

// Notifications Widget
export function NotificationsWidget({ limit = 5 }: { limit?: number }) {
  const notifications = [
    { id: 1, message: "Backup quotidien terminé", time: "Il y a 2h", type: "success" },
    { id: 2, message: "Mise à jour disponible", time: "Il y a 5h", type: "info" },
    { id: 3, message: "Température GPU élevée", time: "Il y a 1j", type: "warning" },
  ].slice(0, limit);

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Bell
            className={cn(
              "h-4 w-4 mt-0.5",
              notif.type === "success" && "text-green-500",
              notif.type === "info" && "text-blue-500",
              notif.type === "warning" && "text-yellow-500"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{notif.message}</p>
            <p className="text-xs text-muted-foreground">{notif.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Clock Widget
export function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center py-2">
      <div className="text-3xl font-mono font-bold">
        {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {time.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </div>
    </div>
  );
}

// Chat Preview Widget
export function ChatPreviewWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
        <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-xs text-primary">
          J
        </div>
        <div className="flex-1">
          <p className="text-sm">
            Bonjour ! Comment puis-je vous aider aujourd'hui ?
          </p>
          <p className="text-xs text-muted-foreground mt-1">Il y a 5 min</p>
        </div>
      </div>
      <Link href="/">
        <Button variant="outline" size="sm" className="w-full">
          <MessageSquare className="h-4 w-4 mr-2" />
          Ouvrir le chat
        </Button>
      </Link>
    </div>
  );
}

// Knowledge Search Widget
export function KnowledgeSearchWidget() {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <Link href="/knowledge">
        <Button variant="ghost" size="sm" className="w-full">
          Recherche avancée
        </Button>
      </Link>
    </div>
  );
}

// Widget renderer
export function renderWidget(type: string, config: Record<string, unknown> = {}) {
  switch (type) {
    case "system_status":
      return <SystemStatusWidget />;
    case "hardware_metrics":
      return <HardwareMetricsWidget />;
    case "recent_tasks":
      return <RecentTasksWidget limit={config.limit as number} />;
    case "upcoming_jobs":
      return <UpcomingJobsWidget limit={config.limit as number} />;
    case "quick_actions":
      return <QuickActionsWidget />;
    case "notifications":
      return <NotificationsWidget limit={config.limit as number} />;
    case "clock":
      return <ClockWidget />;
    case "chat_preview":
      return <ChatPreviewWidget />;
    case "knowledge_search":
      return <KnowledgeSearchWidget />;
    default:
      return <div className="text-sm text-muted-foreground">Widget inconnu</div>;
  }
}
