import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, Message } from "../_core/llm";

// System prompt for Jarvis AI assistant
const JARVIS_SYSTEM_PROMPT = `Tu es Jarvis v5.9, un assistant IA avancé conçu pour gérer un système dual-node composé d'un DGX Spark (Orchestrator N2) et d'un Jetson Thor (Reflex N0).

Ton rôle est d'aider l'utilisateur à :
- Surveiller et gérer les systèmes hardware (CPU, GPU, RAM, températures)
- Planifier et exécuter des tâches automatisées
- Gérer la base de connaissances RAG
- Créer et exécuter des workflows
- Analyser les logs système
- Répondre aux questions techniques sur l'architecture Jarvis

Tu communiques en français de manière professionnelle mais accessible. Tu es précis, concis et toujours prêt à aider.

Architecture du système :
- N2 Orchestrator (DGX Spark) : Planification long terme, LLM, analyse profonde
- N1 Investigator : Recherche, audit, analyse approfondie
- N0 Reflex (Jetson Thor) : Boucle rapide (<60ms), vision, action temps réel

Réponds toujours de manière utile et informative.`;

// In-memory conversation history (per session - in production, use Redis or DB)
const conversationHistory: Map<string, Message[]> = new Map();

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(z.object({
      message: z.string().min(1),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const sessionId = input.sessionId || "default";
      
      // Get or initialize conversation history
      let history = conversationHistory.get(sessionId) || [];
      
      // Add system prompt if this is a new conversation
      if (history.length === 0) {
        history.push({
          role: "system",
          content: JARVIS_SYSTEM_PROMPT,
        });
      }
      
      // Add user message
      history.push({
        role: "user",
        content: input.message,
      });
      
      try {
        // Call LLM
        const response = await invokeLLM({
          messages: history,
        });
        
        const assistantMessage = response.choices[0]?.message?.content;
        
        if (typeof assistantMessage === "string") {
          // Add assistant response to history
          history.push({
            role: "assistant",
            content: assistantMessage,
          });
          
          // Keep history manageable (last 20 messages + system prompt)
          if (history.length > 21) {
            history = [history[0], ...history.slice(-20)];
          }
          
          // Save updated history
          conversationHistory.set(sessionId, history);
          
          return {
            success: true,
            response: assistantMessage,
            sessionId,
          };
        }
        
        throw new Error("Invalid LLM response format");
        
      } catch (error) {
        console.error("LLM Error:", error);
        
        // Fallback response
        return {
          success: false,
          response: "Je suis désolé, je rencontre des difficultés techniques. Veuillez réessayer dans quelques instants.",
          sessionId,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  clearHistory: publicProcedure
    .input(z.object({
      sessionId: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const sessionId = input.sessionId || "default";
      conversationHistory.delete(sessionId);
      return { success: true };
    }),

  getHistory: publicProcedure
    .input(z.object({
      sessionId: z.string().optional(),
    }))
    .query(({ input }) => {
      const sessionId = input.sessionId || "default";
      const history = conversationHistory.get(sessionId) || [];
      
      // Return only user and assistant messages (not system prompt)
      return history
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        }));
    }),
});
