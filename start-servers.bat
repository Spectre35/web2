@echo off
echo Iniciando servidores...

:: Iniciar el servidor principal en una nueva ventana
start "Servidor Principal" cmd /k "node server.js"

:: Esperar un momento para asegurar que el servidor principal inicie primero
timeout /t 2

:: Iniciar el servidor OCR en una nueva ventana
cd ocr-system
start "Servidor OCR" cmd /k "node server.js"

echo Servidores iniciados:
echo Servidor Principal: http://localhost:3001
echo Servidor OCR: http://localhost:3002
