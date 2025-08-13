#!/bin/bash

echo "🚀 Iniciando servidor con configuración optimizada para archivos grandes..."
echo

# Configurar opciones de Node.js para manejar archivos grandes
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"

echo "💾 Memoria configurada: 4GB"
echo "🧹 Garbage collection habilitado"
echo

# Iniciar el servidor
node server.js
