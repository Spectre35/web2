#!/bin/bash

echo "🚀 Configurando deployment para Railway y Render..."

# Crear archivos necesarios si no existen
if [ ! -f ".env.example" ]; then
  echo "DATABASE_URL=postgresql://usuario:password@host:puerto/database" > .env.example
  echo "PORT=3001" >> .env.example
  echo "NODE_ENV=production" >> .env.example
fi

echo "✅ Archivos de configuración creados"
echo ""
echo "📋 Siguiente paso:"
echo "1. Sube tu código a GitHub"
echo "2. Ve a railway.app y conecta tu repositorio"
echo "3. Ve a render.com y conecta tu repositorio"
echo "4. Configura las variables de entorno en Railway"
echo ""
