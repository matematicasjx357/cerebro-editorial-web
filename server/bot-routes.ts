/**
 * Bot Routes - Endpoints REST para que bot_playwright.py pueda:
 * 1. Consultar el siguiente trabajo PENDING
 * 2. Actualizar estados del trabajo paso a paso con logs
 * 3. Guardar la URL final de YouTube y actualizar WordPress
 */

import { Express, Request, Response } from "express";
import * as db from "./db";

// Interfaz para el payload de actualización de logs
interface LogUpdatePayload {
  status?: "pending" | "in_progress" | "completed" | "error";
  logs?: string; // Agregar a los logs existentes
  progress?: number; // 0-100
  message?: string; // Mensaje de estado actual
}

// Interfaz para completar el job con resultado
interface JobCompletePayload {
  status: "completed" | "error";
  result: {
    success: boolean;
    platform: string;
    platform_url?: string;
    platform_id?: string;
    video_id?: string;
    post_id?: string;
    error?: string;
  };
  logs?: string;
  wordpressPostId?: number; // ID del post en WordPress a actualizar
  youtubeUrl?: string; // URL del video en YouTube
}

/**
 * Registra las rutas del bot en Express
 */
export function registerBotRoutes(app: Express) {
  // =========================================================================
  // GET /api/bot/job/next
  // Obtiene el siguiente trabajo PENDING para procesar
  // =========================================================================
  app.get("/api/bot/job/next", async (req: Request, res: Response) => {
    try {
      console.log("[BOT] Consultando siguiente job PENDING...");

      // Obtener todos los jobs pending
      const pendingJobs = await db.getAutomationJobsByStatus("pending");

      if (pendingJobs.length === 0) {
        console.log("[BOT] No hay jobs pending");
        return res.status(200).json({
          success: false,
          message: "No pending jobs available",
          data: null,
        });
      }

      // Tomar el primer job (más antiguo)
      const job = pendingJobs[pendingJobs.length - 1]; // El último es el más antiguo por DESC

      // Cambiar estado a in_progress
      await db.updateAutomationJob(job.id, {
        status: "in_progress",
        startedAt: new Date(),
      });

      // Obtener el content package asociado si existe
      let contentPackage = null;
      if (job.contentPackageId) {
        contentPackage = await db.getContentPackageById(job.contentPackageId);
      }

      console.log(`[BOT] Job #${job.id} asignado para procesamiento`);

      return res.status(200).json({
        success: true,
        message: "Job retrieved and marked as in_progress",
        data: {
          jobId: job.id,
          type: job.type,
          status: "in_progress",
          payload: job.payload ? JSON.parse(job.payload) : null,
          contentPackage: contentPackage ? {
            id: contentPackage.id,
            title: contentPackage.title,
            type: contentPackage.type,
            content: contentPackage.content,
            metadata: contentPackage.metadata ? JSON.parse(contentPackage.metadata) : null,
          } : null,
          campaignId: job.campaignId,
          contentPackageId: job.contentPackageId,
          createdAt: job.createdAt,
        },
      });
    } catch (error) {
      console.error("[BOT] Error al obtener siguiente job:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // =========================================================================
  // POST /api/bot/job/:jobId/log
  // Actualiza el estado del job y agrega logs paso a paso
  // =========================================================================
  app.post("/api/bot/job/:jobId/log", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId, 10);
      const payload: LogUpdatePayload = req.body;

      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid jobId",
        });
      }

      console.log(`[BOT] Actualizando logs del job #${jobId}:`, payload);

      // Obtener el job actual
      const job = await db.getAutomationJobById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: `Job #${jobId} not found`,
        });
      }

      // Construir el nuevo log agregando al existente
      let newLogs = job.logs || "";
      if (payload.logs) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${payload.logs}`;
        newLogs = newLogs ? `${newLogs}\n${logEntry}` : logEntry;
      }

      // Preparar datos de actualización
      const updateData: any = {
        logs: newLogs,
      };

      if (payload.status) {
        updateData.status = payload.status;
      }

      if (payload.status === "completed") {
        updateData.completedAt = new Date();
      }

      // Actualizar el job
      await db.updateAutomationJob(jobId, updateData);

      console.log(`[BOT] Job #${jobId} actualizado exitosamente`);

      return res.status(200).json({
        success: true,
        message: "Job logs updated",
        data: {
          jobId,
          status: payload.status || job.status,
          logsLength: newLogs.length,
        },
      });
    } catch (error) {
      console.error("[BOT] Error al actualizar logs:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // =========================================================================
  // POST /api/bot/job/:jobId/complete
  // Marca el job como completado, guarda la URL de YouTube y actualiza WordPress
  // =========================================================================
  app.post("/api/bot/job/:jobId/complete", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId, 10);
      const payload: JobCompletePayload = req.body;

      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid jobId",
        });
      }

      if (!payload.status || !payload.result) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: status and result",
        });
      }

      console.log(`[BOT] Completando job #${jobId}:`, payload);

      // Obtener el job actual
      const job = await db.getAutomationJobById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: `Job #${jobId} not found`,
        });
      }

      // Construir el nuevo log
      let newLogs = job.logs || "";
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] Job ${payload.status}: ${JSON.stringify(payload.result)}`;
      newLogs = newLogs ? `${newLogs}\n${logEntry}` : logEntry;

      // Actualizar el job con el resultado final
      const resultJson = JSON.stringify(payload.result);
      await db.updateAutomationJob(jobId, {
        status: payload.status,
        result: resultJson,
        logs: newLogs,
        completedAt: new Date(),
      });

      // Si el job tiene un contentPackageId, actualizar el content package
      if (job.contentPackageId) {
        const contentPackage = await db.getContentPackageById(job.contentPackageId);
        if (contentPackage) {
          // Actualizar metadata con la URL de YouTube si existe
          let metadata = contentPackage.metadata ? JSON.parse(contentPackage.metadata) : {};
          
          if (payload.youtubeUrl) {
            metadata.youtubeUrl = payload.youtubeUrl;
            metadata.videoId = payload.result.video_id;
            metadata.publishedAt = new Date().toISOString();
          }

          // Actualizar el status del content package
          const newStatus = payload.status === "completed" ? "published" : "draft";
          
          await db.updateContentPackage(job.contentPackageId, {
            status: newStatus as any,
            metadata: JSON.stringify(metadata),
            publishedAt: payload.status === "completed" ? new Date() : undefined,
          });

          console.log(`[BOT] Content package #${job.contentPackageId} actualizado`);
        }
      }

      // Si se proporciona wordpressPostId, actualizar el post en WordPress
      if (payload.wordpressPostId && payload.youtubeUrl) {
        try {
          await updateWordPressPost(payload.wordpressPostId, payload.youtubeUrl, payload.result);
          console.log(`[BOT] Post WordPress #${payload.wordpressPostId} actualizado con URL de YouTube`);
        } catch (wpError) {
          console.error("[BOT] Error al actualizar WordPress:", wpError);
          // No fallar el job si WordPress falla, solo registrar el error
          newLogs += `\n[${new Date().toISOString()}] WARNING: WordPress update failed: ${wpError instanceof Error ? wpError.message : "Unknown error"}`;
          await db.updateAutomationJob(jobId, { logs: newLogs });
        }
      }

      console.log(`[BOT] Job #${jobId} completado exitosamente`);

      return res.status(200).json({
        success: true,
        message: "Job completed and results saved",
        data: {
          jobId,
          status: payload.status,
          result: payload.result,
          wordpressUpdated: !!payload.wordpressPostId,
        },
      });
    } catch (error) {
      console.error("[BOT] Error al completar job:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // =========================================================================
  // GET /api/bot/job/:jobId
  // Obtiene el estado actual de un job
  // =========================================================================
  app.get("/api/bot/job/:jobId", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId, 10);

      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid jobId",
        });
      }

      const job = await db.getAutomationJobById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: `Job #${jobId} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: job.id,
          type: job.type,
          status: job.status,
          payload: job.payload ? JSON.parse(job.payload) : null,
          result: job.result ? JSON.parse(job.result) : null,
          logs: job.logs,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        },
      });
    } catch (error) {
      console.error("[BOT] Error al obtener job:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // =========================================================================
  // GET /api/bot/jobs/pending
  // Lista todos los jobs pendientes
  // =========================================================================
  app.get("/api/bot/jobs/pending", async (req: Request, res: Response) => {
    try {
      const pendingJobs = await db.getAutomationJobsByStatus("pending");

      return res.status(200).json({
        success: true,
        data: pendingJobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
          campaignId: job.campaignId,
          contentPackageId: job.contentPackageId,
        })),
        count: pendingJobs.length,
      });
    } catch (error) {
      console.error("[BOT] Error al listar jobs pending:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

/**
 * Actualiza un post en WordPress con la URL de YouTube
 * Esta función se conecta a la API REST de WordPress
 */
async function updateWordPressPost(
  postId: number,
  youtubeUrl: string,
  publishResult: any
): Promise<void> {
  // Obtener las credenciales de WordPress desde config.json o variables de entorno
  const wpSiteUrl = process.env.WORDPRESS_SITE_URL || "https://example.com";
  const wpUsername = process.env.WORDPRESS_USERNAME || "admin";
  const wpPassword = process.env.WORDPRESS_APP_PASSWORD || "";

  if (!wpPassword) {
    throw new Error("WordPress credentials not configured");
  }

  // Construir la URL de la API
  const apiUrl = `${wpSiteUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts/${postId}`;

  // Crear el header de autenticación Basic Auth
  const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");

  // Preparar el contenido actualizado con la URL de YouTube
  const updateContent = {
    content: `<!-- YouTube Video -->\n<iframe width="560" height="315" src="${youtubeUrl.replace("youtu.be/", "youtube.com/embed/").replace("watch?v=", "embed/")}" frameborder="0" allowfullscreen></iframe>\n<!-- End YouTube Video -->`,
    meta: {
      youtube_url: youtubeUrl,
      video_id: publishResult.video_id,
      published_via_bot: "true",
    },
  };

  // Realizar la petición POST a WordPress
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateContent),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
  }

  console.log(`[BOT] WordPress post #${postId} actualizado exitosamente`);
}
