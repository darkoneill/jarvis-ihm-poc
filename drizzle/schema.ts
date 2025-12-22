import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tasks table for Kanban board
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["todo", "in_progress", "done"]).default("todo").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  assignee: varchar("assignee", { length: 64 }),
  dueDate: timestamp("dueDate"),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Scheduled jobs table for Calendar/Cron management
 */
export const scheduledJobs = mysqlTable("scheduled_jobs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cronExpression: varchar("cronExpression", { length: 100 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  enabled: boolean("enabled").default(true).notNull(),
  lastRun: timestamp("lastRun"),
  nextRun: timestamp("nextRun"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;

/**
 * Knowledge documents table for RAG storage
 */
export const knowledgeDocuments = mysqlTable("knowledge_documents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  source: varchar("source", { length: 512 }),
  fileType: varchar("fileType", { length: 50 }),
  fileSize: int("fileSize"),
  embedding: json("embedding").$type<number[]>(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type InsertKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;

/**
 * Workflows table for storing workflow graphs
 */
export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  nodes: json("nodes").$type<unknown[]>().notNull(),
  edges: json("edges").$type<unknown[]>().notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  lastRun: timestamp("lastRun"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

/**
 * User preferences table for storing user settings
 */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  theme: mysqlEnum("theme", ["light", "dark", "system"]).default("dark").notNull(),
  language: varchar("language", { length: 10 }).default("fr").notNull(),
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  soundEnabled: boolean("soundEnabled").default(false).notNull(),
  emailNotifications: boolean("emailNotifications").default(false).notNull(),
  autoRefreshInterval: int("autoRefreshInterval").default(5000).notNull(),
  compactMode: boolean("compactMode").default(false).notNull(),
  keyboardShortcutsEnabled: boolean("keyboardShortcutsEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

/**
 * Dashboard configuration table for widget layout
 */
export const dashboardConfigs = mysqlTable("dashboard_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  widgets: json("widgets").$type<{
    id: string;
    type: string;
    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    config: Record<string, unknown>;
    visible: boolean;
  }[]>().notNull(),
  layout: mysqlEnum("layout", ["grid", "freeform"]).default("grid").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type InsertDashboardConfig = typeof dashboardConfigs.$inferInsert;

/**
 * Conversations table for chat history
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  messageCount: int("messageCount").default(0).notNull(),
  lastMessageAt: timestamp("lastMessageAt"),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table for conversation messages
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Plugins table for managing installed plugins
 */
export const plugins = mysqlTable("plugins", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).notNull(),
  author: varchar("author", { length: 255 }),
  icon: varchar("icon", { length: 100 }),
  category: mysqlEnum("category", ["iot", "sensors", "automation", "integration", "utility", "other"]).default("other").notNull(),
  config: json("config").$type<Record<string, unknown>>(),
  enabled: boolean("enabled").default(false).notNull(),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plugin = typeof plugins.$inferSelect;
export type InsertPlugin = typeof plugins.$inferInsert;


/**
 * Custom widgets table for user-created widgets
 */
export const customWidgets = mysqlTable("custom_widgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  widgetType: mysqlEnum("widgetType", ["api", "chart", "text", "iframe", "countdown"]).default("api").notNull(),
  config: json("config").$type<{
    // API widget config
    url?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: string;
    refreshInterval?: number;
    // Display config
    displayTemplate?: string;
    valueExtractor?: string; // JSONPath expression
    // Chart config
    chartType?: "line" | "bar" | "pie" | "doughnut";
    chartData?: unknown;
    // Iframe config
    iframeSrc?: string;
    // Countdown config
    targetDate?: string;
    countdownLabel?: string;
  }>().notNull(),
  defaultSize: json("defaultSize").$type<{ width: number; height: number }>(),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 20 }),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomWidget = typeof customWidgets.$inferSelect;
export type InsertCustomWidget = typeof customWidgets.$inferInsert;

/**
 * Themes table for visual themes
 */
export const themes = mysqlTable("themes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  description: text("description"),
  colors: json("colors").$type<{
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    border: string;
    ring: string;
  }>().notNull(),
  fonts: json("fonts").$type<{
    heading?: string;
    body?: string;
    mono?: string;
  }>(),
  effects: json("effects").$type<{
    glowEnabled?: boolean;
    glowColor?: string;
    scanlineEnabled?: boolean;
    particlesEnabled?: boolean;
    animationsEnabled?: boolean;
  }>(),
  preview: text("preview"), // Base64 preview image
  isBuiltIn: boolean("isBuiltIn").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Theme = typeof themes.$inferSelect;
export type InsertTheme = typeof themes.$inferInsert;

/**
 * Plugin executions log table
 */
export const pluginExecutions = mysqlTable("plugin_executions", {
  id: int("id").autoincrement().primaryKey(),
  pluginId: int("pluginId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  input: json("input").$type<Record<string, unknown>>(),
  output: json("output").$type<Record<string, unknown>>(),
  status: mysqlEnum("status", ["pending", "running", "success", "error"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  duration: int("duration"), // milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PluginExecution = typeof pluginExecutions.$inferSelect;
export type InsertPluginExecution = typeof pluginExecutions.$inferInsert;
