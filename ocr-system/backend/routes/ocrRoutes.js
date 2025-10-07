import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cvReadyPromise from '@techstark/opencv-js';
import DocumentClassifier from '../services/documentClassifier.js';
import ImageProcessor from '../services/imageProcessor.js';
import { getWorkerPool } from '../services/workerPool.js';
import DatabaseService from '../services/databaseService.js';
import BatchProcessor from '../services/batchProcessor.js';

const databaseService = new DatabaseService();
const batchProcessor = new BatchProcessor();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const classifier = new DocumentClassifier();
let imageProcessor = null;

// Inicializar el procesador de imágenes
const initImageProcessor = async () => {
    try {
        // Crear nueva instancia de ImageProcessor
        imageProcessor = new ImageProcessor();
        // Esperar a que se inicialice OpenCV.js
        await cvReadyPromise;
        // Inicializar el procesador
        await imageProcessor.initialize();
        console.log('🎯 ImageProcessor inicializado correctamente');
    } catch (error) {
        console.error("❌ Error inicializando ImageProcessor:", error);
        throw error;
    }
};

// Configuración de Tesseract optimizada para documentos de Europiel
const tesseractConfig = {
    tessedit_pageseg_mode: 6, // Un bloque uniforme de texto - mejor para documentos
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$',
    preserve_interword_spaces: 1,
    tessedit_create_hocr: 0,
    tessedit_create_tsv: 0,
    load_system_dawg: 1,
    load_freq_dawg: 1,
    load_unambig_dawg: 1,
    load_punc_dawg: 1,
    load_number_dawg: 1,
    load_bigram_dawg: 1
};

// Pool de workers de Tesseract
let workerPool = null;

// Función para inicializar el pool de workers
const initializeWorkerPool = async () => {
    try {
        workerPool = getWorkerPool();
        await workerPool.initialize();
        return true;
    } catch (error) {
        console.error("❌ Error al inicializar workers:", error);
        return false;
    }
};

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB límite
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, BMP, TIFF, PDF)'));
    }
});

// Configuración para múltiples archivos (lotes)
const uploadMultiple = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024,
        files: 200 // Máximo 200 archivos por lote
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, BMP, TIFF, PDF)'));
    }
});

// ================= 🛣️ RUTAS DEL OCR =================

/**
 * @route POST /api/ocr/upload
 * @desc Procesar documento individual con OCR Tesseract 5
 */
router.post("/upload", upload.single("file"), async (req, res) => {
    console.log('🔴 [INDIVIDUAL] Endpoint /upload llamado');
    // Configurar timeout de 5 minutos para la solicitud
    req.setTimeout(300000, () => {
        console.error('⏰ Timeout de solicitud OCR');
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: 'Timeout: El procesamiento tardó demasiado tiempo'
            });
        }
    });

    try {
        if (!req.file) {
            throw new Error("No se subió ningún archivo");
        }

        // Validar parámetros requeridos
        const { sucursal, bloque, caja } = req.body;
        if (!sucursal || !bloque || !caja) {
            throw new Error("Faltan parámetros requeridos (sucursal, bloque, caja)");
        }

        console.log("📄 Archivo recibido:", {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
            sucursal,
            bloque,
            caja
        });

        // Obtener el pool de workers
        const workerPool = getWorkerPool();
        if (!workerPool.isInitialized) {
            await workerPool.initialize();
        }

        // Validar que el archivo no esté corrupto
        try {
            const stats = fs.statSync(req.file.path);
            if (stats.size === 0) {
                throw new Error("El archivo está vacío o corrupto");
            }
        } catch (error) {
            throw new Error(`Error validando archivo: ${error.message}`);
        }

        console.log("🔍 Iniciando procesamiento OCR del archivo:", req.file.originalname);
        const startTime = Date.now();

        try {
            // Inicializar imageProcessor si no está listo
            if (!imageProcessor) {
                console.log(`🔧 ImageProcessor es null, inicializando...`);
                await initImageProcessor();
                console.log(`✅ ImageProcessor inicializado correctamente`);
            } else {
                console.log(`✅ ImageProcessor ya está disponible`);
            }

            console.log(`🔍 Iniciando detección de múltiples recibos para: ${req.file.originalname}`);

            // ✅ PRIMERO: Detectar tipo de documento para decidir si dividir
            console.log(`🎯 DETECTANDO TIPO DE DOCUMENTO ANTES DE LA DIVISIÓN...`);
            const documentType = await batchProcessor.quickDocumentDetection(req.file.path);
            console.log(`📋 Tipo de documento detectado: ${documentType}`);

            let detectedReceipts = [];

            if (documentType === 'contrato') {
                console.log(`📑 CONTRATO DETECTADO - NO SE DIVIDIRÁ LA IMAGEN`);
                // Para contratos, procesar como un solo documento
                detectedReceipts = [{
                    path: req.file.path,
                    index: 1,
                    total: 1,
                    type: 'contrato'
                }];
            } else {
                console.log(`🧾 RECIBO DETECTADO - VERIFICANDO SI NECESITA DIVISIÓN...`);
                console.log(`🔍 LLAMANDO A detectAndSeparateReceipts...`);
                console.log(`📁 Ruta del archivo: ${req.file.path}`);
                console.log(`📊 Tamaño del archivo: ${req.file.size} bytes`);

                // Detectar múltiples recibos antes del procesamiento
                console.log(`🎯 EJECUTANDO imageProcessor.detectAndSeparateReceipts(${req.file.path})`);
                detectedReceipts = await imageProcessor.detectAndSeparateReceipts(req.file.path);
                console.log(`🎯 FUNCIÓN detectAndSeparateReceipts COMPLETADA`);
            }

            console.log(`📊 Resultado de detección para ${req.file.originalname}:`, {
                totalDetected: detectedReceipts.length,
                receipts: detectedReceipts.map(r => ({ path: r.path, index: r.index, total: r.total }))
            });

            let allResults = [];

            if (detectedReceipts.length > 1) {
                console.log(`🔥 MÚLTIPLES RECIBOS DETECTADOS: ${detectedReceipts.length} recibos en ${req.file.originalname}`);

                                // Procesar cada recibo individualmente
                                let processedCounter = 0;
                                const totalToProcess = detectedReceipts.length;
                                // Report initial progress 0/total
                                try {
                                    const axios = await import('axios');
                                    const batchIdFromReq = req.body?.batchId || req.query?.batchId || null;
                                    if (batchIdFromReq) {
                                        axios.default.post('http://localhost:3001/api/ocr/processing-progress', {
                                            batchId: batchIdFromReq,
                                            processed: 0,
                                            total: totalToProcess,
                                            filename: req.file.originalname
                                        }).catch(e => console.debug('No se pudo reportar progreso inicial al bridge:', e.message));
                                    }
                                } catch (e) {
                                    console.debug('Error reportando progreso inicial:', e.message);
                                }

                                for (const receipt of detectedReceipts) {
                    console.log(`📄 Procesando recibo ${receipt.index} de ${receipt.total} de la imagen ${req.file.originalname}`);
                    console.log(`📁 Ruta del recibo: ${receipt.path}`);

                    // Pre-procesar imagen para mejor calidad
                    const processedImageResult = await imageProcessor.autoRotateImage(receipt.path);
                    const processedImagePath = processedImageResult.processedPath;

                    // Validar archivo procesado
                    const processedStats = fs.statSync(processedImagePath);
                    if (processedStats.size === 0) {
                        throw new Error(`Error en el pre-procesamiento del recibo ${receipt.index}: imagen resultante vacía`);
                    }

                    // Obtener worker disponible del pool
                    const workerPool = getWorkerPool();
                    const { data } = await workerPool.processImage(processedImagePath, tesseractConfig);

                    if (!data || !data.text) {
                        console.warn(`⚠️ Error en OCR del recibo ${receipt.index}: no se pudo extraer texto`);
                        continue;
                    }

                    // Clasificar documento y extraer campos
                    const classification = classifier.classifyDocument(data.text);

                    // Usar los campos ya extraídos automáticamente por classifyDocument
                    const extractedFields = classification.extractedFields || {};

                                        // Preparar datos para la base de datos
                    const dataForDB = {
                        ...extractedFields,
                        classification,
                        confidence: data.confidence || 0,
                        text: data.text,
                        sucursal,
                        bloque,
                        caja
                    };

                    // Insertar en la base de datos
                    try {
                        const result = await databaseService.insertarDatosExtraidos(dataForDB);
                        console.log(`✅ [INDIVIDUAL-MULTIPLE] Datos guardados en BD para recibo ${receipt.index}:`, req.file.originalname);

                        allResults.push({
                            fileUrl: `/uploads/${path.basename(receipt.path)}`,
                            originalName: `${req.file.originalname} (Recibo ${receipt.index})`,
                            size: req.file.size,
                            classification,
                            extractedFields,
                            confidence: data.confidence || 0,
                            processingTime: Date.now() - startTime,
                            databaseId: result.data?.id || null
                        });
                    } catch (dbError) {
                        console.error(`❌ Error guardando recibo ${receipt.index} en BD:`, dbError);
                        throw new Error(`Error guardando datos del recibo ${receipt.index}: ${dbError.message}`);
                    }

                                                            // Increment processed counter and report cumulative progress to the bridge
                                                            try {
                                                                processedCounter += 1;
                                                                const axios = await import('axios');
                                                                const batchIdFromReq = req.body?.batchId || req.query?.batchId || null;
                                                                if (batchIdFromReq) {
                                                                    axios.default.post('http://localhost:3001/api/ocr/processing-progress', {
                                                                        batchId: batchIdFromReq,
                                                                        processed: processedCounter,
                                                                        total: totalToProcess,
                                                                        filename: req.file.originalname
                                                                    }).catch(e => console.debug('No se pudo reportar progreso al bridge:', e.message));
                                                                }
                                                            } catch (e) {
                                                                console.debug('Error intentando reportar progreso interno:', e.message);
                                                            }
                }

                const processingTime = Date.now() - startTime;
                console.log(`\n✨ OCR de múltiples recibos completado en ${processingTime}ms`);
                console.log(`📊 Total de recibos procesados: ${allResults.length}`);

                // Limpiar workers pool para evitar problemas en el siguiente lote
                try {
                    const workerPool = getWorkerPool();
                    if (workerPool && typeof workerPool.cleanup === 'function') {
                        await workerPool.cleanup();
                        console.log('🧹 Workers pool limpiado correctamente');
                    }
                } catch (cleanupError) {
                    console.warn('⚠️ Error limpiando workers pool:', cleanupError.message);
                }

                // Respuesta para múltiples recibos
                res.json({
                    success: true,
                    data: allResults,
                    message: `Se procesaron ${allResults.length} recibos de la imagen ${req.file.originalname}`,
                    totalProcessed: allResults.length
                });
                return;
            }

            console.log(`📄 Procesando como documento único: ${req.file.originalname}`);

            // Usar la ruta correcta según si es contrato (original) o recibo dividido
            const imagePath = detectedReceipts[0].path;

            // Pre-procesar imagen para mejor calidad
            const processedImageResult = await imageProcessor.autoRotateImage(imagePath);
            const processedImagePath = processedImageResult.processedPath || processedImageResult;

            // Validar archivo procesado
            const processedStats = fs.statSync(processedImagePath);
            if (processedStats.size === 0) {
                throw new Error("Error en el pre-procesamiento: imagen resultante vacía");
            }

            // Obtener worker disponible del pool
            const workerPool = getWorkerPool();
            const { data } = await workerPool.processImage(processedImagePath, tesseractConfig);

            if (!data || !data.text) {
                throw new Error("Error en OCR: no se pudo extraer texto de la imagen");
            }

            const processingTime = Date.now() - startTime;
            console.log(`\n✨ OCR completado en ${processingTime}ms`);

            // Clasificar documento y extraer campos - RESPETAR EL TIPO YA DETECTADO
            let classification;

            if (documentType === 'contrato') {
                console.log(`📋 Usando clasificación previa: CONTRATO`);
                // Forzar clasificación como contrato - SOLO UNA LLAMADA
                classification = classifier.classifyDocument(data.text);
                classification.type = 'contrato'; // Asegurar que sea contrato
                // Los campos ya están en classification.extractedFields
            } else {
                console.log(`📋 Clasificando documento como recibo`);
                // Para recibos - SOLO UNA LLAMADA
                classification = classifier.classifyDocument(data.text);
                // Los campos ya están en classification.extractedFields
            }

            // Usar los campos extraídos automáticamente por classifyDocument
            const extractedFields = classification.extractedFields || {};

            // Preparar respuesta para mostrar modal de validación en frontend
                        // Normalizar campos esperados por el frontend
                        const camposEsperados = [
                            'cliente', 'monto', 'folio', 't_pago', 'tipo', 'fecha_contrato',
                            'sucursal', 'bloque', 'caja', 'originalFileName', 'confidence', 'text', 'classification'
                        ];
                        const validationData = [{
                            ...camposEsperados.reduce((acc, key) => {
                                acc[key] = (extractedFields[key] !== undefined)
                                    ? extractedFields[key]
                                    : (key === 'sucursal' ? sucursal :
                                        key === 'bloque' ? bloque :
                                        key === 'caja' ? caja :
                                        key === 'originalFileName' ? req.file.originalname :
                                        key === 'confidence' ? (data.confidence || 0) :
                                        key === 'text' ? data.text :
                                        key === 'classification' ? classification : null);
                                return acc;
                            }, {})
                        }];
            const response = {
                success: true,
                needsValidation: true,
                validationData,
                processingTime
            };

            console.log("✅ Documento procesado (SOLO extracción, sin guardar en BD):", {
                tipo: classification.type,
                confianza: data.confidence,
                campos: Object.keys(extractedFields)
            });

            res.json(response);

        } catch (error) {
            console.error("❌ Error en OCR:", error);
            throw new Error("Error en procesamiento OCR: " + error.message);
        }

    } catch (error) {
        console.error("❌ Error general:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/ocr/batch-upload
 * @desc Procesar múltiples documentos en lote
 */
router.post("/batch-upload", uploadMultiple.array("files", 200), async (req, res) => {
    console.log('🔵 [BATCH] Endpoint /batch-upload llamado');
    // Configurar timeout de 10 minutos para lotes
    req.setTimeout(600000, () => {
        console.error('⏰ Timeout de lote OCR');
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: 'Timeout: El procesamiento del lote tardó demasiado tiempo'
            });
        }
    });

    try {
        if (!req.files || req.files.length === 0) {
            throw new Error("No se subieron archivos");
        }

        // Validar parámetros requeridos
        const { sucursal, bloque, caja } = req.body;
        if (!sucursal || !bloque || !caja) {
            throw new Error("Faltan parámetros requeridos (sucursal, bloque, caja)");
        }

        console.log(`📚 Iniciando procesamiento de lote con ${req.files.length} archivos`);
        const batchStartTime = Date.now();

        // Asegurarse de que el worker pool está inicializado
        if (!workerPool || !workerPool.isInitialized) {
            try {
                const pool = getWorkerPool();
                await pool.initialize();

                if (!pool.isInitialized) {
                    throw new Error("No se pudo inicializar el pool de workers");
                }
                workerPool = pool;
            } catch (error) {
                console.error('❌ Error inicializando OCR:', error);
                throw new Error("Error de inicialización OCR: " + error.message);
            }
        }

        // Procesar archivos en paralelo con manejo de errores individual
        const results = await Promise.all(req.files.map(async file => {
            try {
                if (!imageProcessor) {
                    console.log(`🔧 ImageProcessor es null, inicializando...`);
                    await initImageProcessor();
                    console.log(`✅ ImageProcessor inicializado correctamente`);
                } else {
                    console.log(`✅ ImageProcessor ya está disponible`);
                }

                console.log(`🔍 Iniciando detección de múltiples recibos para: ${file.originalname}`);

                // ✅ PRIMERO: Detectar tipo de documento para decidir si dividir
                console.log(`🎯 DETECTANDO TIPO DE DOCUMENTO ANTES DE LA DIVISIÓN...`);
                const documentType = await batchProcessor.quickDocumentDetection(file.path);
                console.log(`📋 Tipo de documento detectado: ${documentType}`);

                let detectedReceipts = [];

                if (documentType === 'contrato') {
                    console.log(`📑 CONTRATO DETECTADO - NO SE DIVIDIRÁ LA IMAGEN`);
                    // Para contratos, procesar como un solo documento
                    detectedReceipts = [{
                        path: file.path,
                        index: 1,
                        total: 1,
                        type: 'contrato'
                    }];
                } else {
                    console.log(`🧾 RECIBO DETECTADO - VERIFICANDO SI NECESITA DIVISIÓN...`);
                    console.log(`🔍 LLAMANDO A detectAndSeparateReceipts...`);

                    // Detectar múltiples recibos antes del procesamiento
                    detectedReceipts = await imageProcessor.detectAndSeparateReceipts(file.path);
                }

                console.log(`📊 Resultado de detección para ${file.originalname}:`, {
                    totalDetected: detectedReceipts.length,
                    receipts: detectedReceipts.map(r => ({ path: r.path, index: r.index, total: r.total }))
                });

                if (detectedReceipts.length > 1) {
                    console.log(`� MÚLTIPLES RECIBOS DETECTADOS: ${detectedReceipts.length} recibos en ${file.originalname}`);

                    // Procesar cada recibo individualmente
                    const receiptResults = await Promise.all(detectedReceipts.map(async (receipt, index) => {
                        try {
                            console.log(`📄 Procesando recibo ${index + 1} de ${detectedReceipts.length} de la imagen ${file.originalname}`);
                            console.log(`📁 Ruta del recibo: ${receipt.path}`);

                            const result = await workerPool.processImage(receipt.path, {
                                tessedit_pageseg_mode: 6,
                                preserve_interword_spaces: 1,
                                tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyzáéíóúÁÉÍÓÚüÜ0123456789.,:-$()/ '
                            });

                            if (!result || !result.data || !result.data.text || result.data.text.trim().length === 0) {
                                throw new Error(`Error en el procesamiento OCR del recibo ${index + 1}: No hay texto extraído`);
                            }

                            console.log(`📝 Texto extraído del recibo ${index + 1} (${result.data.text.length} caracteres)`);

                            const classification = classifier.classifyDocument(result.data.text);
                            const extractedFields = classification.extractedFields || {};

                            console.log(`✅ Campos extraídos del recibo ${index + 1}:`, {
                                cliente: extractedFields.cliente,
                                monto: extractedFields.monto,
                                fecha: extractedFields.fecha_contrato
                            });

                            const missingFields = [];
                            if (!extractedFields.cliente) missingFields.push('Cliente no detectado');
                            if (!extractedFields.monto) missingFields.push('Monto no detectado');
                            if (!extractedFields.fecha_contrato) missingFields.push('Fecha no detectada');

                            if (missingFields.length > 0) {
                                return {
                                    success: true,
                                    fileUrl: `/uploads/${path.basename(receipt.path)}`,
                                    originalName: `${file.originalname}_receipt_${index + 1}`,
                                    size: file.size,
                                    type: file.mimetype,
                                    metadata: {
                                        sucursal,
                                        bloque,
                                        caja,
                                        timestamp: new Date().toISOString(),
                                        isPartOfMultipleReceipts: true,
                                        receiptIndex: index + 1,
                                        totalReceipts: detectedReceipts.length
                                    },
                                    ocrResults: {
                                        ...extractedFields,
                                        classification,
                                        confidence: result.data.confidence || 0,
                                        text: result.data.text
                                    },
                                    errors: missingFields,
                                    needsReview: true
                                };
                            }

                            return {
                                success: true,
                                fileUrl: `/uploads/${path.basename(receipt.path)}`,
                                originalName: `${file.originalname}_receipt_${index + 1}`,
                                size: file.size,
                                type: file.mimetype,
                                metadata: {
                                    sucursal,
                                    bloque,
                                    caja,
                                    timestamp: new Date().toISOString(),
                                    isPartOfMultipleReceipts: true,
                                    receiptIndex: index + 1,
                                    totalReceipts: detectedReceipts.length
                                },
                                ocrResults: {
                                    ...extractedFields,
                                    classification,
                                    confidence: result.data.confidence || 0,
                                    text: result.data.text
                                }
                            };
                        } catch (error) {
                            console.error(`❌ Error procesando recibo ${index + 1} de ${file.originalname}:`, error.message);
                            return {
                                success: false,
                                fileUrl: `/uploads/${path.basename(receipt.path)}`,
                                originalName: `${file.originalname}_receipt_${index + 1}`,
                                error: error.message
                            };
                        }
                    }));

                    // Aplanar el array de resultados para que sea consistente con el formato esperado
                    return receiptResults;
                }

                // Si es una sola imagen
                // Usar el path original del archivo para una sola imagen
                const processedImagePath = file.path;

                const result = await workerPool.processImage(processedImagePath, {
                    tessedit_pageseg_mode: 6,
                    preserve_interword_spaces: 1,
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyzáéíóúÁÉÍÓÚüÜ0123456789.,:-$()/ '
                });

                if (!result || !result.data || !result.data.text) {
                    throw new Error('Error en el procesamiento OCR: no hay resultados');
                }

                // Clasificar el documento usando solo classifyDocument (ya extrae campos automáticamente)
                const classification = classifier.classifyDocument(result.data.text);
                const extractedFields = classification.extractedFields || {};

                // Preparar los resultados finales
                const ocrResults = {
                    ...extractedFields,
                    classification,
                    confidence: result.data.confidence || 0,
                    text: result.data.text
                };

                return {
                    success: true,
                    fileUrl: `/uploads/${path.basename(file.path)}`,
                    originalName: file.originalname,
                    size: file.size,
                    type: file.mimetype,
                    metadata: {
                        sucursal,
                        bloque,
                        caja,
                        timestamp: new Date().toISOString()
                    },
                    ocrResults
                };
            } catch (error) {
                console.error(`❌ Error procesando archivo ${file.originalname}:`, error);
                return {
                    success: false,
                    originalName: file.originalname,
                    error: error.message
                };
            }
        }));

        // Aplanar los resultados si hay múltiples recibos por imagen
        const flattenedResults = results.flatMap(result => {
            if (Array.isArray(result)) {
                // Si es un array de resultados (múltiples recibos de una imagen)
                console.log(`📋 Aplanando ${result.length} recibos de una imagen`);
                return result;
            }
            // Si es un solo resultado
            return [result];
        });

        console.log(`📊 Total de resultados después del aplanado: ${flattenedResults.length}`);

        // ✋ NO GUARDAR AUTOMÁTICAMENTE - Solo devolver los datos extraídos para validación manual
        const extractedResults = flattenedResults.filter(r => r.success).map(r => {
            return {
                ...r.ocrResults,
                sucursal: r.metadata.sucursal,
                bloque: r.metadata.bloque,
                caja: r.metadata.caja,
                originalFileName: r.originalName,
                errors: r.errors || [],
                needsReview: r.needsReview || false
            };
        });

        const batchProcessingTime = Date.now() - batchStartTime;
        const totalSuccessful = extractedResults.length;
        const failedFiles = flattenedResults.filter(r => !r.success).map(r => r.originalName);

        res.json({
            success: true,
            needsValidation: true,
            validationData: extractedResults,
            processingTime: batchProcessingTime,
            totalFiles: req.files.length,
            totalReceipts: flattenedResults.length,
            successfulReceipts: totalSuccessful,
            failedReceipts: flattenedResults.length - totalSuccessful,
            failedReceiptNames: failedFiles
        });

    } catch (error) {
        console.error("❌ Error en procesamiento por lotes:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/ocr/health
 * @desc Verificar estado del servicio OCR
 */
router.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        ocr: {
            active: workerPool?.isInitialized || false,
            workers: workerPool?.workers?.length || 0,
            config: tesseractConfig
        }
    });
});

// 📋 Nueva ruta para confirmar y guardar datos después de validación manual
router.post('/confirm-batch', async (req, res) => {
    try {
        console.log('✅ Confirmando datos validados manualmente');
        const { validatedData } = req.body;

        if (!validatedData || !Array.isArray(validatedData)) {
            return res.status(400).json({
                success: false,
                error: 'Datos de validación requeridos'
            });
        }

        const savedRecords = [];
        const errorRecords = [];

        // Guardar cada registro validado
        for (const record of validatedData) {
            try {
                await databaseService.insertarDatosExtraidos(record);
                savedRecords.push({
                    ...record,
                    saved: true
                });
                console.log('✅ [CONFIRM-BATCH] Datos guardados en BD para:', record.originalFileName);
            } catch (error) {
                console.error('❌ Error guardando en BD:', record.originalFileName, error.message);
                errorRecords.push({
                    ...record,
                    saved: false,
                    error: error.message
                });
            }
        }

        return res.json({
            success: true,
            message: `Guardado completado: ${savedRecords.length}/${validatedData.length} registros exitosos`,
            savedCount: savedRecords.length,
            errorCount: errorRecords.length,
            savedRecords: savedRecords,
            errorRecords: errorRecords
        });

    } catch (error) {
        console.error("❌ Error en confirmación de lote:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Limpiar recursos al cerrar
process.on("SIGINT", async () => {
    console.log("\n🔄 Recibida señal SIGINT, cerrando workers...");
    if (scheduler) {
        await scheduler.terminate();
        console.log("✅ Workers cerrados");
    }
    process.exit(0);
});

// Endpoint para obtener documentos procesados recientemente
router.get('/documents', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Obtener documentos de la base de datos
    const documents = await databaseService.getRecentDocuments(limit);

    res.json({
      success: true,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Inicializar servicios al arrancar
Promise.all([
    initializeWorkerPool(),
    initImageProcessor()
]).catch(error => {
    console.error("❌ Error en la inicialización:", error);
});

export default router;
