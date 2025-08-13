@echo off
echo 🚀 Iniciando servidor con configuracion optimizada para archivos grandes...
echo.

REM Configurar opciones de Node.js para manejar archivos grandes
set NODE_OPTIONS=--max-old-space-size=4096 --expose-gc

echo 💾 Memoria configurada: 4GB
echo 🧹 Garbage collection habilitado
echo.

REM Iniciar el servidor
node server.js

pause
