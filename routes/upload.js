import express from "express";
import { pool, protegerDatos } from "../config/database.js";
import { upload, progresoCarga, mapearColumnas, formatearDatos } from "../config/utils.js";
import ExcelJS from "exceljs";
import fs from "fs";

const router = express.Router();

// 📊 Endpoint para obtener progreso de carga
router.get("/progreso", (req, res) => {
  res.json(progresoCarga);
});

// 📁 Endpoint para subir archivos
router.post("/upload/:tabla", upload.single("archivo"), async (req, res) => {
  const { tabla } = req.params;
  const archivo = req.file;

  if (!archivo) {
    return res.status(400).json({ 
      error: "No se subió ningún archivo",
      detalles: "El campo 'archivo' es requerido" 
    });
  }

  // Inicializar estado de progreso
  progresoCarga = {
    enProgreso: true,
    porcentaje: 0,
    tabla: tabla,
    mensaje: "Iniciando procesamiento...",
    filasProcesadas: 0,
    totalFilas: 0,
    errores: []
  };

  try {
    console.log(`📁 Procesando archivo: ${archivo.originalname} para tabla: ${tabla}`);
    
    // Leer archivo Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(archivo.path);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new Error("No se encontró la primera hoja en el archivo Excel");
    }

    // Obtener encabezados
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers.push(cell.value?.toString().trim() || `col_${colNumber}`);
    });

    console.log("📋 Encabezados encontrados:", headers);

    // Mapear columnas según la tabla
    const columnasDB = mapearColumnas(tabla, headers);
    console.log("🔄 Columnas mapeadas:", columnasDB);

    // Procesar filas
    const filas = [];
    let totalFilas = worksheet.rowCount - 1; // Excluir encabezado
    
    progresoCarga.totalFilas = totalFilas;
    progresoCarga.mensaje = "Leyendo filas del archivo...";

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const filaData = {};

      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        const valor = cell.value;
        const columnaDB = columnasDB[index];
        
        // Formatear y validar datos
        filaData[columnaDB] = formatearDatos(tabla, columnaDB, valor);
      });

      filas.push(filaData);
      
      // Actualizar progreso cada 100 filas
      if (rowNumber % 100 === 0) {
        progresoCarga.filasProcesadas = rowNumber - 1;
        progresoCarga.porcentaje = Math.round(((rowNumber - 1) / totalFilas) * 50); // 50% para lectura
        progresoCarga.mensaje = `Leyendo fila ${rowNumber - 1} de ${totalFilas}`;
      }
    }

    console.log(`📊 Total de filas leídas: ${filas.length}`);

    // Insertar en base de datos
    progresoCarga.mensaje = "Insertando datos en base de datos...";
    
    // Crear query de inserción dinámico
    const columnasValidas = columnasDB.filter(col => col && col.trim());
    const placeholders = columnasValidas.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      INSERT INTO "${tabla}" (${columnasValidas.map(col => `"${col}"`).join(', ')})
      VALUES (${placeholders})
    `;

    console.log("🔍 Query de inserción:", query);

    let insertadas = 0;
    let errores = 0;

    for (const [index, fila] of filas.entries()) {
      try {
        const valores = columnasValidas.map(col => fila[col]);
        await pool.query(query, valores);
        insertadas++;
        
        // Actualizar progreso cada 50 filas
        if (index % 50 === 0) {
          progresoCarga.filasProcesadas = index + 1;
          progresoCarga.porcentaje = 50 + Math.round(((index + 1) / filas.length) * 50); // 50% + inserción
          progresoCarga.mensaje = `Insertando fila ${index + 1} de ${filas.length}`;
        }
      } catch (error) {
        errores++;
        progresoCarga.errores.push({
          fila: index + 2, // +2 porque empezamos en fila 2 del Excel
          error: error.message,
          datos: fila
        });
        
        if (errores > 100) { // Limitar errores para no saturar memoria
          progresoCarga.errores.push({
            fila: 'LIMITE',
            error: 'Se alcanzó el límite de 100 errores. Revisar datos.',
            datos: null
          });
          break;
        }
      }
    }

    // Finalizar progreso
    progresoCarga.enProgreso = false;
    progresoCarga.porcentaje = 100;
    progresoCarga.mensaje = `Completado: ${insertadas} filas insertadas, ${errores} errores`;

    console.log(`✅ Procesamiento completado: ${insertadas} insertadas, ${errores} errores`);

    // Limpiar archivo temporal
    fs.unlinkSync(archivo.path);

    res.json({
      success: true,
      message: "Archivo procesado exitosamente",
      estadisticas: {
        totalFilas: filas.length,
        insertadas: insertadas,
        errores: errores,
        tabla: tabla
      },
      erroresDetalle: progresoCarga.errores.slice(0, 10) // Solo primeros 10 errores
    });

  } catch (error) {
    progresoCarga.enProgreso = false;
    progresoCarga.mensaje = `Error: ${error.message}`;
    
    console.error("❌ Error procesando archivo:", error);
    
    // Limpiar archivo temporal
    if (archivo && archivo.path && fs.existsSync(archivo.path)) {
      fs.unlinkSync(archivo.path);
    }

    res.status(500).json({
      error: "Error procesando archivo",
      detalles: error.message,
      tabla: tabla
    });
  }
});

// 🗑️ Endpoint para eliminar todos los datos de una tabla
router.delete("/delete-all/:tabla", protegerDatos, async (req, res) => {
  const { tabla } = req.params;
  
  try {
    console.log(`🗑️ Eliminando todos los datos de la tabla: ${tabla}`);
    
    const result = await pool.query(`DELETE FROM "${tabla}"`);
    
    console.log(`✅ Eliminados ${result.rowCount} registros de ${tabla}`);
    
    res.json({
      success: true,
      message: `Se eliminaron ${result.rowCount} registros de la tabla ${tabla}`,
      registrosEliminados: result.rowCount
    });
    
  } catch (error) {
    console.error(`❌ Error eliminando datos de ${tabla}:`, error);
    res.status(500).json({
      error: "Error al eliminar datos",
      detalles: error.message,
      tabla: tabla
    });
  }
});

// 🗑️ Endpoint para eliminar datos de julio y agosto
router.delete("/delete-julio-agosto/:tabla", protegerDatos, async (req, res) => {
  const { tabla } = req.params;
  
  try {
    console.log(`🗑️ Eliminando datos de julio y agosto de la tabla: ${tabla}`);
    
    // Query para eliminar registros de julio y agosto 2024
    const query = `
      DELETE FROM "${tabla}" 
      WHERE (
        EXTRACT(MONTH FROM fecha_venta) IN (7, 8) 
        AND EXTRACT(YEAR FROM fecha_venta) = 2024
      ) OR (
        mes_peticion ILIKE '%JULIO%' 
        OR mes_peticion ILIKE '%AGOSTO%'
        OR mes_peticion ILIKE '%JUL%'
        OR mes_peticion ILIKE '%AGO%'
      )
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Eliminados ${result.rowCount} registros de julio-agosto de ${tabla}`);
    
    res.json({
      success: true,
      message: `Se eliminaron ${result.rowCount} registros de julio-agosto de la tabla ${tabla}`,
      registrosEliminados: result.rowCount,
      criterio: "Registros de julio y agosto 2024"
    });
    
  } catch (error) {
    console.error(`❌ Error eliminando datos de julio-agosto de ${tabla}:`, error);
    res.status(500).json({
      error: "Error al eliminar datos de julio-agosto",
      detalles: error.message,
      tabla: tabla
    });
  }
});

export default router;
