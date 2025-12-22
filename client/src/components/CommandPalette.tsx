import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLocation } from "wouter";
import {
  Activity,
  Bot,
  Calendar,
  FileText,
  LayoutDashboard,
  Library,
  Mic,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Workflow,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTask?: () => void;
  onVoice?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onNewTask,
  onVoice,
}: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher une commande ou naviguer..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Dialogue</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/logs"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Logs</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Tâches</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/hardware"))}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Hardware</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/calendar"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Calendrier</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/knowledge"))}>
            <Library className="mr-2 h-4 w-4" />
            <span>Connaissances</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/workflows"))}>
            <Workflow className="mr-2 h-4 w-4" />
            <span>Workflows</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Paramètres</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {onNewTask && (
            <CommandItem onSelect={() => runCommand(onNewTask)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Nouvelle tâche</span>
            </CommandItem>
          )}
          {onVoice && (
            <CommandItem onSelect={() => runCommand(onVoice)}>
              <Mic className="mr-2 h-4 w-4" />
              <span>Commande vocale</span>
            </CommandItem>
          )}
          <CommandItem onSelect={() => runCommand(() => navigate("/knowledge"))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Rechercher dans les connaissances</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Thème">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Thème clair</span>
            {theme === "light" && <span className="ml-auto text-xs text-muted-foreground">Actif</span>}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Thème sombre</span>
            {theme === "dark" && <span className="ml-auto text-xs text-muted-foreground">Actif</span>}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
