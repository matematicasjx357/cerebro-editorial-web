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

---

## ❓ Preguntas Frecuentes (FAQ) y Solución de Problemas

### 1. ¿Cómo soluciono el error de conexión a MySQL?
**Problema:** El servidor web o el bot no pueden conectar con la base de datos.
**Solución:**
- Verifica que el servicio MySQL esté activo: `sudo systemctl status mysql`.
- Asegúrate de que la `DATABASE_URL` en el archivo `.env` tenga el formato correcto: `mysql://usuario:contraseña@host:puerto/nombre_db`.
- Si usas Docker, asegúrate de que el contenedor `zenit-db` esté en ejecución: `docker-compose ps`.

### 2. ¿Qué hago si PM2 no tiene permisos para ejecutar scripts?
**Problema:** Errores de permisos al intentar iniciar procesos con PM2.
**Solución:**
- Asegúrate de que los scripts tengan permisos de ejecución: `chmod +x deploy.sh setup_env.sh test_deploy.sh`.
- Ejecuta PM2 con el usuario actual, no como root, para evitar conflictos de propiedad de archivos.

### 3. ¿Cómo instalo las dependencias de Chromium en un servidor Linux (Ubuntu/Debian)?
**Problema:** Playwright falla porque faltan librerías del sistema para Chromium.
**Solución:**
- Ejecuta el comando oficial de Playwright para instalar dependencias del sistema:
  ```bash
  playwright install-deps chromium
  ```
- O instala manualmente las librerías comunes: `sudo apt-get install libgbm1 libasound2 libnss3 libnspr4`.

### 4. ¿Cómo reinicio las sesiones web si el bot falla en el login?
**Problema:** El bot no puede publicar porque la sesión ha expirado o es inválida.
**Solución:**
- Usa el script de verificación: `python3 check_sessions.py`.
- Si alguna sesión está marcada como `✗ INACTIVA`, abre el navegador localmente con el perfil configurado, realiza el login manualmente en la plataforma correspondiente (YouTube, TikTok, etc.) y cierra el navegador. El bot reutilizará esas cookies.

### 5. ¿El sistema soporta múltiples proyectos simultáneos?
**Sí.** Cada proyecto tiene su propio `projectId`. Puedes configurar diferentes fuentes RSS y configuraciones SEO por proyecto en la base de datos y en los archivos JSON correspondientes.

### 6. ¿Cómo puedo ver los errores detallados del bot?
**Solución:**
- Revisa el archivo de log centralizado: `tail -f zenit_runner.log`.
- Consulta las capturas de pantalla automáticas en `logs/screenshots/` para ver qué estaba ocurriendo en el navegador en el momento del fallo.

---
*Mantenimiento y Soporte Técnico - Cerebro Editorial.*
