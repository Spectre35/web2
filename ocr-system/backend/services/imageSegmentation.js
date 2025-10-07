import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

// ================= 🖼️ SEGMENTACIÓN DE IMÁGENES PARA MÚLTIPLES RECIBOS =================

class ImageSegmentation {
  constructor() {
    // Configuraciones para detección de recibos
    this.MIN_RECEIPT_HEIGHT = 200; // Altura mínima de un recibo en pixels
    this.OVERLAP_THRESHOLD = 0.8;  // Umbral para detectar solapamiento
    this.HEADER_KEYWORDS = [
      'recibo de pago',
      'europiel',
      'laser center',
      'folio',
      'fecha'
    ];
  }

  /**
   * Detecta y segmenta múltiples recibos en una imagen
   * @param {string} imagePath - Ruta de la imagen original
   * @returns {Promise<Array>} Array de rutas de imágenes segmentadas
   */
  async segmentReceipts(imagePath) {
    try {
      console.log(`🔍 Analizando imagen para múltiples recibos: ${imagePath}`);
      
      // Obtener metadatos de la imagen
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height } = metadata;
      
      console.log(`📐 Dimensiones de imagen: ${width}x${height}`);

      // Detectar regiones de recibos
      const receiptRegions = await this.detectReceiptRegions(imagePath, width, height);
      
      if (receiptRegions.length <= 1) {
        console.log(`📄 Se detectó un solo recibo, procesando normalmente`);
        return [imagePath]; // Un solo recibo, devolver imagen original
      }

      console.log(`📄 Se detectaron ${receiptRegions.length} recibos en la imagen`);

      // Segmentar cada región en archivos separados
      const segmentedPaths = [];
      for (let i = 0; i < receiptRegions.length; i++) {
        const region = receiptRegions[i];
        const segmentPath = await this.extractReceiptRegion(imagePath, region, i);
        segmentedPaths.push(segmentPath);
      }

      return segmentedPaths;

    } catch (error) {
      console.error(`❌ Error en segmentación de imagen:`, error);
      return [imagePath]; // En caso de error, devolver imagen original
    }
  }

  /**
   * Detecta regiones donde hay recibos basándose en análisis de contenido
   * MEJORADO: Lógica equilibrada que detecta 1 o 2 recibos reales
   * @param {string} imagePath - Ruta de la imagen
   * @param {number} width - Ancho de la imagen
   * @param {number} height - Alto de la imagen
   * @returns {Promise<Array>} Array de regiones detectadas (máximo 2)
   */
  async detectReceiptRegions(imagePath, width, height) {
    try {
      console.log(`🎯 LÓGICA EQUILIBRADA: Detectando 1 o 2 recibos reales...`);
      
      // PASO 1: Buscar separadores visuales (líneas divisorias claras)
      const separatedRegions = await this.findClearVisualSeparators(imagePath, width, height);
      
      if (separatedRegions.length === 2) {
        console.log(`✅ Se detectaron 2 recibos separados por línea divisoria`);
        
        // Validar que ambas regiones tengan contenido significativo
        const region1Density = await this.analyzeRegionDensity(imagePath, width, {
          y: separatedRegions[0].y,
          height: separatedRegions[0].height
        });
        
        const region2Density = await this.analyzeRegionDensity(imagePath, width, {
          y: separatedRegions[1].y,
          height: separatedRegions[1].height
        });
        
        // Si ambas regiones tienen contenido razonable, confirmar 2 recibos
        if (region1Density > 0.05 && region2Density > 0.05) { // 5% mínimo de contenido
          console.log(`✅ Confirmado: 2 recibos con contenido válido`);
          return separatedRegions;
        } else {
          console.log(`⚠️ Una región tiene poco contenido, procesando como documento único`);
        }
      }

      // PASO 2: Para imágenes muy altas, hacer análisis más inteligente
      if (height > 3500) {
        console.log(`📏 Imagen alta (${height}px), analizando por cuadrantes...`);
        
        // Dividir en cuartos y analizar densidad
        const quarter1 = { y: 0, height: Math.floor(height / 4) };
        const quarter2 = { y: Math.floor(height / 4), height: Math.floor(height / 4) };
        const quarter3 = { y: Math.floor(height / 2), height: Math.floor(height / 4) };
        const quarter4 = { y: Math.floor(height * 3/4), height: Math.floor(height / 4) };
        
        const densities = await Promise.all([
          this.analyzeRegionDensity(imagePath, width, quarter1),
          this.analyzeRegionDensity(imagePath, width, quarter2),
          this.analyzeRegionDensity(imagePath, width, quarter3),
          this.analyzeRegionDensity(imagePath, width, quarter4)
        ]);
        
        console.log(`📊 Densidades por cuadrantes: ${densities.map(d => (d * 100).toFixed(1) + '%').join(', ')}`);
        
        // Buscar patrón de 2 recibos: contenido arriba y abajo, poco en el medio
        const topHalf = (densities[0] + densities[1]) / 2;
        const bottomHalf = (densities[2] + densities[3]) / 2;
        const middleGap = densities[1] < 0.03 || densities[2] < 0.03; // Hay espacio en el medio
        
        if (topHalf > 0.08 && bottomHalf > 0.08 && middleGap) {
          console.log(`✅ Patrón de 2 recibos detectado: contenido arriba y abajo con espacio medio`);
          const midPoint = Math.floor(height / 2);
          return [
            { x: 0, y: 0, width, height: midPoint },
            { x: 0, y: midPoint, width, height: height - midPoint }
          ];
        }
      }

      // PASO 3: Por defecto, tratar como UN SOLO RECIBO
      console.log(`📄 Procesando como documento único (1 recibo)`);
      return [{ x: 0, y: 0, width, height }];

    } catch (error) {
      console.error(`❌ Error detectando regiones:`, error);
      return [{ x: 0, y: 0, width, height }];
    }
  }

  /**
   * Analiza la densidad de contenido para encontrar recibos
   * @param {string} imagePath - Ruta de la imagen
   * @param {number} width - Ancho de la imagen
   * @param {number} height - Alto de la imagen
   * @returns {Promise<Array>} Regiones detectadas
   */
  async analyzeContentDensity(imagePath, width, height) {
    try {
      // Convertir a escala de grises y analizar densidad
      const image = sharp(imagePath);
      const grayBuffer = await image
        .greyscale()
        .raw()
        .toBuffer();

      // Dividir imagen en franjas horizontales y analizar contenido
      const stripHeight = Math.floor(height / 20); // 20 franjas
      const densities = [];

      for (let i = 0; i < 20; i++) {
        const startY = i * stripHeight;
        const endY = Math.min(startY + stripHeight, height);
        
        const stripBuffer = await sharp(imagePath)
          .extract({ left: 0, top: startY, width, height: endY - startY })
          .greyscale()
          .raw()
          .toBuffer();

        // Calcular densidad de píxeles oscuros (contenido)
        let darkPixels = 0;
        for (let j = 0; j < stripBuffer.length; j++) {
          if (stripBuffer[j] < 200) darkPixels++; // Umbral para píxeles "oscuros"
        }
        
        const density = darkPixels / stripBuffer.length;
        densities.push({ strip: i, y: startY, density });
      }

      // Encontrar regiones con alta densidad (recibos)
      return this.findReceiptRegionsFromDensity(densities, width, height, stripHeight);

    } catch (error) {
      console.error(`❌ Error en análisis de densidad:`, error);
      return [];
    }
  }

  /**
   * Encuentra regiones de recibos basándose en análisis de densidad
   */
  findReceiptRegionsFromDensity(densities, width, height, stripHeight) {
    const regions = [];
    const avgDensity = densities.reduce((sum, d) => sum + d.density, 0) / densities.length;
    const threshold = avgDensity * 1.2; // 20% por encima del promedio

    let currentRegion = null;

    for (let i = 0; i < densities.length; i++) {
      const density = densities[i];
      
      if (density.density > threshold) {
        if (!currentRegion) {
          // Inicio de nueva región
          currentRegion = {
            startStrip: i,
            endStrip: i,
            startY: density.y
          };
        } else {
          // Extender región actual
          currentRegion.endStrip = i;
        }
      } else {
        if (currentRegion && (i - currentRegion.endStrip) > 2) {
          // Fin de región con gap significativo
          const regionHeight = (currentRegion.endStrip + 1) * stripHeight - currentRegion.startY;
          
          if (regionHeight >= this.MIN_RECEIPT_HEIGHT) {
            regions.push({
              x: 0,
              y: currentRegion.startY,
              width: width,
              height: Math.min(regionHeight, height - currentRegion.startY)
            });
          }
          currentRegion = null;
        }
      }
    }

    // Agregar última región si existe
    if (currentRegion) {
      const regionHeight = height - currentRegion.startY;
      if (regionHeight >= this.MIN_RECEIPT_HEIGHT) {
        regions.push({
          x: 0,
          y: currentRegion.startY,
          width: width,
          height: regionHeight
        });
      }
    }

    console.log(`🎯 Regiones detectadas por densidad: ${regions.length}`);
    return regions;
  }

  /**
   * Crea división automática para imágenes altas
   */
  createAutomaticSplit(width, height) {
    const regions = [];
    const numSplits = Math.ceil(height / 800); // Cada región de ~800px
    const regionHeight = Math.floor(height / numSplits);

    for (let i = 0; i < numSplits; i++) {
      const y = i * regionHeight;
      const actualHeight = i === numSplits - 1 ? height - y : regionHeight;
      
      regions.push({
        x: 0,
        y: y,
        width: width,
        height: actualHeight
      });
    }

    console.log(`📏 División automática: ${regions.length} regiones`);
    return regions;
  }

  /**
   * Busca separadores visuales (líneas, espacios) entre recibos
   */
  async findVisualSeparators(imagePath, width, height) {
    try {
      // Estrategia simple: buscar líneas horizontales o espacios grandes
      const image = sharp(imagePath);
      
      // Crear imagen binaria para detectar separadores
      const binaryBuffer = await image
        .greyscale()
        .threshold(240) // Convertir a blanco/negro
        .raw()
        .toBuffer();

      // Analizar filas horizontales para encontrar separadores
      const rowAnalysis = [];
      const bytesPerRow = width;

      for (let y = 0; y < height; y++) {
        let whitePixels = 0;
        const rowStart = y * bytesPerRow;
        
        for (let x = 0; x < width; x++) {
          if (binaryBuffer[rowStart + x] > 200) {
            whitePixels++;
          }
        }
        
        const whiteRatio = whitePixels / width;
        rowAnalysis.push({ y, whiteRatio });
      }

      // Encontrar separadores (filas con alto porcentaje de blanco)
      const separators = rowAnalysis
        .filter(row => row.whiteRatio > 0.9) // 90% blanco
        .map(row => row.y);

      if (separators.length > 0) {
        return this.createRegionsFromSeparators(separators, width, height);
      }

      return [];

    } catch (error) {
      console.error(`❌ Error buscando separadores:`, error);
      return [];
    }
  }

  /**
   * Crea regiones basándose en separadores encontrados
   */
  createRegionsFromSeparators(separators, width, height) {
    const regions = [];
    let lastY = 0;

    for (const separatorY of separators) {
      if (separatorY - lastY >= this.MIN_RECEIPT_HEIGHT) {
        regions.push({
          x: 0,
          y: lastY,
          width: width,
          height: separatorY - lastY
        });
      }
      lastY = separatorY + 10; // Pequeño margen después del separador
    }

    // Agregar última región
    if (height - lastY >= this.MIN_RECEIPT_HEIGHT) {
      regions.push({
        x: 0,
        y: lastY,
        width: width,
        height: height - lastY
      });
    }

    console.log(`✂️ Regiones por separadores: ${regions.length}`);
    return regions;
  }

  /**
   * Extrae una región específica de la imagen
   * @param {string} imagePath - Ruta de la imagen original
   * @param {Object} region - Región a extraer {x, y, width, height}
   * @param {number} index - Índice del recibo
   * @returns {Promise<string>} Ruta del archivo segmentado
   */
  async extractReceiptRegion(imagePath, region, index) {
    try {
      const ext = path.extname(imagePath);
      const baseName = path.basename(imagePath, ext);
      const dirName = path.dirname(imagePath);
      const segmentPath = path.join(dirName, `${baseName}_receipt_${index + 1}${ext}`);

      await sharp(imagePath)
        .extract({
          left: Math.max(0, region.x),
          top: Math.max(0, region.y),
          width: region.width,
          height: region.height
        })
        .jpeg({ quality: 95 })
        .toFile(segmentPath);

      console.log(`✂️ Recibo ${index + 1} extraído: ${segmentPath}`);
      console.log(`📐 Región: ${region.x},${region.y} ${region.width}x${region.height}`);

      return segmentPath;

    } catch (error) {
      console.error(`❌ Error extrayendo región ${index}:`, error);
      throw error;
    }
  }

  /**
   * Limpia archivos de segmentación temporal
   * @param {Array<string>} segmentedPaths - Rutas de archivos a limpiar
   */
  async cleanupSegmentedFiles(segmentedPaths) {
    try {
      for (const filePath of segmentedPaths) {
        // Solo eliminar archivos que contienen "_receipt_" (archivos segmentados)
        if (filePath.includes('_receipt_')) {
          try {
            await fs.unlink(filePath);
            console.log(`🧹 Archivo segmentado eliminado: ${filePath}`);
          } catch (error) {
            console.warn(`⚠️ No se pudo eliminar ${filePath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error en limpieza de archivos segmentados:`, error);
    }
  }

  /**
   * NUEVO: Busca separadores visuales para detectar 2 recibos reales
   * Mejorado para detectar correctamente cuando hay 2 recibos legítimos
   */
  async findClearVisualSeparators(imagePath, width, height) {
    try {
      const image = sharp(imagePath);
      
      // Usar umbral más flexible para detectar separadores reales
      const binaryBuffer = await image
        .greyscale()
        .threshold(230) // Umbral menos estricto para detectar separadores reales
        .raw()
        .toBuffer();

      // Analizar filas horizontales buscando separadores significativos
      const separatorCandidates = [];
      const bytesPerRow = width;
      const minSeparatorHeight = Math.max(15, height * 0.008); // Más flexible: 15px o 0.8% de altura

      let consecutiveWhiteRows = 0;
      let separatorStart = -1;

      for (let y = 0; y < height; y++) {
        let whitePixels = 0;
        const rowStart = y * bytesPerRow;
        
        for (let x = 0; x < width; x++) {
          if (binaryBuffer[rowStart + x] > 220) { // Más flexible para detectar separadores
            whitePixels++;
          }
        }
        
        const whiteRatio = whitePixels / width;
        
        if (whiteRatio > 0.85) { // 85% blanco (menos estricto pero aún selectivo)
          if (consecutiveWhiteRows === 0) {
            separatorStart = y;
          }
          consecutiveWhiteRows++;
        } else {
          if (consecutiveWhiteRows >= minSeparatorHeight) {
            separatorCandidates.push({
              start: separatorStart,
              end: y - 1,
              height: consecutiveWhiteRows,
              midpoint: Math.floor((separatorStart + y - 1) / 2)
            });
          }
          consecutiveWhiteRows = 0;
        }
      }

      // Verificar último separador
      if (consecutiveWhiteRows >= minSeparatorHeight) {
        separatorCandidates.push({
          start: separatorStart,
          end: height - 1,
          height: consecutiveWhiteRows,
          midpoint: Math.floor((separatorStart + height - 1) / 2)
        });
      }

      console.log(`🔍 Separadores candidatos encontrados: ${separatorCandidates.length}`);
      
      if (separatorCandidates.length > 0) {
        separatorCandidates.forEach((sep, i) => {
          console.log(`   Separador ${i + 1}: y=${sep.start}-${sep.end}, altura=${sep.height}px`);
        });
      }

      // LÓGICA MEJORADA: Detectar el separador más prometedor para 2 recibos
      if (separatorCandidates.length >= 1) {
        // Buscar el separador que está más cerca del centro de la imagen
        const centerY = height / 2;
        let bestSeparator = null;
        let bestScore = Infinity;
        
        for (const separator of separatorCandidates) {
          // Verificar que las regiones resultantes tengan tamaño mínimo
          const region1Height = separator.start;
          const region2Height = height - separator.end;
          
          if (region1Height >= this.MIN_RECEIPT_HEIGHT && region2Height >= this.MIN_RECEIPT_HEIGHT) {
            // Calcular qué tan cerca está del centro (mejor si está en el medio)
            const distanceFromCenter = Math.abs(separator.midpoint - centerY);
            const score = distanceFromCenter / separator.height; // Penalizar separadores más delgados
            
            if (score < bestScore) {
              bestScore = score;
              bestSeparator = separator;
            }
          }
        }
        
        if (bestSeparator) {
          console.log(`✅ Mejor separador encontrado: y=${bestSeparator.start}-${bestSeparator.end} (altura: ${bestSeparator.height}px)`);
          
          const region1Height = bestSeparator.start;
          const region2Height = height - bestSeparator.end;
          
          console.log(`📊 Región 1: 0-${bestSeparator.start} (${region1Height}px)`);
          console.log(`📊 Región 2: ${bestSeparator.end}-${height} (${region2Height}px)`);
          
          return [
            { x: 0, y: 0, width, height: bestSeparator.start },
            { x: 0, y: bestSeparator.end, width, height: region2Height }
          ];
        }
      }

      console.log(`📄 No se encontraron separadores válidos para dividir en 2 recibos`);
      return []; // No separadores válidos encontrados
      
    } catch (error) {
      console.error(`❌ Error buscando separadores claros:`, error);
      return [];
    }
  }

  /**
   * NUEVO: Analiza la densidad de contenido en una región específica
   */
  async analyzeRegionDensity(imagePath, width, region) {
    try {
      const image = sharp(imagePath);
      
      // Extraer la región específica
      const regionBuffer = await image
        .extract({ left: 0, top: region.y, width, height: region.height })
        .greyscale()
        .raw()
        .toBuffer();

      // Calcular densidad de píxeles oscuros (contenido)
      let darkPixels = 0;
      for (let i = 0; i < regionBuffer.length; i++) {
        if (regionBuffer[i] < 200) darkPixels++; // Píxeles con contenido
      }
      
      const density = darkPixels / regionBuffer.length;
      console.log(`📊 Densidad región (y:${region.y}, h:${region.height}): ${(density * 100).toFixed(1)}%`);
      
      return density;
      
    } catch (error) {
      console.error(`❌ Error analizando densidad de región:`, error);
      return 0;
    }
  }
}

export default ImageSegmentation;
