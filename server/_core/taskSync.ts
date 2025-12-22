/**
 * Task Synchronization with Jarvis Core via Redis
 * 
 * Subscribes to Redis channels for tasks created by N2/N1
 * and synchronizes them with the IHM database.
 * 
 * Channels:
 * - jarvis:tasks:created - New tasks from N2/N1
 * - jarvis:tasks:updated - Task updates from N2/N1
 * - jarvis:tasks:completed - Task completions from N2/N1
 * - jarvis:tasks:ihm - Tasks created by IHM (published to Core)
 */

import { getDb } from '../db';
import { tasks } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TASK_SYNC_ENABLED = process.env.TASK_SYNC_ENABLED === 'true';

// Task channels
const CHANNELS = {
  CREATED: 'jarvis:tasks:created',
  UPDATED: 'jarvis:tasks:updated',
  COMPLETED: 'jarvis:tasks:completed',
  IHM: 'jarvis:tasks:ihm',
};

// Task from Redis Core
interface CoreTask {
  id: string;
  trace_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'done';
  source: 'n2' | 'n1' | 'n0';
  created_at: string;
  due_date?: string;
  metadata?: Record<string, unknown>;
}

// Sync state
let isConnected = false;
let subscriber: any = null;
const pendingTasks: CoreTask[] = [];

// Alert callbacks
type AlertCallback = (task: CoreTask, alertType: 'critical' | 'high' | 'new') => void;
const alertCallbacks: AlertCallback[] = [];

/**
 * Register a callback for task alerts
 */
export function onTaskAlert(callback: AlertCallback): () => void {
  alertCallbacks.push(callback);
  return () => {
    const index = alertCallbacks.indexOf(callback);
    if (index > -1) {
      alertCallbacks.splice(index, 1);
    }
  };
}

/**
 * Emit alert to all registered callbacks
 */
function emitAlert(task: CoreTask, alertType: 'critical' | 'high' | 'new'): void {
  for (const callback of alertCallbacks) {
    try {
      callback(task, alertType);
    } catch (error) {
      console.error('[TaskSync] Alert callback error:', error);
    }
  }
}

/**
 * Initialize Redis subscriber for task synchronization
 */
export async function initTaskSync(): Promise<void> {
  if (!TASK_SYNC_ENABLED) {
    console.log('[TaskSync] Disabled - set TASK_SYNC_ENABLED=true to enable');
    return;
  }

  try {
    // Dynamic import for Redis (optional dependency)
    // @ts-ignore - redis is optional dependency
    const { createClient } = await import('redis');
    
    subscriber = createClient({ url: REDIS_URL });
    
    subscriber.on('error', (err: Error) => {
      console.error('[TaskSync] Redis error:', err.message);
      isConnected = false;
    });

    subscriber.on('connect', () => {
      console.log('[TaskSync] Connected to Redis');
      isConnected = true;
    });

    await subscriber.connect();

    // Subscribe to task channels
    await subscriber.subscribe(CHANNELS.CREATED, handleTaskCreated);
    await subscriber.subscribe(CHANNELS.UPDATED, handleTaskUpdated);
    await subscriber.subscribe(CHANNELS.COMPLETED, handleTaskCompleted);

    console.log('[TaskSync] Subscribed to task channels');
  } catch (error) {
    console.error('[TaskSync] Failed to initialize:', error);
    isConnected = false;
  }
}

/**
 * Handle new task from N2/N1
 */
async function handleTaskCreated(message: string): Promise<void> {
  try {
    const coreTask: CoreTask = JSON.parse(message);
    console.log(`[TaskSync] New task from ${coreTask.source}: ${coreTask.title}`);

    const db = await getDb();
    if (!db) {
      console.error('[TaskSync] Database not available');
      return;
    }
    
    // Check if task already exists (by trace_id)
    const existing = await db
      .select()
      .from(tasks)
      .where(eq(tasks.title, `[${coreTask.trace_id}] ${coreTask.title}`))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[TaskSync] Task already exists: ${coreTask.trace_id}`);
      return;
    }

    // Create task in IHM database
    await db.insert(tasks).values({
      title: `[${coreTask.trace_id}] ${coreTask.title}`,
      description: coreTask.description || `Task from ${coreTask.source.toUpperCase()}`,
      priority: coreTask.priority,
      status: coreTask.status,
      dueDate: coreTask.due_date ? new Date(coreTask.due_date) : null,
    });

    console.log(`[TaskSync] Task created: ${coreTask.title}`);

    // Emit alert for critical/high priority tasks
    if (coreTask.priority === 'critical') {
      emitAlert(coreTask, 'critical');
      console.log(`[TaskSync] 🚨 CRITICAL ALERT: ${coreTask.title}`);
    } else if (coreTask.priority === 'high') {
      emitAlert(coreTask, 'high');
      console.log(`[TaskSync] ⚠️ HIGH PRIORITY: ${coreTask.title}`);
    } else {
      emitAlert(coreTask, 'new');
    }
  } catch (error) {
    console.error('[TaskSync] Error handling task created:', error);
  }
}

/**
 * Handle task update from N2/N1
 */
async function handleTaskUpdated(message: string): Promise<void> {
  try {
    const coreTask: CoreTask = JSON.parse(message);
    console.log(`[TaskSync] Task updated from ${coreTask.source}: ${coreTask.title}`);

    const db = await getDb();
    if (!db) {
      console.error('[TaskSync] Database not available');
      return;
    }
    
    // Find task by trace_id in title
    const existing = await db
      .select()
      .from(tasks)
      .where(eq(tasks.title, `[${coreTask.trace_id}] ${coreTask.title}`))
      .limit(1);

    if (existing.length === 0) {
      console.log(`[TaskSync] Task not found for update: ${coreTask.trace_id}`);
      // Create it instead
      await handleTaskCreated(message);
      return;
    }

    // Update task
    await db
      .update(tasks)
      .set({
        status: coreTask.status,
        priority: coreTask.priority,
        description: coreTask.description,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, existing[0].id));

    console.log(`[TaskSync] Task updated: ${coreTask.title}`);
  } catch (error) {
    console.error('[TaskSync] Error handling task updated:', error);
  }
}

/**
 * Handle task completion from N2/N1
 */
async function handleTaskCompleted(message: string): Promise<void> {
  try {
    const coreTask: CoreTask = JSON.parse(message);
    console.log(`[TaskSync] Task completed from ${coreTask.source}: ${coreTask.title}`);

    const db = await getDb();
    if (!db) {
      console.error('[TaskSync] Database not available');
      return;
    }
    
    // Find task by trace_id in title
    const existing = await db
      .select()
      .from(tasks)
      .where(eq(tasks.title, `[${coreTask.trace_id}] ${coreTask.title}`))
      .limit(1);

    if (existing.length === 0) {
      console.log(`[TaskSync] Task not found for completion: ${coreTask.trace_id}`);
      return;
    }

    // Mark as done
    await db
      .update(tasks)
      .set({
        status: 'done',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, existing[0].id));

    console.log(`[TaskSync] Task marked as done: ${coreTask.title}`);
  } catch (error) {
    console.error('[TaskSync] Error handling task completed:', error);
  }
}

/**
 * Publish task created in IHM to Redis Core
 */
export async function publishTaskToCore(task: {
  id: number;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: Date | null;
}): Promise<void> {
  if (!TASK_SYNC_ENABLED || !isConnected) {
    console.log('[TaskSync] Not connected, skipping publish');
    return;
  }

  try {
    // @ts-ignore - redis is optional dependency
    const { createClient } = await import('redis');
    const publisher = createClient({ url: REDIS_URL });
    await publisher.connect();

    const coreTask: CoreTask = {
      id: `ihm-${task.id}`,
      trace_id: `ihm-${task.id}-${Date.now()}`,
      title: task.title,
      description: task.description || undefined,
      priority: task.priority as CoreTask['priority'],
      status: task.status as CoreTask['status'],
      source: 'n2', // IHM acts as N2 level
      created_at: new Date().toISOString(),
      due_date: task.dueDate?.toISOString(),
    };

    await publisher.publish(CHANNELS.IHM, JSON.stringify(coreTask));
    await publisher.quit();

    console.log(`[TaskSync] Published task to Core: ${task.title}`);
  } catch (error) {
    console.error('[TaskSync] Error publishing task:', error);
  }
}

/**
 * Get sync status
 */
export function getTaskSyncStatus(): {
  enabled: boolean;
  connected: boolean;
  channels: string[];
} {
  return {
    enabled: TASK_SYNC_ENABLED,
    connected: isConnected,
    channels: Object.values(CHANNELS),
  };
}

/**
 * Shutdown task sync
 */
export async function shutdownTaskSync(): Promise<void> {
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
    isConnected = false;
    console.log('[TaskSync] Shutdown complete');
  }
}
