import { ENV } from "./env";
import { Message, InvokeResult } from "./llm";

// LLM Provider types
export type LLMProvider = "forge" | "ollama" | "openai" | "anthropic" | "n2";

// Active LLM configuration
export interface ActiveLLMConfig {
  provider: LLMProvider;
  apiUrl?: string | null;
  apiKey?: string | null;
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  streamEnabled?: boolean;
  fallbackEnabled?: boolean;
  fallbackProvider?: LLMProvider;
}

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

/**
 * Route LLM request to the appropriate provider based on config
 */
export async function routeLLMRequest(
  config: ActiveLLMConfig,
  messages: Message[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<InvokeResult> {
  const provider = config.provider || "forge";
  const model = config.model || DEFAULT_MODELS[provider];
  const temperature = options?.temperature ?? config.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? config.maxTokens ?? 4096;
  const timeout = config.timeout ?? 30000;

  console.log(`[LLM Router] Using provider: ${provider}, model: ${model}`);

  try {
    switch (provider) {
      case "forge":
        return await callForgeAPI(messages, model, temperature, maxTokens, timeout);
      
      case "ollama":
        return await callOllamaAPI(
          config.apiUrl || DEFAULT_URLS.ollama,
          messages,
          model,
          temperature,
          maxTokens,
          timeout
        );
      
      case "openai":
        return await callOpenAIAPI(
          config.apiKey || "",
          messages,
          model,
          temperature,
          maxTokens,
          timeout
        );
      
      case "anthropic":
        return await callAnthropicAPI(
          config.apiKey || "",
          messages,
          model,
          temperature,
          maxTokens,
          timeout
        );
      
      case "n2":
        return await callN2API(
          config.apiUrl || DEFAULT_URLS.n2,
          messages,
          model,
          temperature,
          maxTokens,
          timeout
        );
      
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  } catch (error) {
    // Fallback to another provider if enabled
    if (config.fallbackEnabled && config.fallbackProvider && config.fallbackProvider !== provider) {
      console.log(`[LLM Router] Primary provider ${provider} failed, falling back to ${config.fallbackProvider}`);
      return await routeLLMRequest(
        { ...config, provider: config.fallbackProvider, fallbackEnabled: false },
        messages,
        options
      );
    }
    throw error;
  }
}

/**
 * Call Forge API (Manus built-in)
 */
async function callForgeAPI(
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<InvokeResult> {
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
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Forge API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Call Ollama API (local)
 */
async function callOllamaAPI(
  apiUrl: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<InvokeResult> {
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
      stream: false,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Convert Ollama response to OpenAI format
  return {
    id: `ollama-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: data.message?.content || "",
      },
      finish_reason: "stop",
    }],
    usage: {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(
  apiKey: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<InvokeResult> {
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
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Call Anthropic API
 */
async function callAnthropicAPI(
  apiKey: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<InvokeResult> {
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
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Convert Anthropic response to OpenAI format
  return {
    id: data.id || `anthropic-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: data.content?.[0]?.text || "",
      },
      finish_reason: data.stop_reason || "stop",
    }],
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };
}

/**
 * Call N2 Supervisor API (local DGX Spark)
 */
async function callN2API(
  apiUrl: string,
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  timeout: number
): Promise<InvokeResult> {
  // N2 uses OpenAI-compatible API
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
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`N2 API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}
