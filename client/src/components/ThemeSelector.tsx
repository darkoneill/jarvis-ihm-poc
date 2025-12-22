import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, Palette, Sparkles, Zap } from "lucide-react";

interface ThemeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThemeChange?: (themeName: string) => void;
}

export function ThemeSelector({ open, onOpenChange, onThemeChange }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>("jarvis-default");
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  const { data: themesData } = trpc.themes.list.useQuery(undefined, { enabled: open });
  const { data: activeData } = trpc.themes.getActive.useQuery(undefined, { enabled: open });
  const setActiveMutation = trpc.themes.setActive.useMutation();

  const themes = themesData?.themes || [];

  useEffect(() => {
    if (activeData?.themeName) {
      setSelectedTheme(activeData.themeName);
    }
  }, [activeData]);

  const handleApplyTheme = async (themeName: string) => {
    try {
      await setActiveMutation.mutateAsync({ themeName });
      setSelectedTheme(themeName);
      onThemeChange?.(themeName);
      toast.success("Thème appliqué avec succès");
      
      // Apply theme CSS variables
      const theme = themes.find((t) => t.name === themeName);
      if (theme) {
        applyThemeToDocument(theme);
      }
    } catch (error) {
      toast.error("Erreur lors de l'application du thème");
    }
  };

  const applyThemeToDocument = (theme: any) => {
    const root = document.documentElement;
    const colors = theme.colors;
    
    // Apply color variables
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      root.style.setProperty(cssVar, value as string);
    });

    // Apply fonts if available
    if (theme.fonts) {
      if (theme.fonts.heading) {
        root.style.setProperty("--font-heading", theme.fonts.heading);
      }
      if (theme.fonts.body) {
        root.style.setProperty("--font-body", theme.fonts.body);
      }
      if (theme.fonts.mono) {
        root.style.setProperty("--font-mono", theme.fonts.mono);
      }
    }

    // Apply effects
    if (theme.effects) {
      root.classList.toggle("theme-glow", theme.effects.glowEnabled);
      root.classList.toggle("theme-scanlines", theme.effects.scanlineEnabled);
      root.classList.toggle("theme-particles", theme.effects.particlesEnabled);
      root.classList.toggle("theme-animations", theme.effects.animationsEnabled);
      
      if (theme.effects.glowColor) {
        root.style.setProperty("--glow-color", theme.effects.glowColor);
      }
    }
  };

  const handlePreview = (themeName: string) => {
    setPreviewTheme(themeName);
    const theme = themes.find((t) => t.name === themeName);
    if (theme) {
      applyThemeToDocument(theme);
    }
  };

  const handleCancelPreview = () => {
    setPreviewTheme(null);
    const theme = themes.find((t) => t.name === selectedTheme);
    if (theme) {
      applyThemeToDocument(theme);
    }
  };

  const getThemePreviewColors = (theme: any) => {
    const colors = theme.colors;
    return [
      colors.primary,
      colors.secondary,
      colors.accent,
      colors.background,
    ];
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && previewTheme) {
        handleCancelPreview();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Thèmes Visuels
          </DialogTitle>
          <DialogDescription>
            Personnalisez l'apparence de Jarvis avec des thèmes inspirés de la science-fiction
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-2 gap-4">
            {themes.map((theme) => (
              <Card
                key={theme.name}
                className={cn(
                  "cursor-pointer transition-all hover:scale-[1.02]",
                  (previewTheme || selectedTheme) === theme.name
                    ? "ring-2 ring-primary"
                    : "hover:border-primary/50"
                )}
                onClick={() => handlePreview(theme.name)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {theme.displayName}
                        {selectedTheme === theme.name && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {theme.description}
                      </CardDescription>
                    </div>
                    {theme.isBuiltIn && (
                      <Badge variant="outline" className="text-[10px]">
                        Intégré
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Color preview */}
                  <div className="flex gap-1 mb-3">
                    {getThemePreviewColors(theme).map((color, i) => (
                      <div
                        key={i}
                        className="h-6 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Effects badges */}
                  <div className="flex flex-wrap gap-1">
                    {theme.effects?.glowEnabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Glow
                      </Badge>
                    )}
                    {theme.effects?.scanlineEnabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        Scanlines
                      </Badge>
                    )}
                    {theme.effects?.particlesEnabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Zap className="h-3 w-3 mr-1" />
                        Particles
                      </Badge>
                    )}
                  </div>

                  {/* Font info */}
                  {theme.fonts?.heading && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Police: {theme.fonts.heading}
                    </p>
                  )}

                  {/* Apply button */}
                  {previewTheme === theme.name && previewTheme !== selectedTheme && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTheme(theme.name);
                      }}
                    >
                      Appliquer ce thème
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {previewTheme && previewTheme !== selectedTheme && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Aperçu: <strong>{themes.find((t) => t.name === previewTheme)?.displayName}</strong>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelPreview}>
                Annuler
              </Button>
              <Button onClick={() => handleApplyTheme(previewTheme)}>
                Appliquer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
