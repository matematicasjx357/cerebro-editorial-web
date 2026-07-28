"""
=============================================================================
ORQUESTADOR PRINCIPAL CLI - Sistema ZENIT
main_runner.py
=============================================================================

Punto de entrada único para la ejecución local de Cerebro Editorial.
Integra:
  - Verificación de sesiones (check_sessions.py)
  - Consulta de colas de trabajo (/api/bot/job/next)
  - Ejecución de Playwright y publicación
  - Integración SEO (wordpress_seo_integration.py)
  - Registro de logs centralizado

Autor: Cerebro Editorial
Versión: 1.0.0
"""

import os
import sys
import time
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime

# Importar módulos locales
try:
    from check_sessions import SessionChecker
    from bot_playwright import AutomationEngine, Platform
    from wordpress_seo_integration import WordPressSEOIntegration
except ImportError as e:
    print(f"[ERROR] No se pudieron importar los módulos necesarios: {e}")
    sys.exit(1)

# Configuración de Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("zenit_runner.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ZENIT_RUNNER")

class ZenitOrchestrator:
    def __init__(self, api_url="http://localhost:3000", config_path="config.json"):
        self.api_url = api_url.rstrip("/")
        self.config_path = config_path
        self.engine = AutomationEngine(config_path=config_path)
        self.credentials = self.engine.load_credentials(config_path)
        
        # Inicializar integración SEO
        wp_creds = self.credentials.get("wordpress", {})
        self.seo = WordPressSEOIntegration(
            site_url=wp_creds.get("site_url", "https://example.com"),
            site_name=wp_creds.get("site_name", "Cerebro Editorial")
        )

    def check_sessions(self, profile_path=None):
        """Verifica el estado de las sesiones de navegador."""
        logger.info("Iniciando verificación de sesiones...")
        if not profile_path:
            profile_path = str(Path.home() / ".config" / "google-chrome" / "Default")
        
        checker = SessionChecker(user_data_dir=profile_path, headless=True)
        results = checker.check_all()
        checker.print_report(results)
        return all(results.values())

    def run_single_task(self):
        """Consulta y ejecuta una única tarea de la cola."""
        logger.info("Consultando siguiente tarea en la API...")
        try:
            import requests
            response = requests.get(f"{self.api_url}/api/bot/job/next")
            if response.status_code != 200:
                logger.error(f"Error al conectar con la API: HTTP {response.status_code}")
                return False
            
            data = response.json()
            if not data.get("success"):
                logger.info("No hay tareas pendientes en la cola.")
                return False
            
            job = data["data"]
            job_id = job["jobId"]
            job_type = job["type"]
            payload = job["payload"]
            
            logger.info(f"Procesando Tarea #{job_id} (Tipo: {job_type})")
            
            # Ejecutar la tarea usando el motor de automatización
            # Si es WordPress, inyectar SEO
            if job_type == "wordpress" or "wordpress" in job_type:
                seo_config = payload.get("seo", {})
                if seo_config:
                    logger.info("Inyectando metadatos SEO avanzados...")
                    payload = self.seo.inject_seo_meta_into_post(payload, seo_config)
            
            # Ejecución real
            result = self.engine.publish(job_type, payload)
            
            # Reportar resultado a la API
            complete_payload = {
                "status": "completed" if result.get("success") else "error",
                "result": result,
                "logs": f"Ejecutado vía ZenitOrchestrator el {datetime.now().isoformat()}"
            }
            
            if result.get("platform_url"):
                complete_payload["youtubeUrl"] = result.get("platform_url")
            
            requests.post(f"{self.api_url}/api/bot/job/{job_id}/complete", json=complete_payload)
            
            if result.get("success"):
                logger.info(f"Tarea #{job_id} completada exitosamente.")
            else:
                logger.error(f"Error en Tarea #{job_id}: {result.get('error')}")
            
            return True
            
        except Exception as e:
            logger.exception(f"Fallo crítico al ejecutar tarea: {e}")
            return False

    def continuous_mode(self, interval=60):
        """Modo automático continuo."""
        logger.info(f"Iniciando MODO AUTOMÁTICO CONTINUO (Intervalo: {interval}s)")
        logger.info("Presiona Ctrl+C para salir.")
        
        try:
            while True:
                logger.info("Buscando tareas...")
                has_task = self.run_single_task()
                if not has_task:
                    logger.info(f"Esperando {interval} segundos...")
                    time.sleep(interval)
                else:
                    # Pequeña pausa entre tareas
                    time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Modo continuo detenido por el usuario.")

def print_menu():
    print("\n" + "="*50)
    print("      SISTEMA ZENIT - ORQUESTADOR PRINCIPAL")
    print("="*50)
    print(" [1] Modo Automático Continuo")
    print(" [2] Verificar Sesiones de Navegador")
    print(" [3] Ejecutar 1 Tarea de Prueba")
    print(" [4] Salir")
    print("="*50)

def main():
    parser = argparse.ArgumentParser(description="Orquestador Zenit")
    parser.add_argument("--api", default="http://localhost:3000", help="URL de la API del backend")
    parser.add_argument("--config", default="config.json", help="Ruta al archivo de configuración")
    parser.add_argument("--profile", help="Ruta al perfil de Chrome")
    args = parser.parse_args()

    orchestrator = ZenitOrchestrator(api_url=args.api, config_path=args.config)

    while True:
        print_menu()
        choice = input("\nSelecciona una opción: ")

        if choice == "1":
            orchestrator.continuous_mode()
        elif choice == "2":
            orchestrator.check_sessions(args.profile)
        elif choice == "3":
            orchestrator.run_single_task()
        elif choice == "4":
            print("Saliendo del sistema...")
            break
        else:
            print("Opción no válida.")

if __name__ == "__main__":
    main()
