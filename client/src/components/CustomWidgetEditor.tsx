import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Code,
  Eye,
  Globe,
  LineChart,
  Loader2,
  Palette,
  Play,
  Plus,
  Save,
  Settings,
  Timer,
  ExternalLink,
  FileText,
} from "lucide-react";

interface CustomWidgetEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editWidget?: any;
  onSave?: () => void;
}

const widgetTypeOptions = [
  { value: "api", label: "API REST", icon: Globe, description: "Récupère des données depuis une API" },
  { value: "chart", label: "Graphique", icon: LineChart, description: "Affiche un graphique dynamique" },
  { value: "text", label: "Texte", icon: FileText, description: "Affiche du texte statique ou dynamique" },
  { value: "iframe", label: "Iframe", icon: ExternalLink, description: "Intègre une page web externe" },
  { value: "countdown", label: "Compte à rebours", icon: Timer, description: "Compte à rebours vers une date" },
];

const iconOptions = [
  "Activity", "AlertCircle", "BarChart", "Bitcoin", "Box", "Calendar", "Clock",
  "Cloud", "Code", "Cpu", "Database", "DollarSign", "Globe", "Heart", "Home",
  "LineChart", "Mail", "Map", "Monitor", "Package", "Percent", "PieChart",
  "Server", "Settings", "Shield", "Star", "Sun", "Thermometer", "Timer",
  "TrendingUp", "User", "Wifi", "Zap",
];

const colorOptions = [
  { value: "#3B82F6", label: "Bleu" },
  { value: "#10B981", label: "Vert" },
  { value: "#F59E0B", label: "Orange" },
  { value: "#EF4444", label: "Rouge" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#EC4899", label: "Rose" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#F7931A", label: "Bitcoin" },
];

export function CustomWidgetEditor({
  open,
  onOpenChange,
  editWidget,
  onSave,
}: CustomWidgetEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [widgetType, setWidgetType] = useState<string>("api");
  const [icon, setIcon] = useState("Globe");
  const [color, setColor] = useState("#3B82F6");
  const [isPublic, setIsPublic] = useState(false);
  
  // API config
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [apiHeaders, setApiHeaders] = useState("");
  const [apiBody, setApiBody] = useState("");
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [valueExtractor, setValueExtractor] = useState("");
  const [displayTemplate, setDisplayTemplate] = useState("");
  
  // Chart config
  const [chartType, setChartType] = useState<"line" | "bar" | "pie" | "doughnut">("line");
  
  // Iframe config
  const [iframeSrc, setIframeSrc] = useState("");
  
  // Countdown config
  const [targetDate, setTargetDate] = useState("");
  const [countdownLabel, setCountdownLabel] = useState("");
  
  // Preview state
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const createMutation = trpc.customWidgets.create.useMutation({
    onSuccess: () => {
      toast.success("Widget créé avec succès");
      onSave?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });

  const updateMutation = trpc.customWidgets.update.useMutation({
    onSuccess: () => {
      toast.success("Widget mis à jour");
      onSave?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  const executeApiMutation = trpc.customWidgets.executeApi.useMutation();

  useEffect(() => {
    if (editWidget) {
      setName(editWidget.name || "");
      setDescription(editWidget.description || "");
      setWidgetType(editWidget.widgetType || "api");
      setIcon(editWidget.icon || "Globe");
      setColor(editWidget.color || "#3B82F6");
      setIsPublic(editWidget.isPublic || false);
      
      const config = editWidget.config || {};
      setApiUrl(config.url || "");
      setApiMethod(config.method || "GET");
      setApiHeaders(config.headers ? JSON.stringify(config.headers, null, 2) : "");
      setApiBody(config.body || "");
      setRefreshInterval(config.refreshInterval || 60000);
      setValueExtractor(config.valueExtractor || "");
      setDisplayTemplate(config.displayTemplate || "");
      setChartType(config.chartType || "line");
      setIframeSrc(config.iframeSrc || "");
      setTargetDate(config.targetDate || "");
      setCountdownLabel(config.countdownLabel || "");
    }
  }, [editWidget]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setWidgetType("api");
    setIcon("Globe");
    setColor("#3B82F6");
    setIsPublic(false);
    setApiUrl("");
    setApiMethod("GET");
    setApiHeaders("");
    setApiBody("");
    setRefreshInterval(60000);
    setValueExtractor("");
    setDisplayTemplate("");
    setChartType("line");
    setIframeSrc("");
    setTargetDate("");
    setCountdownLabel("");
    setPreviewData(null);
  };

  const handleTestApi = async () => {
    if (!apiUrl) {
      toast.error("URL requise pour tester l'API");
      return;
    }

    setPreviewLoading(true);
    try {
      let headers = {};
      if (apiHeaders) {
        try {
          headers = JSON.parse(apiHeaders);
        } catch {
          toast.error("Format JSON invalide pour les headers");
          setPreviewLoading(false);
          return;
        }
      }

      const result = await executeApiMutation.mutateAsync({
        url: apiUrl,
        method: apiMethod,
        headers,
        body: apiBody || undefined,
      });

      if (result.success) {
        setPreviewData(result.data);
        toast.success("API testée avec succès");
      } else {
        toast.error(result.error || "Erreur lors du test");
      }
    } catch (error) {
      toast.error("Erreur lors du test de l'API");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const config: any = {};
    
    if (widgetType === "api") {
      config.url = apiUrl;
      config.method = apiMethod;
      if (apiHeaders) {
        try {
          config.headers = JSON.parse(apiHeaders);
        } catch {
          toast.error("Format JSON invalide pour les headers");
          return;
        }
      }
      config.body = apiBody || undefined;
      config.refreshInterval = refreshInterval;
      config.valueExtractor = valueExtractor || undefined;
      config.displayTemplate = displayTemplate || undefined;
    } else if (widgetType === "chart") {
      config.chartType = chartType;
      config.url = apiUrl;
      config.refreshInterval = refreshInterval;
    } else if (widgetType === "iframe") {
      config.iframeSrc = iframeSrc;
    } else if (widgetType === "countdown") {
      config.targetDate = targetDate;
      config.countdownLabel = countdownLabel;
    }

    const data = {
      name,
      description: description || undefined,
      widgetType: widgetType as any,
      config,
      icon,
      color,
      isPublic,
      defaultSize: { width: 2, height: 1 },
    };

    if (editWidget) {
      updateMutation.mutate({ id: editWidget.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editWidget ? "Modifier le widget" : "Créer un widget personnalisé"}
          </DialogTitle>
          <DialogDescription>
            Créez un widget personnalisé pour afficher des données depuis n'importe quelle source
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              Général
            </TabsTrigger>
            <TabsTrigger value="config">
              <Code className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="style">
              <Palette className="h-4 w-4 mr-2" />
              Style
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="general" className="space-y-4 px-1">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du widget *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Prix Bitcoin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du widget..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Type de widget</Label>
                <div className="grid grid-cols-2 gap-2">
                  {widgetTypeOptions.map((option) => (
                    <Card
                      key={option.value}
                      className={cn(
                        "cursor-pointer transition-colors",
                        widgetType === option.value
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => setWidgetType(option.value)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <option.icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Widget public</Label>
                  <p className="text-xs text-muted-foreground">
                    Rendre ce widget disponible pour tous les utilisateurs
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4 px-1">
              {(widgetType === "api" || widgetType === "chart") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiUrl">URL de l'API *</Label>
                    <Input
                      id="apiUrl"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://api.example.com/data"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Méthode HTTP</Label>
                      <Select value={apiMethod} onValueChange={(v) => setApiMethod(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="refreshInterval">Rafraîchissement (ms)</Label>
                      <Input
                        id="refreshInterval"
                        type="number"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        min={5000}
                        step={1000}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiHeaders">Headers (JSON)</Label>
                    <Textarea
                      id="apiHeaders"
                      value={apiHeaders}
                      onChange={(e) => setApiHeaders(e.target.value)}
                      placeholder='{"Authorization": "Bearer xxx"}'
                      rows={2}
                      className="font-mono text-sm"
                    />
                  </div>

                  {apiMethod !== "GET" && (
                    <div className="space-y-2">
                      <Label htmlFor="apiBody">Body</Label>
                      <Textarea
                        id="apiBody"
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={3}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </>
              )}

              {widgetType === "api" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="valueExtractor">Extracteur de valeur (JSONPath)</Label>
                    <Input
                      id="valueExtractor"
                      value={valueExtractor}
                      onChange={(e) => setValueExtractor(e.target.value)}
                      placeholder="$.data.value"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Expression JSONPath pour extraire la valeur à afficher
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayTemplate">Template d'affichage (HTML)</Label>
                    <Textarea
                      id="displayTemplate"
                      value={displayTemplate}
                      onChange={(e) => setDisplayTemplate(e.target.value)}
                      placeholder="<div class='text-2xl font-bold'>{{value}}</div>"
                      rows={3}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Utilisez {"{{value}}"} pour insérer la valeur extraite
                    </p>
                  </div>
                </>
              )}

              {widgetType === "chart" && (
                <div className="space-y-2">
                  <Label>Type de graphique</Label>
                  <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Ligne</SelectItem>
                      <SelectItem value="bar">Barres</SelectItem>
                      <SelectItem value="pie">Camembert</SelectItem>
                      <SelectItem value="doughnut">Donut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {widgetType === "iframe" && (
                <div className="space-y-2">
                  <Label htmlFor="iframeSrc">URL de la page</Label>
                  <Input
                    id="iframeSrc"
                    value={iframeSrc}
                    onChange={(e) => setIframeSrc(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              )}

              {widgetType === "countdown" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="targetDate">Date cible</Label>
                    <Input
                      id="targetDate"
                      type="datetime-local"
                      value={targetDate ? targetDate.slice(0, 16) : ""}
                      onChange={(e) => setTargetDate(new Date(e.target.value).toISOString())}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="countdownLabel">Label</Label>
                    <Input
                      id="countdownLabel"
                      value={countdownLabel}
                      onChange={(e) => setCountdownLabel(e.target.value)}
                      placeholder="Événement"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="style" className="space-y-4 px-1">
              <div className="space-y-2">
                <Label>Icône</Label>
                <div className="grid grid-cols-8 gap-2">
                  {iconOptions.map((iconName) => (
                    <Button
                      key={iconName}
                      variant={icon === iconName ? "default" : "outline"}
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setIcon(iconName)}
                      title={iconName}
                    >
                      {iconName.slice(0, 2)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        "h-10 w-10 rounded-lg border-2 transition-all",
                        color === opt.value ? "border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: opt.value }}
                      onClick={() => setColor(opt.value)}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 px-1">
              {widgetType === "api" && (
                <Button onClick={handleTestApi} disabled={previewLoading || !apiUrl}>
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Tester l'API
                </Button>
              )}

              {previewData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Réponse de l'API</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <Card style={{ borderColor: color }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: color }}
                    >
                      {icon.slice(0, 2)}
                    </div>
                    {name || "Widget Preview"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {description || "Aperçu du widget"}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {widgetTypeOptions.find((t) => t.value === widgetType)?.label}
                  </Badge>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Save className="h-4 w-4 mr-2" />
            {editWidget ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
