import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Clock,
  Cloud,
  Cpu,
  Download,
  Home,
  Link,
  Package,
  Play,
  Plug,
  Radio,
  Search,
  Send,
  Settings,
  Terminal,
  Thermometer,
  Trash2,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { PluginConsole } from "@/components/PluginConsole";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Wifi,
  Radio,
  Home,
  BarChart,
  Send,
  Cloud,
  Clock,
  Cpu,
  Thermometer,
  Zap,
  Link,
  Wrench,
  Package,
};

export default function PluginsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);
  const [pluginConfig, setPluginConfig] = useState<Record<string, any>>({});
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consolePlugin, setConsolePlugin] = useState<any>(null);

  const { data: installedData, refetch: refetchInstalled } = trpc.plugins.listInstalled.useQuery();
  const { data: availableData } = trpc.plugins.listAvailable.useQuery();
  const { data: categoriesData } = trpc.plugins.getCategories.useQuery();

  const installMutation = trpc.plugins.install.useMutation({
    onSuccess: () => {
      refetchInstalled();
      toast.success("Plugin installé avec succès");
      setConfigDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'installation");
    },
  });

  const uninstallMutation = trpc.plugins.uninstall.useMutation({
    onSuccess: () => {
      refetchInstalled();
      toast.success("Plugin désinstallé");
    },
    onError: () => {
      toast.error("Erreur lors de la désinstallation");
    },
  });

  const toggleMutation = trpc.plugins.toggle.useMutation({
    onSuccess: (data) => {
      refetchInstalled();
      toast.success(data.enabled ? "Plugin activé" : "Plugin désactivé");
    },
    onError: () => {
      toast.error("Erreur lors du changement d'état");
    },
  });

  const updateConfigMutation = trpc.plugins.updateConfig.useMutation({
    onSuccess: () => {
      refetchInstalled();
      toast.success("Configuration mise à jour");
      setConfigDialogOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const installedPlugins = installedData?.plugins || [];
  const availablePlugins = availableData?.plugins || [];
  const categories = categoriesData || [];

  const filteredAvailable = availablePlugins.filter((plugin) => {
    const matchesSearch =
      !searchQuery ||
      plugin.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || plugin.category === selectedCategory;
    const notInstalled = !installedPlugins.some((p) => p.name === plugin.name);
    return matchesSearch && matchesCategory && notInstalled;
  });

  const handleInstall = (plugin: any) => {
    setSelectedPlugin(plugin);
    setPluginConfig({});
    setConfigDialogOpen(true);
  };

  const handleConfigure = (plugin: any) => {
    setSelectedPlugin(plugin);
    setPluginConfig(plugin.config || {});
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (selectedPlugin) {
      const isInstalled = installedPlugins.some((p) => p.name === selectedPlugin.name);
      if (isInstalled) {
        updateConfigMutation.mutate({
          name: selectedPlugin.name,
          config: pluginConfig,
        });
      } else {
        installMutation.mutate({
          name: selectedPlugin.name,
          config: pluginConfig,
        });
      }
    }
  };

  const renderIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Package;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" />
            Plugins
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Étendez les fonctionnalités de Jarvis avec des plugins
          </p>
        </div>
        {installedData?.isSimulation && (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
            Mode Simulation
          </Badge>
        )}
      </div>

      <Tabs defaultValue="installed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="installed">
            Installés ({installedPlugins.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Disponibles ({filteredAvailable.length})
          </TabsTrigger>
        </TabsList>

        {/* Installed Plugins */}
        <TabsContent value="installed" className="space-y-4">
          {installedPlugins.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun plugin installé</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Parcourez les plugins disponibles pour commencer
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {installedPlugins.map((plugin) => (
                <Card key={plugin.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          plugin.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {renderIcon(plugin.icon || "Package")}
                        </div>
                        <div>
                          <CardTitle className="text-base">{plugin.displayName}</CardTitle>
                          <p className="text-xs text-muted-foreground">v{plugin.version}</p>
                        </div>
                      </div>
                      <Switch
                        checked={plugin.enabled}
                        onCheckedChange={() => toggleMutation.mutate({ name: plugin.name })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm mb-4">
                      {plugin.description}
                    </CardDescription>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {categories.find((c) => c.id === plugin.category)?.name || plugin.category}
                      </Badge>
                      <div className="flex gap-2">
                        {["mqtt-connector", "home-assistant", "telegram-bot", "zigbee-gateway"].includes(plugin.name) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConsolePlugin(plugin);
                              setConsoleOpen(true);
                            }}
                            title="Ouvrir la console"
                          >
                            <Terminal className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConfigure(plugin)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Désinstaller ce plugin ?")) {
                              uninstallMutation.mutate({ name: plugin.name });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Available Plugins */}
        <TabsContent value="available" className="space-y-4">
          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un plugin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="flex gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Tous
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Plugin grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAvailable.map((plugin) => (
              <Card key={plugin.name} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {renderIcon(plugin.icon)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{plugin.displayName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">v{plugin.version}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{plugin.author}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm mb-4">
                    {plugin.description}
                  </CardDescription>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {categories.find((c) => c.id === plugin.category)?.name || plugin.category}
                    </Badge>
                    <Button size="sm" onClick={() => handleInstall(plugin)}>
                      <Download className="h-4 w-4 mr-2" />
                      Installer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAvailable.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun plugin trouvé</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlugin && renderIcon(selectedPlugin.icon || "Package")}
              {selectedPlugin?.displayName}
            </DialogTitle>
            <DialogDescription>
              {installedPlugins.some((p) => p.name === selectedPlugin?.name)
                ? "Modifier la configuration du plugin"
                : "Configurer le plugin avant l'installation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPlugin?.configSchema &&
              Object.entries(selectedPlugin.configSchema).map(([key, schema]: [string, any]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>
                    {schema.label}
                    {schema.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {schema.type === "boolean" ? (
                    <Switch
                      id={key}
                      checked={pluginConfig[key] ?? schema.default ?? false}
                      onCheckedChange={(checked) =>
                        setPluginConfig((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  ) : schema.type === "select" ? (
                    <select
                      id={key}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      value={pluginConfig[key] ?? schema.default ?? ""}
                      onChange={(e) =>
                        setPluginConfig((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    >
                      <option value="">Sélectionner...</option>
                      {schema.options?.map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={key}
                      type={schema.type === "password" ? "password" : schema.type === "number" ? "number" : "text"}
                      placeholder={schema.default?.toString()}
                      value={pluginConfig[key] ?? ""}
                      onChange={(e) =>
                        setPluginConfig((prev) => ({
                          ...prev,
                          [key]: schema.type === "number" ? Number(e.target.value) : e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={installMutation.isPending || updateConfigMutation.isPending}
            >
              {installedPlugins.some((p) => p.name === selectedPlugin?.name)
                ? "Sauvegarder"
                : "Installer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plugin Console */}
      {consolePlugin && (
        <PluginConsole
          open={consoleOpen}
          onOpenChange={setConsoleOpen}
          pluginName={consolePlugin.name}
          pluginDisplayName={consolePlugin.displayName}
        />
      )}
    </div>
  );
}
