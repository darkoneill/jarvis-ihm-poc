import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { scheduledJobs, InsertScheduledJob } from "../../drizzle/schema";

const scheduledJobSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  cronExpression: z.string().min(1).max(100),
  payload: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true),
});

export const scheduledJobsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(scheduledJobs).orderBy(scheduledJobs.createdAt);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(scheduledJobs).where(eq(scheduledJobs.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: publicProcedure
    .input(scheduledJobSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const newJob: InsertScheduledJob = {
        name: input.name,
        description: input.description ?? null,
        cronExpression: input.cronExpression,
        payload: input.payload ?? null,
        enabled: input.enabled,
      };
      
      const result = await db.insert(scheduledJobs).values(newJob);
      return { id: Number(result[0].insertId), ...newJob };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: scheduledJobSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(scheduledJobs)
        .set(input.data)
        .where(eq(scheduledJobs.id, input.id));
      
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
      
      await db.update(scheduledJobs)
        .set({ enabled: input.enabled })
        .where(eq(scheduledJobs.id, input.id));
      
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(scheduledJobs).where(eq(scheduledJobs.id, input.id));
      return { success: true };
    }),
});
