@echo off
cd /d "C:\Users\CARGOSAUTO1\OneDrive\Documentos\Web_Consultas_2"
echo Starting server on directory: %CD%
echo Checking if server.js exists...
if exist server.js (
    echo server.js found, starting...
    node server.js
) else (
    echo server.js not found!
    dir *.js
)
pause
