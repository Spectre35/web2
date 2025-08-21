@echo off
chcp 65001 >nul
echo 🐍 Iniciando Servicio OCR con EasyOCR...
echo.

REM Verificar si el entorno virtual existe
if not exist "ocr_env" (
    echo ❌ Entorno virtual no encontrado
    echo Por favor ejecuta .\setup_ocr.bat primero
    pause
    exit /b 1
)

REM Activar entorno virtual
echo Activando entorno virtual...
call ocr_env\Scripts\activate.bat

REM Verificar que EasyOCR esté instalado
python -c "import easyocr; print('EasyOCR está disponible')" 2>nul
if %errorlevel% neq 0 (
    echo ❌ EasyOCR no está instalado correctamente
    echo Ejecutando instalación rápida...
    pip install easyocr
    if %errorlevel% neq 0 (
        echo ❌ Error instalando EasyOCR
        echo Por favor ejecuta .\setup_ocr.bat para reinstalar todo
        pause
        exit /b 1
    )
)

echo.
echo ✅ Iniciando servidor OCR en puerto 5001...
echo 📝 Para detener el servidor, presiona Ctrl+C
echo.
python ocr_service.py
