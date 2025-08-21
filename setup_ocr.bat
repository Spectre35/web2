@echo off
echo Instalando dependencias de Python para OCR Service...
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no está instalado o no está en el PATH
    echo Por favor instala Python desde https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Verificar si pip está disponible
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: pip no está disponible
    pause
    exit /b 1
)

echo Python detectado correctamente
echo.

REM Eliminar entorno virtual anterior si existe
if exist "ocr_env" (
    echo Eliminando entorno virtual anterior...
    rmdir /s /q ocr_env
)

REM Crear entorno virtual
echo Creando entorno virtual...
python -m venv ocr_env

REM Activar entorno virtual
echo Activando entorno virtual...
call ocr_env\Scripts\activate.bat

REM Actualizar pip y setuptools
echo Actualizando pip y herramientas...
python -m pip install --upgrade pip setuptools wheel

REM Instalar PyTorch primero (es una dependencia de EasyOCR)
echo Instalando PyTorch...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

REM Instalar dependencias una por una para evitar conflictos
echo Instalando Flask...
pip install flask werkzeug

echo Instalando numpy...
pip install numpy

echo Instalando OpenCV...
pip install opencv-python

echo Instalando Pillow...
pip install pillow

echo Instalando EasyOCR...
pip install easyocr

echo.
echo ✅ Instalación completada!
echo.
echo Para usar el servicio OCR:
echo 1. Ejecuta: .\start_ocr.bat
echo 2. En otra terminal ejecuta tu servidor Node.js
echo.
pause
