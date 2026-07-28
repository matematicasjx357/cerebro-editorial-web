"""
=============================================================================
RASTRADOR DE NOTICIAS Y RSS - Sistema ZENIT
rss_monitor.py
=============================================================================

Script para monitorear fuentes RSS públicas y descubrir nuevos temas.
Funciones:
  - Consulta fuentes RSS configuradas por proyecto.
  - Extrae titulares y enlaces.
  - Filtra duplicados contra la memoria editorial.
  - Inserta nuevos temas en la cola de trabajo vía API.

Autor: Cerebro Editorial
Versión: 1.0.0
"""

import os
import sys
import time
import json
import logging
import requests
import argparse
from datetime import datetime
from typing import List, Dict, Any

# Intentar importar feedparser para manejar RSS
try:
    import feedparser
except ImportError:
    print("[INFO] Instalando feedparser...")
    os.system("pip install feedparser")
    import feedparser

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger("RSS_MONITOR")

class RSSMonitor:
    def __init__(self, api_url="http://localhost:3000"):
        self.api_url = api_url.rstrip("/")

    def fetch_feeds(self, feed_urls: List[str]) -> List[Dict[str, Any]]:
        """Consulta múltiples fuentes RSS y extrae noticias."""
        all_entries = []
        for url in feed_urls:
            logger.info(f"Consultando fuente: {url}")
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries:
                    all_entries.append({
                        "title": entry.title,
                        "link": entry.link,
                        "summary": entry.get("summary", ""),
                        "published": entry.get("published", ""),
                        "source": url
                    })
            except Exception as e:
                logger.error(f"Error al consultar {url}: {e}")
        return all_entries

    def filter_and_submit(self, entries: List[Dict[str, Any]], project_id: int):
        """Filtra duplicados y envía nuevos temas a la API."""
        logger.info(f"Procesando {len(entries)} entradas para el Proyecto #{project_id}...")
        
        count = 0
        for entry in entries:
            try:
                # 1. Verificar si ya existe en el sistema (vía API de búsqueda/memoria)
                # En esta versión simplificada, enviamos todo y el backend maneja la unicidad
                
                payload = {
                    "projectId": project_id,
                    "keyword": entry["title"],
                    "metrics": json.dumps({
                        "source": "RSS_MONITOR",
                        "url": entry["link"],
                        "discovered_at": datetime.now().isoformat(),
                        "summary": entry["summary"][:200]
                    })
                }
                
                # Insertar en la tabla de keywords/temas
                # Nota: Usamos el endpoint tRPC o uno REST si existe
                response = requests.post(
                    f"{self.api_url}/api/rss/submit",
                    json=payload
                )
                
                if response.status_code == 200:
                    res_data = response.json()
                    if res_data.get("new"):
                        logger.info(f"Nuevo tema descubierto: {entry['title']}")
                        count += 1
            except Exception as e:
                logger.error(f"Error al procesar entrada: {e}")
        
        logger.info(f"Proceso finalizado. {count} nuevos temas insertados.")

def main():
    parser = argparse.ArgumentParser(description="Zenit RSS Monitor")
    parser.add_argument("--api", default="http://localhost:3000", help="URL de la API")
    parser.add_argument("--project", type=int, required=True, help="ID del proyecto")
    parser.add_argument("--feeds", required=True, help="URLs de feeds RSS separadas por coma")
    args = parser.parse_args()

    feed_urls = [url.strip() for url in args.feeds.split(",")]
    monitor = RSSMonitor(api_url=args.api)
    
    entries = monitor.fetch_feeds(feed_urls)
    monitor.filter_and_submit(entries, args.project)

if __name__ == "__main__":
    main()
