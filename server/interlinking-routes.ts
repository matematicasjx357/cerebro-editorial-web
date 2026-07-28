/**
 * Rutas para el Motor de Enlazado Automático Transversal
 * interlinking-routes.ts
 */

import { Express, Request, Response } from "express";
import { createInterlinkingEngine } from "./interlinking-engine";

export function registerInterlinkingRoutes(app: Express) {
  const wpUrl = process.env.WORDPRESS_SITE_URL || "https://example.com";
  const wpUsername = process.env.WORDPRESS_USERNAME || "";
  const wpPassword = process.env.WORDPRESS_APP_PASSWORD || "";

  const engine = createInterlinkingEngine({
    wordpressUrl: wpUrl,
    username: wpUsername,
    applicationPassword: wpPassword,
    maxLinksPerPost: 5,
    minRelevanceScore: 0.6,
  });

  /**
   * POST /api/interlinking/process/:postId
   * Procesa un post recién publicado e inyecta enlaces internos
   */
  app.post("/api/interlinking/process/:postId", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId, 10);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, error: "Invalid postId" });
      }

      const result = await engine.processNewPost(postId);
      return res.status(200).json(result);
    } catch (error) {
      console.error("[INTERLINKING] Error processing post:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/interlinking/process-all
   * Procesa todos los posts publicados (inicialización)
   */
  app.post("/api/interlinking/process-all", async (req: Request, res: Response) => {
    try {
      const stats = await engine.processAllPosts();
      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("[INTERLINKING] Error processing all posts:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
