import { z } from "zod";
import { eq, like } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { knowledgeDocuments, InsertKnowledgeDocument } from "../../drizzle/schema";

const knowledgeDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  source: z.string().max(512).optional(),
  fileType: z.string().max(50).optional(),
  fileSize: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const knowledgeRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(knowledgeDocuments).orderBy(knowledgeDocuments.createdAt);
  }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      // Simple text search (in production, use full-text search or vector similarity)
      return db.select()
        .from(knowledgeDocuments)
        .where(like(knowledgeDocuments.title, `%${input.query}%`))
        .limit(20);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: publicProcedure
    .input(knowledgeDocumentSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const newDoc: InsertKnowledgeDocument = {
        title: input.title,
        content: input.content ?? null,
        source: input.source ?? null,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize ?? null,
        metadata: input.metadata ?? null,
      };
      
      const result = await db.insert(knowledgeDocuments).values(newDoc);
      return { id: Number(result[0].insertId), ...newDoc };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: knowledgeDocumentSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(knowledgeDocuments)
        .set(input.data)
        .where(eq(knowledgeDocuments.id, input.id));
      
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, input.id));
      return { success: true };
    }),
});
