import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { plugins } from "../../drizzle/schema";

// Plugin categories
const pluginCategories = ["iot", "sensors", "automation", "integration", "utility", "other"] as const;

// Available plugins catalog (marketplace simulation)
const availablePlugins = [
  {
    name: "mqtt-connector",
    displayName: "MQTT Connector",
    description: "Connecteur MQTT pour intégration IoT. Supporte les brokers Mosquitto, HiveMQ, et AWS IoT.",
    version: "1.2.0",
    author: "Jarvis Team",
    icon: "Wifi",
    category: "iot" as const,
    configSchema: {
      brokerUrl: { type: "string", label: "URL du Broker", required: true },
      username: { type: "string", label: "Utilisateur", required: false },
      password: { type: "password", label: "Mot de passe", required: false },
      topics: { type: "array", label: "Topics à écouter", required: true },
    },
  },
  {
    name: "zigbee-gateway",
    displayName: "Zigbee Gateway",
    description: "Passerelle Zigbee pour capteurs et actionneurs domotiques. Compatible Zigbee2MQTT.",
    version: "2.0.1",
    author: "Jarvis Team",
    icon: "Radio",
    category: "sensors" as const,
    configSchema: {
      gatewayUrl: { type: "string", label: "URL Gateway", required: true },
      networkKey: { type: "password", label: "Clé réseau", required: true },
    },
  },
  {
    name: "home-assistant",
    displayName: "Home Assistant",
    description: "Intégration bidirectionnelle avec Home Assistant. Contrôlez vos appareils depuis Jarvis.",
    version: "3.1.0",
    author: "Community",
    icon: "Home",
    category: "integration" as const,
    configSchema: {
      haUrl: { type: "string", label: "URL Home Assistant", required: true },
      accessToken: { type: "password", label: "Token d'accès", required: true },
    },
  },
  {
    name: "prometheus-exporter",
    displayName: "Prometheus Exporter",
    description: "Exporte les métriques Jarvis au format Prometheus pour monitoring avancé.",
    version: "1.0.0",
    author: "Jarvis Team",
    icon: "BarChart",
    category: "utility" as const,
    configSchema: {
      port: { type: "number", label: "Port d'export", required: true, default: 9090 },
      metricsPath: { type: "string", label: "Chemin", required: false, default: "/metrics" },
    },
  },
  {
    name: "telegram-bot",
    displayName: "Telegram Bot",
    description: "Recevez des notifications et contrôlez Jarvis via Telegram.",
    version: "1.5.0",
    author: "Community",
    icon: "Send",
    category: "integration" as const,
    configSchema: {
      botToken: { type: "password", label: "Token du Bot", required: true },
      chatId: { type: "string", label: "Chat ID", required: true },
    },
  },
  {
    name: "weather-sensor",
    displayName: "Weather Sensor",
    description: "Intégration de capteurs météo (température, humidité, pression, UV).",
    version: "1.1.0",
    author: "Jarvis Team",
    icon: "Cloud",
    category: "sensors" as const,
    configSchema: {
      sensorType: { type: "select", label: "Type de capteur", required: true, options: ["BME280", "DHT22", "DS18B20"] },
      gpioPin: { type: "number", label: "Pin GPIO", required: true },
    },
  },
  {
    name: "cron-scheduler",
    displayName: "Cron Scheduler",
    description: "Planificateur de tâches avancé avec expressions cron et conditions.",
    version: "2.0.0",
    author: "Jarvis Team",
    icon: "Clock",
    category: "automation" as const,
    configSchema: {
      timezone: { type: "string", label: "Fuseau horaire", required: false, default: "Europe/Paris" },
    },
  },
  {
    name: "nvidia-jetson",
    displayName: "NVIDIA Jetson",
    description: "Monitoring et contrôle avancé des modules NVIDIA Jetson (Orin, Thor).",
    version: "1.0.0",
    author: "Jarvis Team",
    icon: "Cpu",
    category: "sensors" as const,
    configSchema: {
      jetsonModel: { type: "select", label: "Modèle Jetson", required: true, options: ["Orin Nano", "Orin NX", "AGX Orin", "Thor"] },
      enablePowerMonitoring: { type: "boolean", label: "Monitoring énergie", required: false },
    },
  },
];

export const pluginsRouter = router({
  // List installed plugins
  listInstalled: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    
    if (!db) {
      // Return mock data
      return {
        plugins: [
          {
            id: 1,
            name: "mqtt-connector",
            displayName: "MQTT Connector",
            description: "Connecteur MQTT pour intégration IoT",
            version: "1.2.0",
            author: "Jarvis Team",
            icon: "Wifi",
            category: "iot" as const,
            config: { brokerUrl: "mqtt://localhost:1883", topics: ["jarvis/#"] },
            enabled: true,
            installedAt: new Date(),
          },
        ],
        isSimulation: true,
      };
    }

    try {
      const results = await db
        .select()
        .from(plugins)
        .orderBy(desc(plugins.installedAt));

      return { plugins: results, isSimulation: false };
    } catch (error) {
      console.error("Error fetching plugins:", error);
      return { plugins: [], isSimulation: false };
    }
  }),

  // List available plugins (marketplace)
  listAvailable: publicProcedure.query(() => {
    return { plugins: availablePlugins };
  }),

  // Get plugin details
  get: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Check if installed
      let installed = null;
      if (db) {
        const results = await db
          .select()
          .from(plugins)
          .where(eq(plugins.name, input.name))
          .limit(1);
        installed = results[0] || null;
      }

      // Get from catalog
      const catalogPlugin = availablePlugins.find((p) => p.name === input.name);

      return {
        installed,
        catalog: catalogPlugin,
      };
    }),

  // Install a plugin
  install: publicProcedure
    .input(
      z.object({
        name: z.string(),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Find plugin in catalog
      const catalogPlugin = availablePlugins.find((p) => p.name === input.name);
      if (!catalogPlugin) {
        throw new Error("Plugin not found in catalog");
      }

      if (!db) {
        return {
          success: true,
          plugin: {
            id: Date.now(),
            ...catalogPlugin,
            config: input.config || {},
            enabled: false,
            installedAt: new Date(),
          },
          isSimulation: true,
        };
      }

      try {
        // Check if already installed
        const existing = await db
          .select()
          .from(plugins)
          .where(eq(plugins.name, input.name))
          .limit(1);

        if (existing.length > 0) {
          throw new Error("Plugin already installed");
        }

        const result = await db.insert(plugins).values({
          name: catalogPlugin.name,
          displayName: catalogPlugin.displayName,
          description: catalogPlugin.description,
          version: catalogPlugin.version,
          author: catalogPlugin.author,
          icon: catalogPlugin.icon,
          category: catalogPlugin.category,
          config: input.config || {},
          enabled: false,
        });

        return {
          success: true,
          pluginId: Number(result[0].insertId),
          isSimulation: false,
        };
      } catch (error) {
        console.error("Error installing plugin:", error);
        throw new Error("Failed to install plugin");
      }
    }),

  // Uninstall a plugin
  uninstall: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return { success: true, isSimulation: true };
      }

      try {
        await db.delete(plugins).where(eq(plugins.name, input.name));
        return { success: true, isSimulation: false };
      } catch (error) {
        console.error("Error uninstalling plugin:", error);
        throw new Error("Failed to uninstall plugin");
      }
    }),

  // Enable/disable a plugin
  toggle: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return { success: true, enabled: true, isSimulation: true };
      }

      try {
        const existing = await db
          .select()
          .from(plugins)
          .where(eq(plugins.name, input.name))
          .limit(1);

        if (existing.length === 0) {
          throw new Error("Plugin not installed");
        }

        const newEnabled = !existing[0].enabled;
        await db
          .update(plugins)
          .set({ enabled: newEnabled })
          .where(eq(plugins.name, input.name));

        return { success: true, enabled: newEnabled, isSimulation: false };
      } catch (error) {
        console.error("Error toggling plugin:", error);
        throw new Error("Failed to toggle plugin");
      }
    }),

  // Update plugin configuration
  updateConfig: publicProcedure
    .input(
      z.object({
        name: z.string(),
        config: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return { success: true, isSimulation: true };
      }

      try {
        await db
          .update(plugins)
          .set({ config: input.config })
          .where(eq(plugins.name, input.name));

        return { success: true, isSimulation: false };
      } catch (error) {
        console.error("Error updating plugin config:", error);
        throw new Error("Failed to update plugin configuration");
      }
    }),

  // Get plugin categories
  getCategories: publicProcedure.query(() => {
    return [
      { id: "iot", name: "IoT", description: "Objets connectés et protocoles IoT", icon: "Wifi" },
      { id: "sensors", name: "Capteurs", description: "Capteurs et mesures", icon: "Thermometer" },
      { id: "automation", name: "Automatisation", description: "Règles et automatisations", icon: "Zap" },
      { id: "integration", name: "Intégrations", description: "Services tiers et APIs", icon: "Link" },
      { id: "utility", name: "Utilitaires", description: "Outils et fonctionnalités", icon: "Wrench" },
      { id: "other", name: "Autres", description: "Plugins divers", icon: "Package" },
    ];
  }),
});
