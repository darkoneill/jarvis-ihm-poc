import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initWebSocket } from "../websocket";
import { streamLLMResponse, StreamChunk } from "./llmStreaming";
import { ActiveLLMConfig } from "./llmRouter";
import { Message } from "./llm";
import { getDb } from "../db";
import { llmConfigs, conversations, messages as messagesTable } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize WebSocket server
  initWebSocket(server);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // SSE endpoint for streaming LLM responses
  app.post("/api/chat/stream", async (req, res) => {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      const { message, sessionId, conversationId } = req.body;
      
      if (!message || typeof message !== "string") {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Message is required" })}\n\n`);
        res.end();
        return;
      }

      // Get user from cookie session
      let userId: number | null = null;
      try {
        const user = await sdk.authenticateRequest(req);
        userId = user?.id || null;
      } catch {
        // Continue without user - will use default config
      }

      // Get LLM config from database
      let llmConfig: ActiveLLMConfig = {
        provider: "forge",
        fallbackEnabled: true,
        fallbackProvider: "forge",
      };

      const db = await getDb();
      if (db && userId) {
        const userConfig = await db.select()
          .from(llmConfigs)
          .where(eq(llmConfigs.userId, userId))
          .limit(1);
        
        if (userConfig[0]) {
          llmConfig = {
            provider: userConfig[0].provider as ActiveLLMConfig["provider"],
            apiUrl: userConfig[0].apiUrl,
            apiKey: userConfig[0].apiKey,
            model: userConfig[0].model,
            temperature: (userConfig[0].temperature || 70) / 100,
            maxTokens: userConfig[0].maxTokens || 4096,
            timeout: userConfig[0].timeout || 30000,
            streamEnabled: userConfig[0].streamEnabled ?? true,
            fallbackEnabled: userConfig[0].fallbackEnabled ?? true,
            fallbackProvider: (userConfig[0].fallbackProvider || "forge") as ActiveLLMConfig["provider"],
          };
        }
      }

      // Build messages array with system prompt
      const systemPrompt = `Tu es Jarvis v5.9, un assistant IA avancé qui pilote un PC physique via acquisition HDMI, caméra C2I et contrôle Teensy (clavier/souris).

Tes capacités :
- Voir l'écran du PC cible en temps réel
- Exécuter des actions clavier/souris précises
- Gérer des tâches et workflows automatisés
- Accéder à une base de connaissances RAG

Règles :
1. Réponds toujours en français
2. Sois concis mais précis
3. Pour les actions hardware, décris ce que tu vas faire avant d'agir
4. Signale tout problème de sécurité détecté`;

      const messages: Message[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ];

      // Send provider info
      res.write(`data: ${JSON.stringify({ type: "info", provider: llmConfig.provider, model: llmConfig.model })}\n\n`);

      // Collect full response for saving
      let fullResponse = "";

      // Stream the response
      await streamLLMResponse(llmConfig, messages, (chunk: StreamChunk) => {
        if (chunk.type === "content" && chunk.content) {
          fullResponse += chunk.content;
        }
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      });

      // Save to conversation if conversationId provided
      if (db && userId && conversationId && fullResponse) {
        try {
          // Save user message
          await db.insert(messagesTable).values({
            conversationId,
            role: "user",
            content: message,
          });

          // Save assistant response
          await db.insert(messagesTable).values({
            conversationId,
            role: "assistant",
            content: fullResponse,
          });

          // Update conversation
          await db.update(conversations)
            .set({
              messageCount: sql`${conversations.messageCount} + 2`,
              lastMessageAt: new Date(),
            })
            .where(eq(conversations.id, conversationId));
        } catch (saveError) {
          console.error("[Chat Stream] Error saving to conversation:", saveError);
        }
      }

      res.end();
    } catch (error) {
      console.error("[Chat Stream] Error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n\n`);
      res.end();
    }
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
