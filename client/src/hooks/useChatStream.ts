import { useState, useCallback, useRef } from "react";

interface StreamChunk {
  type: "content" | "done" | "error" | "info";
  content?: string;
  error?: string;
  provider?: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface UseChatStreamOptions {
  onStart?: () => void;
  onContent?: (content: string) => void;
  onDone?: (usage?: StreamChunk["usage"]) => void;
  onError?: (error: string) => void;
  onInfo?: (provider: string, model?: string) => void;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamMessage = useCallback(async (
    message: string,
    conversationId?: number
  ) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsStreaming(true);
    setStreamedContent("");
    setError(null);
    options.onStart?.();

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
        credentials: "include", // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data: StreamChunk = JSON.parse(trimmed.slice(6));

            switch (data.type) {
              case "info":
                options.onInfo?.(data.provider || "forge", data.model);
                break;

              case "content":
                if (data.content) {
                  fullContent += data.content;
                  setStreamedContent(fullContent);
                  options.onContent?.(data.content);
                }
                break;

              case "done":
                options.onDone?.(data.usage);
                break;

              case "error":
                setError(data.error || "Unknown error");
                options.onError?.(data.error || "Unknown error");
                break;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      return fullContent;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Stream was aborted, not an error
        return streamedContent;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [options, streamedContent]);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortStream();
    setStreamedContent("");
    setError(null);
  }, [abortStream]);

  return {
    streamMessage,
    abortStream,
    reset,
    isStreaming,
    streamedContent,
    error,
  };
}
