import fs from 'fs';
import path from 'path';

const rootDir = 'c:\\Users\\CARGOSAUTO1\\OneDrive\\Documentos\\Web_Consultas_2';

// Lista de archivos y patrones a eliminar
const archivosAEliminar = [
  // Scripts de análisis temporales
  'analizar-numeros-ceros.js',
  'analizar-patrones-telefonos.js', 
  'analizar-telefonos-ventas.js',
  
  // Scripts de debugging
  'debug-fecha-caja.js',
  'debug-fechas.js',
  'diagnostico-fechas-completo.js',
  
  // Scripts de limpieza (ya ejecutados)
  'limpiar-ceros-telefonos.js',
  'limpiar-fechas-null.js',
  'limpiar-solo-cargos-auto.js',
  'limpiar-telefonos-ventas.js',
  
  // Scripts de testing
  'test-conversion-fechas.js',
  'test-endpoint.js',
  'test-formato-ventas.js',
  
  // Scripts de verificación
  'verificacion-final-telefonos.js',
  'verificar-columna-telefono.js',
  'verificar-fechas-caja.js',
  'verificar-filtros-ceros.js',
  'verificar-limpieza-telefonos.js',
  'verificar-telefono.js',
  'verificar-ventas-detallado.js',
  'ver-telefonos-reales.js',
  'validar-telefonos-individuales.js',
  'probar-endpoint-mejorado.js',
  
  // Archivos SQL temporales
  'clean-null-records.sql',
  'clean-null-simple.js',
  'fix-fecha-column.sql',
  'fix-fecha-step-by-step.js',
  'simple-clean.sql',
  
  // Scripts de migración y corrección
  'migrar.js',
  'rollback-emergency.bat',
  'rollback-frontend.bat',
  'add-imports.cjs',
  'check-columns.js',
  'check-imports.cjs',
  'fix-quotes.cjs',
  'fix-urls.cjs',
  'fix-urls.js',
  'procesar-slack.js',
  
  // Archivos de inicio duplicados
  'start-server.bat',
  'start-server.ps1'
];

// Directorios a limpiar completamente
const directoriosALimpiar = [
  'uploads' // Archivos de upload temporales
];

// Archivos en dashboard a eliminar
const archivosDashboard = [
  'dashboard/Libro1.xlsx', // Archivo Excel temporal
  'dashboard/README.md',   // README duplicado
  'dashboard/vite-dev.config.js' // Config de desarrollo duplicado
];

async function limpiarArchivos() {
  console.log('🧹 INICIANDO LIMPIEZA DE ARCHIVOS INNECESARIOS\n');
  
  let archivosEliminados = 0;
  let errores = 0;

  // Eliminar archivos individuales
  console.log('📄 Eliminando archivos individuales...');
  for (const archivo of archivosAEliminar) {
    const rutaCompleta = path.join(rootDir, archivo);
    try {
      if (fs.existsSync(rutaCompleta)) {
        fs.unlinkSync(rutaCompleta);
        console.log(`   ✅ Eliminado: ${archivo}`);
        archivosEliminados++;
      } else {
        console.log(`   ⚠️  No encontrado: ${archivo}`);
      }
    } catch (error) {
      console.log(`   ❌ Error eliminando ${archivo}: ${error.message}`);
      errores++;
    }
  }

  // Eliminar archivos del dashboard
  console.log('\n📱 Eliminando archivos del dashboard...');
  for (const archivo of archivosDashboard) {
    const rutaCompleta = path.join(rootDir, archivo);
    try {
      if (fs.existsSync(rutaCompleta)) {
        fs.unlinkSync(rutaCompleta);
        console.log(`   ✅ Eliminado: ${archivo}`);
        archivosEliminados++;
      } else {
        console.log(`   ⚠️  No encontrado: ${archivo}`);
      }
    } catch (error) {
      console.log(`   ❌ Error eliminando ${archivo}: ${error.message}`);
      errores++;
    }
  }

  // Limpiar directorio uploads
  console.log('\n📦 Limpiando directorio uploads...');
  const uploadsDir = path.join(rootDir, 'uploads');
  try {
    if (fs.existsSync(uploadsDir)) {
      const archivos = fs.readdirSync(uploadsDir);
      for (const archivo of archivos) {
        const rutaArchivo = path.join(uploadsDir, archivo);
        try {
          fs.unlinkSync(rutaArchivo);
          console.log(`   ✅ Eliminado upload: ${archivo}`);
          archivosEliminados++;
        } catch (error) {
          console.log(`   ❌ Error eliminando upload ${archivo}: ${error.message}`);
          errores++;
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Error accediendo al directorio uploads: ${error.message}`);
    errores++;
  }

  // Resumen
  console.log('\n📊 RESUMEN DE LIMPIEZA:');
  console.log(`   ✅ Archivos eliminados: ${archivosEliminados}`);
  console.log(`   ❌ Errores: ${errores}`);
  
  if (errores === 0) {
    console.log('\n🎉 ¡Limpieza completada exitosamente!');
    console.log('📈 El proyecto ahora tiene mejor rendimiento y está más organizado.');
  } else {
    console.log('\n⚠️  Limpieza completada con algunos errores.');
  }

  // Mostrar archivos importantes que se mantienen
  console.log('\n📋 ARCHIVOS IMPORTANTES MANTENIDOS:');
  console.log('   📄 server.js - Servidor principal');
  console.log('   📄 package.json - Dependencias del proyecto');
  console.log('   📄 README.md - Documentación principal');
  console.log('   📁 dashboard/ - Aplicación frontend');
  console.log('   📁 node_modules/ - Dependencias instaladas');
  console.log('   📁 .git/ - Control de versiones');
}

limpiarArchivos().catch(console.error);
