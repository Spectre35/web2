#!/bin/bash

echo "🚀 Iniciando ONLYOFFICE Document Server..."

# Verificar que Docker esté ejecutándose
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose. Por favor, inicia Docker primero."
    exit 1
fi

# Crear directorios necesarios
mkdir -p ./nginx/logs
mkdir -p ./nginx/ssl

# Levantar los servicios
docker-compose up -d

echo "⏳ Esperando a que los servicios estén listos..."
sleep 30

# Verificar estado de los servicios
echo "📊 Estado de los servicios:"
docker-compose ps

# Mostrar URLs de acceso
echo ""
echo "✅ ONLYOFFICE Document Server iniciado!"
echo ""
echo "🌐 URLs de acceso:"
echo "   - Directo: http://localhost:8080"
echo "   - Via Nginx: http://localhost"
echo "   - Health Check: http://localhost/healthcheck"
echo ""
echo "🔑 JWT Secret configurado: tu_secreto_jwt_muy_seguro_2024"
echo ""
echo "📝 Para detener: docker-compose down"
echo "📋 Para ver logs: docker-compose logs -f onlyoffice"
