/**
 * =============================================================================
 * CEREBRO EDITORIAL — Automation Dispatcher
 * =============================================================================
 *
 * Este módulo conecta el motor de automatización (bot_playwright.py) con el
 * backend tRPC del sistema Cerebro Editorial.
 *
 * Responsabilidades:
 *   - Ejecutar bot_playwright.py cuando se crean/actualizan jobs
 *   - Monitorear el estado de los trabajos
 *   - Reportar resultados al sistema tRPC (actualiza DB)
 *   - Endpoint /api/scheduled/automation para Heartbeat
 *
 * Flujo:
 *   1. Un automation_job se crea en la BD con status "pending"
 *   2. El dispatcher lo recoge y ejecuta bot_playwright.py
 *   3. El resultado se escribe en la BD (status "completed" o "error")
 *   4. Si el job está programado, se envía una alerta
 */

import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";
import * as db from "./db";
import * as alerts from "./alerts";

const execFileAsync = promisify(execFile);

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

/** Ruta al script Python del motor de automatización */
const BOT_SCRIPT_PATH = path.resolve(__dirname, "..", "bot_playwright.py");

/** Ruta al archivo de configuración JSON con credenciales */
const CONFIG_PATH = process.env.ZENIT_CONFIG_PATH || "config.json";

/** Timeout máximo para la ejecución del bot (ms) */
const EXECUTION_TIMEOUT = 10 * 60 * 1000; // 10 minutos

/** Plataformas soportadas */
const SUPPORTED_PLATFORMS = [
  "wordpress",
  "youtube",
  "tiktok",
  "twitter",
  "facebook",
  "instagram",
] as const;

type Platform = (typeof SUPPORTED_PLATFORMS)[number];

// =============================================================================
// TIPOS
// =============================================================================

interface AutomationJobData {
  id: number;
  campaignId?: number;
  contentPackageId?: number;
  type: string;
  payload?: string;
  scheduledAt?: Date;
  status: string;
  result?: string;
  logs?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PublishResult {
  success: boolean;
  platform?: string;
  platform_url?: string;
  platform_id?: string;
  error?: string;
  tweet_id?: string;
  video_id?: string;
  media_id?: string;
  publish_id?: string;
}

// =============================================================================
// FUNCIONES PRINCIPALES
// =============================================================================

/**
 * Verifica que el script Python y la configuración existan.
 */
export function validateEnvironment(): {
  scriptExists: boolean;
  configExists: boolean;
  pythonAvailable: boolean;
} {
  const scriptExists = existsSync(BOT_SCRIPT_PATH);
  const configExists = existsSync(path.resolve(CONFIG_PATH));
  let pythonAvailable = false;

  try {
    execFile("python3", ["--version"], { timeout: 5000 }, (err) => {
      if (!err) pythonAvailable = true;
    });
  } catch {
    // python3 no disponible
  }

  return { scriptExists, configExists, pythonAvailable };
}

/**
 * Lista las plataformas configuradas ejecutando bot_playwright.py --action list-platforms.
 */
export async function listConfiguredPlatforms(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "python3",
      [BOT_SCRIPT_PATH, "--action", "list-platforms", "--config", CONFIG_PATH],
      { timeout: 10000 }
    );

    // Parsear la salida para extraer los nombres de plataformas
    const lines = stdout.split("\n");
    const platforms: string[] = [];
    for (const line of lines) {
      const match = line.match(/✓\s+(.+)/);
      if (match) {
        platforms.push(match[1].trim());
      }
    }
    return platforms;
  } catch (error: any) {
    return [];
  }
}

/**
 * Valida todas las credenciales de plataformas.
 */
export async function validateCredentials(): Promise<Record<string, boolean>> {
  try {
    const { stdout } = await execFileAsync(
      "python3",
      [BOT_SCRIPT_PATH, "--action", "validate", "--config", CONFIG_PATH],
      { timeout: 15000 }
    );

    const results: Record<string, boolean> = {};
    const lines = stdout.split("\n");
    for (const line of lines) {
      const match = line.match(/(\w+)\s+(✓|✗)/);
      if (match) {
        results[match[1]] = match[2] === "✓";
      }
    }
    return results;
  } catch (error: any) {
    return {};
  }
}

/**
 * Ejecuta un job de automatización llamando a bot_playwright.py.
 *
 * @param jobId - ID del job en la base de datos
 * @param platform - Plataforma a la que se va a publicar
 * @param payload - Contenido JSON a publicar (ya en formato string)
 * @returns Resultado de la ejecución
 */
export async function executeJob(
  jobId: number,
  platform: Platform,
  payload: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  const job = await db.getAutomationJobById(jobId);
  if (!job) {
    return { success: false, error: `Job ${jobId} no encontrado` };
  }

  // Actualizar estado a "in_progress"
  await db.updateAutomationJob(jobId, {
    status: "in_progress",
    startedAt: new Date(),
  });

  console.log(`[AutomationDispatcher] Ejecutando job #${jobId} para ${platform}...`);

  try {
    const { stdout, stderr } = await execFileAsync(
      "python3",
      [
        BOT_SCRIPT_PATH,
        "--platform", platform,
        "--action", "publish",
        "--config", CONFIG_PATH,
        "--content", payload,
      ],
      {
        timeout: EXECUTION_TIMEOUT,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      }
    );

    // Parsear el resultado JSON
    const resultData = parsePythonOutput(stdout);

    // Actualizar el job en la BD
    if (resultData.success) {
      await db.updateAutomationJob(jobId, {
        status: "completed",
        completedAt: new Date(),
        result: JSON.stringify(resultData),
        logs: stdout,
      });

      // Enviar alerta de éxito si hay campaignId
      if (job.campaignId) {
        await alerts.alertCampaignCompleted(
          job.campaignId,
          `Publicación exitosa en ${platform}: ${resultData.platform_url || ""}`
        );
      }

      console.log(`[AutomationDispatcher] Job #${jobId} completado exitosamente`);
      return { success: true, result: JSON.stringify(resultData) };
    } else {
      const errorMsg = resultData.error || "Error desconocido";
      await db.updateAutomationJob(jobId, {
        status: "error",
        completedAt: new Date(),
        result: JSON.stringify(resultData),
        logs: `${stdout}\n---STDERR---\n${stderr}`,
      });

      // Enviar alerta de error
      if (job.campaignId) {
        await alerts.alertAutomationFailed(job.campaignId, errorMsg);
      }

      console.log(`[AutomationDispatcher] Job #${jobId} falló: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    const errorMsg = error.message || "Error de ejecución";
    await db.updateAutomationJob(jobId, {
      status: "error",
      completedAt: new Date(),
      result: JSON.stringify({ success: false, error: errorMsg }),
      logs: errorMsg,
    });

    // Alerta de error crítico
    await alerts.alertJobError(jobId, "executeJob", errorMsg);

    console.error(`[AutomationDispatcher] Job #${jobId} error crítico: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Ejecuta un job en múltiples plataformas.
 */
export async function executeMultiChannelJob(
  jobId: number,
  platforms: Platform[],
  payload: string
): Promise<{ platform: string; result: PublishResult }[]> {
  const results: { platform: string; result: PublishResult }[] = [];

  for (const platform of platforms) {
    const execResult = await executeJob(jobId, platform, payload);
    results.push({
      platform,
      result: execResult.success
        ? (JSON.parse(execResult.result || "{}") as PublishResult)
        : { success: false, error: execResult.error },
    });
  }

  return results;
}

/**
 * Ejecuta todos los jobs pendientes que no están programados para el futuro.
 * Se invoca desde el endpoint /api/scheduled/automation.
 */
export async function processPendingJobs(): Promise<{
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}> {
  const pendingJobs = await db.getAutomationJobsByStatus("pending");
  let processed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  const now = new Date();

  for (const job of pendingJobs) {
    // Saltar jobs programados para el futuro
    if (job.scheduledAt && new Date(job.scheduledAt) > now) {
      skipped++;
      continue;
    }

    processed++;

    try {
      // Parsear el payload para determinar la plataforma
      let payload: any = {};
      try {
        payload = job.payload ? JSON.parse(job.payload) : {};
      } catch {
        payload = { message: job.payload || "" };
      }

      // Determinar la plataforma del tipo de job
      const platform = inferPlatform(job.type);
      if (!platform) {
        // No se puede determinar la plataforma
        await db.updateAutomationJob(job.id, {
          status: "error",
          completedAt: new Date(),
          result: JSON.stringify({
            success: false,
            error: `No se pudo determinar la plataforma para type: ${job.type}`,
          }),
        });
        failed++;
        continue;
      }

      const execResult = await executeJob(job.id, platform, JSON.stringify(payload));
      if (execResult.success) {
        successful++;
      } else {
        failed++;
      }
    } catch (error: any) {
      await db.updateAutomationJob(job.id, {
        status: "error",
        completedAt: new Date(),
        result: JSON.stringify({ success: false, error: error.message }),
      });
      failed++;
    }
  }

  console.log(
    `[AutomationDispatcher] Procesados: ${processed}, Exitosos: ${successful}, ` +
    `Fallidos: ${failed}, Omitidos: ${skipped}`
  );

  return { processed, successful, failed, skipped };
}

/**
 * Verifica el estado de una publicación existente en una plataforma.
 */
export async function checkPublishStatus(
  platform: Platform,
  contentId: string
): Promise<PublishResult> {
  try {
    const { stdout } = await execFileAsync(
      "python3",
      [
        BOT_SCRIPT_PATH,
        "--platform", platform,
        "--action", "check-status",
        "--config", CONFIG_PATH,
        "--content", JSON.stringify({ platform_id: contentId }),
      ],
      { timeout: 30000 }
    );

    return parsePythonOutput(stdout) as PublishResult;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Crea un nuevo job de automatización y opcionalmente lo ejecuta inmediatamente.
 *
 * @param params - Parámetros del job
 * @param runImmediately - Si true, ejecuta el job de inmediato
 */
export async function createAndRunJob(params: {
  campaignId?: number;
  contentPackageId?: number;
  type: string;
  payload: string;
  scheduledAt?: Date;
  platforms?: Platform[];
  runImmediately?: boolean;
}): Promise<{ jobId: number; success: boolean; result?: any }> {
  // Crear el job en la BD
  const jobId = await db.createAutomationJob({
    campaignId: params.campaignId,
    contentPackageId: params.contentPackageId,
    type: params.type,
    payload: params.payload,
    scheduledAt: params.scheduledAt,
  });

  // Si es programado para el futuro, no ejecutar ahora
  if (params.scheduledAt && new Date(params.scheduledAt) > new Date()) {
    return { jobId, success: true, result: { status: "scheduled" } };
  }

  // Ejecutar inmediatamente si se solicita
  if (params.runImmediately) {
    const platforms = params.platforms || [inferPlatform(params.type) || "wordpress"];

    if (platforms.length === 1) {
      const result = await executeJob(jobId, platforms[0], params.payload);
      return { jobId, success: result.success, result };
    } else {
      const results = await executeMultiChannelJob(jobId, platforms, params.payload);
      const allSuccess = results.every((r) => r.result.success);
      return { jobId, success: allSuccess, result: results };
    }
  }

  return { jobId, success: true, result: { status: "pending" } };
}

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Infiere la plataforma a partir del tipo de job.
 */
function inferPlatform(type: string): Platform | null {
  const lower = type.toLowerCase();

  if (lower.includes("wordpress") || lower.includes("wp") || lower.includes("blog") || lower.includes("post")) {
    return "wordpress";
  }
  if (lower.includes("youtube") || lower.includes("yt") || lower.includes("video")) {
    return "youtube";
  }
  if (lower.includes("tiktok") || lower.includes("tt") || lower.includes("short")) {
    return "tiktok";
  }
  if (lower.includes("twitter") || lower.includes("x_com") || lower.includes("tweet")) {
    return "twitter";
  }
  if (lower.includes("facebook") || lower.includes("fb") || lower.includes("meta")) {
    return "facebook";
  }
  if (lower.includes("instagram") || lower.includes("ig") || lower.includes("insta")) {
    return "instagram";
  }
  if (lower.includes("multichannel") || lower.includes("multicanal") || lower.includes("all")) {
    return null; // Indica multicanal
  }

  return null;
}

/**
 * Parsea la salida del script Python para extraer el JSON del resultado.
 */
function parsePythonOutput(stdout: string): Record<string, any> {
  try {
    // Buscar el JSON en la salida
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // No se pudo parsear
  }
  return { success: false, error: "No se pudo parsear la salida del bot" };
}

/**
 * Obtiene estadísticas de automatización.
 */
export async function getAutomationStats(): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  error: number;
  successRate: number;
  recentJobs: any[];
}> {
  const allJobs = await db.getAllAutomationJobs();
  const byStatus: Record<string, number> = {};

  for (const job of allJobs) {
    const status = job.status || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  const total = allJobs.length;
  const completed = byStatus["completed"] || 0;
  const errorCount = byStatus["error"] || 0;
  const finishedJobs = completed + errorCount;
  const successRate = finishedJobs > 0 ? completed / finishedJobs : 0;

  // Últimos 10 jobs
  const recentJobs = allJobs
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  return {
    total,
    pending: byStatus["pending"] || 0,
    inProgress: byStatus["in_progress"] || 0,
    completed,
    error: errorCount,
    successRate: Math.round(successRate * 100) / 100,
    recentJobs,
  };
}
