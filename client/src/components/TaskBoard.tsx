import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Calendar, CheckCircle2, Circle, Clock, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high" | "critical";

interface LocalTask {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  dueDate: Date | null;
}

// Fallback data for when DB is not available
const FALLBACK_TASKS: LocalTask[] = [
  {
    id: 1,
    title: "Audit de sécurité N1",
    description: "Vérifier les logs d'accès du module Investigator",
    status: "in_progress",
    priority: "high",
    assignee: "Jarvis",
    dueDate: new Date(Date.now() + 86400000),
  },
  {
    id: 2,
    title: "Mise à jour RAG",
    description: "Ingérer les nouveaux documents techniques NVIDIA",
    status: "todo",
    priority: "medium",
    assignee: "System",
    dueDate: null,
  },
  {
    id: 3,
    title: "Optimisation Latence Réflexe",
    description: "Réduire le temps de boucle N0 sous les 50ms",
    status: "todo",
    priority: "critical",
    assignee: "Jarvis",
    dueDate: null,
  },
  {
    id: 4,
    title: "Backup Configuration",
    description: "Sauvegarde hebdomadaire des fichiers de config",
    status: "done",
    priority: "low",
    assignee: "System",
    dueDate: new Date(Date.now() - 86400000),
  },
];

export function TaskBoard() {
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
  }>({ title: "", description: "", priority: "medium" });

  // tRPC queries and mutations
  const { data: tasksData, isLoading, refetch } = trpc.tasks.list.useQuery();
  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsNewTaskOpen(false);
      setNewTask({ title: "", description: "", priority: "medium" });
      toast.success("Tâche créée avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Tâche supprimée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Use fallback data if DB returns empty or error
  const tasks: LocalTask[] = (tasksData && tasksData.length > 0) 
    ? tasksData.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
        assignee: t.assignee,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
      }))
    : FALLBACK_TASKS;

  const columns = [
    { id: "todo" as TaskStatus, title: "À faire", icon: Circle, color: "text-muted-foreground" },
    { id: "in_progress" as TaskStatus, title: "En cours", icon: Clock, color: "text-blue-500" },
    { id: "done" as TaskStatus, title: "Terminé", icon: CheckCircle2, color: "text-green-500" },
  ];

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("taskId", taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("taskId"));
    
    // Only update if using real data
    if (tasksData && tasksData.length > 0) {
      updateMutation.mutate({ id: taskId, data: { status } });
    }
  };

  const handleCreateTask = () => {
    if (!newTask.title) return;
    
    createMutation.mutate({
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: "todo",
      assignee: "User",
    });
  };

  const handleDeleteTask = (taskId: number) => {
    if (tasksData && tasksData.length > 0) {
      deleteMutation.mutate({ id: taskId });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "low": return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default: return "bg-slate-500/10 text-slate-500";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "critical": return "CRITIQUE";
      case "high": return "HAUTE";
      case "medium": return "MOYENNE";
      case "low": return "BASSE";
      default: return priority.toUpperCase();
    }
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
          <h2 className="text-lg font-semibold tracking-tight">Gestion des Tâches</h2>
          {(!tasksData || tasksData.length === 0) && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              Mode Simulation
            </Badge>
          )}
        </div>
        <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle Tâche
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle tâche</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre</Label>
                <Input 
                  id="title" 
                  value={newTask.title} 
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Titre de la tâche..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea 
                  id="desc" 
                  value={newTask.description} 
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Description détaillée..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(v) => setNewTask({...newTask, priority: v as TaskPriority})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateTask} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer"
              )}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {columns.map((col) => (
          <div 
            key={col.id} 
            className="flex flex-col bg-muted/20 rounded-lg border border-border/50 h-full overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="p-3 flex items-center justify-between border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 font-medium text-sm">
                <col.icon className={cn("h-4 w-4", col.color)} />
                {col.title}
                <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5">
                  {tasks.filter(t => t.status === col.id).length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="flex flex-col gap-3">
                {tasks
                  .filter((task) => task.status === col.id)
                  .map((task) => (
                    <Card 
                      key={task.id} 
                      className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                    >
                      <CardHeader className="p-3 pb-2 space-y-0">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-sm font-medium leading-tight">
                            {task.title}
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-5 border", getPriorityColor(task.priority))}>
                              {getPriorityLabel(task.priority)}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-2">
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {task.description}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[8px] font-bold">
                              {task.assignee?.charAt(0)}
                            </div>
                            <span>{task.assignee}</span>
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{task.dueDate.toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}
