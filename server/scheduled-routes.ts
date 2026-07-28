/**
 * =============================================================================
 * CEREBRO EDITORIAL — Scheduled Routes
 * =============================================================================
 *
 * Endpoints REST para el sistema de Heartbeat (tareas programadas).
 * Estos endpoints son llamados automáticamente por el sistema de scheduling
 * cuando llega el momento de ejecutar una tarea.
 *
 * Rutas:
 *   POST /api/scheduled/automation/process-pending
 *     → Procesa todos los jobs pendientes
 *
 *   POST /api/scheduled/automation/check-status
 *     → Verifica el estado de jobs en progreso
 *
 *   POST /api/scheduled/automation/stats
 *     → Recalcula estadísticas de automatización
 *
 *   POST /api/scheduled/automation/health-check
 *     → Verifica que el motor de automatización esté funcionando
 */

import { Router, Request, Response } from "express";
import * as dispatcher from "./automation-dispatcher";

export function registerScheduledRoutes(router: Router): void {
  // =============================================================================
  // Procesar jobs pendientes
  // =============================================================================
  router.post("/api/scheduled/automation/process-pending", async (_req: Request, res: Response) => {
    try {
      console.log("[Scheduled] Procesando jobs pendientes...");
      const result = await dispatcher.processPendingJobs();
      res.json({
        success: true,
        message: `Procesados: ${result.processed}, Exitosos: ${result.successful}, Fallidos: ${result.failed}`,
        data: result,
      });
    } catch (error: any) {
      console.error("[Scheduled] Error procesando jobs:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // =============================================================================
  // Verificar estado de jobs en progreso
  // =============================================================================
  router.post("/api/scheduled/automation/check-status", async (_req: Request, res: Response) => {
    try {
      console.log("[Scheduled] Verificando estado de jobs en progreso...");
      const jobs = await dispatcher.getAutomationStats();
      res.json({
        success: true,
        data: {
          inProgress: jobs.inProgress,
          total: jobs.total,
          successRate: jobs.successRate,
        },
      });
    } catch (error: any) {
      console.error("[Scheduled] Error verificando estado:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // =============================================================================
  // Health check del motor de automatización
  // =============================================================================
  router.post("/api/scheduled/automation/health-check", async (_req: Request, res: Response) => {
    try {
      console.log("[Scheduled] Health check del motor de automatización...");
      const env = dispatcher.validateEnvironment();
      const platforms = await dispatcher.listConfiguredPlatforms();
      const creds = await dispatcher.validateCredentials();

      res.json({
        success: true,
        data: {
          environment: env,
          platforms: platforms,
          credentials: creds,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[Scheduled] Error en health check:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
}
