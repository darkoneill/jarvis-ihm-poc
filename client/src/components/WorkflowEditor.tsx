import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Background, Controls, ReactFlow, useEdgesState, useNodesState, addEdge, Connection, Edge, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Bot, Calendar, Database, Mail, MessageSquare, MousePointerClick, Play, Save, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const INITIAL_NODES = [
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

const INITIAL_EDGES = [
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

export function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [isRunning, setIsRunning] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const handleSave = () => {
    toast.success("Workflow sauvegardé", {
      description: `${nodes.length} nœuds et ${edges.length} connexions enregistrés.`
    });
  };

  const handleRun = () => {
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
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Éditeur de Workflows</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Sauvegarder
          </Button>
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
