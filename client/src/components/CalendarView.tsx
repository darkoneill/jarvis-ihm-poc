import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Calendar as CalendarIcon, Clock, Loader2, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LocalJob {
  id: number;
  name: string;
  description: string | null;
  cronExpression: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
}

const FALLBACK_JOBS: LocalJob[] = [
  {
    id: 1,
    name: "Daily System Backup",
    description: "Sauvegarde quotidienne du système",
    cronExpression: "0 3 * * *",
    nextRun: new Date(new Date().setHours(3, 0, 0, 0) + 86400000),
    enabled: true,
    lastRun: new Date(new Date().setHours(3, 0, 0, 0)),
  },
  {
    id: 2,
    name: "RAG Index Optimization",
    description: "Optimisation hebdomadaire des index RAG",
    cronExpression: "0 0 * * 0",
    nextRun: new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))),
    enabled: true,
    lastRun: null,
  },
  {
    id: 3,
    name: "Log Rotation & Archive",
    description: "Rotation et archivage des logs",
    cronExpression: "0 1 * * *",
    nextRun: new Date(new Date().setHours(1, 0, 0, 0) + 86400000),
    enabled: false,
    lastRun: new Date(new Date().setHours(1, 0, 0, 0)),
  },
  {
    id: 4,
    name: "Health Check Report",
    description: "Rapport de santé système toutes les 15 minutes",
    cronExpression: "*/15 * * * *",
    nextRun: new Date(Date.now() + 900000),
    enabled: true,
    lastRun: new Date(Date.now() - 300000),
  },
];

export function CalendarView() {
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [newJob, setNewJob] = useState<{
    name: string;
    description: string;
    cronExpression: string;
  }>({ name: "", description: "", cronExpression: "" });

  // tRPC queries and mutations
  const { data: jobsData, isLoading, refetch } = trpc.scheduledJobs.list.useQuery();
  const createMutation = trpc.scheduledJobs.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsNewJobOpen(false);
      setNewJob({ name: "", description: "", cronExpression: "" });
      toast.success("Job planifié avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  const toggleMutation = trpc.scheduledJobs.toggleEnabled.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  const deleteMutation = trpc.scheduledJobs.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Job supprimé");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Use fallback data if DB returns empty
  const jobs: LocalJob[] = (jobsData && jobsData.length > 0)
    ? jobsData.map(j => ({
        id: j.id,
        name: j.name,
        description: j.description,
        cronExpression: j.cronExpression,
        enabled: j.enabled,
        lastRun: j.lastRun ? new Date(j.lastRun) : null,
        nextRun: j.nextRun ? new Date(j.nextRun) : null,
      }))
    : FALLBACK_JOBS;

  const handleToggleJob = (id: number, currentEnabled: boolean) => {
    if (jobsData && jobsData.length > 0) {
      toggleMutation.mutate({ id, enabled: !currentEnabled });
    }
  };

  const handleDeleteJob = (id: number) => {
    if (jobsData && jobsData.length > 0) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCreateJob = () => {
    if (!newJob.name || !newJob.cronExpression) return;
    
    createMutation.mutate({
      name: newJob.name,
      description: newJob.description,
      cronExpression: newJob.cronExpression,
      enabled: true,
    });
  };

  const getStatusFromLastRun = (lastRun: Date | null) => {
    if (!lastRun) return { status: "PENDING", color: "text-muted-foreground" };
    // Simulate status based on lastRun
    return { status: "SUCCESS", color: "text-green-500" };
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Planificateur de Tâches (Cron)</h2>
          {(!jobsData || jobsData.length === 0) && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              Mode Simulation
            </Badge>
          )}
        </div>
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
                  value={newJob.name} 
                  onChange={(e) => setNewJob({...newJob, name: e.target.value})}
                  placeholder="ex: Backup Database"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={newJob.description} 
                  onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                  placeholder="Description de la tâche..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cron">Expression Cron</Label>
                <Input 
                  id="cron" 
                  value={newJob.cronExpression} 
                  onChange={(e) => setNewJob({...newJob, cronExpression: e.target.value})}
                  placeholder="ex: 0 3 * * *"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: minute heure jour mois jour_semaine
                </p>
              </div>
            </div>
            <Button onClick={handleCreateJob} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Planification...
                </>
              ) : (
                "Planifier"
              )}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
          {jobs.map((job) => {
            const { status, color } = getStatusFromLastRun(job.lastRun);
            return (
              <Card key={job.id} className={cn("border-border/50 transition-all", !job.enabled && "opacity-60")}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium leading-none flex items-center gap-2">
                      {job.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                      <Clock className="h-3 w-3" />
                      {job.cronExpression}
                    </div>
                  </div>
                  <Switch 
                    checked={job.enabled} 
                    onCheckedChange={() => handleToggleJob(job.id, job.enabled)}
                  />
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Prochaine exécution</span>
                      <div className="flex items-center gap-1.5 font-medium">
                        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                        {job.nextRun 
                          ? `${job.nextRun.toLocaleDateString()} ${job.nextRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                          : "Non planifié"
                        }
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Dernier statut</span>
                      <div className={cn("flex items-center gap-1.5 font-medium", color)}>
                        <div className={cn("h-2 w-2 rounded-full bg-current")} />
                        {status}
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
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
