import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Archive,
  History,
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  FileText,
  Loader2,
  Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ConversationHistoryProps {
  onSelectConversation?: (id: number) => void;
  onNewConversation?: () => void;
  currentConversationId?: number | null;
}

export function ConversationHistory({
  onSelectConversation,
  onNewConversation,
  currentConversationId,
}: ConversationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { data, isLoading, refetch } = trpc.conversations.list.useQuery({
    archived: showArchived ? true : undefined,
    search: searchQuery || undefined,
  });

  const updateMutation = trpc.conversations.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      toast.success("Conversation mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const deleteMutation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Conversation supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  // Full-text search in messages
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const searchMessagesQuery = trpc.conversations.search.useQuery(
    { query: searchQuery },
    {
      enabled: searchQuery.length >= 3 && isSearchingMessages,
    }
  );

  const handleArchive = (id: number, archived: boolean) => {
    updateMutation.mutate({ id, archived: !archived });
  };

  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette conversation ?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleRename = (id: number, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = () => {
    if (editingId && editTitle.trim()) {
      updateMutation.mutate({ id: editingId, title: editTitle.trim() });
    }
  };

  const handleSelect = (id: number) => {
    onSelectConversation?.(id);
    setIsOpen(false);
  };

  // Export conversation to Markdown
  const handleExportMarkdown = async (id: number, title: string) => {
    try {
      // Fetch conversation with messages
      const response = await fetch(`/api/trpc/conversations.get?input=${encodeURIComponent(JSON.stringify({ id }))}`);
      const data = await response.json();
      
      if (!data.result?.data?.messages) {
        toast.error("Impossible de charger la conversation");
        return;
      }

      const messages = data.result.data.messages;
      const conversation = data.result.data.conversation;
      
      // Generate Markdown content
      let markdown = `# ${conversation.title}\n\n`;
      markdown += `**Date**: ${new Date(conversation.createdAt).toLocaleDateString('fr-FR')}\n`;
      markdown += `**Messages**: ${messages.length}\n\n`;
      markdown += `---\n\n`;
      
      for (const msg of messages) {
        const role = msg.role === 'user' ? '👤 Vous' : '🤖 Jarvis';
        const time = new Date(msg.createdAt).toLocaleTimeString('fr-FR');
        markdown += `### ${role} (${time})\n\n`;
        markdown += `${msg.content}\n\n`;
      }
      
      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Conversation exportée en Markdown");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  // Export conversation to JSON
  const handleExportJSON = async (id: number, title: string) => {
    try {
      const response = await fetch(`/api/trpc/conversations.get?input=${encodeURIComponent(JSON.stringify({ id }))}`);
      const data = await response.json();
      
      if (!data.result?.data) {
        toast.error("Impossible de charger la conversation");
        return;
      }

      const exportData = {
        conversation: data.result.data.conversation,
        messages: data.result.data.messages,
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Conversation exportée en JSON");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Historique
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Historique des conversations
          </DialogTitle>
          <DialogDescription>
            Retrouvez et reprenez vos conversations précédentes avec Jarvis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les titres..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchingMessages(false);
                }}
                className="pl-9"
              />
            </div>
            <Button
              variant={isSearchingMessages ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSearchingMessages(!isSearchingMessages)}
              disabled={searchQuery.length < 3}
              title={searchQuery.length < 3 ? "Entrez au moins 3 caractères" : "Rechercher dans le contenu des messages"}
            >
              <FileText className="h-4 w-4 mr-1" />
              Messages
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archives
            </Button>
          </div>

          {/* Search results in messages */}
          {isSearchingMessages && searchQuery.length >= 3 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Résultats dans les messages
              </h4>
              {searchMessagesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche en cours...
                </div>
              ) : (searchMessagesQuery.data?.results as { conversations: unknown[]; messages: { conversationId: number; content: string; createdAt: Date }[] })?.messages?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun message trouvé</p>
              ) : (
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {(searchMessagesQuery.data?.results as { conversations: unknown[]; messages: { conversationId: number; content: string; createdAt: Date }[] })?.messages?.slice(0, 5).map((result: { conversationId: number; content: string; createdAt: Date }, index: number) => (
                    <div
                      key={index}
                      className="text-sm p-2 rounded bg-background/50 cursor-pointer hover:bg-background transition-colors"
                      onClick={() => handleSelect(result.conversationId)}
                    >
                      <p className="text-muted-foreground truncate">
                        ...{result.content.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Simulation badge */}
          {data?.isSimulation && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              Mode Simulation
            </Badge>
          )}

          {/* Conversations list */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : data?.conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune conversation trouvée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      currentConversationId === conversation.id
                        ? "bg-primary/10 border-primary/30"
                        : "hover:bg-muted/50 border-transparent"
                    )}
                    onClick={() => handleSelect(conversation.id)}
                  >
                    <MessageSquare className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      {editingId === conversation.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveRename}>
                            OK
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{conversation.title}</h4>
                            {conversation.archived && (
                              <Badge variant="outline" className="text-xs">
                                Archivée
                              </Badge>
                            )}
                          </div>
                          {conversation.summary && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {conversation.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{conversation.messageCount} messages</span>
                            {conversation.lastMessageAt && (
                              <span>
                                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                  addSuffix: true,
                                  locale: fr,
                                })}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleRename(conversation.id, conversation.title);
                        }}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Renommer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(conversation.id, conversation.archived);
                        }}>
                          <Archive className="h-4 w-4 mr-2" />
                          {conversation.archived ? "Désarchiver" : "Archiver"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleExportMarkdown(conversation.id, conversation.title);
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Exporter (Markdown)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleExportJSON(conversation.id, conversation.title);
                        }}>
                          <FileText className="h-4 w-4 mr-2" />
                          Exporter (JSON)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conversation.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fermer
          </Button>
          <Button onClick={() => {
            onNewConversation?.();
            setIsOpen(false);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
