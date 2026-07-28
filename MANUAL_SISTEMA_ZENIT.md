# Manual de Operaciones - Sistema ZENIT (Cerebro Editorial)

Bienvenido al manual oficial de operaciones del **Sistema ZENIT**, la plataforma universal de automatización editorial. Este documento contiene los comandos y procedimientos necesarios para el mantenimiento cotidiano.

---

## 🚀 Despliegue y Actualización

### Primera Instalación
1. Clona el repositorio.
2. Ejecuta el configurador interactivo:
   ```bash
   ./setup_env.sh
   ```
3. Lanza el despliegue inicial:
   ```bash
   ./deploy.sh
   ```

### Actualización de Código
Para actualizar el sistema con la última versión de GitHub:
```bash
./deploy.sh
```

---

## 📊 Monitoreo de Servicios (PM2)

El sistema utiliza **PM2** para gestionar los procesos en segundo plano.

| Comando | Descripción |
|---------|-------------|
| `pm2 status` | Ver el estado de todos los procesos (Web, Bot, RSS) |
| `pm2 logs` | Ver logs en tiempo real de todos los servicios |
| `pm2 logs zenit-bot-worker` | Ver logs específicos del bot de automatización |
| `pm2 restart all` | Reiniciar todos los servicios |
| `pm2 stop all` | Detener todos los servicios |
| `pm2 monit` | Monitor visual de recursos (CPU/RAM) |

---

## 🤖 Operaciones del Bot (`main_runner.py`)

Puedes interactuar con el orquestador manualmente:
```bash
python3 main_runner.py
```

**Opciones del Menú:**
1. **Modo Automático Continuo**: El bot consultará la API cada 60s en busca de tareas.
2. **Verificar Sesiones**: Comprueba si Gemini, YouTube, etc., están logueados.
3. **Ejecutar 1 Tarea de Prueba**: Toma el siguiente job de la cola y lo procesa inmediatamente.

---

## 📰 Monitoreo RSS (`rss_monitor.py`)

El monitor RSS se ejecuta automáticamente según el cron configurado en `ecosystem.config.js`. Para ejecutarlo manualmente:
```bash
python3 rss_monitor.py --project 1 --feeds "URL_FEED_1,URL_FEED_2"
```

---

## 🛠️ Solución de Problemas Comunes

### 1. Fallo en el Login del Navegador
Si el bot falla al publicar en YouTube o TikTok, verifica las sesiones:
```bash
python3 check_sessions.py --gui
```
*Nota: Necesitas un entorno con interfaz gráfica para el modo `--gui`.*

### 2. Error de Base de Datos
Si ves errores de conexión a MySQL, verifica que el servicio esté corriendo y que la `DATABASE_URL` en el `.env` sea correcta.

### 3. Logs de Error con Screenshots
Cuando el bot falla, busca capturas de pantalla del error en:
`logs/screenshots/`

### 4. Reintentos de Tareas
Si una tarea queda en estado `error`, puedes volver a ponerla en `pending` desde el Dashboard Web para que el bot la intente procesar de nuevo.

---

## 🧪 Pruebas de Integridad

Antes de realizar cambios mayores, ejecuta la suite de pruebas:
```bash
python3 test_suite.py
```

---

## 📂 Estructura de Archivos Críticos
- `.env`: Variables de entorno (Sensible).
- `config.json`: Credenciales de APIs y redes sociales.
- `rss_feeds.json`: Lista de fuentes RSS por proyecto.
- `ecosystem.config.js`: Configuración de procesos PM2.

---
*Desarrollado por Cerebro Editorial - Sistema Universal de Automatización.*
