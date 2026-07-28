"""
=============================================================================
IMPORTADOR MASIVO DE TEMAS Y KEYWORDS - Sistema ZENIT
bulk_import.py
=============================================================================

Script para importar listas masivas de palabras clave desde CSV o JSON.
"""

import os
import sys
import json
import csv
import argparse
import requests
from pathlib import Path

class BulkImporter:
    def __init__(self, api_url="http://localhost:3000"):
        self.api_url = api_url.rstrip("/")

    def import_from_csv(self, file_path, project_id, cluster_id=None):
        """Importa palabras clave desde un archivo CSV."""
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {"projectId": project_id}
            if cluster_id:
                data["clusterId"] = cluster_id
            
            response = requests.post(
                f"{self.api_url}/api/topics/bulk-import",
                files=files,
                data=data
            )
            return response.json()

    def import_from_json(self, file_path, project_id, cluster_id=None):
        """Importa palabras clave desde un archivo JSON."""
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {"projectId": project_id}
            if cluster_id:
                data["clusterId"] = cluster_id
            
            response = requests.post(
                f"{self.api_url}/api/topics/bulk-import",
                files=files,
                data=data
            )
            return response.json()

    def create_sample_csv(self, output_path="sample_keywords.csv"):
        """Crea un archivo CSV de ejemplo."""
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["keyword", "metrics"])
            writer.writeheader()
            writer.writerows([
                {"keyword": "Realidad Virtual", "metrics": '{"priority": "high"}'},
                {"keyword": "Metaverso", "metrics": '{"priority": "high"}'},
                {"keyword": "IA Generativa", "metrics": '{"priority": "medium"}'},
                {"keyword": "GPT-5", "metrics": '{"priority": "high"}'},
            ])
        print(f"✅ Archivo de ejemplo creado: {output_path}")

    def create_sample_json(self, output_path="sample_keywords.json"):
        """Crea un archivo JSON de ejemplo."""
        data = {
            "keywords": [
                {"keyword": "Realidad Virtual", "metrics": {"priority": "high"}},
                {"keyword": "Metaverso", "metrics": {"priority": "high"}},
                {"keyword": "IA Generativa", "metrics": {"priority": "medium"}},
                {"keyword": "GPT-5", "metrics": {"priority": "high"}},
            ]
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Archivo de ejemplo creado: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Zenit Bulk Importer")
    parser.add_argument("--file", required=True, help="Ruta al archivo CSV o JSON")
    parser.add_argument("--project", type=int, required=True, help="Project ID")
    parser.add_argument("--cluster", type=int, help="Cluster ID (opcional)")
    parser.add_argument("--api", default="http://localhost:3000", help="URL de la API")
    parser.add_argument("--sample", choices=["csv", "json"], help="Generar archivo de ejemplo")
    
    args = parser.parse_args()

    if args.sample:
        importer = BulkImporter()
        if args.sample == "csv":
            importer.create_sample_csv()
        else:
            importer.create_sample_json()
        return

    if not Path(args.file).exists():
        print(f"❌ Archivo no encontrado: {args.file}")
        sys.exit(1)

    importer = BulkImporter(api_url=args.api)
    
    print(f"📤 Importando desde: {args.file}")
    result = importer.import_from_csv(args.file, args.project, args.cluster)
    
    if result.get("success"):
        print(f"✅ Importación completada:")
        print(f"   - Insertadas: {result.get('inserted')}")
        print(f"   - Duplicadas: {result.get('duplicates')}")
        print(f"   - Total: {result.get('total')}")
    else:
        print(f"❌ Error: {result.get('error')}")

if __name__ == "__main__":
    main()
