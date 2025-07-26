// Script para limpiar archivos innecesarios
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

const archivosABorrar = [
  // Archivos de análisis de teléfonos (ya completado)
  'analizar-numeros-ceros.js',
  'analizar-patrones-telefonos.js',
  'analizar-telefonos-ventas.js',
  'limpiar-ceros-telefonos.js',
  'limpiar-telefonos-ventas.js',
  'validar-telefonos-individuales.js',
  'ver-telefonos-reales.js',
  'verificacion-final-telefonos.js',
  'verificar-columna-telefono.js',
  'verificar-filtros-ceros.js',
  'verificar-limpieza-telefonos.js',
  'verificar-telefono.js',
  
  // Archivos de debug de fechas (ya completado)
  'debug-fecha-caja.js',
  'debug-fechas.js',
  'diagnostico-fechas-completo.js',
  'limpiar-fechas-null.js',
  'test-conversion-fechas.js',
  'test-formato-ventas.js',
  'verificar-fechas-caja.js',
  'verificar-ventas-detallado.js',
  
  // Archivos SQL temporales
  'clean-null-records.sql',
  'clean-null-simple.sql',
  'fix-fecha-column.sql',
  'simple-clean.sql',
  
  // Archivos de debug del endpoint de borrado
  'emergency-debug.js',
  'endpoint-borrado-seguro.js',
  'test-delete-function.js',
  'test-delete-safe.js',
  'test-endpoint.js',
  
  // Archivos de limpieza de proyecto
  'limpiar-proyecto.js',
  'limpiar-solo-cargos-auto.js',
  'fix-fecha-step-by-step.js',
  'probar-endpoint-mejorado.js',
  
  // Archivos de verificación temporal
  'check-columns.js',
  'restore-from-branch.js',
  
  // Archivos de documentación temporal
  'CORRECCIONES-BORRADO.md'
];

async function limpiarArchivos() {
  console.log('🧹 Iniciando limpieza de archivos innecesarios...');
  console.log(`📂 Se van a borrar ${archivosABorrar.length} archivos`);
  
  let borrados = 0;
  let noEncontrados = 0;
  
  for (const archivo of archivosABorrar) {
    try {
      if (existsSync(archivo)) {
        await unlink(archivo);
        console.log(`✅ Borrado: ${archivo}`);
        borrados++;
      } else {
        console.log(`⚠️ No encontrado: ${archivo}`);
        noEncontrados++;
      }
    } catch (error) {
      console.log(`❌ Error borrando ${archivo}: ${error.message}`);
    }
  }
  
  console.log('\n📊 RESUMEN DE LIMPIEZA:');
  console.log(`✅ Archivos borrados: ${borrados}`);
  console.log(`⚠️ No encontrados: ${noEncontrados}`);
  console.log(`📂 Archivos que permanecen necesarios:`);
  console.log('   - server.js (servidor principal)');
  console.log('   - control_panel.py (panel de control)');
  console.log('   - package.json (configuración)');
  console.log('   - README.md (documentación)');
  console.log('   - dashboard/ (frontend)');
  console.log('   - uploads/ (archivos subidos)');
  console.log('   - node_modules/ (dependencias)');
  
  console.log('\n🎉 ¡Limpieza completada!');
}

limpiarArchivos().catch(console.error);
