import express from "express";
import { pool, protegerDatos, formatearFechasEnObjeto } from "../config/database.js";

const router = express.Router();

// 📊 Endpoint para obtener información de BIN
router.get("/:bin", async (req, res) => {
  const { bin } = req.params;
  
  // Validar que el BIN tenga entre 6 y 8 dígitos
  if (!/^\d{6,8}$/.test(bin)) {
    return res.status(400).json({
      error: "BIN inválido",
      mensaje: "El BIN debe contener entre 6 y 8 dígitos numéricos",
      bin: bin
    });
  }
  
  try {
    console.log(`🔍 Consultando información del BIN: ${bin}`);
    
    // Primero verificar si tenemos la información en cache local
    const cacheQuery = `
      SELECT 
        bin, banco, marca, tipo, pais, moneda,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha_consulta,
        consultas_realizadas
      FROM bins_cache 
      WHERE bin = $1
    `;
    
    const cacheResult = await pool.query(cacheQuery, [bin]);
    
    if (cacheResult.rowCount > 0) {
      // Actualizar contador de consultas
      await pool.query(
        `UPDATE bins_cache SET consultas_realizadas = consultas_realizadas + 1, updated_at = NOW() WHERE bin = $1`,
        [bin]
      );
      
      const binInfo = formatearFechasEnObjeto(cacheResult.rows[0]);
      
      console.log(`✅ BIN encontrado en cache: ${bin} - ${binInfo.banco}`);
      
      return res.json({
        bin: bin,
        ...binInfo,
        fuente: "cache_local"
      });
    }
    
    // Si no está en cache, consultar API externa
    const apiUrl = `https://lookup.binlist.net/${bin}`;
    
    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept-Version': '3',
          'User-Agent': 'CargosAuto-BIN-Lookup/1.0'
        },
        timeout: 5000 // 5 segundos de timeout
      });
      
      if (!apiResponse.ok) {
        throw new Error(`API response: ${apiResponse.status}`);
      }
      
      const binData = await apiResponse.json();
      
      // Procesar y normalizar los datos
      const binInfo = {
        bin: bin,
        banco: binData.bank?.name || 'Desconocido',
        marca: binData.brand || binData.scheme || 'Desconocido',
        tipo: binData.type || 'Desconocido',
        pais: binData.country?.name || 'Desconocido',
        codigo_pais: binData.country?.alpha2 || null,
        moneda: binData.country?.currency || 'Desconocido',
        prepago: binData.prepaid || false,
        categoria: binData.category || null
      };
      
      // Guardar en cache para futuras consultas
      const insertQuery = `
        INSERT INTO bins_cache (
          bin, banco, marca, tipo, pais, codigo_pais, 
          moneda, prepago, categoria, consultas_realizadas, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW()
        )
        ON CONFLICT (bin) 
        DO UPDATE SET 
          banco = EXCLUDED.banco,
          marca = EXCLUDED.marca,
          tipo = EXCLUDED.tipo,
          pais = EXCLUDED.pais,
          codigo_pais = EXCLUDED.codigo_pais,
          moneda = EXCLUDED.moneda,
          prepago = EXCLUDED.prepago,
          categoria = EXCLUDED.categoria,
          consultas_realizadas = bins_cache.consultas_realizadas + 1,
          updated_at = NOW()
      `;
      
      await pool.query(insertQuery, [
        bin, binInfo.banco, binInfo.marca, binInfo.tipo,
        binInfo.pais, binInfo.codigo_pais, binInfo.moneda,
        binInfo.prepago, binInfo.categoria
      ]);
      
      console.log(`✅ BIN consultado y guardado: ${bin} - ${binInfo.banco}`);
      
      res.json({
        ...binInfo,
        fuente: "api_externa",
        fecha_consulta: new Date().toLocaleDateString('es-ES')
      });
      
    } catch (apiError) {
      console.warn(`⚠️ Error consultando API externa para BIN ${bin}:`, apiError.message);
      
      // Si falla la API, devolver información básica
      res.json({
        bin: bin,
        banco: 'No disponible',
        marca: 'No disponible',
        tipo: 'No disponible',
        pais: 'No disponible',
        moneda: 'No disponible',
        fuente: "error_api",
        error: "No se pudo obtener información del BIN",
        fecha_consulta: new Date().toLocaleDateString('es-ES')
      });
    }
    
  } catch (error) {
    console.error("❌ Error consultando BIN:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      detalles: error.message,
      bin: bin
    });
  }
});

// 📊 Endpoint para buscar múltiples BINs
router.post("/buscar-multiple", async (req, res) => {
  const { bins } = req.body;
  
  if (!bins || !Array.isArray(bins) || bins.length === 0) {
    return res.status(400).json({
      error: "Se requiere un array de BINs",
      formato: "{ bins: ['123456', '654321', ...] }"
    });
  }
  
  // Limitar a máximo 20 BINs por consulta
  if (bins.length > 20) {
    return res.status(400).json({
      error: "Máximo 20 BINs por consulta",
      recibidos: bins.length
    });
  }
  
  try {
    console.log(`🔍 Consultando ${bins.length} BINs múltiples`);
    
    const resultados = [];
    const errores = [];
    
    for (const bin of bins) {
      // Validar cada BIN
      if (!/^\d{6,8}$/.test(bin)) {
        errores.push({
          bin: bin,
          error: "BIN inválido - debe contener entre 6 y 8 dígitos"
        });
        continue;
      }
      
      try {
        // Consultar cache local
        const cacheQuery = `
          SELECT 
            bin, banco, marca, tipo, pais, moneda,
            TO_CHAR(created_at, 'DD/MM/YYYY') as fecha_consulta
          FROM bins_cache 
          WHERE bin = $1
        `;
        
        const cacheResult = await pool.query(cacheQuery, [bin]);
        
        if (cacheResult.rowCount > 0) {
          const binInfo = formatearFechasEnObjeto(cacheResult.rows[0]);
          resultados.push({
            ...binInfo,
            fuente: "cache_local"
          });
          
          // Actualizar contador
          await pool.query(
            `UPDATE bins_cache SET consultas_realizadas = consultas_realizadas + 1 WHERE bin = $1`,
            [bin]
          );
        } else {
          // Si no está en cache, marcar para consulta externa
          resultados.push({
            bin: bin,
            banco: 'No disponible',
            marca: 'No disponible',
            tipo: 'No disponible',
            pais: 'No disponible',
            moneda: 'No disponible',
            fuente: "no_encontrado",
            mensaje: "BIN no encontrado en cache - use consulta individual para obtener datos actualizados"
          });
        }
        
      } catch (binError) {
        errores.push({
          bin: bin,
          error: binError.message
        });
      }
    }
    
    console.log(`✅ Consulta múltiple completada: ${resultados.length} exitosos, ${errores.length} errores`);
    
    res.json({
      resultados: resultados,
      errores: errores,
      total_solicitados: bins.length,
      exitosos: resultados.length,
      con_errores: errores.length
    });
    
  } catch (error) {
    console.error("❌ Error en consulta múltiple de BINs:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      detalles: error.message
    });
  }
});

// 📊 Endpoint para obtener estadísticas de consultas de BINs
router.get("/estadisticas/consultas", protegerDatos, async (req, res) => {
  try {
    const queries = {
      // Resumen general
      resumenGeneral: `
        SELECT 
          COUNT(*) as total_bins_cache,
          SUM(consultas_realizadas) as total_consultas,
          AVG(consultas_realizadas) as promedio_consultas_por_bin,
          MAX(consultas_realizadas) as max_consultas_bin,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as bins_nuevos_semana,
          COUNT(*) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '24 hours') as bins_consultados_hoy
        FROM bins_cache
      `,
      
      // Más consultados
      masConsultados: `
        SELECT 
          bin, banco, marca, tipo, pais, moneda,
          consultas_realizadas,
          TO_CHAR(created_at, 'DD/MM/YYYY') as primera_consulta,
          TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as ultima_consulta
        FROM bins_cache
        ORDER BY consultas_realizadas DESC
        LIMIT 20
      `,
      
      // Por país
      porPais: `
        SELECT 
          pais,
          COUNT(*) as cantidad_bins,
          SUM(consultas_realizadas) as total_consultas,
          AVG(consultas_realizadas) as promedio_consultas
        FROM bins_cache
        WHERE pais IS NOT NULL AND pais != 'Desconocido'
        GROUP BY pais
        ORDER BY cantidad_bins DESC
        LIMIT 15
      `,
      
      // Por marca/tipo
      porMarca: `
        SELECT 
          marca,
          COUNT(*) as cantidad_bins,
          SUM(consultas_realizadas) as total_consultas
        FROM bins_cache
        WHERE marca IS NOT NULL AND marca != 'Desconocido'
        GROUP BY marca
        ORDER BY cantidad_bins DESC
      `,
      
      // Actividad reciente
      actividadReciente: `
        SELECT 
          DATE_TRUNC('day', updated_at) as fecha,
          COUNT(DISTINCT bin) as bins_consultados,
          SUM(CASE WHEN updated_at != created_at THEN 1 ELSE 0 END) as reconsultas,
          SUM(CASE WHEN updated_at = created_at THEN 1 ELSE 0 END) as primeras_consultas
        FROM bins_cache
        WHERE updated_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', updated_at)
        ORDER BY fecha DESC
        LIMIT 30
      `
    };
    
    const resultados = {};
    
    for (const [clave, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      
      if (['masConsultados', 'actividadReciente'].includes(clave)) {
        resultados[clave] = result.rows.map(formatearFechasEnObjeto);
      } else {
        resultados[clave] = result.rows.map(row => {
          const formatted = { ...row };
          if (formatted.promedio_consultas) {
            formatted.promedio_consultas = parseFloat(formatted.promedio_consultas);
          }
          if (formatted.promedio_consultas_por_bin) {
            formatted.promedio_consultas_por_bin = parseFloat(formatted.promedio_consultas_por_bin);
          }
          return formatted;
        });
      }
    }
    
    console.log(`✅ Estadísticas de BINs generadas exitosamente`);
    
    res.json(resultados);
    
  } catch (error) {
    console.error("❌ Error generando estadísticas de BINs:", error);
    res.status(500).json({
      error: "Error al generar estadísticas",
      detalles: error.message
    });
  }
});

// 🔍 Endpoint para buscar BINs por criterios
router.get("/buscar/criterios", protegerDatos, async (req, res) => {
  try {
    const { 
      banco, 
      marca, 
      tipo, 
      pais, 
      limite = 50,
      orden = 'consultas_desc' // consultas_desc, consultas_asc, fecha_desc, fecha_asc
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let values = [];
    let paramIndex = 1;
    
    if (banco) {
      whereClause += ` AND banco ILIKE $${paramIndex}`;
      values.push(`%${banco}%`);
      paramIndex++;
    }
    
    if (marca) {
      whereClause += ` AND marca ILIKE $${paramIndex}`;
      values.push(`%${marca}%`);
      paramIndex++;
    }
    
    if (tipo) {
      whereClause += ` AND tipo ILIKE $${paramIndex}`;
      values.push(`%${tipo}%`);
      paramIndex++;
    }
    
    if (pais) {
      whereClause += ` AND pais ILIKE $${paramIndex}`;
      values.push(`%${pais}%`);
      paramIndex++;
    }
    
    // Determinar ordenamiento
    let orderClause = '';
    switch (orden) {
      case 'consultas_desc':
        orderClause = 'ORDER BY consultas_realizadas DESC';
        break;
      case 'consultas_asc':
        orderClause = 'ORDER BY consultas_realizadas ASC';
        break;
      case 'fecha_desc':
        orderClause = 'ORDER BY created_at DESC';
        break;
      case 'fecha_asc':
        orderClause = 'ORDER BY created_at ASC';
        break;
      default:
        orderClause = 'ORDER BY consultas_realizadas DESC';
    }
    
    const query = `
      SELECT 
        bin, banco, marca, tipo, pais, moneda,
        consultas_realizadas, prepago, categoria,
        TO_CHAR(created_at, 'DD/MM/YYYY') as fecha_primera_consulta,
        TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as fecha_ultima_consulta
      FROM bins_cache
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex}
    `;
    
    values.push(parseInt(limite));
    
    const result = await pool.query(query, values);
    const bins = result.rows.map(formatearFechasEnObjeto);
    
    console.log(`✅ Búsqueda de BINs por criterios: ${bins.length} resultados`);
    
    res.json({
      bins: bins,
      total: bins.length,
      criterios: {
        banco: banco || null,
        marca: marca || null,
        tipo: tipo || null,
        pais: pais || null,
        orden: orden,
        limite: parseInt(limite)
      }
    });
    
  } catch (error) {
    console.error("❌ Error buscando BINs por criterios:", error);
    res.status(500).json({
      error: "Error en búsqueda de BINs",
      detalles: error.message
    });
  }
});

// 🗑️ Endpoint para limpiar cache de BINs (solo BINs con pocas consultas)
router.delete("/cache/limpiar", protegerDatos, async (req, res) => {
  try {
    const { 
      min_consultas = 1, 
      dias_antiguedad = 90 
    } = req.query;
    
    const deleteQuery = `
      DELETE FROM bins_cache 
      WHERE consultas_realizadas <= $1 
      AND created_at <= CURRENT_DATE - INTERVAL '${parseInt(dias_antiguedad)} days'
    `;
    
    const result = await pool.query(deleteQuery, [parseInt(min_consultas)]);
    
    console.log(`🗑️ Cache de BINs limpiado: ${result.rowCount} registros eliminados`);
    
    res.json({
      success: true,
      registros_eliminados: result.rowCount,
      criterios: {
        min_consultas: parseInt(min_consultas),
        dias_antiguedad: parseInt(dias_antiguedad)
      }
    });
    
  } catch (error) {
    console.error("❌ Error limpiando cache de BINs:", error);
    res.status(500).json({
      error: "Error al limpiar cache",
      detalles: error.message
    });
  }
});

// 📊 Endpoint para validar formato de tarjeta completa
router.post("/validar-tarjeta", async (req, res) => {
  const { numero_tarjeta } = req.body;
  
  if (!numero_tarjeta) {
    return res.status(400).json({
      error: "Se requiere el número de tarjeta",
      formato: "{ numero_tarjeta: '1234567890123456' }"
    });
  }
  
  // Limpiar número (solo dígitos)
  const numeroLimpio = numero_tarjeta.replace(/\D/g, '');
  
  if (numeroLimpio.length < 13 || numeroLimpio.length > 19) {
    return res.status(400).json({
      error: "Número de tarjeta inválido",
      mensaje: "Debe contener entre 13 y 19 dígitos",
      recibido: numeroLimpio
    });
  }
  
  try {
    // Extraer BIN (primeros 6-8 dígitos)
    const bin6 = numeroLimpio.substring(0, 6);
    const bin8 = numeroLimpio.substring(0, 8);
    
    // Algoritmo de Luhn para validar el número
    const esValida = validarLuhn(numeroLimpio);
    
    // Consultar información del BIN
    const cacheQuery = `
      SELECT banco, marca, tipo, pais, moneda
      FROM bins_cache 
      WHERE bin = $1 OR bin = $2
      ORDER BY LENGTH(bin) DESC
      LIMIT 1
    `;
    
    const cacheResult = await pool.query(cacheQuery, [bin8, bin6]);
    
    let binInfo = null;
    if (cacheResult.rowCount > 0) {
      binInfo = cacheResult.rows[0];
    }
    
    console.log(`🔍 Validación de tarjeta: ${numeroLimpio.substring(0, 6)}****`);
    
    res.json({
      numero_enmascarado: numeroLimpio.substring(0, 6) + '*'.repeat(numeroLimpio.length - 10) + numeroLimpio.substring(numeroLimpio.length - 4),
      longitud: numeroLimpio.length,
      valida_luhn: esValida,
      bin_detectado: bin6,
      informacion_bin: binInfo || {
        mensaje: "Información del BIN no disponible - consulte el endpoint de BIN específico"
      }
    });
    
  } catch (error) {
    console.error("❌ Error validando tarjeta:", error);
    res.status(500).json({
      error: "Error al validar tarjeta",
      detalles: error.message
    });
  }
});

// Función auxiliar para validar Luhn
function validarLuhn(numero) {
  let suma = 0;
  let alternar = false;
  
  // Procesar de derecha a izquierda
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = parseInt(numero.charAt(i));
    
    if (alternar) {
      digito *= 2;
      if (digito > 9) {
        digito = (digito % 10) + 1;
      }
    }
    
    suma += digito;
    alternar = !alternar;
  }
  
  return (suma % 10) === 0;
}

export default router;
