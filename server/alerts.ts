import { ENV } from "./_core/env";
import axios from "axios";

export type AlertType = "automation_failed" | "campaign_completed" | "critical_error" | "job_error";

export interface Alert {
  type: AlertType;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  data?: Record<string, any>;
}

/**
 * Send an alert to the project owner via Manus notification system
 */
export async function sendAlert(alert: Alert): Promise<void> {
  try {
    // Only send alerts to the owner
    if (!ENV.ownerOpenId) {
      console.warn("[Alerts] Owner OpenID not configured, skipping alert");
      return;
    }

    const notificationPayload = {
      title: alert.title,
      message: alert.message,
      type: alert.type,
      severity: alert.severity,
      timestamp: new Date().toISOString(),
      data: alert.data,
    };

    // Use Manus notification API
    const response = await axios.post(
      `${ENV.forgeApiUrl}/notification/send`,
      {
        recipientOpenId: ENV.ownerOpenId,
        ...notificationPayload,
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.forgeApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("[Alerts] Alert sent successfully:", response.data);
  } catch (error) {
    console.error("[Alerts] Failed to send alert:", error);
    // Don't throw - we don't want alert failures to break the main flow
  }
}

/**
 * Alert when an automation job fails
 */
export async function alertAutomationFailed(jobId: number, error: string): Promise<void> {
  await sendAlert({
    type: "automation_failed",
    title: "Fallo en Trabajo de Automatización",
    message: `El trabajo de automatización #${jobId} ha fallado: ${error}`,
    severity: "error",
    data: { jobId, error },
  });
}

/**
 * Alert when a campaign completes
 */
export async function alertCampaignCompleted(campaignId: number, campaignName: string): Promise<void> {
  await sendAlert({
    type: "campaign_completed",
    title: "Campaña Completada",
    message: `La campaña "${campaignName}" ha completado su ejecución exitosamente.`,
    severity: "info",
    data: { campaignId, campaignName },
  });
}

/**
 * Alert for critical system errors
 */
export async function alertCriticalError(errorMessage: string, context?: Record<string, any>): Promise<void> {
  await sendAlert({
    type: "critical_error",
    title: "Error Crítico del Sistema",
    message: `Se ha detectado un error crítico: ${errorMessage}`,
    severity: "error",
    data: context,
  });
}

/**
 * Alert for job-specific errors
 */
export async function alertJobError(jobId: number, jobType: string, errorMessage: string): Promise<void> {
  await sendAlert({
    type: "job_error",
    title: `Error en Trabajo: ${jobType}`,
    message: `El trabajo #${jobId} (${jobType}) ha generado un error: ${errorMessage}`,
    severity: "error",
    data: { jobId, jobType, errorMessage },
  });
}
