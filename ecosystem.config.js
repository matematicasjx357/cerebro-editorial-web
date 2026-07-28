/**
 * Configuración de PM2 - Sistema ZENIT
 * ecosystem.config.js
 *
 * Mantiene el servidor web y el bot en ejecución 24/7.
 */

module.exports = {
  apps: [
    {
      name: "zenit-web-server",
      script: "pnpm",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "zenit-bot-worker",
      script: "python3",
      args: "main_runner.py --api http://localhost:3000 --config config.json",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 5000, // Esperar 5s antes de reiniciar si falla
      env: {
        PYTHONUNBUFFERED: "1",
        ZENIT_CONFIG_PATH: "config.json"
      }
    },
    {
      name: "zenit-rss-monitor",
      script: "python3",
      args: "rss_monitor.py --api http://localhost:3000 --project 1 --feeds https://www.technologyreview.com/feed/,https://www.wired.com/feed/category/science/latest/rss",
      instances: 1,
      cron_restart: "0 * * * *", // Reiniciar cada hora para forzar monitoreo
      autorestart: false,
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};
