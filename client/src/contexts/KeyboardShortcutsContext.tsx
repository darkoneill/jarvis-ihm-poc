import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { trpc } from "@/lib/trpc";

interface KeyboardShortcutsContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  openCommandPalette: () => void;
  openHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [, navigate] = useLocation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  // Get user preferences
  const { data: preferences } = trpc.preferences.get.useQuery();

  // Sync enabled state with preferences
  useEffect(() => {
    if (preferences?.keyboardShortcutsEnabled !== undefined) {
      setEnabled(preferences.keyboardShortcutsEnabled);
    }
  }, [preferences?.keyboardShortcutsEnabled]);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const openHelp = useCallback(() => {
    setHelpOpen(true);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field (for non-global shortcuts)
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl+K - Command Palette (global)
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl+, - Settings (global)
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        navigate("/settings");
        return;
      }

      // Skip other shortcuts if input is focused
      if (isInputFocused) return;

      // Shift+? - Help
      if (event.shiftKey && event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Ctrl+1-6 - Navigation
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "1":
            event.preventDefault();
            navigate("/");
            break;
          case "2":
            event.preventDefault();
            navigate("/tasks");
            break;
          case "3":
            event.preventDefault();
            navigate("/hardware");
            break;
          case "4":
            event.preventDefault();
            navigate("/calendar");
            break;
          case "5":
            event.preventDefault();
            navigate("/knowledge");
            break;
          case "6":
            event.preventDefault();
            navigate("/workflows");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, navigate]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        enabled,
        setEnabled,
        openCommandPalette,
        openHelp,
      }}
    >
      {children}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <KeyboardShortcutsHelp
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error("useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider");
  }
  return context;
}
