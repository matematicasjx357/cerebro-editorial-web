import requests
import time
import json
import sys

# Configuración
BASE_URL = "http://localhost:3000"
API_URL = f"{BASE_URL}/api/bot"

def log_step(msg):
    print(f"\n[TEST] {msg}")
    print("-" * 50)

def test_workflow():
    log_step("Iniciando simulación de flujo de trabajo: 'Mundos Simulados'")
    
    # 1. Consultar el siguiente trabajo PENDING
    log_step("1. Consultando siguiente trabajo PENDING...")
    try:
        response = requests.get(f"{API_URL}/job/next")
        if response.status_code != 200:
            print(f"Error: Status code {response.status_code}")
            return
        
        data = response.json()
        if not data.get("success"):
            print("No hay trabajos pendientes para procesar.")
            return
        
        job = data["data"]
        job_id = job["jobId"]
        print(f"Trabajo encontrado! ID: {job_id}, Tipo: {job['type']}")
        
        # 2. Simular procesamiento con logs paso a paso
        log_step("2. Simulando procesamiento paso a paso...")
        
        steps = [
            {"msg": "Iniciando motor de renderizado para 'Mundos Simulados'...", "progress": 10},
            {"msg": "Generando entornos procedurales...", "progress": 30},
            {"msg": "Aplicando texturas y shaders avanzados...", "progress": 60},
            {"msg": "Renderizado de video completado. Iniciando exportación...", "progress": 90}
        ]
        
        for step in steps:
            print(f"Enviando log: {step['msg']} ({step['progress']}%)")
            log_resp = requests.post(
                f"{API_URL}/job/{job_id}/log",
                json={
                    "status": "in_progress",
                    "logs": step["msg"],
                    "progress": step["progress"]
                }
            )
            if log_resp.status_code == 200:
                print("Log actualizado correctamente.")
            time.sleep(1) # Simular tiempo de procesamiento
            
        # 3. Completar el trabajo
        log_step("3. Completando el trabajo y guardando resultados...")
        
        result_payload = {
            "status": "completed",
            "result": {
                "success": True,
                "platform": "youtube",
                "platform_url": "https://youtube.com/watch?v=mundos_simulados_test",
                "platform_id": "mundos_simulados_test",
                "video_id": "mundos_simulados_test"
            },
            "logs": "Procesamiento finalizado exitosamente.",
            "youtubeUrl": "https://youtube.com/watch?v=mundos_simulados_test",
            "wordpressPostId": 101 # Simular un ID de post
        }
        
        complete_resp = requests.post(
            f"{API_URL}/job/{job_id}/complete",
            json=result_payload
        )
        
        if complete_resp.status_code == 200:
            print("Trabajo completado exitosamente en el backend.")
            print(json.dumps(complete_resp.json(), indent=2))
        else:
            print(f"Error al completar: {complete_resp.text}")
            
        # 4. Validar estado final
        log_step("4. Validando estado final en la base de datos...")
        status_resp = requests.get(f"{API_URL}/job/{job_id}")
        if status_resp.status_code == 200:
            final_data = status_resp.json()["data"]
            print(f"Estado Final: {final_data['status']}")
            print(f"Logs totales: {len(final_data['logs'].splitlines())} líneas")
            print(f"Resultado guardado: {final_data['result']}")
        
    except requests.exceptions.ConnectionError:
        print(f"Error: No se pudo conectar al servidor en {BASE_URL}")
        print("Asegúrate de que el servidor Express esté corriendo.")

if __name__ == "__main__":
    test_workflow()
