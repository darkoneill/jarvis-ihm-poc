import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ScheduledJob {
  id: string;
  name: string;
  cron: string;
  nextRun: Date;
  enabled: boolean;
  lastRun?: Date;
  status?: "SUCCESS" | "FAILED" | "PENDING";
}

const INITIAL_JOBS: ScheduledJob[] = [
  {
    id: "1",
    name: "Daily System Backup",
    cron: "0 3 * * *",
    nextRun: new Date(new Date().setHours(3, 0, 0, 0) + 86400000),
    enabled: true,
    lastRun: new Date(new Date().setHours(3, 0, 0, 0)),
    status: "SUCCESS",
  },
  {
    id: "2",
    name: "RAG Index Optimization",
    cron: "0 0 * * 0",
    nextRun: new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))),
    enabled: true,
    status: "PENDING",
  },
  {
    id: "3",
    name: "Log Rotation & Archive",
    cron: "0 1 * * *",
    nextRun: new Date(new Date().setHours(1, 0, 0, 0) + 86400000),
    enabled: false,
    lastRun: new Date(new Date().setHours(1, 0, 0, 0)),
    status: "SUCCESS",
  },
  {
    id: "4",
    name: "Health Check Report",
    cron: "*/15 * * * *",
    nextRun: new Date(Date.now() + 900000),
    enabled: true,
    lastRun: new Date(Date.now() - 300000),
    status: "SUCCESS",
  },
];

export function CalendarView() {
  const [jobs, setJobs] = useState<ScheduledJob[]>(INITIAL_JOBS);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [newJob, setNewJob] = useState<Partial<ScheduledJob>>({ enabled: true });

  const handleToggleJob = (id: string) => {
    setJobs(jobs.map(job => job.id === id ? { ...job, enabled: !job.enabled } : job));
  };

  const handleDeleteJob = (id: string) => {
    setJobs(jobs.filter(job => job.id !== id));
  };

  const handleCreateJob = () => {
    if (!newJob.name || !newJob.cron) return;

    const job: ScheduledJob = {
      id: Date.now().toString(),
      name: newJob.name,
      cron: newJob.cron,
      nextRun: new Date(Date.now() + 86400000), // Mock next run
      enabled: true,
      status: "PENDING",
    };

    setJobs([...jobs, job]);
    setNewJob({ enabled: true });
    setIsNewJobOpen(false);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "SUCCESS": return "text-green-500";
      case "FAILED": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-semibold tracking-tight">Planificateur de Tâches (Cron)</h2>
        <Dialog open={isNewJobOpen} onOpenChange={setIsNewJobOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Planifier une nouvelle tâche</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom de la tâche</Label>
                <Input 
                  id="name" 
                  value={newJob.name || ""} 
                  onChange={(e) => setNewJob({...newJob, name: e.target.value})}
                  placeholder="ex: Backup Database"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cron">Expression Cron</Label>
                <Input 
                  id="cron" 
                  value={newJob.cron || ""} 
                  onChange={(e) => setNewJob({...newJob, cron: e.target.value})}
                  placeholder="ex: 0 3 * * *"
                  className="font-mono"
                />
              </div>
            </div>
            <Button onClick={handleCreateJob}>Planifier</Button>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
          {jobs.map((job) => (
            <Card key={job.id} className={cn("border-border/50 transition-all", !job.enabled && "opacity-60")}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium leading-none flex items-center gap-2">
                    {job.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                    <Clock className="h-3 w-3" />
                    {job.cron}
                  </div>
                </div>
                <Switch 
                  checked={job.enabled} 
                  onCheckedChange={() => handleToggleJob(job.id)}
                />
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Prochaine exécution</span>
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                      {job.nextRun.toLocaleDateString()} {job.nextRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Dernier statut</span>
                    <div className={cn("flex items-center gap-1.5 font-medium", getStatusColor(job.status))}>
                      <div className={cn("h-2 w-2 rounded-full bg-current")} />
                      {job.status || "PENDING"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                    <Play className="h-3 w-3" />
                    Exécuter
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteJob(job.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
