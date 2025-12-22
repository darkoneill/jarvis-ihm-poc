import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GripVertical, Eye, EyeOff, Settings } from "lucide-react";
import { ReactNode } from "react";

interface DraggableWidgetProps {
  id: string;
  title: string;
  visible: boolean;
  children: ReactNode;
  onToggleVisibility?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function DraggableWidget({
  id,
  title,
  visible,
  children,
  onToggleVisibility,
  onSettings,
  className,
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!visible) {
    return null;
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group transition-all duration-200",
        isDragging && "opacity-50 shadow-2xl scale-105 z-50",
        className
      )}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onSettings}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleVisibility}
            >
              {visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
