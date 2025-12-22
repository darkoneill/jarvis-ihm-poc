import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userPreferences } from "../../drizzle/schema";

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().max(10).optional(),
  notificationsEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  autoRefreshInterval: z.number().min(1000).max(60000).optional(),
  compactMode: z.boolean().optional(),
  keyboardShortcutsEnabled: z.boolean().optional(),
});

export const preferencesRouter = router({
  // Get current user's preferences
  get: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user) {
      // Return default preferences if not authenticated
      return {
        theme: "dark" as const,
        language: "fr",
        notificationsEnabled: true,
        soundEnabled: false,
        emailNotifications: false,
        autoRefreshInterval: 5000,
        compactMode: false,
        keyboardShortcutsEnabled: true,
      };
    }

    const prefs = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id))
      .limit(1);

    if (!prefs[0]) {
      // Create default preferences for user
      const defaultPrefs = {
        userId: ctx.user.id,
        theme: "dark" as const,
        language: "fr",
        notificationsEnabled: true,
        soundEnabled: false,
        emailNotifications: false,
        autoRefreshInterval: 5000,
        compactMode: false,
        keyboardShortcutsEnabled: true,
      };

      await db.insert(userPreferences).values(defaultPrefs);
      return defaultPrefs;
    }

    return prefs[0];
  }),

  // Update user preferences
  update: publicProcedure
    .input(preferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.user) {
        throw new Error("Authentication required");
      }

      // Check if preferences exist
      const existing = await db.select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);

      if (!existing[0]) {
        // Create new preferences
        await db.insert(userPreferences).values({
          userId: ctx.user.id,
          ...input,
        });
      } else {
        // Update existing preferences
        await db.update(userPreferences)
          .set(input)
          .where(eq(userPreferences.userId, ctx.user.id));
      }

      // Return updated preferences
      const updated = await db.select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);

      return updated[0];
    }),

  // Reset preferences to defaults
  reset: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user) {
      throw new Error("Authentication required");
    }

    const defaultPrefs = {
      theme: "dark" as const,
      language: "fr",
      notificationsEnabled: true,
      soundEnabled: false,
      emailNotifications: false,
      autoRefreshInterval: 5000,
      compactMode: false,
      keyboardShortcutsEnabled: true,
    };

    await db.update(userPreferences)
      .set(defaultPrefs)
      .where(eq(userPreferences.userId, ctx.user.id));

    return defaultPrefs;
  }),
});
