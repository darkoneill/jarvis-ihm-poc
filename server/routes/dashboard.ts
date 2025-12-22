import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { dashboardConfigs } from "../../drizzle/schema";

// Widget type definition
interface Widget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, unknown>;
  visible: boolean;
}

// Widget schema for validation
const widgetSchema = z.object({
  id: z.string(),
  type: z.enum([
    "system_status",
    "hardware_metrics",
    "recent_tasks",
    "upcoming_jobs",
    "quick_actions",
    "chat_preview",
    "knowledge_search",
    "workflow_status",
    "notifications",
    "clock",
  ]),
  title: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number().min(1).max(4),
    height: z.number().min(1).max(4),
  }),
  config: z.record(z.string(), z.unknown()).default({}),
  visible: z.boolean().default(true),
});

// Default widgets configuration
const defaultWidgets: Widget[] = [
  {
    id: "system_status",
    type: "system_status",
    title: "État du Système",
    position: { x: 0, y: 0 },
    size: { width: 2, height: 1 },
    config: {},
    visible: true,
  },
  {
    id: "hardware_metrics",
    type: "hardware_metrics",
    title: "Métriques Hardware",
    position: { x: 2, y: 0 },
    size: { width: 2, height: 2 },
    config: { showGpu: true, showCpu: true, showRam: true },
    visible: true,
  },
  {
    id: "recent_tasks",
    type: "recent_tasks",
    title: "Tâches Récentes",
    position: { x: 0, y: 1 },
    size: { width: 2, height: 2 },
    config: { limit: 5 },
    visible: true,
  },
  {
    id: "upcoming_jobs",
    type: "upcoming_jobs",
    title: "Jobs Planifiés",
    position: { x: 0, y: 3 },
    size: { width: 2, height: 1 },
    config: { limit: 3 },
    visible: true,
  },
  {
    id: "quick_actions",
    type: "quick_actions",
    title: "Actions Rapides",
    position: { x: 2, y: 2 },
    size: { width: 2, height: 1 },
    config: {},
    visible: true,
  },
  {
    id: "notifications",
    type: "notifications",
    title: "Notifications",
    position: { x: 2, y: 3 },
    size: { width: 2, height: 1 },
    config: { limit: 5 },
    visible: true,
  },
];

export const dashboardRouter = router({
  // Get dashboard configuration
  getConfig: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    
    if (!db || !ctx.user) {
      return { widgets: defaultWidgets, layout: "grid" as const };
    }

    try {
      const results = await db
        .select()
        .from(dashboardConfigs)
        .where(eq(dashboardConfigs.userId, ctx.user.id))
        .limit(1);

      if (results.length === 0) {
        return { widgets: defaultWidgets, layout: "grid" as const };
      }

      const config = results[0];
      return {
        widgets: config.widgets as Widget[],
        layout: config.layout,
      };
    } catch (error) {
      console.error("Error fetching dashboard config:", error);
      return { widgets: defaultWidgets, layout: "grid" as const };
    }
  }),

  // Save dashboard configuration
  saveConfig: publicProcedure
    .input(
      z.object({
        widgets: z.array(widgetSchema),
        layout: z.enum(["grid", "freeform"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        throw new Error("Authentication required");
      }

      try {
        // Check if config exists
        const existing = await db
          .select()
          .from(dashboardConfigs)
          .where(eq(dashboardConfigs.userId, ctx.user.id))
          .limit(1);

        if (existing.length > 0) {
          // Update existing config
          await db
            .update(dashboardConfigs)
            .set({
              widgets: input.widgets as Widget[],
              layout: input.layout || "grid",
            })
            .where(eq(dashboardConfigs.userId, ctx.user.id));
        } else {
          // Create new config
          await db.insert(dashboardConfigs).values({
            userId: ctx.user.id,
            widgets: input.widgets as Widget[],
            layout: input.layout || "grid",
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Error saving dashboard config:", error);
        throw new Error("Failed to save dashboard configuration");
      }
    }),

  // Reset to default configuration
  resetConfig: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    
    if (!db || !ctx.user) {
      return { widgets: defaultWidgets, layout: "grid" as const };
    }

    try {
      // Delete existing config
      await db
        .delete(dashboardConfigs)
        .where(eq(dashboardConfigs.userId, ctx.user.id));

      return { widgets: defaultWidgets, layout: "grid" as const };
    } catch (error) {
      console.error("Error resetting dashboard config:", error);
      return { widgets: defaultWidgets, layout: "grid" as const };
    }
  }),

  // Toggle widget visibility
  toggleWidget: publicProcedure
    .input(z.object({ widgetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db || !ctx.user) {
        throw new Error("Authentication required");
      }

      try {
        const results = await db
          .select()
          .from(dashboardConfigs)
          .where(eq(dashboardConfigs.userId, ctx.user.id))
          .limit(1);

        if (results.length === 0) {
          throw new Error("Dashboard config not found");
        }

        const config = results[0];
        const updatedWidgets = (config.widgets as Widget[]).map((w) =>
          w.id === input.widgetId ? { ...w, visible: !w.visible } : w
        );

        await db
          .update(dashboardConfigs)
          .set({ widgets: updatedWidgets })
          .where(eq(dashboardConfigs.userId, ctx.user.id));

        return { success: true };
      } catch (error) {
        console.error("Error toggling widget:", error);
        throw new Error("Failed to toggle widget");
      }
    }),

  // Get available widget types
  getWidgetTypes: publicProcedure.query(() => {
    return [
      {
        type: "system_status",
        name: "État du Système",
        description: "Affiche l'état général du système Jarvis",
        icon: "Activity",
        defaultSize: { width: 2, height: 1 },
      },
      {
        type: "hardware_metrics",
        name: "Métriques Hardware",
        description: "Graphiques CPU, GPU, RAM en temps réel",
        icon: "Cpu",
        defaultSize: { width: 2, height: 2 },
      },
      {
        type: "recent_tasks",
        name: "Tâches Récentes",
        description: "Liste des dernières tâches",
        icon: "CheckSquare",
        defaultSize: { width: 2, height: 2 },
      },
      {
        type: "upcoming_jobs",
        name: "Jobs Planifiés",
        description: "Prochains jobs à exécuter",
        icon: "Calendar",
        defaultSize: { width: 2, height: 1 },
      },
      {
        type: "quick_actions",
        name: "Actions Rapides",
        description: "Boutons d'actions fréquentes",
        icon: "Zap",
        defaultSize: { width: 2, height: 1 },
      },
      {
        type: "chat_preview",
        name: "Aperçu Chat",
        description: "Derniers messages avec Jarvis",
        icon: "MessageSquare",
        defaultSize: { width: 2, height: 2 },
      },
      {
        type: "knowledge_search",
        name: "Recherche Connaissances",
        description: "Recherche rapide dans la base",
        icon: "Search",
        defaultSize: { width: 2, height: 1 },
      },
      {
        type: "workflow_status",
        name: "État des Workflows",
        description: "Workflows actifs et leur statut",
        icon: "GitBranch",
        defaultSize: { width: 2, height: 1 },
      },
      {
        type: "notifications",
        name: "Notifications",
        description: "Dernières alertes et notifications",
        icon: "Bell",
        defaultSize: { width: 2, height: 1 },
      },
      {
        type: "clock",
        name: "Horloge",
        description: "Date et heure actuelles",
        icon: "Clock",
        defaultSize: { width: 1, height: 1 },
      },
    ];
  }),
});
