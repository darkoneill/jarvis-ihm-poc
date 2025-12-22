import { ENV } from "./env";
import { Message } from "./llm";
import { ActiveLLMConfig, LLMProvider } from "./llmRouter";

// Default models per provider
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  forge: "gemini-2.5-flash",
  ollama: "llama3.2:3b",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  n2: "llama3.1:8b",
};

// Default API URLs per provider
const DEFAULT_URLS: Record<LLMProvider, string> = {
  forge: "https://forge.manus.im",
  ollama: "http://localhost:11434",
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
  n2: "http://localhost:8000",
};

export interface StreamChunk {
  type: "content" | "done" | "error";
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type StreamCallback = (chunk: StreamChunk) => void;

/**
 * Stream LLM response using SSE
 */
export async function streamLLMResponse(
  config: ActiveLLMConfig,
  messages: Message[],
  onChunk: StreamCallback
): Promise<void> {
  const provider = config.provider || "forge";
  const model = config.model || DEFAULT_MODELS[provider];
  const temperature = config.temperature ?? 0.7;
  const maxTokens = config.maxTokens ?? 4096;
  const timeout = config.timeout ?? 30000;

  console.log(`[LLM Streaming] Using provider: ${provider}, model: ${model}`);

  try {
    switch (provider) {
      case "forge":
        await streamForgeAPI(messages, model, temperature, maxTokens, timeout, onChunk);
        break;
      
      case "ollama":
        await streamOllamaAPI(
          config.apiUrl || DEFAULT_URLS.ollama,
          messages,
          model,
          temperature,
          maxTokens,
          timeout,
          onChunk
        );
        break;
      
      case "openai":
        await streamOpenAIAPI(
          config.apiKey || "",
          messages,
          model,
          temperature,
          maxTokens,
          timeout,
          onChunk
        );
        break;
      
      case "anthropic":
        await streamAnthropicAPI(
          config.apiKey || "",
          messages,
          model,
          temperature,
          maxTokens,
          timeout,
          onChunk
        );
        break;
      
      case "n2":
        await streamN2API(
          config.apiUrl || DEFAULT_URLS.n2,
          messages,
          model,
          temperature,
          maxTokens,
          timeout,
          onChunk
        );
        break;
      
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  } catch (error) {
    // Fallback to another provider if enabled
    if (config.fallbackEnabled && config.fallbackProvider && config.fallbackProvider !== provider) {
      console.log(`[LLM Streaming] Primary provider ${provider} failed, falling back to ${config.fallbackProvider}`);
      await streamLLMResponse(
        { ...config, provider: config.fallbackProvider, fallbackEnabled: false },
        messages,
        onChunk
      );
      return;
    }
    
    onChunk({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Stream from Forge API
 */
async function streamForgeAPI(
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  onChunk: StreamCallback
): Promise<void> {
  const apiUrl = ENV.forgeApiUrl || "https://forge.manus.im";
  const apiKey = ENV.forgeApiKey;

  if (!apiKey) {
    throw new Error("Forge API key not configured");
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model === "default" ? "gemini-2.5-flash" : model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Forge API error: ${response.status} - ${errorText}`);
  }

  await processSSEStream(response, onChunk);
}

/**
 * Stream from Ollama API
 */
async function streamOllamaAPI(
  apiUrl: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  onChunk: StreamCallback
): Promise<void> {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      options: {
        temperature,
        num_predict: maxTokens,
      },
      stream: true,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  // Ollama uses NDJSON streaming
  await processNDJSONStream(response, onChunk);
}

/**
 * Stream from OpenAI API
 */
async function streamOpenAIAPI(
  apiKey: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  onChunk: StreamCallback
): Promise<void> {
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  await processSSEStream(response, onChunk);
}

/**
 * Stream from Anthropic API
 */
async function streamAnthropicAPI(
  apiKey: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  onChunk: StreamCallback
): Promise<void> {
  if (!apiKey) {
    throw new Error("Anthropic API key not configured");
  }

  // Extract system message
  const systemMessage = messages.find(m => m.role === "system");
  const chatMessages = messages.filter(m => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemMessage ? (typeof systemMessage.content === "string" ? systemMessage.content : JSON.stringify(systemMessage.content)) : undefined,
      messages: chatMessages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  await processAnthropicStream(response, onChunk);
}

/**
 * Stream from N2 API (OpenAI-compatible)
 */
async function streamN2API(
  apiUrl: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  onChunk: StreamCallback
): Promise<void> {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`N2 API error: ${response.status} - ${errorText}`);
  }

  await processSSEStream(response, onChunk);
}

/**
 * Process SSE stream (OpenAI format)
 */
async function processSSEStream(
  response: Response,
  onChunk: StreamCallback
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") {
          if (trimmed === "data: [DONE]") {
            onChunk({
              type: "done",
              usage: {
                prompt_tokens: totalPromptTokens,
                completion_tokens: totalCompletionTokens,
                total_tokens: totalPromptTokens + totalCompletionTokens,
              },
            });
          }
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            
            if (content) {
              onChunk({ type: "content", content });
            }

            // Track usage if provided
            if (data.usage) {
              totalPromptTokens = data.usage.prompt_tokens || 0;
              totalCompletionTokens = data.usage.completion_tokens || 0;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Process NDJSON stream (Ollama format)
 */
async function processNDJSONStream(
  response: Response,
  onChunk: StreamCallback
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const data = JSON.parse(trimmed);
          
          if (data.message?.content) {
            onChunk({ type: "content", content: data.message.content });
          }

          if (data.done) {
            totalPromptTokens = data.prompt_eval_count || 0;
            totalCompletionTokens = data.eval_count || 0;
            
            onChunk({
              type: "done",
              usage: {
                prompt_tokens: totalPromptTokens,
                completion_tokens: totalCompletionTokens,
                total_tokens: totalPromptTokens + totalCompletionTokens,
              },
            });
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Process Anthropic stream format
 */
async function processAnthropicStream(
  response: Response,
  onChunk: StreamCallback
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            
            if (data.type === "content_block_delta" && data.delta?.text) {
              onChunk({ type: "content", content: data.delta.text });
            }

            if (data.type === "message_delta" && data.usage) {
              totalCompletionTokens = data.usage.output_tokens || 0;
            }

            if (data.type === "message_start" && data.message?.usage) {
              totalPromptTokens = data.message.usage.input_tokens || 0;
            }

            if (data.type === "message_stop") {
              onChunk({
                type: "done",
                usage: {
                  prompt_tokens: totalPromptTokens,
                  completion_tokens: totalCompletionTokens,
                  total_tokens: totalPromptTokens + totalCompletionTokens,
                },
              });
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
