import { z } from "zod";
import { eq, like, isNotNull } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { knowledgeDocuments, InsertKnowledgeDocument } from "../../drizzle/schema";
import { generateEmbedding, findSimilarDocuments } from "../_core/embeddings";

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

  // Simple text search (keyword-based)
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return db.select()
        .from(knowledgeDocuments)
        .where(like(knowledgeDocuments.title, `%${input.query}%`))
        .limit(20);
    }),

  // Semantic search using embeddings (RAG)
  semanticSearch: publicProcedure
    .input(z.object({ 
      query: z.string(),
      topK: z.number().min(1).max(20).default(5),
      minSimilarity: z.number().min(0).max(1).default(0.5),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { results: [], queryEmbedding: null };
      
      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(input.query);
        
        // Get all documents with embeddings
        const docs = await db.select()
          .from(knowledgeDocuments)
          .where(isNotNull(knowledgeDocuments.embedding));
        
        // Find similar documents using cosine similarity
        const results = findSimilarDocuments(queryEmbedding, docs, input.topK)
          .filter(doc => doc.similarity >= input.minSimilarity)
          .map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            source: doc.source,
            fileType: doc.fileType,
            similarity: Math.round(doc.similarity * 100) / 100,
            createdAt: doc.createdAt,
          }));
        
        return { 
          results,
          queryEmbedding: queryEmbedding.slice(0, 10), // Return first 10 dims for debugging
        };
      } catch (error) {
        console.error("Semantic search error:", error);
        // Fallback to keyword search
        const fallbackResults = await db.select()
          .from(knowledgeDocuments)
          .where(like(knowledgeDocuments.title, `%${input.query}%`))
          .limit(input.topK);
        
        return {
          results: fallbackResults.map(doc => ({
            ...doc,
            similarity: 0.5, // Default similarity for fallback
          })),
          queryEmbedding: null,
          fallback: true,
        };
      }
    }),

  // Generate and store embedding for a document
  generateEmbedding: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the document
      const docs = await db.select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, input.id))
        .limit(1);
      
      if (!docs[0]) {
        throw new Error("Document not found");
      }
      
      const doc = docs[0];
      const textToEmbed = `${doc.title}\n\n${doc.content || ""}`;
      
      try {
        const embedding = await generateEmbedding(textToEmbed);
        
        // Store the embedding
        await db.update(knowledgeDocuments)
          .set({ embedding })
          .where(eq(knowledgeDocuments.id, input.id));
        
        return { 
          success: true, 
          dimensions: embedding.length,
          preview: embedding.slice(0, 5),
        };
      } catch (error) {
        console.error("Embedding generation error:", error);
        throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  // Generate embeddings for all documents without embeddings
  generateAllEmbeddings: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Get documents without embeddings
    const docs = await db.select()
      .from(knowledgeDocuments);
    
    const docsWithoutEmbeddings = docs.filter(d => !d.embedding || d.embedding.length === 0);
    
    const results = {
      total: docsWithoutEmbeddings.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const doc of docsWithoutEmbeddings) {
      try {
        const textToEmbed = `${doc.title}\n\n${doc.content || ""}`;
        const embedding = await generateEmbedding(textToEmbed);
        
        await db.update(knowledgeDocuments)
          .set({ embedding })
          .where(eq(knowledgeDocuments.id, doc.id));
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Doc ${doc.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    
    return results;
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
      
      // Generate embedding for new document
      let embedding: number[] | null = null;
      try {
        const textToEmbed = `${input.title}\n\n${input.content || ""}`;
        embedding = await generateEmbedding(textToEmbed);
      } catch (error) {
        console.warn("Failed to generate embedding for new document:", error);
      }
      
      const newDoc: InsertKnowledgeDocument = {
        title: input.title,
        content: input.content ?? null,
        source: input.source ?? null,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize ?? null,
        metadata: input.metadata ?? null,
        embedding,
      };
      
      const result = await db.insert(knowledgeDocuments).values(newDoc);
      return { id: Number(result[0].insertId), ...newDoc, hasEmbedding: !!embedding };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: knowledgeDocumentSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // If content or title changed, regenerate embedding
      if (input.data.title || input.data.content) {
        const docs = await db.select()
          .from(knowledgeDocuments)
          .where(eq(knowledgeDocuments.id, input.id))
          .limit(1);
        
        if (docs[0]) {
          const doc = docs[0];
          const newTitle = input.data.title || doc.title;
          const newContent = input.data.content !== undefined ? input.data.content : doc.content;
          
          try {
            const textToEmbed = `${newTitle}\n\n${newContent || ""}`;
            const embedding = await generateEmbedding(textToEmbed);
            await db.update(knowledgeDocuments)
              .set({ ...input.data, embedding })
              .where(eq(knowledgeDocuments.id, input.id));
            return { success: true, embeddingUpdated: true };
          } catch (error) {
            console.warn("Failed to update embedding:", error);
          }
        }
      }
      
      await db.update(knowledgeDocuments)
        .set(input.data)
        .where(eq(knowledgeDocuments.id, input.id));
      
      return { success: true, embeddingUpdated: false };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, input.id));
      return { success: true };
    }),

  // Get RAG stats
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, withEmbeddings: 0, withoutEmbeddings: 0 };
    
    const docs = await db.select().from(knowledgeDocuments);
    const withEmbeddings = docs.filter(d => d.embedding && d.embedding.length > 0).length;
    
    return {
      total: docs.length,
      withEmbeddings,
      withoutEmbeddings: docs.length - withEmbeddings,
    };
  }),
});
