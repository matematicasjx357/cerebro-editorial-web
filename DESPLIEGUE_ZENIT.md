# Guía de Despliegue - Sistema ZENIT (Cerebro Editorial)

Este documento detalla los pasos necesarios para desplegar la plataforma web en el hosting Zenit y configurar el bot de automatización localmente.

## 1. Despliegue del Backend (Express + MySQL)

### Requisitos Previos
- Node.js v18+ y pnpm.
- Base de Datos MySQL (TiDB o similar).
- Servidor con soporte para aplicaciones Node.js (Hosting Zenit).

### Pasos en el Servidor
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/matematicasjx357/cerebro-editorial-web.git
   cd cerebro-editorial-web
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` basado en el entorno de producción:
   ```env
   DATABASE_URL=mysql://user:pass@host:port/db
   PORT=3000
   WORDPRESS_SITE_URL=https://tu-sitio-wp.com
   WORDPRESS_USERNAME=admin
   WORDPRESS_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

4. **Ejecutar migraciones de base de datos:**
   ```bash
   pnpm db:push
   ```

5. **Iniciar el servidor (usando PM2 recomendado):**
   ```bash
   pm2 start npm --name "zenit-web" -- start
   ```

---

## 2. Configuración del Bot Local (`bot_playwright.py`)

El bot está diseñado para correr en una máquina local con acceso a los archivos de video originales y conexión a la API del backend.

### Instalación del Bot
1. **Instalar dependencias de Python:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Instalar navegadores de Playwright:**
   ```bash
   playwright install chromium
   ```

3. **Configurar `config.json`:**
   Copia `config.example.json` a `config.json` y completa las credenciales de YouTube, WordPress y otras redes sociales.

### Ejecución del Bot
Para que el bot funcione con el nuevo flujo de "Pull API", puedes usar el script de orquestación o ejecutarlo manualmente:

```bash
python bot_playwright.py --action process_queue --api_url https://tu-backend-zenit.com/api/bot
```

---

## 3. Verificación de la Integración

Una vez desplegado:
1. Accede al Dashboard de Zenit.
2. Crea un nuevo **Automation Job** desde la sección "Jobs Queue".
3. El bot local detectará el trabajo `PENDING` a través del endpoint `/api/bot/job/next`.
4. Podrás ver los logs en tiempo real en la interfaz web mientras el bot procesa la tarea.
5. Al finalizar, verifica que el video esté en YouTube y el post de WordPress se haya actualizado automáticamente.

---

## Solución de Problemas Comunes

- **Error de Conexión API:** Asegúrate de que el firewall del hosting permita peticiones entrantes al puerto configurado.
- **Fallo en WordPress:** Verifica que el plugin de JWT o Application Passwords esté activo en WordPress.
- **YouTube Auth:** Si el token expira, el bot intentará usar el `refresh_token`. Asegúrate de que el `client_id` y `client_secret` sean correctos en `config.json`.

---
*Desarrollado por Cerebro Editorial - Sistema Universal de Automatización.*
