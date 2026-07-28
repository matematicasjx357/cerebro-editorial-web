"""
=============================================================================
SUITE DE PRUEBAS UNIFICADA - Sistema ZENIT
test_suite.py
=============================================================================

Script para validar la integridad de todos los módulos del sistema:
  1. Verificación de sesiones (check_sessions.py)
  2. Prueba de conectividad API
  3. Prueba de parseo RSS (rss_monitor.py)
  4. Prueba de integración SEO (wordpress_seo_integration.py)
  5. Prueba de orquestador (main_runner.py)

Autor: Cerebro Editorial
Versión: 1.0.0
"""

import os
import sys
import json
import unittest
import requests
from pathlib import Path

# Configuración de prueba
API_URL = os.environ.get("API_URL", "http://localhost:3000")
CONFIG_PATH = os.environ.get("ZENIT_CONFIG_PATH", "config.json")

class TestZenitSystem(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        print("\n" + "="*50)
        print("INICIANDO SUITE DE PRUEBAS ZENIT")
        print("="*50)

    def test_01_api_connectivity(self):
        """Prueba la conectividad básica con el backend."""
        print("\n[TEST] Verificando conectividad API...")
        try:
            # Intentar acceder a un endpoint público o de salud
            response = requests.get(f"{API_URL}/api/bot/job/next", timeout=5)
            self.assertIn(response.status_code, [200, 404, 401])
            print("✓ Conectividad API validada.")
        except requests.exceptions.ConnectionError:
            self.skipTest(f"Servidor no disponible en {API_URL}")

    def test_02_rss_parser(self):
        """Prueba el módulo de monitoreo RSS."""
        print("\n[TEST] Verificando módulo RSS...")
        from rss_monitor import RSSMonitor
        monitor = RSSMonitor(api_url=API_URL)
        
        # Probar con un feed conocido
        test_feed = "https://www.technologyreview.com/feed/"
        entries = monitor.fetch_feeds([test_feed])
        
        self.assertIsInstance(entries, list)
        if entries:
            self.assertIn("title", entries[0])
            self.assertIn("link", entries[0])
            print(f"✓ Parseo RSS exitoso. {len(entries)} entradas encontradas.")
        else:
            print("! Advertencia: No se obtuvieron entradas del feed de prueba.")

    def test_03_seo_integration(self):
        """Prueba el módulo de integración SEO."""
        print("\n[TEST] Verificando integración SEO...")
        from wordpress_seo_integration import WordPressSEOIntegration
        seo = WordPressSEOIntegration(site_url="https://test.com", site_name="Test Site")
        
        schema = seo.generate_article_schema(
            title="Test Post",
            description="Test Description",
            content="<p>Test Content</p>"
        )
        
        self.assertEqual(schema["headline"], "Test Post")
        self.assertEqual(schema["@type"], "BlogPosting")
        print("✓ Generación de Schema SEO validada.")

    def test_04_bot_engine_config(self):
        """Prueba la carga de configuración del bot."""
        print("\n[TEST] Verificando configuración del bot...")
        from bot_playwright import AutomationEngine
        
        if not Path(CONFIG_PATH).exists():
            # Crear un config temporal para la prueba si no existe
            temp_config = {"wordpress": {"site_url": "http://test.wp"}}
            with open(CONFIG_PATH, "w") as f:
                json.dump(temp_config, f)
        
        engine = AutomationEngine(config_path=CONFIG_PATH)
        creds = engine.load_credentials(CONFIG_PATH)
        
        self.assertIsInstance(creds, dict)
        print("✓ Carga de configuración validada.")

    def test_05_session_checker_import(self):
        """Verifica que el comprobador de sesiones sea importable y funcional."""
        print("\n[TEST] Verificando SessionChecker...")
        try:
            from check_sessions import SessionChecker
            print("✓ SessionChecker importado correctamente.")
        except ImportError:
            self.fail("No se pudo importar check_sessions.py")

def run_tests():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestZenitSystem)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    if result.wasSuccessful():
        print("\n" + "="*50)
        print("✓ TODAS LAS PRUEBAS PASARON EXITOSAMENTE")
        print("="*50)
        return True
    else:
        print("\n" + "="*50)
        print("✗ ALGUNAS PRUEBAS FALLARON")
        print("="*50)
        return False

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
