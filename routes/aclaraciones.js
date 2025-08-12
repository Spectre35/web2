import express from "express";
import { pool, protegerDatos, formatearFechasEnObjeto } from "../config/database.js";
import moment from "moment";

const router = express.Router();

// 📊 Endpoint para obtener opciones de procesadores
router.get("/procesadores", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT procesador FROM aclaraciones WHERE procesador IS NOT NULL ORDER BY procesador`
    );
    res.json(result.rows.map(row => row.procesador));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener procesadores" });
  }
});

// 📊 Endpoint para obtener opciones de sucursales
router.get("/sucursales", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT sucursal FROM aclaraciones WHERE sucursal IS NOT NULL ORDER BY sucursal`
    );
    res.json(result.rows.map(row => row.sucursal));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener sucursales" });
  }
});

// 📊 Endpoint para obtener opciones de vendedoras
router.get("/vendedoras", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT vendedora FROM aclaraciones WHERE vendedora IS NOT NULL ORDER BY vendedora`
    );
    res.json(result.rows.map(row => row.vendedora));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener vendedoras" });
  }
});

// 📊 Endpoint para obtener opciones de bloques
router.get("/bloques", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT bloque FROM aclaraciones WHERE bloque IS NOT NULL ORDER BY bloque`
    );
    res.json(result.rows.map(row => row.bloque));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener bloques" });
  }
});

// 📊 Endpoint para obtener comentarios comunes
router.get("/comentarios-comunes", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT comentarios, COUNT(*) as frecuencia
      FROM aclaraciones 
      WHERE comentarios IS NOT NULL AND comentarios != ''
      GROUP BY comentarios
      ORDER BY frecuencia DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener comentarios comunes" });
  }
});

// 📊 Endpoint para obtener opciones de captura CC
router.get("/captura-cc", protegerDatos, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT captura_cc FROM aclaraciones WHERE captura_cc IS NOT NULL ORDER BY captura_cc`
    );
    res.json(result.rows.map(row => row.captura_cc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener opciones de captura CC" });
  }
});

// 📊 Endpoint para sucursales desde ventas (sin protección)
router.get("/sucursales-ventas", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Sucursal" as sucursal FROM "ventas" WHERE "Sucursal" IS NOT NULL ORDER BY "Sucursal"`
    );
    res.json(result.rows.map(row => row.sucursal));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener sucursales" });
  }
});

// 🔍 Endpoint para buscar clientes en cargos_auto por terminación de tarjeta y fecha
router.post("/buscar-cliente", async (req, res) => {
  try {
    const { terminacionTarjeta, fecha, monto } = req.body;
    
    if (!terminacionTarjeta || !fecha) {
      return res.status(400).json({ error: "Terminación de tarjeta y fecha son requeridos" });
    }

    // Normalizar la fecha para buscar en diferentes formatos
    let fechaBusqueda;
    try {
      // Intentar diferentes formatos de fecha
      if (fecha.includes('/')) {
        const [day, month, year] = fecha.split('/');
        fechaBusqueda = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (fecha.includes('-')) {
        fechaBusqueda = fecha;
      } else {
        throw new Error('Formato de fecha no reconocido');
      }
    } catch (err) {
      return res.status(400).json({ error: "Formato de fecha inválido. Use DD/MM/YYYY o YYYY-MM-DD" });
    }

    // Buscar en cargos_auto con diferentes variaciones de la terminación
    const terminacionLimpia = terminacionTarjeta.replace(/\D/g, ''); // Solo números
    
    let query = `
      SELECT DISTINCT 
        "Cliente",
        "Fecha",
        "TotalMxn",
        "Tarjeta",
        "Sucursal",
        "Autorizacion"
      FROM "cargos_auto" 
      WHERE 
        "Fecha"::date = $1
        AND (
          "Tarjeta" LIKE '%' || $2 
          OR "Tarjeta" LIKE '%' || $2 || '%'
          OR RIGHT("Tarjeta", 4) = $2
          OR RIGHT(REPLACE("Tarjeta", ' ', ''), 4) = $2
        )
        AND "Cliente" IS NOT NULL
        AND "Cliente" != ''
    `;
    
    const params = [fechaBusqueda, terminacionLimpia];
    
    // Si se proporciona monto, añadir filtro de monto con tolerancia
    if (monto && !isNaN(parseFloat(monto))) {
      const montoNum = parseFloat(monto);
      const tolerancia = montoNum * 0.02; // 2% de tolerancia
      query += ` AND ABS(COALESCE("TotalMxn"::numeric, 0) - $${params.length + 1}) <= $${params.length + 2}`;
      params.push(montoNum, tolerancia);
    }
    
    query += ` ORDER BY "Fecha" DESC LIMIT 10`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: false, 
        message: "No se encontraron movimientos que coincidan con la terminación de tarjeta y fecha proporcionadas",
        data: []
      });
    }
    
    // Si se encontró exactamente una coincidencia, devolver el cliente
    if (result.rows.length === 1) {
      return res.json({
        success: true,
        message: "Cliente encontrado automáticamente",
        cliente: result.rows[0].Cliente,
        data: result.rows
      });
    }
    
    // Si hay múltiples coincidencias, devolver todas para que el usuario elija
    return res.json({
      success: true,
      message: `Se encontraron ${result.rows.length} movimientos posibles`,
      multiple: true,
      data: result.rows
    });
    
  } catch (err) {
    console.error("❌ Error buscando cliente:", err);
    res.status(500).json({ error: "Error al buscar cliente en cargos auto" });
  }
});

// 📊 Endpoint para bloques (sin protección)
router.get("/bloques", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Bloque" as bloque FROM "ventas" WHERE "Bloque" IS NOT NULL ORDER BY "Bloque"`
    );
    res.json(result.rows.map(row => row.bloque));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener bloques" });
  }
});

// 📊 Endpoint para comentarios (sin protección)
router.get("/comentarios", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT comentarios 
      FROM aclaraciones 
      WHERE comentarios IS NOT NULL AND comentarios != ''
      ORDER BY comentarios
      LIMIT 50
    `);
    res.json(result.rows.map(row => row.comentarios));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
});

// 📊 Endpoint para captura CC (sin protección)  
router.get("/captura-cc", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT captura_cc FROM aclaraciones WHERE captura_cc IS NOT NULL ORDER BY captura_cc`
    );
    res.json(result.rows.map(row => row.captura_cc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener captura CC" });
  }
});

// ✏️ Endpoint para actualizar aclaraciones
router.put("/actualizar", protegerDatos, async (req, res) => {
  const updates = req.body;
  
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ 
      error: "Se requiere un array de actualizaciones",
      formato: "Array de objetos con id y campos a actualizar"
    });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let actualizadas = 0;
    let errores = [];

    for (const update of updates) {
      const { id, ...campos } = update;
      
      if (!id) {
        errores.push({ 
          id: 'undefined', 
          error: 'ID requerido para actualización' 
        });
        continue;
      }

      try {
        // Construir query dinámico
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        Object.entries(campos).forEach(([campo, valor]) => {
          // Validar campos permitidos
          const camposPermitidos = [
            'procesador', 'año', 'mes_peticion', 'euroskin', 
            'id_del_comercio_afiliacion', 'nombre_del_comercio',
            'id_de_transaccion', 'fecha_venta', 'monto', 'monto_mnx',
            'num_de_tarjeta', 'autorizacion', 'cliente', 'vendedora',
            'sucursal', 'fecha_contrato', 'paquete', 'bloque',
            'fecha_de_peticion', 'fecha_de_respuesta', 'comentarios',
            'captura_cc'
          ];

          if (camposPermitidos.includes(campo)) {
            setClauses.push(`${campo} = $${paramIndex}`);
            values.push(valor);
            paramIndex++;
          }
        });

        if (setClauses.length === 0) {
          errores.push({ 
            id: id, 
            error: 'No hay campos válidos para actualizar' 
          });
          continue;
        }

        // Agregar timestamp de actualización
        setClauses.push(`updated_at = NOW()`);
        values.push(id); // ID va al final

        const query = `
          UPDATE aclaraciones 
          SET ${setClauses.join(', ')}
          WHERE id = $${paramIndex}
        `;

        const result = await client.query(query, values);
        
        if (result.rowCount > 0) {
          actualizadas++;
        } else {
          errores.push({ 
            id: id, 
            error: 'Registro no encontrado' 
          });
        }

      } catch (error) {
        errores.push({ 
          id: id, 
          error: error.message 
        });
      }
    }

    await client.query('COMMIT');
    
    console.log(`✅ Actualizaciones completadas: ${actualizadas} exitosas, ${errores.length} errores`);

    res.json({
      success: true,
      actualizadas: actualizadas,
      errores: errores,
      total: updates.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error actualizando aclaraciones:", error);
    res.status(500).json({ 
      error: "Error al actualizar aclaraciones",
      detalles: error.message 
    });
  } finally {
    client.release();
  }
});

// 📝 Endpoint para insertar múltiples aclaraciones
router.post("/insertar-multiple", async (req, res) => {
  const { datos, tipoTabla } = req.body;
  
  if (!datos || !Array.isArray(datos) || datos.length === 0) {
    return res.status(400).json({ 
      error: "Se requiere un array de datos",
      formato: "{ datos: [...], tipoTabla: 'EFEVOO' }"
    });
  }

  console.log(`📝 Insertando ${datos.length} registros de tipo: ${tipoTabla}`);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let insertadas = 0;
    let errores = [];

    for (const [index, registro] of datos.entries()) {
      try {
        // Validaciones específicas por tipo de tabla
        const registroValidado = validarRegistroPorTipo(registro, tipoTabla);
        
        // Query de inserción
        const query = `
          INSERT INTO aclaraciones (
            procesador, año, mes_peticion, euroskin,
            id_del_comercio_afiliacion, nombre_del_comercio,
            id_de_transaccion, fecha_venta, monto, monto_mnx,
            num_de_tarjeta, autorizacion, cliente, vendedora,
            sucursal, fecha_contrato, paquete, bloque,
            fecha_de_peticion, fecha_de_respuesta, comentarios,
            captura_cc, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, NOW()
          )
        `;

        const valores = [
          registroValidado.procesador,
          registroValidado.año,
          registroValidado.mes_peticion,
          registroValidado.euroskin,
          registroValidado.id_del_comercio_afiliacion,
          registroValidado.nombre_del_comercio,
          registroValidado.id_de_transaccion,
          registroValidado.fecha_venta,
          registroValidado.monto,
          registroValidado.monto_mnx,
          registroValidado.num_de_tarjeta,
          registroValidado.autorizacion,
          registroValidado.cliente,
          registroValidado.vendedora,
          registroValidado.sucursal,
          registroValidado.fecha_contrato,
          registroValidado.paquete,
          registroValidado.bloque,
          registroValidado.fecha_de_peticion,
          registroValidado.fecha_de_respuesta,
          registroValidado.comentarios,
          registroValidado.captura_cc
        ];

        await client.query(query, valores);
        insertadas++;

      } catch (error) {
        errores.push({
          fila: index + 1,
          error: error.message,
          datos: registro
        });
      }
    }

    await client.query('COMMIT');
    
    console.log(`✅ Inserción completada: ${insertadas} exitosas, ${errores.length} errores`);

    res.json({
      success: true,
      insertadas: insertadas,
      errores: errores,
      total: datos.length,
      tipoTabla: tipoTabla
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error insertando aclaraciones:", error);
    res.status(500).json({ 
      error: "Error al insertar aclaraciones",
      detalles: error.message 
    });
  } finally {
    client.release();
  }
});

// 📊 Endpoint para tipos de tabla disponibles
router.get("/tipos-tabla", async (req, res) => {
  try {
    const tipos = [
      { 
        id: 'EFEVOO', 
        nombre: 'EFEVOO',
        descripcion: 'Formato estándar EFEVOO',
        campos: ['procesador', 'fecha_venta', 'monto', 'cliente', 'sucursal']
      },
      { 
        id: 'BSD', 
        nombre: 'BSD',
        descripcion: 'Formato BSD con campos específicos',
        campos: ['procesador', 'id_transaccion', 'monto', 'num_tarjeta', 'sucursal']
      },
      { 
        id: 'CREDOMATIC', 
        nombre: 'CREDOMATIC',
        descripcion: 'Formato CREDOMATIC',
        campos: ['procesador', 'fecha_venta', 'monto', 'autorizacion', 'cliente']
      }
    ];
    
    res.json(tipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener tipos de tabla" });
  }
});

// 📊 Endpoint para dashboard de aclaraciones
router.get("/dashboard", protegerDatos, async (req, res) => {
  const { anio, mes } = req.query;
  
  try {
    console.log(`📊 Generando dashboard de aclaraciones - Año: ${anio}, Mes: ${mes}`);
    
    let whereClause = 'WHERE 1=1';
    let values = [];
    let paramIndex = 1;

    if (anio) {
      whereClause += ` AND EXTRACT(YEAR FROM fecha_venta) = $${paramIndex}`;
      values.push(anio);
      paramIndex++;
    }

    if (mes) {
      whereClause += ` AND UPPER(mes_peticion) = UPPER($${paramIndex})`;
      values.push(mes);
      paramIndex++;
    }

    // Queries para el dashboard
    const queries = {
      // Resumen general
      resumenGeneral: `
        SELECT 
          COUNT(*) as total_aclaraciones,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'ganada') as ganadas,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'perdida') as perdidas,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) NOT IN ('ganada', 'perdida')) as en_proceso,
          COALESCE(SUM(monto_mnx), 0) as monto_total,
          COALESCE(SUM(CASE WHEN LOWER(captura_cc) = 'ganada' THEN monto_mnx ELSE 0 END), 0) as monto_ganado,
          COALESCE(AVG(monto_mnx), 0) as monto_promedio
        FROM aclaraciones 
        ${whereClause}
      `,
      
      // Por procesador
      porProcesador: `
        SELECT 
          procesador,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'ganada') as ganadas,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'perdida') as perdidas,
          COALESCE(SUM(monto_mnx), 0) as monto_total,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'ganada')::decimal / COUNT(*)::decimal) * 100
              ELSE 0 
            END, 2
          ) as porcentaje_exito
        FROM aclaraciones 
        ${whereClause}
        GROUP BY procesador
        ORDER BY total DESC
      `,
      
      // Top sucursales
      topSucursales: `
        SELECT 
          sucursal,
          COUNT(*) as total_aclaraciones,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'ganada') as ganadas,
          COALESCE(SUM(monto_mnx), 0) as monto_total,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'ganada')::decimal / COUNT(*)::decimal) * 100
              ELSE 0 
            END, 2
          ) as porcentaje_exito
        FROM aclaraciones 
        ${whereClause}
        GROUP BY sucursal
        HAVING COUNT(*) >= 5
        ORDER BY porcentaje_exito DESC, total_aclaraciones DESC
        LIMIT 10
      `,
      
      // Aclaraciones por mes
      aclaracionesPorMes: `
        SELECT 
          EXTRACT(MONTH FROM fecha_venta) as mes,
          TO_CHAR(fecha_venta, 'Month') as nombre_mes,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'ganada') as ganadas,
          COUNT(*) FILTER (WHERE LOWER(captura_cc) = 'perdida') as perdidas,
          COALESCE(SUM(monto_mnx), 0) as monto_total
        FROM aclaraciones 
        ${whereClause}
        GROUP BY EXTRACT(MONTH FROM fecha_venta), TO_CHAR(fecha_venta, 'Month')
        ORDER BY mes
      `
    };

    // Ejecutar todas las queries
    const resultados = {};
    
    for (const [clave, query] of Object.entries(queries)) {
      const result = await pool.query(query, values);
      resultados[clave] = result.rows;
    }

    console.log(`✅ Dashboard de aclaraciones generado exitosamente`);

    res.json(resultados);

  } catch (error) {
    console.error("❌ Error generando dashboard de aclaraciones:", error);
    res.status(500).json({ 
      error: "Error al generar dashboard de aclaraciones",
      detalles: error.message 
    });
  }
});

// Función auxiliar para validar registros por tipo
function validarRegistroPorTipo(registro, tipoTabla) {
  const validado = { ...registro };
  
  // Aplicar validaciones específicas según el tipo
  switch (tipoTabla) {
    case 'EFEVOO':
      validado.procesador = 'EFEVOO';
      // Conversión de moneda para Guatemala (Quetzales a MXN)
      if (validado.monto && validado.bloque && validado.bloque.includes('GUATEMALA')) {
        validado.monto_mnx = parseFloat(validado.monto) * 0.13; // Factor de conversión aproximado
      } else {
        validado.monto_mnx = validado.monto;
      }
      break;
      
    case 'BSD':
      validado.procesador = 'BSD';
      validado.monto_mnx = validado.monto; // USD a MXN (aproximadamente 1:1 para simplificar)
      break;
      
    case 'CREDOMATIC':
      validado.procesador = 'CREDOMATIC';
      // Conversión de moneda para Costa Rica (Colones a MXN)
      if (validado.monto && validado.bloque && validado.bloque.includes('COSTA_RICA')) {
        validado.monto_mnx = parseFloat(validado.monto) * 0.0019; // Factor de conversión aproximado
      } else {
        validado.monto_mnx = validado.monto;
      }
      break;
      
    default:
      validado.monto_mnx = validado.monto;
  }
  
  // Formatear fechas
  if (validado.fecha_venta) {
    validado.fecha_venta = moment(validado.fecha_venta).format('YYYY-MM-DD');
  }
  if (validado.fecha_contrato) {
    validado.fecha_contrato = moment(validado.fecha_contrato).format('YYYY-MM-DD');
  }
  if (validado.fecha_de_peticion) {
    validado.fecha_de_peticion = moment(validado.fecha_de_peticion).format('YYYY-MM-DD');
  }
  if (validado.fecha_de_respuesta) {
    validado.fecha_de_respuesta = moment(validado.fecha_de_respuesta).format('YYYY-MM-DD');
  }
  
  return validado;
}

export default router;
