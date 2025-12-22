import { z } from "zod";
import { eq, desc, and, or } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customWidgets } from "../../drizzle/schema";

// Widget config schema
const widgetConfigSchema = z.object({
  url: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  refreshInterval: z.number().optional(),
  displayTemplate: z.string().optional(),
  valueExtractor: z.string().optional(),
  chartType: z.enum(["line", "bar", "pie", "doughnut"]).optional(),
  chartData: z.unknown().optional(),
  iframeSrc: z.string().optional(),
  targetDate: z.string().optional(),
  countdownLabel: z.string().optional(),
});

// Sample custom widgets for simulation
const sampleCustomWidgets = [
  {
    id: 1,
    userId: 1,
    name: "Bitcoin Price",
    description: "Affiche le prix actuel du Bitcoin en USD",
    widgetType: "api" as const,
    config: {
      url: "https://api.coindesk.com/v1/bpi/currentprice/BTC.json",
      method: "GET" as const,
      refreshInterval: 60000,
      valueExtractor: "$.bpi.USD.rate",
      displayTemplate: "<div class='text-2xl font-bold text-green-500'>${{value}}</div>",
    },
    defaultSize: { width: 2, height: 1 },
    icon: "Bitcoin",
    color: "#F7931A",
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    userId: 1,
    name: "Météo Paris",
    description: "Température actuelle à Paris",
    widgetType: "api" as const,
    config: {
      url: "https://wttr.in/Paris?format=j1",
      method: "GET" as const,
      refreshInterval: 300000,
      valueExtractor: "$.current_condition[0].temp_C",
      displayTemplate: "<div class='text-3xl'>{{value}}°C</div><div class='text-sm text-muted-foreground'>Paris</div>",
    },
    defaultSize: { width: 2, height: 1 },
    icon: "Cloud",
    color: "#3B82F6",
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const customWidgetsRouter = router({
  // List user's custom widgets
  list: publicProcedure
    .input(z.object({ includePublic: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return {
          widgets: sampleCustomWidgets,
          isSimulation: true,
        };
      }

      try {
        const userId = ctx.user?.id || 0;
        const results = await db
          .select()
          .from(customWidgets)
          .where(
            input?.includePublic
              ? or(eq(customWidgets.userId, userId), eq(customWidgets.isPublic, true))
              : eq(customWidgets.userId, userId)
          )
          .orderBy(desc(customWidgets.createdAt));

        return { widgets: results, isSimulation: false };
      } catch (error) {
        console.error("Error fetching custom widgets:", error);
        return { widgets: [], isSimulation: false };
      }
    }),

  // Get a single custom widget
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        const widget = sampleCustomWidgets.find((w) => w.id === input.id);
        return { widget, isSimulation: true };
      }

      try {
        const results = await db
          .select()
          .from(customWidgets)
          .where(eq(customWidgets.id, input.id))
          .limit(1);

        return { widget: results[0] || null, isSimulation: false };
      } catch (error) {
        console.error("Error fetching custom widget:", error);
        return { widget: null, isSimulation: false };
      }
    }),

  // Create a custom widget
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        widgetType: z.enum(["api", "chart", "text", "iframe", "countdown"]),
        config: widgetConfigSchema,
        defaultSize: z.object({ width: z.number(), height: z.number() }).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return {
          id: Date.now(),
          ...input,
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSimulation: true,
        };
      }

      try {
        const userId = ctx.user?.id || 0;
        const result = await db.insert(customWidgets).values({
          userId,
          name: input.name,
          description: input.description,
          widgetType: input.widgetType,
          config: input.config,
          defaultSize: input.defaultSize,
          icon: input.icon,
          color: input.color,
          isPublic: input.isPublic || false,
        });

        return {
          id: Number(result[0].insertId),
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error creating custom widget:", error);
        throw new Error("Failed to create custom widget");
      }
    }),

  // Update a custom widget
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        widgetType: z.enum(["api", "chart", "text", "iframe", "countdown"]).optional(),
        config: widgetConfigSchema.optional(),
        defaultSize: z.object({ width: z.number(), height: z.number() }).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return { success: true, isSimulation: true };
      }

      try {
        const { id, ...updateData } = input;
        await db
          .update(customWidgets)
          .set(updateData)
          .where(eq(customWidgets.id, id));

        return { success: true, isSimulation: false };
      } catch (error) {
        console.error("Error updating custom widget:", error);
        throw new Error("Failed to update custom widget");
      }
    }),

  // Delete a custom widget
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return { success: true, isSimulation: true };
      }

      try {
        await db.delete(customWidgets).where(eq(customWidgets.id, input.id));
        return { success: true, isSimulation: false };
      } catch (error) {
        console.error("Error deleting custom widget:", error);
        throw new Error("Failed to delete custom widget");
      }
    }),

  // Execute API widget and return data
  executeApi: publicProcedure
    .input(
      z.object({
        url: z.string(),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
        headers: z.record(z.string(), z.string()).optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.url, {
          method: input.method,
          headers: {
            "Content-Type": "application/json",
            ...input.headers,
          },
          body: input.method !== "GET" ? input.body : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        let data: unknown;

        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        return {
          success: true,
          data,
          status: response.status,
        };
      } catch (error) {
        console.error("Error executing API:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          status: 0,
        };
      }
    }),

  // Get widget templates
  getTemplates: publicProcedure.query(() => {
    return [
      {
        id: "api-json",
        name: "API JSON",
        description: "Récupère des données JSON depuis une API REST",
        widgetType: "api" as const,
        config: {
          url: "https://api.example.com/data",
          method: "GET" as const,
          refreshInterval: 60000,
          valueExtractor: "$.data.value",
          displayTemplate: "<div class='text-2xl font-bold'>{{value}}</div>",
        },
        icon: "Globe",
      },
      {
        id: "chart-live",
        name: "Graphique en temps réel",
        description: "Affiche un graphique avec des données en temps réel",
        widgetType: "chart" as const,
        config: {
          chartType: "line" as const,
          url: "https://api.example.com/metrics",
          refreshInterval: 5000,
        },
        icon: "LineChart",
      },
      {
        id: "countdown",
        name: "Compte à rebours",
        description: "Affiche un compte à rebours vers une date cible",
        widgetType: "countdown" as const,
        config: {
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          countdownLabel: "Événement",
        },
        icon: "Timer",
      },
      {
        id: "iframe",
        name: "Iframe",
        description: "Intègre une page web externe",
        widgetType: "iframe" as const,
        config: {
          iframeSrc: "https://example.com",
        },
        icon: "ExternalLink",
      },
    ];
  }),
});
