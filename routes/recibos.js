const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const pdf2pic = require('pdf2pic');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Configuración de multer para manejo de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/recibos/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Función para preprocesar imagen
async function preprocesarImagen(rutaArchivo) {
  try {
    const rutaProcesada = rutaArchivo.replace(/\.[^/.]+$/, "_procesada.png");
    
    await sharp(rutaArchivo)
      .greyscale()
      .normalize()
      .sharpen()
      .resize({ width: 2048, withoutEnlargement: true })
      .png()
      .toFile(rutaProcesada);
    
    return rutaProcesada;
  } catch (error) {
    console.error('Error al preprocesar imagen:', error);
    return rutaArchivo; // Usar archivo original si falla el preprocesamiento
  }
}

// Función para convertir PDF a imagen
async function convertirPDFaImagen(rutaPDF) {
  try {
    const convert = pdf2pic.fromPath(rutaPDF, {
      density: 300,
      saveFilename: "recibo",
      savePath: path.dirname(rutaPDF),
      format: "png",
      width: 2048,
      height: 2896
    });

    const resultado = await convert(1, false); // Solo primera página
    return resultado.path;
  } catch (error) {
    console.error('Error al convertir PDF:', error);
    throw error;
  }
}

// Función para preprocesar imagen y mejorar OCR
async function preprocesarImagen(rutaOriginal) {
  try {
    const rutaProcesada = rutaOriginal.replace(/\.[^/.]+$/, '_processed.png');
    
    await sharp(rutaOriginal)
      .resize(null, 1200, { 
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3 
      })
      .greyscale()
      .normalize()
      .sharpen({ sigma: 1, m1: 0.5, m2: 3 })
      .threshold(128)
      .png({ quality: 100 })
      .toFile(rutaProcesada);
    
    console.log('🖼️ Imagen preprocesada guardada en:', rutaProcesada);
    return rutaProcesada;
  } catch (error) {
    console.error('❌ Error al preprocesar imagen:', error);
    return rutaOriginal; // Si falla, usar la original
  }
}

// Función principal de OCR
async function extraerTextoConOCR(rutaImagen) {
  try {
    console.log('🔍 Iniciando OCR para:', rutaImagen);
    
    // Preprocesar imagen para mejorar OCR
    const rutaProcesada = await preprocesarImagen(rutaImagen);
    
    const { data: { text, confidence } } = await Tesseract.recognize(
      rutaProcesada,
      'spa',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        // Configuraciones mejoradas para mejor precisión
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ .,/:$-',
        preserve_interword_spaces: '1'
      }
    );

    // Limpiar archivo procesado si es diferente del original
    if (rutaProcesada !== rutaImagen) {
      try {
        await fs.unlink(rutaProcesada);
        console.log('🗑️ Archivo procesado temporal eliminado');
      } catch (cleanupError) {
        console.warn('⚠️ No se pudo eliminar archivo temporal:', cleanupError.message);
      }
    }

    console.log('✅ OCR completado. Confianza:', confidence);
    return { texto: text, confianza: Math.round(confidence) };
  } catch (error) {
    console.error('Error en OCR:', error);
    throw error;
  }
}

// Función para extraer datos específicos del recibo de Europiel
function extraerDatosEuropiel(texto) {
  console.log('📄 Texto extraído:', texto);
  
  const datos = {
    folio: null,
    fecha: null,
    cliente: null,
    monto: null,
    concepto: null,
    sucursal: null,
    empresa: 'EUROPIEL'
  };

  try {
    // Extraer folio (CI1-1607, etc.)
    const folioMatch = texto.match(/(?:Folio[:\s]*|CI\d+-\d+)([A-Z0-9]+-[0-9]+)/i);
    if (folioMatch) {
      datos.folio = folioMatch[1] || folioMatch[0];
    }

    // Extraer fecha (19/08/2025 17:23:01)
    const fechaMatch = texto.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (fechaMatch) {
      const [dia, mes, año] = fechaMatch[1].split('/');
      datos.fecha = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // Extraer cliente (después de "Recibí de")
    const clienteMatch = texto.match(/Recib[íi]\s+de\s+([A-ZÁÉÍÓÚÑ\s]+)/i);
    if (clienteMatch) {
      datos.cliente = clienteMatch[1].trim();
    }

    // Extraer monto ($3,000.00 o 3000.00)
    const montoMatch = texto.match(/\$?\s*([0-9,]+\.?[0-9]*)/);
    if (montoMatch) {
      const montoStr = montoMatch[1].replace(/,/g, '');
      datos.monto = parseFloat(montoStr);
    }

    // Extraer concepto (después de "por concepto de")
    const conceptoMatch = texto.match(/por\s+concepto\s+de\s+([A-ZÁÉÍÓÚÑ\s]+)/i);
    if (conceptoMatch) {
      datos.concepto = conceptoMatch[1].trim();
    }

    // Extraer sucursal (Plaza Citadel, etc.)
    const sucursalMatches = [
      /Plaza\s+([A-ZÁÉÍÓÚÑ\s]+)/i,
      /Centro\s+([A-ZÁÉÍÓÚÑ\s]+)/i,
      /Sucursal\s+([A-ZÁÉÍÓÚÑ\s]+)/i
    ];
    
    for (const pattern of sucursalMatches) {
      const match = texto.match(pattern);
      if (match) {
        datos.sucursal = `Plaza ${match[1].trim()}`;
        break;
      }
    }

    console.log('📊 Datos extraídos:', datos);
    return datos;
    
  } catch (error) {
    console.error('Error al extraer datos:', error);
    return datos; // Retornar datos parciales
  }
}

// Endpoint principal para procesar recibos
router.post('/procesar-recibo', upload.single('archivo'), async (req, res) => {
  let rutaArchivo = null;
  let rutaProcesada = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    rutaArchivo = req.file.path;
    console.log('📁 Archivo recibido:', rutaArchivo);

    let rutaImagen = rutaArchivo;

    // Si es PDF, convertir a imagen
    if (req.file.mimetype === 'application/pdf') {
      console.log('📄 Convirtiendo PDF a imagen...');
      rutaImagen = await convertirPDFaImagen(rutaArchivo);
    }

    // Preprocesar imagen para mejor OCR
    rutaProcesada = await preprocesarImagen(rutaImagen);

    // Extraer texto con OCR
    const { texto, confianza } = await extraerTextoConOCR(rutaProcesada);

    // Extraer datos específicos
    const datosExtraidos = extraerDatosEuropiel(texto);
    datosExtraidos.confianza = confianza;
    datosExtraidos.texto_completo = texto;

    // Limpiar archivos temporales
    try {
      await fs.unlink(rutaArchivo);
      if (rutaProcesada !== rutaArchivo) {
        await fs.unlink(rutaProcesada);
      }
      if (rutaImagen !== rutaArchivo && rutaImagen !== rutaProcesada) {
        await fs.unlink(rutaImagen);
      }
    } catch (cleanupError) {
      console.warn('Error al limpiar archivos temporales:', cleanupError);
    }

    res.json(datosExtraidos);

  } catch (error) {
    console.error('Error al procesar recibo:', error);
    
    // Limpiar archivos en caso de error
    try {
      if (rutaArchivo) await fs.unlink(rutaArchivo);
      if (rutaProcesada && rutaProcesada !== rutaArchivo) {
        await fs.unlink(rutaProcesada);
      }
    } catch (cleanupError) {
      console.warn('Error al limpiar archivos:', cleanupError);
    }

    res.status(500).json({ 
      error: 'Error al procesar el recibo',
      detalle: error.message 
    });
  }
});

// Endpoint para guardar recibo en base de datos
router.post('/guardar-recibo', async (req, res) => {
  try {
    const { folio, fecha, cliente, monto, concepto, sucursal, confianza } = req.body;

    if (!folio || !monto || !cliente) {
      return res.status(400).json({ 
        error: 'Datos incompletos. Se requiere al menos folio, monto y cliente.' 
      });
    }

    // Insertar en base de datos
    const query = `
      INSERT INTO recibos_europiel (
        folio, fecha, cliente, monto, concepto, sucursal, confianza_ocr, fecha_procesamiento
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const valores = [folio, fecha, cliente, monto, concepto, sucursal, confianza];
    const resultado = await pool.query(query, valores);

    console.log('✅ Recibo guardado:', resultado.rows[0]);

    res.json({
      exito: true,
      mensaje: 'Recibo guardado exitosamente',
      id: resultado.rows[0].id,
      datos: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al guardar recibo:', error);
    res.status(500).json({ 
      error: 'Error al guardar en base de datos',
      detalle: error.message 
    });
  }
});

// Endpoint para obtener historial de recibos
router.get('/historial-recibos', async (req, res) => {
  try {
    const { page = 1, limit = 50, cliente, fecha_inicio, fecha_fin } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM recibos_europiel WHERE 1=1';
    let valores = [];
    let valorIndex = 1;

    if (cliente) {
      query += ` AND cliente ILIKE $${valorIndex}`;
      valores.push(`%${cliente}%`);
      valorIndex++;
    }

    if (fecha_inicio) {
      query += ` AND fecha >= $${valorIndex}`;
      valores.push(fecha_inicio);
      valorIndex++;
    }

    if (fecha_fin) {
      query += ` AND fecha <= $${valorIndex}`;
      valores.push(fecha_fin);
      valorIndex++;
    }

    query += ` ORDER BY fecha_procesamiento DESC LIMIT $${valorIndex} OFFSET $${valorIndex + 1}`;
    valores.push(limit, offset);

    const resultado = await pool.query(query, valores);

    // Obtener total de registros
    const queryTotal = query.replace(/ORDER BY.*/, '').replace(/LIMIT.*/, '');
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM (${queryTotal}) as subquery`,
      valores.slice(0, -2)
    );

    res.json({
      recibos: resultado.rows,
      total: parseInt(totalResult.rows[0].total),
      pagina: parseInt(page),
      limite: parseInt(limit)
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ 
      error: 'Error al obtener historial de recibos',
      detalle: error.message 
    });
  }
});

module.exports = router;
