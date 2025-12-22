import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, Message } from "../_core/llm";
import { getDb } from "../db";
import { tasks, scheduledJobs, InsertTask, InsertScheduledJob } from "../../drizzle/schema";
import { chatWithN2, getN2ClientStatus } from "../_core/n2Client";

// System prompt for Jarvis AI assistant
const JARVIS_SYSTEM_PROMPT = `Tu es Jarvis v5.9, un assistant IA avancé qui pilote un PC physique via acquisition HDMI, caméra C2I et contrôle Teensy (clavier/souris).

Tu n'es PAS un chatbot. Tu es un assistant qui utilise les applications existantes sur la machine comme un humain le ferait.

Ton rôle est d'aider l'utilisateur à :
- Surveiller et gérer les systèmes hardware (DGX Spark, Jetson Thor)
- Créer et gérer des tâches (tu peux créer des tâches quand on te le demande)
- Planifier des jobs dans le calendrier
- Gérer la base de connaissances RAG
- Analyser les logs système

IMPORTANT - Détection d'intentions :
Quand l'utilisateur dit quelque chose comme :
- "rappelle-moi de...", "n'oublie pas de...", "ajoute une tâche..."
- "planifie...", "programme...", "ajoute au calendrier..."
Tu dois TOUJOURS répondre avec un JSON structuré en plus de ta réponse naturelle.

Format de réponse pour création de tâche :
[TASK_CREATE]{"title": "...", "description": "...", "priority": "low|medium|high", "dueDate": "YYYY-MM-DD"}[/TASK_CREATE]

Format de réponse pour création de job calendrier :
[JOB_CREATE]{"name": "...", "description": "...", "scheduledAt": "YYYY-MM-DDTHH:mm:ss", "type": "once|recurring", "cronExpression": "..."}[/JOB_CREATE]

Tu communiques en français de manière professionnelle mais accessible.

Architecture du système :
- N2 Orchestrator (DGX Spark) : Planification long terme, LLM, analyse profonde
- N1 Investigator : Recherche, audit, analyse approfondie
- N0 Reflex (Jetson Thor) : Boucle rapide (<60ms), vision, action temps réel`;

// In-memory conversation history (per session - in production, use Redis or DB)
const conversationHistory: Map<string, Message[]> = new Map();

// Parse task creation from LLM response
function parseTaskCreate(response: string): { title: string; description: string; priority: string; dueDate?: string } | null {
  const match = response.match(/\[TASK_CREATE\]([\s\S]*?)\[\/TASK_CREATE\]/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

// Parse job creation from LLM response
function parseJobCreate(response: string): { name: string; description: string; scheduledAt?: string; type: string; cronExpression?: string } | null {
  const match = response.match(/\[JOB_CREATE\]([\s\S]*?)\[\/JOB_CREATE\]/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

// Clean response from JSON tags
function cleanResponse(response: string): string {
  return response
    .replace(/\[TASK_CREATE\][\s\S]*?\[\/TASK_CREATE\]/g, '')
    .replace(/\[JOB_CREATE\][\s\S]*?\[\/JOB_CREATE\]/g, '')
    .trim();
}

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
        let assistantMessage: string | undefined;
        
        // Try N2 first (100% local), fallback to Forge
        const n2Status = getN2ClientStatus();
        if (n2Status.enabled && n2Status.available) {
          console.log('[Chat] Using N2 Supervisor (local)');
          const n2Response = await chatWithN2(input.message, {
            history: history.filter(m => m.role !== 'system').map(m => ({
              role: m.role as 'user' | 'assistant',
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            })),
          });
          
          if (n2Response?.success) {
            assistantMessage = n2Response.message;
          }
        }
        
        // Fallback to Forge API if N2 not available or failed
        if (!assistantMessage) {
          console.log('[Chat] Using Forge API (fallback)');
          const response = await invokeLLM({
            messages: history,
          });
          const content = response.choices[0]?.message?.content;
          assistantMessage = typeof content === 'string' ? content : undefined;
        }
        
        if (typeof assistantMessage === "string") {
          // Parse potential task/job creation
          const taskData = parseTaskCreate(assistantMessage);
          const jobData = parseJobCreate(assistantMessage);
          
          let createdTask = null;
          let createdJob = null;
          
          // Create task if detected
          if (taskData) {
            try {
              const db = await getDb();
              if (db) {
                const newTask: InsertTask = {
                  title: taskData.title,
                  description: taskData.description || '',
                  status: "todo",
                  priority: (taskData.priority as "low" | "medium" | "high" | "critical") || "medium",
                  dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
                };
                const result = await db.insert(tasks).values(newTask);
                createdTask = {
                  id: Number(result[0].insertId),
                  title: taskData.title,
                  description: taskData.description,
                  priority: taskData.priority,
                  dueDate: taskData.dueDate
                };
              }
            } catch (err) {
              console.error("Error creating task from chat:", err);
            }
          }
          
          // Create job if detected
          if (jobData) {
            try {
              const db = await getDb();
              if (db) {
                // Convert scheduledAt to cron expression if it's a one-time job
                let cronExpr = jobData.cronExpression || '';
                if (!cronExpr && jobData.scheduledAt) {
                  const date = new Date(jobData.scheduledAt);
                  cronExpr = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
                }
                const newJob: InsertScheduledJob = {
                  name: jobData.name,
                  description: jobData.description || null,
                  cronExpression: cronExpr || '0 0 * * *',
                  nextRun: jobData.scheduledAt ? new Date(jobData.scheduledAt) : null,
                  enabled: true,
                };
                const result = await db.insert(scheduledJobs).values(newJob);
                createdJob = {
                  id: Number(result[0].insertId),
                  name: jobData.name,
                  description: jobData.description,
                  type: jobData.type,
                  scheduledAt: jobData.scheduledAt
                };
              }
            } catch (err) {
              console.error("Error creating job from chat:", err);
            }
          }
          
          // Clean response for display
          const cleanedResponse = cleanResponse(assistantMessage);
          
          // Add assistant response to history
          history.push({
            role: "assistant",
            content: cleanedResponse,
          });
          
          // Keep history manageable (last 20 messages + system prompt)
          if (history.length > 21) {
            history = [history[0], ...history.slice(-20)];
          }
          
          // Save updated history
          conversationHistory.set(sessionId, history);
          
          return {
            success: true,
            response: cleanedResponse,
            sessionId,
            createdTask,
            createdJob,
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
