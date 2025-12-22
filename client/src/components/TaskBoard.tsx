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
import { Calendar, CheckCircle2, Circle, Clock, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignee?: string;
  dueDate?: Date;
}

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "Audit de sécurité N1",
    description: "Vérifier les logs d'accès du module Investigator",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assignee: "Jarvis",
    dueDate: new Date(Date.now() + 86400000),
  },
  {
    id: "2",
    title: "Mise à jour RAG",
    description: "Ingérer les nouveaux documents techniques NVIDIA",
    status: "TODO",
    priority: "MEDIUM",
    assignee: "System",
  },
  {
    id: "3",
    title: "Optimisation Latence Réflexe",
    description: "Réduire le temps de boucle N0 sous les 50ms",
    status: "TODO",
    priority: "CRITICAL",
    assignee: "Jarvis",
  },
  {
    id: "4",
    title: "Backup Configuration",
    description: "Sauvegarde hebdomadaire des fichiers de config",
    status: "DONE",
    priority: "LOW",
    assignee: "System",
    dueDate: new Date(Date.now() - 86400000),
  },
];

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ priority: "MEDIUM", status: "TODO" });

  const columns = [
    { id: "TODO", title: "À faire", icon: Circle, color: "text-muted-foreground" },
    { id: "IN_PROGRESS", title: "En cours", icon: Clock, color: "text-blue-500" },
    { id: "DONE", title: "Terminé", icon: CheckCircle2, color: "text-green-500" },
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Task["status"]) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleCreateTask = () => {
    if (!newTask.title) return;
    
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || "",
      status: "TODO",
      priority: newTask.priority as Task["priority"],
      assignee: "User", // Default
      dueDate: new Date(),
    };

    setTasks([...tasks, task]);
    setNewTask({ priority: "MEDIUM", status: "TODO" });
    setIsNewTaskOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "HIGH": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "MEDIUM": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "LOW": return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default: return "bg-slate-500/10 text-slate-500";
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-semibold tracking-tight">Gestion des Tâches</h2>
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
                  value={newTask.title || ""} 
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea 
                  id="desc" 
                  value={newTask.description || ""} 
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(v) => setNewTask({...newTask, priority: v as Task["priority"]})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="CRITICAL">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateTask}>Créer</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {columns.map((col) => (
          <div 
            key={col.id} 
            className="flex flex-col bg-muted/20 rounded-lg border border-border/50 h-full overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id as Task["status"])}
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
                      className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                    >
                      <CardHeader className="p-3 pb-2 space-y-0">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-sm font-medium leading-tight">
                            {task.title}
                          </CardTitle>
                          <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-5 border", getPriorityColor(task.priority))}>
                            {task.priority}
                          </Badge>
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
