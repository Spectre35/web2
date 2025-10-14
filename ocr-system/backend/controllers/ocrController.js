import ocrService from '../services/ocrService.js';
import databaseService from '../services/databaseService.js';
import { pool } from '../../../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// ================= 📤 CONTROLADOR DE OCR =================

// Variable global para el BatchProcessor
let globalBatchProcessor = null;

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, BMP, TIFF, PDF)'));
    }
  }
});

// Configuración para múltiples archivos
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB por archivo
    files: 200 // Máximo 200 archivos por lote
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, BMP, TIFF, PDF)'));
    }
  }
});

class OCRController {
  constructor() {
    console.log('🔧 Inicializando OCRController...');
    try {
      // Importar BatchProcessor dinámicamente para evitar problemas de dependencias circulares
      import('../services/batchProcessor.js').then(module => {
        this.batchProcessor = new module.default();
        console.log('✅ BatchProcessor inicializado correctamente');
      }).catch(error => {
        console.error('❌ Error inicializando BatchProcessor:', error);
        this.batchProcessor = null;
      });
    } catch (error) {
      console.error('❌ Error inicializando OCRController:', error);
      this.batchProcessor = null;
    }
  }

  /**
   * 📦 NUEVO: Procesar múltiples documentos en lote
   * POST /api/ocr/batch-upload
   */
  async batchUploadAndProcess(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No se han subido archivos'
        });
      }

      const { language, userId, sucursal, bloque, caja, forceInsert } = req.body;
      const files = req.files;

      console.log(`📦 PROCESAMIENTO EN LOTE: ${files.length} documentos`);

      // ✅ Validación obligatoria: sucursal y bloque son requeridos
      if (!sucursal || !bloque) {
        return res.status(400).json({
          success: false,
          error: 'Sucursal y bloque son obligatorios para procesar documentos',
          details: {
            sucursal: sucursal || 'no proporcionada',
            bloque: bloque || 'no proporcionado'
          }
        });
      }

      // Configuración manual para aplicar a todos los documentos
      const manualConfig = {
        sucursal,
        bloque,
        caja: caja || 10,
        forceInsert: forceInsert === 'true' || forceInsert === true
      };

      console.log('⚙️ Configuración manual aplicada:', manualConfig);

      // Usar el worker pool global que ya está inicializado
      const { getWorkerPool } = await import('../services/workerPool.js');
      const workerPool = getWorkerPool();

      if (!workerPool.isInitialized) {
        return res.status(503).json({
          success: false,
          error: 'Sistema OCR no está listo. Intente nuevamente en unos segundos.'
        });
      }

      // Inicializar el procesador en lote si no existe
      if (!globalBatchProcessor) {
        const BatchProcessorModule = await import('../services/batchProcessor.js');
        globalBatchProcessor = new BatchProcessorModule.default();
      }

      // Procesar archivos en lote
      const result = await globalBatchProcessor.processBatch(files, {
        language: language || 'spa+eng',
        userId: userId || 'anonymous',
        manualConfig: manualConfig
      });

      if (result.success && result.results.length > 0) {
        res.json({
          success: true,
          totalFiles: files.length,
          totalProcessed: result.results.length,
          data: result.results,
          summary: {
            totalFiles: files.length,
            successful: result.results.filter(r => r.success).length,
            failed: result.results.filter(r => !r.success).length,
            totalProcessingTime: result.totalTime,
            manualConfiguration: manualConfig
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Error en procesamiento en lote: ' + (result.error || 'Error desconocido'),
          details: result.details || {}
        });
      }

    } catch (error) {
      console.error('❌ Error en batchUploadAndProcess:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor: ' + error.message
      });
    }
  }
  /**
   * Subir y procesar documento
   * POST /api/ocr/upload
   */
  async uploadAndProcess(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se ha subido ningún archivo'
        });
      }

      const { documentType, language, userId, sucursal, bloque, caja, forceInsert } = req.body;

      console.log(`📤 Procesando archivo: ${req.file.originalname}`);

      // ✅ Validación obligatoria: sucursal y bloque son requeridos
      if (!sucursal || !bloque) {
        return res.status(400).json({
          success: false,
          error: 'Sucursal y bloque son obligatorios para procesar documentos',
          details: {
            sucursal: sucursal || 'no proporcionada',
            bloque: bloque || 'no proporcionado'
          }
        });
      }

      // Configuración manual para aplicar a todos los recibos
      const manualConfig = {
        sucursal,
        bloque,
        caja: caja || 10,
        forceInsert: forceInsert === 'true' || forceInsert === true
      };

      console.log('⚙️ Configuración manual aplicada (upload individual):', manualConfig);
      console.log(`🔥 Force Insert habilitado: ${manualConfig.forceInsert ? 'SÍ' : 'NO'}`);

      // Usar el BatchProcessor para detectar múltiples recibos automáticamente
      // Inicializar el procesador en lote si no existe
      if (!globalBatchProcessor) {
        const BatchProcessorModule = await import('../services/batchProcessor.js');
        globalBatchProcessor = new BatchProcessorModule.default();
      }

      // Procesar el archivo (puede contener múltiples recibos)
      const result = await globalBatchProcessor.processBatch([req.file], {
        language: language || 'spa+eng',
        userId: userId || 'anonymous',
        manualConfig: manualConfig
      });

      if (result.success && result.results.length > 0) {
        // 🆕 MANEJO DE MÚLTIPLES RECIBOS DETECTADOS AUTOMÁTICAMENTE
        if (result.results.length > 1) {
          console.log(`🎯 Se detectaron ${result.results.length} recibos en la imagen`);

          // Procesar todos los recibos
          const allResults = [];
          const allInsertions = [];

          for (let i = 0; i < result.results.length; i++) {
            const docResult = result.results[i];

            if (docResult.success) {
              // Insertar automáticamente cada recibo si es válido
              let insertionResult = null;
              if (docResult.classification &&
                  docResult.classification.extractedFields &&
                  docResult.classification.extractedFields.tipo) {

                // Para recibos, intentar insertar incluso si no hay cliente (usar datos básicos)
                const fields = docResult.classification.extractedFields;

                // 🔍 DEPURACIÓN: Mostrar TODOS los campos extraídos antes de validación
                console.log(`🔍 CAMPOS EXTRAÍDOS COMPLETOS para recibo ${i + 1}:`, {
                  ...fields,
                  hasCliente: !!fields.cliente,
                  clienteValue: fields.cliente,
                  clienteType: typeof fields.cliente,
                  clienteLength: fields.cliente ? fields.cliente.length : 0
                });

                // ⚙️ Combinar datos extraídos con configuración manual
                if (manualConfig) {
                  if (manualConfig.sucursal) fields.sucursal = manualConfig.sucursal;
                  if (manualConfig.bloque) fields.bloque = manualConfig.bloque;
                  if (manualConfig.caja) fields.caja = manualConfig.caja;
                  console.log(`⚙️ Datos combinados con configuración manual para recibo ${i + 1}:`, {
                    sucursal: fields.sucursal,
                    bloque: fields.bloque,
                    caja: fields.caja,
                    t_pago: fields.t_pago, // Tipo de pago extraído automáticamente del OCR
                    cliente: fields.cliente // Agregando cliente al log
                  });
                }

                // ✅ VALIDACIÓN OBLIGATORIA: sucursal y bloque son requeridos
                if (!fields.sucursal || !fields.bloque) {
                  console.log(`❌ Recibo ${i + 1} no insertado: falta sucursal (${fields.sucursal}) o bloque (${fields.bloque})`);
                  insertionResult = {
                    success: false,
                    message: `Sucursal y bloque son obligatorios. Sucursal: ${fields.sucursal || 'no definida'}, Bloque: ${fields.bloque || 'no definido'}`
                  };
                } else {
                  // ✅ VALIDACIÓN DETALLADA DEL CLIENTE
                  if (!fields.cliente && fields.tipo === 'recibo') {
                    console.log(`❌ Recibo ${i + 1} no insertado: no se pudo extraer el nombre del cliente.`);
                    console.log(`🔍 Análisis del campo cliente:`, {
                      exists: 'cliente' in fields,
                      value: fields.cliente,
                      type: typeof fields.cliente,
                      isEmpty: fields.cliente === '',
                      isNull: fields.cliente === null,
                      isUndefined: fields.cliente === undefined,
                      allFields: Object.keys(fields)
                    });
                    insertionResult = {
                      success: false,
                      message: `No se pudo extraer el nombre del cliente del recibo. Verifique la calidad de la imagen y que el texto esté legible.`
                    };
                  } else if (fields.cliente && fields.cliente.trim() === '' && fields.tipo === 'recibo') {
                    console.log(`❌ Recibo ${i + 1} no insertado: el nombre del cliente está vacío.`);
                    insertionResult = {
                      success: false,
                      message: `El nombre del cliente está vacío. Verifique la calidad de la imagen.`
                    };
                  } else {

                    console.log(`🗄️ Datos extraídos (recibo ${i + 1}) - INSERTANDO:`, fields);
                    // ✅ HABILITADO para inserción automática
                    insertionResult = await databaseService.procesarDatosExtraidos(
                      fields,
                      manualConfig.forceInsert || false
                    );
                  }

                  if (insertionResult.success) {
                    console.log(`✅ Recibo ${i + 1} insertado automáticamente en papeleria:`, insertionResult.data);
                  } else {
                    console.log(`⚠️ No se pudo insertar el recibo ${i + 1} automáticamente:`, insertionResult.message);
                  }
                }
              }


              // Solo agregar si hay texto extraído válido
              if (docResult.extractedText && docResult.extractedText.trim().length > 0) {
                allResults.push({
                  receiptNumber: i + 1,
                  documentId: docResult.metadata?.documentId,
                  originalText: docResult.extractedText,
                  correctedText: docResult.extractedText,
                  confidence: docResult.confidence,
                  processingTime: docResult.processingTime,
                  boundingBoxes: docResult.boundingBoxes,
                  filename: docResult.metadata?.filename || `${req.file.originalname}_parte_${i + 1}`,
                  isSegmented: docResult.metadata?.isSegmented || false,
                  segmentIndex: docResult.metadata?.segmentIndex || (i + 1),
                  classification: {
                    tipo: docResult.classification?.type,
                    confianza: docResult.classification?.confidence,
                    datosExtraidos: docResult.classification?.extractedFields || {},
                    razones: docResult.classification?.details ? [
                      ...docResult.classification.details.foundKeywords?.map(k => `Palabra clave encontrada: ${k}`) || [],
                      ...docResult.classification.details.foundStrongIndicators?.map(k => `Indicador fuerte: ${k}`) || [],
                      ...docResult.classification.details.structureMatches?.map(k => `Estructura detectada: ${k}`) || []
                    ] : [],
                    timestamp: new Date().toISOString()
                  },
                  databaseInsertion: insertionResult
                });
              }

              if (insertionResult) {
                allInsertions.push(insertionResult);
              }
            }
          }

          // Respuesta para múltiples recibos
          res.json({
            success: true,
            multipleReceipts: true,
            totalReceipts: result.results.length,
            originalFilename: req.file.originalname,
            data: allResults,
            summary: {
              totalProcessed: allResults.length,
              successfulInsertions: allInsertions.filter(r => r.success).length,
              failedInsertions: allInsertions.filter(r => !r.success).length,
              totalProcessingTime: result.totalTime,
              averageConfidence: allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length
            }
          });

        } else {
          // Procesamiento de un solo recibo (lógica original)
          const docResult = result.results[0];

          console.log('🔍 DEPURACIÓN docResult:', {
            success: docResult.success,
            extractedText: docResult.extractedText ? `${docResult.extractedText.length} caracteres` : 'VACÍO/NULL',
            extractedTextPreview: docResult.extractedText ? docResult.extractedText.substring(0, 100) : 'SIN TEXTO',
            confidence: docResult.confidence,
            hasClassification: !!docResult.classification,
            classificationType: docResult.classification?.type,
            extractedFields: docResult.classification?.extractedFields ? Object.keys(docResult.classification.extractedFields) : 'sin campos'
          });

          if (docResult.success) {
            // 6. Insertar automáticamente en la base de datos si tenemos datos válidos
            let insertionResult = null;
            if (docResult.classification &&
                docResult.classification.extractedFields &&
                docResult.classification.extractedFields.tipo) {

              const fields = docResult.classification.extractedFields;

              // ⚙️ Combinar datos extraídos con configuración manual (para un solo recibo)
              if (manualConfig) {
                if (manualConfig.sucursal) fields.sucursal = manualConfig.sucursal;
                if (manualConfig.bloque) fields.bloque = manualConfig.bloque;
                if (manualConfig.caja) fields.caja = manualConfig.caja;
                console.log('⚙️ Datos combinados con configuración manual (recibo único):', {
                  sucursal: fields.sucursal,
                  bloque: fields.bloque,
                  caja: fields.caja,
                  t_pago: fields.t_pago
                });
              }

              // ✅ VALIDACIÓN OBLIGATORIA: sucursal y bloque son requeridos (recibo único)
              if (!fields.sucursal || !fields.bloque) {
                console.log(`❌ Recibo no insertado: falta sucursal (${fields.sucursal}) o bloque (${fields.bloque})`);
                insertionResult = {
                  success: false,
                  message: `Sucursal y bloque son obligatorios. Sucursal: ${fields.sucursal || 'no definida'}, Bloque: ${fields.bloque || 'no definido'}`
                };
              } else {
                console.log(`� Datos extraídos (recibo único) - INSERTANDO:`, fields);
                // ✅ HABILITADO - Inserción automática de datos
                insertionResult = await databaseService.procesarDatosExtraidos(
                  fields,
                  manualConfig.forceInsert || false
                );
                // insertionResult = { success: false, message: 'Auto-inserción deshabilitada' };

                if (insertionResult.success) {
                  console.log('✅ Datos insertados automáticamente en papeleria:', insertionResult.data);
                } else {
                  console.log('⚠️ No se pudieron insertar los datos automáticamente:', insertionResult.message);
                }
              }
            }

            // Responder con resultados mejorados
            res.json({
              success: true,
              multipleReceipts: false,
              data: {
                documentId: docResult.metadata?.documentId,
                originalText: docResult.extractedText || '',
                correctedText: docResult.extractedText || '',
                confidence: docResult.confidence || 0,
                processingTime: docResult.processingTime,
                boundingBoxes: docResult.boundingBoxes,
                filename: req.file.originalname,
                // ✨ Información adicional para debugging
                hasText: !!(docResult.extractedText && docResult.extractedText.trim()),
                textLength: docResult.extractedText ? docResult.extractedText.length : 0,
                // ✨ Clasificación automática del documento
                classification: {
                  tipo: docResult.classification?.type,
                  confianza: docResult.classification?.confidence,
                  datosExtraidos: docResult.classification?.extractedFields || {},
                  razones: docResult.classification?.details ? [
                    ...docResult.classification.details.foundKeywords?.map(k => `Palabra clave encontrada: ${k}`) || [],
                    ...docResult.classification.details.foundStrongIndicators?.map(k => `Indicador fuerte: ${k}`) || [],
                    ...docResult.classification.details.structureMatches?.map(k => `Estructura detectada: ${k}`) || []
                  ] : [],
                  timestamp: new Date().toISOString()
                },
                // ✨ Resultado de inserción automática
                databaseInsertion: insertionResult
              }
            });
          } else {
            res.status(500).json({
              success: false,
              error: 'Error procesando documento: ' + docResult.error
            });
          }
        }
      } else {
        res.status(500).json({
          success: false,
          error: 'Error en procesamiento: ' + (result.error || 'Error desconocido')
        });
      }

    } catch (error) {
      console.error('❌ Error en uploadAndProcess:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor: ' + error.message
      });
    }
  }

  /**
   * Procesar feedback del usuario
   * POST /api/ocr/feedback
   */
  async processFeedback(req, res) {
    try {
      const { resultId, originalText, correctedText, correctionType } = req.body;

      console.log('📥 Datos recibidos en processFeedback:');
      console.log('   resultId:', resultId);
      console.log('   originalText:', originalText ? originalText.substring(0, 100) + '...' : 'undefined');
      console.log('   correctedText:', correctedText ? correctedText.substring(0, 100) + '...' : 'undefined');
      console.log('   correctionType:', correctionType);

      if (!originalText || !correctedText) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: originalText, correctedText'
        });
      }

      console.log(`🎓 Procesando feedback para resultado ${resultId || 'manual'}`);

      const feedbackResult = await ocrService.processFeedback(
        resultId || null,
        originalText,
        correctedText,
        correctionType || 'manual'
      );

      if (!feedbackResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Error procesando feedback: ' + feedbackResult.error
        });
      }

      // Actualizar métricas (temporalmente deshabilitado)
      // await this.updateMetrics(resultId, originalText, correctedText);

      res.json({
        success: true,
        message: 'Feedback procesado correctamente',
        trainingId: feedbackResult.trainingId
      });

    } catch (error) {
      console.error('❌ Error en processFeedback:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor: ' + error.message
      });
    }
  }

  /**
   * Obtener historial de documentos
   * GET /api/ocr/documents
   */
  async getDocuments(req, res) {
    try {
      const { page = 1, limit = 20, status, userId, documentType } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (status) {
        whereConditions.push(`d.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (userId) {
        whereConditions.push(`d.user_id = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      if (documentType) {
        whereConditions.push(`d.document_type = $${paramIndex}`);
        queryParams.push(documentType);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const query = `
        SELECT
          d.id,
          d.filename,
          d.file_size,
          d.status,
          d.document_type,
          d.upload_date,
          d.processed_date,
          r.confidence_score,
          r.processing_time_ms,
          CASE
            WHEN r.corrected_text IS NOT NULL
            THEN LENGTH(r.corrected_text)
            ELSE 0
          END as text_length
        FROM ocr_documents d
        LEFT JOIN ocr_results r ON d.id = r.document_id
        ${whereClause}
        ORDER BY d.upload_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await pool.query(query, queryParams);

      // Contar total de documentos
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ocr_documents d
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: {
          documents: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en getDocuments:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo documentos: ' + error.message
      });
    }
  }

  /**
   * Obtener detalle de un documento
   * GET /api/ocr/documents/:id
   */
  async getDocumentDetail(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT
          d.*,
          r.raw_text,
          r.corrected_text,
          r.confidence_score,
          r.processing_time_ms,
          r.bounding_boxes,
          r.id as result_id
        FROM ocr_documents d
        LEFT JOIN ocr_results r ON d.id = r.document_id
        WHERE d.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Documento no encontrado'
        });
      }

      // Obtener correcciones aplicadas
      const correctionsQuery = `
        SELECT original_text, corrected_text, correction_type, created_at
        FROM ocr_training_data
        WHERE result_id = $1
        ORDER BY created_at DESC
      `;

      const corrections = await pool.query(correctionsQuery, [result.rows[0].result_id]);

      res.json({
        success: true,
        data: {
          document: result.rows[0],
          corrections: corrections.rows
        }
      });

    } catch (error) {
      console.error('❌ Error en getDocumentDetail:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo detalle: ' + error.message
      });
    }
  }

  /**
   * Obtener estadísticas del sistema
   * GET /api/ocr/stats
   */
  async getStats(req, res) {
    try {
      const { period = '7d', userId } = req.query;

      let dateCondition = '';
      switch (period) {
        case '1d':
          dateCondition = "AND upload_date >= CURRENT_DATE";
          break;
        case '7d':
          dateCondition = "AND upload_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          dateCondition = "AND upload_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        default:
          dateCondition = "AND upload_date >= CURRENT_DATE - INTERVAL '7 days'";
      }

      const userCondition = userId ? `AND user_id = '${userId}'` : '';

      const statsQuery = `
        SELECT
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT r.id) as total_results,
          COUNT(DISTINCT t.id) as total_corrections,
          AVG(r.confidence_score) as avg_confidence,
          AVG(r.processing_time_ms) as avg_processing_time,
          COUNT(CASE WHEN d.status = 'completed' THEN 1 END) as completed_documents,
          COUNT(CASE WHEN d.status = 'error' THEN 1 END) as error_documents
        FROM ocr_documents d
        LEFT JOIN ocr_results r ON d.id = r.document_id
        LEFT JOIN ocr_training_data t ON r.id = t.result_id
        WHERE 1=1 ${dateCondition} ${userCondition}
      `;

      const statsResult = await pool.query(statsQuery);

      // Estadísticas de patrones
      const patternsQuery = `
        SELECT
          COUNT(*) as total_patterns,
          AVG(accuracy_score) as avg_pattern_accuracy,
          SUM(frequency) as total_pattern_usage
        FROM ocr_patterns
        WHERE is_active = true
      `;

      const patternsResult = await pool.query(patternsQuery);

      res.json({
        success: true,
        data: {
          period,
          documents: statsResult.rows[0],
          patterns: patternsResult.rows[0]
        }
      });

    } catch (error) {
      console.error('❌ Error en getStats:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas: ' + error.message
      });
    }
  }

  /**
   * Reentrenar modelo (placeholder para futuro)
   * POST /api/ocr/retrain
   */
  async retrainModel(req, res) {
    try {
      // Por ahora solo actualizar estadísticas de patrones
      const updateQuery = `
        UPDATE ocr_patterns
        SET accuracy_score = LEAST(accuracy_score + (frequency * 0.01), 1.0)
        WHERE is_active = true AND frequency > 5
      `;

      const result = await pool.query(updateQuery);

      res.json({
        success: true,
        message: 'Modelo actualizado',
        updatedPatterns: result.rowCount
      });

    } catch (error) {
      console.error('❌ Error en retrainModel:', error);
      res.status(500).json({
        success: false,
        error: 'Error reentrenando modelo: ' + error.message
      });
    }
  }

  /**
   * Actualizar métricas del sistema
   */
  async updateMetrics(resultId, originalText, correctedText) {
    try {
      const improvement = ocrService.calculateImprovementScore(originalText, correctedText);

      const metricsQuery = `
        INSERT INTO ocr_metrics (
          date, total_corrections, accuracy_improvement
        ) VALUES (CURRENT_DATE, 1, $1)
        ON CONFLICT (date, user_id, document_type)
        DO UPDATE SET
          total_corrections = ocr_metrics.total_corrections + 1,
          accuracy_improvement = (ocr_metrics.accuracy_improvement + $1) / 2
      `;

      await pool.query(metricsQuery, [improvement]);
    } catch (error) {
      console.error('❌ Error actualizando métricas:', error);
    }
  }

  /**
   * Obtener estadísticas del clasificador de documentos
   * GET /api/ocr/classifier/stats
   */
  async getClassifierStats(req, res) {
    try {
      const stats = ocrService.getClassifierStats();

      res.json({
        success: true,
        data: {
          classifier: stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del clasificador:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Enseñar al clasificador con una clasificación manual
   * POST /api/ocr/classifier/learn
   */
  async teachClassifier(req, res) {
    try {
      const { extractedText, correctType, additionalFields } = req.body;

      if (!extractedText || !correctType) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere extractedText y correctType'
        });
      }

      const validTypes = ['contrato', 'recibo'];
      if (!validTypes.includes(correctType)) {
        return res.status(400).json({
          success: false,
          error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`
        });
      }

      const trainingData = await ocrService.learnFromManualClassification(
        extractedText,
        correctType,
        additionalFields || {}
      );

      res.json({
        success: true,
        message: 'Clasificación aprendida correctamente',
        data: {
          type: correctType,
          fieldsLearned: Object.keys(additionalFields || {}).length,
          timestamp: trainingData.timestamp
        }
      });

    } catch (error) {
      console.error('❌ Error enseñando al clasificador:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Clasificar un texto directamente
   * POST /api/ocr/classifier/classify
   */
  async classifyText(req, res) {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere el campo text'
        });
      }

      const classification = ocrService.classifier.classifyDocument(text);

      // 🔧 SEPARACIÓN AUTOMÁTICA DESHABILITADA - Solo logging
      if (classification.extractedFields && classification.extractedFields.cliente) {
        console.log(`📋 Nombre extraído (sin separación automática): "${classification.extractedFields.cliente}"`);
      }

      res.json({
        success: true,
        data: {
          classification,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error clasificando texto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Insertar datos extraídos manualmente en la base de datos
   * POST /api/ocr/database/insert
   */
  async insertExtractedData(req, res) {
    try {
      const { extractedFields, forceInsert = false } = req.body;

      if (!extractedFields || typeof extractedFields !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Se requiere el campo extractedFields como objeto'
        });
      }

      console.log('🔄 Solicitud de inserción manual:', extractedFields);

      const result = await databaseService.procesarDatosExtraidos(
        extractedFields,
        forceInsert
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || result.message,
          duplicate: result.duplicate || false
        });
      }

    } catch (error) {
      console.error('❌ Error insertando datos extraídos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener registros recientes de la base de datos
   * GET /api/ocr/database/recent
   */
  async getRecentRecords(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: 'El límite debe estar entre 1 y 100'
        });
      }

      const result = await databaseService.obtenerRegistrosRecientes(limit);

      res.json({
        success: result.success,
        data: result.data,
        count: result.data.length,
        error: result.error
      });

    } catch (error) {
      console.error('❌ Error obteniendo registros recientes:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Insertar datos extraídos en la base de datos
   * POST /api/ocr/insert-database
   */
  async insertToDatabase(req, res) {
    try {
      const { extractedFields, forceInsert = false, fileName } = req.body;

      if (!extractedFields || typeof extractedFields !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Se requieren campos extraídos válidos'
        });
      }

      console.log(`🗄️ Insertando datos extraídos en BD para archivo: ${fileName || 'desconocido'}`);

      const result = await databaseService.insertarDatosExtraidos(extractedFields, forceInsert);

      res.json({
        success: result.success,
        data: result.data,
        message: result.message,
        error: result.error
      });

    } catch (error) {
      console.error('❌ Error insertando en base de datos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener valores distinct para los selects de bloque y sucursal
   */
  async getDistinctValues(req, res) {
    try {
      console.log('🔍 Obteniendo valores distinct para selects...');

      // Obtener bloques distinct de la tabla ventas
      const bloquesResult = await pool.query(
        'SELECT DISTINCT "Bloque" FROM ventas WHERE "Bloque" IS NOT NULL ORDER BY "Bloque"'
      );

      // Obtener sucursales distinct de la tabla ventas
      const sucursalesResult = await pool.query(
        'SELECT DISTINCT "Sucursal" FROM ventas WHERE "Sucursal" IS NOT NULL ORDER BY "Sucursal"'
      );

      // Obtener relaciones bloque-sucursal para filtros dinámicos
      const relacionesResult = await pool.query(`
        SELECT DISTINCT "Bloque", "Sucursal"
        FROM ventas
        WHERE "Bloque" IS NOT NULL AND "Sucursal" IS NOT NULL
        ORDER BY "Bloque", "Sucursal"
      `);

      const bloques = bloquesResult.rows.map(row => row.Bloque);
      const sucursales = sucursalesResult.rows.map(row => row.Sucursal);
      const relaciones = relacionesResult.rows;

      // Crear mapeo de bloque a sucursales
      const bloqueSucursales = {};
      relaciones.forEach(row => {
        if (!bloqueSucursales[row.Bloque]) {
          bloqueSucursales[row.Bloque] = [];
        }
        bloqueSucursales[row.Bloque].push(row.Sucursal);
      });

      // Crear mapeo de sucursal a bloque
      const sucursalBloque = {};
      relaciones.forEach(row => {
        sucursalBloque[row.Sucursal] = row.Bloque;
      });

      console.log('✅ Valores obtenidos:', {
        bloques: bloques.length,
        sucursales: sucursales.length,
        relaciones: relaciones.length
      });

      res.json({
        success: true,
        data: {
          bloques,
          sucursales,
          cajas: [9, 10, 11, 12], // Valores fijos como especificaste
          bloqueSucursales,       // Mapeo bloque -> [sucursales]
          sucursalBloque          // Mapeo sucursal -> bloque
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo valores distinct:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  /**
   * 🎛️ CONFIGURAR MEJORAS DE PROCESAMIENTO
   * POST /api/ocr/configure-enhancements
   * Permite configurar las mejoras de procesamiento de imagen
   */
  async configureEnhancements(req, res) {
    try {
      const {
        enableContrast = true,
        enableOrientation = true,
        enableNoiseReduction = true,
        keepIntermediateFiles = false,
        fastMode = false,
        // 🆕 NUEVAS OPCIONES DE DETECCIÓN DE PALABRAS CORTADAS
        detectTruncatedWords = true,
        edgeThreshold = 50,
        confidenceThreshold = 60
      } = req.body;

      console.log('🎛️ Configurando mejoras de procesamiento...');

      // Aplicar configuración al servicio OCR
      const config = ocrService.configureImageEnhancements({
        enableContrast,
        enableOrientation,
        enableNoiseReduction,
        keepIntermediateFiles,
        fastMode,
        detectTruncatedWords,
        edgeThreshold,
        confidenceThreshold
      });

      res.json({
        success: true,
        message: 'Configuración de mejoras aplicada exitosamente',
        config: config,
        recommendations: {
          fastMode: fastMode ? 'Activado - procesamiento más rápido, menos mejoras' : 'Desactivado - procesamiento completo',
          batchProcessing: config.enableNoiseReduction ? 'Usar fastMode=true para lotes grandes' : 'Optimizado para velocidad',
          accuracy: !fastMode ? 'Configurado para máxima precisión' : 'Configurado para velocidad',
          // 🆕 NUEVA RECOMENDACIÓN
          truncatedWords: config.detectTruncatedWords 
            ? `Detección activada (umbral: ${config.edgeThreshold}px, confianza: ${config.confidenceThreshold}%) - ~50ms adicional por documento`
            : 'Detección desactivada - procesamiento más rápido'
        },
        // 🆕 INFORMACIÓN ADICIONAL
        newFeatures: {
          truncatedWordDetection: {
            enabled: config.detectTruncatedWords,
            description: 'Detecta automáticamente palabras que parecen estar cortadas por OCR',
            performance: '~50ms adicional por documento',
            benefits: 'Mejora la detección de nombres completos como CARRILLO vs CARRILL'
          }
        }
      });

    } catch (error) {
      console.error('❌ Error configurando mejoras:', error);
      res.status(500).json({
        success: false,
        error: 'Error configurando mejoras de procesamiento',
        details: error.message
      });
    }
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DE PROCESAMIENTO
   * GET /api/ocr/processing-stats
   * Devuelve estadísticas y capacidades del sistema
   */
  async getProcessingStats(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas de procesamiento...');

      const stats = ocrService.getProcessingStats();

      res.json({
        success: true,
        stats: stats,
        systemInfo: {
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          features: 'Mejoras de imagen integradas'
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas de procesamiento',
        details: error.message
      });
    }
  }
}

// Middleware de multer como método estático
OCRController.upload = upload;
OCRController.uploadMultiple = uploadMultiple;

export default new OCRController();
