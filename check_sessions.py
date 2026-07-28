"""
=============================================================================
GESTOR DE PERFILES DE NAVEGADOR
check_sessions.py
=============================================================================

Script auxiliar para verificar el estado de las sesiones en las plataformas
principales antes de iniciar el motor de automatización.

Plataformas verificadas:
  - Gemini (Google)
  - Copilot (Microsoft)
  - YouTube Studio
  - TikTok
  - X.com (Twitter)

Autor: Cerebro Editorial
Versión: 1.0.0
"""

import os
import sys
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("[ERROR] Playwright no está instalado. Ejecuta: pip install playwright")
    sys.exit(1)


class SessionChecker:
    """
    Verifica el estado de las sesiones en múltiples plataformas.
    """

    PLATFORMS = {
        "gemini": "https://gemini.google.com/app",
        "copilot": "https://copilot.microsoft.com",
        "youtube": "https://studio.youtube.com",
        "tiktok": "https://www.tiktok.com/upload",
        "twitter": "https://x.com/home",
    }

    SELECTORS = {
        "gemini": ["button[aria-label*='Configuración']", "div[aria-label*='Gemini']"],
        "copilot": ["div[id='copilot_main_content']", "button[id='b_gear']"],
        "youtube": ["ytcp-header", "div[id='avatar-btn']"],
        "tiktok": ["div[data-tt='upload-video']", "div[id='header-user-profile']"],
        "twitter": ["a[aria-label='Perfil']", "div[data-testid='SideNav_AccountSwitcher_Button']"],
    }

    def __init__(self, user_data_dir: str, headless: bool = True):
        """
        Inicializa el verificador de sesiones.
        
        Args:
            user_data_dir: Ruta al directorio de perfil del navegador
            headless: Si se debe ejecutar en modo oculto
        """
        self.user_data_dir = user_data_dir
        self.headless = headless

    def check_all(self) -> Dict[str, bool]:
        """
        Verifica todas las plataformas configuradas.
        
        Returns:
            Dict con el estado de cada plataforma (True si activa)
        """
        results = {}
        
        with sync_playwright() as p:
            print(f"\n[INFO] Iniciando verificación de sesiones usando: {self.user_data_dir}")
            
            browser = p.chromium.launch_persistent_context(
                user_data_dir=self.user_data_dir,
                headless=self.headless,
                args=["--disable-blink-features=AutomationControlled"]
            )
            
            page = browser.new_page()
            
            for name, url in self.PLATFORMS.items():
                print(f"  Verificando {name:10s} ... ", end="", flush=True)
                results[name] = self._check_platform(page, name, url)
                status = "✓ ACTIVA" if results[name] else "✗ INACTIVA"
                print(status)
            
            browser.close()
            
        return results

    def _check_platform(self, page, name: str, url: str) -> bool:
        """Verifica una plataforma específica."""
        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Esperar un poco para renderizado dinámico
            time.sleep(2)
            
            # Verificar si alguno de los selectores de éxito está presente
            for selector in self.SELECTORS[name]:
                if page.is_visible(selector, timeout=5000):
                    return True
            
            return False
        except Exception:
            return False

    def print_report(self, results: Dict[str, bool]):
        """Imprime un reporte detallado del estado de las sesiones."""
        print("\n" + "="*50)
        print("REPORTE DE ESTADO DE SESIONES")
        print("="*50)
        
        all_active = True
        for name, active in results.items():
            status = "✓ Conectado" if active else "✗ Sesión Requerida"
            print(f"{name.capitalize():15s}: {status}")
            if not active:
                all_active = False
        
        print("="*50)
        if all_active:
            print("[SUCCESS] Todas las sesiones están listas para la automatización.")
        else:
            print("[WARNING] Algunas sesiones requieren atención manual.")
        print("="*50 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Verificador de sesiones para Cerebro Editorial")
    parser.add_argument(
        "--profile", "-p",
        type=str,
        default=str(Path.home() / ".config" / "google-chrome" / "Default"),
        help="Ruta al directorio de perfil del navegador (Chrome/Chromium)"
    )
    parser.add_argument(
        "--gui",
        action="store_false",
        dest="headless",
        help="Ejecutar con interfaz gráfica (no headless)"
    )
    parser.set_defaults(headless=True)
    
    args = parser.parse_args()
    
    if not os.path.exists(args.profile):
        print(f"[ERROR] El directorio de perfil no existe: {args.profile}")
        print("Asegúrate de proporcionar la ruta correcta a tu perfil de Chrome.")
        sys.exit(1)
    
    checker = SessionChecker(user_data_dir=args.profile, headless=args.headless)
    results = checker.check_all()
    checker.print_report(results)
    
    # Salir con código de error si alguna sesión falló
    if not all(results.values()):
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
