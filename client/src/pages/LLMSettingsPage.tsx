import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft,
  Bot,
  Check,
  Cloud,
  Cpu,
  Key,
  Loader2, 
  RefreshCw,
  RotateCcw, 
  Save, 
  Server,
  Settings2,
  Sparkles,
  TestTube,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type LLMProvider = "forge" | "ollama" | "openai" | "anthropic" | "n2";

interface LLMConfigState {
  provider: LLMProvider;
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  streamEnabled: boolean;
  fallbackEnabled: boolean;
  fallbackProvider: LLMProvider;
}

interface ProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  requiresApiKey: boolean;
  requiresUrl: boolean;
  defaultModel: string;
  defaultUrl?: string;
  models: string[];
}

const PROVIDER_ICONS: Record<LLMProvider, React.ReactNode> = {
  forge: <Cloud className="h-5 w-5 text-blue-400" />,
  ollama: <Cpu className="h-5 w-5 text-green-400" />,
  openai: <Sparkles className="h-5 w-5 text-emerald-400" />,
  anthropic: <Bot className="h-5 w-5 text-orange-400" />,
  n2: <Server className="h-5 w-5 text-purple-400" />,
};

export default function LLMSettingsPage() {
  const { user } = useAuth();
  const [hasChanges, setHasChanges] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency: number;
    error?: string;
  } | null>(null);
  
  const [localConfig, setLocalConfig] = useState<LLMConfigState>({
    provider: "forge",
    apiUrl: "",
    apiKey: "",
    model: "default",
    temperature: 70,
    maxTokens: 4096,
    timeout: 30000,
    streamEnabled: true,
    fallbackEnabled: true,
    fallbackProvider: "forge",
  });

  // tRPC queries
  const { data: providers } = trpc.llmConfig.getProviders.useQuery();
  const { data: config, isLoading, refetch } = trpc.llmConfig.get.useQuery();
  
  const updateMutation = trpc.llmConfig.update.useMutation({
    onSuccess: () => {
      toast.success("Configuration LLM sauvegardée");
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erreur de sauvegarde", { description: error.message });
    },
  });

  const testMutation = trpc.llmConfig.test.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success(`Connexion réussie ! Latence: ${result.latency}ms`);
      } else {
        toast.error("Échec de connexion", { description: result.error });
      }
    },
    onError: (error) => {
      setTestResult({ success: false, latency: 0, error: error.message });
      toast.error("Erreur de test", { description: error.message });
    },
  });

  const resetMutation = trpc.llmConfig.reset.useMutation({
    onSuccess: () => {
      toast.success("Configuration réinitialisée");
      refetch();
      setHasChanges(false);
      setTestResult(null);
    },
    onError: (error) => {
      toast.error("Erreur de réinitialisation", { description: error.message });
    },
  });

  // Sync local state with server data
  useEffect(() => {
    if (config) {
      setLocalConfig({
        provider: config.provider as LLMProvider,
        apiUrl: config.apiUrl || "",
        apiKey: config.apiKey || "",
        model: config.model || "default",
        temperature: config.temperature || 70,
        maxTokens: config.maxTokens || 4096,
        timeout: config.timeout || 30000,
        streamEnabled: config.streamEnabled ?? true,
        fallbackEnabled: config.fallbackEnabled ?? true,
        fallbackProvider: (config.fallbackProvider || "forge") as LLMProvider,
      });
    }
  }, [config]);

  const updateConfig = <K extends keyof LLMConfigState>(key: K, value: LLMConfigState[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setTestResult(null);
  };

  const handleProviderChange = (provider: LLMProvider) => {
    const providerInfo = providers?.find(p => p.id === provider);
    setLocalConfig(prev => ({
      ...prev,
      provider,
      apiUrl: providerInfo?.defaultUrl || "",
      model: providerInfo?.defaultModel || "default",
      apiKey: provider === prev.provider ? prev.apiKey : "",
    }));
    setHasChanges(true);
    setTestResult(null);
  };

  const handleSave = () => {
    updateMutation.mutate(localConfig);
  };

  const handleTest = () => {
    testMutation.mutate({
      provider: localConfig.provider,
      apiUrl: localConfig.apiUrl || undefined,
      apiKey: localConfig.apiKey || undefined,
      model: localConfig.model || undefined,
    });
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  const currentProvider = providers?.find(p => p.id === localConfig.provider);

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
          <div className="flex items-center gap-3 mb-2">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              Configuration LLM
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-11">
            Configurez le modèle de langage utilisé par Jarvis
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
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="gap-2"
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4" />
            )}
            Tester
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

      {/* Status badges */}
      <div className="flex gap-2 flex-wrap">
        {hasChanges && (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Modifications non sauvegardées
          </Badge>
        )}
        {testResult && (
          <Badge 
            variant="secondary" 
            className={testResult.success 
              ? "bg-green-500/10 text-green-500 border-green-500/20" 
              : "bg-red-500/10 text-red-500 border-red-500/20"
            }
          >
            {testResult.success ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Connexion OK ({testResult.latency}ms)</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Échec: {testResult.error}</>
            )}
          </Badge>
        )}
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Provider LLM
          </CardTitle>
          <CardDescription>
            Sélectionnez le service de modèle de langage à utiliser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {providers?.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id as LLMProvider)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  localConfig.provider === provider.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {PROVIDER_ICONS[provider.id as LLMProvider]}
                  <span className="font-medium">{provider.name}</span>
                  {localConfig.provider === provider.id && (
                    <Check className="h-4 w-4 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{provider.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {PROVIDER_ICONS[localConfig.provider]}
            Configuration {currentProvider?.name}
          </CardTitle>
          <CardDescription>
            Paramètres spécifiques au provider sélectionné
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API URL (if required) */}
          {currentProvider?.requiresUrl && (
            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                URL de l'API
              </Label>
              <Input
                value={localConfig.apiUrl}
                onChange={(e) => updateConfig("apiUrl", e.target.value)}
                placeholder={currentProvider.defaultUrl || "http://localhost:11434"}
              />
              <p className="text-xs text-muted-foreground">
                URL du serveur {currentProvider.name}
              </p>
            </div>
          )}

          {/* API Key (if required) */}
          {currentProvider?.requiresApiKey && (
            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Clé API
              </Label>
              <Input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => updateConfig("apiKey", e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">
                Votre clé API {currentProvider.name} (stockée de manière sécurisée)
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Modèle
            </Label>
            <Select
              value={localConfig.model}
              onValueChange={(value) => updateConfig("model", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un modèle" />
              </SelectTrigger>
              <SelectContent>
                {currentProvider?.models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Temperature */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Température</Label>
              <span className="text-sm text-muted-foreground">
                {(localConfig.temperature / 100).toFixed(2)}
              </span>
            </div>
            <Slider
              value={[localConfig.temperature]}
              onValueChange={([value]) => updateConfig("temperature", value)}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Contrôle la créativité des réponses (0 = déterministe, 1 = créatif)
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Tokens maximum</Label>
              <span className="text-sm text-muted-foreground">
                {localConfig.maxTokens.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[localConfig.maxTokens]}
              onValueChange={([value]) => updateConfig("maxTokens", value)}
              min={256}
              max={16384}
              step={256}
            />
            <p className="text-xs text-muted-foreground">
              Longueur maximale des réponses générées
            </p>
          </div>

          {/* Timeout */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Timeout (secondes)</Label>
              <span className="text-sm text-muted-foreground">
                {(localConfig.timeout / 1000).toFixed(0)}s
              </span>
            </div>
            <Slider
              value={[localConfig.timeout]}
              onValueChange={([value]) => updateConfig("timeout", value)}
              min={5000}
              max={120000}
              step={5000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Options avancées
          </CardTitle>
          <CardDescription>
            Paramètres de streaming et de fallback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Streaming */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Streaming
              </Label>
              <p className="text-sm text-muted-foreground">
                Afficher les réponses au fur et à mesure de leur génération
              </p>
            </div>
            <Switch
              checked={localConfig.streamEnabled}
              onCheckedChange={(checked) => updateConfig("streamEnabled", checked)}
            />
          </div>

          <Separator />

          {/* Fallback */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Fallback automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                Basculer vers un autre provider en cas d'erreur
              </p>
            </div>
            <Switch
              checked={localConfig.fallbackEnabled}
              onCheckedChange={(checked) => updateConfig("fallbackEnabled", checked)}
            />
          </div>

          {localConfig.fallbackEnabled && (
            <div className="ml-6 space-y-2">
              <Label className="text-sm">Provider de fallback</Label>
              <Select
                value={localConfig.fallbackProvider}
                onValueChange={(value) => updateConfig("fallbackProvider", value as LLMProvider)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers?.filter(p => p.id !== localConfig.provider).map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        {PROVIDER_ICONS[provider.id as LLMProvider]}
                        {provider.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-400">
                À propos des providers LLM
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Forge API</strong> est le provider par défaut, intégré à Manus sans configuration.
                <strong> Ollama</strong> permet d'exécuter des modèles localement.
                <strong> OpenAI</strong> et <strong>Anthropic</strong> nécessitent une clé API payante.
                <strong> N2 Supervisor</strong> est réservé à la production sur DGX Spark.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
