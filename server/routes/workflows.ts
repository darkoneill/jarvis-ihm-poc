import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { workflows, InsertWorkflow } from "../../drizzle/schema";

const workflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
  enabled: z.boolean().default(false),
});

export const workflowsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(workflows).orderBy(workflows.createdAt);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(workflows).where(eq(workflows.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: publicProcedure
    .input(workflowSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const newWorkflow: InsertWorkflow = {
        name: input.name,
        description: input.description ?? null,
        nodes: input.nodes,
        edges: input.edges,
        enabled: input.enabled,
      };
      
      const result = await db.insert(workflows).values(newWorkflow);
      return { id: Number(result[0].insertId), ...newWorkflow };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: workflowSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(workflows)
        .set(input.data)
        .where(eq(workflows.id, input.id));
      
      return { success: true };
    }),

  toggleEnabled: publicProcedure
    .input(z.object({
      id: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(workflows)
        .set({ enabled: input.enabled })
        .where(eq(workflows.id, input.id));
      
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(workflows).where(eq(workflows.id, input.id));
      return { success: true };
    }),

  // Execute a workflow (simulation for now)
  execute: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Update lastRun timestamp
      await db.update(workflows)
        .set({ lastRun: new Date() })
        .where(eq(workflows.id, input.id));
      
      // In a real implementation, this would trigger the workflow engine
      return { 
        success: true, 
        message: "Workflow execution started",
        executionId: `exec-${Date.now()}`,
      };
    }),
});
