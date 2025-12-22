import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { llmConfigs } from "../../drizzle/schema";
import { ENV } from "../_core/env";

// LLM Provider types
const LLM_PROVIDERS = ["forge", "ollama", "openai", "anthropic", "n2"] as const;
type LLMProvider = typeof LLM_PROVIDERS[number];

// Default models per provider
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  forge: "default",
  ollama: "llama3.2:3b",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  n2: "llama3.1:8b",
};

// Default API URLs per provider
const DEFAULT_URLS: Record<LLMProvider, string> = {
  forge: "",
  ollama: "http://localhost:11434",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  n2: "http://localhost:8000",
};

// Schema for LLM config input
const llmConfigSchema = z.object({
  provider: z.enum(LLM_PROVIDERS).optional(),
  apiUrl: z.string().max(512).optional(),
  apiKey: z.string().max(512).optional(),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(100).optional(),
  maxTokens: z.number().min(100).max(32000).optional(),
  timeout: z.number().min(5000).max(120000).optional(),
  streamEnabled: z.boolean().optional(),
  fallbackEnabled: z.boolean().optional(),
  fallbackProvider: z.enum(LLM_PROVIDERS).optional(),
});

// Helper to get default config
function getDefaultConfig(userId: number) {
  return {
    userId,
    provider: "forge" as const,
    apiUrl: "",
    apiKey: "",
    model: "default",
    temperature: 70,
    maxTokens: 4096,
    timeout: 30000,
    streamEnabled: true,
    fallbackEnabled: true,
    fallbackProvider: "forge" as const,
  };
}

// Helper to test LLM connection
async function testLLMConnection(config: {
  provider: LLMProvider;
  apiUrl?: string | null;
  apiKey?: string | null;
  model?: string | null;
}): Promise<{ success: boolean; latency: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    switch (config.provider) {
      case "forge": {
        // Forge API is always available via built-in keys
        const response = await fetch(`${ENV.forgeApiUrl || 'https://api.forge.ai'}/v1/models`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${ENV.forgeApiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Forge API error: ${response.status}`);
        return { success: true, latency: Date.now() - startTime };
      }
      
      case "ollama": {
        const url = config.apiUrl || DEFAULT_URLS.ollama;
        const response = await fetch(`${url}/api/tags`, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
        return { success: true, latency: Date.now() - startTime };
      }
      
      case "openai": {
        if (!config.apiKey) throw new Error("OpenAI API key required");
        const response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
        return { success: true, latency: Date.now() - startTime };
      }
      
      case "anthropic": {
        // Anthropic doesn't have a models endpoint, so we do a minimal completion
        if (!config.apiKey) throw new Error("Anthropic API key required");
        // Just verify the key format
        if (!config.apiKey.startsWith("sk-ant-")) {
          throw new Error("Invalid Anthropic API key format");
        }
        return { success: true, latency: Date.now() - startTime };
      }
      
      case "n2": {
        const url = config.apiUrl || DEFAULT_URLS.n2;
        const response = await fetch(`${url}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`N2 Supervisor error: ${response.status}`);
        return { success: true, latency: Date.now() - startTime };
      }
      
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const llmConfigRouter = router({
  // Get available providers with their info
  getProviders: publicProcedure.query(() => {
    return [
      {
        id: "forge",
        name: "Forge API",
        description: "API cloud intégrée à Manus (défaut)",
        requiresApiKey: false,
        requiresUrl: false,
        defaultModel: DEFAULT_MODELS.forge,
        models: ["default"],
      },
      {
        id: "ollama",
        name: "Ollama",
        description: "LLM local via Ollama",
        requiresApiKey: false,
        requiresUrl: true,
        defaultModel: DEFAULT_MODELS.ollama,
        defaultUrl: DEFAULT_URLS.ollama,
        models: ["llama3.2:1b", "llama3.2:3b", "llama3.1:8b", "llama3.1:70b", "mistral:7b", "codellama:34b"],
      },
      {
        id: "openai",
        name: "OpenAI",
        description: "API OpenAI (GPT-4, GPT-3.5)",
        requiresApiKey: true,
        requiresUrl: false,
        defaultModel: DEFAULT_MODELS.openai,
        models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
      },
      {
        id: "anthropic",
        name: "Anthropic",
        description: "API Anthropic (Claude)",
        requiresApiKey: true,
        requiresUrl: false,
        defaultModel: DEFAULT_MODELS.anthropic,
        models: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229"],
      },
      {
        id: "n2",
        name: "N2 Supervisor",
        description: "LLM local via N2 Supervisor (production)",
        requiresApiKey: false,
        requiresUrl: true,
        defaultModel: DEFAULT_MODELS.n2,
        defaultUrl: DEFAULT_URLS.n2,
        models: ["llama3.1:8b", "llama3.1:70b", "llama3.1:405b"],
      },
    ];
  }),

  // Get current user's LLM config
  get: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user) {
      return getDefaultConfig(0);
    }

    const config = await db.select()
      .from(llmConfigs)
      .where(eq(llmConfigs.userId, ctx.user.id))
      .limit(1);

    if (!config[0]) {
      // Create default config for user
      const defaultConfig = getDefaultConfig(ctx.user.id);
      await db.insert(llmConfigs).values(defaultConfig);
      return defaultConfig;
    }

    // Mask API key for security
    return {
      ...config[0],
      apiKey: config[0].apiKey ? "••••••••" : "",
    };
  }),

  // Update LLM config
  update: publicProcedure
    .input(llmConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.user) {
        throw new Error("Authentication required");
      }

      // Check if config exists
      const existing = await db.select()
        .from(llmConfigs)
        .where(eq(llmConfigs.userId, ctx.user.id))
        .limit(1);

      // If apiKey is masked, don't update it
      const updateData = { ...input };
      if (input.apiKey === "••••••••") {
        delete updateData.apiKey;
      }

      if (!existing[0]) {
        // Create new config
        await db.insert(llmConfigs).values({
          userId: ctx.user.id,
          ...updateData,
        });
      } else {
        // Update existing config
        await db.update(llmConfigs)
          .set(updateData)
          .where(eq(llmConfigs.userId, ctx.user.id));
      }

      // Return updated config
      const updated = await db.select()
        .from(llmConfigs)
        .where(eq(llmConfigs.userId, ctx.user.id))
        .limit(1);

      return {
        ...updated[0],
        apiKey: updated[0]?.apiKey ? "••••••••" : "",
      };
    }),

  // Test LLM connection
  test: publicProcedure
    .input(z.object({
      provider: z.enum(LLM_PROVIDERS),
      apiUrl: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // If apiKey is masked, get the real one from DB
      let apiKey = input.apiKey;
      if (apiKey === "••••••••" && ctx.user && db) {
        const config = await db.select()
          .from(llmConfigs)
          .where(eq(llmConfigs.userId, ctx.user.id))
          .limit(1);
        apiKey = config[0]?.apiKey || undefined;
      }

      const result = await testLLMConnection({
        provider: input.provider,
        apiUrl: input.apiUrl,
        apiKey,
        model: input.model,
      });

      // Update last test status in DB
      if (ctx.user && db) {
        await db.update(llmConfigs)
          .set({
            lastTestedAt: new Date(),
            lastTestStatus: result.success ? "success" : "error",
            lastTestLatency: result.latency,
          })
          .where(eq(llmConfigs.userId, ctx.user.id));
      }

      return result;
    }),

  // Reset config to defaults
  reset: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user) {
      throw new Error("Authentication required");
    }

    const defaultConfig = getDefaultConfig(ctx.user.id);

    await db.update(llmConfigs)
      .set({
        provider: defaultConfig.provider,
        apiUrl: "",
        apiKey: "",
        model: "default",
        temperature: 70,
        maxTokens: 4096,
        timeout: 30000,
        streamEnabled: true,
        fallbackEnabled: true,
        fallbackProvider: "forge",
        lastTestedAt: null,
        lastTestStatus: null,
        lastTestLatency: null,
      })
      .where(eq(llmConfigs.userId, ctx.user.id));

    return defaultConfig;
  }),

  // Get active LLM config for chat (internal use)
  getActive: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user) {
      // Return environment-based config
      return {
        provider: (ENV.llmProvider || "forge") as LLMProvider,
        apiUrl: ENV.ollamaUrl || ENV.n2ApiUrl || "",
        model: ENV.ollamaModel || ENV.openaiModel || "default",
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 30000,
        streamEnabled: true,
        fallbackEnabled: true,
        fallbackProvider: "forge" as const,
      };
    }

    const config = await db.select()
      .from(llmConfigs)
      .where(eq(llmConfigs.userId, ctx.user.id))
      .limit(1);

    if (!config[0]) {
      return {
        provider: "forge" as const,
        apiUrl: "",
        model: "default",
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 30000,
        streamEnabled: true,
        fallbackEnabled: true,
        fallbackProvider: "forge" as const,
      };
    }

    return {
      provider: config[0].provider,
      apiUrl: config[0].apiUrl,
      apiKey: config[0].apiKey, // Include real key for internal use
      model: config[0].model,
      temperature: (config[0].temperature || 70) / 100,
      maxTokens: config[0].maxTokens,
      timeout: config[0].timeout,
      streamEnabled: config[0].streamEnabled,
      fallbackEnabled: config[0].fallbackEnabled,
      fallbackProvider: config[0].fallbackProvider,
    };
  }),
});
