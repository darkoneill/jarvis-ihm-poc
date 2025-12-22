import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Bot, Cloud, Cpu, Download, Loader2, Paperclip, RefreshCw, Send, Server, Sparkles, Square, User } from "lucide-react";
import { useChatExport } from "./ExportButton";
import { VoiceButton } from "./VoiceButton";
import { ConversationHistory } from "./ConversationHistory";
import { useSubmitShortcut } from "@/hooks/useKeyboardShortcuts";
import { useChatStream } from "@/hooks/useChatStream";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Bonjour. Je suis Jarvis v5.9. Tous les systèmes sont opérationnels. Comment puis-je vous assister aujourd'hui ?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Streaming hook
  const { streamMessage, isStreaming, abortStream } = useChatStream({
    onStart: () => {
      setIsTyping(true);
    },
    onContent: (content) => {
      // Update the current streaming message
      if (currentStreamId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === currentStreamId
              ? { ...msg, content: msg.content + content }
              : msg
          )
        );
      }
    },
    onDone: (usage) => {
      setIsTyping(false);
      setCurrentStreamId(null);
      if (usage) {
        console.log(`[Chat] Tokens used: ${usage.total_tokens}`);
      }
    },
    onError: (error) => {
      setIsTyping(false);
      setCurrentStreamId(null);
      toast.error("Erreur de streaming", { description: error });
    },
    onInfo: (provider, model) => {
      console.log(`[Chat] Using provider: ${provider}, model: ${model}`);
    },
  });

  // tRPC mutation for sending messages
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setIsTyping(false);
      
      if (data.success) {
        // Simulate streaming effect for the response
        const responseId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          {
            id: responseId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
        ]);

        // Stream the response character by character
        let charIndex = 0;
        const responseText = data.response;
        
        const interval = setInterval(() => {
          if (charIndex < responseText.length) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === responseId
                  ? { ...msg, content: responseText.substring(0, charIndex + 1) }
                  : msg
              )
            );
            charIndex++;
          } else {
            clearInterval(interval);
            
            // Notify if task was created
            if (data.createdTask) {
              toast.success("Tâche créée", {
                description: `"${data.createdTask.title}" ajoutée au Kanban`,
                action: {
                  label: "Voir",
                  onClick: () => window.location.href = "/tasks"
                }
              });
            }
            
            // Notify if job was created
            if (data.createdJob) {
              toast.success("Job planifié", {
                description: `"${data.createdJob.name}" ajouté au calendrier`,
                action: {
                  label: "Voir",
                  onClick: () => window.location.href = "/calendar"
                }
              });
            }
          }
        }, 10); // Fast streaming effect
      } else {
        // Error response
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          },
        ]);
        if (data.error) {
          toast.error("Erreur LLM", { description: data.error });
        }
      }
    },
    onError: (error) => {
      setIsTyping(false);
      toast.error("Erreur de communication", { description: error.message });
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Je suis désolé, une erreur s'est produite lors de la communication avec le serveur. Veuillez réessayer.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const { exportChat, isExporting } = useChatExport();

  // Mutation to create a new conversation
  const createConversationMutation = trpc.conversations.create.useMutation({
    onSuccess: (data) => {
      if (!data.isSimulation) {
        setCurrentConversationId(data.id);
        setSessionId(`conversation-${data.id}`);
      }
    },
  });

  // Mutation to add a message to a conversation
  const addMessageMutation = trpc.conversations.addMessage.useMutation();

  // Mutation to generate a title
  const generateTitleMutation = trpc.conversations.generateTitle.useMutation();

  const clearHistoryMutation = trpc.chat.clearHistory.useMutation({
    onSuccess: () => {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "Conversation réinitialisée. Comment puis-je vous aider ?",
          timestamp: new Date(),
        },
      ]);
      toast.success("Conversation effacée");
    },
  });

  // Query to load a specific conversation
  const getConversationQuery = trpc.conversations.get.useQuery(
    { id: currentConversationId! },
    { enabled: currentConversationId !== null }
  );

  // Effect to handle conversation loading
  useEffect(() => {
    if (getConversationQuery.data?.messages) {
      const data = getConversationQuery.data;
      const loadedMessages: Message[] = data.messages.map((msg: { id?: number; role: string; content: string; createdAt: Date }, index: number) => ({
        id: `loaded-${msg.id || index}`,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(loadedMessages);
      toast.success(`Conversation "${data.conversation.title}" chargée`);
    }
  }, [getConversationQuery.data]);

  // Effect to handle conversation loading error
  useEffect(() => {
    if (getConversationQuery.error) {
      toast.error("Erreur lors du chargement de la conversation");
      setCurrentConversationId(null);
    }
  }, [getConversationQuery.error]);

  // Function to load a conversation
  const handleLoadConversation = (id: number) => {
    setCurrentConversationId(id);
    setSessionId(`conversation-${id}`);
  };

  // Function to start a new conversation
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setSessionId(`session-${Date.now()}`);
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Bonjour. Je suis Jarvis v5.9. Tous les systèmes sont opérationnels. Comment puis-je vous assister aujourd'hui ?",
        timestamp: new Date(),
      },
    ]);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  // Ctrl+Enter shortcut to send message
  useSubmitShortcut(() => {
    if (inputValue.trim() && !isTyping) {
      handleSendMessage();
    }
  }, !isTyping);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputValue;
    setInputValue("");

    // Auto-save: Create a new conversation if this is the first user message
    if (currentConversationId === null && messages.length <= 1) {
      try {
        // Generate title from first message
        const titleResult = await generateTitleMutation.mutateAsync({ content: messageToSend });
        
        // Create the conversation with the generated title
        const newConversation = await createConversationMutation.mutateAsync({
          title: titleResult.title,
          initialMessage: messageToSend,
        });
        
        if (!newConversation.isSimulation) {
          toast.success("Conversation sauvegardée", {
            description: `"${titleResult.title}"`,
          });
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
        // Continue even if save fails
      }
    } else if (currentConversationId !== null) {
      // Add message to existing conversation
      try {
        await addMessageMutation.mutateAsync({
          conversationId: currentConversationId,
          role: "user",
          content: messageToSend,
        });
      } catch (error) {
        console.error("Error adding message:", error);
      }
    }

    // Check if streaming is enabled in LLM config
    const streamEnabled = llmConfig?.streamEnabled !== false && useStreaming;

    if (streamEnabled) {
      // Use streaming SSE
      const responseId = `stream-${Date.now()}`;
      setCurrentStreamId(responseId);
      
      // Add empty assistant message that will be filled by streaming
      setMessages((prev) => [
        ...prev,
        {
          id: responseId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      try {
        await streamMessage(messageToSend);
      } catch (error) {
        // Error already handled in onError callback
      }
    } else {
      // Use traditional tRPC mutation
      setIsTyping(true);
      sendMessageMutation.mutate({
        message: messageToSend,
        sessionId,
      });
    }
  };

  const handleClearHistory = () => {
    clearHistoryMutation.mutate({ sessionId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape key to stop streaming
    if (e.key === "Escape" && isStreaming) {
      e.preventDefault();
      abortStream();
      toast.info("Génération arrêtée");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isConnected = !sendMessageMutation.isError;

  // Get active LLM configuration
  const { data: llmConfig } = trpc.llmConfig.get.useQuery();

  // Provider display info
  const getProviderInfo = (provider: string | undefined) => {
    switch (provider) {
      case 'ollama':
        return { name: 'Ollama', icon: <Cpu className="h-3 w-3" />, color: 'text-green-400' };
      case 'openai':
        return { name: 'OpenAI', icon: <Sparkles className="h-3 w-3" />, color: 'text-emerald-400' };
      case 'anthropic':
        return { name: 'Anthropic', icon: <Bot className="h-3 w-3" />, color: 'text-orange-400' };
      case 'n2':
        return { name: 'N2 Supervisor', icon: <Server className="h-3 w-3" />, color: 'text-purple-400' };
      case 'forge':
      default:
        return { name: 'Forge API', icon: <Cloud className="h-3 w-3" />, color: 'text-blue-400' };
    }
  };

  const providerInfo = getProviderInfo(llmConfig?.provider);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-card/50 border border-border rounded-lg shadow-sm overflow-hidden backdrop-blur-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Jarvis N2 Orchestrator</h2>
            <div className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-green-500" : "bg-orange-500")}></span>
              <span className={cn("flex items-center gap-1 text-xs", providerInfo.color)}>
                {providerInfo.icon}
                {providerInfo.name}
              </span>
              {llmConfig?.model && llmConfig.model !== 'default' && (
                <span className="text-xs text-muted-foreground">
                  · {llmConfig.model}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ConversationHistory
            currentConversationId={currentConversationId}
            onSelectConversation={handleLoadConversation}
            onNewConversation={handleNewConversation}
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => exportChat({
              messages: messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
              })),
              sessionId,
            })}
            disabled={isExporting || messages.length <= 1}
            className="gap-2 text-muted-foreground"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exporter
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearHistory}
            disabled={clearHistoryMutation.isPending}
            className="gap-2 text-muted-foreground"
          >
            {clearHistoryMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Effacer
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "h-8 w-8 rounded-sm flex-shrink-0 flex items-center justify-center border",
                msg.role === "assistant" 
                  ? "bg-primary/10 border-primary/20 text-primary" 
                  : "bg-secondary border-secondary-foreground/10 text-secondary-foreground"
              )}>
                {msg.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>

              {/* Message Content */}
              <div className={cn(
                "flex flex-col gap-1 min-w-0",
                msg.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 py-3 rounded-lg text-sm shadow-sm",
                  msg.role === "assistant" 
                    ? "bg-card border border-border text-card-foreground" 
                    : "bg-primary text-primary-foreground"
                )}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground opacity-50 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 mr-auto max-w-[85%]">
               <div className="h-8 w-8 rounded-sm bg-primary/10 border border-primary/20 text-primary flex-shrink-0 flex items-center justify-center">
                 <Bot className="h-5 w-5" />
               </div>
               <div className="bg-card border border-border px-4 py-3 rounded-lg flex items-center gap-1 h-[46px]">
                 <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                 <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                 <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
               </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border">
        <div className="relative flex items-end gap-2 bg-background border border-input rounded-lg p-2 focus-within:ring-1 focus-within:ring-ring transition-all">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Envoyer un message à Jarvis..."
            className="min-h-[20px] max-h-[200px] border-0 focus-visible:ring-0 resize-none p-1.5 shadow-none bg-transparent flex-1 text-sm"
            rows={1}
            style={{ height: 'auto', minHeight: '24px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />

          <div className="flex gap-1 flex-shrink-0 mb-0.5">
             <VoiceButton
               onTranscript={(text) => {
                 setInputValue(prev => prev ? `${prev} ${text}` : text);
               }}
               disabled={isTyping}
               className="h-8 w-8"
             />
             {isStreaming ? (
               <Button 
                 size="icon" 
                 variant="destructive"
                 className="h-8 w-8" 
                 onClick={() => {
                   abortStream();
                   toast.info("Génération arrêtée");
                 }}
                 title="Arrêter la génération (Echap)"
               >
                 <Square className="h-4 w-4" />
               </Button>
             ) : (
               <Button 
                 size="icon" 
                 className="h-8 w-8" 
                 onClick={handleSendMessage}
                 disabled={!inputValue.trim() || isTyping}
               >
                 <Send className="h-4 w-4" />
               </Button>
             )}
          </div>
        </div>
        <div className="text-[10px] text-center text-muted-foreground mt-2 opacity-50">
          Jarvis peut faire des erreurs. Vérifiez les informations importantes.
        </div>
      </div>
    </div>
  );
}
