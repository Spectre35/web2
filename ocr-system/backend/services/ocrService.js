import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { pool } from '../../../config/database.js';
import path from 'path';
import fs from 'fs/promises';
import DocumentClassifier from './documentClassifier.js';
import ImageProcessor from './imageProcessor.js';
import GeometricWordSeparator from './geometricWordSeparator.js';

// ================= 🔍 SERVICIO PRINCIPAL DE OCR =================

class OCRService {
  constructor() {
    this.classifier = new DocumentClassifier();
    this.geometricSeparator = new GeometricWordSeparator();
    this.tesseractOptions = {
      logger: m => {
        if (m.status === 'recognizing text') {
          const progress = (m.progress * 100).toFixed(1);
          console.log(`📄 Tesseract: ${m.status} - ${progress}%`);
        } else {
          console.log(`📄 Tesseract: ${m.status} - ${(m.progress * 100).toFixed(1)}%`);
        }
      }
    };

    // Configuraciones optimizadas de Tesseract para mejor reconocimiento
    this.defaultTesseractConfig = {
      tessedit_pageseg_mode: 6, // Asume un solo bloque uniforme de texto
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$',
      preserve_interword_spaces: 1,
      tessedit_do_invert: 0,
      load_system_dawg: 1,
      load_freq_dawg: 1
    };

    // Configuraciones específicas para recibos de EUROPIEL - OPTIMIZADO PARA NOMBRES
    this.europielConfig = {
      tessedit_pageseg_mode: 6, // Un bloque uniforme de texto - MEJOR para nombres
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$',
      preserve_interword_spaces: 1,
      tessedit_create_hocr: 1,
      tessedit_create_tsv: 1,
      load_system_dawg: 1,
      load_freq_dawg: 1,
      load_unambig_dawg: 1,
      load_punc_dawg: 1,
      load_number_dawg: 1,
      load_bigram_dawg: 1,
      // 🎯 CONFIGURACIONES MEJORADAS PARA NOMBRES REALES
      tessedit_write_images: 0,
      // Diccionario con TODOS los nombres de los recibos reales
      user_words_suffix: 'EUROPIEL LASER CENTER SINERGIA TERESA IRASEMA POMPA MANDUJANO FLOR YANET ISLAS PIMENTEL NICOLE GUADALUPE RODRIGUEZ PEÑA CYNTHIA VERVER VARGAS ROMERO KARINA ELIZABETH CENTENO ADA YACUNAHIL JUAREZ OTERO ROSA MARIA HERNANDEZ ORTIZ MARIANA CESIN SASTRE ANTICIPO PAQUETE NUEVO TRANSACCION APROBADA',
      user_patterns_suffix: 'Q##-#### \\d{2}/\\d{2}/\\d{4} $#,###.##',
      // 🔧 MEJORAR DETECCIÓN DE CARACTERES
      classify_enable_learning: 1,
      classify_enable_adaptive_matcher: 1,
      textord_debug_tabfind: 0,
      // 🎯 CONFIGURACIÓN PARA TEXTO IMPRESO DE BUENA CALIDAD
      textord_straight_baselines: 1,  // Texto bien alineado
      textord_old_baselines: 0,       // Usar nueva detección
      wordrec_enable_assoc: 1,
      // 🚀 REDUCIR UMBRALES DE RECHAZO PARA CAPTURAR MÁS TEXTO
      tessedit_reject_doc_percent: 100,
      tessedit_reject_block_percent: 100,
      tessedit_reject_row_percent: 100,
      classify_min_certainty_factor: 0.1
    };

    // Patrones específicos de EUROPIEL para mejor reconocimiento
    this.europielPatterns = [
      'EUROPIEL',
      'LASER CENTER',
      'Recibo de Pago',
      'Folio:',
      'Fecha:',
      'Recibí de',
      'la cantidad de',
      'por concepto de',
      'Forma de Pago:',
      'TRANSACCION APROBADA',
      'Tarjeta',
      'Autorización',
      'Comercio',
      'ARQC',
      'Firma'
    ];

    // ⚡ INICIALIZAR FAST MODE POR DEFECTO
    this.configureImageEnhancements({ fastMode: true });
    console.log('⚡ OCRService inicializado con Fast Mode activado por defecto');
  }

  /**
   * Detectar si es un documento de EUROPIEL mediante análisis rápido
   */
  async detectDocumentType(imagePath) {
    try {
      // Análisis rápido con configuración básica
      const quickResult = await Tesseract.recognize(
        imagePath,
        'spa+eng',
        {
          logger: () => {}, // Sin logging para análisis rápido
          tessedit_pageseg_mode: 1,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
        }
      );

      const text = quickResult.data.text.toUpperCase();

      // Verificar patrones de EUROPIEL
      const isEuropiel = this.europielPatterns.some(pattern =>
        text.includes(pattern.toUpperCase())
      );

      console.log(`🔍 Tipo de documento detectado: ${isEuropiel ? 'EUROPIEL' : 'GENERAL'}`);

      return {
        type: isEuropiel ? 'europiel' : 'general',
        confidence: isEuropiel ? 0.9 : 0.5
      };
    } catch (error) {
      console.log('⚠️ Error en detección rápida, usando configuración general');
      return { type: 'general', confidence: 0.3 };
    }
  }

  /**
   * Procesar imagen con OCR
   */
  async processImage(imagePath, options = {}) {
    try {
      console.log(`🔍 Iniciando procesamiento OCR: ${imagePath}`);
      const startTime = Date.now();

      // 1. Detectar tipo de documento
      const docType = await this.detectDocumentType(imagePath);

      // 2. Preprocesar imagen para mejorar OCR
      const preprocessResult = await this.preprocessImage(imagePath, docType.type);
      const preprocessedPath = typeof preprocessResult === 'string' ? preprocessResult : preprocessResult.path;

      // 3. Intentar OCR con múltiples configuraciones para mejor precisión
      let bestResult = null;
      let bestConfidence = 0;
      let bestConfigName = '';

      const configurations = [
        {
          name: 'EUROPIEL_OPTIMIZED',
          config: docType.type === 'europiel' ? this.europielConfig : this.defaultTesseractConfig,
          language: 'spa+eng'
        },
        {
          name: 'HIGH_ACCURACY',
          config: {
            ...(docType.type === 'europiel' ? this.europielConfig : this.defaultTesseractConfig),
            tessedit_pageseg_mode: 6, // Bloque uniforme de texto
            tessedit_ocr_engine_mode: 1 // Neural network LSTM
          },
          language: 'spa+eng'
        },
        {
          name: 'SPARSE_TEXT_FALLBACK',
          config: {
            tessedit_pageseg_mode: 11, // Texto disperso
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?()-"\'áéíóúüñÁÉÍÓÚÜÑ/$Q',
            preserve_interword_spaces: 1
          },
          language: 'spa+eng'
        }
      ];

      console.log(`� Probando ${configurations.length} configuraciones de OCR...`);

      for (const config of configurations) {
        try {
          console.log(`🔧 Intentando configuración: ${config.name}...`);

          const ocrResult = await Tesseract.recognize(
            preprocessedPath,
            config.language,
            {
              ...this.tesseractOptions,
              ...config.config,
              ...options.tesseractConfig
            }
          );

          const confidence = ocrResult.data.confidence / 100;
          const textLength = ocrResult.data.text.trim().length;

          console.log(`� ${config.name}: Confianza: ${confidence.toFixed(2)}, Texto: ${textLength} chars`);

          // Evaluar calidad del resultado combinando confianza y características del texto
          const qualityScore = this.evaluateOCRQuality(ocrResult.data.text, confidence);

          if (qualityScore > bestConfidence && textLength > 0) {
            bestResult = ocrResult;
            bestConfidence = qualityScore;
            bestConfigName = config.name;
            console.log(`✨ Nueva mejor configuración: ${config.name} (Score: ${qualityScore.toFixed(2)})`);
          }

          // Si obtenemos un resultado excelente, podemos detenernos
          if (qualityScore > 0.85) {
            console.log(`🎉 Resultado excelente obtenido con ${config.name}`);
            break;
          }

        } catch (configError) {
          console.warn(`⚠️ Error en configuración ${config.name}:`, configError.message);
          continue;
        }
      }

      if (!bestResult) {
        throw new Error('Todas las configuraciones de OCR fallaron');
      }

      const ocrResult = bestResult;
      console.log(`🏆 Mejor configuración seleccionada: ${bestConfigName} (Score: ${bestConfidence.toFixed(2)})`);

      // 4. Procesar resultados
      const processingTime = Date.now() - startTime;

      // 5. Verificar calidad final del texto extraído
      const extractedText = ocrResult.data.text.trim();
      const finalConfidence = ocrResult.data.confidence / 100;

      console.log(`📊 Texto final extraído: ${extractedText.length} caracteres`);
      console.log(`📊 Confianza final: ${finalConfidence.toFixed(2)} (${finalConfidence >= 0.5 ? 'BUENA' : 'BAJA'})`);

      if (extractedText.length === 0) {
        throw new Error('No se pudo extraer texto del documento con ninguna configuración');
      }

      // 🎯 ANÁLISIS GEOMÉTRICO PARA MEJORAR SEPARACIÓN DE PALABRAS
      let geometricAnalysis = null;
      let finalText = ocrResult.data.text;

      if (options.useGeometricSeparation !== false) { // Por defecto habilitado
        try {
          console.log(`🎯 Iniciando análisis geométrico de espacios...`);

          geometricAnalysis = await this.geometricSeparator.analyzeWithBoundingBoxes(
            preprocessedPath,
            'spa+eng'
          );

          if (geometricAnalysis.spacesAdded > 0) {
            finalText = geometricAnalysis.correctedText;
            console.log(`✅ Separación geométrica: ${geometricAnalysis.spacesAdded} espacios agregados`);
            console.log(`📊 Análisis geométrico: ${geometricAnalysis.wordsAnalyzed} palabras analizadas`);
          } else {
            console.log(`ℹ️ Separación geométrica: No se requirieron espacios adicionales`);
          }

        } catch (geoError) {
          console.warn(`⚠️ Error en análisis geométrico (continuando con OCR estándar):`, geoError.message);
        }
      }

      const result = {
        text: finalText, // Usar texto corregido geométricamente si está disponible
        originalText: ocrResult.data.text, // Mantener texto original para referencia
        confidence: ocrResult.data.confidence / 100,
        words: ocrResult.data.words,
        lines: ocrResult.data.lines,
        paragraphs: ocrResult.data.paragraphs,
        boundingBoxes: this.extractBoundingBoxes(ocrResult.data),
        geometricAnalysis: geometricAnalysis, // Incluir análisis geométrico
        processingTime,
        preprocessedPath,
        bestConfiguration: bestConfigName,
        qualityScore: bestConfidence,
        documentType: docType.type
      };

      // 4. Clasificar el documento automáticamente usando texto corregido
      const classification = this.classifier.classifyDocument(finalText);
      result.classification = classification;

      console.log(`✅ OCR completado en ${processingTime}ms - Confianza: ${result.confidence.toFixed(2)}`);
      console.log(`🏷️ Documento clasificado como: ${classification.type} (${classification.confidence.toFixed(2)})`);

      if (geometricAnalysis && geometricAnalysis.spacesAdded > 0) {
        console.log(`🎯 Texto mejorado geométricamente - Espacios agregados: ${geometricAnalysis.spacesAdded}`);
      }
      return { success: true, data: result };

    } catch (error) {
      console.error('❌ Error en procesamiento OCR:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Evaluar la calidad de un resultado OCR
   * @param {string} text - Texto extraído por OCR
   * @param {number} confidence - Confianza del OCR (0-1)
   * @returns {number} Score de calidad combinado (0-1)
   */
  evaluateOCRQuality(text, confidence) {
    if (!text || text.length === 0) return 0;

    let score = confidence; // Empezar con la confianza base de Tesseract

    // Bonus por longitud de texto (más texto generalmente = mejor extracción)
    const lengthBonus = Math.min(text.length / 500, 0.2); // Max 0.2 bonus
    score += lengthBonus;

    // Bonus por detectar palabras clave específicas de EUROPIEL
    const europielKeywords = [
      'EUROPIEL', 'LASER', 'CENTER', 'SINERGIA', 'RECIBO', 'PAGO',
      'TRANSACCION', 'APROBADA', 'FOLIO', 'FECHA', 'CANTIDAD', 'CONCEPTO'
    ];
    const keywordsFound = europielKeywords.filter(keyword =>
      text.toUpperCase().includes(keyword)
    ).length;
    const keywordBonus = (keywordsFound / europielKeywords.length) * 0.15; // Max 0.15 bonus
    score += keywordBonus;

    // Bonus por detectar patrones típicos (fechas, montos, folios)
    const patterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/, // Fechas DD/MM/YYYY
      /Q\d{2}-\d{4}/, // Folios tipo Q22-5237
      /\$[\d,]+\.?\d*/, // Montos en pesos
      /\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/ // Números de tarjeta
    ];
    const patternsFound = patterns.filter(pattern => pattern.test(text)).length;
    const patternBonus = (patternsFound / patterns.length) * 0.1; // Max 0.1 bonus
    score += patternBonus;

    // Penalización por caracteres extraños o demasiados errores de OCR
    const strangeChars = (text.match(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,;:!?()$\-"'\/]/g) || []).length;
    const strangePenalty = Math.min(strangeChars / text.length * 2, 0.25); // Max 0.25 penalty
    score -= strangePenalty;

    // Penalización por texto muy fragmentado (muchos espacios o líneas vacías)
    const fragmentationRatio = (text.match(/\s{3,}|\n{2,}/g) || []).length / text.length * 100;
    const fragmentationPenalty = Math.min(fragmentationRatio, 0.15); // Max 0.15 penalty
    score -= fragmentationPenalty;

    // Bonus por estructura coherente (párrafos, líneas bien formadas)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const avgLineLength = lines.length > 0 ? text.length / lines.length : 0;
    if (avgLineLength > 20 && avgLineLength < 100) { // Longitud de línea razonable
      score += 0.05;
    }

    return Math.max(0, Math.min(1, score)); // Asegurar que esté entre 0 y 1
  }

  /**
   * Preprocesar imagen para mejorar calidad del OCR
   */
  async preprocessImage(imagePath) {
    try {
      console.log('� Iniciando preprocesamiento optimizado...');

      // USAR LAS NUEVAS FUNCIONALIDADES OPTIMIZADAS DE IMAGEPROCESSOR
      const processingOptions = {
        enableContrast: this.enhancementConfig?.enableContrast ?? true,
        enableOrientation: this.enhancementConfig?.enableOrientation ?? true,
        enableNoiseReduction: this.enhancementConfig?.enableNoiseReduction ?? true,
        keepIntermediateFiles: this.enhancementConfig?.keepIntermediateFiles ?? false
      };

      // Aplicar procesamiento completo optimizado
      const result = await ImageProcessor.optimizedFullProcessing(imagePath, processingOptions);

      if (result.error) {
        console.warn('⚠️ Error en procesamiento optimizado, usando imagen original:', result.error);
        return imagePath;
      }

      // Log de mejoras aplicadas
      console.log(`✅ Procesamiento completado en ${result.totalTime}ms`);
      console.log(`🎯 Mejoras aplicadas: ${result.improvements.join(', ')}`);

      // Verificar que el archivo procesado existe
      try {
        await fs.access(result.finalPath);
        console.log(`📁 Imagen procesada guardada: ${path.basename(result.finalPath)}`);
        return result.finalPath;
      } catch (accessError) {
        console.warn('⚠️ Archivo procesado no accesible, usando original');
        return imagePath;
      }

    } catch (error) {
      console.error('❌ Error crítico en preprocesamiento:', error);
      return imagePath; // Fallback a imagen original
    }
  }

  // MÉTODO DE RESPALDO - Preprocesamiento legacy por si falla el optimizado
  async fallbackPreprocessImage(imagePath) {
    try {
      console.log('🔄 Usando preprocesamiento de respaldo...');

      // PASO 1: Auto-rotación usando OpenCV.js
      let rotationResult;
      try {
        console.log('🎯 Aplicando auto-rotación con OpenCV...');
        rotationResult = await ImageProcessor.autoRotateImage(imagePath);

        if (rotationResult.rotated) {
          console.log(`✅ Imagen rotada ${rotationResult.rotationApplied}° (Score: ${(rotationResult.orientationScore * 100).toFixed(1)}%)`);

          // Guardar imagen rotada temporalmente
          const rotatedPath = imagePath.replace(/\.[^/.]+$/, '_rotated.png');
          await fs.writeFile(rotatedPath, rotationResult.buffer);
          imagePath = rotatedPath; // Usar imagen rotada para siguiente paso
        } else {
          console.log('ℹ️ No se detectó necesidad de rotación');
        }
      } catch (rotationError) {
        console.warn('⚠️ Error en auto-rotación, continuando sin rotar:', rotationError.message);
        rotationResult = { rotated: false, rotationApplied: 0, orientationScore: 0 };
      }

      // PASO 2: Preprocesamiento mejorado para documentos de calidad variable
      const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.png');

      // Obtener metadatos de la imagen para análisis
      const metadata = await sharp(imagePath).metadata();
      console.log(`📊 Imagen original: ${metadata.width}x${metadata.height}, calidad estimada: ${metadata.density || 'desconocida'}`);

      // Preprocesamiento adaptativo basado en calidad detectada
      let sharpProcessor = sharp(imagePath)
        .greyscale() // Convertir a escala de grises
        .normalise({ lower: 1, upper: 99 }) // Normalizar contraste más agresivo
        .modulate({
          brightness: 1.1, // Aumentar brillo ligeramente
          saturation: 0,   // Eliminar saturación completamente
          hue: 0
        })
        .gamma(1.2) // Ajuste de gamma para mejor contraste
        .sharpen({
          sigma: 1.5,    // Sharpening más agresivo
          flat: 1.5,
          jagged: 3
        });

      // Para imágenes de baja resolución, aplicar upscaling más agresivo
      if (metadata.width < 1500 || metadata.height < 1500) {
        console.log('📈 Aplicando upscaling para imagen de baja resolución...');
        sharpProcessor = sharpProcessor.resize({
          width: Math.max(3000, metadata.width * 2),
          height: Math.max(4000, metadata.height * 2),
          fit: 'inside',
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3
        });
      } else {
        // Para imágenes de buena resolución, resize más conservador
        sharpProcessor = sharpProcessor.resize({
          width: 3000,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3
        });
      }

      // Aplicar threshold adaptativo para binarización
      await sharpProcessor
        .threshold(120, { greyscale: false }) // Threshold más bajo para capturar texto tenue
        .png({
          compressionLevel: 0,
          quality: 100,
          progressive: false
        })
        .toFile(outputPath);

      console.log(`🖼️ Imagen preprocesada con mejoras adaptativas: ${outputPath}`);

      // Retornar información del preprocesamiento
      return {
        path: outputPath,
        rotationApplied: rotationResult.rotated,
        rotationDegrees: rotationResult.rotationApplied,
        orientationScore: rotationResult.orientationScore
      };
    } catch (error) {
      console.error('❌ Error preprocesando imagen:', error);
      return {
        path: imagePath, // Usar imagen original si falla el preprocesamiento
        rotationApplied: false,
        rotationDegrees: 0,
        orientationScore: 0
      };
    }
  }

  /**
   * 🎛️ CONFIGURAR MEJORAS DE PROCESAMIENTO
   * Permite habilitar/deshabilitar mejoras específicas según necesidad
   * @param {Object} config - Configuración de mejoras
   * @returns {Object} Configuración aplicada
   */
  configureImageEnhancements(config = {}) {
    const defaultConfig = {
      enableContrast: true,        // Normalización de contraste (recomendado)
      enableOrientation: true,     // Detección de orientación (recomendado)
      enableNoiseReduction: false, // Deshabilitado por defecto para velocidad
      keepIntermediateFiles: false, // Mantener archivos intermedios (solo para debug)
      fastMode: true               // ⚡ FAST MODE ACTIVADO POR DEFECTO
    };

    this.enhancementConfig = { ...defaultConfig, ...config };

    // Ajustar configuración para modo rápido
    if (this.enhancementConfig.fastMode) {
      this.enhancementConfig.enableNoiseReduction = false;
      console.log('⚡ Modo rápido activado - reducción de ruido deshabilitada');
    }

    console.log('🎛️ Configuración de mejoras aplicada:', this.enhancementConfig);
    return this.enhancementConfig;
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DE PROCESAMIENTO
   * Devuelve estadísticas de las mejoras aplicadas
   * @returns {Object} Estadísticas de rendimiento
   */
  getProcessingStats() {
    return {
      enhancementConfig: this.enhancementConfig || null,
      supportedFeatures: {
        contrastNormalization: '✅ Normalización de contraste rápida (< 100ms)',
        orientationDetection: '✅ Detección de orientación automática',
        noiseReduction: '✅ Limpieza de ruido básica',
        batchProcessing: '✅ Procesamiento por lotes optimizado'
      },
      recommendations: {
        fastProcessing: 'Usar fastMode=true para lotes grandes',
        highAccuracy: 'Habilitar todas las mejoras para documentos críticos',
        debugging: 'keepIntermediateFiles=true para análisis detallado'
      }
    };
  }

  /**
   * Extraer bounding boxes de palabras y líneas
   */
  extractBoundingBoxes(tesseractData) {
    const boundingBoxes = {
      words: [],
      lines: [],
      paragraphs: []
    };

    // Extraer bounding boxes de palabras
    tesseractData.words.forEach(word => {
      if (word.confidence > 30) { // Solo palabras con confianza > 30%
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

    // Extraer bounding boxes de líneas
    tesseractData.lines.forEach(line => {
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
    });

    // Extraer bounding boxes de párrafos
    tesseractData.paragraphs.forEach(paragraph => {
      boundingBoxes.paragraphs.push({
        text: paragraph.text,
        confidence: paragraph.confidence / 100,
        bbox: {
          x0: paragraph.bbox.x0,
          y0: paragraph.bbox.y0,
          x1: paragraph.bbox.x1,
          y1: paragraph.bbox.y1
        }
      });
    });

    return boundingBoxes;
  }

  /**
   * Aplicar correcciones automáticas basadas en patrones aprendidos
   */
  async applyMLCorrections(text, documentType = null) {
    try {
      console.log('🧠 Aplicando correcciones de ML...');

      // Obtener patrones activos de la base de datos
      const patternsQuery = `
        SELECT original_pattern, corrected_pattern, accuracy_score, frequency
        FROM ocr_patterns
        WHERE is_active = true
        ${documentType ? 'AND $1 = ANY(document_types)' : ''}
        ORDER BY frequency DESC, accuracy_score DESC
        LIMIT 100
      `;

      const patterns = await pool.query(
        patternsQuery,
        documentType ? [documentType] : []
      );

      let correctedText = text;
      let appliedCorrections = [];

      // Aplicar cada patrón
      for (const pattern of patterns.rows) {
        const regex = new RegExp(this.escapeRegex(pattern.original_pattern), 'gi');
        const matches = correctedText.match(regex);

        if (matches) {
          correctedText = correctedText.replace(regex, pattern.corrected_pattern);
          appliedCorrections.push({
            original: pattern.original_pattern,
            corrected: pattern.corrected_pattern,
            occurrences: matches.length,
            accuracy: pattern.accuracy_score
          });
        }
      }

      // Aplicar correcciones de contexto
      correctedText = await this.applyContextCorrections(correctedText);

      console.log(`✅ ML aplicó ${appliedCorrections.length} correcciones`);
      return {
        correctedText,
        appliedCorrections,
        improvementScore: this.calculateImprovementScore(text, correctedText)
      };

    } catch (error) {
      console.error('❌ Error aplicando correcciones ML:', error);
      return { correctedText: text, appliedCorrections: [], improvementScore: 0 };
    }
  }

  /**
   * Aplicar correcciones de contexto (números, fechas, emails, etc.)
   */
  async applyContextCorrections(text) {
    let corrected = text;

    // Corregir números comunes mal reconocidos
    const numberCorrections = {
      'O': '0', 'l': '1', 'I': '1', 'S': '5', 'G': '6', 'T': '7', 'B': '8', 'g': '9'
    };

    // Corregir fechas (formato DD/MM/YYYY o DD-MM-YYYY)
    corrected = corrected.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g, (match, day, month, year) => {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    });

    // Corregir emails
    corrected = corrected.replace(/(\w+)[\s\.](\w+)@(\w+)[\s\.](\w+)/g, '$1.$2@$3.$4');

    // Corregir números de teléfono
    corrected = corrected.replace(/(\d{3})[\s\-]?(\d{3})[\s\-]?(\d{4})/g, '$1-$2-$3');

    return corrected;
  }

  /**
   * Guardar resultado OCR en base de datos
   */
  async saveOCRResult(documentId, ocrData, correctedText = null) {
    try {
      const query = `
        INSERT INTO ocr_results (
          document_id, raw_text, corrected_text, confidence_score,
          processing_time_ms, bounding_boxes, page_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const values = [
        documentId,
        ocrData.text || '',
        correctedText || ocrData.text || '',
        ocrData.confidence || 0,
        ocrData.processingTime || 0,
        JSON.stringify(ocrData.boundingBoxes || {}),
        1 // Por ahora solo una página
      ];

      const result = await pool.query(query, values);
      return { success: true, resultId: result.rows[0].id };

    } catch (error) {
      console.error('❌ Error guardando resultado OCR:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesar feedback del usuario para entrenar el modelo
   */
  async processFeedback(resultId, originalText, correctedText, correctionType = 'manual') {
    try {
      // Guardar datos de entrenamiento
      console.log('🔍 Analizando feedback:');
      console.log('   Original:', originalText.substring(0, 50) + '...');
      console.log('   Corregido:', correctedText.substring(0, 50) + '...');

      const trainingQuery = `
        INSERT INTO ocr_training_data (
          result_id, original_text, corrected_text, correction_type,
          user_feedback, pattern_category
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const patternCategory = this.categorizePattern(originalText, correctedText);
      console.log('📊 Categoría del patrón:', patternCategory);

      const trainingResult = await pool.query(trainingQuery, [
        resultId, // Puede ser null
        originalText,
        correctedText,
        correctionType,
        'manual',
        patternCategory
      ]);

      // Actualizar o crear patrón
      const patternResult = await this.updatePattern(originalText, correctedText, patternCategory);
      console.log('💾 Resultado actualización patrón:', patternResult);

      console.log(`✅ Feedback procesado para resultado ${resultId}`);
      return { success: true, trainingId: trainingResult.rows[0].id };

    } catch (error) {
      console.error('❌ Error procesando feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar patrón en base de datos
   */
  async updatePattern(originalText, correctedText, category) {
    try {
      // Intentar actualizar patrón existente
      const updateQuery = `
        UPDATE ocr_patterns
        SET frequency = frequency + 1,
            last_seen = CURRENT_TIMESTAMP,
            accuracy_score = LEAST(accuracy_score + 0.1, 1.0)
        WHERE original_pattern = $1 AND corrected_pattern = $2
        RETURNING id
      `;

      const updateResult = await pool.query(updateQuery, [originalText, correctedText]);

      if (updateResult.rows.length === 0) {
        // Crear nuevo patrón
        const insertQuery = `
          INSERT INTO ocr_patterns (
            pattern_type, original_pattern, corrected_pattern,
            context_category, frequency, accuracy_score
          ) VALUES ($1, $2, $3, $4, 1, 0.5)
        `;

        await pool.query(insertQuery, [
          'user_correction',
          originalText,
          correctedText,
          category
        ]);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error actualizando patrón:', error);
      return { success: false, error: error.message };
    }
  }

  // Métodos auxiliares
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  categorizePattern(original, corrected) {
    if (/\d/.test(original) && /\d/.test(corrected)) return 'number';
    if (/@/.test(corrected)) return 'email';
    if (/\d{2}\/\d{2}\/\d{4}/.test(corrected)) return 'date';
    if (original.length === 1 && corrected.length === 1) return 'character';
    if (original.split(' ').length === corrected.split(' ').length) return 'word';
    return 'text';
  }

  calculateImprovementScore(original, corrected) {
    if (original === corrected) return 0;
    const editDistance = this.levenshteinDistance(original, corrected);
    return Math.max(0, 1 - (editDistance / Math.max(original.length, corrected.length)));
  }

  levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    return track[str2.length][str1.length];
  }

  /**
   * Obtiene estadísticas del clasificador de documentos
   */
  getClassifierStats() {
    return this.classifier.getStats();
  }

  /**
   * Permite aprender de una clasificación manual
   */
  async learnFromManualClassification(extractedText, correctType, additionalFields = {}) {
    return await this.classifier.learnFromCorrection(extractedText, correctType, additionalFields);
  }
}

export default new OCRService();
