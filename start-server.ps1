Write-Host "Starting Node.js server..."
Set-Location "C:\Users\CARGOSAUTO1\OneDrive\Documentos\Web_Consultas_2"
Write-Host "Current directory: $(Get-Location)"
Write-Host "Checking for server.js..."
if (Test-Path "server.js") {
    Write-Host "server.js found, starting server..."
    node server.js
} else {
    Write-Host "server.js not found!"
    Get-ChildItem *.js
}
Read-Host "Press Enter to continue"
