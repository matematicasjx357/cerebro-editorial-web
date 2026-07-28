#!/bin/bash

# =============================================================================
# SCRIPT DE DESPLIEGUE AUTOMATIZADO - SISTEMA ZENIT
# deploy.sh
# =============================================================================

set -e

echo "🚀 Iniciando despliegue de Cerebro Editorial (Sistema ZENIT)..."

# 1. Obtener los últimos cambios de GitHub
echo "📥 Actualizando código desde GitHub..."
git pull origin main

# 2. Instalar dependencias de Node.js
echo "📦 Instalando dependencias de Node.js..."
if command -v pnpm &> /dev/null; then
    pnpm install
else
    npm install
fi

# 3. Instalar dependencias de Python
echo "🐍 Instalando dependencias de Python..."
pip3 install -r requirements.txt

# 4. Instalar navegadores de Playwright
echo "🌐 Instalando navegadores de Playwright..."
playwright install chromium

# 5. Compilar el frontend React
echo "🏗️ Compilando frontend..."
if command -v pnpm &> /dev/null; then
    pnpm build
else
    npm run build
fi

# 6. Ejecutar migraciones de base de datos
echo "🗄️ Ejecutando migraciones de base de datos..."
if command -v pnpm &> /dev/null; then
    pnpm db:push
else
    npx drizzle-kit push:mysql
fi

# 7. Reiniciar servicios con PM2
echo "🔄 Reiniciando servicios con PM2..."
if command -v pm2 &> /dev/null; then
    pm2 delete ecosystem.config.js || true
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Servicios reiniciados exitosamente."
else
    echo "⚠️ PM2 no está instalado. Por favor, instala PM2 globalmente: npm install -g pm2"
fi

echo "✨ Despliegue completado exitosamente!"
echo "📊 Puedes monitorear el sistema con: pm2 status"
