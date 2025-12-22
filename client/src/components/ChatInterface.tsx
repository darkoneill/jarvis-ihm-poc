import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Bot, Download, Loader2, Mic, Paperclip, RefreshCw, Send, User } from "lucide-react";
import { useChatExport } from "./ExportButton";
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
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsTyping(true);

    // Send to LLM via tRPC
    sendMessageMutation.mutate({
      message: inputValue,
      sessionId,
    });
  };

  const handleClearHistory = () => {
    clearHistoryMutation.mutate({ sessionId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isConnected = !sendMessageMutation.isError;

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
              <span className="text-xs text-muted-foreground">
                {isConnected ? "LLM API Connected" : "Connection Error"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
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
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
               <Mic className="h-4 w-4" />
             </Button>
             <Button 
               size="icon" 
               className="h-8 w-8" 
               onClick={handleSendMessage}
               disabled={!inputValue.trim() || isTyping}
             >
               <Send className="h-4 w-4" />
             </Button>
          </div>
        </div>
        <div className="text-[10px] text-center text-muted-foreground mt-2 opacity-50">
          Jarvis peut faire des erreurs. Vérifiez les informations importantes.
        </div>
      </div>
    </div>
  );
}
