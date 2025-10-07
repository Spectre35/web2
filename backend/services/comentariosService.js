import { pool } from '../../config/database.js';

// ================= 📊 SERVICIO DE ANÁLISIS DE COMENTARIOS =================

/**
 * Obtiene comentarios frecuentes por sucursal con filtros dinámicos
 */
const obtenerComentariosPorSucursal = async (filtros = {}) => {
  try {
    const { sucursal, bloque, fechaInicio, fechaFin, limite = 20 } = filtros;

    // Construir cláusulas WHERE dinámicamente
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro de sucursal
    if (sucursal) {
      whereConditions.push(`TRIM("Sucursal") = TRIM($${paramIndex})`);
      queryParams.push(sucursal);
      paramIndex++;
    }

    // Filtro de bloque
    if (bloque) {
      whereConditions.push(`"Bloque" = $${paramIndex}`);
      queryParams.push(bloque);
      paramIndex++;
    }

    // Filtro de fechas
    if (fechaInicio && fechaFin) {
      whereConditions.push(`"FechaCompra" BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(fechaInicio, fechaFin);
      paramIndex += 2;
    }

    // Condiciones básicas
    whereConditions.push(`"Comentarios" IS NOT NULL`);
    whereConditions.push(`"Comentarios" != ''`);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      WITH comentarios_expandidos AS (
        SELECT 
          "Sucursal",
          "Bloque",
          "FechaCompra",
          "TipoCobranza",
          "EstatusCobranza",
          "Vendedor",
          TRIM(unnest(string_to_array(
            REPLACE(
              REPLACE("Comentarios", '/', ','), 
              'COMPLEMENTAR PAPELERIA:', ''
            ), 
            ','
          ))) as comentario_individual
        FROM "ventas"
        ${whereClause}
      ),
      comentarios_limpios AS (
        SELECT 
          "Sucursal",
          "Bloque",
          "FechaCompra",
          "TipoCobranza",
          "EstatusCobranza",
          "Vendedor",
          REPLACE(comentario_individual, 'REVISION:', '') as comentario_final,
          COUNT(*) OVER (PARTITION BY REPLACE(comentario_individual, 'REVISION:', '')) as frecuencia_global
        FROM comentarios_expandidos
        WHERE LENGTH(TRIM(comentario_individual)) > 0
          AND TRIM(comentario_individual) != 'COMPLEMENTAR PAPELERIA'
          AND TRIM(comentario_individual) != 'REVISION'
      ),
      comentarios_agrupados AS (
        SELECT 
          TRIM(comentario_final) as comentario,
          COUNT(*) as frecuencia,
          COUNT(DISTINCT "Sucursal") as sucursales_afectadas,
          COUNT(DISTINCT "Bloque") as bloques_afectados,
          array_agg(DISTINCT "TipoCobranza") as tipos_cobranza,
          array_agg(DISTINCT "EstatusCobranza") as estatus_cobranza,
          ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as porcentaje
        FROM comentarios_limpios
        WHERE LENGTH(TRIM(comentario_final)) > 0
        GROUP BY TRIM(comentario_final)
      )
      SELECT 
        comentario,
        frecuencia,
        sucursales_afectadas,
        bloques_afectados,
        tipos_cobranza,
        estatus_cobranza,
        porcentaje
      FROM comentarios_agrupados
      ORDER BY frecuencia DESC
      LIMIT $${paramIndex}
    `;

    queryParams.push(limite);

    console.log(`🔍 [COMENTARIOS] Ejecutando consulta con filtros:`, {
      sucursal: sucursal || 'Todas',
      bloque: bloque || 'Todos',
      fechaInicio: fechaInicio || 'Sin límite',
      fechaFin: fechaFin || 'Sin límite',
      limite
    });

    const result = await pool.query(query, queryParams);
    
    return {
      success: true,
      data: result.rows.map(row => ({
        comentario: row.comentario,
        frecuencia: parseInt(row.frecuencia),
        sucursalesAfectadas: parseInt(row.sucursales_afectadas),
        bloquesAfectados: parseInt(row.bloques_afectados),
        tiposCobranza: row.tipos_cobranza || [],
        estatusCobranza: row.estatus_cobranza || [],
        porcentaje: parseFloat(row.porcentaje)
      })),
      filtros: {
        sucursal: sucursal || null,
        bloque: bloque || null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        limite
      },
      total: result.rows.length
    };

  } catch (error) {
    console.error('❌ Error en obtenerComentariosPorSucursal:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Obtiene estadísticas generales de comentarios
 */
const obtenerEstadisticasComentarios = async (filtros = {}) => {
  try {
    const { sucursal, bloque, fechaInicio, fechaFin } = filtros;

    // Construir cláusulas WHERE dinámicamente
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro de sucursal
    if (sucursal) {
      whereConditions.push(`TRIM("Sucursal") = TRIM($${paramIndex})`);
      queryParams.push(sucursal);
      paramIndex++;
    }

    // Filtro de bloque
    if (bloque) {
      whereConditions.push(`"Bloque" = $${paramIndex}`);
      queryParams.push(bloque);
      paramIndex++;
    }

    // Filtro de fechas
    if (fechaInicio && fechaFin) {
      whereConditions.push(`"FechaCompra" BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(fechaInicio, fechaFin);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*) as total_paquetes,
        COUNT(CASE WHEN "Comentarios" IS NOT NULL AND "Comentarios" != '' THEN 1 END) as paquetes_con_comentarios,
        COUNT(DISTINCT "Sucursal") as sucursales_unicas,
        COUNT(DISTINCT "Bloque") as bloques_unicos,
        COUNT(DISTINCT "Vendedor") as vendedores_unicos,
        ROUND((COUNT(CASE WHEN "Comentarios" IS NOT NULL AND "Comentarios" != '' THEN 1 END) * 100.0 / COUNT(*)), 2) as porcentaje_con_comentarios
      FROM "ventas"
      ${whereClause}
    `;

    const result = await pool.query(query, queryParams);
    const stats = result.rows[0];

    return {
      success: true,
      data: {
        totalPaquetes: parseInt(stats.total_paquetes),
        paquetesConComentarios: parseInt(stats.paquetes_con_comentarios),
        sucursalesUnicas: parseInt(stats.sucursales_unicas),
        bloquesUnicos: parseInt(stats.bloques_unicos),
        vendedoresUnicos: parseInt(stats.vendedores_unicos),
        porcentajeConComentarios: parseFloat(stats.porcentaje_con_comentarios)
      }
    };

  } catch (error) {
    console.error('❌ Error en obtenerEstadisticasComentarios:', error);
    return {
      success: false,
      error: error.message,
      data: {}
    };
  }
};

/**
 * Obtiene lista de sucursales disponibles
 */
const obtenerSucursalesDisponibles = async () => {
  try {
    const query = `
      SELECT DISTINCT "Sucursal" 
      FROM "ventas" 
      WHERE "Sucursal" IS NOT NULL 
        AND "Comentarios" IS NOT NULL 
        AND "Comentarios" != ''
      ORDER BY "Sucursal"
    `;

    const result = await pool.query(query);
    
    return {
      success: true,
      data: result.rows.map(row => row.Sucursal)
    };

  } catch (error) {
    console.error('❌ Error en obtenerSucursalesDisponibles:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Obtiene lista de bloques disponibles
 */
const obtenerBloquesDisponibles = async () => {
  try {
    const query = `
      SELECT DISTINCT "Bloque" 
      FROM "ventas" 
      WHERE "Bloque" IS NOT NULL 
        AND "Comentarios" IS NOT NULL 
        AND "Comentarios" != ''
      ORDER BY "Bloque"
    `;

    const result = await pool.query(query);
    
    return {
      success: true,
      data: result.rows.map(row => row.Bloque)
    };

  } catch (error) {
    console.error('❌ Error en obtenerBloquesDisponibles:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

export default {
  obtenerComentariosPorSucursal,
  obtenerEstadisticasComentarios,
  obtenerSucursalesDisponibles,
  obtenerBloquesDisponibles
};
