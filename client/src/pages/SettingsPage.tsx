import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Bell, 
  Globe, 
  Keyboard, 
  Loader2, 
  Moon, 
  Palette, 
  RefreshCw, 
  RotateCcw, 
  Save, 
  Settings, 
  Sparkles,
  Sun, 
  Volume2,
  Monitor,
  Mail,
  LayoutGrid
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeSelector } from "@/components/ThemeSelector";
import { AudioAlertSettings } from "@/components/AudioAlertSettings";

interface PreferencesState {
  theme: "light" | "dark" | "system";
  language: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  autoRefreshInterval: number;
  compactMode: boolean;
  keyboardShortcutsEnabled: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [hasChanges, setHasChanges] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<PreferencesState>({
    theme: "dark",
    language: "fr",
    notificationsEnabled: true,
    soundEnabled: false,
    emailNotifications: false,
    autoRefreshInterval: 5000,
    compactMode: false,
    keyboardShortcutsEnabled: true,
  });

  // tRPC queries
  const { data: preferences, isLoading, refetch } = trpc.preferences.get.useQuery();
  
  const updateMutation = trpc.preferences.update.useMutation({
    onSuccess: (data) => {
      toast.success("Préférences sauvegardées");
      setHasChanges(false);
      // Apply theme change immediately
      if (data?.theme) {
        setTheme(data.theme);
      }
    },
    onError: (error) => {
      toast.error("Erreur de sauvegarde", { description: error.message });
    },
  });

  const resetMutation = trpc.preferences.reset.useMutation({
    onSuccess: () => {
      toast.success("Préférences réinitialisées");
      refetch();
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error("Erreur de réinitialisation", { description: error.message });
    },
  });

  // Sync local state with server data
  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        theme: preferences.theme as "light" | "dark" | "system",
        language: preferences.language,
        notificationsEnabled: preferences.notificationsEnabled,
        soundEnabled: preferences.soundEnabled,
        emailNotifications: preferences.emailNotifications,
        autoRefreshInterval: preferences.autoRefreshInterval,
        compactMode: preferences.compactMode,
        keyboardShortcutsEnabled: preferences.keyboardShortcutsEnabled,
      });
    }
  }, [preferences]);

  const updatePref = <K extends keyof PreferencesState>(key: K, value: PreferencesState[K]) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(localPrefs);
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Paramètres
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personnalisez votre expérience Jarvis
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="gap-2"
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Réinitialiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          Modifications non sauvegardées
        </Badge>
      )}

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Apparence
          </CardTitle>
          <CardDescription>
            Personnalisez l'apparence de l'interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Thème</Label>
              <p className="text-sm text-muted-foreground">
                Choisissez le thème de couleur de l'interface
              </p>
            </div>
            <Select
              value={localPrefs.theme}
              onValueChange={(value: "light" | "dark" | "system") => updatePref("theme", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Clair
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Sombre
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Système
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Visual Theme */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Thème visuel
              </Label>
              <p className="text-sm text-muted-foreground">
                Choisissez un thème inspiré de la science-fiction
              </p>
            </div>
            <Button variant="outline" onClick={() => setThemeSelectorOpen(true)}>
              <Palette className="h-4 w-4 mr-2" />
              Choisir un thème
            </Button>
          </div>

          <Separator />

          {/* Compact Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Mode compact
              </Label>
              <p className="text-sm text-muted-foreground">
                Réduire l'espacement pour afficher plus de contenu
              </p>
            </div>
            <Switch
              checked={localPrefs.compactMode}
              onCheckedChange={(checked) => updatePref("compactMode", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme Selector Dialog */}
      <ThemeSelector
        open={themeSelectorOpen}
        onOpenChange={setThemeSelectorOpen}
      />

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Langue et région
          </CardTitle>
          <CardDescription>
            Paramètres de langue et de localisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Langue de l'interface</Label>
              <p className="text-sm text-muted-foreground">
                Langue utilisée pour l'affichage et la reconnaissance vocale
              </p>
            </div>
            <Select
              value={localPrefs.language}
              onValueChange={(value) => updatePref("language", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Gérez vos préférences de notification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Notifications push</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des alertes en temps réel dans l'application
              </p>
            </div>
            <Switch
              checked={localPrefs.notificationsEnabled}
              onCheckedChange={(checked) => updatePref("notificationsEnabled", checked)}
            />
          </div>

          <Separator />

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Sons de notification
              </Label>
              <p className="text-sm text-muted-foreground">
                Jouer un son lors des alertes importantes
              </p>
            </div>
            <Switch
              checked={localPrefs.soundEnabled}
              onCheckedChange={(checked) => updatePref("soundEnabled", checked)}
            />
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Notifications par email
              </Label>
              <p className="text-sm text-muted-foreground">
                Recevoir un résumé quotidien par email
              </p>
            </div>
            <Switch
              checked={localPrefs.emailNotifications}
              onCheckedChange={(checked) => updatePref("emailNotifications", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Performance
          </CardTitle>
          <CardDescription>
            Paramètres de rafraîchissement et de performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Refresh Interval */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Intervalle de rafraîchissement</Label>
                <p className="text-sm text-muted-foreground">
                  Fréquence de mise à jour des données en temps réel
                </p>
              </div>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {(localPrefs.autoRefreshInterval / 1000).toFixed(0)}s
              </span>
            </div>
            <Slider
              value={[localPrefs.autoRefreshInterval]}
              onValueChange={([value]) => updatePref("autoRefreshInterval", value)}
              min={1000}
              max={30000}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1s (temps réel)</span>
              <span>30s (économie)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Alerts */}
      <AudioAlertSettings />

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </CardTitle>
          <CardDescription>
            Activez ou désactivez les raccourcis clavier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Activer les raccourcis</Label>
              <p className="text-sm text-muted-foreground">
                Utilisez des combinaisons de touches pour naviguer plus rapidement
              </p>
            </div>
            <Switch
              checked={localPrefs.keyboardShortcutsEnabled}
              onCheckedChange={(checked) => updatePref("keyboardShortcutsEnabled", checked)}
            />
          </div>

          {localPrefs.keyboardShortcutsEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Envoyer message</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Ctrl + Enter</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Recherche globale</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Ctrl + K</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Nouvelle tâche</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Ctrl + N</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Paramètres</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Ctrl + ,</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Commande vocale</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Ctrl + M</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Aide</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">?</kbd>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User Info */}
      {user && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Informations du compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nom:</span>
                <span className="ml-2 font-medium">{user.name || "Non défini"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <span className="ml-2 font-medium">{user.email || "Non défini"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rôle:</span>
                <Badge variant="outline" className="ml-2">{user.role}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Méthode de connexion:</span>
                <span className="ml-2 font-medium">{user.loginMethod || "OAuth"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
