import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { BookOpen, Brain, FileText, Loader2, Search, Sparkles, Trash2, Upload, Zap } from "lucide-react";
import { useState, useRef } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface LocalDocument {
  id: number;
  title: string;
  content: string | null;
  source: string | null;
  fileType: string | null;
  createdAt: Date;
  similarity?: number;
}

const MOCK_DOCS: LocalDocument[] = [
  {
    id: 1,
    title: "Architecture Jarvis v5.8",
    content: "Le système Jarvis repose sur une architecture hiérarchique à 3 niveaux :\n\n1. **N2 Orchestrator** : Planification long terme, LLM (DGX Spark).\n2. **N1 Investigator** : Analyse profonde, recherche, audit.\n3. **N0 Reflex** : Boucle rapide (<60ms) pour vision et action (Jetson Thor).\n\nLa communication inter-nœuds se fait via Redis et WebSockets.",
    source: "Technical Specs",
    fileType: "md",
    createdAt: new Date("2025-12-01"),
  },
  {
    id: 2,
    title: "Procédure de Backup",
    content: "Les sauvegardes sont effectuées quotidiennement à 03:00 AM.\n\n- **Base de données** : Dump PostgreSQL vers stockage froid.\n- **Fichiers RAG** : Sync rsync vers NAS externe.\n- **Logs** : Rotation et compression gzip.",
    source: "Ops Manual",
    fileType: "md",
    createdAt: new Date("2025-11-15"),
  },
  {
    id: 3,
    title: "Guide API WebSocket",
    content: "L'API WebSocket expose 3 endpoints principaux :\n\n- `/ws/chat` : Flux de dialogue bidirectionnel.\n- `/ws/logs` : Streaming des logs système.\n- `/ws/hardware` : Métriques temps réel (1Hz).\n\nAuthentification via Header `Authorization: Bearer <token>`.",
    source: "API Docs",
    fileType: "md",
    createdAt: new Date("2025-12-10"),
  },
];

export function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<LocalDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchResults, setSearchResults] = useState<LocalDocument[] | null>(null);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC queries and mutations
  const { data: docsData, isLoading, refetch } = trpc.knowledge.list.useQuery();
  const { data: ragStats } = trpc.knowledge.getStats.useQuery();
  
  const semanticSearchMutation = trpc.knowledge.semanticSearch.useMutation({
    onSuccess: (data) => {
      if (data.results.length > 0) {
        const results = data.results.map(d => ({
          id: d.id,
          title: d.title,
          content: d.content,
          source: d.source,
          fileType: d.fileType,
          createdAt: new Date(d.createdAt),
          similarity: d.similarity,
        }));
        setSearchResults(results);
        setSelectedDoc(results[0]);
        toast.success(`${results.length} résultats trouvés via recherche sémantique`);
      } else {
        toast.info("Aucun résultat sémantique trouvé");
        setSearchResults([]);
      }
      setIsSearching(false);
    },
    onError: (error) => {
      toast.error(`Erreur de recherche: ${error.message}`);
      setIsSearching(false);
    },
  });

  const generateAllEmbeddingsMutation = trpc.knowledge.generateAllEmbeddings.useMutation({
    onSuccess: (data) => {
      toast.success(`Embeddings générés: ${data.success}/${data.total} documents`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const createMutation = trpc.knowledge.create.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`Document ajouté${data.hasEmbedding ? " avec embedding" : ""}`);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedDoc(null);
      toast.success("Document supprimé");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Use fallback data if DB returns empty
  const documents: LocalDocument[] = searchResults 
    ? searchResults
    : (docsData && docsData.length > 0)
      ? docsData.map(d => ({
          id: d.id,
          title: d.title,
          content: d.content,
          source: d.source,
          fileType: d.fileType,
          createdAt: new Date(d.createdAt),
        }))
      : MOCK_DOCS;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const content = await file.text();
      
      createMutation.mutate({
        title: file.name,
        content: content,
        source: "Upload",
        fileType: file.name.split('.').pop() || "txt",
        fileSize: file.size,
      });
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'import du fichier");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);

    if (useSemanticSearch && docsData && docsData.length > 0) {
      // Use semantic search via tRPC
      semanticSearchMutation.mutate({
        query: searchQuery,
        topK: 10,
        minSimilarity: 0.3,
      });
    } else {
      // Fallback to local keyword search
      const sourceData = (docsData && docsData.length > 0)
        ? docsData.map(d => ({
            id: d.id,
            title: d.title,
            content: d.content,
            source: d.source,
            fileType: d.fileType,
            createdAt: new Date(d.createdAt),
          }))
        : MOCK_DOCS;
      
      const results = sourceData.map(doc => {
        let similarity = 0;
        const query = searchQuery.toLowerCase();
        if (doc.title.toLowerCase().includes(query)) similarity += 0.5;
        if (doc.content?.toLowerCase().includes(query)) similarity += 0.3;
        return { ...doc, similarity };
      })
      .filter(doc => doc.similarity && doc.similarity > 0)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

      setSearchResults(results);
      setIsSearching(false);
      
      if (results.length > 0) {
        setSelectedDoc(results[0]);
        toast.success(`${results.length} résultats (recherche par mots-clés)`);
      } else {
        toast.info("Aucun résultat trouvé");
      }
    }
  };

  const handleDelete = (id: number) => {
    if (docsData && docsData.length > 0) {
      deleteMutation.mutate({ id });
    }
  };

  const handleGenerateEmbeddings = () => {
    if (ragStats && ragStats.withoutEmbeddings > 0) {
      generateAllEmbeddingsMutation.mutate();
    } else {
      toast.info("Tous les documents ont déjà des embeddings");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header & Search */}
      <div className="flex items-center justify-between px-2 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Base de Connaissances (RAG)</h2>
          {ragStats && ragStats.total > 0 && (
            <Badge variant="outline" className="text-green-500 border-green-500/30 gap-1">
              <Brain className="h-3 w-3" />
              {ragStats.withEmbeddings}/{ragStats.total} indexés
            </Badge>
          )}
          {(!docsData || docsData.length === 0) && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              Mode Simulation
            </Badge>
          )}
        </div>
        
        <div className="flex-1 max-w-lg flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={useSemanticSearch ? "Recherche sémantique..." : "Recherche par mots-clés..."}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Semantic Search Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={useSemanticSearch}
              onCheckedChange={setUseSemanticSearch}
              id="semantic-toggle"
            />
            <label htmlFor="semantic-toggle" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
              <Sparkles className={cn("h-3 w-3", useSemanticSearch && "text-primary")} />
              Sémantique
            </label>
          </div>

          {/* Generate Embeddings Button */}
          {ragStats && ragStats.withoutEmbeddings > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 text-xs"
              onClick={handleGenerateEmbeddings}
              disabled={generateAllEmbeddingsMutation.isPending}
            >
              {generateAllEmbeddingsMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              Indexer ({ragStats.withoutEmbeddings})
            </Button>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.md,.txt,.docx"
            onChange={handleFileChange}
          />
          <Button variant="outline" className="gap-2" onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "Envoi..." : "Importer"}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
        {/* Document List */}
        <Card className="md:col-span-1 flex flex-col border-border/50 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/50">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {documents.length} documents trouvés
              {searchResults && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="ml-2 h-auto p-0 text-xs"
                  onClick={() => setSearchResults(null)}
                >
                  Effacer
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="flex flex-col p-2 gap-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-colors border border-transparent",
                    selectedDoc?.id === doc.id 
                      ? "bg-primary/10 border-primary/20" 
                      : "hover:bg-muted/50 border-border/30"
                  )}
                >
                  <div className="flex w-full justify-between items-start">
                    <span className="font-medium text-sm line-clamp-1">{doc.title}</span>
                    {doc.similarity !== undefined && doc.similarity > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] h-4 px-1",
                          doc.similarity >= 0.7 ? "bg-green-500/10 text-green-500" :
                          doc.similarity >= 0.5 ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-orange-500/10 text-orange-500"
                        )}
                      >
                        {(doc.similarity * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 w-full">
                    {doc.content}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {doc.fileType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        .{doc.fileType}
                      </span>
                    )}
                    {doc.source && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {doc.source}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Document Viewer */}
        <Card className="md:col-span-2 flex flex-col border-border/50 overflow-hidden">
          {selectedDoc ? (
            <>
              <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/10">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-primary">{selectedDoc.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>{selectedDoc.source || "Unknown"}</span>
                      <span>•</span>
                      <span>{selectedDoc.createdAt.toLocaleDateString()}</span>
                      {selectedDoc.similarity !== undefined && selectedDoc.similarity > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-primary flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Similarité: {(selectedDoc.similarity * 100).toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedDoc.fileType && (
                      <Badge variant="outline" className="text-xs">
                        {selectedDoc.fileType}
                      </Badge>
                    )}
                    {docsData && docsData.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(selectedDoc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <Streamdown>{selectedDoc.content || "Aucun contenu disponible"}</Streamdown>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium">Aucun document sélectionné</h3>
              <p className="text-sm max-w-xs mt-2 opacity-70">
                Sélectionnez un document dans la liste ou effectuez une recherche pour visualiser son contenu.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
