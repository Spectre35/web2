import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista de archivos y directorios a eliminar
const archivosAEliminar = [
  // Scripts de corrección temporales en dashboard
  'dashboard/actualizar-urls.js',
  'dashboard/arreglar-urls-duplicadas.js', 
  'dashboard/corregir-urls.js',
  
  // Archivos duplicados y versiones temporales en pages/
  'dashboard/src/pages/Caja_new.jsx',
  'dashboard/src/pages/CargosAuto_new.jsx',
  'dashboard/src/pages/DashboardRecuperacion_new.jsx',
  'dashboard/src/pages/DashboardRecuperacion_simple.jsx',
  'dashboard/src/pages/IngresarAclaraciones_new.jsx',
  'dashboard/src/pages/RecuperacionNew.jsx',
  'dashboard/src/pages/SucursalesAlerta_fixed.jsx',
  'dashboard/src/pages/SucursalesAlerta_new.jsx',
  'dashboard/src/pages/VendedorasStatus_new.jsx',
  'dashboard/src/pages/VendedorasStatus_simple.jsx',
  'dashboard/src/pages/Ventas_new.jsx',
];

console.log('🧹 Iniciando limpieza de archivos innecesarios...\n');

let eliminados = 0;
let errores = 0;

archivosAEliminar.forEach(archivo => {
  const rutaCompleta = path.join(__dirname, archivo);
  
  try {
    if (fs.existsSync(rutaCompleta)) {
      fs.unlinkSync(rutaCompleta);
      console.log(`✅ Eliminado: ${archivo}`);
      eliminados++;
    } else {
      console.log(`⚠️  No existe: ${archivo}`);
    }
  } catch (error) {
    console.log(`❌ Error eliminando ${archivo}: ${error.message}`);
    errores++;
  }
});

console.log(`\n📊 Resumen de limpieza:`);
console.log(`✅ Archivos eliminados: ${eliminados}`);
console.log(`❌ Errores: ${errores}`);
console.log(`\n🎉 Limpieza completada!`);
