import { getWorkerPool } from './workerPool.js';
import { pool } from '../../../config/database.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import DocumentClassifier from './documentClassifier.js';
import ImageSegmentation from './imageSegmentation.js';

// ================= 📦 PROCESADOR DE LOTES OCR =================

class BatchProcessor {
  constructor() {
    this.classifier = new DocumentClassifier();
    this.imageSegmentation = new ImageSegmentation();
    this.BATCH_SIZE = 15; // Documentos por lote
    this.MAX_CONCURRENT_BATCHES = 2; // Lotes simultáneos
    this.DB_BATCH_SIZE = 50; // Registros por transacción DB

    // Configuraciones optimizadas por tipo de documento
    this.configs = {
      recibo: {
        tessedit_pageseg_mode: 6, // Bloques uniformes para recibos
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$',
        preserve_interword_spaces: 1,
        tessedit_do_invert: 0,
        load_system_dawg: 1,
        load_freq_dawg: 1
      },
      contrato: {
        tessedit_pageseg_mode: 1, // Página completa para contratos estructurados
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$Q',
        preserve_interword_spaces: 1,
        tessedit_create_hocr: 1,
        load_system_dawg: 1,
        load_freq_dawg: 1
      },
      // Mantener configuraciones legacy para compatibilidad
      default: {
        tessedit_pageseg_mode: 6,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$',
        preserve_interword_spaces: 1,
        tessedit_do_invert: 0,
        load_system_dawg: 1,
        load_freq_dawg: 1
      },
      europiel: {
        tessedit_pageseg_mode: 1,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$Q',
        preserve_interword_spaces: 1,
        tessedit_create_hocr: 1,
        load_system_dawg: 1,
        load_freq_dawg: 1
      }
    };
  }

  /**
   * Optimizar tamaño de imagen según sus dimensiones
   */
  getOptimalImageSize(width, height) {
    const totalPixels = width * height;

    if (totalPixels > 4000000) return { width: 2400 }; // Imágenes muy grandes
    if (totalPixels > 2000000) return { width: 1800 }; // Imágenes grandes
    if (totalPixels > 1000000) return { width: 1400 }; // Imágenes medianas
    return { width: 1200 }; // Imágenes pequeñas
  }

  /**
   * Preprocesar imagen de forma optimizada
   */
  async preprocessImage(imagePath, documentType = 'default') {
    try {
      const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.png');

      // Obtener metadatos de la imagen
      const metadata = await sharp(imagePath).metadata();
      const optimalSize = this.getOptimalImageSize(metadata.width, metadata.height);

      // Preprocesamiento adaptativo
      let sharpInstance = sharp(imagePath)
        .greyscale()
        .normalise();

      // Configuración específica por tipo de documento
      if (documentType === 'europiel') {
        sharpInstance = sharpInstance
          .sharpen({ sigma: 1.2, flat: 1, jagged: 2 })
          .threshold(120); // Threshold más suave para EUROPIEL
      } else {
        sharpInstance = sharpInstance
          .sharpen({ sigma: 1, flat: 1, jagged: 2 })
          .threshold(128);
      }

      await sharpInstance
        .resize({
          width: optimalSize.width,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3
        })
        .png({
          compressionLevel: 0,
          quality: 100
        })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('❌ Error preprocesando imagen:', error);
      return imagePath; // Usar original si falla
    }
  }

  /**
   * Detectar tipo de documento rápidamente
   * CORREGIDO: Detecta RECIBO vs CONTRATO (no europiel vs default)
   */
  async quickDocumentDetection(imagePath) {
    try {
      console.log(`🔍 Detección rápida de tipo de documento: ${imagePath}`);

      // Análisis rápido con imagen pequeña
      const quickPreprocessPath = imagePath.replace(/\.[^/.]+$/, '_quick.png');

      await sharp(imagePath)
        .resize({ width: 1000 }) // Más resolución para mejor detección
        .greyscale()
        .threshold(140)
        .png()
        .toFile(quickPreprocessPath);

      const workerPool = getWorkerPool();
      const result = await workerPool.processImage(quickPreprocessPath, {
        tessedit_pageseg_mode: 1,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
      });

      // Limpiar archivo temporal
      try {
        await fs.unlink(quickPreprocessPath);
      } catch (e) {
        // Ignorar error de limpieza
      }

      const text = result.data.text.toUpperCase();
      console.log(`📝 Texto extraído para detección: "${text.substring(0, 200)}..."`);

      // 🎯 PATRONES DE DETECCIÓN ESPECÍFICOS (como en Tesseract)
      const reciboPatterns = [
        'RECIBO DE PAGO',
        'RECIBI DE',
        'TRANSACCION APROBADA',
        'TARJETA:',
        'AUTORIZACION:',
        'FOLIO FACTURA',
        'SI REQUIERE FACTURA'
      ];

      const contratoPatterns = [
        'NOMBRE DEL CLIENTE 1:',
        'NOMBRE DEL CLIENTE 2:',
        'COSTO TOTAL DEL SERVICIO',
        'ANTICIPO',
        'SALDO RESTANTE',
        'PAGOS POR CUBRIR',
        'DIRECCION SUCURSAL DONDE CONTRATO',
        'FOLIO:Q2-', // Los folios de contratos empiezan con Q2-
        'DEL MES DE',
        'DEL AÑO',
        'TRATAMIENTO',
        'CLIENTE 1:',
        'CLIENTE 2:',
        'TARJETA DE CREDITO',
        'FECHA VENCIMIENTO',
        'EUROPIEL SINERGIA, S. DE R.L. DE C.V.',
        'CONTRATO DE PRESTACION',
        'PRESTACION DE SERVICIOS'
      ];

      // Contar coincidencias
      const reciboMatches = reciboPatterns.filter(pattern => text.includes(pattern));
      const contratoMatches = contratoPatterns.filter(pattern => text.includes(pattern));

      console.log(`📊 Patrones encontrados:`);
      console.log(`   🧾 RECIBO (${reciboMatches.length}): [${reciboMatches.join(', ')}]`);
      console.log(`   📄 CONTRATO (${contratoMatches.length}): [${contratoMatches.join(', ')}]`);

      if (reciboMatches.length > contratoMatches.length) {
        console.log(`✅ Documento detectado como: RECIBO (${reciboMatches.length} vs ${contratoMatches.length})`);
        return 'recibo';
      } else if (contratoMatches.length > 0) {
        console.log(`✅ Documento detectado como: CONTRATO (${contratoMatches.length} vs ${reciboMatches.length})`);
        return 'contrato';
      } else {
        // Si no hay coincidencias claras, usar heurísticas adicionales
        if (text.includes('EUROPIEL') && text.includes('LASER')) {
          console.log(`🤔 Documento Europiel sin patrones claros, asumiendo: RECIBO por defecto`);
          return 'recibo'; // Los recibos son más comunes
        } else {
          console.log(`❓ Tipo de documento no claro, asumiendo: RECIBO por defecto`);
          return 'recibo';
        }
      }

    } catch (error) {
      console.log('⚠️ Error en detección rápida, usando RECIBO por defecto:', error.message);
      return 'recibo'; // Por defecto, asumir recibo (más común y necesita segmentación)
    }
  }

  /**
   * Procesar un lote de documentos con segmentación automática
   */
  async processBatch(files, options = {}) {
    const startTime = Date.now();
    const { manualConfig } = options; // ⚙️ Extraer configuración manual

    console.log(`📦 Iniciando procesamiento de lote: ${files.length} documentos`);
    if (manualConfig) {
      console.log('⚙️ Configuración manual recibida:', manualConfig);
    }

    try {
      // 1. NUEVA FUNCIONALIDAD: Segmentación automática de imágenes
      const expandedFiles = [];
      const segmentedFilesToCleanup = [];

      for (const file of files) {
        console.log(`🔍 Analizando ${file.filename} para determinar tipo de documento...`);

        // PASO 1: Clasificar tipo de documento primero
        const docType = await this.quickDocumentDetection(file.path);
        console.log(`📋 Tipo de documento detectado: ${docType}`);

        // PASO 2: Solo aplicar segmentación automática a RECIBOS
        if (docType === 'recibo') {
          console.log(`🔍 Aplicando segmentación para múltiples recibos...`);
          const segmentedPaths = await this.imageSegmentation.segmentReceipts(file.path);

          if (segmentedPaths.length > 1) {
            console.log(`🎯 Se detectaron ${segmentedPaths.length} recibos en ${file.filename}`);

            // Crear objetos file para cada segmento
            segmentedPaths.forEach((segmentPath, segmentIndex) => {
              const ext = path.extname(file.filename);
              const basename = path.basename(file.filename, ext);

              expandedFiles.push({
                ...file,
                path: segmentPath,
                filename: `${basename}_parte_${segmentIndex + 1}${ext}`,
                originalname: `${basename}_parte_${segmentIndex + 1}${ext}`,
                isSegmented: true,
                segmentIndex: segmentIndex + 1,
                totalSegments: segmentedPaths.length,
                originalFile: file.filename,
                detectedType: 'recibo'
              });
            });

            // Marcar archivos segmentados para limpieza posterior
            segmentedFilesToCleanup.push(...segmentedPaths.filter(p => p.includes('_receipt_')));
          } else {
            console.log(`📄 Recibo único detectado en ${file.filename}`);
            expandedFiles.push({
              ...file,
              isSegmented: false,
              segmentIndex: 1,
              totalSegments: 1,
              detectedType: 'recibo'
            });
          }
        } else {
          // ✅ CONTRATOS Y OTROS DOCUMENTOS: NUNCA DIVIDIR
          console.log(`📄 Procesando ${file.filename} como ${docType.toUpperCase()} único (sin segmentación)`);
          console.log(`🚫 CONTRATOS NO SE DIVIDEN - Procesando como documento completo`);
          expandedFiles.push({
            ...file,
            isSegmented: false,
            segmentIndex: 1,
            totalSegments: 1,
            detectedType: docType
          });
        }
      }

      console.log(`📊 Total de documentos a procesar después de segmentación: ${expandedFiles.length}`);

      // 2. Preparar tareas para el worker pool
      const tasks = await Promise.all(expandedFiles.map(async (file, index) => {
        // Usar el tipo de documento ya detectado
        const docType = file.detectedType || 'recibo';

        // Preprocesar imagen
        const preprocessedPath = await this.preprocessImage(file.path, docType);

        return {
          imagePath: preprocessedPath,
          originalPath: file.path,
          config: this.configs[docType],
          options: { language: options.language || 'spa+eng' },
          metadata: {
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            documentType: docType,
            userId: options.userId,
            index,
            isSegmented: file.isSegmented,
            segmentIndex: file.segmentIndex,
            totalSegments: file.totalSegments,
            originalFile: file.originalFile || file.filename,
            originalPath: file.path, // ✅ Agregar originalPath al metadata
            manualConfig: manualConfig // ⚙️ Incluir configuración manual
          }
        };
      }));

      // 2. Procesar con worker pool
      const workerPool = getWorkerPool();
      const ocrResults = await workerPool.processMultiple(tasks);

      // 3. Procesar resultados y clasificar
      const processedResults = [];
      const dbInsertions = [];

      for (const result of ocrResults.results) {
        if (result.success) {
          try {
            // 🔍 DEPURACIÓN: Mostrar texto extraído de cada segmento
            const segmentInfo = result.metadata.isSegmented
              ? ` (segmento ${result.metadata.segmentIndex}/${result.metadata.totalSegments} de ${result.metadata.originalFile})`
              : '';

            console.log(`🔍 TEXTO EXTRAÍDO${segmentInfo}:`);
            console.log(`📄 Archivo: ${result.metadata.filename}`);
            console.log(`📝 Confianza OCR: ${result.data.confidence}%`);
            console.log(`📏 Longitud texto: ${result.data.text ? result.data.text.length : 0} caracteres`);
            console.log(`📋 Texto (primeros 300 chars): "${result.data.text ? result.data.text.substring(0, 300) : 'TEXTO VACÍO'}..."`);
            console.log(`🔚 Texto (últimos 100 chars): "...${result.data.text ? result.data.text.substring(-100) : 'TEXTO VACÍO'}"`);

            // Clasificar documento
            const classification = this.classifier.classifyDocument(result.data.text);

            // 🔧 SEPARACIÓN AUTOMÁTICA DESHABILITADA - Solo logging
            if (classification.extractedFields && classification.extractedFields.cliente) {
              console.log(`📋 Nombre extraído (sin separación automática): "${classification.extractedFields.cliente}"`);
            }

            // Preparar resultado completo
            const processedResult = {
              ...result,
              classification,
              processingTime: Date.now() - startTime,
              confidence: result.data.confidence / 100,
              extractedText: result.data.text,
              boundingBoxes: this.extractBoundingBoxes(result.data)
            };

            processedResults.push(processedResult);

            // Preparar para inserción en DB
            dbInsertions.push({
              filename: result.metadata.filename,
              original_path: result.metadata.originalPath,
              processed_path: result.imagePath,
              file_size: result.metadata.size,
              mime_type: result.metadata.mimetype,
              extracted_text: result.data.text,
              confidence: result.data.confidence / 100,
              classification_type: classification.type,
              classification_confidence: classification.confidence,
              extracted_fields: JSON.stringify(classification.extractedFields || {}),
              user_id: result.metadata.userId || 'anonymous',
              document_type: result.metadata.documentType,
              status: 'completed'
            });

          } catch (error) {
            console.error(`❌ Error procesando resultado ${result.index}:`, error);
            processedResults.push({
              ...result,
              success: false,
              error: error.message
            });
          }
        } else {
          processedResults.push(result);
        }
      }

      // 4. Insertar en base de datos en lotes
      const dbResults = await this.batchDatabaseInsert(dbInsertions);

      const totalTime = Date.now() - startTime;
      const successful = processedResults.filter(r => r.success).length;

      console.log(`✅ Lote completado en ${totalTime}ms - ${successful}/${expandedFiles.length} exitosos`);

      // 5. NUEVA FUNCIONALIDAD: Limpiar archivos segmentados temporales
      if (segmentedFilesToCleanup.length > 0) {
        console.log(`🧹 Limpiando ${segmentedFilesToCleanup.length} archivos segmentados temporales...`);
        await this.imageSegmentation.cleanupSegmentedFiles(segmentedFilesToCleanup);
      }

      return {
        success: true,
        results: processedResults,
        databaseResults: dbResults,
        totalTime,
        successful,
        failed: expandedFiles.length - successful,
        stats: {
          ocrTime: ocrResults.totalTime,
          dbTime: dbResults.insertTime,
          totalDocuments: expandedFiles.length,
          originalDocuments: files.length,
          segmentedDocuments: expandedFiles.length - files.length
        }
      };

    } catch (error) {
      console.error('❌ Error en procesamiento de lote:', error);

      // Limpiar archivos segmentados en caso de error
      if (typeof segmentedFilesToCleanup !== 'undefined' && segmentedFilesToCleanup.length > 0) {
        try {
          await this.imageSegmentation.cleanupSegmentedFiles(segmentedFilesToCleanup);
        } catch (cleanupError) {
          console.warn('⚠️ Error en limpieza de archivos:', cleanupError);
        }
      }

      return {
        success: false,
        error: error.message,
        totalTime: Date.now() - startTime
      };
    }
  }

  /**
   * Insertar resultados en base de datos en lotes
   */
  async batchDatabaseInsert(insertions) {
    if (insertions.length === 0) {
      return { success: true, insertedCount: 0, insertTime: 0 };
    }

    const startTime = Date.now();
    console.log(`💾 Insertando ${insertions.length} registros en lotes...`);

    try {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Dividir en lotes para la base de datos
        const batches = [];
        for (let i = 0; i < insertions.length; i += this.DB_BATCH_SIZE) {
          batches.push(insertions.slice(i, i + this.DB_BATCH_SIZE));
        }

        let totalInserted = 0;

        for (const batch of batches) {
          // 1. Insertar en tabla ocr_documents
          const ocrValues = [];
          const ocrPlaceholders = [];

          batch.forEach((item, index) => {
            const baseIndex = index * 8;
            ocrPlaceholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`);

            ocrValues.push(
              item.filename,
              item.original_path,
              item.file_size,
              item.mime_type,
              item.user_id,
              item.document_type,
              item.status,
              new Date()
            );
          });

          const ocrQuery = `
            INSERT INTO ocr_documents (
              filename, original_path, file_size, mime_type,
              user_id, document_type, status, processed_date
            ) VALUES ${ocrPlaceholders.join(', ')}
          `;

          const ocrResult = await client.query(ocrQuery, ocrValues);

          // 2. ❌ INSERCIÓN EN PAPELERÍA DESHABILITADA PARA EVITAR DUPLICADOS
          // SOLO el servidor principal (puerto 3001) debe insertar en papelería
          console.log(`🛡️ [ANTI-DUPLICADOS] Saltando inserción en papelería para ${batch.length} registros`);
          console.log(`🔄 Los datos serán procesados por el servidor principal (puerto 3001)`);

          // Mostrar qué se habría insertado (solo para debug)
          for (const item of batch) {
            try {
              const extractedFields = JSON.parse(item.extracted_fields || '{}');
              if (extractedFields.cliente) {
                console.log(`🔍 [DEBUG] Cliente que será procesado por servidor principal: ${extractedFields.cliente}`);
              }
            } catch (extractError) {
              console.warn(`⚠️ Error parseando extractedFields para ${item.filename}:`, extractError.message);
            }
          }

          totalInserted += ocrResult.rowCount;
        }

        await client.query('COMMIT');

        const insertTime = Date.now() - startTime;
        console.log(`✅ ${totalInserted} registros insertados en ${insertTime}ms`);

        return {
          success: true,
          insertedCount: totalInserted,
          insertTime
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('❌ Error en inserción batch:', error);
      return {
        success: false,
        error: error.message,
        insertTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extraer bounding boxes optimizado
   */
  extractBoundingBoxes(tesseractData) {
    const boundingBoxes = {
      words: [],
      lines: [],
      paragraphs: []
    };

    // Solo palabras con alta confianza para optimizar
    tesseractData.words.forEach(word => {
      if (word.confidence > 40) {
        boundingBoxes.words.push({
          text: word.text,
          confidence: word.confidence / 100,
          bbox: {
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1
          }
        });
      }
    });

    // Líneas con confianza mínima
    tesseractData.lines.forEach(line => {
      if (line.confidence > 30) {
        boundingBoxes.lines.push({
          text: line.text,
          confidence: line.confidence / 100,
          bbox: {
            x0: line.bbox.x0,
            y0: line.bbox.y0,
            x1: line.bbox.x1,
            y1: line.bbox.y1
          }
        });
      }
    });

    return boundingBoxes;
  }

  /**
   * Procesar múltiples lotes de forma controlada
   */
  async processMultipleBatches(allFiles, options = {}) {
    const startTime = Date.now();
    console.log(`🚀 Procesando ${allFiles.length} documentos en lotes de ${this.BATCH_SIZE}`);

    // Dividir archivos en lotes
    const batches = [];
    for (let i = 0; i < allFiles.length; i += this.BATCH_SIZE) {
      batches.push(allFiles.slice(i, i + this.BATCH_SIZE));
    }

    console.log(`📦 Total de lotes: ${batches.length}`);

    const allResults = [];
    let totalSuccessful = 0;
    let totalFailed = 0;

    // Procesar lotes de forma controlada (máximo 2 lotes simultáneos)
    for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + this.MAX_CONCURRENT_BATCHES);

      console.log(`🔄 Procesando lotes ${i + 1}-${Math.min(i + concurrentBatches.length, batches.length)} de ${batches.length}`);

      const batchPromises = concurrentBatches.map((batch, batchIndex) =>
        this.processBatch(batch, {
          ...options,
          batchNumber: i + batchIndex + 1
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          allResults.push(...result.value.results);
          totalSuccessful += result.value.successful;
          totalFailed += result.value.failed;
        } else {
          console.error(`❌ Error en lote ${i + index + 1}:`, result.reason || result.value.error);
          totalFailed += concurrentBatches[index].length;
        }
      });

      // Pequeña pausa entre grupos de lotes para evitar sobrecarga
      if (i + this.MAX_CONCURRENT_BATCHES < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`🎉 PROCESAMIENTO MASIVO COMPLETADO en ${totalTime}ms`);
    console.log(`📊 Total: ${allFiles.length} | Exitosos: ${totalSuccessful} | Fallos: ${totalFailed}`);
    console.log(`⚡ Velocidad: ${(allFiles.length / (totalTime / 1000)).toFixed(2)} docs/segundo`);

    return {
      success: true,
      results: allResults,
      totalTime,
      totalSuccessful,
      totalFailed,
      totalDocuments: allFiles.length,
      averageTimePerDocument: totalTime / allFiles.length,
      documentsPerSecond: allFiles.length / (totalTime / 1000)
    };
  }
}

export default BatchProcessor;
