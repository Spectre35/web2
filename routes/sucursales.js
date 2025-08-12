import express from "express";
import { pool, protegerDatos, formatearFechasEnObjeto } from "../config/database.js";

const router = express.Router();

// 📊 Endpoint para obtener sucursales únicas de la tabla ventas
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT "Sucursal" as sucursal 
      FROM "ventas" 
      WHERE "Sucursal" IS NOT NULL 
      ORDER BY "Sucursal"
    `);
    
    res.json(result.rows.map(row => row.sucursal));
  } catch (err) {
    console.error("❌ Error obteniendo sucursales:", err);
    res.status(500).json({ error: "Error al obtener sucursales" });
  }
});

// 📊 Endpoint para obtener datos completos de sucursales
router.get("/detalle", protegerDatos, async (req, res) => {
  try {
    const { sucursal, limite = 100 } = req.query;
    
    let whereClause = '';
    let values = [];
    
    if (sucursal) {
      whereClause = 'WHERE "Sucursal" = $1';
      values.push(sucursal);
    }
    
    const query = `
      SELECT 
        "Sucursal" as sucursal,
        "Vendedora" as vendedora,
        "Bloque" as bloque,
        "Cliente" as cliente,
        "Fecha Contrato" as fecha_contrato,
        "Paquete" as paquete,
        "Monto" as monto,
        "Fecha Venta" as fecha_venta
      FROM "ventas" 
      ${whereClause}
      ORDER BY "Fecha Venta" DESC
      LIMIT $${values.length + 1}
    `;
    
    values.push(parseInt(limite));
    
    const result = await pool.query(query, values);
    const datos = result.rows.map(formatearFechasEnObjeto);
    
    console.log(`✅ Obtenidos ${datos.length} registros de sucursales`);
    
    res.json({
      datos: datos,
      total: datos.length,
      sucursal: sucursal || 'Todas'
    });
    
  } catch (error) {
    console.error("❌ Error obteniendo detalle de sucursales:", error);
    res.status(500).json({ 
      error: "Error al obtener detalle de sucursales",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para resumen de sucursales
router.get("/resumen", protegerDatos, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, sucursal } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let values = [];
    let paramIndex = 1;
    
    if (fechaInicio) {
      whereClause += ` AND "Fecha Venta" >= $${paramIndex}`;
      values.push(fechaInicio);
      paramIndex++;
    }
    
    if (fechaFin) {
      whereClause += ` AND "Fecha Venta" <= $${paramIndex}`;
      values.push(fechaFin);
      paramIndex++;
    }
    
    if (sucursal) {
      whereClause += ` AND "Sucursal" = $${paramIndex}`;
      values.push(sucursal);
      paramIndex++;
    }
    
    const query = `
      SELECT 
        "Sucursal" as sucursal,
        COUNT(*) as total_ventas,
        COUNT(DISTINCT "Vendedora") as vendedoras_activas,
        COUNT(DISTINCT "Cliente") as clientes_unicos,
        COUNT(DISTINCT "Bloque") as bloques_activos,
        COALESCE(SUM("Monto"), 0) as monto_total,
        COALESCE(AVG("Monto"), 0) as monto_promedio,
        COALESCE(MAX("Monto"), 0) as monto_maximo,
        COALESCE(MIN("Monto"), 0) as monto_minimo,
        
        -- Fecha de primera y última venta
        MIN("Fecha Venta") as primera_venta,
        MAX("Fecha Venta") as ultima_venta,
        
        -- Paquete más vendido
        MODE() WITHIN GROUP (ORDER BY "Paquete") as paquete_mas_vendido
        
      FROM "ventas"
      ${whereClause}
      GROUP BY "Sucursal"
      ORDER BY total_ventas DESC
    `;
    
    const result = await pool.query(query, values);
    
    const resumen = result.rows.map(row => ({
      ...row,
      monto_total: parseFloat(row.monto_total),
      monto_promedio: parseFloat(row.monto_promedio),
      monto_maximo: parseFloat(row.monto_maximo),
      monto_minimo: parseFloat(row.monto_minimo),
      primera_venta: formatearFechasEnObjeto(row).primera_venta,
      ultima_venta: formatearFechasEnObjeto(row).ultima_venta
    }));
    
    console.log(`✅ Resumen de ${resumen.length} sucursales generado`);
    
    res.json({
      resumen: resumen,
      filtros: {
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        sucursal: sucursal || 'Todas'
      }
    });
    
  } catch (error) {
    console.error("❌ Error generando resumen de sucursales:", error);
    res.status(500).json({ 
      error: "Error al generar resumen de sucursales",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para ranking de sucursales
router.get("/ranking", protegerDatos, async (req, res) => {
  try {
    const { 
      criterio = 'ventas', // ventas, monto, vendedoras
      periodo = 'mes', // mes, trimestre, año
      limite = 10 
    } = req.query;
    
    // Determinar el período
    let fechaCondicion = '';
    switch (periodo) {
      case 'mes':
        fechaCondicion = `AND "Fecha Venta" >= DATE_TRUNC('month', CURRENT_DATE)`;
        break;
      case 'trimestre':
        fechaCondicion = `AND "Fecha Venta" >= DATE_TRUNC('quarter', CURRENT_DATE)`;
        break;
      case 'año':
        fechaCondicion = `AND "Fecha Venta" >= DATE_TRUNC('year', CURRENT_DATE)`;
        break;
      default:
        fechaCondicion = `AND "Fecha Venta" >= DATE_TRUNC('month', CURRENT_DATE)`;
    }
    
    // Determinar el campo de ordenamiento
    let ordenCampo = '';
    let descripcionCriterio = '';
    switch (criterio) {
      case 'ventas':
        ordenCampo = 'total_ventas DESC';
        descripcionCriterio = 'Total de Ventas';
        break;
      case 'monto':
        ordenCampo = 'monto_total DESC';
        descripcionCriterio = 'Monto Total';
        break;
      case 'vendedoras':
        ordenCampo = 'vendedoras_activas DESC';
        descripcionCriterio = 'Vendedoras Activas';
        break;
      default:
        ordenCampo = 'total_ventas DESC';
        descripcionCriterio = 'Total de Ventas';
    }
    
    const query = `
      SELECT 
        "Sucursal" as sucursal,
        COUNT(*) as total_ventas,
        COUNT(DISTINCT "Vendedora") as vendedoras_activas,
        COALESCE(SUM("Monto"), 0) as monto_total,
        COALESCE(AVG("Monto"), 0) as monto_promedio,
        
        -- Cálculos de ranking
        ROW_NUMBER() OVER (ORDER BY ${ordenCampo}) as posicion,
        
        -- Porcentaje del total
        ROUND(
          (COUNT(*)::decimal / SUM(COUNT(*)) OVER ()) * 100, 2
        ) as porcentaje_ventas,
        
        ROUND(
          (COALESCE(SUM("Monto"), 0)::decimal / SUM(COALESCE(SUM("Monto"), 0)) OVER ()) * 100, 2
        ) as porcentaje_monto
        
      FROM "ventas"
      WHERE 1=1 ${fechaCondicion}
      GROUP BY "Sucursal"
      ORDER BY ${ordenCampo}
      LIMIT $1
    `;
    
    const result = await pool.query(query, [parseInt(limite)]);
    
    const ranking = result.rows.map(row => ({
      ...row,
      monto_total: parseFloat(row.monto_total),
      monto_promedio: parseFloat(row.monto_promedio),
      porcentaje_ventas: parseFloat(row.porcentaje_ventas),
      porcentaje_monto: parseFloat(row.porcentaje_monto)
    }));
    
    console.log(`✅ Ranking de sucursales generado: ${ranking.length} posiciones`);
    
    res.json({
      ranking: ranking,
      configuracion: {
        criterio: criterio,
        descripcionCriterio: descripcionCriterio,
        periodo: periodo,
        limite: parseInt(limite)
      }
    });
    
  } catch (error) {
    console.error("❌ Error generando ranking de sucursales:", error);
    res.status(500).json({ 
      error: "Error al generar ranking de sucursales",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para comparativa entre sucursales
router.get("/comparativa", protegerDatos, async (req, res) => {
  try {
    const { sucursales } = req.query; // Array de sucursales separadas por coma
    
    if (!sucursales) {
      return res.status(400).json({ 
        error: "Se requiere al menos una sucursal para comparar",
        formato: "?sucursales=SUCURSAL1,SUCURSAL2,SUCURSAL3"
      });
    }
    
    const listaSucursales = sucursales.split(',').map(s => s.trim());
    const placeholders = listaSucursales.map((_, index) => `$${index + 1}`).join(',');
    
    const query = `
      SELECT 
        "Sucursal" as sucursal,
        
        -- Métricas básicas
        COUNT(*) as total_ventas,
        COUNT(DISTINCT "Vendedora") as vendedoras_activas,
        COUNT(DISTINCT "Cliente") as clientes_unicos,
        COALESCE(SUM("Monto"), 0) as monto_total,
        COALESCE(AVG("Monto"), 0) as monto_promedio,
        
        -- Métricas de tiempo
        MIN("Fecha Venta") as primera_venta,
        MAX("Fecha Venta") as ultima_venta,
        COUNT(*) FILTER (WHERE "Fecha Venta" >= DATE_TRUNC('month', CURRENT_DATE)) as ventas_mes_actual,
        COUNT(*) FILTER (WHERE "Fecha Venta" >= DATE_TRUNC('quarter', CURRENT_DATE)) as ventas_trimestre_actual,
        
        -- Distribución por paquetes (top 3)
        json_agg(
          DISTINCT jsonb_build_object(
            'paquete', "Paquete",
            'cantidad', paquete_stats.cantidad
          ) ORDER BY paquete_stats.cantidad DESC
        ) FILTER (WHERE paquete_stats.rn <= 3) as top_paquetes,
        
        -- Productividad por vendedora
        COALESCE(AVG(vendedora_productividad.ventas_por_vendedora), 0) as promedio_ventas_por_vendedora
        
      FROM "ventas" v
      LEFT JOIN (
        SELECT 
          "Sucursal",
          "Paquete",
          COUNT(*) as cantidad,
          ROW_NUMBER() OVER (PARTITION BY "Sucursal" ORDER BY COUNT(*) DESC) as rn
        FROM "ventas"
        WHERE "Sucursal" IN (${placeholders})
        GROUP BY "Sucursal", "Paquete"
      ) paquete_stats ON v."Sucursal" = paquete_stats."Sucursal" AND v."Paquete" = paquete_stats."Paquete"
      LEFT JOIN (
        SELECT 
          "Sucursal",
          "Vendedora",
          COUNT(*) as ventas_por_vendedora
        FROM "ventas"
        WHERE "Sucursal" IN (${placeholders})
        GROUP BY "Sucursal", "Vendedora"
      ) vendedora_productividad ON v."Sucursal" = vendedora_productividad."Sucursal" AND v."Vendedora" = vendedora_productividad."Vendedora"
      
      WHERE v."Sucursal" IN (${placeholders})
      GROUP BY v."Sucursal"
      ORDER BY total_ventas DESC
    `;
    
    const result = await pool.query(query, [...listaSucursales, ...listaSucursales, ...listaSucursales]);
    
    const comparativa = result.rows.map(row => ({
      ...row,
      monto_total: parseFloat(row.monto_total),
      monto_promedio: parseFloat(row.monto_promedio),
      promedio_ventas_por_vendedora: parseFloat(row.promedio_ventas_por_vendedora),
      primera_venta: formatearFechasEnObjeto(row).primera_venta,
      ultima_venta: formatearFechasEnObjeto(row).ultima_venta
    }));
    
    console.log(`✅ Comparativa entre ${comparativa.length} sucursales generada`);
    
    res.json({
      comparativa: comparativa,
      sucursales_solicitadas: listaSucursales,
      sucursales_encontradas: comparativa.map(s => s.sucursal)
    });
    
  } catch (error) {
    console.error("❌ Error generando comparativa de sucursales:", error);
    res.status(500).json({ 
      error: "Error al generar comparativa de sucursales",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para evolución temporal de sucursales
router.get("/evolucion", protegerDatos, async (req, res) => {
  try {
    const { 
      sucursal,
      periodo = 'mensual', // mensual, trimestral, anual
      limite = 12 
    } = req.query;
    
    let formatoPeriodo = '';
    let truncPeriodo = '';
    
    switch (periodo) {
      case 'mensual':
        formatoPeriodo = 'YYYY-MM';
        truncPeriodo = 'month';
        break;
      case 'trimestral':
        formatoPeriodo = 'YYYY-Q';
        truncPeriodo = 'quarter';
        break;
      case 'anual':
        formatoPeriodo = 'YYYY';
        truncPeriodo = 'year';
        break;
      default:
        formatoPeriodo = 'YYYY-MM';
        truncPeriodo = 'month';
    }
    
    let whereClause = 'WHERE 1=1';
    let values = [parseInt(limite)];
    let paramIndex = 2;
    
    if (sucursal) {
      whereClause += ` AND "Sucursal" = $${paramIndex}`;
      values.push(sucursal);
      paramIndex++;
    }
    
    const query = `
      SELECT 
        ${sucursal ? `'${sucursal}'` : `"Sucursal"`} as sucursal,
        TO_CHAR(DATE_TRUNC('${truncPeriodo}', "Fecha Venta"), '${formatoPeriodo}') as periodo,
        DATE_TRUNC('${truncPeriodo}', "Fecha Venta") as fecha_periodo,
        
        COUNT(*) as total_ventas,
        COUNT(DISTINCT "Vendedora") as vendedoras_activas,
        COUNT(DISTINCT "Cliente") as clientes_unicos,
        COALESCE(SUM("Monto"), 0) as monto_total,
        COALESCE(AVG("Monto"), 0) as monto_promedio,
        
        -- Crecimiento respecto al período anterior
        LAG(COUNT(*)) OVER (${sucursal ? '' : 'PARTITION BY "Sucursal"'} ORDER BY DATE_TRUNC('${truncPeriodo}', "Fecha Venta")) as ventas_periodo_anterior,
        LAG(COALESCE(SUM("Monto"), 0)) OVER (${sucursal ? '' : 'PARTITION BY "Sucursal"'} ORDER BY DATE_TRUNC('${truncPeriodo}', "Fecha Venta")) as monto_periodo_anterior
        
      FROM "ventas"
      ${whereClause}
      ${sucursal ? '' : 'GROUP BY "Sucursal",'}
      DATE_TRUNC('${truncPeriodo}', "Fecha Venta")
      ORDER BY ${sucursal ? '' : 'sucursal,'} fecha_periodo DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, values);
    
    const evolucion = result.rows.map(row => {
      const crecimientoVentas = row.ventas_periodo_anterior ? 
        ((row.total_ventas - row.ventas_periodo_anterior) / row.ventas_periodo_anterior * 100) : null;
      const crecimientoMonto = row.monto_periodo_anterior ? 
        ((parseFloat(row.monto_total) - parseFloat(row.monto_periodo_anterior)) / parseFloat(row.monto_periodo_anterior) * 100) : null;
      
      return {
        ...row,
        monto_total: parseFloat(row.monto_total),
        monto_promedio: parseFloat(row.monto_promedio),
        monto_periodo_anterior: row.monto_periodo_anterior ? parseFloat(row.monto_periodo_anterior) : null,
        crecimiento_ventas: crecimientoVentas ? parseFloat(crecimientoVentas.toFixed(2)) : null,
        crecimiento_monto: crecimientoMonto ? parseFloat(crecimientoMonto.toFixed(2)) : null
      };
    });
    
    console.log(`✅ Evolución temporal generada: ${evolucion.length} períodos`);
    
    res.json({
      evolucion: evolucion,
      configuracion: {
        sucursal: sucursal || 'Todas',
        periodo: periodo,
        limite: parseInt(limite)
      }
    });
    
  } catch (error) {
    console.error("❌ Error generando evolución de sucursales:", error);
    res.status(500).json({ 
      error: "Error al generar evolución de sucursales",
      detalles: error.message 
    });
  }
});

export default router;
