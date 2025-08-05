# Script para actualizar las verificaciones de filas vacías
# para que ignoren CAPTURA_CC cuando tiene valor "EN PROCESO"

$filePath = "dashboard\src\pages\IngresarAclaraciones.jsx"
$content = Get-Content $filePath -Raw

# Patrón a buscar: líneas que verifican EUROSKIN y AÑO pero no CAPTURA_CC
$pattern = '(\s+)if \(key === "EUROSKIN" && \(value === "false" \|\| value === ""\)\) return false;\s*\n(\s+)if \(key === "AÑO"\) return false;'

# Reemplazo: agregar verificación de CAPTURA_CC
$replacement = '$1if (key === "EUROSKIN" && (value === "false" || value === "")) return false;' + "`n" + '$1if (key === "CAPTURA_CC" && value === "EN PROCESO") return false;' + "`n" + '$2if (key === "AÑO") return false;'

# Aplicar el reemplazo
$newContent = $content -replace $pattern, $replacement

# Escribir el archivo actualizado
$newContent | Set-Content $filePath

Write-Host "✅ Archivo actualizado: Se agregó verificación de CAPTURA_CC en las funciones de detección de filas vacías"
