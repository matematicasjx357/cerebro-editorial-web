import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
 * Projects table for managing editorial projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "archived", "draft"]).default("active").notNull(),
  metadata: text("metadata"), // JSON stringified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Campaigns table for managing multichannel campaigns
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  platforms: text("platforms"), // JSON stringified array
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["active", "paused", "completed", "draft"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Content packages table for managing content associated with campaigns
 */
export const contentPackages = mysqlTable("content_packages", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["video", "text", "image", "audio", "mixed"]).notNull(),
  content: text("content"),
  status: mysqlEnum("status", ["draft", "approved", "published", "scheduled"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  metadata: text("metadata"), // JSON stringified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentPackage = typeof contentPackages.$inferSelect;
export type InsertContentPackage = typeof contentPackages.$inferInsert;

/**
 * Automation jobs table for tracking bot automation tasks
 */
export const automationJobs = mysqlTable("automation_jobs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId"),
  contentPackageId: int("contentPackageId"),
  type: varchar("type", { length: 100 }).notNull(), // publish, analyze, etc.
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "error"]).default("pending").notNull(),
  payload: text("payload"), // JSON stringified
  result: text("result"), // JSON stringified
  logs: text("logs"),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutomationJob = typeof automationJobs.$inferSelect;
export type InsertAutomationJob = typeof automationJobs.$inferInsert;

/**
 * Master prompts table for storing reusable prompt templates
 */
export const masterPrompts = mysqlTable("master_prompts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  name: varchar("name", { length: 255 }).notNull(),
  template: text("template").notNull(),
  description: text("description"),
  tags: text("tags"), // JSON stringified array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MasterPrompt = typeof masterPrompts.$inferSelect;
export type InsertMasterPrompt = typeof masterPrompts.$inferInsert;

/**
 * Knowledge base table for storing editorial resources and references
 */
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["document", "link", "image", "reference"]).notNull(),
  tags: text("tags"), // JSON stringified array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBaseEntry = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseEntry = typeof knowledgeBase.$inferInsert;

/**
 * Keywords table for managing keywords with performance metrics
 */
export const keywords = mysqlTable("keywords", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  metrics: text("metrics"), // JSON stringified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Keyword = typeof keywords.$inferSelect;
export type InsertKeyword = typeof keywords.$inferInsert;

/**
 * Editorial memory table for storing editorial decisions, styles, and preferences
 */
export const editorialMemory = mysqlTable("editorial_memory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  entry: text("entry").notNull(),
  type: mysqlEnum("type", ["decision", "style", "preference", "guideline"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditorialMemoryEntry = typeof editorialMemory.$inferSelect;
export type InsertEditorialMemoryEntry = typeof editorialMemory.$inferInsert;