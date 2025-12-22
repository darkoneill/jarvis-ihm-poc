import { z } from "zod";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { conversations, messages } from "../../drizzle/schema";

export const conversationsRouter = router({
  // List all conversations for current user
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        archived: z.boolean().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        // Return mock data for demo
        return {
          conversations: [
            {
              id: 1,
              title: "Configuration du système",
              summary: "Discussion sur la configuration initiale de Jarvis",
              messageCount: 12,
              lastMessageAt: new Date(Date.now() - 3600000),
              archived: false,
              createdAt: new Date(Date.now() - 86400000),
            },
            {
              id: 2,
              title: "Automatisation des backups",
              summary: "Mise en place des sauvegardes automatiques",
              messageCount: 8,
              lastMessageAt: new Date(Date.now() - 7200000),
              archived: false,
              createdAt: new Date(Date.now() - 172800000),
            },
          ],
          total: 2,
          isSimulation: true,
        };
      }

      try {
        const { limit = 20, offset = 0, archived, search } = input || {};
        
        const conditions = [eq(conversations.userId, ctx.user.id)];
        
        if (archived !== undefined) {
          conditions.push(eq(conversations.archived, archived));
        }
        
        if (search) {
          conditions.push(like(conversations.title, `%${search}%`));
        }

        const results = await db
          .select()
          .from(conversations)
          .where(and(...conditions))
          .orderBy(desc(conversations.lastMessageAt))
          .limit(limit)
          .offset(offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(and(...conditions));

        return {
          conversations: results,
          total: countResult[0]?.count || 0,
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error fetching conversations:", error);
        return { conversations: [], total: 0, isSimulation: false };
      }
    }),

  // Get a single conversation with messages
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return {
          conversation: {
            id: input.id,
            title: "Conversation de démonstration",
            summary: "Ceci est une conversation de démonstration",
            messageCount: 3,
            archived: false,
            createdAt: new Date(),
          },
          messages: [
            { id: 1, role: "user" as const, content: "Bonjour Jarvis !", createdAt: new Date() },
            { id: 2, role: "assistant" as const, content: "Bonjour ! Comment puis-je vous aider ?", createdAt: new Date() },
          ],
          isSimulation: true,
        };
      }

      try {
        const conversationResults = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, input.id),
              eq(conversations.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (conversationResults.length === 0) {
          throw new Error("Conversation not found");
        }

        const conversationMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, input.id))
          .orderBy(messages.createdAt);

        return {
          conversation: conversationResults[0],
          messages: conversationMessages,
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error fetching conversation:", error);
        throw new Error("Failed to fetch conversation");
      }
    }),

  // Generate a title from message content
  generateTitle: publicProcedure
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // Extract first 50 characters and clean up
      let title = input.content.trim();
      
      // Remove common greetings
      const greetings = ['bonjour', 'salut', 'hello', 'hi', 'hey', 'bonsoir'];
      const lowerTitle = title.toLowerCase();
      for (const greeting of greetings) {
        if (lowerTitle.startsWith(greeting)) {
          title = title.substring(greeting.length).trim();
          // Remove punctuation after greeting
          if (title.startsWith(',') || title.startsWith('!') || title.startsWith('.')) {
            title = title.substring(1).trim();
          }
          break;
        }
      }
      
      // Truncate to 50 chars and add ellipsis if needed
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }
      
      // If title is empty after processing, use default
      if (!title) {
        title = `Conversation du ${new Date().toLocaleDateString('fr-FR')}`;
      }
      
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
      
      return { title };
    }),

  // Create a new conversation
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        initialMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return {
          id: Date.now(),
          title: input.title,
          messageCount: 0,
          archived: false,
          createdAt: new Date(),
          isSimulation: true,
        };
      }

      try {
        const result = await db.insert(conversations).values({
          userId: ctx.user.id,
          title: input.title,
          messageCount: input.initialMessage ? 1 : 0,
          lastMessageAt: input.initialMessage ? new Date() : null,
        });

        const conversationId = Number(result[0].insertId);

        // Add initial message if provided
        if (input.initialMessage) {
          await db.insert(messages).values({
            conversationId,
            role: "user",
            content: input.initialMessage,
          });
        }

        return {
          id: conversationId,
          title: input.title,
          messageCount: input.initialMessage ? 1 : 0,
          archived: false,
          createdAt: new Date(),
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error creating conversation:", error);
        throw new Error("Failed to create conversation");
      }
    }),

  // Add a message to a conversation
  addMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.number(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return {
          id: Date.now(),
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          createdAt: new Date(),
          isSimulation: true,
        };
      }

      try {
        const result = await db.insert(messages).values({
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          metadata: input.metadata,
        });

        // Update conversation message count and last message time
        await db
          .update(conversations)
          .set({
            messageCount: sql`${conversations.messageCount} + 1`,
            lastMessageAt: new Date(),
          })
          .where(eq(conversations.id, input.conversationId));

        return {
          id: Number(result[0].insertId),
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          createdAt: new Date(),
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error adding message:", error);
        throw new Error("Failed to add message");
      }
    }),

  // Update conversation (title, archive status)
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        archived: z.boolean().optional(),
        summary: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { success: true, isSimulation: true };
      }

      try {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.archived !== undefined) updateData.archived = input.archived;
        if (input.summary !== undefined) updateData.summary = input.summary;

        await db
          .update(conversations)
          .set(updateData)
          .where(
            and(
              eq(conversations.id, input.id),
              eq(conversations.userId, ctx.user.id)
            )
          );

        return { success: true, isSimulation: false };
      } catch (error) {
        console.error("Error updating conversation:", error);
        throw new Error("Failed to update conversation");
      }
    }),

  // Delete a conversation
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { success: true, isSimulation: true };
      }

      try {
        // Delete messages first
        await db.delete(messages).where(eq(messages.conversationId, input.id));

        // Delete conversation
        await db
          .delete(conversations)
          .where(
            and(
              eq(conversations.id, input.id),
              eq(conversations.userId, ctx.user.id)
            )
          );

        return { success: true, isSimulation: false };
      } catch (error) {
        console.error("Error deleting conversation:", error);
        throw new Error("Failed to delete conversation");
      }
    }),

  // Generate summary using LLM
  generateSummary: publicProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { 
          summary: "Résumé de démonstration: Discussion générale avec l'assistant Jarvis.",
          isSimulation: true 
        };
      }

      try {
        // Get conversation messages
        const conversationMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, input.conversationId))
          .orderBy(messages.createdAt)
          .limit(20);

        if (conversationMessages.length === 0) {
          return { summary: null, isSimulation: false };
        }

        // Build context for summary generation
        const context = conversationMessages
          .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Jarvis'}: ${m.content.substring(0, 200)}`)
          .join('\n');

        let summary: string;

        try {
          // Try to generate summary using LLM
          const { routeLLMRequest } = await import("../_core/llmRouter");
          const { llmConfigs, systemSettings } = await import("../../drizzle/schema");
          
          // Get active LLM config
          let config = await db
            .select()
            .from(llmConfigs)
            .where(eq(llmConfigs.userId, ctx.user.id))
            .limit(1);
          
          const llmConfig = config[0] || { provider: "forge", model: "default" };
          
          const result = await routeLLMRequest(
            {
              provider: llmConfig.provider as "forge" | "ollama" | "openai" | "anthropic" | "n2",
              apiUrl: llmConfig.apiUrl,
              apiKey: llmConfig.apiKey,
              model: llmConfig.model,
              temperature: 0.3,
              maxTokens: 150,
              timeout: 15000,
              fallbackEnabled: true,
              fallbackProvider: "forge",
            },
            [
              {
                role: "system",
                content: "Tu es un assistant qui résume des conversations. Génère un résumé concis de 2-3 phrases maximum en français. Concentre-toi sur les sujets principaux et les actions demandées.",
              },
              {
                role: "user",
                content: `Résume cette conversation en 2-3 phrases:\n\n${context}`,
              },
            ],
            { maxTokens: 150, temperature: 0.3 }
          );

          const content = result.choices?.[0]?.message?.content;
          summary = typeof content === "string" ? content : "";
          
          // Fallback to keyword extraction if LLM returns empty
          if (!summary.trim()) {
            throw new Error("Empty LLM response");
          }
        } catch (llmError) {
          console.log("[Summary] LLM unavailable, using keyword extraction");
          
          // Fallback: Extract key topics from the conversation
          const topics = new Set<string>();
          const keywords = ['configuration', 'backup', 'monitoring', 'installation', 'erreur', 'problème', 
                           'aide', 'comment', 'pourquoi', 'quand', 'système', 'fichier', 'données',
                           'tâche', 'calendrier', 'planification', 'sécurité', 'réseau', 'gpu'];
          
          for (const msg of conversationMessages) {
            const lowerContent = msg.content.toLowerCase();
            for (const keyword of keywords) {
              if (lowerContent.includes(keyword)) {
                topics.add(keyword);
              }
            }
          }

          const topicList = Array.from(topics).slice(0, 3);
          summary = topicList.length > 0
            ? `Discussion sur ${topicList.join(', ')}. ${conversationMessages.length} messages échangés.`
            : `Conversation de ${conversationMessages.length} messages avec l'assistant Jarvis.`;
        }

        // Update conversation with summary
        await db
          .update(conversations)
          .set({ summary })
          .where(
            and(
              eq(conversations.id, input.conversationId),
              eq(conversations.userId, ctx.user.id)
            )
          );

        return { summary, isSimulation: false };
      } catch (error) {
        console.error("Error generating summary:", error);
        return { summary: null, isSimulation: false };
      }
    }),

  // Add tags to a conversation
  addTag: publicProcedure
    .input(z.object({ 
      conversationId: z.number(),
      tag: z.string().min(1).max(50)
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { success: true, tags: [input.tag], isSimulation: true };
      }

      try {
        // Get current tags
        const conv = await db
          .select({ tags: conversations.tags })
          .from(conversations)
          .where(
            and(
              eq(conversations.id, input.conversationId),
              eq(conversations.userId, ctx.user.id)
            )
          )
          .limit(1);

        const currentTags = conv[0]?.tags || [];
        const normalizedTag = input.tag.toLowerCase().trim();
        
        // Don't add duplicate tags
        if (currentTags.includes(normalizedTag)) {
          return { success: true, tags: currentTags, isSimulation: false };
        }

        const newTags = [...currentTags, normalizedTag];

        await db
          .update(conversations)
          .set({ tags: newTags })
          .where(
            and(
              eq(conversations.id, input.conversationId),
              eq(conversations.userId, ctx.user.id)
            )
          );

        return { success: true, tags: newTags, isSimulation: false };
      } catch (error) {
        console.error("Error adding tag:", error);
        throw new Error("Failed to add tag");
      }
    }),

  // Remove tag from a conversation
  removeTag: publicProcedure
    .input(z.object({ 
      conversationId: z.number(),
      tag: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { success: true, tags: [], isSimulation: true };
      }

      try {
        const conv = await db
          .select({ tags: conversations.tags })
          .from(conversations)
          .where(
            and(
              eq(conversations.id, input.conversationId),
              eq(conversations.userId, ctx.user.id)
            )
          )
          .limit(1);

        const currentTags = conv[0]?.tags || [];
        const newTags = currentTags.filter(t => t !== input.tag.toLowerCase().trim());

        await db
          .update(conversations)
          .set({ tags: newTags })
          .where(
            and(
              eq(conversations.id, input.conversationId),
              eq(conversations.userId, ctx.user.id)
            )
          );

        return { success: true, tags: newTags, isSimulation: false };
      } catch (error) {
        console.error("Error removing tag:", error);
        throw new Error("Failed to remove tag");
      }
    }),

  // Get all unique tags for a user
  getAllTags: publicProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { 
          tags: ['configuration', 'backup', 'monitoring', 'aide'], 
          isSimulation: true 
        };
      }

      try {
        const results = await db
          .select({ tags: conversations.tags })
          .from(conversations)
          .where(eq(conversations.userId, ctx.user.id));

        // Collect all unique tags
        const allTags = new Set<string>();
        for (const row of results) {
          if (row.tags) {
            for (const tag of row.tags) {
              allTags.add(tag);
            }
          }
        }

        return { tags: Array.from(allTags).sort(), isSimulation: false };
      } catch (error) {
        console.error("Error getting tags:", error);
        return { tags: [], isSimulation: false };
      }
    }),

  // Import conversation from JSON
  importConversation: publicProcedure
    .input(z.object({
      conversation: z.object({
        title: z.string(),
        summary: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        createdAt: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { 
          id: Date.now(),
          title: input.conversation.title,
          messageCount: input.messages.length,
          isSimulation: true 
        };
      }

      try {
        // Create conversation
        const result = await db.insert(conversations).values({
          userId: ctx.user.id,
          title: input.conversation.title,
          summary: input.conversation.summary,
          tags: input.conversation.tags,
          messageCount: input.messages.length,
          lastMessageAt: new Date(),
        });

        const conversationId = Number(result[0].insertId);

        // Add messages
        for (const msg of input.messages) {
          await db.insert(messages).values({
            conversationId,
            role: msg.role,
            content: msg.content,
          });
        }

        return {
          id: conversationId,
          title: input.conversation.title,
          messageCount: input.messages.length,
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error importing conversation:", error);
        throw new Error("Failed to import conversation");
      }
    }),

  // Search conversations
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return { results: [], isSimulation: true };
      }

      try {
        // Search in conversation titles
        const conversationResults = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.userId, ctx.user.id),
              like(conversations.title, `%${input.query}%`)
            )
          )
          .limit(10);

        // Search in messages
        const messageResults = await db
          .select({
            conversationId: messages.conversationId,
            content: messages.content,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(
            and(
              eq(conversations.userId, ctx.user.id),
              like(messages.content, `%${input.query}%`)
            )
          )
          .limit(20);

        return {
          results: {
            conversations: conversationResults,
            messages: messageResults,
          },
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error searching conversations:", error);
        return { results: { conversations: [], messages: [] }, isSimulation: false };
      }
    }),

  // Export all conversations (bulk export for sync)
  exportAll: publicProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return {
          exportDate: new Date().toISOString(),
          version: "1.0",
          conversations: [
            {
              conversation: {
                id: 1,
                title: "Conversation de démonstration",
                summary: "Résumé de démo",
                tags: ["demo"],
                archived: false,
                createdAt: new Date().toISOString(),
              },
              messages: [
                { role: "user", content: "Bonjour", createdAt: new Date().toISOString() },
                { role: "assistant", content: "Bonjour !", createdAt: new Date().toISOString() },
              ],
            },
          ],
          isSimulation: true,
        };
      }

      try {
        // Get all conversations for user
        const allConversations = await db
          .select()
          .from(conversations)
          .where(eq(conversations.userId, ctx.user.id))
          .orderBy(desc(conversations.createdAt));

        // Get messages for each conversation
        const exportData = [];
        for (const conv of allConversations) {
          const convMessages = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(messages.createdAt);

          exportData.push({
            conversation: {
              id: conv.id,
              title: conv.title,
              summary: conv.summary,
              tags: conv.tags,
              archived: conv.archived,
              createdAt: conv.createdAt?.toISOString(),
            },
            messages: convMessages.map(m => ({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt?.toISOString(),
            })),
          });
        }

        return {
          exportDate: new Date().toISOString(),
          version: "1.0",
          userId: ctx.user.id,
          conversations: exportData,
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error exporting all conversations:", error);
        throw new Error("Failed to export conversations");
      }
    }),

  // Import all conversations (bulk import for sync)
  importAll: publicProcedure
    .input(z.object({
      conversations: z.array(z.object({
        conversation: z.object({
          title: z.string(),
          summary: z.string().optional().nullable(),
          tags: z.array(z.string()).optional().nullable(),
          archived: z.boolean().optional(),
          createdAt: z.string().optional(),
        }),
        messages: z.array(z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
          createdAt: z.string().optional(),
        })),
      })),
      mergeStrategy: z.enum(["skip", "replace", "merge"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        return {
          imported: input.conversations.length,
          skipped: 0,
          replaced: 0,
          isSimulation: true,
        };
      }

      try {
        let imported = 0;
        let skipped = 0;
        let replaced = 0;

        for (const item of input.conversations) {
          // Check if conversation with same title exists
          const existing = await db
            .select()
            .from(conversations)
            .where(
              and(
                eq(conversations.userId, ctx.user.id),
                eq(conversations.title, item.conversation.title)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            if (input.mergeStrategy === "skip") {
              skipped++;
              continue;
            } else if (input.mergeStrategy === "replace") {
              // Delete existing conversation and its messages
              await db.delete(messages).where(eq(messages.conversationId, existing[0].id));
              await db.delete(conversations).where(eq(conversations.id, existing[0].id));
              replaced++;
            }
            // For "merge", we just add as new conversation with modified title
          }

          // Create new conversation
          const title = input.mergeStrategy === "merge" && existing.length > 0
            ? `${item.conversation.title} (importé)`
            : item.conversation.title;

          const result = await db.insert(conversations).values({
            userId: ctx.user.id,
            title,
            summary: item.conversation.summary,
            tags: item.conversation.tags,
            archived: item.conversation.archived || false,
            messageCount: item.messages.length,
            lastMessageAt: new Date(),
          });

          const conversationId = Number(result[0].insertId);

          // Add messages
          for (const msg of item.messages) {
            await db.insert(messages).values({
              conversationId,
              role: msg.role,
              content: msg.content,
            });
          }

          imported++;
        }

        return {
          imported,
          skipped,
          replaced,
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error importing conversations:", error);
        throw new Error("Failed to import conversations");
      }
    }),
});
