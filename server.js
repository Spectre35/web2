import express from "express";
import cors from "cors";
import pkg from "pg";
import ExcelJS from "exceljs";
import multer from "multer";
import fs from "fs";
import readline from "readline";
import QueryStream from "pg-query-stream"; // Agrega arriba

const { Pool } = pkg;
const app = express();
const PORT = 3000; // 🔄 PUERTO CAMBIADO PARA DESARROLLO

app.use(cors());
app.use(express.json());

// ✅ Conexión a la base de datos "buscadores"
const pool = new Pool({
  host: "ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech",
  database: "buscadores",
  user: "neondb_owner",
  password: "npg_OnhVP53dwERt",
  port: 5432,
  ssl: { rejectUnauthorized: false },
  max: 50, // ✅ hasta 50 conexiones simultáneas
});

// ✅ Configuración de almacenamiento temporal para archivos (optimizado para archivos 50k+ filas)
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB por archivo (para archivos 50k+ filas)
    files: 5 // Máximo 5 archivos por request
  }
});

// 🔄 Mapeo de columnas específico para cada tabla
function mapearColumnas(tabla, columnas) {
  const mapeosEspecificos = {
    aclaraciones: {
      "PROCESADOR": "procesador",
      "AÑO": "ano", 
      "MES PETICIÓN": "mes_peticion",
      "EUROSKIN": "euroskin",
      "ID DEL COMERCIO / AFILIACIÓN": "id_del_comercio_afiliacion",
      "NOMBRE DEL COMERCIO": "nombre_del_comercio",
      "ID DE TRANSACCION": "id_de_transaccion",
      "FECHA VENTA": "fecha_venta",
      "MONTO": "monto",
      "NUM. DE TARJETA": "num_de_tarjeta",
      "AUTORIZACION": "autorizacion",
      "CLIENTE": "cliente",
      "VENDEDORA": "vendedora",
      "SUCURSAL": "sucursal",
      "FECHA CONTRATO": "fecha_contrato",
      "PAQUETE": "paquete",
      "BLOQUE": "bloque",
      "FECHA DE PETICION": "fecha_de_peticion",
      "FECHA DE RESPUESTA": "fecha_de_respuesta",
      "COMENTARIOS": "comentarios",
      "CAPTURA CC": "captura_cc",
      "MONTO MNX": "monto_mnx"
    }
  };

  if (mapeosEspecificos[tabla]) {
    return columnas.map(col => {
      const colOriginal = col.toString().trim();
      return mapeosEspecificos[tabla][colOriginal] || col.replace(/\s+/g, "_");
    });
  }
  
  // Para otras tablas, usar mapeo genérico
  return columnas.map(col =>
    typeof col === "string" ? col.replace(/\s+/g, "_") : col
  );
}

// ✅ Función para formatear y validar datos según el tipo de columna
function formatearDatos(tabla, columna, valor) {
  // Definición de tipos de columnas por tabla
  const tiposColumnas = {
    aclaraciones: {
      procesador: 'VARCHAR',
      ano: 'VARCHAR',
      mes_peticion: 'VARCHAR',
      euroskin: 'VARCHAR',
      id_del_comercio_afiliacion: 'VARCHAR',
      nombre_del_comercio: 'VARCHAR',
      id_de_transaccion: 'VARCHAR',
      fecha_venta: 'DATE',
      monto: 'DECIMAL',
      num_de_tarjeta: 'VARCHAR',
      autorizacion: 'VARCHAR',
      cliente: 'VARCHAR',
      vendedora: 'VARCHAR',
      sucursal: 'VARCHAR',
      fecha_contrato: 'DATE',
      paquete: 'VARCHAR',
      bloque: 'VARCHAR',
      fecha_de_peticion: 'DATE',
      fecha_de_respuesta: 'DATE',
      comentarios: 'TEXT',
      captura_cc: 'VARCHAR',
      monto_mnx: 'DECIMAL'
    }
  };

  const tipoColumna = tiposColumnas[tabla]?.[columna];
  
  // Si el valor es null, undefined o vacío, retornar null
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  try {
    switch (tipoColumna) {
      case 'DATE':
        // Validar y formatear fechas
        if (valor instanceof Date) {
          // Si ya es una fecha válida de Excel
          return valor.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (typeof valor === 'number') {
          // Si es un número de Excel (fecha serial)
          const fecha = new Date((valor - 25569) * 86400 * 1000);
          if (!isNaN(fecha.getTime()) && fecha.getFullYear() > 1900 && fecha.getFullYear() < 2100) {
            return fecha.toISOString().split('T')[0];
          } else {
            console.log(`⚠️ Fecha inválida en ${columna}: ${valor} -> null`);
            return null;
          }
        } else if (typeof valor === 'string') {
          // Intentar parsear string como fecha
          const fecha = new Date(valor);
          if (!isNaN(fecha.getTime()) && fecha.getFullYear() > 1900 && fecha.getFullYear() < 2100) {
            return fecha.toISOString().split('T')[0];
          } else {
            console.log(`⚠️ Fecha inválida en ${columna}: ${valor} -> null`);
            return null;
          }
        } else {
          console.log(`⚠️ Fecha inválida en ${columna}: ${valor} -> null`);
          return null;
        }

      case 'DECIMAL':
        // Validar y formatear números decimales
        if (typeof valor === 'number') {
          return isNaN(valor) ? null : valor;
        } else if (typeof valor === 'string') {
          const numero = parseFloat(valor.replace(/[,$]/g, ''));
          return isNaN(numero) ? null : numero;
        } else {
          return null;
        }

      case 'VARCHAR':
      case 'TEXT':
        // Para texto, convertir a string y limpiar
        if (columna.includes('tarjeta') && valor != null) {
          // Limpiar números de tarjeta
          return String(valor).replace(/\.0+$/, '').trim();
        } else {
          return String(valor).trim();
        }

      default:
        // Para columnas no definidas, aplicar formato genérico
        if (columna.toLowerCase().includes('tarjeta') && valor != null) {
          return String(valor).replace(/\.0+$/, '');
        } else if (columna.toLowerCase().includes('fecha') && valor instanceof Date) {
          return valor.toISOString().split('T')[0];
        } else {
          return valor;
        }
    }
  } catch (error) {
    console.log(`⚠️ Error formateando ${columna}: ${valor} -> null`);
    return null;
  }
}

// =================== 📥 SUBIR Y ACTUALIZAR TABLAS (OPTIMIZADO) ===================
 // Asegúrate de tenerlo importado arriba

let progresoGlobal = {
  tabla: "",
  procesadas: 0,
  total: 0,
  porcentaje: 0,
  tiempoEstimado: 0,
  tiempoTotal: 0,
};

// ✅ Endpoint SSE para progreso en tiempo real
app.get("/progreso", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify(progresoGlobal)}\n\n`);
  }, 1000);

  req.on("close", () => clearInterval(interval));
});

// ✅ Endpoint principal optimizado
app.post("/upload/:tabla", upload.single("archivo"), async (req, res) => {
  const tabla = req.params.tabla;
  const filePath = req.file.path;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];

    // ✅ Usar mapeo específico por tabla
    const columnasOriginales = sheet.getRow(1).values.slice(1).filter(col => col !== null && col !== undefined && col !== '');
    
    // 🔍 DEBUG: Verificar primera fila completa
    console.log(`🔍 DEBUG - Primera fila completa:`, sheet.getRow(1).values);
    console.log(`🔍 DEBUG - Columnas filtradas:`, columnasOriginales);
    
    if (columnasOriginales.length === 0) {
      throw new Error('No se detectaron columnas en el archivo Excel. Verifica que la primera fila contenga los encabezados.');
    }
    
    const columnas = mapearColumnas(tabla, columnasOriginales);
    
    console.log(`📋 Columnas originales:`, columnasOriginales);
    console.log(`📋 Columnas mapeadas:`, columnas);

    const totalFilas = sheet.rowCount - 1;

    progresoGlobal = {
      tabla,
      procesadas: 0,
      total: totalFilas,
      porcentaje: 0,
      tiempoEstimado: 0,
      tiempoTotal: 0,
    };

    console.log(`📂 Subiendo ${totalFilas} registros a ${tabla}...`);
    const inicio = Date.now();

    let batch = [];
    const batchSize = 1000;

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const obj = {};

      columnas.forEach((col, idx) => {
        let valor = row.values[idx + 1];
        
        // Usar la función de formateo específica por tabla y columna
        obj[col] = formatearDatos(tabla, col, valor);
      });

      batch.push(obj);

      if (batch.length === batchSize) {
        await insertarBatch(tabla, batch);
        progresoGlobal.procesadas += batch.length;
        actualizarProgreso(inicio);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await insertarBatch(tabla, batch);
      progresoGlobal.procesadas += batch.length;
      actualizarProgreso(inicio);
    }

    progresoGlobal.tiempoTotal = ((Date.now() - inicio) / 1000).toFixed(2);

    fs.unlinkSync(filePath);
    console.log(`🎉 Carga finalizada en ${progresoGlobal.tiempoTotal}s`);
    res.send(`✅ ${progresoGlobal.procesadas} registros insertados en ${tabla}`);
  } catch (error) {
    console.error(`❌ Error al actualizar ${tabla}:`, error);
    res.status(500).send("Error al insertar datos");
  }
});

// ✅ Inserción por lotes (ajusta las columnas dinámicamente)
async function insertarBatch(tabla, batch) {
  if (!batch.length) return;

  // 🔍 Verificar que el batch tenga datos válidos
  const primerObjeto = batch[0];
  const columnas = Object.keys(primerObjeto);
  
  if (columnas.length === 0) {
    throw new Error(`No hay columnas válidas en el batch para la tabla ${tabla}`);
  }

  const columnasSQL = columnas
    .map((c) => `"${c}"`)
    .join(", ");

  const values = [];
  const placeholders = batch
    .map((row, rowIndex) => {
      const rowValues = Object.values(row);
      values.push(...rowValues);
      const start = rowIndex * rowValues.length + 1;
      return `(${rowValues
        .map((_, i) => `$${start + i}`)
        .join(", ")})`;
    })
    .join(", ");

  const query = `INSERT INTO "${tabla}" (${columnasSQL}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;

  // 🔍 DEBUG: Mostrar query problemático
  console.log(`🔍 DEBUG - Tabla: ${tabla}`);
  console.log(`🔍 DEBUG - Columnas SQL: ${columnasSQL}`);
  console.log(`🔍 DEBUG - Query: ${query.substring(0, 200)}...`);
  console.log(`🔍 DEBUG - Total values: ${values.length}`);
  console.log(`🔍 DEBUG - Primer batch:`, batch[0]);

  await pool.query(query, values);
}

// ✅ Calcular porcentaje y tiempo estimado
function actualizarProgreso(inicio) {
  const tiempoTranscurrido = (Date.now() - inicio) / 1000;
  progresoGlobal.porcentaje = (
    (progresoGlobal.procesadas / progresoGlobal.total) *
    100
  ).toFixed(2);
  progresoGlobal.tiempoEstimado = (
    (tiempoTranscurrido / progresoGlobal.procesadas) *
    progresoGlobal.total
  ).toFixed(2);
}



/* =============== 🔍 CONSULTAR DATOS (ya con filtros) ================== */
const generarConsulta = (tabla, filtros, pagina, limite) => {
  let columnaFecha = '"Fecha"';
  if (tabla === "ventas") columnaFecha = '"FechaCompra"';
  if (tabla === "aclaraciones") columnaFecha = '"fecha_de_peticion"';
  
  let query = `SELECT * FROM "${tabla}" WHERE 1=1`;
  const values = [];

  if (filtros.cliente) {
    values.push(`%${filtros.cliente}%`);
    if (tabla === "aclaraciones") {
      query += ` AND "cliente" ILIKE $${values.length}`;
    } else {
      query += ` AND "Cliente" ILIKE $${values.length}`;
    }
  }
  if (filtros.sucursal) {
    values.push(filtros.sucursal);
    if (tabla === "aclaraciones") {
      query += ` AND "sucursal" = $${values.length}`;
    } else {
      query += ` AND "Sucursal" = $${values.length}`;
    }
  }
  if (filtros.fecha_inicio && filtros.fecha_fin) {
    values.push(filtros.fecha_inicio);
    query += ` AND ${columnaFecha} >= $${values.length}`;
    values.push(filtros.fecha_fin);
    query += ` AND ${columnaFecha} <= $${values.length}`;
  }
  if (filtros.monto_min) {
    values.push(parseFloat(filtros.monto_min));
    if (tabla === "aclaraciones") {
      query += ` AND "monto" >= $${values.length}`;
    } else {
      query += ` AND "Total" >= $${values.length}`;
    }
  }
  if (filtros.monto_max) {
    values.push(parseFloat(filtros.monto_max));
    if (tabla === "aclaraciones") {
      query += ` AND "monto" <= $${values.length}`;
    } else {
      query += ` AND "Total" <= $${values.length}`;
    }
  }
  if (filtros.tarjeta) {
    values.push(filtros.tarjeta);
    if (tabla === "aclaraciones") {
      query += ` AND "num_de_tarjeta" = $${values.length}`;
    } else {
      query += ` AND "Tarjeta" = $${values.length}`;
    }
  }
  if (filtros.terminacion) {
    values.push(`%${filtros.terminacion}`);
    if (tabla === "aclaraciones") {
      query += ` AND "num_de_tarjeta" LIKE $${values.length}`;
    } else {
      query += ` AND "Tarjeta" LIKE $${values.length}`;
    }
  }
  if (filtros.anio) {
    values.push(filtros.anio);
    query += ` AND EXTRACT(YEAR FROM ${columnaFecha}) = $${values.length}`;
  }
  if (filtros.bloque) {
    values.push(filtros.bloque);
    if (tabla === "aclaraciones") {
      query += ` AND "bloque" = $${values.length}`;
    } else {
      query += ` AND "Bloque" = $${values.length}`;
    }
  }
  if (filtros.vendedora) {
    values.push(`%${filtros.vendedora}%`);
    if (tabla === "aclaraciones") {
      query += ` AND "vendedora" ILIKE $${values.length}`;
    } else {
      query += ` AND "Vendedor" ILIKE $${values.length}`;
    }
  }

  if (filtros.procesadores) {
  if (typeof filtros.procesadores === "string") {
    // Si viene como "KUSHKI,NETPAY", conviértelo a array
    if (filtros.procesadores.includes(",")) {
      filtros.procesadores = filtros.procesadores.split(",").map(p => p.trim());
    } else {
      filtros.procesadores = [filtros.procesadores.trim()];
    }
  } else if (Array.isArray(filtros.procesadores)) {
    filtros.procesadores = filtros.procesadores.map(p => p.trim());
  }
}

if (
  tabla === "cargos_auto" &&
  filtros.procesadores &&
  Array.isArray(filtros.procesadores) &&
  filtros.procesadores.length > 0
) {
  const condiciones = filtros.procesadores.map((p, idx) => {
    values.push(`%${p}%`);
    return `TRIM("Cobrado_Por") ILIKE $${values.length}`;
  });
  query += ` AND (${condiciones.join(" OR ")})`;
}

// Filtros específicos para aclaraciones
if (tabla === "aclaraciones") {
  if (filtros.busqueda) {
    values.push(`%${filtros.busqueda}%`);
    query += ` AND ("cliente" ILIKE $${values.length} OR "num_de_tarjeta" ILIKE $${values.length} OR "id_de_transaccion" ILIKE $${values.length})`;
  }
  if (filtros.procesador) {
    values.push(filtros.procesador);
    query += ` AND "procesador" = $${values.length}`;
  }
}

  const offset = (pagina - 1) * limite;
  query += ` ORDER BY ${columnaFecha} DESC LIMIT ${limite} OFFSET ${offset}`;
  return { query, values };
};

["caja", "cargos_auto", "ventas", "aclaraciones"].forEach(tabla => {
  app.get(`/${tabla}/ultima-fecha`, async (req, res) => {
    try {
      // Usa la columna correcta para cada tabla
      let columnaFecha = "Fecha";
      if (tabla === "ventas") columnaFecha = "FechaCompra";
      if (tabla === "aclaraciones") columnaFecha = "fecha_de_peticion";
      
      const result = await pool.query(
        `SELECT MAX("${columnaFecha}") AS fecha FROM "${tabla}"`
      );
      res.json({ fecha: result.rows[0].fecha });
    } catch (err) {
      res.json({ fecha: null });
    }
  });
});

["cargos_auto", "caja", "ventas", "aclaraciones"].forEach((tabla) => {
  app.get(`/${tabla}`, async (req, res) => {
    try {
      const { pagina = 1, limite = 1000, ...filtros } = req.query;
      const { query, values } = generarConsulta(tabla, filtros, pagina, limite);

      // Consulta para el total
      const { query: countQuery, values: countValues } = generarConsulta(tabla, filtros, 1, 1000000000);
      const countResult = await pool.query(
        countQuery.replace(/SELECT \* FROM/, "SELECT COUNT(*) AS total FROM").replace(/ORDER BY[\s\S]*/i, ""),
        countValues
      );
      const total = Number(countResult.rows[0].total);

      const result = await pool.query(query, values);
      res.json({ datos: result.rows, total });
    } catch (error) {
      console.error(`❌ Error en ${tabla}:`, error);
      res.status(500).send(`Error en ${tabla}`);
    }
  });

  // Endpoint para exportar a Excel
  app.get(`/${tabla}/exportar`, async (req, res) => {
    try {
      const { pagina = 1, limite = 100000, ...filtros } = req.query;
      const { query, values } = generarConsulta(tabla, filtros, pagina, limite);

      const client = await pool.connect();
      const queryStream = new QueryStream(query, values, { batchSize: 1000 });
      const stream = client.query(queryStream);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const worksheet = workbook.addWorksheet(tabla);

      let columnsSet = false;

      stream.on("data", (row) => {
        if (!columnsSet) {
          worksheet.columns = Object.keys(row).map((key) => ({
            header: key,
            key,
          }));
          columnsSet = true;
        }
        
        // Convierte números
        if (row.Total !== undefined && row.Total !== null) row.Total = Number(row.Total);
        if (row.TotalMxn !== undefined && row.TotalMxn !== null) row.TotalMxn = Number(row.TotalMxn);
        
        worksheet.addRow(row).commit();
      });

      stream.on("end", async () => {
        await worksheet.commit();
        await workbook.commit();
        client.release();
      });

      stream.on("error", (err) => {
        console.error("Error en stream de exportación:", err);
        client.release();
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${tabla}.xlsx`
      );
    } catch (error) {
      console.error(`❌ Error al exportar ${tabla}:`, error);
      res.status(500).send("Error al exportar datos");
    }
  });
});

app.get("/sucursales", async (req, res) => {
  const { bloque, anio } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT DISTINCT "Sucursal" FROM "ventas" ${whereClause} ORDER BY "Sucursal"`,
      values
    );
    const sucursales = result.rows.map((row) => row.Sucursal).filter(Boolean);
    res.json(sucursales);
  } catch (error) {
    res.status(500).send("Error al obtener sucursales");
  }
});

app.get("/ventas/resumen", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      EXTRACT(MONTH FROM "FechaCompra") AS mes,
      "Bloque",
      COUNT(*) AS ventas,
      COALESCE(SUM("MontoVencido"::numeric),0) AS ventasAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS cantidadPagada,
      COALESCE(SUM("Anticipo"::numeric),0) AS anticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalPagado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS ventasTotal
    FROM "ventas"
    ${whereClause}
    GROUP BY mes, "Bloque"
    ORDER BY mes;
  `;

  try {
    const result = await pool.query(query, values);

    // Convierte todos los montos a MXN según el bloque
    const resumenPorMes = {};
    result.rows.forEach(row => {
      const bloque = row.Bloque;
      const moneda = BLOQUE_PAIS_MONEDA[bloque]?.moneda || "MXN";
      const factor = TIPO_CAMBIO[moneda] || 1;
      const mes = row.mes;

      if (!resumenPorMes[mes]) {
        resumenPorMes[mes] = {
          mes,
          ventas: 0,
          ventasadeudo: 0,
          cantidadpagada: 0,
          anticipo: 0,
          totalpagado: 0,
          ventastotal: 0,
        };
      }
      resumenPorMes[mes].ventas += Number(row.ventas);
      resumenPorMes[mes].ventasadeudo += Number(row.ventasadeudo) * factor;
      resumenPorMes[mes].cantidadpagada += Number(row.cantidadpagada) * factor;
      resumenPorMes[mes].anticipo += Number(row.anticipo) * factor;
      resumenPorMes[mes].totalpagado += Number(row.totalpagado) * factor;
      resumenPorMes[mes].ventastotal += Number(row.ventastotal) * factor;
    });

    res.json(Object.values(resumenPorMes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
});

app.get("/ventas/resumen-vendedora", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // ✅ FECHA LÍMITE: Solo vendedoras activas (últimos 2 meses)
  const fechaLimite = new Date();
  fechaLimite.setMonth(fechaLimite.getMonth() - 2);
  const fechaLimiteStr = fechaLimite.toISOString().slice(0, 10);
  
  values.push(fechaLimiteStr);
  const fechaLimiteParam = `$${idx++}`;

  // ✅ QUERY PRINCIPAL: Solo vendedoras activas + filtros del dashboard
  const query = `
    WITH vendedoras_activas AS (
      SELECT DISTINCT "Vendedor"
      FROM "ventas"
      WHERE "FechaCompra" >= ${fechaLimiteParam}
    ),
    sucursales_unicas AS (
      SELECT 
        t."Vendedor",
        STRING_AGG(sucursal_unica, ', ' ORDER BY sucursal_unica) AS sucursales
      FROM (
        SELECT DISTINCT v."Vendedor", v."Sucursal" as sucursal_unica
        FROM "ventas" v
        INNER JOIN vendedoras_activas va ON v."Vendedor" = va."Vendedor"
        ${whereClause}
      ) t
      GROUP BY t."Vendedor"
    )
    SELECT 
      v."Vendedor",
      COUNT(*) AS ventas,
      COALESCE(SUM("MontoVencido"::numeric),0) AS ventasAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS cantidadPagada,
      COALESCE(SUM("Anticipo"::numeric),0) AS anticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalPagado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS ventasTotal,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS totalVencido,
      COALESCE(SUM(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN "MontoVencido"::numeric ELSE 0 END),0) AS montoVencido,
      MIN(v."Bloque") AS bloque,
      MAX(v."FechaCompra") AS ultimaVenta,
      s.sucursales
    FROM "ventas" v
    INNER JOIN vendedoras_activas va ON v."Vendedor" = va."Vendedor"
    LEFT JOIN sucursales_unicas s ON v."Vendedor" = s."Vendedor"
    ${whereClause}
    GROUP BY v."Vendedor", s.sucursales
    ORDER BY ventasTotal DESC;
  `;

  try {
    const result = await pool.query(query, values);

    const resumenVendedora = await Promise.all(
      result.rows.map(async (row) => {
        const bloque = row.bloque;
        const factor = TIPO_CAMBIO[BLOQUE_PAIS_MONEDA[bloque]?.moneda] || 1;

        const ventasAdeudo = Number(row.ventasadeudo) * factor;
        const cantidadPagada = Number(row.cantidadpagada) * factor;
        const anticipo = Number(row.anticipo) * factor;
        const totalPagado = Number(row.totalpagado) * factor;
        const ventasTotal = Number(row.ventastotal) * factor;
        const montoVencido = Number(row.montovencido) * factor;

        // ✅ QUERY SEPARADO: Sucursales en el rango de fechas del dashboard
        let sucursalQuery = `
          SELECT 
            "Sucursal",
            COUNT(*) as ventas_sucursal
          FROM "ventas"
          WHERE "Vendedor" = $1
        `;

        const sucursalValues = [row.Vendedor];
        let paramIndex = 2;

        // ✅ SOLO APLICAR FILTROS DE FECHA DEL DASHBOARD (NO bloque ni sucursal específica)
        if (fecha_inicio && fecha_fin) {
          sucursalQuery += ` AND "FechaCompra" >= $${paramIndex++}`;
          sucursalValues.push(fecha_inicio);
          sucursalQuery += ` AND "FechaCompra" <= $${paramIndex++}`;
          sucursalValues.push(fecha_fin);
        }
        // ✅ NO aplicar filtros de año, bloque o sucursal específica

        sucursalQuery += `
          GROUP BY "Sucursal"
          ORDER BY ventas_sucursal DESC
        `;

        const sucursalResult = await pool.query(sucursalQuery, sucursalValues);
        const ventasPorSucursal = sucursalResult.rows.map(s => 
          `${s.Sucursal}: ${s.ventas_sucursal}`
        );

        return {
          vendedora: row.Vendedor,
          ventas: Number(row.ventas),
          ventasAdeudo,
          cantidadPagada,
          anticipo,
          totalPagado,
          ventasTotal,
          totalVencido: Number(row.totalvencido), // ✅ Cantidad de paquetes vencidos
          montoVencido, // ✅ Monto vencido en dinero
          ultimaVenta: row.ultimaventa,
          sucursales: row.sucursales,
          ventasPorSucursal, // ✅ Sucursales del período del dashboard
          porcentajeRecuperado: ventasTotal > 0 
            ? Math.round((totalPagado / ventasTotal) * 100) 
            : 0,
        };
      })
    );

    res.json(
      resumenVendedora.sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen por vendedora" });
  }
});

app.get("/ventas/resumen-sucursal", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      "Sucursal",
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'AL CORRIENTE') AS al_corriente,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'LIQUIDADO') AS liquidado,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS vencido,
      COUNT(*) AS ventas,
      COALESCE(SUM("MontoVencido"::numeric),0) AS ventasAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS cantidadPagada,
      COALESCE(SUM("Anticipo"::numeric),0) AS anticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalPagado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS ventasTotal,
      COALESCE(SUM(CASE WHEN "EstatusCobranza" = 'VENCIDO' THEN "MontoVencido"::numeric ELSE 0 END),0) AS montoVencido,
      MIN("Bloque") AS bloque,
      MAX("FechaCompra") AS ultima_venta
    FROM "ventas"
    ${whereClause}
    GROUP BY "Sucursal"
    HAVING MAX("FechaCompra") >= CURRENT_DATE - INTERVAL '2 months'
  `;

  try {
    const result = await pool.query(query, values);

    const resumenSucursal = result.rows.map(row => {
      const bloque = row.bloque;
      const moneda = BLOQUE_PAIS_MONEDA[bloque]?.moneda || "MXN";
      const factor = TIPO_CAMBIO[moneda] || 1;
      const ventasTotal = Number(row.ventastotal) * factor;
      const totalPagado = Number(row.totalpagado) * factor;
      const porcentajeRecuperado = ventasTotal > 0
        ? Math.round((totalPagado / ventasTotal) * 100)
        : 0;
      return {
        sucursal: row.Sucursal,
        alCorriente: Number(row.al_corriente),
        liquidado: Number(row.liquidado),
        vencido: Number(row.vencido),
        ventas: Number(row.ventas),
        ventasAdeudo: Number(row.ventasadeudo) * factor,
        cantidadPagada: Number(row.cantidadpagada) * factor,
        anticipo: Number(row.anticipo) * factor,
        totalPagado,
        ventasTotal,
        montoVencido: Number(row.montovencido) * factor,
        totalVencido: Number(row.vencido),
        porcentajeRecuperado,
      };
    });

    // Ordena de menor a mayor porcentaje recuperado
    res.json(
      resumenSucursal.sort((a, b) => a.porcentajeRecuperado - b.porcentajeRecuperado)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen por sucursal" });
  }
});

// ✅ Endpoint específico para el gráfico de pastel (incluye TODAS las sucursales)
app.get("/ventas/resumen-sucursal-completo", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      "Sucursal",
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'AL CORRIENTE') AS al_corriente,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'LIQUIDADO') AS liquidado,
      COUNT(*) FILTER (WHERE "EstatusCobranza" = 'VENCIDO') AS vencido,
      COUNT(*) AS ventas,
      MIN("Bloque") AS bloque
    FROM "ventas"
    ${whereClause}
    GROUP BY "Sucursal"
  `;

  try {
    const result = await pool.query(query, values);

    const resumenSucursalCompleto = result.rows.map(row => ({
      sucursal: row.Sucursal,
      alCorriente: Number(row.al_corriente),
      liquidado: Number(row.liquidado),
      vencido: Number(row.vencido),
      ventas: Number(row.ventas),
    }));

    res.json(resumenSucursalCompleto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen completo por sucursal" });
  }
});

app.get("/anios", async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT EXTRACT(YEAR FROM "FechaCompra") AS anio FROM "ventas" ORDER BY anio DESC');
    const anios = result.rows.map(r => Number(r.anio));
    res.json(anios);
  } catch (error) {
    res.status(500).send("Error al obtener años");
  }
});

app.get("/bloques", async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT "Bloque" FROM "ventas" ORDER BY "Bloque"');
    const bloques = result.rows.map(r => r.Bloque).filter(Boolean);
    res.json(bloques);
  } catch (error) {
    res.status(500).send("Error al obtener bloques");
  }
});

const BLOQUE_PAIS_MONEDA = {
  COL1: { pais: "Colombia", moneda: "COP" },
  COL2: { pais: "Colombia", moneda: "COP" },
  CRI1: { pais: "Costa Rica", moneda: "CRC" },
  CHI:  { pais: "Chile", moneda: "CLP" },
  HON:  { pais: "Honduras", moneda: "HNL" },
  ESP1: { pais: "España", moneda: "EUR" },
  ESP2: { pais: "España", moneda: "EUR" },
  BRA:  { pais: "Brasil", moneda: "BRL" },
  USA1: { pais: "USA", moneda: "USD" },
};

const TIPO_CAMBIO = {
  MXN: 1,
  COP: 0.0047,
  CRC: 0.037,
  CLP: 0.019,
  HNL: 0.71,
  EUR: 21.82,
  BRL: 3.36,
  USD: 18.75,
};

app.get("/vendedoras-status", async (req, res) => {
  const { nombre } = req.query;
  let values = [];
  let idx = 1;

  // Subconsulta: obtiene la última venta por vendedora
  const subquery = `
    SELECT DISTINCT ON ("Vendedor")
      "Vendedor", "Sucursal", "Bloque", "FechaCompra"
    FROM "ventas"
    ORDER BY "Vendedor", "FechaCompra" DESC
  `;

  // Filtro por nombre en el SELECT principal
  let whereClause = "";
  if (nombre) {
    whereClause = `WHERE v."Vendedor" ILIKE $${idx++}`;
    values.push(`%${nombre}%`);
  }

  const query = `
    SELECT
      v."Vendedor" AS nombre,
      v."Sucursal",
      v."Bloque",
      v."FechaCompra" AS fechaUltima
    FROM (${subquery}) v
    ${whereClause}
    ORDER BY fechaUltima DESC
  `;

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener vendedoras" });
  }
});

// ✅ Endpoint para procesadores alerta (BORRA EL LOG INNECESARIO)
app.get("/cargos_auto/procesadores-alerta", async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const grupos = [
      { nombre: "STRIPE", palabras: ["stripe", "strupe"] },
      { nombre: "EFEVOO", palabras: ["efevoo"] },
      { nombre: "KUSHKI", palabras: ["kushki"] },
      { nombre: "NETPAY", palabras: ["netpay"] },
      { nombre: "PAYCODE", palabras: ["paycode"] },
      { nombre: "CLIP", palabras: ["clip"] },
      { nombre: "BANCOLOMBIA", palabras: ["bancolombia"] },
      { nombre: "BSD", palabras: ["bsd"] },
      { nombre: "CREDIBANCO", palabras: ["credibanco"] },
      { nombre: "TRANSBANK", palabras: ["transbank"] },
      { nombre: "MERCADO PAGO", palabras: ["mercado pago"] },
      { nombre: "SISTECREDITO", palabras: ["sistecredito"] },
    ];

    const normalizar = nombre =>
      (nombre || "").replace(/\s+/g, "").toLowerCase();

    // Excluye todos los que contienen "link de pago"
    const procesadoresResult = await pool.query(
      `SELECT "Cobrado_Por", MAX("Fecha"::date) AS ultima_fecha
       FROM "cargos_auto"
       WHERE COALESCE("TotalMxn"::numeric, 0) > 0
       GROUP BY "Cobrado_Por"`
    );
    const todosProcesadores = procesadoresResult.rows
      .filter(proc => !normalizar(proc.Cobrado_Por).includes("linkdepago"))
      .map(proc => ({
        ...proc,
        norm: normalizar(proc.Cobrado_Por),
      }));

    // Agrupa procesadores por coincidencia en el nombre
    const gruposProcesadores = grupos.map(grupo => {
      const miembros = todosProcesadores.filter(proc =>
        grupo.palabras.some(palabra =>
          proc.norm.includes(normalizar(palabra))
        )
      );
      let ultima_fecha = null;
      let nombre_mostrar = grupo.nombre;
      if (miembros.length > 0) {
        miembros.forEach(proc => {
          if (!ultima_fecha || (proc.ultima_fecha && proc.ultima_fecha > ultima_fecha)) {
            ultima_fecha = proc.ultima_fecha;
            nombre_mostrar = proc.Cobrado_Por;
          }
        });
      }
      return {
        grupo: grupo.nombre,
        Cobrado_Por: nombre_mostrar,
        ultima_fecha,
      };
    });

    const procesadoresSinGrupo = todosProcesadores.filter(proc =>
      !grupos.some(grupo =>
        grupo.palabras.some(palabra =>
          proc.norm.includes(normalizar(palabra))
        )
      )
    ).map(proc => ({
      grupo: null,
      Cobrado_Por: proc.Cobrado_Por,
      ultima_fecha: proc.ultima_fecha,
    }));

    const todos = [...gruposProcesadores, ...procesadoresSinGrupo];

    // Calcula días sin cobro y filtra los que llevan entre 2 y 30 días sin cobrar
    const alerta = todos
      .map(proc => {
        if (!proc.ultima_fecha) return { ...proc, diasSinCobro: null };
        const fechaUltima = new Date(proc.ultima_fecha);
        const diffDias = Math.floor((hoy - fechaUltima) / (1000 * 60 * 60 * 24));
        return { ...proc, diasSinCobro: diffDias };
      })
      .filter(proc =>
        proc.diasSinCobro !== null &&
        proc.diasSinCobro >= 2 &&
        proc.diasSinCobro <= 30
      );

    res.json(alerta);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener procesadores inactivos" });
  }
});

app.get("/sucursal-bloque", async (req, res) => {
  const { bloque } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (bloque) {
    where.push(`v."Bloque" = $${idx++}`);
    values.push(bloque);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        v."Sucursal", 
        v."Bloque",
        COALESCE(us."slack", 'Sin asignar') as "nombre_slack"
      FROM "ventas" v
      LEFT JOIN "usuarios_slack" us ON us."sucursal" = v."Sucursal"
      ${whereClause} 
      ORDER BY v."Sucursal", v."Bloque"
    `, values);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error en sucursal-bloque:", err);
    res.status(500).json({ error: "Error al obtener sucursal-bloque" });
  }
});

app.get("/cargos_auto/procesadores", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Cobrado_Por" FROM "cargos_auto" WHERE "Cobrado_Por" IS NOT NULL ORDER BY "Cobrado_Por"`
    );
    res.json(result.rows.map(r => r.Cobrado_Por).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener procesadores" });
  }
});

app.get("/aclaraciones/procesadores", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "procesador" FROM "aclaraciones" WHERE "procesador" IS NOT NULL ORDER BY "procesador"`
    );
    res.json(result.rows.map(r => r.procesador).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener procesadores de aclaraciones" });
  }
});

app.get("/aclaraciones/sucursales", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "sucursal" FROM "aclaraciones" WHERE "sucursal" IS NOT NULL ORDER BY "sucursal"`
    );
    res.json(result.rows.map(r => r.sucursal).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener sucursales de aclaraciones" });
  }
});

// Endpoint para obtener vendedoras desde la tabla ventas
app.get("/aclaraciones/vendedoras", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Vendedor" FROM "ventas" WHERE "Vendedor" IS NOT NULL ORDER BY "Vendedor"`
    );
    res.json(result.rows.map(r => r.Vendedor).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener vendedoras" });
  }
});

// Endpoint para obtener sucursales desde la tabla ventas  
app.get("/aclaraciones/sucursales-ventas", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Sucursal" FROM "ventas" WHERE "Sucursal" IS NOT NULL ORDER BY "Sucursal"`
    );
    res.json(result.rows.map(r => r.Sucursal).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener sucursales desde ventas" });
  }
});

// Endpoint para obtener bloques desde la tabla ventas
app.get("/aclaraciones/bloques", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "Bloque" FROM "ventas" WHERE "Bloque" IS NOT NULL ORDER BY "Bloque"`
    );
    res.json(result.rows.map(r => r.Bloque).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener bloques" });
  }
});

// Endpoint para obtener comentarios únicos desde la tabla aclaraciones
app.get("/aclaraciones/comentarios", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "comentarios" FROM "aclaraciones" WHERE "comentarios" IS NOT NULL AND "comentarios" != '' ORDER BY "comentarios"`
    );
    res.json(result.rows.map(r => r.comentarios).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
});

// ===== ENDPOINTS PARA GESTIÓN DE USUARIOS SLACK =====

// Obtener todos los usuarios slack
app.get("/usuarios-slack", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM "usuarios_slack" 
      ORDER BY "sucursal"
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener usuarios slack:", err);
    res.status(500).json({ error: "Error al obtener usuarios slack" });
  }
});

// Crear o actualizar usuario slack
app.post("/usuarios-slack", async (req, res) => {
  try {
    const { sucursal, slack } = req.body;
    
    if (!sucursal || !slack) {
      return res.status(400).json({ error: "Sucursal y slack son requeridos" });
    }
    
    const result = await pool.query(`
      INSERT INTO "usuarios_slack" ("sucursal", "slack")
      VALUES ($1, $2)
      ON CONFLICT ("sucursal") 
      DO UPDATE SET 
        "slack" = EXCLUDED."slack"
      RETURNING *
    `, [sucursal, slack]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al crear/actualizar usuario slack:", err);
    res.status(500).json({ error: "Error al crear/actualizar usuario slack" });
  }
});

// Insertar múltiples usuarios slack desde Excel
app.post("/usuarios-slack/bulk", async (req, res) => {
  try {
    const { usuarios } = req.body;
    
    if (!usuarios || !Array.isArray(usuarios)) {
      return res.status(400).json({ error: "Se requiere un array de usuarios" });
    }

    const results = [];
    for (const usuario of usuarios) {
      const { sucursal, slack } = usuario;
      
      if (!sucursal || !slack) {
        console.log(`Saltando usuario sin datos completos:`, usuario);
        continue;
      }
      
      const result = await pool.query(`
        INSERT INTO "usuarios_slack" ("sucursal", "slack")
        VALUES ($1, $2)
        ON CONFLICT ("sucursal") 
        DO UPDATE SET 
          "slack" = EXCLUDED."slack"
        RETURNING *
      `, [sucursal, slack]);
      
      results.push(result.rows[0]);
    }
    
    res.json({ 
      message: `${results.length} usuarios procesados correctamente`,
      usuarios: results 
    });
  } catch (err) {
    console.error("Error en inserción masiva usuarios slack:", err);
    res.status(500).json({ error: "Error en inserción masiva" });
  }
});

// Eliminar usuario slack
app.delete("/usuarios-slack/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM "usuarios_slack" WHERE "id" = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar usuario slack:", err);
    res.status(500).json({ error: "Error al eliminar usuario slack" });
  }
});

// ===== FIN ENDPOINTS USUARIOS SLACK =====

// Endpoint para insertar múltiples registros de aclaraciones
app.post("/aclaraciones/insertar-multiple", async (req, res) => {
  try {
    const { datos } = req.body;
    
    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron datos válidos" });
    }

    // Validar que todos los datos tengan al menos un campo completado
    const datosValidos = datos.filter(fila => 
      Object.values(fila).some(valor => valor && valor.toString().trim() !== "")
    );

    if (datosValidos.length === 0) {
      return res.status(400).json({ error: "No hay datos válidos para insertar" });
    }

    let registrosInsertados = 0;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const fila of datosValidos) {
        // Calcular MONTO_MNX automáticamente basado en el bloque
        let montoMnx = null;
        if (fila.MONTO && fila.BLOQUE) {
          const monto = parseFloat(fila.MONTO);
          if (!isNaN(monto)) {
            // Usar los tipos de cambio definidos arriba
            const tiposCambio = {
              "MEX": 1,        // MXN
              "COL1": 0.0047,  // COP - Colombia
              "COL2": 0.0047,  // COP - Colombia
              "CRI1": 0.037,   // CRC - Costa Rica
              "CHI": 0.019,    // CLP - Chile
              "HON": 0.71,     // HNL - Honduras
              "ESP1": 21.82,   // EUR - España
              "ESP2": 21.82,   // EUR - España
              "BRA": 3.36,     // BRL - Brasil
              "USA1": 18.75,   // USD - USA
            };
            
            const tipoCambio = tiposCambio[fila.BLOQUE] || 1; // Por defecto MXN
            montoMnx = monto * tipoCambio;
          }
        }

        // Preparar los valores, asegurándose de que las fechas tengan el formato correcto
        const valores = {
          procesador: fila.PROCESADOR || null,
          año: fila.AÑO || null,
          mes_peticion: fila.MES_PETICION || null,
          euroskin: fila.EUROSKIN === true || fila.EUROSKIN === 'true' ? true : false,
          id_del_comercio_afiliacion: fila.ID_DEL_COMERCIO_AFILIACION || null,
          nombre_del_comercio: fila.NOMBRE_DEL_COMERCIO || null,
          id_de_transaccion: fila.ID_DE_TRANSACCION || null,
          fecha_venta: fila.FECHA_VENTA || null,
          monto: fila.MONTO ? parseFloat(fila.MONTO) : null,
          num_de_tarjeta: fila.NUM_DE_TARJETA || null,
          autorizacion: fila.AUTORIZACION || null,
          cliente: fila.CLIENTE || null,
          vendedora: fila.VENDEDORA || null,
          sucursal: fila.SUCURSAL || null,
          fecha_contrato: fila.FECHA_CONTRATO || null,
          paquete: fila.PAQUETE || null,
          bloque: fila.BLOQUE || null,
          fecha_de_peticion: fila.FECHA_DE_PETICION || null,
          fecha_de_respuesta: fila.FECHA_DE_RESPUESTA || null,
          comentarios: fila.COMENTARIOS || null,
          captura_cc: fila.CAPTURA_CC || null,
          monto_mnx: montoMnx
        };

        await client.query(`
          INSERT INTO aclaraciones (
            "PROCESADOR", "AÑO", "MES_PETICION", "EUROSKIN", 
            "ID_DEL_COMERCIO_AFILIACION", "NOMBRE_DEL_COMERCIO", 
            "ID_DE_TRANSACCION", "FECHA_VENTA", "MONTO", "NUM_DE_TARJETA", 
            "AUTORIZACION", "CLIENTE", "VENDEDORA", "SUCURSAL", 
            "FECHA_CONTRATO", "PAQUETE", "BLOQUE", "FECHA_DE_PETICION", 
            "FECHA_DE_RESPUESTA", "COMENTARIOS", "CAPTURA_CC", "MONTO_MNX"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
            $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          )
        `, [
          valores.procesador, valores.año, valores.mes_peticion, valores.euroskin,
          valores.id_del_comercio_afiliacion, valores.nombre_del_comercio,
          valores.id_de_transaccion, valores.fecha_venta, valores.monto, valores.num_de_tarjeta,
          valores.autorizacion, valores.cliente, valores.vendedora, valores.sucursal,
          valores.fecha_contrato, valores.paquete, valores.bloque, valores.fecha_de_peticion,
          valores.fecha_de_respuesta, valores.comentarios, valores.captura_cc, valores.monto_mnx
        ]);

        registrosInsertados++;
      }

      await client.query('COMMIT');
      res.json({ 
        success: true, 
        message: `Se insertaron ${registrosInsertados} registros correctamente`,
        registrosInsertados 
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error("Error al insertar datos masivos:", err);
    res.status(500).json({ 
      error: "Error al insertar los datos", 
      details: err.message 
    });
  }
});


app.get("/cobranza/estatus", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT "EstatusCobranza" FROM "ventas" WHERE "EstatusCobranza" IS NOT NULL ORDER BY "EstatusCobranza"`
    );
    res.json(result.rows.map(r => r.EstatusCobranza).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estatus de cobranza" });
  }
});

app.get("/cobranza/resumen", async (req, res) => {
  const { anio, bloque, sucursal, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  let values = [];
  let idx = 1;

  if (anio) {
    where.push(`EXTRACT(YEAR FROM "FechaCompra") = $${idx++}`);
    values.push(anio);
  }
  if (bloque) {
    where.push(`"Bloque" = $${idx++}`);
    values.push(bloque);
  }
  if (sucursal) {
    where.push(`"Sucursal" = $${idx++}`);
    values.push(sucursal);
  }
  if (fecha_inicio && fecha_fin) {
    where.push(`"FechaCompra" >= $${idx++}`);
    values.push(fecha_inicio);
    where.push(`"FechaCompra" <= $${idx++}`);
    values.push(fecha_fin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT 
      "EstatusCobranza",
      COUNT(*) AS total,
      COALESCE(SUM("MontoVencido"::numeric),0) AS totalAdeudo,
      COALESCE(SUM("QPagada"::numeric),0) AS totalPagado,
      COALESCE(SUM("Anticipo"::numeric),0) AS totalAnticipo,
      COALESCE(SUM("QPagada"::numeric) + SUM("Anticipo"::numeric),0) AS totalRecuperado,
      COALESCE(SUM("CostoPaquete"::numeric),0) AS totalVentas
    FROM "ventas"
    ${whereClause}
    GROUP BY "EstatusCobranza"
    ORDER BY "EstatusCobranza";
  `;

  try {
    const result = await pool.query(query, values);

    // Convierte todos los montos a MXN según el bloque
    const resumenEstatus = result.rows.map(row => {
      const bloque = row.bloque;
      const moneda = BLOQUE_PAIS_MONEDA[bloque]?.moneda || "MXN";
      const factor = TIPO_CAMBIO[moneda] || 1;
      return {
        estatus: row.EstatusCobranza,
        total: Number(row.total),
        totalAdeudo: Number(row.totaladeudo) * factor,
        totalPagado: Number(row.totalpagado) * factor,
        totalAnticipo: Number(row.totalanticipo) * factor,
        totalRecuperado: Number(row.totalrecuperado) * factor,
        totalVentas: Number(row.totalventas) * factor,
      };
    });

    res.json(resumenEstatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen de cobranza" });
  }
});

// ✅ Endpoint principal de cargos_auto (BORRA LOGS INNECESARIOS)
app.get("/cargos_auto", async (req, res) => {
  const { pagina = 1, limite = 1000, ...filtros } = req.query;
  const { query, values } = generarConsulta("cargos_auto", filtros, pagina, limite);

  // Consulta para el total
  const { query: countQuery, values: countValues } = generarConsulta("cargos_auto", filtros, 1, 1000000000);
  const countResult = await pool.query(
    countQuery.replace(/SELECT \* FROM/, "SELECT COUNT(*) AS total FROM").replace(/ORDER BY[\s\S]*/i, ""),
    countValues
  );
  const total = Number(countResult.rows[0].total);

  try {
    const result = await pool.query(query, values);
    res.json({ datos: result.rows, total });
  } catch (error) {
    console.error(`❌ Error en cargos_auto:`, error); // <-- Mantén solo logs de error
    res.status(500).send(`Error en cargos_auto`);
  }
});

app.get(`/cargos_auto/exportar`, async (req, res) => {
  try {
    const { pagina = 1, limite = 100000, ...filtros } = req.query;
    const { query, values } = generarConsulta("cargos_auto", filtros, pagina, limite);

    // LOGS DE DEPURACIÓN
    console.log("EXPORT - Procesadores recibidos:", req.query.procesadores);
    console.log("EXPORT - Query:", query);
    console.log("EXPORT - Values:", values);

    // Headers ANTES del stream
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=cargos_auto.xlsx`
    );

    const client = await pool.connect();
    const queryStream = new QueryStream(query, values, { batchSize: 1000 });
    const stream = client.query(queryStream);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const worksheet = workbook.addWorksheet("cargos_auto");

    let columnsSet = false;

    stream.on("data", (row) => {
      if (!columnsSet) {
        worksheet.columns = Object.keys(row).map((key) => ({
          header: key,
          key,
        }));
        columnsSet = true;
      }
      
      // Convierte números
      if (row.Total !== undefined && row.Total !== null) row.Total = Number(row.Total);
      if (row.TotalMxn !== undefined && row.TotalMxn !== null) row.TotalMxn = Number(row.TotalMxn);
      
      worksheet.addRow(row).commit();
    });

    stream.on("end", async () => {
      await worksheet.commit();
      await workbook.commit();
      client.release();
    });

    stream.on("error", (err) => {
      console.error("Error en stream de exportación:", err);
      client.release();
    });

  } catch (error) {
    console.error(`❌ Error al exportar cargos_auto:`, error);
    if (!res.headersSent) {
      res.status(500).send("Error al exportar datos");
    }
  }
});

// ===================  INICIO DEL SERVIDOR ===================

app.listen(PORT, () => {
  console.log(`✅ Servidor ejecutándose en http://192.168.1.111:${PORT}`);
});


