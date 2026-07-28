/**
 * Servicio de Notificaciones en Tiempo Real
 * notifier.ts
 *
 * Envía alertas vía Telegram o Discord sobre el estado de los trabajos.
 */

import axios from "axios";

export interface NotificationPayload {
  status: "success" | "error" | "info";
  message: string;
  jobId?: number;
  platform?: string;
  url?: string;
  error?: string;
}

export class NotifierService {
  private telegramToken: string;
  private telegramChatId: string;
  private discordWebhookUrl: string;

  constructor() {
    this.telegramToken = process.env.TELEGRAM_BOT_TOKEN || "";
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID || "";
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || "";
  }

  /**
   * Envía una notificación a los canales configurados
   */
  async notify(payload: NotificationPayload): Promise<void> {
    const message = this.formatMessage(payload);

    const promises = [];

    if (this.telegramToken && this.telegramChatId) {
      promises.push(this.sendTelegram(message));
    }

    if (this.discordWebhookUrl) {
      promises.push(this.sendDiscord(payload));
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("[NOTIFIER] Error sending notifications:", error);
    }
  }

  private formatMessage(payload: NotificationPayload): string {
    const icon = payload.status === "success" ? "✅" : payload.status === "error" ? "❌" : "ℹ️";
    let msg = `${icon} *ZENIT: ${payload.status.toUpperCase()}*\n\n`;
    msg += `${payload.message}\n`;
    
    if (payload.jobId) msg += `*Job ID:* ${payload.jobId}\n`;
    if (payload.platform) msg += `*Plataforma:* ${payload.platform}\n`;
    if (payload.url) msg += `*Link:* [Ver publicación](${payload.url})\n`;
    if (payload.error) msg += `\n*Error:* \`${payload.error}\``;
    
    return msg;
  }

  private async sendTelegram(text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
    await axios.post(url, {
      chat_id: this.telegramChatId,
      text: text,
      parse_mode: "Markdown",
    });
  }

  private async sendDiscord(payload: NotificationPayload): Promise<void> {
    const color = payload.status === "success" ? 0x00ff00 : payload.status === "error" ? 0xff0000 : 0x0000ff;
    
    await axios.post(this.discordWebhookUrl, {
      embeds: [{
        title: `ZENIT: ${payload.status.toUpperCase()}`,
        description: payload.message,
        color: color,
        fields: [
          { name: "Job ID", value: payload.jobId?.toString() || "N/A", inline: true },
          { name: "Platform", value: payload.platform || "N/A", inline: true },
          { name: "Link", value: payload.url || "N/A" }
        ],
        footer: { text: "Cerebro Editorial - Sistema Universal" },
        timestamp: new Date().toISOString()
      }]
    });
  }
}

export const notifier = new NotifierService();
