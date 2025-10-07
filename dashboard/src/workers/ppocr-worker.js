/**
 * Web Worker para procesamiento PP-OCR en paralelo
 * Evita bloquear la UI principal durante el procesamiento de imágenes
 */

let ocrEngine = null;
let initialized = false;

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'INIT':
        await initializeEngine();
        self.postMessage({ type: 'INIT_SUCCESS', id });
        break;

      case 'PROCESS_IMAGE':
        const result = await processImageInWorker(data.imageData, data.fileName);
        self.postMessage({
          type: 'PROCESS_SUCCESS',
          id,
          result
        });
        break;

      case 'CLEANUP':
        cleanup();
        self.postMessage({ type: 'CLEANUP_SUCCESS', id });
        break;

      default:
        throw new Error(`Tipo de mensaje desconocido: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      id,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

/**
 * Initialize PP-OCR engine in worker context
 */
async function initializeEngine() {
  if (initialized) return;

  try {
    // Import ONNX Runtime in worker context
    if (!self.ort) {
      await importONNXRuntime();
    }

    ocrEngine = new PPOCRWorkerEngine();
    await ocrEngine.initialize();

    initialized = true;
  } catch (error) {
    console.error('❌ [Worker] Error inicializando engine:', error);
    throw error;
  }
}

/**
 * Import ONNX Runtime in worker context
 */
async function importONNXRuntime() {
  return new Promise((resolve, reject) => {
    try {
      // Load ONNX Runtime for Web Workers
      importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js');

      if (self.ort) {
        // Configure ONNX Runtime for worker
        self.ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/';
        resolve();
      } else {
        reject(new Error('ONNX Runtime no se cargó correctamente'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Process image data in worker
 */
async function processImageInWorker(imageData, fileName) {
  if (!initialized || !ocrEngine) {
    throw new Error('PP-OCR engine no inicializado en worker');
  }

  const startTime = performance.now();

  try {
    // Convert image data to ImageData object
    const imageDataObj = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Process with OCR engine
    const result = await ocrEngine.processImageData(imageDataObj, fileName);

    const processingTime = performance.now() - startTime;

    return {
      ...result,
      processingTime: Math.round(processingTime),
      workerId: self.name || 'worker'
    };
  } catch (error) {
    console.error(`❌ [Worker] Error procesando ${fileName}:`, error);
    throw error;
  }
}

/**
 * Cleanup worker resources
 */
function cleanup() {
  if (ocrEngine) {
    ocrEngine.cleanup();
    ocrEngine = null;
  }
  initialized = false;
  // Resources cleaned up
}

/**
 * PP-OCR Engine class - SOLO USO DEL SERVIDOR REAL
 */
class PPOCRWorkerEngine {
  constructor() {
    // Solo necesitamos configuración básica para usar servidor real
  }

  async initialize() {
    // No necesitamos cargar modelos locales, solo usar servidor
  }

  async processImageData(imageData, fileName) {
    try {
      // Convert ImageData to Canvas
      const canvas = this.imageDataToCanvas(imageData);

      const result = await this.useRealPPOCRServer(canvas, fileName);
      return result;
    } catch (error) {
      console.error(`[Worker] Error procesando ${fileName}:`, error);
      throw error;
    }
  }

  imageDataToCanvas(imageData) {
    // Create OffscreenCanvas in worker context
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');

    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);

    return canvas;
  }

  // 🚀 FUNCIÓN: Usar servidor OCR real en puerto 3002
  async useRealPPOCRServer(canvas, fileName) {
    try {
      // Convertir canvas a blob
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });

      // Crear FormData para enviar al servidor OCR
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('sucursal', 'WEB'); // Requerido por el servidor
      formData.append('bloque', 'FRONTEND'); // Requerido por el servidor
      formData.append('language', 'spa+eng'); // Idioma español e inglés

      // Llamar al servidor OCR real (Tesseract en puerto 3002)
      const response = await fetch('http://localhost:3002/api/ocr/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const fullText = result.data.originalText || '';
        const confidence = result.data.confidence || 90;

        return {
          text: fullText,
          confidence: Math.round(confidence),
          boxes: result.data.boundingBoxes || []
        };
      } else {
        throw new Error('Respuesta inválida del servidor OCR');
      }
    } catch (error) {
      console.error('❌ [Worker] Error en servidor OCR:', error);
      throw error;
    }
  }

  cleanup() {
    // Cleanup engine resources
  }
}
