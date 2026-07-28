/**
 * RSS Routes - Endpoints para la integración del rastreador de noticias
 */

import { Express, Request, Response } from "express";
import * as db from "./db";
import { keywords, editorialMemory } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export function registerRSSRoutes(app: Express) {
  /**
   * POST /api/rss/submit
   * Recibe un tema descubierto por el monitor RSS
   */
  app.post("/api/rss/submit", async (req: Request, res: Response) => {
    try {
      const { projectId, keyword, metrics } = req.body;

      if (!projectId || !keyword) {
        return res.status(400).json({ success: false, error: "Missing projectId or keyword" });
      }

      // 1. Verificar si ya existe en la tabla de keywords para este proyecto
      // Nota: En una implementación real, usaríamos una búsqueda más avanzada
      const existingKeywords = await db.getAllKeywords();
      const isDuplicate = existingKeywords.some(
        k => k.projectId === projectId && k.keyword.toLowerCase() === keyword.toLowerCase()
      );

      if (isDuplicate) {
        return res.status(200).json({ success: true, new: false, message: "Duplicate topic" });
      }

      // 2. Verificar contra la memoria editorial (decisiones pasadas)
      const memoryEntries = await db.getAllEditorialMemoryEntries();
      const inMemory = memoryEntries.some(
        m => m.projectId === projectId && m.entry.toLowerCase().includes(keyword.toLowerCase())
      );

      if (inMemory) {
        return res.status(200).json({ success: true, new: false, message: "Topic already in editorial memory" });
      }

      // 3. Insertar como nueva keyword/tema PENDING
      await db.createKeyword({
        projectId,
        keyword,
        metrics: metrics || JSON.stringify({ source: "RSS_MONITOR", date: new Date().toISOString() })
      });

      // 4. Crear automáticamente un Job de automatización tipo 'content_generation' si se desea
      // Por ahora solo lo dejamos como keyword para que el editor lo apruebe

      return res.status(200).json({
        success: true,
        new: true,
        message: "New topic discovered and inserted"
      });
    } catch (error) {
      console.error("[RSS] Error submitting topic:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}
