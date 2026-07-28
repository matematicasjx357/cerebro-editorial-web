#!/bin/bash

# =============================================================================
# SCRIPT DE COPIAS DE SEGURIDAD - SISTEMA ZENIT
# backup_db.sh
# =============================================================================

# Configuración
BACKUP_DIR="./backups"
DAYS_TO_KEEP=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="cerebro_editorial"
DB_USER="root"
DB_PASS="" # Si usas contraseña, agrégala aquí o usa un archivo .my.cnf

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "💾 Iniciando copia de seguridad de la base de datos..."

# Nombre del archivo
BACKUP_FILE="$BACKUP_DIR/backup_${DATABASE_NAME}_${TIMESTAMP}.sql"

# Ejecutar mysqldump
if command -v mysqldump &> /dev/null; then
    # Usar variables de entorno si están disponibles
    if [ ! -z "$DATABASE_URL" ]; then
        # Intentar extraer datos de DATABASE_URL si existe
        echo "Usando configuración de DATABASE_URL..."
        # Nota: Este es un ejemplo simplificado de extracción
        # mysqldump --url="$DATABASE_URL" > "$BACKUP_FILE"
    fi
    
    mysqldump -u "$DB_USER" "$DATABASE_NAME" > "$BACKUP_FILE"
    
    # Comprimir el archivo
    gzip "$BACKUP_FILE"
    echo "✅ Copia de seguridad creada: ${BACKUP_FILE}.gz"
    
    # Rotación: eliminar archivos más antiguos de 7 días
    echo "🧹 Limpiando copias de seguridad antiguas (más de $DAYS_TO_KEEP días)..."
    find "$BACKUP_DIR" -name "backup_${DATABASE_NAME}_*.sql.gz" -mtime +$DAYS_TO_KEEP -delete
    echo "✅ Limpieza completada."
else
    echo "❌ mysqldump no está instalado."
    exit 1
fi

echo "✨ Proceso de backup finalizado exitosamente."
