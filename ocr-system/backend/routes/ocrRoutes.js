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
import ProcessingProgressTracker from '../services/processingProgressTracker.js';
import autoCleanupService from '../services/autoCleanupService.js';

const databaseService = new DatabaseService();
const batchProcessor = new BatchProcessor();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const classifier = new DocumentClassifier();
let imageProcessor = null;

// 📊 Inicializar el tracker de progreso
let progressTracker = null;

// Función para establecer el tracker de progreso (se llama desde server.js)
export const setProgressTracker = (tracker) => {
    progressTracker = tracker;
    console.log('📊 ProgressTracker establecido en ocrRoutes.js');
};

// 🧹 Función utilitaria para limpiar archivos después de procesamiento exitoso
const cleanupFiles = async (filePaths, source = 'unknown') => {
    const cleaned = [];
    const errors = [];
    
    for (const filePath of filePaths) {
        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                cleaned.push(filePath);
                console.log(`🗑️  [${source}] Archivo eliminado exitosamente: ${path.basename(filePath)}`);
            } else {
                console.log(`⚠️  [${source}] Archivo no encontrado para eliminar: ${path.basename(filePath)}`);
            }
        } catch (error) {
            console.error(`❌ [${source}] Error eliminando archivo ${path.basename(filePath)}:`, error.message);
            errors.push({ file: filePath, error: error.message });
        }
    }
    
    return { cleaned, errors };
};

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

// 🎯 CONFIGURACIÓN INTELIGENTE Y ADAPTATIVA DE TESSERACT 
const tesseractConfig = {
    // Segmentación de página - optimizada para recibos
    tessedit_pageseg_mode: 6, // Bloque uniforme de texto (funciona bien)
    
    // Lista de caracteres completa y específica para recibos mexicanos
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$%#',
    
    // Configuraciones optimizadas para texto de recibos
    preserve_interword_spaces: 1,
    tessedit_create_hocr: 0,
    tessedit_create_tsv: 0,
    
    // Diccionarios activados para mejor reconocimiento
    load_system_dawg: 1,
    load_freq_dawg: 1, 
    load_unambig_dawg: 1,
    load_punc_dawg: 1,
    load_number_dawg: 1,
    load_bigram_dawg: 1,
    
    // Motor OCR LSTM para mejor precisión en formularios
    tessedit_ocr_engine_mode: 1, // LSTM Neural Network (mejor para texto formateado)
    
    // Configuraciones específicas para mejorar la detección de texto corrupto
    tessedit_adapt_to_char_wh: 1, // Adaptar al ancho/alto de caracteres
    tessedit_good_quality_unrej: 1, // Rechazar menos caracteres de buena calidad
    
    // Mejoras para texto de baja calidad (como el recibo 1)
    textord_min_linesize: 1.25, // Tamaño mínimo de línea más flexible
    textord_excess_blobsize: 1.3, // Más tolerancia para blobs de texto
    
    // Configuración de confianza más flexible
    tessedit_reject_mode: 0, // No rechazar automáticamente
    tessedit_zero_rejection: 1 // Aceptar más texto de baja confianza
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
    
    // Obtener instancias del sistema de progreso
    const progressTracker = req.app.get('progressTracker');
    const io = req.app.get('io');
    
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
        const { sucursal, bloque, caja, sessionId } = req.body;
        if (!sucursal || !bloque || !caja) {
            throw new Error("Faltan parámetros requeridos (sucursal, bloque, caja)");
        }

        // Crear sesión de progreso para archivo individual
        const currentSessionId = sessionId || `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        progressTracker.startSession(currentSessionId, 1, [req.file.size]);

        console.log("📄 Archivo recibido:", {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
            sucursal,
            bloque,
            caja
        });

        // 🔍 LOG DETALLADO: Información completa del archivo
        console.log(`📊 === INICIO PROCESAMIENTO OCR COMPLETO ===`);
        console.log(`📁 Archivo original: ${req.file.originalname}`);
        console.log(`💾 Tamaño: ${(req.file.size / 1024).toFixed(2)} KB`);
        console.log(`🎭 Tipo MIME: ${req.file.mimetype}`);
        console.log(`📍 Ruta temporal: ${req.file.path}`);
        console.log(`⚙️ Configuración: Sucursal=${sucursal}, Bloque=${bloque}, Caja=${caja}`);

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

        // 📊 Actualizar progreso: Inicio de preprocesamiento
        progressTracker.updateStageProgress(currentSessionId, 'upload', 0, {
            fileName: req.file.originalname,
            stageStartTime: startTime
        });

        try {
            // Inicializar imageProcessor si no está listo
            if (!imageProcessor) {
                console.log(`🔧 ImageProcessor es null, inicializando...`);
                await initImageProcessor();
                console.log(`✅ ImageProcessor inicializado correctamente`);
            } else {
                console.log(`✅ ImageProcessor ya está disponible`);
            }

            // 📊 Actualizar progreso: Inicio de preprocesamiento
            const preprocessingStart = Date.now();
            progressTracker.updateStageProgress(currentSessionId, 'preprocessing', 0, {
                fileName: req.file.originalname,
                stageStartTime: preprocessingStart
            });

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

                    // 📊 Actualizar progreso: Iniciando preprocesamiento de recibo
                    if (progressTracker) {
                        progressTracker.updateStageProgress(currentSessionId, 'preprocessing', 0, {
                            fileName: req.file.originalname,
                            currentReceipt: receipt.index,
                            totalReceipts: receipt.total
                        });
                    }

                    // Pre-procesar imagen para mejor calidad
                    let processedImagePath;
                    
                    // Aplicar preprocessing específico según tipo de documento
                    if (documentType === 'contrato') {
                        console.log('🔥 DEBUG: Detectado contrato, aplicando preprocessing AGRESIVO...');
                        console.log(`🔥 DEBUG: Ruta de imagen: ${receipt.path}`);
                        
                        try {
                            // Primero aplicar preprocessing agresivo para contratos
                            const enhancedPath = await imageProcessor.aggressiveContractPreprocessing(receipt.path, {
                                enhanceContrast: true,
                                reduceNoise: true, 
                                sharpenText: true,
                                adaptiveThreshold: false, // Desactivado por compatibilidad
                                morphological: false      // Desactivado por compatibilidad
                            });
                            
                            console.log(`✅ DEBUG: Preprocessing agresivo completado, archivo mejorado: ${enhancedPath}`);
                            
                            // Luego aplicar rotación automática al resultado mejorado
                            const processedImageResult = await imageProcessor.autoRotateImage(enhancedPath);
                            processedImagePath = processedImageResult.processedPath || enhancedPath;
                            
                            console.log('✅ Preprocessing agresivo completado para contrato');
                        } catch (error) {
                            console.error('❌ ERROR en preprocessing agresivo, usando normal:', error.message);
                            // Fallback a procesamiento normal si falla
                            const processedImageResult = await imageProcessor.autoRotateImage(receipt.path);
                            processedImagePath = processedImageResult.processedPath;
                        }
                    } else {
                        console.log('🔍 DEBUG: Detectado recibo, usando procesamiento normal...');
                        // Para recibos usar procesamiento normal
                        const processedImageResult = await imageProcessor.autoRotateImage(receipt.path);
                        processedImagePath = processedImageResult.processedPath;
                    }

                    // 📊 Actualizar progreso: Preprocesamiento completado, iniciando OCR
                    if (progressTracker) {
                        progressTracker.updateStageProgress(currentSessionId, 'ocr', 0, {
                            fileName: req.file.originalname,
                            currentReceipt: receipt.index,
                            totalReceipts: receipt.total
                        });
                    }

                    // Validar archivo procesado
                    const processedStats = fs.statSync(processedImagePath);
                    if (processedStats.size === 0) {
                        throw new Error(`Error en el pre-procesamiento del recibo ${receipt.index}: imagen resultante vacía`);
                    }

                    // Obtener worker disponible del pool
                    const workerPool = getWorkerPool();
                    const { data } = await workerPool.processImage(processedImagePath, tesseractConfig);

                    // 🔍 LOG DETALLADO: Texto extraído por OCR
                    console.log('\n🔥🔥🔥 ANGEL - AQUÍ ESTÁ TODO LO QUE LEYÓ EL OCR 🔥🔥🔥');
                    console.log(`📝 ════════ TEXTO EXTRAÍDO POR OCR (Recibo ${receipt.index}) ════════`);
                    console.log(`📊 Confianza OCR: ${data.confidence || 'N/A'}%`);
                    console.log(`📄 Longitud del texto: ${data.text ? data.text.length : 0} caracteres`);
                    console.log(`� TEXTO COMPLETO QUE ESCANEÓ:`);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log(data.text);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log(`📝 ════════ FIN TEXTO OCR (Recibo ${receipt.index}) ════════\n`);

                    if (!data || !data.text) {
                        console.warn(`⚠️ Error en OCR del recibo ${receipt.index}: no se pudo extraer texto`);
                        continue;
                    }

                    // Clasificar documento y extraer campos
                    const classification = classifier.classifyDocument(data.text);

                    // 📊 Actualizar progreso: Clasificación completada, iniciando extracción
                    if (progressTracker) {
                        const classificationProgress = Math.floor(((receipt.index) / receipt.total) * 70); // 70% para clasificación
                        progressTracker.updateStageProgress(currentSessionId, 'classification', classificationProgress, {
                            fileName: req.file.originalname,
                            currentReceipt: receipt.index,
                            totalReceipts: receipt.total,
                            documentType: classification.documentType
                        });
                        
                        progressTracker.updateStageProgress(currentSessionId, 'extraction', 0, {
                            fileName: req.file.originalname,
                            currentReceipt: receipt.index,
                            totalReceipts: receipt.total
                        });
                    }

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

                // 📊 Actualizar progreso: Completar todas las etapas
                if (progressTracker) {
                    progressTracker.updateStageProgress(currentSessionId, 'extraction', 100, {
                        fileName: req.file.originalname,
                        totalReceipts: allResults.length
                    });
                    progressTracker.updateStageProgress(currentSessionId, 'validation', 100, {
                        fileName: req.file.originalname,
                        totalReceipts: allResults.length
                    });
                    progressTracker.completeFile(currentSessionId, 0, processingTime, true);
                    progressTracker.completeSession(currentSessionId);
                }

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
            const imagePath = detectedReceipts[0].path || req.file.path;
            console.log(`📍 Ruta de imagen a procesar: ${imagePath}`);
            
            if (!imagePath) {
                throw new Error('No se pudo determinar la ruta de la imagen a procesar');
            }

            // 📊 Actualizar progreso: Inicio de OCR
            const ocrStart = Date.now();
            progressTracker.updateStageProgress(currentSessionId, 'preprocessing', 0, {
                fileName: req.file.originalname,
                stageStartTime: preprocessingStart
            });
            progressTracker.updateStageProgress(currentSessionId, 'ocr', 0, {
                fileName: req.file.originalname,
                stageStartTime: ocrStart
            });

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

            // 📊 Actualizar progreso: OCR completado, inicio de clasificación
            const classificationStart = Date.now();
            progressTracker.updateStageProgress(currentSessionId, 'ocr', 0, {
                fileName: req.file.originalname,
                stageStartTime: ocrStart
            });
            progressTracker.updateStageProgress(currentSessionId, 'classification', 0, {
                fileName: req.file.originalname,
                stageStartTime: classificationStart
            });

            // 🔍 LOG DETALLADO: Texto extraído por OCR (documento único)
            console.log('\n🔥🔥🔥 ANGEL - AQUÍ ESTÁ TODO LO QUE LEYÓ EL OCR 🔥🔥🔥');
            console.log(`📝 ════════ TEXTO EXTRAÍDO POR OCR (DOCUMENTO ÚNICO) ════════`);
            console.log(`📊 Confianza OCR: ${data.confidence || 'N/A'}%`);
            console.log(`📄 Longitud del texto: ${data.text ? data.text.length : 0} caracteres`);
            console.log(`� TEXTO COMPLETO QUE ESCANEÓ:`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(data.text);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📝 ════════ FIN TEXTO OCR (DOCUMENTO ÚNICO) ════════\n`);

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

            // 📊 Actualizar progreso: Clasificación completada, inicio de extracción
            const extractionStart = Date.now();
            progressTracker.updateStageProgress(currentSessionId, 'classification', 0, {
                fileName: req.file.originalname,
                stageStartTime: classificationStart
            });
            progressTracker.updateStageProgress(currentSessionId, 'extraction', 0, {
                fileName: req.file.originalname,
                stageStartTime: extractionStart
            });

            // 📊 Actualizar progreso: Extracción completada, inicio de validación
            const validationStart = Date.now();
            progressTracker.updateStageProgress(currentSessionId, 'extraction', 0, {
                fileName: req.file.originalname,
                stageStartTime: extractionStart
            });
            progressTracker.updateStageProgress(currentSessionId, 'validation', 0, {
                fileName: req.file.originalname,
                stageStartTime: validationStart
            });

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
                processingTime,
                // 🔍 INFORMACIÓN COMPLETA PARA LOGS EN EL FRONTEND
                debugInfo: {
                    originalText: data.text,
                    ocrConfidence: data.confidence,
                    textLength: data.text ? data.text.length : 0,
                    documentType: classification.type,
                    classificationConfidence: classification.confidence,
                    extractedFields: extractedFields,
                    processingSteps: [
                        `📄 Archivo procesado: ${req.file.originalname}`,
                        `🔍 Texto extraído: ${data.text ? data.text.length : 0} caracteres`,
                        `📊 Confianza OCR: ${data.confidence || 'N/A'}`,
                        `📋 Tipo detectado: ${classification.type}`,
                        `⚡ Tiempo de procesamiento: ${processingTime}ms`,
                        `✅ Campos extraídos: ${Object.keys(extractedFields).join(', ')}`
                    ]
                }
            };

            // 📊 Finalizar progreso: Archivo completamente procesado
            if (progressTracker) {
                progressTracker.updateStageProgress(currentSessionId, 'validation', 100, {
                    fileName: req.file.originalname,
                    stageStartTime: validationStart
                });
                progressTracker.completeFile(currentSessionId, 0, processingTime, true);
                progressTracker.completeSession(currentSessionId);
            }

            console.log("✅ Documento procesado (SOLO extracción, sin guardar en BD):", {
                tipo: classification.type,
                confianza: data.confidence,
                campos: Object.keys(extractedFields),
                sessionId: currentSessionId
            });

            // Agregar información de sesión a la respuesta
            response.sessionId = currentSessionId;
            response.progressStats = progressTracker.getProgressStats(currentSessionId);

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
    
    // Obtener instancias del sistema de progreso
    const progressTracker = req.app.get('progressTracker');
    const io = req.app.get('io');
    
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
        const { sucursal, bloque, caja, sessionId } = req.body;
        if (!sucursal || !bloque || !caja) {
            throw new Error("Faltan parámetros requeridos (sucursal, bloque, caja)");
        }

        // Crear sesión de progreso para lote
        const currentSessionId = sessionId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileSizes = req.files.map(file => file.size);
        progressTracker.startSession(currentSessionId, req.files.length, fileSizes);

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

        // Procesar archivos secuencialmente para mejor seguimiento de progreso
        const results = [];
        for (let fileIndex = 0; fileIndex < req.files.length; fileIndex++) {
            const file = req.files[fileIndex];
            const fileStartTime = Date.now();
            
            // 📊 Actualizar progreso: Inicio de archivo
            progressTracker.updateStageProgress(currentSessionId, 'upload', fileIndex, {
                fileName: file.originalname,
                stageStartTime: fileStartTime
            });

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
                    console.log(`🔍 MÚLTIPLES RECIBOS DETECTADOS: ${detectedReceipts.length} recibos en ${file.originalname}`);

                    // 📊 Actualizar progreso: Inicio de procesamiento de múltiples recibos
                    progressTracker.updateStageProgress(currentSessionId, 'preprocessing', fileIndex, {
                        fileName: file.originalname,
                        message: `Procesando ${detectedReceipts.length} recibos encontrados`
                    });

                    // Procesar cada recibo individualmente
                    const receiptResults = await Promise.all(detectedReceipts.map(async (receipt, index) => {
                        try {
                            console.log(`📄 Procesando recibo ${index + 1} de ${detectedReceipts.length} de la imagen ${file.originalname}`);
                            console.log(`📁 Ruta del recibo: ${receipt.path}`);

                            // 📊 Actualizar progreso para múltiples recibos: OCR
                            progressTracker.updateStageProgress(currentSessionId, 'ocr', fileIndex, {
                                fileName: `${file.originalname} (recibo ${index + 1}/${detectedReceipts.length})`,
                                message: `Procesando recibo ${index + 1} de ${detectedReceipts.length}`
                            });

                            const result = await workerPool.processImage(receipt.path, {
                                tessedit_pageseg_mode: 6,
                                preserve_interword_spaces: 1,
                                tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyzáéíóúÁÉÍÓÚüÜ0123456789.,:-$()/ '
                            });

                            if (!result || !result.data || !result.data.text || result.data.text.trim().length === 0) {
                                throw new Error(`Error en el procesamiento OCR del recibo ${index + 1}: No hay texto extraído`);
                            }

                            console.log(`📝 Texto extraído del recibo ${index + 1} (${result.data.text.length} caracteres)`);

                            // 📊 Actualizar progreso: Classification para múltiples recibos
                            progressTracker.updateStageProgress(currentSessionId, 'classification', fileIndex, {
                                fileName: `${file.originalname} (recibo ${index + 1}/${detectedReceipts.length})`,
                                message: `Clasificando recibo ${index + 1} de ${detectedReceipts.length}`
                            });

                            const classification = classifier.classifyDocument(result.data.text);
                            const extractedFields = classification.extractedFields || {};

                            // 📊 Actualizar progreso: Extraction para múltiples recibos
                            progressTracker.updateStageProgress(currentSessionId, 'extraction', fileIndex, {
                                fileName: `${file.originalname} (recibo ${index + 1}/${detectedReceipts.length})`,
                                message: `Extrayendo campos del recibo ${index + 1}`
                            });

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
                                // 📊 Actualizar progreso: Recibo con campos faltantes
                                progressTracker.updateStageProgress(currentSessionId, 'validation', fileIndex, {
                                    fileName: `${file.originalname} (recibo ${index + 1}/${detectedReceipts.length})`,
                                    message: `Recibo ${index + 1} - Requiere revisión manual`
                                });

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

                            // 📊 Actualizar progreso: Recibo completado exitosamente
                            progressTracker.updateStageProgress(currentSessionId, 'validation', fileIndex, {
                                fileName: `${file.originalname} (recibo ${index + 1}/${detectedReceipts.length})`,
                                message: `Recibo ${index + 1} de ${detectedReceipts.length} completado exitosamente`
                            });

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
                    const multipleReceiptsResult = receiptResults;
                    
                    // 📊 Marcar archivo como completado después de procesar todos los recibos
                    const fileProcessingTime = Date.now() - fileStartTime;
                    progressTracker.completeFile(currentSessionId, fileIndex, fileProcessingTime, true);
                    
                    results.push(multipleReceiptsResult);
                    continue; // Saltar al siguiente archivo
                }

                // Si es una sola imagen
                // Usar el path original del archivo para una sola imagen
                const processedImagePath = file.path;

                // 📊 Actualizar progreso: Preprocessing
                progressTracker.updateStageProgress(currentSessionId, 'preprocessing', fileIndex, {
                    fileName: file.originalname,
                    message: 'Preparando imagen para OCR'
                });

                // 📊 Actualizar progreso: OCR
                progressTracker.updateStageProgress(currentSessionId, 'ocr', fileIndex, {
                    fileName: file.originalname,
                    message: 'Extrayendo texto de la imagen'
                });

                const result = await workerPool.processImage(processedImagePath, {
                    tessedit_pageseg_mode: 6,
                    preserve_interword_spaces: 1,
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyzáéíóúÁÉÍÓÚüÜ0123456789.,:-$()/ '
                });

                if (!result || !result.data || !result.data.text) {
                    throw new Error('Error en el procesamiento OCR: no hay resultados');
                }

                // 📊 Actualizar progreso: Classification
                progressTracker.updateStageProgress(currentSessionId, 'classification', fileIndex, {
                    fileName: file.originalname,
                    message: 'Clasificando tipo de documento'
                });

                // Clasificar el documento usando solo classifyDocument (ya extrae campos automáticamente)
                const classification = classifier.classifyDocument(result.data.text);
                const extractedFields = classification.extractedFields || {};

                // 📊 Actualizar progreso: Extraction
                progressTracker.updateStageProgress(currentSessionId, 'extraction', fileIndex, {
                    fileName: file.originalname,
                    message: 'Extrayendo campos específicos'
                });

                // 📊 Actualizar progreso: Validation
                progressTracker.updateStageProgress(currentSessionId, 'validation', fileIndex, {
                    fileName: file.originalname,
                    message: 'Validando datos extraídos'
                });

                // Preparar los resultados finales
                const ocrResults = {
                    ...extractedFields,
                    classification,
                    confidence: result.data.confidence || 0,
                    text: result.data.text
                };

                const fileResult = {
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

                // 📊 Marcar archivo como completado
                const fileProcessingTime = Date.now() - fileStartTime;
                progressTracker.completeFile(currentSessionId, fileIndex, fileProcessingTime, true);
                
                results.push(fileResult);
                
            } catch (error) {
                console.error(`❌ Error procesando archivo ${file.originalname}:`, error);
                
                // 📊 Marcar archivo como fallido
                const fileProcessingTime = Date.now() - fileStartTime;
                progressTracker.updateStageProgress(currentSessionId, 'validation', fileIndex, {
                    fileName: file.originalname,
                    error: error
                });
                progressTracker.completeFile(currentSessionId, fileIndex, fileProcessingTime, false);
                
                const errorResult = {
                    success: false,
                    originalName: file.originalname,
                    error: error.message
                };
                results.push(errorResult);
            }
        }

        // 📊 Finalizar sesión de progreso
        progressTracker.completeSession(currentSessionId);

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
            failedReceiptNames: failedFiles,
            sessionId: currentSessionId,
            progressStats: progressTracker.getProgressStats(currentSessionId)
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

        // 🧹 Limpiar archivos automáticamente después del guardado exitoso
        let cleanupResults = { cleaned: [], errors: [] };
        if (savedRecords.length > 0) {
            try {
                // Extraer rutas de archivos de los registros guardados exitosamente
                const filesToClean = savedRecords
                    .filter(record => record.originalFileName)
                    .map(record => path.join(__dirname, '../../uploads', record.originalFileName))
                    .filter(filePath => fs.existsSync(filePath));
                
                if (filesToClean.length > 0) {
                    cleanupResults = await autoCleanupService.cleanupImmediately(filesToClean, 'CONFIRM-BATCH');
                    console.log(`🧹 [CONFIRM-BATCH] Limpieza automática completada: ${cleanupResults.cleaned.length}/${filesToClean.length} archivos eliminados`);
                }
            } catch (cleanupError) {
                console.error('❌ [CONFIRM-BATCH] Error en limpieza automática:', cleanupError.message);
            }
        }

        return res.json({
            success: true,
            message: `Guardado completado: ${savedRecords.length}/${validatedData.length} registros exitosos`,
            savedCount: savedRecords.length,
            errorCount: errorRecords.length,
            savedRecords: savedRecords,
            errorRecords: errorRecords,
            cleanup: {
                filesDeleted: cleanupResults.cleaned.length,
                deletionErrors: cleanupResults.errors.length,
                details: cleanupResults
            }
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

// 🧹 Endpoint para limpieza manual completa
router.delete('/cleanup/uploads', async (req, res) => {
    try {
        const { forceAll = false, maxAgeHours = 2 } = req.body;
        
        console.log(`🧹 Iniciando limpieza manual${forceAll ? ' completa' : ` de archivos > ${maxAgeHours}h`}...`);
        
        const results = await autoCleanupService.manualCleanup({
            forceAll,
            maxAge: maxAgeHours * 60 * 60 * 1000 // Convertir horas a milisegundos
        });
        
        const totalDeleted = results.oldFiles.deletedCount + results.orphans.deletedCount + results.storage.deletedCount;
        
        res.json({
            success: true,
            message: `Limpieza manual completada: ${totalDeleted} archivos eliminados`,
            results: {
                oldFiles: {
                    deleted: results.oldFiles.deletedCount,
                    errors: results.oldFiles.errors.length
                },
                orphans: {
                    deleted: results.orphans.deletedCount,
                    errors: results.orphans.errors.length
                },
                storage: {
                    deleted: results.storage.deletedCount,
                    currentSizeMB: results.storage.currentSizeMB
                }
            },
            totalDeleted
        });
        
    } catch (error) {
        console.error('❌ Error en limpieza manual:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 📊 Endpoint para estadísticas de uploads y configuración de limpieza
router.get('/uploads/stats', async (req, res) => {
    try {
        const stats = await autoCleanupService.getStats();
        const config = autoCleanupService.getConfig();
        
        res.json({
            success: true,
            stats,
            config: {
                maxFileAgeHours: Math.round(config.maxFileAge / (60 * 60 * 1000)),
                maxStorageSizeMB: config.maxStorageSize,
                cleanupEnabled: config.immediateCleanup,
                periodicCleanupMinutes: Math.round(config.periodicCleanupInterval / (60 * 1000))
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// �️ Endpoint para configurar la limpieza automática
router.put('/cleanup/config', async (req, res) => {
    try {
        const {
            maxFileAgeHours,
            maxStorageSizeMB,
            cleanupEnabled,
            periodicCleanupMinutes
        } = req.body;
        
        const newConfig = {};
        
        if (typeof maxFileAgeHours === 'number') {
            newConfig.maxFileAge = maxFileAgeHours * 60 * 60 * 1000; // Convertir a milisegundos
        }
        
        if (typeof maxStorageSizeMB === 'number') {
            newConfig.maxStorageSize = maxStorageSizeMB;
        }
        
        if (typeof cleanupEnabled === 'boolean') {
            newConfig.immediateCleanup = cleanupEnabled;
        }
        
        if (typeof periodicCleanupMinutes === 'number') {
            newConfig.periodicCleanupInterval = periodicCleanupMinutes * 60 * 1000; // Convertir a milisegundos
        }
        
        autoCleanupService.updateConfig(newConfig);
        const updatedConfig = autoCleanupService.getConfig();
        
        res.json({
            success: true,
            message: 'Configuración de limpieza actualizada',
            config: {
                maxFileAgeHours: Math.round(updatedConfig.maxFileAge / (60 * 60 * 1000)),
                maxStorageSizeMB: updatedConfig.maxStorageSize,
                cleanupEnabled: updatedConfig.immediateCleanup,
                periodicCleanupMinutes: Math.round(updatedConfig.periodicCleanupInterval / (60 * 1000))
            }
        });
        
    } catch (error) {
        console.error('❌ Error actualizando configuración de limpieza:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🧹 Endpoint para limpieza forzada completa (¡CUIDADO!)
router.delete('/cleanup/force-all', async (req, res) => {
    try {
        const { confirm } = req.body;
        
        if (confirm !== 'DELETE_ALL_FILES') {
            return res.status(400).json({
                success: false,
                error: 'Para confirmar la eliminación de TODOS los archivos, envía "confirm": "DELETE_ALL_FILES"'
            });
        }
        
        console.log('🚨 INICIANDO LIMPIEZA FORZADA COMPLETA - ELIMINANDO TODOS LOS ARCHIVOS');
        
        const results = await autoCleanupService.manualCleanup({ forceAll: true });
        const totalDeleted = results.oldFiles.deletedCount + results.orphans.deletedCount + results.storage.deletedCount;
        
        res.json({
            success: true,
            message: `¡LIMPIEZA COMPLETA EXITOSA! ${totalDeleted} archivos eliminados`,
            warning: 'Todos los archivos de uploads han sido eliminados',
            results
        });
        
    } catch (error) {
        console.error('❌ Error en limpieza forzada completa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// �📜 Sistema de logs en memoria para debugging
let recentLogs = [];
const MAX_LOGS = 100;

// Interceptar console.log para capturar logs
const originalConsoleLog = console.log;
console.log = (...args) => {
    // Agregar al array de logs recientes
    const logEntry = {
        timestamp: new Date().toISOString(),
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
        type: 'info'
    };
    
    recentLogs.unshift(logEntry);
    
    // Mantener solo los últimos MAX_LOGS
    if (recentLogs.length > MAX_LOGS) {
        recentLogs = recentLogs.slice(0, MAX_LOGS);
    }
    
    // Llamar al console.log original
    originalConsoleLog.apply(console, args);
};

// 📜 Endpoint para obtener logs recientes
router.get('/debug/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logsToReturn = recentLogs.slice(0, limit);
        
        res.json({
            success: true,
            logs: logsToReturn,
            totalLogs: recentLogs.length,
            maxLogs: MAX_LOGS
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 📜 Endpoint para limpiar logs
router.post('/debug/logs/clear', (req, res) => {
    try {
        recentLogs = [];
        res.json({
            success: true,
            message: 'Logs limpiados exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
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
