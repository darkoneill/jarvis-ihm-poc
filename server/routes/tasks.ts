import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, InsertTask } from "../../drizzle/schema";
import { publishTaskToCore, getTaskSyncStatus } from "../_core/taskSync";

const taskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assignee: z.string().max(64).optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).optional(),
});

export const tasksRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tasks).orderBy(tasks.createdAt);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(tasks).where(eq(tasks.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: publicProcedure
    .input(taskSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const newTask: InsertTask = {
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        assignee: input.assignee ?? null,
        dueDate: input.dueDate ?? null,
        tags: input.tags ?? null,
      };
      
      const result = await db.insert(tasks).values(newTask);
      const createdTask = { 
        id: Number(result[0].insertId), 
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority || 'medium',
        status: newTask.status || 'todo',
        dueDate: newTask.dueDate,
      };
      
      // Publish to Redis Core for synchronization
      publishTaskToCore(createdTask).catch(err => 
        console.error('[Tasks] Failed to publish to Core:', err)
      );
      
      return { id: createdTask.id, ...newTask };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: taskSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(tasks)
        .set(input.data)
        .where(eq(tasks.id, input.id));
      
      return { success: true };
    }),

  updateStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["todo", "in_progress", "done"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(tasks)
        .set({ status: input.status })
        .where(eq(tasks.id, input.id));
      
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(tasks).where(eq(tasks.id, input.id));
      return { success: true };
    }),

  // Get task sync status with Redis Core
  syncStatus: publicProcedure.query(() => {
    return getTaskSyncStatus();
  }),
});
