/**
 * Script de Siembra de Datos - Sistema ZENIT
 * seed_data.ts
 *
 * Inserta automáticamente:
 * - Proyecto 'Mundos Simulados'
 * - 3 clusters iniciales
 * - Campañas iniciales
 * - Configuración por defecto
 *
 * Uso: npx ts-node seed_data.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:@localhost:3306/cerebro_editorial";

async function seedDatabase() {
  console.log("[SEED] Conectando a la base de datos...");

  // Parsear DATABASE_URL
  const url = new URL(DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });

  const db = drizzle(connection);

  try {
    console.log("[SEED] Iniciando siembra de datos...");

    // 1. Crear proyecto 'Mundos Simulados'
    console.log("[SEED] Creando proyecto 'Mundos Simulados'...");
    const projectResult = await connection.execute(
      `INSERT INTO projects (name, description, status) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [
        "Mundos Simulados",
        "Plataforma de contenido sobre realidades virtuales, IA y simulaciones",
        "active",
      ]
    );

    const projectId = (projectResult[0] as any).insertId || 1;
    console.log(`[SEED] Proyecto creado con ID: ${projectId}`);

    // 2. Crear 3 clusters iniciales
    const clusters = [
      {
        name: "Realidad Virtual",
        description: "Contenido sobre VR, metaverso y experiencias inmersivas",
        keywords: "VR, metaverso, realidad virtual, experiencias inmersivas",
      },
      {
        name: "Inteligencia Artificial",
        description: "Avances en IA, machine learning y modelos generativos",
        keywords: "IA, machine learning, redes neuronales, GPT, modelos generativos",
      },
      {
        name: "Simulación y Física",
        description: "Motores de simulación, física computacional y renderizado",
        keywords: "simulación, física, renderizado, motores gráficos, ray tracing",
      },
    ];

    console.log("[SEED] Creando clusters...");
    const clusterIds = [];

    for (const cluster of clusters) {
      const result = await connection.execute(
        `INSERT INTO clusters (projectId, name, description, keywords, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, cluster.name, cluster.description, cluster.keywords, "active"]
      );
      clusterIds.push((result[0] as any).insertId);
      console.log(`[SEED] Cluster creado: ${cluster.name}`);
    }

    // 3. Crear campañas iniciales
    console.log("[SEED] Creando campañas iniciales...");

    const campaigns = [
      {
        name: "Lanzamiento VR Q1 2024",
        description: "Campaña de contenido sobre nuevas tecnologías VR",
        clusterId: clusterIds[0],
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      },
      {
        name: "IA Generativa Explicada",
        description: "Serie educativa sobre modelos de lenguaje y IA",
        clusterId: clusterIds[1],
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-04-30"),
      },
      {
        name: "Motores de Simulación",
        description: "Guías técnicas sobre engines y herramientas",
        clusterId: clusterIds[2],
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-05-31"),
      },
    ];

    for (const campaign of campaigns) {
      const result = await connection.execute(
        `INSERT INTO campaigns (projectId, name, description, clusterId, startDate, endDate, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          campaign.name,
          campaign.description,
          campaign.clusterId,
          campaign.startDate,
          campaign.endDate,
          "active",
        ]
      );
      console.log(`[SEED] Campaña creada: ${campaign.name}`);
    }

    // 4. Crear keywords/temas iniciales
    console.log("[SEED] Creando keywords iniciales...");

    const keywords = [
      { projectId, keyword: "Metaverso 2024", metrics: JSON.stringify({ source: "seed", priority: "high" }) },
      { projectId, keyword: "GPT-5 Predicciones", metrics: JSON.stringify({ source: "seed", priority: "high" }) },
      { projectId, keyword: "Ray Tracing en Tiempo Real", metrics: JSON.stringify({ source: "seed", priority: "medium" }) },
      { projectId, keyword: "Neuroplasticidad Digital", metrics: JSON.stringify({ source: "seed", priority: "medium" }) },
      { projectId, keyword: "Simulaciones Cuánticas", metrics: JSON.stringify({ source: "seed", priority: "high" }) },
    ];

    for (const kw of keywords) {
      await connection.execute(
        `INSERT INTO keywords (projectId, keyword, metrics, status) 
         VALUES (?, ?, ?, ?)`,
        [kw.projectId, kw.keyword, kw.metrics, "pending"]
      );
      console.log(`[SEED] Keyword creada: ${kw.keyword}`);
    }

    // 5. Crear configuración por defecto
    console.log("[SEED] Creando configuración por defecto...");

    const config = {
      seoPlugin: "rankmath",
      maxLinksPerPost: 5,
      enableInterlinking: true,
      enableRSSMonitoring: true,
      rssPollingInterval: 3600,
    };

    await connection.execute(
      `INSERT INTO project_config (projectId, config, updatedAt) 
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE config=VALUES(config), updatedAt=NOW()`,
      [projectId, JSON.stringify(config)]
    );

    console.log("[SEED] Configuración creada");

    console.log("\n[SUCCESS] Siembra de datos completada exitosamente!");
    console.log(`[INFO] Proyecto ID: ${projectId}`);
    console.log(`[INFO] Clusters creados: ${clusterIds.length}`);
    console.log(`[INFO] Campañas creadas: ${campaigns.length}`);
    console.log(`[INFO] Keywords iniciales: ${keywords.length}`);

  } catch (error) {
    console.error("[ERROR] Error durante la siembra:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Ejecutar
seedDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
