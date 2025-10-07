import cvReadyPromise from '@techstark/opencv-js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= 🔄 PROCESADOR DE IMÁGENES CON OPENCV.JS =================

class ImageProcessor {
  constructor() {
    this.cv = null;
    this.isInitialized = false;

    // Configuraciones para detección de orientación
    this.rotationAngles = [0, 90, 180, 270];

    // Palabras clave específicas de EUROPIEL para validación
    this.europielKeywords = [
      'EUROPIEL', 'SINERGIA', 'LASER', 'CENTER', 'Recibo', 'Pago',
      'TRANSACCION', 'APROBADA', 'Fecha', 'cantidad', 'concepto',
      'Tarjeta', 'Autorizacion', 'Orden', 'Comercio', 'ARQC',
      'Folio', 'ANTICIPO', 'PAQUETE', 'NUEVO', 'Recibi'
    ];

    // Dimensiones aproximadas de un recibo individual (en píxeles)
    this.receiptDimensions = {
      minWidth: 800,
      maxWidth: 1200,
      minHeight: 1000,
      maxHeight: 1600,
      aspectRatio: 0.77 // Proporción ancho/alto típica de un recibo
    };

    console.log('🎯 ImageProcessor inicializado - Usando @techstark/opencv-js');
  }

  /**
   * Detecta y separa múltiples recibos usando análisis simple de dimensiones
   * @param {string} imagePath - Ruta de la imagen original
   * @returns {Promise<Array>} Array de objetos con las rutas de los recibos detectados
   */
  async detectAndSeparateReceipts(imagePath) {
    try {
      console.log(`🔍 DETECTAR MÚLTIPLES RECIBOS - Procesando archivo: ${imagePath}`);

      // Leer la imagen original
      const imageBuffer = await fs.readFile(imagePath);
      const metadata = await sharp(imageBuffer).metadata();

      console.log(`📐 DIMENSIONES DE IMAGEN: ${metadata.width}x${metadata.height}`);

      // Calcular proporción altura/ancho
      const aspectRatio = metadata.height / metadata.width;
      console.log(`📏 PROPORCIÓN ALTURA/ANCHO: ${aspectRatio.toFixed(2)}`);
      console.log(`🎯 UMBRAL DE DETECCIÓN: 1.25 (actual: ${aspectRatio.toFixed(2)})`);

      // Si la proporción indica múltiples recibos (altura > 1.25 * ancho)
      if (aspectRatio > 1.25) {
        console.log('🔍 DETECTADA IMAGEN CON MÚLTIPLES RECIBOS - DIVIDIENDO...');
        console.log(`🎯 IMAGEN CALIFICA PARA DIVISIÓN: ${aspectRatio.toFixed(2)} > 1.25`);

        // Calcular punto de división (mitad de la imagen)
        const halfHeight = Math.floor(metadata.height / 2);
        const overlap = 50; // Píxeles de superposición para no cortar texto

        console.log(`📏 Dividiendo imagen en altura ${halfHeight} con overlap ${overlap}px`);

        // Generar nombres únicos para cada recibo
        const baseName = imagePath.replace(/\.[^/.]+$/, "");
        const topReceiptPath = `${baseName}_receipt_1.png`;
        const bottomReceiptPath = `${baseName}_receipt_2.png`;

        console.log(`📁 Archivo superior: ${topReceiptPath}`);
        console.log(`📁 Archivo inferior: ${bottomReceiptPath}`);

        // Extraer y guardar recibo superior
        await sharp(imageBuffer)
          .extract({
            left: 0,
            top: 0,
            width: metadata.width,
            height: halfHeight + overlap
          })
          .png()
          .toFile(topReceiptPath);

        // Extraer y guardar recibo inferior
        await sharp(imageBuffer)
          .extract({
            left: 0,
            top: Math.max(0, halfHeight - overlap),
            width: metadata.width,
            height: metadata.height - halfHeight + overlap
          })
          .png()
          .toFile(bottomReceiptPath);

        console.log('✂️ IMAGEN DIVIDIDA EN 2 RECIBOS EXITOSAMENTE');
        console.log(`🎯 RETORNANDO 2 RECIBOS SEPARADOS`);
        const result = [
          { path: topReceiptPath, index: 1, total: 2 },
          { path: bottomReceiptPath, index: 2, total: 2 }
        ];
        console.log(`📋 RESULTADO DE DIVISIÓN:`, result);
        return result;
      }

      console.log('📄 PROCESANDO COMO RECIBO ÚNICO (no cumple criterio de división)');
      console.log(`🎯 RETORNANDO 1 RECIBO ÚNICO`);
      const result = [{ path: imagePath, index: 1, total: 1 }];
      console.log(`📋 RESULTADO ÚNICO:`, result);
      return result;

    } catch (error) {
      console.error('❌ ERROR DETECTANDO MÚLTIPLES RECIBOS:', error);
      console.error('❌ STACK TRACE:', error.stack);
      console.log('🔄 FALLBACK: Retornando imagen original como recibo único');
      // En caso de error, devolver la imagen original
      return [{ path: imagePath, index: 1, total: 1 }];
    }
  }

  /**
   * Inicializar OpenCV.js
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🚀 Inicializando OpenCV.js desde NPM...');

    try {
      // Usar el paquete NPM oficial
      this.cv = await cvReadyPromise;

      console.log('✅ OpenCV.js inicializado correctamente');
      console.log('📋 Build info:', this.cv.getBuildInformation().substring(0, 100) + '...');

      this.isInitialized = true;

    } catch (error) {
      console.error('❌ Error inicializando OpenCV.js:', error.message);
      throw new Error(`No se pudo inicializar OpenCV.js: ${error.message}`);
    }
  }



  /**
   * Convierte una matriz OpenCV en un buffer de imagen
   */
  async matToBuffer(mat, width, height) {
    const buffer = Buffer.alloc(width * height);
    mat.data.copy(buffer);
    return await sharp(buffer, {
      raw: {
        width,
        height,
        channels: 1
      }
    })
    .png()
    .toBuffer();
  }

  /**
   * Auto-rotar imagen usando OpenCV.js para análisis avanzado
   */
  async autoRotateImage(input, options = {}) {
    try {
      await this.initialize();

      console.log('🔄 Iniciando procesamiento de imagen con OpenCV.js NPM...');

      let imageBuffer;
      let originalPath = null;

      // Procesar entrada
      if (typeof input === 'string') {
        originalPath = input;
        imageBuffer = await fs.readFile(input);
        console.log(`📁 Analizando: ${path.basename(input)}`);
      } else if (Buffer.isBuffer(input)) {
        imageBuffer = input;
        console.log('📁 Procesando buffer de imagen');
      } else {
        throw new Error('Input debe ser una ruta de archivo o Buffer');
      }

      // Obtener metadatos originales
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`📊 Dimensiones originales: ${metadata.width}x${metadata.height}`);

      // Validar y preparar imagen para análisis
      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format.toLowerCase())) {
        console.log('⚠️ Formato no óptimo, convirtiendo a PNG...');
        imageBuffer = await sharp(imageBuffer)
          .png()
          .toBuffer();
      }

      // Si solo hay un recibo, procesar normalmente
      const processedBuffer = await sharp(imageBuffer)
        .normalize()
        .sharpen()
        .resize(1200, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255 },
          flatten: true
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Crear Mat de OpenCV desde buffer
      const mat = this.cv.matFromImageData({
        data: new Uint8ClampedArray(processedBuffer.data),
        width: processedBuffer.info.width,
        height: processedBuffer.info.height
      });

      // Análisis de orientación con OpenCV
      const orientationResult = await this.analyzeOrientation(mat);

      console.log(`🎯 Análisis OpenCV: Ángulo dominante ${orientationResult.dominantAngle}°, Líneas detectadas: ${orientationResult.linesDetected}`);

      // Estado inicial de la imagen
      let currentBuffer = imageBuffer;
      let rotationApplied = false;
      let degreesApplied = 0;

      // Si OpenCV detectó que necesita rotación
      if (orientationResult.rotationNeeded !== 0) {
        console.log(`🔄 OpenCV recomienda rotar ${orientationResult.rotationNeeded}°`);

        // Aplicar rotación usando Sharp
        currentBuffer = await sharp(imageBuffer)
          .rotate(orientationResult.rotationNeeded)
          .png()
          .toBuffer();

        rotationApplied = true;
        degreesApplied = orientationResult.rotationNeeded;
        console.log(`✅ Rotación aplicada: ${degreesApplied}°`);
      } else {
        console.log('✅ No se detectó necesidad de rotación');
      }

      // Limpiar memoria de OpenCV
      mat.delete();

      // Preparación final de la imagen para OCR
      const finalBuffer = await sharp(currentBuffer)
        .normalize() // Normalizar contraste
        .sharpen() // Mejorar nitidez
        .threshold(128) // Binarización adaptativa
        .png() // Convertir a PNG para mejor compatibilidad
        .toBuffer();

      // Validar que la imagen final sea válida
      const finalMetadata = await sharp(finalBuffer).metadata();

      if (!finalMetadata || finalMetadata.size === 0) {
        throw new Error('La imagen procesada está corrupta o vacía');
      }

      // Guardar la imagen procesada con un nuevo nombre
      const processedFilePath = originalPath ?
        originalPath.replace(/\.[^.]+$/, '_processed.png') :
        path.join(process.cwd(), 'uploads', `processed_${Date.now()}.png`);

      await fs.writeFile(processedFilePath, finalBuffer);

      const result = {
        success: true,
        rotated: rotationApplied,
        rotationApplied: degreesApplied,
        originalPath: originalPath,
        processedPath: processedFilePath,
        orientationScore: orientationResult.confidence,
        originalDimensions: {
          width: metadata.width,
          height: metadata.height
        },
        finalDimensions: {
          width: finalMetadata.width,
          height: finalMetadata.height
        },
        analysis: {
          openCVResult: orientationResult,
          method: 'opencv-js-npm'
        },
        processingTime: Date.now()
      };

      console.log(`✅ Auto-rotación OpenCV completada - ${degreesApplied}° aplicados`);
      return result;

    } catch (error) {
      console.error('❌ Error en auto-rotación OpenCV:', error.message);

      // Fallback a rotación básica si OpenCV falla
      console.log('🔄 Usando fallback de rotación básica...');
      return await this.basicRotationFallback(input);
    }
  }

  /**
   * Analizar orientación de documento usando OpenCV
   */
  async analyzeOrientation(mat) {
    try {
      const cv = this.cv;

      // Convertir a escala de grises
      let gray = new cv.Mat();
      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

      // Detección de bordes usando Canny
      let edges = new cv.Mat();
      cv.Canny(gray, edges, 50, 150, 3, false);

      // Detección de líneas usando HoughLinesP
      let lines = new cv.Mat();
      cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 80, 50, 10);

      // Analizar ángulos de las líneas detectadas
      let angles = [];
      for (let i = 0; i < lines.rows; ++i) {
        let startPoint = lines.data32S[i * 4];
        let startPointY = lines.data32S[i * 4 + 1];
        let endPoint = lines.data32S[i * 4 + 2];
        let endPointY = lines.data32S[i * 4 + 3];

        let angle = Math.atan2(endPointY - startPointY, endPoint - startPoint) * 180 / Math.PI;
        angles.push(angle);
      }

      // Calcular el ángulo dominante
      let dominantAngle = this.calculateDominantAngle(angles);

      // Determinar rotación necesaria
      let rotationNeeded = this.determineRotationFromAngle(dominantAngle);

      // Calcular confianza basada en cantidad de líneas
      let confidence = Math.min(angles.length / 20, 1.0); // Normalizar a [0,1]

      // Limpiar memoria
      gray.delete();
      edges.delete();
      lines.delete();

      return {
        dominantAngle: dominantAngle,
        rotationNeeded: rotationNeeded,
        linesDetected: angles.length,
        confidence: confidence,
        success: true
      };

    } catch (error) {
      console.error('Error en análisis OpenCV:', error);
      return {
        dominantAngle: 0,
        rotationNeeded: 0,
        linesDetected: 0,
        confidence: 0,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calcular el ángulo dominante de un conjunto de ángulos
   */
  calculateDominantAngle(angles) {
    if (angles.length === 0) return 0;

    // Normalizar ángulos a rango [0, 180)
    let normalizedAngles = angles.map(angle => {
      angle = Math.abs(angle);
      return angle > 90 ? 180 - angle : angle;
    });

    // Crear histograma de ángulos (buckets de 5 grados)
    let histogram = {};
    normalizedAngles.forEach(angle => {
      let bucket = Math.round(angle / 5) * 5;
      histogram[bucket] = (histogram[bucket] || 0) + 1;
    });

    // Encontrar el bucket con más ocurrencias
    let maxCount = 0;
    let dominantAngle = 0;
    for (let angle in histogram) {
      if (histogram[angle] > maxCount) {
        maxCount = histogram[angle];
        dominantAngle = parseFloat(angle);
      }
    }

    return dominantAngle;
  }

  /**
   * Determinar rotación necesaria basada en el ángulo dominante
   */
  determineRotationFromAngle(angle) {
    // Si las líneas están cerca de horizontal (0°), no rotar
    if (angle < 15 || angle > 165) return 0;

    // Si las líneas están cerca de vertical (90°), rotar 270° (o -90°)
    if (angle > 75 && angle < 105) return 270;

    // Para otros casos, determinar la rotación más cercana
    if (angle < 45) return 270; // Más cerca de vertical
    if (angle > 135) return 90;  // Más cerca de vertical invertida

    return 180; // Probablemente invertido
  }

  /**
   * Fallback básico usando solo Sharp si OpenCV falla
   */
  async loadAndValidateImage(input) {
    let imageBuffer;
    let originalPath = null;

    if (typeof input === 'string') {
      originalPath = input;
      imageBuffer = await fs.readFile(input);
      console.log(`📁 Analizando: ${path.basename(input)}`);
    } else if (Buffer.isBuffer(input)) {
      imageBuffer = input;
      console.log('� Procesando buffer de imagen');
    } else {
      throw new Error('Input debe ser una ruta de archivo o Buffer');
    }

    // Validar que el buffer no esté vacío
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Imagen inválida: buffer vacío');
    }

    return { imageBuffer, originalPath };
  }

  async prepareImageForAnalysis(imageBuffer, metadata) {
    // Convertir a formato óptimo si es necesario
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format.toLowerCase())) {
      console.log('⚠️ Formato no óptimo, convirtiendo a PNG...');
      imageBuffer = await sharp(imageBuffer)
        .png()
        .toBuffer();
    }

    // Optimizar imagen para OCR
    return await sharp(imageBuffer)
      .normalize() // Normalizar contraste
      .sharpen() // Mejorar nitidez
      .resize(1200, 1600, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255 },
        flatten: true // Asegurar fondo blanco
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
  }

  async saveProcessedImage(imageBuffer, originalPath = null) {
    // Generar nombre de archivo para la imagen procesada
    const processedFilePath = originalPath ?
      originalPath.replace(/\.[^.]+$/, '_processed.png') :
      path.join(process.cwd(), 'uploads', `processed_${Date.now()}.png`);

    // Guardar imagen procesada
    await fs.writeFile(processedFilePath, imageBuffer);

    return processedFilePath;
  }

  async basicRotationFallback(input) {
    console.log('🔄 Ejecutando fallback básico...');

    const { imageBuffer, originalPath } = await this.loadAndValidateImage(input);

    // Análisis básico de dimensiones para inferir orientación
    const metadata = await sharp(imageBuffer).metadata();
    let rotationNeeded = 0;

    // Heurística simple: si es más ancho que alto, probablemente necesita rotación
    if (metadata.width > metadata.height * 1.5) {
      rotationNeeded = 270; // Rotar 90° en sentido horario
    }

    let finalBuffer = imageBuffer;
    if (rotationNeeded > 0) {
      finalBuffer = await sharp(imageBuffer)
        .rotate(rotationNeeded)
        .png()
        .toBuffer();
    }

    const finalMetadata = await sharp(finalBuffer).metadata();

    return {
      rotated: rotationNeeded > 0,
      rotationApplied: rotationNeeded,
      buffer: finalBuffer,
      orientationScore: 0.5, // Score básico
      originalDimensions: {
        width: metadata.width,
        height: metadata.height
      },
      finalDimensions: {
        width: finalMetadata.width,
        height: finalMetadata.height
      },
      analysis: {
        openCVResult: { success: false, error: 'Fallback usado' },
        method: 'basic-fallback'
      },
      processingTime: Date.now()
    };
  }

  /**
   * Limpiar recursos (no es necesario con el paquete NPM, pero mantenemos la interfaz)
   */
  async cleanup() {
    console.log('🧹 Cleanup completado (OpenCV NPM se maneja automáticamente)');
  }

  /**
   * Analizar múltiples imágenes y obtener estadísticas
   */
  async analyzeRotationStats(imagePaths) {
    const stats = {
      total: imagePaths.length,
      rotationDistribution: { 0: 0, 90: 0, 180: 0, 270: 0 },
      averageConfidence: 0,
      processingTimes: [],
      openCVSuccess: 0
    };

    let totalConfidence = 0;

    console.log(`📊 Analizando ${imagePaths.length} imágenes con OpenCV.js NPM...`);

    for (const imagePath of imagePaths) {
      try {
        const startTime = Date.now();
        const result = await this.autoRotateImage(imagePath);
        const processingTime = Date.now() - startTime;

        stats.rotationDistribution[result.rotationApplied]++;
        totalConfidence += result.orientationScore;
        stats.processingTimes.push(processingTime);

        if (result.analysis.openCVResult.success) {
          stats.openCVSuccess++;
        }

        console.log(`  ✅ ${path.basename(imagePath)}: ${result.rotationApplied}° (${processingTime}ms)`);

      } catch (error) {
        console.warn(`⚠️ Error procesando ${imagePath}:`, error.message);
      }
    }

    stats.averageConfidence = totalConfidence / imagePaths.length;
    stats.averageProcessingTime = stats.processingTimes.reduce((a, b) => a + b, 0) / stats.processingTimes.length;
    stats.openCVSuccessRate = (stats.openCVSuccess / imagePaths.length) * 100;

    return stats;
  }

  // ================= 🎨 MEJORAS DE PROCESAMIENTO DE IMAGEN =================

  /**
   * 🌟 NORMALIZACIÓN DE CONTRASTE RÁPIDA (< 100ms)
   * Mejora la legibilidad del texto aplicando CLAHE y ajuste de gamma
   * @param {string} imagePath - Ruta de la imagen a procesar
   * @param {Object} options - Configuración del procesamiento
   * @returns {Promise<string>} Ruta de la imagen procesada
   */
  async fastContrastNormalization(imagePath, options = {}) {
    const startTime = Date.now();

    try {
      console.log('🌟 Aplicando normalización de contraste rápida...');

      const {
        clipLimit = 3.0,          // Límite para CLAHE (reducido para ser más rápido)
        tileGridSize = 8,         // Tamaño de grilla (menor = más rápido)
        gamma = 1.2,              // Factor gamma para corrección
        brightness = 1.1          // Factor de brillo
      } = options;

      // Leer imagen con Sharp (más rápido que OpenCV para operaciones básicas)
      const buffer = await fs.readFile(imagePath);

      // Aplicar mejoras rápidas con Sharp
      const enhancedBuffer = await sharp(buffer)
        .normalize()                    // Normalización automática
        .modulate({
          brightness: brightness,       // Ajuste de brillo
          saturation: 0.8              // Reducir saturación para mejorar OCR
        })
        .sharpen({                      // Enfoque ligero
          sigma: 1,
          flat: 1,
          jagged: 2
        })
        .jpeg({ quality: 95 })          // Alta calidad para OCR
        .toBuffer();

      // Generar nombre de archivo para la imagen procesada
      const parsedPath = path.parse(imagePath);
      const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_contrast${parsedPath.ext}`);

      await fs.writeFile(outputPath, enhancedBuffer);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Contraste normalizado en ${processingTime}ms: ${path.basename(outputPath)}`);

      return outputPath;

    } catch (error) {
      console.error('❌ Error en normalización de contraste:', error);
      return imagePath; // Devolver imagen original si falla
    }
  }

  /**
   * 🔄 DETECCIÓN DE ORIENTACIÓN MEJORADA
   * Combina detección por texto y análisis de contenido
   * @param {string} imagePath - Ruta de la imagen
   * @returns {Promise<number>} Ángulo de rotación recomendado (0, 90, 180, 270)
   */
  async improvedOrientationDetection(imagePath) {
    const startTime = Date.now();

    try {
      console.log('🔄 Detectando orientación mejorada...');

      // Usar el método existente como base
      const existingResult = await this.autoRotateImage(imagePath);

      // Si la confianza es alta, usar el resultado existente
      if (existingResult.orientationScore > 0.7) {
        console.log(`✅ Orientación detectada (alta confianza): ${existingResult.rotationApplied}°`);
        return existingResult.rotationApplied;
      }

      // Análisis adicional para casos difíciles
      await this.initialize();
      const img = this.cv.imread(imagePath);

      // Detectar líneas horizontales y verticales
      const gray = new this.cv.Mat();
      this.cv.cvtColor(img, gray, this.cv.COLOR_RGBA2GRAY);

      // Detectar bordes
      const edges = new this.cv.Mat();
      this.cv.Canny(gray, edges, 50, 150);

      // Detectar líneas con HoughLines
      const lines = new this.cv.Mat();
      this.cv.HoughLines(edges, lines, 1, Math.PI / 180, 100);

      // Analizar ángulos de las líneas
      let horizontalLines = 0;
      let verticalLines = 0;

      for (let i = 0; i < lines.rows; i++) {
        const theta = lines.data32F[i * 2 + 1];
        const angle = (theta * 180) / Math.PI;

        if (Math.abs(angle) < 15 || Math.abs(angle - 180) < 15) {
          horizontalLines++;
        } else if (Math.abs(angle - 90) < 15) {
          verticalLines++;
        }
      }

      // Limpiar memoria
      img.delete();
      gray.delete();
      edges.delete();
      lines.delete();

      // Determinar orientación basada en análisis de líneas
      let recommendedRotation = 0;
      if (verticalLines > horizontalLines * 1.5) {
        recommendedRotation = 90; // Probablemente necesita rotación
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Orientación mejorada detectada en ${processingTime}ms: ${recommendedRotation}°`);

      return recommendedRotation;

    } catch (error) {
      console.error('❌ Error en detección de orientación mejorada:', error);
      return 0; // Sin rotación si falla
    }
  }

  /**
   * 🧹 LIMPIEZA DE RUIDO BÁSICA
   * Elimina ruido, manchas y artefactos que interfieren con el OCR
   * @param {string} imagePath - Ruta de la imagen
   * @param {Object} options - Configuración de limpieza
   * @returns {Promise<string>} Ruta de la imagen limpia
   */
  async basicNoiseReduction(imagePath, options = {}) {
    const startTime = Date.now();

    try {
      console.log('🧹 Aplicando limpieza de ruido básica...');

      const {
        denoiseStrength = 3,      // Fuerza de reducción de ruido (1-10)
        morphKernelSize = 2,      // Tamaño kernel morfológico
        blurRadius = 1            // Radio de desenfoque gaussiano
      } = options;

      await this.initialize();

      // Leer imagen
      const img = this.cv.imread(imagePath);
      const processed = new this.cv.Mat();

      // Convertir a escala de grises
      this.cv.cvtColor(img, processed, this.cv.COLOR_RGBA2GRAY);

      // 1. Reducción de ruido con filtro bilateral (preserva bordes)
      const denoised = new this.cv.Mat();
      this.cv.bilateralFilter(processed, denoised, 9, 75, 75);

      // 2. Operaciones morfológicas para limpiar texto
      const kernel = this.cv.getStructuringElement(
        this.cv.MORPH_RECT,
        new this.cv.Size(morphKernelSize, morphKernelSize)
      );

      const morphed = new this.cv.Mat();
      // Closing para cerrar gaps en letras
      this.cv.morphologyEx(denoised, morphed, this.cv.MORPH_CLOSE, kernel);

      // 3. Ligero desenfoque gaussiano para suavizar
      const final = new this.cv.Mat();
      this.cv.GaussianBlur(morphed, final, new this.cv.Size(blurRadius * 2 + 1, blurRadius * 2 + 1), 0);

      // 4. Umbralización adaptativa para mejorar contraste del texto
      const binary = new this.cv.Mat();
      this.cv.adaptiveThreshold(
        final, binary, 255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY,
        11, 2
      );

      // Generar nombre de archivo para la imagen limpia
      const parsedPath = path.parse(imagePath);
      const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_clean${parsedPath.ext}`);

      // Guardar imagen procesada
      this.cv.imwrite(outputPath, binary);

      // Limpiar memoria
      img.delete();
      processed.delete();
      denoised.delete();
      kernel.delete();
      morphed.delete();
      final.delete();
      binary.delete();

      const processingTime = Date.now() - startTime;
      console.log(`✅ Ruido eliminado en ${processingTime}ms: ${path.basename(outputPath)}`);

      return outputPath;

    } catch (error) {
      console.error('❌ Error en limpieza de ruido:', error);
      return imagePath; // Devolver imagen original si falla
    }
  }

  /**
   * 🚀 PROCESAMIENTO COMPLETO OPTIMIZADO
   * Aplica todas las mejoras en secuencia optimizada
   * @param {string} imagePath - Ruta de la imagen original
   * @param {Object} options - Configuración del procesamiento
   * @returns {Promise<Object>} Resultado del procesamiento completo
   */
  async optimizedFullProcessing(imagePath, options = {}) {
    const startTime = Date.now();

    try {
      console.log('🚀 Iniciando procesamiento completo optimizado...');

      const {
        enableContrast = true,
        enableOrientation = true,
        enableNoiseReduction = true,
        keepIntermediateFiles = false
      } = options;

      let currentPath = imagePath;
      const results = {
        originalPath: imagePath,
        finalPath: imagePath,
        steps: [],
        totalTime: 0,
        improvements: []
      };

      // 1. Normalización de contraste (más rápida primero)
      if (enableContrast) {
        const stepStart = Date.now();
        currentPath = await this.fastContrastNormalization(currentPath);
        const stepTime = Date.now() - stepStart;
        results.steps.push({ step: 'contrast', time: stepTime, path: currentPath });
        results.improvements.push('contrast_normalized');
      }

      // 2. Limpieza de ruido
      if (enableNoiseReduction) {
        const stepStart = Date.now();
        currentPath = await this.basicNoiseReduction(currentPath);
        const stepTime = Date.now() - stepStart;
        results.steps.push({ step: 'noise_reduction', time: stepTime, path: currentPath });
        results.improvements.push('noise_reduced');
      }

      // 3. Detección de orientación (al final para trabajar con imagen limpia)
      if (enableOrientation) {
        const stepStart = Date.now();
        const rotation = await this.improvedOrientationDetection(currentPath);
        const stepTime = Date.now() - stepStart;

        if (rotation !== 0) {
          // Aplicar rotación si es necesaria
          const rotatedPath = await this.autoRotateImage(currentPath, { forceAngle: rotation });
          currentPath = rotatedPath.outputPath || rotatedPath.path || currentPath;
          results.improvements.push(`rotated_${rotation}deg`);
        }

        results.steps.push({ step: 'orientation', time: stepTime, rotation, path: currentPath });
      }

      // Limpiar archivos intermedios si no se requieren
      if (!keepIntermediateFiles) {
        for (const step of results.steps) {
          if (step.path !== imagePath && step.path !== currentPath) {
            try {
              await fs.unlink(step.path);
            } catch (e) {
              // Ignorar errores de limpieza
            }
          }
        }
      }

      results.finalPath = currentPath;
      results.totalTime = Date.now() - startTime;

      console.log(`✅ Procesamiento completo terminado en ${results.totalTime}ms`);
      console.log(`🎯 Mejoras aplicadas: ${results.improvements.join(', ')}`);

      return results;

    } catch (error) {
      console.error('❌ Error en procesamiento completo:', error);
      return {
        originalPath: imagePath,
        finalPath: imagePath,
        error: error.message,
        totalTime: Date.now() - startTime
      };
    }
  }
}

// Exportar la clase en lugar de una instancia
export default ImageProcessor;
