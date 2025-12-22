import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "1"], description: "Aller au Dialogue" },
      { keys: ["Ctrl", "2"], description: "Aller aux Tâches" },
      { keys: ["Ctrl", "3"], description: "Aller au Hardware" },
      { keys: ["Ctrl", "4"], description: "Aller au Calendrier" },
      { keys: ["Ctrl", "5"], description: "Aller aux Connaissances" },
      { keys: ["Ctrl", "6"], description: "Aller aux Workflows" },
      { keys: ["Ctrl", ","], description: "Ouvrir les Paramètres" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Recherche globale" },
      { keys: ["Ctrl", "N"], description: "Nouvelle tâche" },
      { keys: ["Ctrl", "M"], description: "Commande vocale" },
      { keys: ["Ctrl", "Enter"], description: "Envoyer message" },
    ],
  },
  {
    title: "Général",
    shortcuts: [
      { keys: ["Shift", "?"], description: "Afficher cette aide" },
      { keys: ["Escape"], description: "Fermer modal / annuler" },
    ],
  },
];

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index}>
          <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs font-mono">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
        </span>
      ))}
    </div>
  );
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Utilisez ces raccourcis pour naviguer plus rapidement dans Jarvis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcutGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <KeyCombo keys={shortcut.keys} />
                  </div>
                ))}
              </div>
              {groupIndex < shortcutGroups.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Astuce : Sur Mac, utilisez <kbd className="px-1 py-0.5 bg-muted border rounded text-xs">⌘</kbd> au lieu de <kbd className="px-1 py-0.5 bg-muted border rounded text-xs">Ctrl</kbd>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
