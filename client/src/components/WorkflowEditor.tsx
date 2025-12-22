import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Background, Controls, ReactFlow, useEdgesState, useNodesState, addEdge, Connection, Edge, MarkerType, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Bot, Database, Loader2, MessageSquare, MousePointerClick, Play, Plus, Save, Trash2, Zap } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";

const DEFAULT_NODES: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Cron Trigger (Daily)' },
    position: { x: 250, y: 50 },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '2',
    data: { label: 'Fetch RAG Data' },
    position: { x: 100, y: 200 },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #64748b', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '3',
    data: { label: 'Generate Summary (LLM)' },
    position: { x: 400, y: 200 },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #a855f7', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '4',
    type: 'output',
    data: { label: 'Send Email Report' },
    position: { x: 250, y: 350 },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px' },
  },
];

const DEFAULT_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#64748b' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#64748b' } },
  { id: 'e2-4', source: '2', target: '4', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: '3', target: '4', markerEnd: { type: MarkerType.ArrowClosed } },
];

const NODE_TYPES = [
  { type: 'trigger', label: 'Trigger', icon: Zap, color: 'text-yellow-500' },
  { type: 'action', label: 'Action', icon: Activity, color: 'text-blue-500' },
  { type: 'llm', label: 'LLM Task', icon: Bot, color: 'text-purple-500' },
  { type: 'db', label: 'Database', icon: Database, color: 'text-green-500' },
  { type: 'msg', label: 'Message', icon: MessageSquare, color: 'text-pink-500' },
];

interface WorkflowData {
  id: number;
  name: string;
  description: string | null;
  nodes: unknown[];
  edges: unknown[];
  enabled: boolean;
}

export function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: "", description: "" });

  // tRPC queries and mutations
  const { data: workflowsData, isLoading, refetch } = trpc.workflows.list.useQuery();
  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsNewDialogOpen(false);
      setNewWorkflow({ name: "", description: "" });
      toast.success("Workflow créé avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Workflow sauvegardé");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedWorkflow(null);
      setNodes(DEFAULT_NODES);
      setEdges(DEFAULT_EDGES);
      toast.success("Workflow supprimé");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  const executeMutation = trpc.workflows.execute.useMutation({
    onSuccess: (result) => {
      setIsRunning(false);
      toast.success("Workflow terminé avec succès", {
        description: `Execution ID: ${result.executionId}`
      });
    },
    onError: (error) => {
      setIsRunning(false);
      toast.error(`Erreur d'exécution: ${error.message}`);
    },
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const handleSelectWorkflow = (workflowId: string) => {
    if (workflowId === "new") {
      setSelectedWorkflow(null);
      setNodes(DEFAULT_NODES);
      setEdges(DEFAULT_EDGES);
      return;
    }
    
    const workflow = workflowsData?.find(w => w.id.toString() === workflowId);
    if (workflow) {
      setSelectedWorkflow({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes as unknown[],
        edges: workflow.edges as unknown[],
        enabled: workflow.enabled,
      });
      setNodes(workflow.nodes as Node[]);
      setEdges(workflow.edges as Edge[]);
    }
  };

  const handleSave = () => {
    if (selectedWorkflow && workflowsData && workflowsData.length > 0) {
      updateMutation.mutate({
        id: selectedWorkflow.id,
        data: {
          nodes: nodes as unknown[],
          edges: edges as unknown[],
        },
      });
    } else {
      toast.info("Créez d'abord un nouveau workflow pour sauvegarder");
    }
  };

  const handleCreate = () => {
    if (!newWorkflow.name) return;
    
    createMutation.mutate({
      name: newWorkflow.name,
      description: newWorkflow.description,
      nodes: nodes as unknown[],
      edges: edges as unknown[],
      enabled: false,
    });
  };

  const handleRun = () => {
    if (selectedWorkflow && workflowsData && workflowsData.length > 0) {
      setIsRunning(true);
      executeMutation.mutate({ id: selectedWorkflow.id });
    } else {
      // Simulation mode
      setIsRunning(true);
      toast.info("Exécution du workflow...", {
        description: "Traitement en cours sur le nœud Orchestrator."
      });
      
      setTimeout(() => {
        setIsRunning(false);
        toast.success("Workflow terminé avec succès", {
          description: "Rapport envoyé par email."
        });
      }, 3000);
    }
  };

  const handleDelete = () => {
    if (selectedWorkflow && workflowsData && workflowsData.length > 0) {
      deleteMutation.mutate({ id: selectedWorkflow.id });
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
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Éditeur de Workflows</h2>
          {(!workflowsData || workflowsData.length === 0) && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              Mode Simulation
            </Badge>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {/* Workflow selector */}
          <Select 
            value={selectedWorkflow?.id.toString() || "new"} 
            onValueChange={handleSelectWorkflow}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sélectionner un workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Nouveau workflow</SelectItem>
              {workflowsData?.map(w => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New workflow dialog */}
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau workflow</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input 
                    id="name" 
                    value={newWorkflow.name} 
                    onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                    placeholder="Mon workflow..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea 
                    id="desc" 
                    value={newWorkflow.description} 
                    onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                    placeholder="Description du workflow..."
                  />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
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

          <Button variant="outline" size="sm" onClick={handleSave} className="gap-2" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder
          </Button>
          {selectedWorkflow && (
            <Button variant="outline" size="sm" onClick={handleDelete} className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={handleRun} disabled={isRunning} className="gap-2">
            <Play className={cn("h-4 w-4", isRunning && "animate-spin")} />
            {isRunning ? "Exécution..." : "Tester"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 border border-border/50 rounded-lg overflow-hidden bg-background">
        {/* Sidebar */}
        <div className="w-48 bg-muted/10 border-r border-border/50 p-4 flex flex-col gap-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Nœuds Disponibles
          </div>
          <div className="flex flex-col gap-2">
            {NODE_TYPES.map((node) => (
              <div 
                key={node.type}
                className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors text-sm"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', node.type);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                <node.icon className={cn("h-4 w-4", node.color)} />
                {node.label}
              </div>
            ))}
          </div>
          
          <div className="mt-auto p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-400">
            <div className="flex items-center gap-1.5 mb-1 font-medium">
              <MousePointerClick className="h-3 w-3" />
              Astuce
            </div>
            Glissez-déposez les nœuds sur le canvas pour construire votre scénario.
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 h-full bg-slate-950/50 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-slate-950"
          >
            <Background color="#334155" gap={16} />
            <Controls className="bg-card border-border text-foreground fill-foreground" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
