@echo off
echo ========================================
echo   INICIANDO ARQUITECTURA DUAL-SERVIDOR
echo ========================================
echo.
echo 🚀 Servidor Principal: Puerto 3001
echo 🔧 Servidor OCR:       Puerto 3002
echo.

rem Iniciar servidor OCR en puerto 3002
start "OCR Server" cmd /k "cd /d c:\Users\Cargosauto 1\Documents\WEB2_DEV\ocr-system && node server.js"

rem Esperar 5 segundos para que el servidor OCR inicie
timeout /t 5 /nobreak

echo ✅ Servidor OCR iniciado en puerto 3002
echo ✅ Servidor Principal ya corriendo en puerto 3001
echo.
echo 📋 Para probar la arquitectura:
echo    - Servidor principal: http://localhost:3001/health
echo    - Servidor OCR:       http://localhost:3002/api/health
echo    - Proxy stats:        http://localhost:3001/api/ocr/stats
echo    - Proxy documentos:   http://localhost:3001/api/ocr/documents
echo.
echo 🏁 Presiona cualquier tecla para cerrar...
pause
