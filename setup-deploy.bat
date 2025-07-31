@echo off
echo 🚀 Configurando deployment para Railway y Render...

REM Crear archivo .env.example si no existe
if not exist ".env.example" (
  echo DATABASE_URL=postgresql://usuario:password@host:puerto/database > .env.example
  echo PORT=3001 >> .env.example
  echo NODE_ENV=production >> .env.example
)

echo ✅ Archivos de configuración creados
echo.
echo 📋 Siguiente paso:
echo 1. Sube tu código a GitHub
echo 2. Ve a railway.app y conecta tu repositorio
echo 3. Ve a render.com y conecta tu repositorio
echo 4. Configura las variables de entorno en Railway
echo.
pause
