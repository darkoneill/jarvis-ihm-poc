import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  global?: boolean; // Works even when input is focused
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: Shortcut[];
}

// Default shortcuts
const createDefaultShortcuts = (
  navigate: (path: string) => void,
  callbacks: {
    onSearch?: () => void;
    onNewTask?: () => void;
    onVoice?: () => void;
    onHelp?: () => void;
  }
): Shortcut[] => [
  {
    key: "k",
    ctrl: true,
    action: () => callbacks.onSearch?.(),
    description: "Recherche globale",
    global: true,
  },
  {
    key: "n",
    ctrl: true,
    action: () => callbacks.onNewTask?.(),
    description: "Nouvelle tâche",
  },
  {
    key: ",",
    ctrl: true,
    action: () => navigate("/settings"),
    description: "Paramètres",
    global: true,
  },
  {
    key: "m",
    ctrl: true,
    action: () => callbacks.onVoice?.(),
    description: "Commande vocale",
  },
  {
    key: "1",
    ctrl: true,
    action: () => navigate("/"),
    description: "Dialogue",
    global: true,
  },
  {
    key: "2",
    ctrl: true,
    action: () => navigate("/tasks"),
    description: "Tâches",
    global: true,
  },
  {
    key: "3",
    ctrl: true,
    action: () => navigate("/hardware"),
    description: "Hardware",
    global: true,
  },
  {
    key: "4",
    ctrl: true,
    action: () => navigate("/calendar"),
    description: "Calendrier",
    global: true,
  },
  {
    key: "5",
    ctrl: true,
    action: () => navigate("/knowledge"),
    description: "Connaissances",
    global: true,
  },
  {
    key: "6",
    ctrl: true,
    action: () => navigate("/workflows"),
    description: "Workflows",
    global: true,
  },
  {
    key: "?",
    shift: true,
    action: () => callbacks.onHelp?.(),
    description: "Aide raccourcis",
  },
  {
    key: "Escape",
    action: () => {
      // Close any open modal/dialog
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(event);
    },
    description: "Fermer modal",
    global: true,
  },
];

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, shortcuts: customShortcuts } = options;
  const [, navigate] = useLocation();
  const callbacksRef = useRef<{
    onSearch?: () => void;
    onNewTask?: () => void;
    onVoice?: () => void;
    onHelp?: () => void;
  }>({});

  const setCallback = useCallback((name: keyof typeof callbacksRef.current, fn: () => void) => {
    callbacksRef.current[name] = fn;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const shortcuts = customShortcuts || createDefaultShortcuts(navigate, callbacksRef.current);

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      const isInputFocused = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        // Skip non-global shortcuts when input is focused
        if (isInputFocused && !shortcut.global) continue;

        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, customShortcuts, navigate]);

  return {
    setCallback,
    shortcuts: customShortcuts || createDefaultShortcuts(navigate, callbacksRef.current),
  };
}

// Hook for Ctrl+Enter to submit
export function useSubmitShortcut(onSubmit: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSubmit, enabled]);
}
