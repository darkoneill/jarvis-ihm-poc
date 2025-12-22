import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Lightbulb,
  Plus,
  Calendar,
  FileText,
  Play,
  Search,
  MessageSquare,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  type: "task" | "job" | "document" | "workflow" | "search" | "action";
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  priority: "low" | "medium" | "high";
  context: string;
}

interface ContextualAssistantProps {
  currentPage: string;
  lastMessage?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function ContextualAssistant({
  currentPage,
  lastMessage,
  isMinimized = false,
  onToggleMinimize,
}: ContextualAssistantProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [, navigate] = useLocation();

  // Fetch data for context
  const { data: tasks } = trpc.tasks.list.useQuery();
  const { data: jobs } = trpc.scheduledJobs.list.useQuery();

  // Create task mutation
  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Tâche créée avec succès");
    },
  });

  // Generate suggestions based on context
  const generateSuggestions = useCallback(() => {
    const newSuggestions: Suggestion[] = [];

    // Page-based suggestions
    switch (currentPage) {
      case "/":
      case "/dialogue":
        // Chat page suggestions
        if (lastMessage) {
          // Analyze last message for actionable items
          const lowerMessage = lastMessage.toLowerCase();
          
          if (lowerMessage.includes("rappelle") || lowerMessage.includes("remind") || lowerMessage.includes("n'oublie pas")) {
            newSuggestions.push({
              id: "create_reminder",
              type: "job",
              title: "Créer un rappel",
              description: "Planifier un rappel basé sur la conversation",
              icon: Calendar,
              action: () => navigate("/calendar"),
              priority: "high",
              context: "Message détecté comme rappel",
            });
          }

          if (lowerMessage.includes("tâche") || lowerMessage.includes("faire") || lowerMessage.includes("todo")) {
            newSuggestions.push({
              id: "create_task",
              type: "task",
              title: "Créer une tâche",
              description: "Transformer cette conversation en tâche",
              icon: Plus,
              action: () => navigate("/tasks"),
              priority: "high",
              context: "Action détectée dans le message",
            });
          }

          if (lowerMessage.includes("document") || lowerMessage.includes("note") || lowerMessage.includes("sauvegarder")) {
            newSuggestions.push({
              id: "save_document",
              type: "document",
              title: "Sauvegarder comme document",
              description: "Enregistrer cette conversation dans la base de connaissances",
              icon: FileText,
              action: () => navigate("/knowledge"),
              priority: "medium",
              context: "Demande de sauvegarde détectée",
            });
          }
        }
        break;

      case "/tasks":
        // Task page suggestions
        const pendingTasks = tasks?.filter((t) => t.status === "todo") || [];
        const inProgressTasks = tasks?.filter((t) => t.status === "in_progress") || [];

        if (pendingTasks.length > 5) {
          newSuggestions.push({
            id: "review_pending",
            type: "action",
            title: "Revoir les tâches en attente",
            description: `${pendingTasks.length} tâches en attente nécessitent votre attention`,
            icon: AlertTriangle,
            action: () => toast.info("Filtrez par statut 'En attente' pour les voir"),
            priority: "medium",
            context: "Beaucoup de tâches en attente",
          });
        }

        if (inProgressTasks.length === 0 && pendingTasks.length > 0) {
          newSuggestions.push({
            id: "start_task",
            type: "action",
            title: "Commencer une tâche",
            description: "Aucune tâche en cours - commencez-en une !",
            icon: Play,
            action: () => toast.info("Cliquez sur une tâche pour la démarrer"),
            priority: "high",
            context: "Aucune tâche en cours",
          });
        }
        break;

      case "/hardware":
        // Hardware page suggestions
        newSuggestions.push({
          id: "schedule_backup",
          type: "job",
          title: "Planifier une sauvegarde",
          description: "Configurer une sauvegarde automatique du système",
          icon: Calendar,
          action: () => navigate("/calendar"),
          priority: "low",
          context: "Page Hardware",
        });
        break;

      case "/calendar":
        // Calendar page suggestions
        const enabledJobs = jobs?.filter((j) => j.enabled) || [];
        if (enabledJobs.length === 0) {
          newSuggestions.push({
            id: "create_first_job",
            type: "job",
            title: "Créer votre premier job",
            description: "Automatisez une tâche récurrente",
            icon: Plus,
            action: () => toast.info("Utilisez le bouton + pour créer un job"),
            priority: "high",
            context: "Aucun job actif",
          });
        }
        break;

      case "/knowledge":
        // Knowledge base suggestions
        newSuggestions.push({
          id: "search_tip",
          type: "search",
          title: "Astuce: Recherche sémantique",
          description: "Activez le mode sémantique pour des résultats plus pertinents",
          icon: Search,
          action: () => toast.info("Utilisez le toggle 'Recherche sémantique'"),
          priority: "low",
          context: "Page Connaissances",
        });
        break;

      case "/workflows":
        // Workflows suggestions
        newSuggestions.push({
          id: "workflow_template",
          type: "workflow",
          title: "Utiliser un template",
          description: "Commencez avec un workflow pré-configuré",
          icon: Sparkles,
          action: () => toast.info("Les templates seront bientôt disponibles"),
          priority: "low",
          context: "Page Workflows",
        });
        break;
    }

    // Time-based suggestions
    const hour = new Date().getHours();
    if (hour >= 17 && hour < 19) {
      newSuggestions.push({
        id: "end_of_day",
        type: "action",
        title: "Résumé de fin de journée",
        description: "Voir ce qui a été accompli aujourd'hui",
        icon: CheckCircle2,
        action: () => navigate("/tasks"),
        priority: "low",
        context: "Fin de journée",
      });
    }

    if (hour >= 8 && hour < 10) {
      newSuggestions.push({
        id: "morning_briefing",
        type: "action",
        title: "Briefing du matin",
        description: "Voir les tâches prioritaires pour aujourd'hui",
        icon: Clock,
        action: () => navigate("/dashboard"),
        priority: "medium",
        context: "Début de journée",
      });
    }

    // Filter out dismissed suggestions
    const filteredSuggestions = newSuggestions.filter(
      (s) => !dismissed.includes(s.id)
    );

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredSuggestions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    setSuggestions(filteredSuggestions.slice(0, 3));
  }, [currentPage, lastMessage, tasks, jobs, dismissed, navigate]);

  // Regenerate suggestions when context changes
  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
  };

  const handleAction = (suggestion: Suggestion) => {
    suggestion.action();
    handleDismiss(suggestion.id);
  };

  if (suggestions.length === 0) return null;

  if (isMinimized) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-40 gap-2 shadow-lg"
        onClick={onToggleMinimize}
      >
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <Badge variant="secondary" className="text-xs">
          {suggestions.length}
        </Badge>
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-40 w-80 shadow-lg border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Suggestions</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleMinimize}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-2">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <div
                key={suggestion.id}
                className={cn(
                  "group flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-muted/50"
                )}
                onClick={() => handleAction(suggestion)}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    suggestion.priority === "high" && "bg-red-500/10 text-red-500",
                    suggestion.priority === "medium" && "bg-yellow-500/10 text-yellow-500",
                    suggestion.priority === "low" && "bg-blue-500/10 text-blue-500"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {suggestion.title}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {suggestion.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(suggestion.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">
            Basé sur: {suggestions[0]?.context || "Contexte actuel"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
