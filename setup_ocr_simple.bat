@echo off
chcp 65001 >nul
echo 🚀 Instalación Rápida de OCR (solo lo esencial)
echo.

REM Eliminar entorno anterior
if exist "ocr_env" rmdir /s /q ocr_env

REM Crear nuevo entorno
echo Creando entorno virtual...
python -m venv ocr_env

REM Activar
call ocr_env\Scripts\activate.bat

REM Actualizar herramientas básicas
echo Actualizando pip...
python -m pip install --upgrade pip

REM Instalar solo lo mínimo para que funcione
echo Instalando dependencias mínimas...
pip install flask
pip install opencv-python
pip install easyocr
pip install pillow

echo.
echo ✅ Instalación mínima completada!
echo Ejecuta: .\start_ocr.bat
pause
