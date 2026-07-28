/**
 * Rutas de Importación Masiva de Temas y Keywords
 * bulk-import-routes.ts
 */

import { Express, Request, Response } from "express";
import multer from "multer";
import csv from "csv-parse/sync";
import * as db from "./db";

const upload = multer({ storage: multer.memoryStorage() });

export function registerBulkImportRoutes(app: Express) {
  /**
   * POST /api/topics/bulk-import
   * Importa palabras clave desde CSV o JSON
   */
  app.post(
    "/api/topics/bulk-import",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const { projectId, clusterId } = req.body;
        const file = req.file;

        if (!projectId || !file) {
          return res.status(400).json({
            success: false,
            error: "Missing projectId or file"
          });
        }

        let keywords: Array<{ keyword: string; metrics?: any }> = [];

        // Parsear CSV o JSON
        if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
          const records = csv.parse(file.buffer.toString(), {
            columns: true,
            skip_empty_lines: true
          });
          keywords = records.map((r: any) => ({
            keyword: r.keyword || r.tema || r.title || "",
            metrics: r.metrics ? JSON.parse(r.metrics) : {}
          }));
        } else if (file.mimetype === "application/json" || file.originalname.endsWith(".json")) {
          const data = JSON.parse(file.buffer.toString());
          keywords = Array.isArray(data) ? data : data.keywords || [];
        } else {
          return res.status(400).json({
            success: false,
            error: "Unsupported file format (CSV or JSON only)"
          });
        }

        // Insertar en base de datos
        let inserted = 0;
        let duplicates = 0;

        for (const kw of keywords) {
          if (!kw.keyword) continue;

          try {
            // Verificar si ya existe
            const existing = await db.getKeywordByProjectAndKeyword(projectId, kw.keyword);
            if (existing) {
              duplicates++;
              continue;
            }

            // Insertar
            await db.createKeyword({
              projectId,
              keyword: kw.keyword,
              metrics: JSON.stringify(kw.metrics || { source: "bulk_import" })
            });
            inserted++;
          } catch (error) {
            console.error(`Error inserting keyword ${kw.keyword}:`, error);
          }
        }

        return res.status(200).json({
          success: true,
          inserted,
          duplicates,
          total: keywords.length,
          message: `Importación completada: ${inserted} nuevas palabras clave, ${duplicates} duplicadas`
        });
      } catch (error) {
        console.error("[BULK_IMPORT] Error:", error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );
}
