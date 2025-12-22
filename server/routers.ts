import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { tasksRouter } from "./routes/tasks";
import { scheduledJobsRouter } from "./routes/scheduledJobs";
import { knowledgeRouter } from "./routes/knowledge";
import { workflowsRouter } from "./routes/workflows";
import { chatRouter } from "./routes/chat";
import { hardwareRouter } from "./routes/hardware";
import { exportRouter } from "./routes/export";
import { preferencesRouter } from "./routes/preferences";
import { dashboardRouter } from "./routes/dashboard";
import { conversationsRouter } from "./routes/conversations";
import { pluginsRouter } from "./routes/plugins";
import { customWidgetsRouter } from "./routes/customWidgets";
import { themesRouter } from "./routes/themes";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  tasks: tasksRouter,
  scheduledJobs: scheduledJobsRouter,
  knowledge: knowledgeRouter,
  workflows: workflowsRouter,
  chat: chatRouter,
  hardware: hardwareRouter,
  export: exportRouter,
  preferences: preferencesRouter,
  dashboard: dashboardRouter,
  conversations: conversationsRouter,
  plugins: pluginsRouter,
  customWidgets: customWidgetsRouter,
  themes: themesRouter,
});

export type AppRouter = typeof appRouter;
