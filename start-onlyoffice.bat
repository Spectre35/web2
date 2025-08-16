@echo off

echo 🚀 Iniciando ONLYOFFICE Document Server...

REM Verificar que Docker esté ejecutándose
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker no está ejecutándose. Por favor, inicia Docker primero.
    pause
    exit /b 1
)

REM Crear directorios necesarios
if not exist "nginx\logs" mkdir nginx\logs
if not exist "nginx\ssl" mkdir nginx\ssl

REM Levantar los servicios
docker-compose up -d

echo ⏳ Esperando a que los servicios estén listos...
timeout /t 30 /nobreak >nul

REM Verificar estado de los servicios
echo 📊 Estado de los servicios:
docker-compose ps

REM Mostrar URLs de acceso
echo.
echo ✅ ONLYOFFICE Document Server iniciado!
echo.
echo 🌐 URLs de acceso:
echo    - Directo: http://localhost:8080
echo    - Via Nginx: http://localhost
echo    - Health Check: http://localhost/healthcheck
echo.
echo 🔑 JWT Secret configurado: tu_secreto_jwt_muy_seguro_2024
echo.
echo 📝 Para detener: docker-compose down
echo 📋 Para ver logs: docker-compose logs -f onlyoffice

pause
