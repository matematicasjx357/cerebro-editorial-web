import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  projects,
  campaigns,
  contentPackages,
  automationJobs,
  masterPrompts,
  knowledgeBase,
  keywords,
  editorialMemory,
  type Project,
  type Campaign,
  type ContentPackage,
  type AutomationJob,
  type MasterPrompt,
  type KnowledgeBaseEntry,
  type Keyword,
  type EditorialMemoryEntry,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Projects queries
export async function getProjectById(id: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function createProject(data: { name: string; description?: string; status?: string; metadata?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values({
    name: data.name,
    description: data.description,
    status: (data.status as any) || "active",
    metadata: data.metadata,
  });

  return result;
}

export async function updateProject(id: number, data: Partial<Project>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(projects).where(eq(projects.id, id));
}

// Campaigns queries
export async function getCampaignById(id: number): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCampaignsByProject(projectId: number): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(campaigns).where(eq(campaigns.projectId, projectId)).orderBy(desc(campaigns.createdAt));
}

export async function createCampaign(data: {
  projectId: number;
  title: string;
  description?: string;
  platforms?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(campaigns).values({
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    platforms: data.platforms,
    startDate: data.startDate,
    endDate: data.endDate,
    status: (data.status as any) || "draft",
  });
}

export async function updateCampaign(id: number, data: Partial<Campaign>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(campaigns).where(eq(campaigns.id, id));
}

// Content Packages queries
export async function getContentPackageById(id: number): Promise<ContentPackage | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(contentPackages).where(eq(contentPackages.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getContentPackagesByCampaign(campaignId: number): Promise<ContentPackage[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(contentPackages).where(eq(contentPackages.campaignId, campaignId)).orderBy(desc(contentPackages.createdAt));
}

export async function createContentPackage(data: {
  campaignId: number;
  title: string;
  type: string;
  content?: string;
  status?: string;
  scheduledAt?: Date;
  metadata?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(contentPackages).values({
    campaignId: data.campaignId,
    title: data.title,
    type: (data.type as any),
    content: data.content,
    status: (data.status as any) || "draft",
    scheduledAt: data.scheduledAt,
    metadata: data.metadata,
  });
}

export async function updateContentPackage(id: number, data: Partial<ContentPackage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(contentPackages).set(data).where(eq(contentPackages.id, id));
}

export async function deleteContentPackage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(contentPackages).where(eq(contentPackages.id, id));
}

// Automation Jobs queries
export async function getAutomationJobById(id: number): Promise<AutomationJob | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(automationJobs).where(eq(automationJobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAutomationJobsByStatus(status: string): Promise<AutomationJob[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(automationJobs).where(eq(automationJobs.status, status as any)).orderBy(desc(automationJobs.createdAt));
}

export async function getAllAutomationJobs(): Promise<AutomationJob[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(automationJobs).orderBy(desc(automationJobs.createdAt));
}

export async function createAutomationJob(data: {
  campaignId?: number;
  contentPackageId?: number;
  type: string;
  payload?: string;
  scheduledAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(automationJobs).values({
    campaignId: data.campaignId,
    contentPackageId: data.contentPackageId,
    type: data.type,
    payload: data.payload,
    scheduledAt: data.scheduledAt,
    status: "pending",
  });
}

export async function updateAutomationJob(id: number, data: Partial<AutomationJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(automationJobs).set(data).where(eq(automationJobs.id, id));
}

// Master Prompts queries
export async function getMasterPromptById(id: number): Promise<MasterPrompt | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(masterPrompts).where(eq(masterPrompts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMasterPromptsByProject(projectId: number): Promise<MasterPrompt[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(masterPrompts).where(eq(masterPrompts.projectId, projectId)).orderBy(desc(masterPrompts.createdAt));
}

export async function getAllMasterPrompts(): Promise<MasterPrompt[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(masterPrompts).orderBy(desc(masterPrompts.createdAt));
}

export async function createMasterPrompt(data: {
  projectId?: number;
  name: string;
  template: string;
  description?: string;
  tags?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(masterPrompts).values({
    projectId: data.projectId,
    name: data.name,
    template: data.template,
    description: data.description,
    tags: data.tags,
  });
}

export async function updateMasterPrompt(id: number, data: Partial<MasterPrompt>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(masterPrompts).set(data).where(eq(masterPrompts.id, id));
}

export async function deleteMasterPrompt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(masterPrompts).where(eq(masterPrompts.id, id));
}

// Knowledge Base queries
export async function getKnowledgeBaseById(id: number): Promise<KnowledgeBaseEntry | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getKnowledgeBaseByProject(projectId: number): Promise<KnowledgeBaseEntry[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(knowledgeBase).where(eq(knowledgeBase.projectId, projectId)).orderBy(desc(knowledgeBase.createdAt));
}

export async function createKnowledgeBaseEntry(data: {
  projectId: number;
  title: string;
  content: string;
  type: string;
  tags?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(knowledgeBase).values({
    projectId: data.projectId,
    title: data.title,
    content: data.content,
    type: (data.type as any),
    tags: data.tags,
  });
}

export async function updateKnowledgeBaseEntry(id: number, data: Partial<KnowledgeBaseEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(knowledgeBase).set(data).where(eq(knowledgeBase.id, id));
}

export async function deleteKnowledgeBaseEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
}

// Keywords queries
export async function getKeywordById(id: number): Promise<Keyword | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(keywords).where(eq(keywords.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getKeywordsByProject(projectId: number): Promise<Keyword[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(keywords).where(eq(keywords.projectId, projectId)).orderBy(desc(keywords.createdAt));
}

export async function createKeyword(data: {
  projectId: number;
  keyword: string;
  metrics?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(keywords).values({
    projectId: data.projectId,
    keyword: data.keyword,
    metrics: data.metrics,
  });
}

export async function updateKeyword(id: number, data: Partial<Keyword>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(keywords).set(data).where(eq(keywords.id, id));
}

export async function deleteKeyword(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(keywords).where(eq(keywords.id, id));
}

// Editorial Memory queries
export async function getEditorialMemoryById(id: number): Promise<EditorialMemoryEntry | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(editorialMemory).where(eq(editorialMemory.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEditorialMemoryByProject(projectId: number): Promise<EditorialMemoryEntry[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(editorialMemory).where(eq(editorialMemory.projectId, projectId)).orderBy(desc(editorialMemory.createdAt));
}

export async function createEditorialMemoryEntry(data: {
  projectId: number;
  entry: string;
  type: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(editorialMemory).values({
    projectId: data.projectId,
    entry: data.entry,
    type: (data.type as any),
  });
}

export async function updateEditorialMemoryEntry(id: number, data: Partial<EditorialMemoryEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(editorialMemory).set(data).where(eq(editorialMemory.id, id));
}

export async function deleteEditorialMemoryEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(editorialMemory).where(eq(editorialMemory.id, id));
}

// Dashboard metrics queries
export async function getDashboardMetrics() {
  const db = await getDb();
  if (!db) return null;

  try {
    const activeCampaigns = await db.select().from(campaigns).where(eq(campaigns.status, "active"));
    const pendingJobs = await db.select().from(automationJobs).where(eq(automationJobs.status, "pending"));
    const errorJobs = await db.select().from(automationJobs).where(eq(automationJobs.status, "error"));
    const totalProjects = await db.select().from(projects);

    return {
      activeCampaigns: activeCampaigns.length,
      scheduledPublications: (await db.select().from(contentPackages).where(eq(contentPackages.status, "scheduled"))).length,
      botStatus: pendingJobs.length > 0 ? "active" : "idle",
      connectedChannels: 4, // Placeholder: YouTube, TikTok, Instagram, Twitter
      pendingJobs: pendingJobs.length,
      errorJobs: errorJobs.length,
      totalProjects: totalProjects.length,
    };
  } catch (error) {
    console.error("[Database] Failed to get dashboard metrics:", error);
    return null;
  }
}
