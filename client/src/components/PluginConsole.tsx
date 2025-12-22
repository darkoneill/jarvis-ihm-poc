import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Play,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  History,
} from "lucide-react";

interface PluginConsoleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pluginName: string;
  pluginDisplayName: string;
}

interface ExecutionLog {
  id: number;
  action: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: "pending" | "running" | "success" | "error";
  error?: string;
  duration?: number;
  timestamp: Date;
}

export function PluginConsole({
  open,
  onOpenChange,
  pluginName,
  pluginDisplayName,
}: PluginConsoleProps) {
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const { data: actionsData } = trpc.plugins.getActions.useQuery(
    { pluginName },
    { enabled: open && !!pluginName }
  );

  const { data: historyData } = trpc.plugins.getExecutionHistory.useQuery(
    { pluginName, limit: 10 },
    { enabled: open && !!pluginName }
  );

  const executeMutation = trpc.plugins.execute.useMutation();

  const actions = actionsData || [];
  const selectedActionConfig = actions.find((a) => a.action === selectedAction);

  useEffect(() => {
    if (actions.length > 0 && !selectedAction) {
      setSelectedAction(actions[0].action);
    }
  }, [actions, selectedAction]);

  useEffect(() => {
    if (selectedActionConfig) {
      const initialValues: Record<string, string> = {};
      selectedActionConfig.inputs.forEach((input) => {
        initialValues[input.name] = "";
      });
      setInputValues(initialValues);
    }
  }, [selectedActionConfig]);

  const handleExecute = async () => {
    if (!selectedAction) return;

    const log: ExecutionLog = {
      id: Date.now(),
      action: selectedAction,
      input: { ...inputValues },
      status: "running",
      timestamp: new Date(),
    };

    setExecutionLogs((prev) => [log, ...prev]);
    setIsExecuting(true);

    try {
      // Convert input values to proper types
      const processedInput: Record<string, unknown> = {};
      Object.entries(inputValues).forEach(([key, value]) => {
        if (value.startsWith("{") || value.startsWith("[")) {
          try {
            processedInput[key] = JSON.parse(value);
          } catch {
            processedInput[key] = value;
          }
        } else {
          processedInput[key] = value;
        }
      });

      const result = await executeMutation.mutateAsync({
        pluginName,
        action: selectedAction,
        input: processedInput,
      });

      setExecutionLogs((prev) =>
        prev.map((l) =>
          l.id === log.id
            ? {
                ...l,
                status: result.success ? "success" : "error",
                output: result.data,
                error: result.error,
                duration: result.duration,
              }
            : l
        )
      );

      if (result.success) {
        toast.success(`Action "${selectedAction}" exécutée avec succès`);
      } else {
        toast.error(result.error || "Erreur lors de l'exécution");
      }
    } catch (error) {
      setExecutionLogs((prev) =>
        prev.map((l) =>
          l.id === log.id
            ? {
                ...l,
                status: "error",
                error: error instanceof Error ? error.message : "Erreur inconnue",
              }
            : l
        )
      );
      toast.error("Erreur lors de l'exécution");
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusIcon = (status: ExecutionLog["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Console - {pluginDisplayName}
          </DialogTitle>
          <DialogDescription>
            Exécutez des actions et testez le plugin en temps réel
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Left: Action configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une action" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((action) => (
                    <SelectItem key={action.action} value={action.action}>
                      <div className="flex flex-col">
                        <span>{action.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedActionConfig && selectedActionConfig.inputs.length > 0 && (
              <div className="space-y-3">
                <Label>Paramètres</Label>
                {selectedActionConfig.inputs.map((input) => (
                  <div key={input.name} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      {input.name}
                      {input.required && (
                        <span className="text-red-500">*</span>
                      )}
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {input.type}
                      </Badge>
                    </Label>
                    <Input
                      value={inputValues[input.name] || ""}
                      onChange={(e) =>
                        setInputValues((prev) => ({
                          ...prev,
                          [input.name]: e.target.value,
                        }))
                      }
                      placeholder={
                        input.type === "object"
                          ? '{"key": "value"}'
                          : `Entrez ${input.name}`
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleExecute}
              disabled={isExecuting || !selectedAction}
              className="w-full"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Exécuter
            </Button>
          </div>

          {/* Right: Execution logs */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="text-sm font-medium">Historique</span>
            </div>
            <ScrollArea className="flex-1 p-2">
              {executionLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Aucune exécution
                </div>
              )}
              {executionLogs.map((log) => (
                <Card
                  key={log.id}
                  className={cn(
                    "mb-2",
                    log.status === "error" && "border-red-500/30",
                    log.status === "success" && "border-green-500/30"
                  )}
                >
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className="font-mono">{log.action}</span>
                      </div>
                      {log.duration && (
                        <Badge variant="outline" className="text-xs">
                          {log.duration}ms
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {Object.keys(log.input).length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <ChevronRight className="h-3 w-3" />
                          Input
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-20">
                          {JSON.stringify(log.input, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.output !== undefined && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <ChevronRight className="h-3 w-3" />
                          Output
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(log.output as object, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.error && (
                      <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                        {String(log.error)}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {log.timestamp.toLocaleTimeString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
