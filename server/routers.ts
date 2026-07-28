import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import * as alerts from "./alerts";

export const appRouter = router({
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

  // Dashboard metrics
  dashboard: router({
    metrics: protectedProcedure.query(async () => {
      const metrics = await db.getDashboardMetrics();
      if (!metrics) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch dashboard metrics",
        });
      }
      return metrics;
    }),
  }),

  // Projects router
  projects: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProjects();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        return project;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(["active", "archived", "draft"]).optional(),
          metadata: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createProject(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["active", "archived", "draft"]).optional(),
          metadata: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProject(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProject(input.id);
        return { success: true };
      }),
  }),

  // Campaigns router
  campaigns: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCampaignsByProject(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found",
          });
        }
        return campaign;
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          platforms: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          status: z.enum(["active", "paused", "completed", "draft"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createCampaign(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          platforms: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          status: z.enum(["active", "paused", "completed", "draft"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCampaign(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCampaign(input.id);
        return { success: true };
      }),
  }),

  // Content Packages router
  contentPackages: router({
    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return await db.getContentPackagesByCampaign(input.campaignId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const pkg = await db.getContentPackageById(input.id);
        if (!pkg) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Content package not found",
          });
        }
        return pkg;
      }),

    create: protectedProcedure
      .input(
        z.object({
          campaignId: z.number(),
          title: z.string().min(1),
          type: z.enum(["video", "text", "image", "audio", "mixed"]),
          content: z.string().optional(),
          status: z.enum(["draft", "approved", "published", "scheduled"]).optional(),
          scheduledAt: z.date().optional(),
          metadata: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createContentPackage(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          type: z.enum(["video", "text", "image", "audio", "mixed"]).optional(),
          content: z.string().optional(),
          status: z.enum(["draft", "approved", "published", "scheduled"]).optional(),
          scheduledAt: z.date().optional(),
          publishedAt: z.date().optional(),
          metadata: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateContentPackage(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteContentPackage(input.id);
        return { success: true };
      }),
  }),

  // Automation Jobs router
  automationJobs: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllAutomationJobs();
    }),

    listByStatus: protectedProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getAutomationJobsByStatus(input.status);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const job = await db.getAutomationJobById(input.id);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Automation job not found",
          });
        }
        return job;
      }),

    create: protectedProcedure
      .input(
        z.object({
          campaignId: z.number().optional(),
          contentPackageId: z.number().optional(),
          type: z.string().min(1),
          payload: z.string().optional(),
          scheduledAt: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createAutomationJob(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "in_progress", "completed", "error"]).optional(),
          result: z.string().optional(),
          logs: z.string().optional(),
          startedAt: z.date().optional(),
          completedAt: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAutomationJob(id, data);
        return { success: true };
      }),
  }),

  // Master Prompts router
  masterPrompts: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number().optional() }))
      .query(async ({ input }) => {
        if (input.projectId) {
          return await db.getMasterPromptsByProject(input.projectId);
        }
        return await db.getAllMasterPrompts();
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const prompt = await db.getMasterPromptById(input.id);
        if (!prompt) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Master prompt not found",
          });
        }
        return prompt;
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number().optional(),
          name: z.string().min(1),
          template: z.string().min(1),
          description: z.string().optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createMasterPrompt(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          template: z.string().optional(),
          description: z.string().optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMasterPrompt(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMasterPrompt(input.id);
        return { success: true };
      }),
  }),

  // Knowledge Base router
  knowledgeBase: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getKnowledgeBaseByProject(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const entry = await db.getKnowledgeBaseById(input.id);
        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge base entry not found",
          });
        }
        return entry;
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          content: z.string().min(1),
          type: z.enum(["document", "link", "image", "reference"]),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createKnowledgeBaseEntry(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          type: z.enum(["document", "link", "image", "reference"]).optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateKnowledgeBaseEntry(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteKnowledgeBaseEntry(input.id);
        return { success: true };
      }),
  }),

  // Keywords router
  keywords: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getKeywordsByProject(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const keyword = await db.getKeywordById(input.id);
        if (!keyword) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Keyword not found",
          });
        }
        return keyword;
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          keyword: z.string().min(1),
          metrics: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createKeyword(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          keyword: z.string().optional(),
          metrics: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateKeyword(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteKeyword(input.id);
        return { success: true };
      }),
  }),

  // Editorial Memory router
  editorialMemory: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEditorialMemoryByProject(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const entry = await db.getEditorialMemoryById(input.id);
        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Editorial memory entry not found",
          });
        }
        return entry;
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          entry: z.string().min(1),
          type: z.enum(["decision", "style", "preference", "guideline"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.createEditorialMemoryEntry(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          entry: z.string().optional(),
          type: z.enum(["decision", "style", "preference", "guideline"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateEditorialMemoryEntry(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEditorialMemoryEntry(input.id);
        return { success: true };
      }),
  }),

  // Alerts router for testing and management
  alerts: router({
    testAlert: protectedProcedure
      .input(
        z.object({
          type: z.enum(["automation_failed", "campaign_completed", "critical_error", "job_error"]),
          message: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        if (input.type === "automation_failed") {
          await alerts.alertAutomationFailed(1, input.message);
        } else if (input.type === "campaign_completed") {
          await alerts.alertCampaignCompleted(1, input.message);
        } else if (input.type === "critical_error") {
          await alerts.alertCriticalError(input.message);
        } else if (input.type === "job_error") {
          await alerts.alertJobError(1, "test", input.message);
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
