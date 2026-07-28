# Bot API Integration Guide

## Overview

Este documento describe los endpoints REST implementados para que `bot_playwright.py` pueda interactuar con el backend de Cerebro Editorial de forma asincrónica y pull-based.

## Endpoints Disponibles

### 1. GET `/api/bot/job/next`

Obtiene el siguiente trabajo PENDING para procesar y lo marca automáticamente como `in_progress`.

**Request:**
```bash
curl -X GET http://localhost:3000/api/bot/job/next
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Job retrieved and marked as in_progress",
  "data": {
    "jobId": 1,
    "type": "youtube_publish",
    "status": "in_progress",
    "payload": {
      "title": "Mi Video",
      "description": "Descripción del video",
      "videoPath": "/path/to/video.mp4"
    },
    "contentPackage": {
      "id": 5,
      "title": "Contenido Editorial",
      "type": "video",
      "content": "...",
      "metadata": {
        "platform": "youtube",
        "tags": ["educación", "tutorial"]
      }
    },
    "campaignId": 2,
    "contentPackageId": 5,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (No Jobs):**
```json
{
  "success": false,
  "message": "No pending jobs available",
  "data": null
}
```

---

### 2. POST `/api/bot/job/:jobId/log`

Actualiza el estado del job y agrega logs paso a paso. Los logs se concatenan con timestamp automático.

**Request:**
```bash
curl -X POST http://localhost:3000/api/bot/job/1/log \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "logs": "Iniciando descarga del video...",
    "progress": 25
  }'
```

**Parameters:**
- `status` (optional): `"pending"`, `"in_progress"`, `"completed"`, `"error"`
- `logs` (optional): Mensaje de log a agregar
- `progress` (optional): Porcentaje de progreso (0-100)
- `message` (optional): Mensaje descriptivo

**Response:**
```json
{
  "success": true,
  "message": "Job logs updated",
  "data": {
    "jobId": 1,
    "status": "in_progress",
    "logsLength": 245
  }
}
```

---

### 3. POST `/api/bot/job/:jobId/complete`

Marca el job como completado, guarda el resultado final, actualiza el content package y opcionalmente actualiza el post en WordPress.

**Request:**
```bash
curl -X POST http://localhost:3000/api/bot/job/1/complete \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "result": {
      "success": true,
      "platform": "youtube",
      "platform_url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "platform_id": "dQw4w9WgXcQ",
      "video_id": "dQw4w9WgXcQ"
    },
    "logs": "Video publicado exitosamente",
    "youtubeUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "wordpressPostId": 42
  }'
```

**Parameters:**
- `status` (required): `"completed"` o `"error"`
- `result` (required): Objeto con resultado de la publicación
  - `success` (boolean): Indica si fue exitoso
  - `platform` (string): Plataforma donde se publicó
  - `platform_url` (optional): URL de la publicación
  - `platform_id` (optional): ID en la plataforma
  - `video_id` (optional): ID del video (para YouTube)
  - `post_id` (optional): ID del post (para WordPress)
  - `error` (optional): Mensaje de error si no fue exitoso
- `logs` (optional): Log final a agregar
- `youtubeUrl` (optional): URL de YouTube para actualizar WordPress
- `wordpressPostId` (optional): ID del post en WordPress a actualizar

**Response:**
```json
{
  "success": true,
  "message": "Job completed and results saved",
  "data": {
    "jobId": 1,
    "status": "completed",
    "result": {
      "success": true,
      "platform": "youtube",
      "platform_url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "platform_id": "dQw4w9WgXcQ",
      "video_id": "dQw4w9WgXcQ"
    },
    "wordpressUpdated": true
  }
}
```

---

### 4. GET `/api/bot/job/:jobId`

Obtiene el estado actual de un job específico.

**Request:**
```bash
curl -X GET http://localhost:3000/api/bot/job/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "youtube_publish",
    "status": "in_progress",
    "payload": { /* ... */ },
    "result": null,
    "logs": "[2024-01-15T10:30:15Z] Iniciando descarga del video...\n[2024-01-15T10:30:45Z] Video descargado",
    "startedAt": "2024-01-15T10:30:00Z",
    "completedAt": null,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 5. GET `/api/bot/jobs/pending`

Lista todos los jobs con estado PENDING.

**Request:**
```bash
curl -X GET http://localhost:3000/api/bot/jobs/pending
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "youtube_publish",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z",
      "campaignId": 2,
      "contentPackageId": 5
    },
    {
      "id": 2,
      "type": "wordpress_publish",
      "status": "pending",
      "createdAt": "2024-01-15T10:35:00Z",
      "campaignId": 2,
      "contentPackageId": 6
    }
  ],
  "count": 2
}
```

---

## Integration Flow

### Flujo Típico de Ejecución

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Bot consulta siguiente job                               │
│    GET /api/bot/job/next                                    │
│    → Job cambia a "in_progress"                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Bot procesa el job paso a paso                           │
│    POST /api/bot/job/:jobId/log (múltiples veces)          │
│    → Se agregan logs con timestamp                          │
│    → Se puede actualizar estado intermedio                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Bot completa el job                                      │
│    POST /api/bot/job/:jobId/complete                       │
│    → Job cambia a "completed" o "error"                     │
│    → Se guarda resultado final                              │
│    → Se actualiza content package                           │
│    → Se actualiza WordPress (si aplica)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Ejemplo de Implementación en Python

```python
import requests
import json
from datetime import datetime

class BotAPIClient:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
    
    def get_next_job(self):
        """Obtiene el siguiente job pendiente"""
        response = requests.get(f"{self.base_url}/api/bot/job/next")
        return response.json()
    
    def add_log(self, job_id, message, status=None, progress=None):
        """Agrega un log al job"""
        payload = {"logs": message}
        if status:
            payload["status"] = status
        if progress is not None:
            payload["progress"] = progress
        
        response = requests.post(
            f"{self.base_url}/api/bot/job/{job_id}/log",
            json=payload
        )
        return response.json()
    
    def complete_job(self, job_id, status, result, youtube_url=None, 
                     wordpress_post_id=None, logs=None):
        """Marca el job como completado"""
        payload = {
            "status": status,
            "result": result,
        }
        if logs:
            payload["logs"] = logs
        if youtube_url:
            payload["youtubeUrl"] = youtube_url
        if wordpress_post_id:
            payload["wordpressPostId"] = wordpress_post_id
        
        response = requests.post(
            f"{self.base_url}/api/bot/job/{job_id}/complete",
            json=payload
        )
        return response.json()
    
    def get_job_status(self, job_id):
        """Obtiene el estado de un job"""
        response = requests.get(f"{self.base_url}/api/bot/job/{job_id}")
        return response.json()


# Uso
client = BotAPIClient()

# 1. Obtener siguiente job
job_response = client.get_next_job()
if job_response["success"]:
    job = job_response["data"]
    job_id = job["jobId"]
    
    # 2. Procesar y agregar logs
    client.add_log(job_id, "Iniciando procesamiento...", status="in_progress", progress=10)
    
    # ... hacer el trabajo ...
    
    client.add_log(job_id, "50% completado", progress=50)
    
    # ... continuar ...
    
    # 3. Completar el job
    result = {
        "success": True,
        "platform": "youtube",
        "platform_url": "https://youtube.com/watch?v=xxx",
        "video_id": "xxx"
    }
    
    client.complete_job(
        job_id,
        status="completed",
        result=result,
        youtube_url="https://youtube.com/watch?v=xxx",
        wordpress_post_id=42
    )
```

---

## Configuración de Variables de Entorno

Para que la actualización automática de WordPress funcione, configura estas variables:

```bash
WORDPRESS_SITE_URL=https://tudominio.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

---

## Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Job #X not found` | El job no existe | Verificar que el jobId sea válido |
| `Invalid jobId` | jobId no es un número | Asegurar que jobId sea un entero |
| `No pending jobs available` | No hay trabajos pendientes | Crear nuevos jobs desde la UI |
| `WordPress credentials not configured` | Faltan variables de entorno | Configurar WORDPRESS_* en .env |
| `WordPress API error: 401` | Credenciales inválidas | Verificar usuario y contraseña de aplicación |

---

## Notas de Implementación

1. **Atomicidad**: El endpoint `/api/bot/job/next` marca el job como `in_progress` de forma atómica para evitar que múltiples bots procesen el mismo job.

2. **Logs Persistentes**: Los logs se concatenan con timestamp automático. Cada línea incluye la hora exacta.

3. **Actualización de WordPress**: Si se proporciona `wordpressPostId` y `youtubeUrl`, el sistema intentará actualizar el post automáticamente. Si falla, se registra como warning pero no falla el job.

4. **Content Package**: Cuando se completa un job, el `content_package` asociado se actualiza automáticamente con:
   - Estado: `published` (si completado) o `draft` (si error)
   - Metadata: URL de YouTube, video ID, timestamp de publicación

5. **Reintentos**: Si un job falla, puede ser reejecutado usando el endpoint tRPC `/api/trpc/automationJobs.rerun`.

---

## Monitoreo

Desde la UI, puedes monitorear los jobs en tiempo real:
- **Dashboard**: Muestra métricas de jobs pendientes, en progreso y completados
- **Jobs Queue**: Lista todos los jobs con sus estados y logs
- **Job Details**: Ver logs completos y resultado final de cada job

---

## Próximas Mejoras

- [ ] Webhooks para notificaciones en tiempo real
- [ ] Retry automático con backoff exponencial
- [ ] Soporte para jobs paralelos
- [ ] Rate limiting por cliente
- [ ] Autenticación API key para bots externos
