#!/bin/bash

# =============================================================================
# SCRIPT DE CONFIGURACIÓN INTERACTIVA - SISTEMA ZENIT
# setup_env.sh
# =============================================================================

echo "🛠️ Configuración inicial de Cerebro Editorial (Sistema ZENIT)..."

# Función para solicitar datos con valor por defecto
ask() {
    local prompt=$1
    local default=$2
    local var_name=$3
    read -p "$prompt [$default]: " input
    if [ -z "$input" ]; then
        eval "$var_name=\"$default\""
    else
        eval "$var_name=\"$input\""
    fi
}

# 1. Configuración de Base de Datos
echo -e "\n--- Configuración de MySQL ---"
ask "Host de la Base de Datos" "localhost" DB_HOST
ask "Puerto" "3306" DB_PORT
ask "Nombre de la Base de Datos" "cerebro_editorial" DB_NAME
ask "Usuario" "root" DB_USER
read -s -p "Contraseña de la Base de Datos: " DB_PASS
echo ""

# 2. Configuración de WordPress
echo -e "\n--- Configuración de WordPress ---"
ask "URL del sitio WordPress" "https://tudominio.com" WP_URL
ask "Usuario Administrador WP" "admin" WP_USER
ask "Application Password de WP" "xxxx-xxxx-xxxx-xxxx" WP_PASS
ask "Nombre del sitio" "Cerebro Editorial" WP_NAME

# 3. Generar archivo .env
echo -e "\n📝 Generando archivo .env..."
cat <<EOF > .env
DATABASE_URL=mysql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME
DATABASE_HOST=$DB_HOST
DATABASE_PORT=$DB_PORT
DATABASE_USER=$DB_USER
DATABASE_PASSWORD=$DB_PASS
DATABASE_NAME=$DB_NAME

PORT=3000
NODE_ENV=production
API_URL=http://localhost:3000

WORDPRESS_SITE_URL=$WP_URL
WORDPRESS_USERNAME=$WP_USER
WORDPRESS_APP_PASSWORD=$WP_PASS
WORDPRESS_SITE_NAME=$WP_NAME

LOG_DIR=./logs
SCREENSHOTS_DIR=./logs/screenshots
EOF

echo "✅ Archivo .env generado exitosamente."

# 4. Inicializar base de datos
echo -e "\n🌱 ¿Deseas ejecutar la siembra de datos inicial (seed_data.ts)? (s/n)"
read -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "Ejecutando siembra de datos..."
    if command -v pnpm &> /dev/null; then
        pnpm db:push
    else
        npx drizzle-kit push:mysql
    fi
    # Nota: Asegúrate de tener ts-node o usar npx
    npx ts-node seed_data.ts
    echo "✅ Siembra completada."
fi

echo -e "\n✨ Configuración finalizada exitosamente."
echo "🚀 Ahora puedes iniciar el sistema con: ./deploy.sh"
