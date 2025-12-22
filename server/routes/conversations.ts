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
});
