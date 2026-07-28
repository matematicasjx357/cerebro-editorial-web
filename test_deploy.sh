#!/bin/bash

# =============================================================================
# SCRIPT DE VERIFICACIÓN PREVIA - SISTEMA ZENIT
# test_deploy.sh
# =============================================================================

echo "🔍 Iniciando comprobación previa del sistema..."
echo "--------------------------------------------------"

# 1. Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js detectado: $NODE_VERSION"
else
    echo "❌ Node.js no está instalado."
fi

# 2. Verificar Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python detectado: $PYTHON_VERSION"
else
    echo "❌ Python3 no está instalado."
fi

# 3. Verificar MySQL
if command -v mysql &> /dev/null; then
    echo "✅ Cliente MySQL detectado."
else
    echo "⚠️ Cliente MySQL no encontrado (opcional si usas Docker)."
fi

# 4. Verificar PM2
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 detectado."
else
    echo "⚠️ PM2 no está instalado globalmente (necesario para despliegue VPS)."
fi

# 5. Verificar Playwright y Chromium
echo "🌐 Verificando estado de Playwright..."
if python3 -c "import playwright" &> /dev/null; then
    echo "✅ Librería Playwright instalada en Python."
else
    echo "⚠️ Librería Playwright no encontrada en Python."
fi

# 6. Verificar Permisos de Archivo
echo "📂 Verificando permisos de archivos críticos..."
CRITICAL_FILES=("deploy.sh" "setup_env.sh" "main_runner.py")
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        if [ -x "$file" ]; then
            echo "✅ $file tiene permisos de ejecución."
        else
            echo "⚠️ $file NO tiene permisos de ejecución (ejecuta chmod +x $file)."
        fi
    else
        echo "❌ $file no encontrado."
    fi
done

# 7. Verificar Directorios de Logs
echo "📁 Verificando directorios de logs..."
if [ -d "logs/screenshots" ]; then
    echo "✅ Directorio logs/screenshots existe."
else
    echo "⚠️ Directorio logs/screenshots no encontrado (se creará automáticamente)."
fi

echo "--------------------------------------------------"
echo "✨ Comprobación finalizada."
echo "💡 Si ves advertencias (⚠️), revísalas antes de ejecutar ./deploy.sh"
