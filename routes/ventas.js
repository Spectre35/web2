import express from "express";
import { pool, protegerDatos, formatearFechasEnObjeto } from "../config/database.js";
import ExcelJS from "exceljs";

const router = express.Router();

// 📊 Endpoint para resumen de ventas por año
router.get("/resumen", async (req, res) => {
  const { anio } = req.query;
  
  try {
    console.log(`📊 Obteniendo resumen de ventas para año: ${anio || 'todos'}`);
    
    let whereClause = '';
    let values = [];
    
    if (anio) {
      whereClause = 'WHERE EXTRACT(YEAR FROM "FechaCompra") = $1';
      values = [anio];
    }
    
    const query = `
      SELECT 
        EXTRACT(MONTH FROM "FechaCompra") as mes,
        COUNT(*) as ventas,
        COALESCE(SUM("CostoPaquete"::numeric), 0) as ventastotal,
        COALESCE(SUM("QPagada"::numeric), 0) as totalpagado,
        COALESCE(SUM(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN "CostoPaquete"::numeric ELSE 0 END), 0) as ventasadeudo
      FROM "ventas" 
      ${whereClause}
      GROUP BY EXTRACT(MONTH FROM "FechaCompra")
      ORDER BY mes
    `;
    
    const result = await pool.query(query, values);
    
    console.log(`✅ Resumen de ventas obtenido: ${result.rows.length} meses`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error("❌ Error obteniendo resumen de ventas:", error);
    res.status(500).json({ 
      error: "Error al obtener resumen de ventas",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para resumen por vendedora
router.get("/resumen-vendedora", async (req, res) => {
  const { anio, bloque, limite } = req.query;
  
  try {
    console.log(`📊 Obteniendo resumen por vendedora - Año: ${anio}, Bloque: ${bloque}`);
    
    // ✅ FECHA LÍMITE: Solo vendedoras activas (últimos 2 meses)
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 2);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    
    console.log(`📅 Fecha límite para vendedoras activas: ${fechaLimiteStr}`);
    
    // ✅ QUERY PRINCIPAL: Solo vendedoras activas + filtros del dashboard
    const query = `
      WITH vendedoras_activas AS (
        SELECT DISTINCT "Vendedor"
        FROM "ventas"
        WHERE "FechaCompra" >= $1
      )
      SELECT 
        v."Vendedor" AS nombre,
        v."Bloque",
        COUNT(*) as totalVentas,
        INNER JOIN vendedoras_activas va ON v."Vendedor" = va."Vendedor"
        WHERE ($2::text IS NULL OR EXTRACT(YEAR FROM v."FechaCompra") = $2::int)
          AND ($3::text IS NULL OR v."Bloque" ILIKE $3)
        GROUP BY v."Vendedor", v."Bloque"
        HAVING COUNT(*) >= 5
        ORDER BY totalVentas DESC
        ${limite ? `LIMIT $4` : ''}
    `;
    
    let values = [fechaLimiteStr, anio || null, bloque ? `%${bloque}%` : null];
    if (limite) {
      values.push(parseInt(limite));
    }
    
    const result = await pool.query(query, values);
    
    console.log(`✅ Resumen por vendedora obtenido: ${result.rows.length} vendedoras`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error("❌ Error obteniendo resumen por vendedora:", error);
    res.status(500).json({ 
      error: "Error al obtener resumen por vendedora",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para resumen por sucursal
router.get("/resumen-sucursal", async (req, res) => {
  const { anio } = req.query;
  
  try {
    console.log(`📊 Obteniendo resumen por sucursal para año: ${anio || 'todos'}`);
    
    let whereClause = '';
    let values = [];
    
    if (anio) {
      whereClause = 'WHERE EXTRACT(YEAR FROM "FechaCompra") = $1';
      values = [anio];
    }
    
    const query = `
      SELECT 
        "Sucursal",
        "Bloque",
        COUNT(*) as totalVentas,
        COUNT(*) FILTER (WHERE "EstatusCobranza" = 'AL CORRIENTE') AS al_corriente,
        COUNT(*) FILTER (WHERE "EstatusCobranza" = 'LIQUIDADO') AS liquidado,
        COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS vencido,
        COALESCE(SUM("CostoPaquete"::numeric), 0) as montoTotal,
        COALESCE(SUM("QPagada"::numeric), 0) as montoPagado,
        ROUND(
          CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE "EstatusCobranza" IN ('AL CORRIENTE', 'LIQUIDADO'))::decimal / COUNT(*)::decimal) * 100
            ELSE 0 
          END, 2
        ) as porcentajeRecuperacion
      FROM "ventas" 
      ${whereClause}
      GROUP BY "Sucursal", "Bloque"
      HAVING COUNT(*) >= 10
      ORDER BY porcentajeRecuperacion DESC, totalVentas DESC
    `;
    
    const result = await pool.query(query, values);
    
    console.log(`✅ Resumen por sucursal obtenido: ${result.rows.length} sucursales`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error("❌ Error obteniendo resumen por sucursal:", error);
    res.status(500).json({ 
      error: "Error al obtener resumen por sucursal",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para resumen completo de sucursales
router.get("/resumen-sucursal-completo", async (req, res) => {
  const { anio } = req.query;
  
  try {
    console.log(`📊 Obteniendo resumen completo por sucursal para año: ${anio || 'todos'}`);
    
    let whereClause = '';
    let values = [];
    
    if (anio) {
      whereClause = 'WHERE EXTRACT(YEAR FROM "FechaCompra") = $1';
      values = [anio];
    }
    
    const query = `
      SELECT 
        "Sucursal",
        "Bloque", 
        COUNT(*) as totalVentas,
        COUNT(DISTINCT "Vendedor") as totalVendedoras,
        COALESCE(SUM("CostoPaquete"::numeric), 0) as montoTotalVendido,
        COALESCE(SUM("QPagada"::numeric), 0) as montoTotalCobrado,
        COALESCE(AVG("CostoPaquete"::numeric), 0) as promedioVenta,
        MIN("FechaCompra") as primeraVenta,
        MAX("FechaCompra") as ultimaVenta,
        COUNT(*) FILTER (WHERE "EstatusCobranza" = 'AL CORRIENTE') AS ventasAlCorriente,
        COUNT(*) FILTER (WHERE "EstatusCobranza" = 'LIQUIDADO') AS ventasLiquidadas,
        COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS ventasVencidas,
        ROUND(
          CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE "EstatusCobranza" IN ('AL CORRIENTE', 'LIQUIDADO'))::decimal / COUNT(*)::decimal) * 100
            ELSE 0 
          END, 2
        ) as tasaRecuperacion
      FROM "ventas" 
      ${whereClause}
      GROUP BY "Sucursal", "Bloque"
      ORDER BY totalVentas DESC
    `;
    
    const result = await pool.query(query, values);
    
    // Formatear fechas en el resultado
    const resultadoFormateado = result.rows.map(row => formatearFechasEnObjeto(row));
    
    console.log(`✅ Resumen completo por sucursal obtenido: ${result.rows.length} sucursales`);
    
    res.json(resultadoFormateado);
    
  } catch (error) {
    console.error("❌ Error obteniendo resumen completo por sucursal:", error);
    res.status(500).json({ 
      error: "Error al obtener resumen completo por sucursal",
      detalles: error.message 
    });
  }
});

export default router;
