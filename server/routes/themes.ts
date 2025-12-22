import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { themes, userPreferences } from "../../drizzle/schema";

// Built-in themes
const builtInThemes = [
  {
    id: 1,
    name: "jarvis-default",
    displayName: "Jarvis Default",
    description: "Le thème par défaut de Jarvis - sobre et professionnel",
    colors: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.145 0 0)",
      cardForeground: "oklch(0.985 0 0)",
      primary: "oklch(0.646 0.222 41.116)",
      primaryForeground: "oklch(0.393 0.095 152.535)",
      secondary: "oklch(0.269 0 0)",
      secondaryForeground: "oklch(0.985 0 0)",
      muted: "oklch(0.269 0 0)",
      mutedForeground: "oklch(0.708 0 0)",
      accent: "oklch(0.269 0 0)",
      accentForeground: "oklch(0.985 0 0)",
      destructive: "oklch(0.396 0.141 25.723)",
      border: "oklch(0.269 0 0)",
      ring: "oklch(0.646 0.222 41.116)",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
      mono: "JetBrains Mono",
    },
    effects: {
      glowEnabled: false,
      scanlineEnabled: false,
      particlesEnabled: false,
      animationsEnabled: true,
    },
    isBuiltIn: true,
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "iron-man",
    displayName: "Iron Man",
    description: "Inspiré de l'interface JARVIS de Tony Stark - rouge et or avec effets holographiques",
    colors: {
      background: "oklch(0.12 0.02 250)",
      foreground: "oklch(0.95 0.05 80)",
      card: "oklch(0.15 0.03 250)",
      cardForeground: "oklch(0.95 0.05 80)",
      primary: "oklch(0.65 0.25 25)",
      primaryForeground: "oklch(0.15 0.02 250)",
      secondary: "oklch(0.75 0.15 80)",
      secondaryForeground: "oklch(0.15 0.02 250)",
      muted: "oklch(0.25 0.03 250)",
      mutedForeground: "oklch(0.70 0.05 80)",
      accent: "oklch(0.80 0.20 80)",
      accentForeground: "oklch(0.15 0.02 250)",
      destructive: "oklch(0.55 0.25 25)",
      border: "oklch(0.35 0.10 25)",
      ring: "oklch(0.65 0.25 25)",
    },
    fonts: {
      heading: "Orbitron",
      body: "Rajdhani",
      mono: "Share Tech Mono",
    },
    effects: {
      glowEnabled: true,
      glowColor: "rgba(255, 165, 0, 0.3)",
      scanlineEnabled: true,
      particlesEnabled: true,
      animationsEnabled: true,
    },
    isBuiltIn: true,
    createdAt: new Date(),
  },
  {
    id: 3,
    name: "matrix",
    displayName: "Matrix",
    description: "Plongez dans la Matrice - vert néon sur fond noir avec effet de pluie de code",
    colors: {
      background: "oklch(0.08 0.01 150)",
      foreground: "oklch(0.85 0.25 145)",
      card: "oklch(0.10 0.02 150)",
      cardForeground: "oklch(0.85 0.25 145)",
      primary: "oklch(0.70 0.30 145)",
      primaryForeground: "oklch(0.08 0.01 150)",
      secondary: "oklch(0.50 0.20 145)",
      secondaryForeground: "oklch(0.08 0.01 150)",
      muted: "oklch(0.20 0.05 150)",
      mutedForeground: "oklch(0.60 0.15 145)",
      accent: "oklch(0.75 0.35 145)",
      accentForeground: "oklch(0.08 0.01 150)",
      destructive: "oklch(0.55 0.25 25)",
      border: "oklch(0.30 0.15 145)",
      ring: "oklch(0.70 0.30 145)",
    },
    fonts: {
      heading: "Share Tech Mono",
      body: "Source Code Pro",
      mono: "Fira Code",
    },
    effects: {
      glowEnabled: true,
      glowColor: "rgba(0, 255, 65, 0.4)",
      scanlineEnabled: true,
      particlesEnabled: true,
      animationsEnabled: true,
    },
    isBuiltIn: true,
    createdAt: new Date(),
  },
  {
    id: 4,
    name: "cyberpunk",
    displayName: "Cyberpunk 2077",
    description: "Style néon cyberpunk - jaune et magenta sur fond sombre",
    colors: {
      background: "oklch(0.10 0.02 280)",
      foreground: "oklch(0.95 0.10 95)",
      card: "oklch(0.13 0.03 280)",
      cardForeground: "oklch(0.95 0.10 95)",
      primary: "oklch(0.85 0.25 95)",
      primaryForeground: "oklch(0.10 0.02 280)",
      secondary: "oklch(0.65 0.30 330)",
      secondaryForeground: "oklch(0.10 0.02 280)",
      muted: "oklch(0.25 0.05 280)",
      mutedForeground: "oklch(0.70 0.08 95)",
      accent: "oklch(0.70 0.35 330)",
      accentForeground: "oklch(0.10 0.02 280)",
      destructive: "oklch(0.55 0.30 25)",
      border: "oklch(0.40 0.20 330)",
      ring: "oklch(0.85 0.25 95)",
    },
    fonts: {
      heading: "Audiowide",
      body: "Exo 2",
      mono: "Source Code Pro",
    },
    effects: {
      glowEnabled: true,
      glowColor: "rgba(255, 0, 255, 0.3)",
      scanlineEnabled: false,
      particlesEnabled: true,
      animationsEnabled: true,
    },
    isBuiltIn: true,
    createdAt: new Date(),
  },
  {
    id: 5,
    name: "tron-legacy",
    displayName: "Tron Legacy",
    description: "L'univers de Tron - bleu électrique et lignes lumineuses",
    colors: {
      background: "oklch(0.08 0.02 240)",
      foreground: "oklch(0.90 0.15 220)",
      card: "oklch(0.10 0.03 240)",
      cardForeground: "oklch(0.90 0.15 220)",
      primary: "oklch(0.70 0.25 220)",
      primaryForeground: "oklch(0.08 0.02 240)",
      secondary: "oklch(0.50 0.20 40)",
      secondaryForeground: "oklch(0.08 0.02 240)",
      muted: "oklch(0.20 0.05 240)",
      mutedForeground: "oklch(0.65 0.10 220)",
      accent: "oklch(0.80 0.30 220)",
      accentForeground: "oklch(0.08 0.02 240)",
      destructive: "oklch(0.60 0.30 40)",
      border: "oklch(0.35 0.15 220)",
      ring: "oklch(0.70 0.25 220)",
    },
    fonts: {
      heading: "Orbitron",
      body: "Exo 2",
      mono: "Share Tech Mono",
    },
    effects: {
      glowEnabled: true,
      glowColor: "rgba(0, 200, 255, 0.4)",
      scanlineEnabled: false,
      particlesEnabled: true,
      animationsEnabled: true,
    },
    isBuiltIn: true,
    createdAt: new Date(),
  },
  {
    id: 6,
    name: "blade-runner",
    displayName: "Blade Runner",
    description: "Ambiance dystopique - orange et bleu avec atmosphère brumeuse",
    colors: {
      background: "oklch(0.12 0.03 250)",
      foreground: "oklch(0.90 0.08 60)",
      card: "oklch(0.15 0.04 250)",
      cardForeground: "oklch(0.90 0.08 60)",
      primary: "oklch(0.70 0.20 50)",
      primaryForeground: "oklch(0.12 0.03 250)",
      secondary: "oklch(0.55 0.15 220)",
      secondaryForeground: "oklch(0.90 0.08 60)",
      muted: "oklch(0.25 0.05 250)",
      mutedForeground: "oklch(0.65 0.06 60)",
      accent: "oklch(0.75 0.25 50)",
      accentForeground: "oklch(0.12 0.03 250)",
      destructive: "oklch(0.55 0.25 25)",
      border: "oklch(0.35 0.10 50)",
      ring: "oklch(0.70 0.20 50)",
    },
    fonts: {
      heading: "Bebas Neue",
      body: "Roboto",
      mono: "Roboto Mono",
    },
    effects: {
      glowEnabled: true,
      glowColor: "rgba(255, 140, 0, 0.25)",
      scanlineEnabled: true,
      particlesEnabled: false,
      animationsEnabled: true,
    },
    isBuiltIn: true,
    createdAt: new Date(),
  },
];

export const themesRouter = router({
  // List all available themes
  list: publicProcedure.query(async () => {
    const db = await getDb();
    
    if (!db) {
      return { themes: builtInThemes, isSimulation: true };
    }

    try {
      const customThemes = await db.select().from(themes);
      return {
        themes: [...builtInThemes, ...customThemes],
        isSimulation: false,
      };
    } catch (error) {
      console.error("Error fetching themes:", error);
      return { themes: builtInThemes, isSimulation: false };
    }
  }),

  // Get a single theme by name
  get: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const builtIn = builtInThemes.find((t) => t.name === input.name);
      if (builtIn) {
        return { theme: builtIn, isSimulation: false };
      }

      const db = await getDb();
      if (!db) {
        return { theme: null, isSimulation: true };
      }

      try {
        const results = await db
          .select()
          .from(themes)
          .where(eq(themes.name, input.name))
          .limit(1);

        return { theme: results[0] || null, isSimulation: false };
      } catch (error) {
        console.error("Error fetching theme:", error);
        return { theme: null, isSimulation: false };
      }
    }),

  // Get user's active theme
  getActive: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    
    if (!db || !ctx.user) {
      return { themeName: "jarvis-default", theme: builtInThemes[0], isSimulation: true };
    }

    try {
      const prefs = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);

      // For now, return default theme - we'll add theme preference to userPreferences later
      const themeName = "jarvis-default";
      const theme = builtInThemes.find((t) => t.name === themeName) || builtInThemes[0];

      return { themeName, theme, isSimulation: false };
    } catch (error) {
      console.error("Error fetching active theme:", error);
      return { themeName: "jarvis-default", theme: builtInThemes[0], isSimulation: false };
    }
  }),

  // Set user's active theme
  setActive: publicProcedure
    .input(z.object({ themeName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify theme exists
      const builtIn = builtInThemes.find((t) => t.name === input.themeName);
      if (!builtIn) {
        const db = await getDb();
        if (db) {
          const custom = await db
            .select()
            .from(themes)
            .where(eq(themes.name, input.themeName))
            .limit(1);
          if (custom.length === 0) {
            throw new Error("Theme not found");
          }
        }
      }

      // For now, just return success - we'll persist this in userPreferences
      return { success: true, themeName: input.themeName };
    }),

  // Create a custom theme
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        displayName: z.string().min(1).max(255),
        description: z.string().optional(),
        colors: z.object({
          background: z.string(),
          foreground: z.string(),
          card: z.string(),
          cardForeground: z.string(),
          primary: z.string(),
          primaryForeground: z.string(),
          secondary: z.string(),
          secondaryForeground: z.string(),
          muted: z.string(),
          mutedForeground: z.string(),
          accent: z.string(),
          accentForeground: z.string(),
          destructive: z.string(),
          border: z.string(),
          ring: z.string(),
        }),
        fonts: z.object({
          heading: z.string().optional(),
          body: z.string().optional(),
          mono: z.string().optional(),
        }).optional(),
        effects: z.object({
          glowEnabled: z.boolean().optional(),
          glowColor: z.string().optional(),
          scanlineEnabled: z.boolean().optional(),
          particlesEnabled: z.boolean().optional(),
          animationsEnabled: z.boolean().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        return { id: Date.now(), isSimulation: true };
      }

      try {
        const result = await db.insert(themes).values({
          name: input.name,
          displayName: input.displayName,
          description: input.description,
          colors: input.colors,
          fonts: input.fonts,
          effects: input.effects,
          isBuiltIn: false,
        });

        return { id: Number(result[0].insertId), isSimulation: false };
      } catch (error) {
        console.error("Error creating theme:", error);
        throw new Error("Failed to create theme");
      }
    }),

  // Delete a custom theme
  delete: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      // Can't delete built-in themes
      if (builtInThemes.some((t) => t.name === input.name)) {
        throw new Error("Cannot delete built-in theme");
      }

      const db = await getDb();
      if (!db) {
        return { success: true, isSimulation: true };
      }

      try {
        await db.delete(themes).where(eq(themes.name, input.name));
        return { success: true, isSimulation: false };
      } catch (error) {
        console.error("Error deleting theme:", error);
        throw new Error("Failed to delete theme");
      }
    }),

  // Get CSS variables for a theme
  getCssVariables: publicProcedure
    .input(z.object({ themeName: z.string() }))
    .query(async ({ input }) => {
      const theme = builtInThemes.find((t) => t.name === input.themeName);
      
      if (!theme) {
        const db = await getDb();
        if (db) {
          const results = await db
            .select()
            .from(themes)
            .where(eq(themes.name, input.themeName))
            .limit(1);
          if (results.length > 0) {
            const customTheme = results[0];
            return generateCssVariables(customTheme.colors as any, customTheme.effects as any);
          }
        }
        return null;
      }

      return generateCssVariables(theme.colors, theme.effects);
    }),
});

function generateCssVariables(
  colors: typeof builtInThemes[0]["colors"],
  effects?: typeof builtInThemes[0]["effects"]
) {
  return {
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--card": colors.card,
    "--card-foreground": colors.cardForeground,
    "--primary": colors.primary,
    "--primary-foreground": colors.primaryForeground,
    "--secondary": colors.secondary,
    "--secondary-foreground": colors.secondaryForeground,
    "--muted": colors.muted,
    "--muted-foreground": colors.mutedForeground,
    "--accent": colors.accent,
    "--accent-foreground": colors.accentForeground,
    "--destructive": colors.destructive,
    "--border": colors.border,
    "--ring": colors.ring,
    "--glow-enabled": effects?.glowEnabled ? "1" : "0",
    "--glow-color": effects?.glowColor || "transparent",
    "--scanline-enabled": effects?.scanlineEnabled ? "1" : "0",
    "--particles-enabled": effects?.particlesEnabled ? "1" : "0",
    "--animations-enabled": effects?.animationsEnabled ? "1" : "0",
  };
}
