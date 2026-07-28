#!/usr/bin/env python3
"""
=============================================================================
CEREBRO EDITORIAL UNIVERSAL (Sistema ZENIT)
Motor de Automatización — bot_playwright.py
=============================================================================

Motor de publicación multicanal para el sistema Cerebro Editorial.
Publica contenido automáticamente en:
  - WordPress (API REST v2)
  - YouTube Studio (Data API v3)
  - TikTok (Content Posting API)
  - Twitter/X (API v2)
  - Facebook (Graph API)
  - Instagram (Graph API)

Autor: Cerebro Editorial
Versión: 1.0.0
"""

import argparse
import json
import os
import sys
import time
import traceback
import random
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


# =============================================================================
# CONFIGURACIÓN GLOBAL
# =============================================================================

class Platform(Enum):
    """Plataformas soportadas por el motor de automatización."""
    WORDPRESS = "wordpress"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"


# Timeout por defecto para peticiones HTTP (segundos)
REQUEST_TIMEOUT = 30

# Sesión HTTP reutilizable con reintentos automáticos
_session = requests.Session()
_retry = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)
_adapter = HTTPAdapter(max_retries=_retry)
_session.mount("https://", _adapter)
_session.mount("http://", _adapter)


# =============================================================================
# BASE DE DATOS DE CREDENCIALES (carga desde config.json)
# =============================================================================

def load_credentials(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Carga las credenciales desde un archivo de configuración JSON.

    Estructura esperada:
    {
        "wordpress": {
            "site_url": "https://misitio.com",
            "username": "admin",
            "application_password": "xxxx-xxxx-xxxx-xxxx"
        },
        "youtube": {
            "client_id": "...",
            "client_secret": "...",
            "refresh_token": "..."
        },
        "tiktok": {
            "client_key": "...",
            "client_secret": "...",
            "access_token": "..."
        },
        "twitter": {
            "api_key": "...",
            "api_secret": "...",
            "access_token": "...",
            "access_token_secret": "..."
        },
        "facebook": {
            "page_id": "...",
            "access_token": "..."
        },
        "instagram": {
            "business_account_id": "...",
            "access_token": "..."
        }
    }
    """
    if config_path is None:
        config_path = os.environ.get("ZENIT_CONFIG_PATH", "config.json")

    config_file = Path(config_path)
    if not config_file.exists():
        print(f"[WARN] Archivo de configuración no encontrado: {config_path}")
        return {}

    with open(config_file, "r", encoding="utf-8") as f:
        return json.load(f)


# =============================================================================
# CLASE BASE PARA PUBLICADORES
# =============================================================================

class BasePublisher:
    """Clase base para todos los publicadores de plataformas."""

    def __init__(self, credentials: Dict[str, Any]):
        self.credentials = credentials

    def validate_credentials(self) -> bool:
        """Verifica que las credenciales necesarias estén presentes."""
        raise NotImplementedError

    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publica contenido en la plataforma.

        Args:
            content: Diccionario con los datos del contenido a publicar.

        Returns:
            Dict con:
              - success: bool
              - platform_url: str (URL del contenido publicado)
              - platform_id: str (ID del contenido en la plataforma)
              - error: str (mensaje de error si aplica)
        """
        raise NotImplementedError

    def check_status(self, platform_id: str) -> Dict[str, Any]:
        """Verifica el estado de una publicación existente."""
        raise NotImplementedError

    def _log(self, msg: str, level: str = "INFO"):
        """Registra un mensaje con timestamp."""
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] [{level}] [{self.__class__.__name__}] {msg}")

    def _take_screenshot(self, name: str):
        """Captura una pantalla en caso de fallo si Playwright está disponible."""
        if not PLAYWRIGHT_AVAILABLE:
            return
        
        try:
            log_dir = Path("logs/screenshots")
            log_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = log_dir / f"{name}_{timestamp}.png"
            
            with sync_playwright() as p:
                # Nota: Esto es un ejemplo, en producción se usaría el browser ya abierto
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                # Si tenemos una URL relevante, navegaría aquí
                # page.goto(url)
                page.screenshot(path=str(filename))
                browser.close()
                self._log(f"Captura de pantalla guardada: {filename}", "DEBUG")
        except Exception as e:
            self._log(f"Error al tomar captura de pantalla: {str(e)}", "WARN")

    def _with_retry(self, func, max_retries: int = 5, initial_delay: float = 1.0):
        """Ejecuta una función con reintentos exponenciales y jitter."""
        retries = 0
        while retries < max_retries:
            try:
                return func()
            except Exception as e:
                retries += 1
                if retries >= max_retries:
                    self._log(f"Máximo de reintentos alcanzado ({max_retries}). Error final: {str(e)}", "ERROR")
                    raise e
                
                # Backoff exponencial con jitter: delay = initial_delay * 2^retries + random_jitter
                delay = initial_delay * (2 ** retries) + random.uniform(0, 1)
                
                # Detección de Rate Limit (429)
                is_rate_limit = "429" in str(e) or "rate limit" in str(e).lower()
                if is_rate_limit:
                    self._log(f"Límite de tarifa detectado. Esperando {delay*2:.2f}s...", "WARN")
                    time.sleep(delay * 2) # Doble espera para rate limits
                else:
                    self._log(f"Error detectado: {str(e)}. Reintentando en {delay:.2f}s... (Intento {retries}/{max_retries})", "WARN")
                    time.sleep(delay)


# =============================================================================
# 1. PUBLICADOR WORDPRESS (API REST v2)
# =============================================================================

class WordPressPublisher(BasePublisher):
    """
    Publica artículos en WordPress usando la API REST v2.

    Métodos soportados:
      - Crear borrador
      - Publicar inmediatamente
      - Programar publicación
      - Actualizar post existente
      - Subir medios (imágenes/vídeos)

    Autenticación: Application Passwords (nativo en WP 5.6+)
    """

    REQUIRED_FIELDS = ["site_url", "username", "application_password"]

    def validate_credentials(self) -> bool:
        for field in self.REQUIRED_FIELDS:
            if not self.credentials.get(field):
                self._log(f"Campo obligatorio faltante: {field}", "ERROR")
                return False
        return True

    def _get_base_url(self) -> str:
        base = self.credentials["site_url"].rstrip("/")
        return f"{base}/wp-json/wp/v2"

    def _auth_header(self) -> Dict[str, str]:
        """Genera el header de autenticación Basic Auth."""
        from base64 import b64encode
        user = self.credentials["username"]
        password = self.credentials["application_password"]
        encoded = b64encode(f"{user}:{password}".encode()).decode()
        return {"Authorization": f"Basic {encoded}"}

    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publica un artículo en WordPress.

        Parámetros esperados en content:
          - title: str (título del post)
          - body: str (contenido en HTML)
          - status: str ("draft" | "publish" | "future")
          - categories: List[int] (IDs de categorías, opcional)
          - tags: List[int] (IDs de tags, opcional)
          - featured_media: int (ID de imagen destacada, opcional)
          - date: str (fecha para 'future': "2024-01-01T12:00:00", opcional)
          - excerpt: str (extracto, opcional)
          - slug: str (slug personalizado, opcional)
          - meta: Dict (meta fields personalizados, opcional)
          - media_url: str (URL de imagen para subir, opcional)
        """
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales de WordPress incompletas"}

        base_url = self._get_base_url()
        headers = {
            **self._auth_header(),
            "Content-Type": "application/json",
        }

        # Subir media si se proporciona media_url
        media_id = None
        if content.get("media_url"):
            media_id = self._upload_media(content["media_url"], headers, base_url)
            if media_id is None:
                return {"success": False, "error": "Error al subir media"}

        # Construir el payload del post
        post_data = {
            "title": content.get("title", ""),
            "content": content.get("body", ""),
            "status": content.get("status", "draft"),
        }

        if content.get("categories"):
            post_data["categories"] = content["categories"]
        if content.get("tags"):
            post_data["tags"] = content["tags"]
        if media_id:
            post_data["featured_media"] = media_id
        if content.get("excerpt"):
            post_data["excerpt"] = content["excerpt"]
        if content.get("slug"):
            post_data["slug"] = content["slug"]
        if content.get("meta"):
            post_data["meta"] = content["meta"]

        # Programar para futuro si se proporciona fecha y status es 'future'
        if content.get("status") == "future" and content.get("date"):
            post_data["date"] = content["date"]

        try:
            self._log(f"Publicando en WordPress: '{post_data['title'][:50]}...'")
            resp = _session.post(
                f"{base_url}/posts",
                json=post_data,
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code in (200, 201):
                post = resp.json()
                self._log(f"Post publicado exitosamente. ID: {post.get('id')}")
                return {
                    "success": True,
                    "platform": Platform.WORDPRESS.value,
                    "platform_url": post.get("link", ""),
                    "platform_id": str(post.get("id", "")),
                    "post_url": post.get("link", ""),
                    "edit_url": post.get("link", "").replace("?p=", "?p="),
                }
            else:
                error_msg = resp.json().get("message", resp.text) if resp.text else f"HTTP {resp.status_code}"
                self._log(f"Error al publicar: {error_msg}", "ERROR")
                return {"success": False, "error": f"WordPress API error: {error_msg}"}

        except requests.RequestException as e:
            self._log(f"Error de conexión: {str(e)}", "ERROR")
            return {"success": False, "error": f"Connection error: {str(e)}"}

    def _upload_media(self, media_url: str, headers: Dict, base_url: str) -> Optional[int]:
        """Sube un archivo de media a WordPress."""
        try:
            # Descargar el archivo
            media_resp = _session.get(media_url, timeout=REQUEST_TIMEOUT, stream=True)
            if media_resp.status_code != 200:
                self._log(f"No se pudo descargar media de {media_url}", "ERROR")
                return None

            # Determinar el tipo MIME
            content_type = media_resp.headers.get("Content-Type", "application/octet-stream")
            filename = media_url.split("/")[-1].split("?")[0]

            headers_upload = {
                **self._auth_header(),
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": content_type,
            }

            resp = _session.post(
                f"{base_url}/media",
                data=media_resp.content,
                headers=headers_upload,
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code in (200, 201):
                media = resp.json()
                self._log(f"Media subido exitosamente. ID: {media.get('id')}")
                return media.get("id")
            else:
                self._log(f"Error al subir media: {resp.text[:200]}", "ERROR")
                return None

        except requests.RequestException as e:
            self._log(f"Error al subir media: {str(e)}", "ERROR")
            return None

    def update_post(self, post_id: int, content: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza un post existente."""
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales incompletas"}

        base_url = self._get_base_url()
        headers = {
            **self._auth_header(),
            "Content-Type": "application/json",
        }

        update_data = {}
        if "title" in content:
            update_data["title"] = content["title"]
        if "body" in content:
            update_data["content"] = content["body"]
        if "status" in content:
            update_data["status"] = content["status"]
        if "categories" in content:
            update_data["categories"] = content["categories"]
        if "tags" in content:
            update_data["tags"] = content["tags"]
        if "excerpt" in content:
            update_data["excerpt"] = content["excerpt"]
        if "date" in content:
            update_data["date"] = content["date"]

        try:
            resp = _session.post(
                f"{base_url}/posts/{post_id}",
                json=update_data,
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                post = resp.json()
                self._log(f"Post #{post_id} actualizado exitosamente")
                return {"success": True, "platform_url": post.get("link", "")}
            else:
                error_msg = resp.json().get("message", resp.text)
                return {"success": False, "error": f"Error: {error_msg}"}

        except requests.RequestException as e:
            return {"success": False, "error": f"Connection error: {str(e)}"}

    def delete_post(self, post_id: int) -> Dict[str, Any]:
        """Elimina un post de WordPress."""
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales incompletas"}

        base_url = self._get_base_url()
        headers = {
            **self._auth_header(),
            "Content-Type": "application/json",
        }

        try:
            resp = _session.delete(
                f"{base_url}/posts/{post_id}?force=true",
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                self._log(f"Post #{post_id} eliminado exitosamente")
                return {"success": True}
            else:
                return {"success": False, "error": f"Error: {resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": f"Connection error: {str(e)}"}

    def get_post(self, post_id: int) -> Dict[str, Any]:
        """Obtiene los datos de un post existente."""
        base_url = self._get_base_url()
        try:
            resp = _session.get(
                f"{base_url}/posts/{post_id}",
                timeout=REQUEST_TIMEOUT,
            )
            if resp.status_code == 200:
                return {"success": True, "data": resp.json()}
            return {"success": False, "error": f"HTTP {resp.status_code}"}
        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def list_posts(self, per_page: int = 10, status: str = "publish") -> Dict[str, Any]:
        """Lista posts de WordPress."""
        base_url = self._get_base_url()
        try:
            resp = _session.get(
                f"{base_url}/posts",
                params={"per_page": per_page, "status": status},
                timeout=REQUEST_TIMEOUT,
            )
            if resp.status_code == 200:
                return {"success": True, "data": resp.json()}
            return {"success": False, "error": f"HTTP {resp.status_code}"}
        except requests.RequestException as e:
            return {"success": False, "error": str(e)}


# =============================================================================
# 2. PUBLICADOR YOUTUBE (Data API v3)
# =============================================================================

class YouTubePublisher(BasePublisher):
    """
    Publica videos en YouTube usando la Google Data API v3.

    Métodos soportados:
      - Subir video (upload)
      - Programar video
      - Actualizar metadata del video
      - Consultar estado de subida
      - Eliminar video

    Autenticación: OAuth 2.0 con refresh token
    """

    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
    YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"

    REQUIRED_FIELDS = ["client_id", "client_secret", "refresh_token"]

    def validate_credentials(self) -> bool:
        for field in self.REQUIRED_FIELDS:
            if not self.credentials.get(field):
                self._log(f"Campo obligatorio faltante: {field}", "ERROR")
                return False
        return True

    def _get_access_token(self) -> Optional[str]:
        """Obtiene un access token fresco usando el refresh token."""
        try:
            resp = _session.post(
                self.GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.credentials["client_id"],
                    "client_secret": self.credentials["client_secret"],
                    "refresh_token": self.credentials["refresh_token"],
                    "grant_type": "refresh_token",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                token_data = resp.json()
                return token_data.get("access_token")
            else:
                self._log(f"Error al refrescar token: {resp.text[:200]}", "ERROR")
                return None

        except requests.RequestException as e:
            self._log(f"Error de conexión al obtener token: {str(e)}", "ERROR")
            return None

    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sube un video a YouTube.

        Parámetros esperados en content:
          - video_path: str (ruta local al archivo de video)
          - video_url: str (URL del video a descargar primero)
          - title: str (título del video)
          - description: str (descripción)
          - tags: List[str] (tags del video)
          - category_id: str (ID de categoría, default: "22")
          - privacy_status: str ("private" | "unlisted" | "public", default: "private")
          - scheduled_start_time: str (ISO 8601 para programar, opcional)
          - thumbnail_url: str (URL de la thumbnail, opcional)
          - made_for_kids: bool (opcional)
        """
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales de YouTube incompletas"}

        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "No se pudo obtener access token"}

        # Obtener o descargar el video
        video_path = content.get("video_path")
        if not video_path and content.get("video_url"):
            video_path = self._download_video(content["video_url"])
            if not video_path:
                return {"success": False, "error": "No se pudo descargar el video"}

        if not video_path or not Path(video_path).exists():
            return {"success": False, "error": "No se encontró el archivo de video"}

        # Construir metadata
        metadata = {
            "snippet": {
                "title": content.get("title", "Sin título"),
                "description": content.get("description", ""),
                "tags": content.get("tags", []),
                "categoryId": content.get("category_id", "22"),
            },
            "status": {
                "privacyStatus": content.get("privacy_status", "private"),
                "selfDeclaredMadeForKids": content.get("made_for_kids", False),
            },
        }

        # Programar video si se proporciona fecha
        if content.get("scheduled_start_time"):
            metadata["status"]["privacyStatus"] = "private"
            metadata["status"]["publishAt"] = content["scheduled_start_time"]

        headers = {
            "Authorization": f"Bearer {access_token}",
        }

        try:
            self._log(f"Subiendo video a YouTube: '{metadata['snippet']['title'][:50]}...'")

            # Upload del video
            with open(video_path, "rb") as video_file:
                resp = _session.post(
                    self.YOUTUBE_UPLOAD_URL,
                    params={
                        "uploadType": "resumable",
                        "part": "snippet,status",
                    },
                    headers={
                        **headers,
                        "X-Upload-Content-Type": "video/*",
                        "X-Upload-Content-Length": str(Path(video_path).stat().st_size),
                    },
                    timeout=REQUEST_TIMEOUT,
                )

                if resp.status_code not in (200, 201):
                    return {"success": False, "error": f"Error al iniciar upload: HTTP {resp.status_code}"}

                # Segunda fase: subir el contenido
                upload_url = resp.headers.get("Location")
                if not upload_url:
                    return {"success": False, "error": "No se obtuvo URL de upload"}

                with open(video_path, "rb") as video_file:
                    upload_resp = _session.put(
                        upload_url,
                        data=video_file,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "video/*",
                        },
                        timeout=3600,  # Videos grandes pueden tardar
                    )

                if upload_resp.status_code in (200, 201):
                    video_data = upload_resp.json()
                    video_id = video_data.get("id", "")
                    self._log(f"Video subido exitosamente. ID: {video_id}")

                    # Subir thumbnail si se proporciona
                    if content.get("thumbnail_url"):
                        self._upload_thumbnail(video_id, access_token, content["thumbnail_url"])

                    return {
                        "success": True,
                        "platform": Platform.YOUTUBE.value,
                        "platform_id": video_id,
                        "platform_url": f"https://youtube.com/watch?v={video_id}",
                        "video_id": video_id,
                    }
                else:
                    error_msg = upload_resp.text[:200]
                    self._log(f"Error en upload de video: {error_msg}", "ERROR")
                    return {"success": False, "error": f"Upload error: {error_msg}"}

        except requests.RequestException as e:
            self._log(f"Error de conexión: {str(e)}", "ERROR")
            return {"success": False, "error": f"Connection error: {str(e)}"}

    def _download_video(self, video_url: str) -> Optional[str]:
        """Descarga un video desde una URL."""
        try:
            self._log(f"Descargando video desde: {video_url}")
            resp = _session.get(video_url, timeout=REQUEST_TIMEOUT, stream=True)
            if resp.status_code == 200:
                tmp_path = f"/tmp/youtube_upload_{int(time.time())}.mp4"
                with open(tmp_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                self._log(f"Video descargado: {tmp_path}")
                return tmp_path
            return None
        except requests.RequestException as e:
            self._log(f"Error al descargar video: {str(e)}", "ERROR")
            return None

    def _upload_thumbnail(self, video_id: str, access_token: str, thumbnail_url: str):
        """Sube una thumbnail para un video existente."""
        try:
            # Descargar thumbnail
            thumb_resp = _session.get(thumbnail_url, timeout=REQUEST_TIMEOUT)
            if thumb_resp.status_code != 200:
                return

            # Subir thumbnail
            resp = _session.post(
                f"{self.YOUTUBE_API_URL}/thumbnails/set",
                params={"videoId": video_id},
                headers={"Authorization": f"Bearer {access_token}"},
                files={"media": ("thumbnail.jpg", thumb_resp.content, "image/jpeg")},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code in (200, 201):
                self._log(f"Thumbnail subida para video {video_id}")
            else:
                self._log(f"Error al subir thumbnail: {resp.text[:100]}", "WARN")

        except requests.RequestException as e:
            self._log(f"Error al subir thumbnail: {str(e)}", "WARN")

    def update_video(self, video_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza la metadata de un video existente."""
        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "No se pudo obtener access token"}

        patch_data = {"id": video_id, "snippet": {}, "status": {}}

        if "title" in metadata:
            patch_data["snippet"]["title"] = metadata["title"]
        if "description" in metadata:
            patch_data["snippet"]["description"] = metadata["description"]
        if "tags" in metadata:
            patch_data["snippet"]["tags"] = metadata["tags"]
        if "privacy_status" in metadata:
            patch_data["status"]["privacyStatus"] = metadata["privacy_status"]

        try:
            resp = _session.put(
                f"{self.YOUTUBE_API_URL}/videos",
                params={"part": "snippet,status"},
                json=patch_data,
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code in (200, 201):
                self._log(f"Video {video_id} actualizado exitosamente")
                return {"success": True}
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def delete_video(self, video_id: str) -> Dict[str, Any]:
        """Elimina un video de YouTube."""
        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "No se pudo obtener access token"}

        try:
            resp = _session.delete(
                f"{self.YOUTUBE_API_URL}/videos",
                params={"id": video_id},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 204:
                self._log(f"Video {video_id} eliminado exitosamente")
                return {"success": True}
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def check_status(self, video_id: str) -> Dict[str, Any]:
        """Verifica el estado de un video en YouTube."""
        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "No se pudo obtener access token"}

        try:
            resp = _session.get(
                f"{self.YOUTUBE_API_URL}/videos",
                params={"id": video_id, "part": "status,snippet"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if items:
                    video = items[0]
                    return {
                        "success": True,
                        "status": video.get("status", {}),
                        "processing_status": video.get("status", {}).get("uploadStatus"),
                        "privacy": video.get("status", {}).get("privacyStatus"),
                        "title": video.get("snippet", {}).get("title", ""),
                    }
                return {"success": False, "error": "Video no encontrado"}
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}


# =============================================================================
# 3. PUBLICADOR TIKTOK (Content Posting API)
# =============================================================================

class TikTokPublisher(BasePublisher):
    """
    Publica videos en TikTok usando el Content Posting API.

    Métodos soportados:
      - Subir video (upload)
      - Publicar directamente (direct post)
      - Consultar estado de subida
      - Subir fotos/carousel

    Autenticación: OAuth 2.0 con access token
    """

    TIKTOK_API_BASE = "https://open.tiktokapis.com/v2/post/publish/"
    TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"

    REQUIRED_FIELDS = ["client_key", "client_secret", "access_token"]

    def validate_credentials(self) -> bool:
        for field in self.REQUIRED_FIELDS:
            if not self.credentials.get(field):
                self._log(f"Campo obligatorio faltante: {field}", "ERROR")
                return False
        return True

    def _get_access_token(self) -> Optional[str]:
        """Obtiene un access token fresco."""
        if self.credentials.get("access_token"):
            return self.credentials["access_token"]

        try:
            resp = _session.post(
                self.TIKTOK_TOKEN_URL,
                data={
                    "client_key": self.credentials["client_key"],
                    "client_secret": self.credentials["client_secret"],
                    "grant_type": "authorization_code",
                    "code": self.credentials.get("auth_code", ""),
                },
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                token_data = resp.json().get("data", {})
                return token_data.get("access_token")
            return None

        except requests.RequestException as e:
            self._log(f"Error al obtener token TikTok: {str(e)}", "ERROR")
            return None

    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publica un video en TikTok.

        Parámetros esperados en content:
          - video_path: str (ruta local al archivo)
          - video_url: str (URL del video)
          - title: str (descripción del video)
          - privacy_level: str ("PUBLIC_TO_ALL" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY")
          - disable_duet: bool
          - disable_comment: bool
          - disable_stitch: bool
          - brand_content_toggle: bool
          - brand_organic_toggle: bool
          - video_cover_timestamp: int (segundo de la portada)
        """
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales de TikTok incompletas"}

        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "No se pudo obtener access token"}

        # Obtener el archivo de video
        video_path = content.get("video_path")
        if not video_path and content.get("video_url"):
            video_path = self._download_video(content["video_url"])
            if not video_path:
                return {"success": False, "error": "No se pudo descargar el video"}

        if not video_path or not Path(video_path).exists():
            return {"success": False, "error": "No se encontró el archivo de video"}

        try:
            # Paso 1: Inicializar la subida
            self._log("Iniciando subida a TikTok...")

            init_resp = _session.post(
                f"{self.TIKTOK_API_BASE}video/upload/init/",
                json={
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "video_url": content.get("video_url", ""),
                    },
                }
                if content.get("video_url")
                else {
                    "post_info": {
                        "title": content.get("title", ""),
                        "privacy_level": content.get("privacy_level", "PUBLIC_TO_ALL"),
                        "disable_duet": content.get("disable_duet", False),
                        "disable_comment": content.get("disable_comment", False),
                        "disable_stitch": content.get("disable_stitch", False),
                    },
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if init_resp.status_code != 200:
                error_data = init_resp.json() if init_resp.text else {}
                self._log(f"Error en init: {error_data}", "ERROR")
                return {"success": False, "error": f"TikTok init error: {init_resp.text[:200]}"}

            init_data = init_resp.json().get("data", {})
            publish_id = init_data.get("publish_id", "")

            if not publish_id:
                return {"success": False, "error": "No se obtuvo publish_id"}

            # Paso 2: Subir el video (si no es PULL_FROM_URL)
            if not content.get("video_url"):
                upload_resp = self._upload_video_chunk(access_token, publish_id, video_path)
                if not upload_resp.get("success"):
                    return upload_resp

            # Paso 3: Crear el post
            post_data = {
                "post_info": {
                    "title": content.get("title", ""),
                    "privacy_level": content.get("privacy_level", "PUBLIC_TO_ALL"),
                    "disable_duet": content.get("disable_duet", False),
                    "disable_comment": content.get("disable_comment", False),
                    "disable_stitch": content.get("disable_stitch", False),
                    "brand_content_toggle": content.get("brand_content_toggle", False),
                    "brand_organic_toggle": content.get("brand_organic_toggle", False),
                },
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "video_url": content.get("video_url", ""),
                }
                if content.get("video_url")
                else {
                    "source": "UPLOAD_VIDEO",
                    "video_id": init_data.get("video_id", ""),
                },
            }

            if content.get("video_cover_timestamp"):
                post_data["post_info"]["video_cover_timestamp"] = content["video_cover_timestamp"]

            create_resp = _session.post(
                f"{self.TIKTOK_API_BASE}video/publish/",
                json=post_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if create_resp.status_code == 200:
                result = create_resp.json().get("data", {})
                publish_id_final = result.get("publish_id", publish_id)
                self._log(f"Video publicado en TikTok. Publish ID: {publish_id_final}")

                return {
                    "success": True,
                    "platform": Platform.TIKTOK.value,
                    "platform_id": publish_id_final,
                    "platform_url": f"https://www.tiktok.com/p/{publish_id_final}",
                    "publish_id": publish_id_final,
                }
            else:
                error_msg = create_resp.text[:200]
                self._log(f"Error al crear post: {error_msg}", "ERROR")
                return {"success": False, "error": f"TikTok publish error: {error_msg}"}

        except requests.RequestException as e:
            self._log(f"Error de conexión: {str(e)}", "ERROR")
            return {"success": False, "error": f"Connection error: {str(e)}"}

    def _upload_video_chunk(self, access_token: str, publish_id: str, video_path: str) -> Dict[str, Any]:
        """Sube el video por chunks."""
        try:
            file_path = Path(video_path)
            file_size = file_path.stat().st_size
            chunk_size = 5 * 1024 * 1024  # 5MB chunks

            offset = 0
            with open(video_path, "rb") as f:
                while offset < file_size:
                    chunk = f.read(chunk_size)
                    chunk_end = offset + len(chunk) - 1

                    headers = {
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "video/mp4",
                    }

                    resp = _session.put(
                        f"{self.TIKTOK_API_BASE}video/upload/",
                        headers=headers,
                        data=chunk,
                        params={
                            "publish_id": publish_id,
                            "offset": str(offset),
                            "total_size": str(file_size),
                        },
                        timeout=REQUEST_TIMEOUT,
                    )

                    if resp.status_code != 200:
                        return {"success": False, "error": f"Error en chunk upload: HTTP {resp.status_code}"}

                    offset = chunk_end + 1
                    self._log(f"Chunk subido: {offset}/{file_size}")

            self._log("Video subido completamente")
            return {"success": True}

        except requests.RequestException as e:
            return {"success": False, "error": f"Chunk upload error: {str(e)}"}

    def _download_video(self, video_url: str) -> Optional[str]:
        """Descarga un video desde una URL."""
        try:
            resp = _session.get(video_url, timeout=REQUEST_TIMEOUT, stream=True)
            if resp.status_code == 200:
                tmp_path = f"/tmp/tiktok_upload_{int(time.time())}.mp4"
                with open(tmp_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                return tmp_path
            return None
        except requests.RequestException:
            return None

    def check_status(self, publish_id: str) -> Dict[str, Any]:
        """Verifica el estado de una publicación."""
        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "No se pudo obtener access token"}

        try:
            resp = _session.get(
                f"{self.TIKTOK_API_BASE}video/query/",
                params={"publish_id": publish_id},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                data = resp.json().get("data", {})
                return {
                    "success": True,
                    "status": data.get("status", "UNKNOWN"),
                    "public_id": data.get("public_id", ""),
                    "platform_url": f"https://www.tiktok.com/p/{data.get('public_id', '')}",
                }
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def upload_photo(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sube una foto o carousel a TikTok.

        Parámetros esperados:
          - image_paths: List[str] (rutas locales a las imágenes, máx 35)
          - image_urls: List[str] (URLs de las imágenes, máx 35)
          - title: str (descripción)
          - privacy_level: str
        """
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales incompletas"}

        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "No se pudo obtener access token"}

        try:
            # Preparar lista de imágenes
            image_data = []
            for url in content.get("image_urls", []):
                image_data.append({"source": "PULL_FROM_URL", "image_url": url})

            if not image_data:
                return {"success": False, "error": "No se proporcionaron imágenes"}

            # Inicializar
            init_resp = _session.post(
                f"{self.TIKTOK_API_BASE}photo/upload/init/",
                json={
                    "post_info": {
                        "title": content.get("title", ""),
                        "privacy_level": content.get("privacy_level", "PUBLIC_TO_ALL"),
                    },
                    "image_data": image_data,
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if init_resp.status_code != 200:
                return {"success": False, "error": f"Init error: {init_resp.text[:200]}"}

            publish_id = init_resp.json().get("data", {}).get("publish_id", "")

            # Crear post
            create_resp = _session.post(
                f"{self.TIKTOK_API_BASE}photo/publish/",
                json={
                    "post_info": {
                        "title": content.get("title", ""),
                        "privacy_level": content.get("privacy_level", "PUBLIC_TO_ALL"),
                    },
                    "publish_id": publish_id,
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if create_resp.status_code == 200:
                return {
                    "success": True,
                    "platform": Platform.TIKTOK.value,
                    "publish_id": publish_id,
                }
            return {"success": False, "error": f"Publish error: {create_resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}


# =============================================================================
# 4. PUBLICADOR TWITTER/X (API v2)
# =============================================================================

class TwitterPublisher(BasePublisher):
    """
    Publica tweets en Twitter/X usando la API v2.

    Métodos soportados:
      - Publicar tweet (texto + media)
      - Publicar hilo (thread)
      - Publicar con encuesta (poll)
      - Citar tweet
      - Eliminar tweet
      - Subir media

    Autenticación: OAuth 1.0a o Bearer Token
    """

    TWITTER_API_BASE = "https://api.twitter.com/2"
    TWITTER_UPLOAD_BASE = "https://upload.twitter.com/1.1"

    REQUIRED_FIELDS = ["api_key", "api_secret", "access_token", "access_token_secret"]

    def validate_credentials(self) -> bool:
        for field in self.REQUIRED_FIELDS:
            if not self.credentials.get(field):
                self._log(f"Campo obligatorio faltante: {field}", "ERROR")
                return False
        return True

    def _get_auth_params(self) -> Dict[str, str]:
        """Obtiene los parámetros de autenticación OAuth 1.0a."""
        import hmac
        import hashlib
        import base64
        import secrets
        from urllib.parse import quote

        api_key = self.credentials["api_key"]
        api_secret = self.credentials["api_secret"]
        access_token = self.credentials["access_token"]
        access_token_secret = self.credentials["access_token_secret"]

        timestamp = str(int(time.time()))
        nonce = secrets.token_hex(16)

        return {
            "oauth_consumer_key": api_key,
            "oauth_token": access_token,
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": timestamp,
            "oauth_nonce": nonce,
            "oauth_version": "1.0",
        }

    def _sign_request(self, method: str, url: str, params: Dict[str, str],
                      api_secret: str, access_token_secret: str) -> str:
        """Firma una petición OAuth 1.0a."""
        import hmac
        import hashlib
        import base64
        from urllib.parse import quote, urlencode

        signing_key = f"{quote(api_secret, safe='~')}~{quote(access_token_secret, safe='~')}"

        base_params = dict(params)
        sorted_params = urlencode(sorted(base_params.items()), quote_via=quote)
        base_string = f"{method.upper()}&{quote(url, safe='~')}&{quote(sorted_params, safe='~')}"

        signature = base64.b64encode(
            hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
        ).decode()

        return signature

    def _build_auth_header(self, method: str, url: str, extra_params: Optional[Dict] = None) -> str:
        """Construye el header Authorization para OAuth 1.0a."""
        from urllib.parse import quote

        params = self._get_auth_params()
        if extra_params:
            params.update(extra_params)

        api_secret = self.credentials["api_secret"]
        access_token_secret = self.credentials["access_token_secret"]

        signature = self._sign_request(method, url, params, api_secret, access_token_secret)
        params["oauth_signature"] = signature

        # Construir header
        auth_parts = []
        for key, value in sorted(params.items()):
            auth_parts.append(f'{quote(key, safe="~")}="{quote(value, safe="~")}"')

        return "OAuth " + ", ".join(auth_parts)

    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publica un tweet en Twitter/X.

        Parámetros esperados en content:
          - text: str (texto del tweet, máx 280 caracteres)
          - reply_to: str (tweet_id para responder, opcional)
          - quote_tweet_id: str (tweet_id para citar, opcional)
          - media_ids: List[str] (IDs de media subidos, opcional)
          - poll: Dict (configuración de encuesta, opcional)
          - place_id: str (ubicación, opcional)
        """
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales de Twitter incompletas"}

        url = f"{self.TWITTER_API_BASE}/tweets"
        auth_header = self._build_auth_header("POST", url)

        tweet_data = {
            "text": content.get("text", ""),
        }

        if content.get("reply_to"):
            tweet_data["reply"] = {"in_reply_to_tweet_id": content["reply_to"]}
        if content.get("quote_tweet_id"):
            tweet_data["quote_tweet_id"] = content["quote_tweet_id"]
        if content.get("media_ids"):
            tweet_data["media"] = {"media_ids": content["media_ids"]}
        if content.get("poll"):
            tweet_data["poll"] = content["poll"]
        if content.get("place_id"):
            tweet_data["geo"] = {"place_id": content["place_id"]}

        try:
            self._log(f"Publicando tweet: '{tweet_data['text'][:50]}...'")

            resp = _session.post(
                url,
                json=tweet_data,
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code in (200, 201):
                result = resp.json().get("data", {})
                tweet_id = result.get("id", "")
                self._log(f"Tweet publicado exitosamente. ID: {tweet_id}")
                return {
                    "success": True,
                    "platform": Platform.TWITTER.value,
                    "platform_id": tweet_id,
                    "platform_url": f"https://twitter.com/i/status/{tweet_id}",
                    "tweet_id": tweet_id,
                }
            else:
                error_data = resp.json() if resp.text else {}
                error_msg = error_data.get("title", resp.text[:200])
                self._log(f"Error al publicar tweet: {error_msg}", "ERROR")
                return {"success": False, "error": f"Twitter API error: {error_msg}"}

        except requests.RequestException as e:
            self._log(f"Error de conexión: {str(e)}", "ERROR")
            return {"success": False, "error": f"Connection error: {str(e)}"}

    def publish_thread(self, tweets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Publica un hilo de tweets.

        Args:
            tweets: Lista de dicts con 'text' para cada tweet del hilo.
        """
        if not tweets:
            return {"success": False, "error": "No hay tweets para publicar"}

        results = []
        parent_tweet_id = None

        for i, tweet_data in enumerate(tweets):
            payload = {"text": tweet_data.get("text", "")}
            if parent_tweet_id:
                payload["reply"] = {"in_reply_to_tweet_id": parent_tweet_id}

            url = f"{self.TWITTER_API_BASE}/tweets"
            auth_header = self._build_auth_header("POST", url)

            try:
                resp = _session.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                    },
                    timeout=REQUEST_TIMEOUT,
                )

                if resp.status_code in (200, 201):
                    result = resp.json().get("data", {})
                    tweet_id = result.get("id", "")
                    parent_tweet_id = tweet_id
                    results.append({"index": i, "tweet_id": tweet_id, "success": True})
                else:
                    results.append({"index": i, "success": False, "error": resp.text[:200]})
                    break

            except requests.RequestException as e:
                results.append({"index": i, "success": False, "error": str(e)})
                break

        successful = sum(1 for r in results if r.get("success"))
        self._log(f"Hilo publicado: {successful}/{len(tweets)} tweets")

        return {
            "success": True,
            "platform": Platform.TWITTER.value,
            "thread_id": results[0].get("tweet_id", ""),
            "tweet_count": successful,
            "tweets": results,
        }

    def upload_media(self, media_path: str) -> Optional[str]:
        """Sube un archivo de media a Twitter y retorna el media_id."""
        try:
            # Fase 1: INIT
            file_size = Path(media_path).stat().st_size
            mime_type = "image/jpeg" if media_path.endswith((".jpg", ".jpeg")) else \
                        "image/png" if media_path.endswith(".png") else \
                        "video/mp4" if media_path.endswith(".mp4") else \
                        "image/gif" if media_path.endswith(".gif") else "application/octet-stream"

            init_url = f"{self.TWITTER_UPLOAD_BASE}/media/upload.json"
            auth_header = self._build_auth_header("POST", init_url)

            init_resp = _session.post(
                init_url,
                headers={"Authorization": auth_header},
                data={
                    "command": "INIT",
                    "total_bytes": str(file_size),
                    "media_type": mime_type,
                },
                timeout=REQUEST_TIMEOUT,
            )

            if init_resp.status_code != 200:
                self._log(f"Error en INIT: {init_resp.text[:200]}", "ERROR")
                return None

            media_id = init_resp.json().get("media_id_string")

            # Fase 2: APPEND
            with open(media_path, "rb") as f:
                chunk_index = 0
                while True:
                    chunk = f.read(5 * 1024 * 1024)  # 5MB chunks
                    if not chunk:
                        break

                    auth_header = self._build_auth_header("POST", init_url)
                    _session.post(
                        init_url,
                        headers={"Authorization": auth_header},
                        data={
                            "command": "APPEND",
                            "media_id": media_id,
                            "segment_index": str(chunk_index),
                        },
                        files={"media_data": chunk},
                        timeout=REQUEST_TIMEOUT,
                    )
                    chunk_index += 1

            # Fase 3: FINALIZE
            auth_header = self._build_auth_header("POST", init_url)
            finalize_resp = _session.post(
                init_url,
                headers={"Authorization": auth_header},
                data={
                    "command": "FINALIZE",
                    "media_id": media_id,
                },
                timeout=REQUEST_TIMEOUT,
            )

            if finalize_resp.status_code == 200:
                self._log(f"Media subido: {media_id}")
                return media_id
            return None

        except (requests.RequestException, OSError) as e:
            self._log(f"Error al subir media: {str(e)}", "ERROR")
            return None

    def delete_tweet(self, tweet_id: str) -> Dict[str, Any]:
        """Elimina un tweet."""
        url = f"{self.TWITTER_API_BASE}/tweets/{tweet_id}"
        auth_header = self._build_auth_header("DELETE", url)

        try:
            resp = _session.delete(
                url,
                headers={"Authorization": auth_header},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                return {"success": True}
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}


# =============================================================================
# 5. PUBLICADOR FACEBOOK (Graph API)
# =============================================================================

class FacebookPublisher(BasePublisher):
    """
    Publica contenido en Facebook Pages usando Graph API.

    Métodos soportados:
      - Publicar post de texto
      - Publicar post con imagen
      - Publicar video
      - Publicar enlace
      - Programar publicación
      - Eliminar post
      - Obtener métricas del post

    Autenticación: Page Access Token
    """

    GRAPH_API_BASE = "https://graph.facebook.com/v18.0"

    REQUIRED_FIELDS = ["page_id", "access_token"]

    def validate_credentials(self) -> bool:
        for field in self.REQUIRED_FIELDS:
            if not self.credentials.get(field):
                self._log(f"Campo obligatorio faltante: {field}", "ERROR")
                return False
        return True

    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publica contenido en una página de Facebook.

        Parámetros esperados en content:
          - message: str (texto del post)
          - link: str (URL a compartir, opcional)
          - image_url: str (URL de imagen, opcional)
          - video_url: str (URL de video, opcional)
          - scheduled_publish_time: int (timestamp UNIX, opcional)
          - published: bool (False para programar, opcional)
          - place: str (ID del lugar, opcional)
        """
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales de Facebook incompletas"}

        page_id = self.credentials["page_id"]
        access_token = self.credentials["access_token"]

        url = f"{self.GRAPH_API_BASE}/{page_id}/feed"
        params = {"access_token": access_token}

        # Construir el payload
        post_data = {}
        if content.get("message"):
            post_data["message"] = content["message"]
        if content.get("link"):
            post_data["link"] = content["link"]
        if content.get("scheduled_publish_time"):
            post_data["scheduled_publish_time"] = str(content["scheduled_publish_time"])
            post_data["published"] = "false"
        if content.get("place"):
            post_data["place"] = content["place"]

        try:
            self._log(f"Publicando en Facebook Page {page_id}...")

            # Si hay imagen, subir primero
            if content.get("image_url"):
                media_id = self._upload_photo(content["image_url"], access_token, page_id)
                if media_id:
                    post_data["attached_media"] = json.dumps([{"media_fbid": media_id}])

            # Si hay video, subir primero
            if content.get("video_url"):
                media_id = self._upload_video(content["video_url"], access_token, page_id)
                if media_id:
                    post_data["attached_media"] = json.dumps([{"media_fbid": media_id}])

            resp = _session.post(
                url,
                data=post_data,
                params=params,
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                result = resp.json()
                post_id = result.get("id", "")
                self._log(f"Post publicado en Facebook. ID: {post_id}")
                return {
                    "success": True,
                    "platform": Platform.FACEBOOK.value,
                    "platform_id": post_id,
                    "platform_url": f"https://www.facebook.com/{post_id}",
                    "post_id": post_id,
                }
            else:
                error_msg = resp.json().get("error", {}).get("message", resp.text[:200])
                self._log(f"Error al publicar: {error_msg}", "ERROR")
                return {"success": False, "error": f"Facebook API error: {error_msg}"}

        except requests.RequestException as e:
            self._log(f"Error de conexión: {str(e)}", "ERROR")
            return {"success": False, "error": f"Connection error: {str(e)}"}

    def _upload_photo(self, image_url: str, access_token: str, page_id: str) -> Optional[str]:
        """Sube una foto a la página de Facebook."""
        try:
            # Descargar imagen
            img_resp = _session.get(image_url, timeout=REQUEST_TIMEOUT)
            if img_resp.status_code != 200:
                return None

            resp = _session.post(
                f"{self.GRAPH_API_BASE}/{page_id}/photos",
                files={"source": ("image.jpg", img_resp.content, "image/jpeg")},
                data={"access_token": access_token},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                return resp.json().get("id")
            return None

        except requests.RequestException:
            return None

    def _upload_video(self, video_url: str, access_token: str, page_id: str) -> Optional[str]:
        """Sube un video a la página de Facebook."""
        try:
            video_resp = _session.get(video_url, timeout=REQUEST_TIMEOUT)
            if video_resp.status_code != 200:
                return None

            tmp_path = f"/tmp/fb_video_{int(time.time())}.mp4"
            with open(tmp_path, "wb") as f:
                f.write(video_resp.content)

            with open(tmp_path, "rb") as f:
                resp = _session.post(
                    f"{self.GRAPH_API_BASE}/{page_id}/videos",
                    files={"source": ("video.mp4", f, "video/mp4")},
                    data={"access_token": access_token},
                    timeout=300,
                )

            Path(tmp_path).unlink(missing_ok=True)

            if resp.status_code == 200:
                return resp.json().get("id")
            return None

        except (requests.RequestException, OSError):
            return None

    def delete_post(self, post_id: str) -> Dict[str, Any]:
        """Elimina un post de Facebook."""
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales incompletas"}

        try:
            resp = _session.delete(
                f"{self.GRAPH_API_BASE}/{post_id}",
                params={"access_token": self.credentials["access_token"]},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                self._log(f"Post {post_id} eliminado de Facebook")
                return {"success": True}
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def get_post_insights(self, post_id: str) -> Dict[str, Any]:
        """Obtiene métricas de un post de Facebook."""
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales incompletas"}

        try:
            resp = _session.get(
                f"{self.GRAPH_API_BASE}/{post_id}/insights",
                params={
                    "access_token": self.credentials["access_token"],
                    "metric": "post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return {"success": True, "insights": data}
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}


# =============================================================================
# 6. PUBLICADOR INSTAGRAM (Graph API)
# =============================================================================

class InstagramPublisher(BasePublisher):
    """
    Publica contenido en Instagram usando Graph API.

    Métodos soportados:
      - Publicar imagen (single image)
      - Publicar carousel (múltiples imágenes/vídeos)
      - Publicar Reel (video corto)
      - Publicar Stories (imagen/video)
      - Consultar estado de publicación

    Autenticación: Business Account Access Token
    """

    GRAPH_API_BASE = "https://graph.facebook.com/v18.0"

    REQUIRED_FIELDS = ["business_account_id", "access_token"]

    def validate_credentials(self) -> bool:
        for field in self.REQUIRED_FIELDS:
            if not self.credentials.get(field):
                self._log(f"Campo obligatorio faltante: {field}", "ERROR")
                return False
        return True

    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publica contenido en Instagram.

        Parámetros esperados en content:
          - type: str ("IMAGE" | "CAROUSEL" | "REEL" | "STORIES")
          - image_url: str (URL de imagen, para IMAGE)
          - image_urls: List[str] (URLs de imágenes, para CAROUSEL, máx 10)
          - video_url: str (URL de video, para REEL)
          - caption: str (texto del post)
          - location_id: str (ID de ubicación, opcional)
          - user_tags: List[Dict] (tags de usuarios, opcional)
          - is_carousel_item: bool (para items de carousel)
        """
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales de Instagram incompletas"}

        content_type = content.get("type", "IMAGE")
        business_id = self.credentials["business_account_id"]
        access_token = self.credentials["access_token"]

        if content_type == "IMAGE":
            return self._publish_image(business_id, access_token, content)
        elif content_type == "CAROUSEL":
            return self._publish_carousel(business_id, access_token, content)
        elif content_type == "REEL":
            return self._publish_reel(business_id, access_token, content)
        elif content_type == "STORIES":
            return self._publish_story(business_id, access_token, content)
        else:
            return {"success": False, "error": f"Tipo de contenido no soportado: {content_type}"}

    def _publish_image(self, business_id: str, access_token: str, content: Dict) -> Dict[str, Any]:
        """Publica una imagen individual."""
        image_url = content.get("image_url", "")
        if not image_url:
            return {"success": False, "error": "No se proporcionó image_url"}

        try:
            # Paso 1: Crear contenedor de media
            create_data = {
                "image_url": image_url,
                "caption": content.get("caption", ""),
                "access_token": access_token,
            }

            if content.get("location_id"):
                create_data["location_id"] = content["location_id"]
            if content.get("user_tags"):
                create_data["user_tags"] = json.dumps(content["user_tags"])

            create_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media",
                data=create_data,
                timeout=REQUEST_TIMEOUT,
            )

            if create_resp.status_code != 200:
                error_msg = create_resp.json().get("error", {}).get("message", "")
                return {"success": False, "error": f"Error al crear contenedor: {error_msg}"}

            container_id = create_resp.json().get("id")

            # Esperar a que el contenedor esté listo
            self._wait_for_container(business_id, container_id, access_token)

            # Paso 2: Publicar el contenedor
            publish_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media_publish",
                data={"creation_id": container_id, "access_token": access_token},
                timeout=REQUEST_TIMEOUT,
            )

            if publish_resp.status_code == 200:
                result = publish_resp.json()
                media_id = result.get("id", "")
                self._log(f"Imagen publicada en Instagram. ID: {media_id}")
                return {
                    "success": True,
                    "platform": Platform.INSTAGRAM.value,
                    "platform_id": media_id,
                    "media_id": media_id,
                }

            return {"success": False, "error": f"Error al publicar: {publish_resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def _publish_carousel(self, business_id: str, access_token: str, content: Dict) -> Dict[str, Any]:
        """Publica un carousel de imágenes/vídeos."""
        image_urls = content.get("image_urls", [])
        if not image_urls:
            return {"success": False, "error": "No se proporcionaron image_urls"}

        try:
            child_ids = []

            # Crear contenedores hijos
            for i, url in enumerate(image_urls[:10]):  # Máx 10 items
                create_data = {
                    "image_url": url,
                    "is_carousel_item": "true",
                    "access_token": access_token,
                }

                if content.get("caption") and i == 0:
                    create_data["caption"] = content["caption"]

                create_resp = _session.post(
                    f"{self.GRAPH_API_BASE}/{business_id}/media",
                    data=create_data,
                    timeout=REQUEST_TIMEOUT,
                )

                if create_resp.status_code == 200:
                    child_id = create_resp.json().get("id")
                    child_ids.append(child_id)

            if not child_ids:
                return {"success": False, "error": "No se pudieron crear contenedores hijos"}

            # Crear contenedor padre del carousel
            carousel_data = {
                "media_type": "CAROUSEL",
                "children": ",".join(child_ids),
                "caption": content.get("caption", ""),
                "access_token": access_token,
            }

            if content.get("location_id"):
                carousel_data["location_id"] = content["location_id"]

            parent_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media",
                data=carousel_data,
                timeout=REQUEST_TIMEOUT,
            )

            if parent_resp.status_code != 200:
                return {"success": False, "error": f"Error carousel parent: {parent_resp.text[:200]}"}

            parent_id = parent_resp.json().get("id")

            # Esperar y publicar
            self._wait_for_container(business_id, parent_id, access_token)

            publish_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media_publish",
                data={"creation_id": parent_id, "access_token": access_token},
                timeout=REQUEST_TIMEOUT,
            )

            if publish_resp.status_code == 200:
                media_id = publish_resp.json().get("id", "")
                self._log(f"Carousel publicado en Instagram. ID: {media_id}")
                return {"success": True, "platform": Platform.INSTAGRAM.value, "media_id": media_id}

            return {"success": False, "error": f"Error al publicar carousel: {publish_resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def _publish_reel(self, business_id: str, access_token: str, content: Dict) -> Dict[str, Any]:
        """Publica un Reel en Instagram."""
        video_url = content.get("video_url", "")
        if not video_url:
            return {"success": False, "error": "No se proporcionó video_url"}

        try:
            # Crear contenedor de Reel
            create_data = {
                "media_type": "REELS",
                "video_url": video_url,
                "caption": content.get("caption", ""),
                "cover_url": content.get("cover_url", ""),
                "access_token": access_token,
                "share_to_feed": str(content.get("share_to_feed", False)).lower(),
            }

            create_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media",
                data=create_data,
                timeout=REQUEST_TIMEOUT,
            )

            if create_resp.status_code != 200:
                return {"success": False, "error": f"Error al crear Reel: {create_resp.text[:200]}"}

            container_id = create_resp.json().get("id")

            # Los Reels pueden tardar más en procesarse
            self._wait_for_container(business_id, container_id, access_token, max_wait=120)

            publish_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media_publish",
                data={"creation_id": container_id, "access_token": access_token},
                timeout=REQUEST_TIMEOUT,
            )

            if publish_resp.status_code == 200:
                media_id = publish_resp.json().get("id", "")
                self._log(f"Reel publicado en Instagram. ID: {media_id}")
                return {"success": True, "platform": Platform.INSTAGRAM.value, "media_id": media_id}

            return {"success": False, "error": f"Error al publicar Reel: {publish_resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def _publish_story(self, business_id: str, access_token: str, content: Dict) -> Dict[str, Any]:
        """Publica una Story en Instagram."""
        try:
            # Story: imagen
            if content.get("image_url"):
                create_data = {
                    "media_type": "IMAGE",
                    "image_url": content["image_url"],
                    "access_token": access_token,
                }
            # Story: video
            elif content.get("video_url"):
                create_data = {
                    "media_type": "VIDEO",
                    "video_url": content["video_url"],
                    "access_token": access_token,
                }
            else:
                return {"success": False, "error": "No se proporcionó image_url ni video_url"}

            create_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media",
                data=create_data,
                timeout=REQUEST_TIMEOUT,
            )

            if create_resp.status_code != 200:
                return {"success": False, "error": f"Error al crear Story: {create_resp.text[:200]}"}

            container_id = create_resp.json().get("id")
            self._wait_for_container(business_id, container_id, access_token)

            publish_resp = _session.post(
                f"{self.GRAPH_API_BASE}/{business_id}/media_publish",
                data={"creation_id": container_id, "access_token": access_token},
                timeout=REQUEST_TIMEOUT,
            )

            if publish_resp.status_code == 200:
                media_id = publish_resp.json().get("id", "")
                self._log(f"Story publicada en Instagram. ID: {media_id}")
                return {"success": True, "platform": Platform.INSTAGRAM.value, "media_id": media_id}

            return {"success": False, "error": f"Error al publicar Story: {publish_resp.text[:200]}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def _wait_for_container(self, business_id: str, container_id: str,
                            access_token: str, max_wait: int = 60):
        """Espera a que un contenedor de media esté listo para publicar."""
        start_time = time.time()
        while time.time() - start_time < max_wait:
            try:
                resp = _session.get(
                    f"{self.GRAPH_API_BASE}/{container_id}",
                    params={
                        "access_token": access_token,
                        "fields": "status_code",
                    },
                    timeout=REQUEST_TIMEOUT,
                )

                if resp.status_code == 200:
                    status = resp.json().get("status_code", "")
                    if status == "FINISHED":
                        self._log(f"Contenedor {container_id} listo")
                        return
                    elif status == "ERROR":
                        self._log(f"Contenedor {container_id} falló", "ERROR")
                        return
                    elif status == "IN_PROGRESS":
                        time.sleep(5)
                        continue
                else:
                    time.sleep(5)

            except requests.RequestException:
                time.sleep(5)

        self._log(f"Timeout esperando contenedor {container_id}", "WARN")

    def check_status(self, media_id: str) -> Dict[str, Any]:
        """Verifica el estado de una publicación en Instagram."""
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales incompletas"}

        try:
            resp = _session.get(
                f"{self.GRAPH_API_BASE}/{media_id}",
                params={
                    "access_token": self.credentials["access_token"],
                    "fields": "id,status,caption,timestamp,media_type",
                },
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "media_id": data.get("id"),
                    "status": data.get("status"),
                    "caption": data.get("caption", ""),
                    "media_type": data.get("media_type"),
                    "timestamp": data.get("timestamp"),
                }
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def delete_media(self, media_id: str) -> Dict[str, Any]:
        """Elimina una publicación de Instagram."""
        if not self.validate_credentials():
            return {"success": False, "error": "Credenciales incompletas"}

        try:
            resp = _session.delete(
                f"{self.GRAPH_API_BASE}/{media_id}",
                params={"access_token": self.credentials["access_token"]},
                timeout=REQUEST_TIMEOUT,
            )

            if resp.status_code == 200:
                self._log(f"Media {media_id} eliminada de Instagram")
                return {"success": True}
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}


# =============================================================================
# MOTOR PRINCIPAL — Orquestador de Publicaciones
# =============================================================================

class AutomationEngine:
    """
    Motor principal de automatización que orquesta todas las plataformas.

    Flujo:
    1. Recibe un job de automatización (desde la BD o CLI)
    2. Determina la plataforma(s) objetivo
    3. Ejecuta el publicador correspondiente
    4. Reporta el resultado (success/failure)
    """

    def __init__(self, config_path: Optional[str] = None):
        self.config = load_credentials(config_path)
        self.publishers: Dict[Platform, BasePublisher] = {}
        self._initialize_publishers()

    def _initialize_publishers(self):
        """Inicializa todos los publicadores disponibles."""
        wp_creds = self.config.get("wordpress", {})
        if wp_creds:
            self.publishers[Platform.WORDPRESS] = WordPressPublisher(wp_creds)

        yt_creds = self.config.get("youtube", {})
        if yt_creds:
            self.publishers[Platform.YOUTUBE] = YouTubePublisher(yt_creds)

        tt_creds = self.config.get("tiktok", {})
        if tt_creds:
            self.publishers[Platform.TIKTOK] = TikTokPublisher(tt_creds)

        tw_creds = self.config.get("twitter", {})
        if tw_creds:
            self.publishers[Platform.TWITTER] = TwitterPublisher(tw_creds)

        fb_creds = self.config.get("facebook", {})
        if fb_creds:
            self.publishers[Platform.FACEBOOK] = FacebookPublisher(fb_creds)

        ig_creds = self.config.get("instagram", {})
        if ig_creds:
            self.publishers[Platform.INSTAGRAM] = InstagramPublisher(ig_creds)

    def publish(self, platform: str, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publica contenido en la plataforma especificada.

        Args:
            platform: Nombre de la plataforma (wordpress, youtube, tiktok, etc.)
            content: Diccionario con los datos del contenido.

        Returns:
            Resultado de la publicación.
        """
        try:
            plat_enum = Platform(platform.lower())
        except ValueError:
            return {"success": False, "error": f"Plataforma no soportada: {platform}"}

        publisher = self.publishers.get(plat_enum)
        if not publisher:
            return {"success": False, "error": f"Publicador no configurado para: {platform}"}

        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] [INFO] [AutomationEngine] Publicando en {platform}...")

        try:
            result = publisher.publish(content)
            print(f"[{ts}] [INFO] [AutomationEngine] Resultado: {json.dumps(result, ensure_ascii=False)}")
            return result
        except Exception as e:
            print(f"[{ts}] [ERROR] [AutomationEngine] Error: {str(e)}")
            print(traceback.format_exc())
            return {"success": False, "error": str(e)}

    def publish_multichannel(self, platforms: List[str], content: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Publica contenido en múltiples plataformas simultáneamente.

        Args:
            platforms: Lista de nombres de plataformas.
            content: Diccionario con los datos del contenido (adaptados por plataforma).

        Returns:
            Lista de resultados por plataforma.
        """
        results = []
        for platform in platforms:
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{ts}] [INFO] [AutomationEngine] Procesando {platform}...")
            result = self.publish(platform, content)
            results.append({
                "platform": platform,
                "result": result,
            })
        return results

    def check_job_status(self, platform: str, content_id: str) -> Dict[str, Any]:
        """Verifica el estado de una publicación existente."""
        try:
            plat_enum = Platform(platform.lower())
        except ValueError:
            return {"success": False, "error": f"Plataforma no soportada: {platform}"}

        publisher = self.publishers.get(plat_enum)
        if not publisher:
            return {"success": False, "error": f"Publicador no disponible para: {platform}"}

        try:
            return publisher.check_status(content_id)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_configured_platforms(self) -> List[str]:
        """Lista todas las plataformas configuradas."""
        return [p.value for p in self.publishers.keys()]

    def validate_all(self) -> Dict[str, bool]:
        """Valida las credenciales de todas las plataformas configuradas."""
        results = {}
        for platform, publisher in self.publishers.items():
            results[platform.value] = publisher.validate_credentials()
        return results


# =============================================================================
# CLI — Interfaz de Línea de Comandos
# =============================================================================

def build_cli_parser() -> argparse.ArgumentParser:
    """Construye el parser de argumentos de la CLI."""
    parser = argparse.ArgumentParser(
        description="Cerebro Editorial — Motor de Automatización (bot_playwright.py)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:

  # Publicar en WordPress
  python bot_playwright.py --platform wordpress --action publish \\
      --config config.json \\
      --content '{"title":"Mi Post","body":"<p>Contenido HTML</p>","status":"publish"}'

  # Subir video a YouTube
  python bot_playwright.py --platform youtube --action publish \\
      --config config.json \\
      --content '{"title":"Mi Video","description":"Descripción","video_path":"/path/to/video.mp4","tags":["tag1","tag2"]}'

  # Publicar en TikTok
  python bot_playwright.py --platform tiktok --action publish \\
      --config config.json \\
      --content '{"title":"Mi TikTok","video_url":"https://...","privacy_level":"PUBLIC_TO_ALL"}'

  # Publicar en Twitter/X
  python bot_playwright.py --platform twitter --action publish \\
      --config config.json \\
      --content '{"text":"¡Hola mundo! 🌍"}'

  # Publicar en Facebook
  python bot_playwright.py --platform facebook --action publish \\
      --config config.json \\
      --content '{"message":"Mi post de Facebook","image_url":"https://..."}'

  # Publicar imagen en Instagram
  python bot_playwright.py --platform instagram --action publish \\
      --config config.json \\
      --content '{"type":"IMAGE","image_url":"https://...","caption":"Mi post de Instagram"}'

  # Publicar Reel en Instagram
  python bot_playwright.py --platform instagram --action publish \\
      --config config.json \\
      --content '{"type":"REEL","video_url":"https://...","caption":"Mi Reel"}'

  # Multicanal
  python bot_playwright.py --platform all --action publish \\
      --config config.json \\
      --content '{"message":"Publicación multicanal"}' \\
      --platforms "twitter,facebook"

  # Verificar estado
  python bot_playwright.py --platform youtube --action check-status \\
      --content '{"platform_id":"video_id_here"}'

  # Validar credenciales
  python bot_playwright.py --action validate

  # Listar plataformas configuradas
  python bot_playwright.py --action list-platforms
        """,
    )

    parser.add_argument(
        "--platform", "-p",
        type=str,
        help="Plataforma objetivo (wordpress, youtube, tiktok, twitter, facebook, instagram, all)",
    )
    parser.add_argument(
        "--action", "-a",
        type=str,
        choices=["publish", "check-status", "validate", "list-platforms"],
        default="publish",
        help="Acción a realizar",
    )
    parser.add_argument(
        "--config", "-c",
        type=str,
        default=None,
        help="Ruta al archivo de configuración JSON (default: config.json o ZENIT_CONFIG_PATH)",
    )
    parser.add_argument(
        "--content",
        type=str,
        help='Datos del contenido en formato JSON (ej: \'{"title":"Mi Post"}\')',
    )
    parser.add_argument(
        "--platforms",
        type=str,
        help='Lista de plataformas para multicanal (ej: "twitter,facebook")',
    )

    return parser


def main():
    """Punto de entrada principal del bot."""
    parser = build_cli_parser()
    args = parser.parse_args()

    engine = AutomationEngine(config_path=args.config)

    if args.action == "validate":
        print("\n=== Validación de Credenciales ===\n")
        results = engine.validate_all()
        for platform, is_valid in results.items():
            status = "✓ VÁLIDO" if is_valid else "✗ INVÁLIDO"
            print(f"  {platform:20s} {status}")
        print()
        sys.exit(0)

    if args.action == "list-platforms":
        print("\n=== Plataformas Configuradas ===\n")
        platforms = engine.list_configured_platforms()
        if platforms:
            for p in platforms:
                print(f"  ✓ {p}")
        else:
            print("  No hay plataformas configuradas.")
        print()
        sys.exit(0)

    if not args.platform:
        parser.error("Se requiere --platform para acciones de publicación o verificación de estado")

    if args.action == "check-status":
        content = json.loads(args.content) if args.content else {}
        content_id = content.get("platform_id", content.get("id", ""))
        if not content_id:
            print("[ERROR] Se requiere 'platform_id' en --content para check-status")
            sys.exit(1)

        result = engine.check_job_status(args.platform, content_id)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result.get("success") else 1)

    if args.action == "publish":
        if not args.content:
            parser.error("Se requiere --content para la acción 'publish'")

        content = json.loads(args.content)

        if args.platform == "all":
            platforms = args.platforms.split(",") if args.platforms else []
            if not platforms:
                platforms = engine.list_configured_platforms()

            print(f"\n=== Publicación Multicanal ===")
            print(f"Plataformas: {', '.join(platforms)}\n")

            results = engine.publish_multichannel(platforms, content)

            print("\n=== Resultados ===\n")
            for r in results:
                status = "✓" if r["result"].get("success") else "✗"
                print(f"  {status} {r['platform']}: {json.dumps(r['result'], ensure_ascii=False)}")
            print()

            # Exit code: 0 si todos exitosos, 1 si alguno falló
            all_success = all(r["result"].get("success") for r in results)
            sys.exit(0 if all_success else 1)

        else:
            result = engine.publish(args.platform, content)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
