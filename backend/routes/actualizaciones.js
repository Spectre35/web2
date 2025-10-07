import { Router } from 'express';
import { pool } from '../../config/database.js';

const router = Router();

async function connectToOriginalDB() {
  return await pool.connect();
}

// 📝 Endpoint para actualización masiva de CAPTURA_CC
router.post('/actualizar-captura-cc', async (req, res) => {
  let client;
  const startTime = Date.now();

  try {
    console.log('🚀 [RENDER] Iniciando actualización masiva...');
    console.log('🚀 [RENDER] Memoria antes:', process.memoryUsage());
    
    const { transacciones } = req.body;

    if (!transacciones || !Array.isArray(transacciones)) {
      console.log('❌ [RENDER] Error: transacciones inválidas');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de transacciones con id_transaccion y estatus'
      });
    }

    console.log('📊 [RENDER] Total transacciones a actualizar:', transacciones.length);
    
    try {
      client = await connectToOriginalDB();
      console.log('✅ [RENDER] Conexión a BD establecida para actualización');
    } catch (dbError) {
      console.error('❌ [RENDER] Error conectando a BD para actualización:', dbError.message);
      throw dbError;
    }

    // NO usar transacción para testing - hacer commits automáticos
    // await client.query('BEGIN');

    let actualizacionesExitosas = 0;
    let errores = [];
    let noEncontrados = [];

    console.log(`🔄 Iniciando actualización masiva de ${transacciones.length} registros...`);

    for (const transaccion of transacciones) {
      const { id_transaccion, estatus } = transaccion;

      // Validar que tengamos los datos necesarios
      if (!id_transaccion || !estatus) {
        errores.push({
          id_transaccion: id_transaccion || 'N/A',
          error: 'ID de transacción o estatus faltante'
        });
        continue;
      }

      try {
        console.log(`🔄 Actualizando ID: "${id_transaccion}" -> "${estatus}"`);

        // 🔴 BREAKPOINT AQUÍ - El debugger pausará en esta línea
        debugger;

        // Buscar y actualizar en la tabla aclaraciones con búsqueda flexible
        const resultado = await client.query(`
          UPDATE aclaraciones
          SET captura_cc = $1
          WHERE id_de_transaccion ILIKE '%' || $2 || '%'
          OR autorizacion ILIKE '%' || $2 || '%'
        `, [estatus, id_transaccion]);

        console.log(`📊 Filas afectadas: ${resultado.rowCount}`);

        // Verificar que el cambio se aplicó realmente
        if (resultado.rowCount > 0) {
          const verificacion = await client.query(`
            SELECT captura_cc FROM aclaraciones
            WHERE id_de_transaccion ILIKE '%' || $1 || '%'
            OR autorizacion ILIKE '%' || $1 || '%'
            LIMIT 1
          `, [id_transaccion]);

          console.log(`🔍 Valor después de UPDATE: "${verificacion.rows[0]?.captura_cc}"`);

          actualizacionesExitosas++;
          console.log(`✅ Actualizado ID: ${id_transaccion} -> ${estatus}`);
        } else {
          noEncontrados.push({
            id_transaccion,
            estatus,
            motivo: 'ID de transacción no encontrado en aclaraciones'
          });
          console.log(`⚠️ No encontrado ID: ${id_transaccion}`);
        }

      } catch (error) {
        errores.push({
          id_transaccion,
          error: error.message
        });
        console.error(`❌ Error actualizando ${id_transaccion}:`, error.message);
      }
    }

    // NO hacer COMMIT manual - usar autocommit
    // await client.query('COMMIT');

    const tiempoTotal = Date.now() - startTime;
    const memoriaFinal = process.memoryUsage();

    console.log('✅ [RENDER] Actualización masiva completada:');
    console.log('   - Total procesadas:', transacciones.length);
    console.log('   - Exitosas:', actualizacionesExitosas);
    console.log('   - No encontradas:', noEncontrados.length);
    console.log('   - Errores:', errores.length);
    console.log('   - Tiempo total:', tiempoTotal, 'ms');
    console.log('   - Memoria final:', memoriaFinal);

    res.json({
      success: true,
      data: {
        total_procesados: transacciones.length,
        actualizaciones_exitosas: actualizacionesExitosas,
        no_encontrados: noEncontrados.length,
        errores: errores.length,
        detalles: {
          errores: errores,
          no_encontrados: noEncontrados
        },
        tiempo_procesamiento: tiempoTotal,
        memoria_usada: memoriaFinal
      },
      message: `Se actualizaron ${actualizacionesExitosas} registros exitosamente`
    });

  } catch (error) {
    const tiempoError = Date.now() - startTime;
    const memoriaError = process.memoryUsage();
    
    console.error('❌ [RENDER] ERROR CRÍTICO en actualizar-captura-cc:');
    console.error('   - Mensaje:', error.message);
    console.error('   - Stack:', error.stack);
    console.error('   - Tiempo hasta error:', tiempoError, 'ms');
    console.error('   - Tipo de error:', error.constructor.name);
    console.error('   - Memoria en error:', memoriaError);
    
    res.status(500).json({
      success: false,
      message: 'Error en la actualización masiva en Render',
      error: error.message,
      tiempo_error: tiempoError,
      tipo_error: error.constructor.name,
      memoria_error: memoriaError
    });
  } finally {
    if (client) {
      console.log('🔌 [RENDER] Liberando conexión BD para actualización');
      client.release();
    }
  }
});

// 📊 Endpoint para verificar registros antes de actualizar
router.post('/verificar-transacciones', async (req, res) => {
  let client;
  const startTime = Date.now();

  try {
    console.log('🚀 [RENDER] Iniciando verificación de transacciones...');
    console.log('🚀 [RENDER] Tamaño del body:', JSON.stringify(req.body).length, 'bytes');
    
    const { transacciones } = req.body;

    if (!transacciones || !Array.isArray(transacciones)) {
      console.log('❌ [RENDER] Error: transacciones inválidas');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de transacciones'
      });
    }

    console.log('📊 [RENDER] Total transacciones a verificar:', transacciones.length);
    
    try {
      client = await connectToOriginalDB();
      console.log('✅ [RENDER] Conexión a BD establecida');
    } catch (dbError) {
      console.error('❌ [RENDER] Error conectando a BD:', dbError.message);
      throw dbError;
    }

    const verificaciones = [];

    for (const transaccion of transacciones) {
      const { id_transaccion, estatus } = transaccion;

      if (!id_transaccion) continue;

      try {
        console.log(`🔍 Buscando ID: "${id_transaccion}" (longitud: ${id_transaccion.length})`);

        // Consulta principal con búsqueda flexible
        const resultado = await client.query(`
          SELECT
            id_de_transaccion,
            autorizacion,
            captura_cc
          FROM aclaraciones
          WHERE id_de_transaccion ILIKE '%' || $1 || '%'
          OR autorizacion ILIKE '%' || $1 || '%'
          LIMIT 5
        `, [id_transaccion]);

        console.log(`📊 Resultados encontrados: ${resultado.rows.length}`);

        // Si no encuentra nada, hacer una búsqueda más amplia para debug
        if (resultado.rows.length === 0) {
          console.log(`🔍 Haciendo búsqueda parcial...`);
          const debugQuery = await client.query(`
            SELECT id_de_transaccion, captura_cc
            FROM aclaraciones
            WHERE id_de_transaccion LIKE $1
            LIMIT 3
          `, [`%${id_transaccion}%`]);

          console.log(`🔍 Búsqueda parcial encontró: ${debugQuery.rows.length} resultados`);
          if (debugQuery.rows.length > 0) {
            debugQuery.rows.forEach(row => {
              console.log(`   Similar: "${row.id_de_transaccion}" (longitud: ${row.id_de_transaccion.length})`);
            });
          }
        }

        if (resultado.rows.length > 0) {
          console.log(`✅ Encontrado: "${resultado.rows[0].id_de_transaccion}" (auth: ${resultado.rows[0].autorizacion || 'N/A'})`);
          // Mostrar todas las coincidencias encontradas
          resultado.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ID: "${row.id_de_transaccion}", Auth: "${row.autorizacion || 'N/A'}", CAPTURA_CC: "${row.captura_cc || 'N/A'}"`);
          });
        }

        if (resultado.rows.length > 0) {
          const coincidencia = resultado.rows[0]; // Tomar la primera coincidencia
          verificaciones.push({
            id_transaccion,
            estatus_nuevo: estatus,
            existe: true,
            captura_cc_actual: coincidencia.captura_cc,
            id_encontrado: coincidencia.id_de_transaccion,
            autorizacion_encontrada: coincidencia.autorizacion,
            total_coincidencias: resultado.rows.length
          });
        } else {
          verificaciones.push({
            id_transaccion,
            estatus_nuevo: estatus,
            existe: false,
            captura_cc_actual: null
          });
        }

      } catch (error) {
        console.error(`❌ Error buscando ID ${id_transaccion}:`, error.message);
        verificaciones.push({
          id_transaccion,
          estatus_nuevo: estatus,
          existe: false,
          error: error.message
        });
      }
    }

    const encontrados = verificaciones.filter(v => v.existe).length;
    const noEncontrados = verificaciones.filter(v => !v.existe).length;
    const tiempoTotal = Date.now() - startTime;

    console.log('✅ [RENDER] Verificación completada:');
    console.log('   - Total procesadas:', transacciones.length);
    console.log('   - Encontradas:', encontrados);
    console.log('   - No encontradas:', noEncontrados);
    console.log('   - Tiempo total:', tiempoTotal, 'ms');

    res.json({
      success: true,
      data: {
        total_verificados: transacciones.length,
        encontrados,
        no_encontrados: noEncontrados,
        verificaciones,
        tiempo_procesamiento: tiempoTotal
      }
    });

  } catch (error) {
    const tiempoError = Date.now() - startTime;
    console.error('❌ [RENDER] ERROR CRÍTICO en verificar-transacciones:');
    console.error('   - Mensaje:', error.message);
    console.error('   - Stack:', error.stack);
    console.error('   - Tiempo hasta error:', tiempoError, 'ms');
    console.error('   - Tipo de error:', error.constructor.name);
    
    res.status(500).json({
      success: false,
      message: 'Error verificando transacciones en Render',
      error: error.message,
      tiempo_error: tiempoError,
      tipo_error: error.constructor.name
    });
  } finally {
    if (client) {
      console.log('🔌 [RENDER] Liberando conexión BD');
      client.release();
    }
  }
});

export default router;
