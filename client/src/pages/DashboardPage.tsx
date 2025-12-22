import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { DraggableWidget } from "@/components/dashboard/DraggableWidget";
import { renderWidget } from "@/components/dashboard/widgets";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LayoutGrid, Plus, RotateCcw, Save, Settings2, Wand2 } from "lucide-react";
import { CustomWidgetEditor } from "@/components/CustomWidgetEditor";

type WidgetType = 
  | "system_status"
  | "hardware_metrics"
  | "recent_tasks"
  | "upcoming_jobs"
  | "quick_actions"
  | "chat_preview"
  | "knowledge_search"
  | "workflow_status"
  | "notifications"
  | "clock";

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, unknown>;
  visible: boolean;
}

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [customWidgetEditorOpen, setCustomWidgetEditorOpen] = useState(false);

  const { data: config, isLoading } = trpc.dashboard.getConfig.useQuery();
  const { data: widgetTypes } = trpc.dashboard.getWidgetTypes.useQuery();
  const saveConfigMutation = trpc.dashboard.saveConfig.useMutation();
  const resetConfigMutation = trpc.dashboard.resetConfig.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (config?.widgets) {
      setWidgets(config.widgets as Widget[]);
    }
  }, [config]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      )
    );
    setHasChanges(true);
  };

  const handleAddWidget = (type: string) => {
    const widgetType = widgetTypes?.find((wt) => wt.type === type);
    if (!widgetType) return;

    const newWidget: Widget = {
      id: `${type}_${Date.now()}`,
      type: type as WidgetType,
      title: widgetType.name,
      position: { x: 0, y: widgets.length },
      size: widgetType.defaultSize,
      config: {},
      visible: true,
    };

    setWidgets((items) => [...items, newWidget]);
    setHasChanges(true);
    toast.success(`Widget "${widgetType.name}" ajouté`);
  };

  const handleSave = async () => {
    try {
      await saveConfigMutation.mutateAsync({ widgets: widgets as any });
      setHasChanges(false);
      toast.success("Configuration sauvegardée");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleReset = async () => {
    try {
      const result = await resetConfigMutation.mutateAsync();
      setWidgets(result.widgets as Widget[]);
      setHasChanges(false);
      toast.success("Configuration réinitialisée");
    } catch (error) {
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const visibleWidgets = widgets.filter((w) => w.visible);
  const hiddenWidgets = widgets.filter((w) => !w.visible);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            Tableau de Bord
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez votre dashboard en réorganisant les widgets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              Modifications non sauvegardées
            </Badge>
          )}

          {/* Add Widget */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Widgets disponibles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {widgetTypes?.map((wt) => (
                <DropdownMenuItem
                  key={wt.type}
                  onClick={() => handleAddWidget(wt.type)}
                >
                  <span className="flex-1">{wt.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCustomWidgetEditorOpen(true)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Widget personnalisé
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Widget Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Visibilité
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Widgets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {widgets.map((widget) => (
                <DropdownMenuCheckboxItem
                  key={widget.id}
                  checked={widget.visible}
                  onCheckedChange={() => handleToggleWidget(widget.id)}
                >
                  {widget.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetConfigMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>

          {/* Save */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saveConfigMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Hidden widgets indicator */}
      {hiddenWidgets.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {hiddenWidgets.length} widget(s) masqué(s)
        </div>
      )}

      {/* Widgets Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-4 gap-4 auto-rows-min">
            {visibleWidgets.map((widget) => (
              <div
                key={widget.id}
                className={`col-span-${widget.size.width}`}
                style={{
                  gridColumn: `span ${widget.size.width}`,
                }}
              >
                <DraggableWidget
                  id={widget.id}
                  title={widget.title}
                  visible={widget.visible}
                  onToggleVisibility={() => handleToggleWidget(widget.id)}
                >
                  {renderWidget(widget.type, widget.config)}
                </DraggableWidget>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {visibleWidgets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun widget visible</p>
          <p className="text-sm mt-1">
            Ajoutez des widgets ou rendez-les visibles via le menu
          </p>
        </div>
      )}

      {/* Custom Widget Editor */}
      <CustomWidgetEditor
        open={customWidgetEditorOpen}
        onOpenChange={setCustomWidgetEditorOpen}
        onSave={() => {
          toast.success("Widget personnalisé créé");
        }}
      />
    </div>
  );
}
