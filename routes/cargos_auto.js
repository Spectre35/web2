import express from "express";
import { pool, protegerDatos, formatearFechasEnObjeto } from "../config/database.js";

const router = express.Router();

// 📊 Endpoint para obtener datos de cargos_auto
router.get("/", protegerDatos, async (req, res) => {
  try {
    const { 
      limit = 500, 
      offset = 0, 
      sucursal, 
      vendedora, 
      bloque,
      busqueda 
    } = req.query;

    let whereClause = 'WHERE 1=1';
    let values = [];
    let paramIndex = 1;

    // Filtros
    if (sucursal) {
      whereClause += ` AND sucursal ILIKE $${paramIndex}`;
      values.push(`%${sucursal}%`);
      paramIndex++;
    }

    if (vendedora) {
      whereClause += ` AND vendedora ILIKE $${paramIndex}`;
      values.push(`%${vendedora}%`);
      paramIndex++;
    }

    if (bloque) {
      whereClause += ` AND bloque ILIKE $${paramIndex}`;
      values.push(`%${bloque}%`);
      paramIndex++;
    }

    if (busqueda) {
      whereClause += ` AND (
        cliente ILIKE $${paramIndex} OR 
        vendedora ILIKE $${paramIndex} OR 
        sucursal ILIKE $${paramIndex} OR
        bloque ILIKE $${paramIndex} OR
        autorizacion ILIKE $${paramIndex}
      )`;
      values.push(`%${busqueda}%`);
      paramIndex++;
    }

    // Query principal
    const query = `
      SELECT 
        id, cliente, vendedora, sucursal, bloque,
        monto, fecha_venta, fecha_contrato, autorizacion,
        paquete, comentarios,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha_registro
      FROM cargos_auto 
      ${whereClause}
      ORDER BY fecha_venta DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(parseInt(limit), parseInt(offset));

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM cargos_auto 
      ${whereClause}
    `;

    const [resultados, totalResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, -2)) // Sin limit y offset
    ]);

    const datos = resultados.rows.map(formatearFechasEnObjeto);
    const total = parseInt(totalResult.rows[0].total);

    console.log(`✅ Consultando cargos_auto: ${datos.length} registros de ${total} totales`);

    res.json({
      datos: datos,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total
    });

  } catch (error) {
    console.error("❌ Error obteniendo cargos_auto:", error);
    res.status(500).json({ 
      error: "Error al obtener datos de cargos_auto",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para obtener sucursales de cargos_auto
router.get("/sucursales", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT sucursal FROM cargos_auto WHERE sucursal IS NOT NULL ORDER BY sucursal`
    );
    res.json(result.rows.map(row => row.sucursal));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener sucursales" });
  }
});

// 📊 Endpoint para obtener vendedoras de cargos_auto
router.get("/vendedoras", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT vendedora FROM cargos_auto WHERE vendedora IS NOT NULL ORDER BY vendedora`
    );
    res.json(result.rows.map(row => row.vendedora));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener vendedoras" });
  }
});

// 📊 Endpoint para obtener bloques de cargos_auto
router.get("/bloques", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT bloque FROM cargos_auto WHERE bloque IS NOT NULL ORDER BY bloque`
    );
    res.json(result.rows.map(row => row.bloque));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener bloques" });
  }
});

// 📊 Endpoint para resumen de cargos_auto
router.get("/resumen", protegerDatos, async (req, res) => {
  try {
    const { sucursal, vendedora, bloque, fechaInicio, fechaFin } = req.query;

    let whereClause = 'WHERE 1=1';
    let values = [];
    let paramIndex = 1;

    // Filtros
    if (sucursal) {
      whereClause += ` AND sucursal = $${paramIndex}`;
      values.push(sucursal);
      paramIndex++;
    }

    if (vendedora) {
      whereClause += ` AND vendedora = $${paramIndex}`;
      values.push(vendedora);
      paramIndex++;
    }

    if (bloque) {
      whereClause += ` AND bloque = $${paramIndex}`;
      values.push(bloque);
      paramIndex++;
    }

    if (fechaInicio) {
      whereClause += ` AND fecha_venta >= $${paramIndex}`;
      values.push(fechaInicio);
      paramIndex++;
    }

    if (fechaFin) {
      whereClause += ` AND fecha_venta <= $${paramIndex}`;
      values.push(fechaFin);
      paramIndex++;
    }

    const query = `
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT cliente) as clientes_unicos,
        COUNT(DISTINCT vendedora) as vendedoras_activas,
        COUNT(DISTINCT sucursal) as sucursales_activas,
        COALESCE(SUM(monto), 0) as monto_total,
        COALESCE(AVG(monto), 0) as monto_promedio,
        COALESCE(MAX(monto), 0) as monto_maximo,
        COALESCE(MIN(monto), 0) as monto_minimo,
        
        -- Top 5 vendedoras por cantidad
        json_agg(
          json_build_object(
            'vendedora', vendedora_stats.vendedora,
            'total_ventas', vendedora_stats.total_ventas,
            'monto_total', vendedora_stats.monto_total
          ) ORDER BY vendedora_stats.total_ventas DESC
        ) FILTER (WHERE vendedora_stats.rn <= 5) as top_vendedoras
        
      FROM cargos_auto c
      LEFT JOIN (
        SELECT 
          vendedora,
          COUNT(*) as total_ventas,
          SUM(monto) as monto_total,
          ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rn
        FROM cargos_auto
        GROUP BY vendedora
      ) vendedora_stats ON c.vendedora = vendedora_stats.vendedora
      ${whereClause}
    `;

    const result = await pool.query(query, values);
    const resumen = result.rows[0];

    // Query adicional para distribución por mes
    const queryMeses = `
      SELECT 
        EXTRACT(MONTH FROM fecha_venta) as mes,
        TO_CHAR(fecha_venta, 'Month') as nombre_mes,
        COUNT(*) as total_ventas,
        SUM(monto) as monto_total
      FROM cargos_auto
      ${whereClause}
      GROUP BY EXTRACT(MONTH FROM fecha_venta), TO_CHAR(fecha_venta, 'Month')
      ORDER BY mes
    `;

    const resultMeses = await pool.query(queryMeses, values);

    console.log(`✅ Resumen de cargos_auto generado exitosamente`);

    res.json({
      resumen: {
        ...resumen,
        monto_total: parseFloat(resumen.monto_total),
        monto_promedio: parseFloat(resumen.monto_promedio),
        monto_maximo: parseFloat(resumen.monto_maximo),
        monto_minimo: parseFloat(resumen.monto_minimo)
      },
      distribucionPorMes: resultMeses.rows.map(row => ({
        ...row,
        monto_total: parseFloat(row.monto_total)
      }))
    });

  } catch (error) {
    console.error("❌ Error generando resumen de cargos_auto:", error);
    res.status(500).json({ 
      error: "Error al generar resumen de cargos_auto",
      detalles: error.message 
    });
  }
});

// ✏️ Endpoint para actualizar registro de cargos_auto
router.put("/:id", protegerDatos, async (req, res) => {
  const { id } = req.params;
  const campos = req.body;

  try {
    // Construir query dinámico
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(campos).forEach(([campo, valor]) => {
      // Validar campos permitidos
      const camposPermitidos = [
        'cliente', 'vendedora', 'sucursal', 'bloque',
        'monto', 'fecha_venta', 'fecha_contrato', 
        'autorizacion', 'paquete', 'comentarios'
      ];

      if (camposPermitidos.includes(campo)) {
        setClauses.push(`${campo} = $${paramIndex}`);
        values.push(valor);
        paramIndex++;
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ 
        error: "No hay campos válidos para actualizar" 
      });
    }

    // Agregar timestamp de actualización
    setClauses.push(`updated_at = NOW()`);
    values.push(id); // ID va al final

    const query = `
      UPDATE cargos_auto 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        error: "Registro no encontrado" 
      });
    }

    console.log(`✅ Registro de cargos_auto actualizado: ID ${id}`);

    res.json({
      success: true,
      registro: formatearFechasEnObjeto(result.rows[0])
    });

  } catch (error) {
    console.error("❌ Error actualizando cargos_auto:", error);
    res.status(500).json({ 
      error: "Error al actualizar registro",
      detalles: error.message 
    });
  }
});

// 🗑️ Endpoint para eliminar registro de cargos_auto
router.delete("/:id", protegerDatos, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que el registro existe
    const checkQuery = `SELECT id, cliente, vendedora FROM cargos_auto WHERE id = $1`;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ 
        error: "Registro no encontrado" 
      });
    }

    // Eliminar el registro
    const deleteQuery = `DELETE FROM cargos_auto WHERE id = $1`;
    await pool.query(deleteQuery, [id]);

    console.log(`🗑️ Registro de cargos_auto eliminado: ID ${id} - ${checkResult.rows[0].cliente}`);

    res.json({
      success: true,
      mensaje: "Registro eliminado exitosamente",
      registro: checkResult.rows[0]
    });

  } catch (error) {
    console.error("❌ Error eliminando registro de cargos_auto:", error);
    res.status(500).json({ 
      error: "Error al eliminar registro",
      detalles: error.message 
    });
  }
});

// 📝 Endpoint para crear nuevo registro de cargos_auto
router.post("/", protegerDatos, async (req, res) => {
  const datos = req.body;

  try {
    const query = `
      INSERT INTO cargos_auto (
        cliente, vendedora, sucursal, bloque,
        monto, fecha_venta, fecha_contrato,
        autorizacion, paquete, comentarios,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
      )
      RETURNING *
    `;

    const valores = [
      datos.cliente,
      datos.vendedora,
      datos.sucursal,
      datos.bloque,
      datos.monto,
      datos.fecha_venta,
      datos.fecha_contrato,
      datos.autorizacion,
      datos.paquete,
      datos.comentarios
    ];

    const result = await pool.query(query, valores);

    console.log(`✅ Nuevo registro de cargos_auto creado: ${datos.cliente}`);

    res.status(201).json({
      success: true,
      registro: formatearFechasEnObjeto(result.rows[0])
    });

  } catch (error) {
    console.error("❌ Error creando registro de cargos_auto:", error);
    res.status(500).json({ 
      error: "Error al crear registro",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para estadísticas avanzadas
router.get("/estadisticas", protegerDatos, async (req, res) => {
  try {
    const queries = {
      // Distribución por sucursal
      porSucursal: `
        SELECT 
          sucursal,
          COUNT(*) as total_registros,
          SUM(monto) as monto_total,
          AVG(monto) as monto_promedio,
          COUNT(DISTINCT vendedora) as vendedoras_activas
        FROM cargos_auto
        WHERE sucursal IS NOT NULL
        GROUP BY sucursal
        ORDER BY total_registros DESC
      `,
      
      // Distribución por vendedora
      porVendedora: `
        SELECT 
          vendedora,
          COUNT(*) as total_ventas,
          SUM(monto) as monto_total,
          AVG(monto) as monto_promedio,
          COUNT(DISTINCT sucursal) as sucursales_atendidas
        FROM cargos_auto
        WHERE vendedora IS NOT NULL
        GROUP BY vendedora
        ORDER BY total_ventas DESC
        LIMIT 20
      `,
      
      // Tendencia por mes
      tendenciaMensual: `
        SELECT 
          EXTRACT(YEAR FROM fecha_venta) as año,
          EXTRACT(MONTH FROM fecha_venta) as mes,
          TO_CHAR(fecha_venta, 'YYYY-MM') as periodo,
          COUNT(*) as total_registros,
          SUM(monto) as monto_total,
          AVG(monto) as monto_promedio
        FROM cargos_auto
        WHERE fecha_venta IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM fecha_venta), EXTRACT(MONTH FROM fecha_venta), TO_CHAR(fecha_venta, 'YYYY-MM')
        ORDER BY año DESC, mes DESC
        LIMIT 12
      `,
      
      // Distribución por bloque
      porBloque: `
        SELECT 
          bloque,
          COUNT(*) as total_registros,
          SUM(monto) as monto_total,
          COUNT(DISTINCT vendedora) as vendedoras,
          COUNT(DISTINCT sucursal) as sucursales
        FROM cargos_auto
        WHERE bloque IS NOT NULL
        GROUP BY bloque
        ORDER BY total_registros DESC
      `
    };

    const resultados = {};
    
    for (const [clave, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      resultados[clave] = result.rows.map(row => {
        // Formatear números decimales
        const formatted = { ...row };
        if (formatted.monto_total) formatted.monto_total = parseFloat(formatted.monto_total);
        if (formatted.monto_promedio) formatted.monto_promedio = parseFloat(formatted.monto_promedio);
        return formatted;
      });
    }

    console.log(`✅ Estadísticas de cargos_auto generadas exitosamente`);

    res.json(resultados);

  } catch (error) {
    console.error("❌ Error generando estadísticas de cargos_auto:", error);
    res.status(500).json({ 
      error: "Error al generar estadísticas",
      detalles: error.message 
    });
  }
});

// 🔍 Endpoint para buscar clientes automáticamente por terminación de tarjeta, fecha y monto
router.post("/buscar-clientes", protegerDatos, async (req, res) => {
  try {
    const { terminacion_tarjeta, fecha_venta, monto } = req.body;

    // Validar parámetros requeridos
    if (!terminacion_tarjeta || !fecha_venta || !monto) {
      return res.status(400).json({ 
        error: "Parámetros requeridos: terminacion_tarjeta, fecha_venta, monto" 
      });
    }

    // Buscar en la tabla cargos_auto
    const query = `
      SELECT 
        cliente as nombre_completo,
        autorizacion as numero_tarjeta,
        fecha_venta,
        monto,
        comercio,
        sucursal,
        vendedora,
        bloque,
        dpi,
        telefono,
        nit
      FROM cargos_auto
      WHERE 1=1
        AND RIGHT(COALESCE(autorizacion, ''), 4) = $1
        AND fecha_venta::date = $2::date
        AND ABS(CAST(REPLACE(REPLACE(monto, 'Q', ''), ',', '') AS DECIMAL) - $3) <= 0.01
      ORDER BY fecha_venta DESC, monto DESC
      LIMIT 20
    `;

    const values = [terminacion_tarjeta, fecha_venta, parseFloat(monto)];
    const result = await pool.query(query, values);

    // Formatear fechas en los resultados
    const clientes = result.rows.map(formatearFechasEnObjeto);

    console.log(`🔍 Búsqueda de clientes - Terminación: ${terminacion_tarjeta}, Fecha: ${fecha_venta}, Monto: ${monto} - Encontrados: ${clientes.length}`);

    res.json({
      clientes,
      total: clientes.length,
      criterios: {
        terminacion_tarjeta,
        fecha_venta,
        monto
      }
    });

  } catch (error) {
    console.error("❌ Error buscando clientes:", error);
    res.status(500).json({ 
      error: "Error al buscar clientes",
      detalles: error.message 
    });
  }
});

export default router;
