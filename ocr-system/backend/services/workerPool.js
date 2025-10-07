import Tesseract from 'tesseract.js';
import os from 'os';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Configurar el EventEmitter para manejar más listeners
EventEmitter.defaultMaxListeners = 15;

// Manejar promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});

class TesseractWorkerPool {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || Math.min(os.cpus().length, 4);
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers = new Set();
    this.queue = [];
    this.isInitialized = false;
    this.initializationPromise = null;

    console.log(`🏊 Iniciando pool con ${this.maxWorkers} workers`);
  }

  /**
   * Inicializar todos los workers del pool
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      return Promise.resolve();
    }

    this.initializationPromise = (async () => {
      try {
        console.log('🔄 Inicializando workers de Tesseract...');

        const initializeWorker = async (index) => {
        try {
          // Crear worker ya inicializado con el idioma español
          const worker = await Tesseract.createWorker('spa');

          console.log(`✅ Worker ${index + 1}/${this.maxWorkers} inicializado`);

          // Agregar el worker a la lista de workers disponibles
          this.workers.push(worker);
          this.availableWorkers.push(worker);

          return worker;
        } catch (error) {
          console.error(`❌ Error inicializando worker ${index + 1}:`, error);
          throw error;
        }
      };

      // Inicializar workers uno por uno con reintentos
      for (let i = 0; i < this.maxWorkers; i++) {
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            await initializeWorker(i);
            // Si el worker se inicializa correctamente, salir del bucle de reintentos
            break;
          } catch (error) {
            retryCount++;
            console.error(`❌ Error inicializando worker ${i + 1} (intento ${retryCount}/${maxRetries}):`, error);

            if (retryCount === maxRetries) {
              console.error(`❌ No se pudo inicializar el worker ${i + 1} después de ${maxRetries} intentos`);
              continue; // Continuar con el siguiente worker
            }

            // Esperar antes de reintentar (tiempo exponencial backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
        }

        // Esperar entre inicializaciones de workers
        if (i < this.maxWorkers - 1) { // No esperar después del último worker
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Verificar que tenemos al menos un worker disponible
      if (this.workers.length === 0) {
        throw new Error('No se pudo inicializar ningún worker');
      }

      this.isInitialized = true;
      console.log(`🚀 Pool de ${this.workers.length} workers listo para usar`);
      return true;
    } catch (error) {
      console.error('❌ Error inicializando worker pool:', error);
      this.workers = [];
      this.availableWorkers = [];
      this.busyWorkers.clear();
      this.isInitialized = false;
      this.initializationPromise = null;
      throw error;
    }
    })();

    return this.initializationPromise;
  }

  /**
   * Obtener un worker disponible
   */
  async getWorker() {
    return new Promise((resolve) => {
      if (this.availableWorkers.length > 0) {
        const worker = this.availableWorkers.pop();
        this.busyWorkers.add(worker);
        resolve(worker);
      } else {
        // Agregar a la cola si no hay workers disponibles
        this.queue.push(resolve);
      }
    });
  }

  /**
   * Liberar un worker de vuelta al pool
   */
  releaseWorker(worker) {
    this.busyWorkers.delete(worker);

    if (this.queue.length > 0) {
      // Si hay tareas en cola, asignar inmediatamente
      const resolve = this.queue.shift();
      this.busyWorkers.add(worker);
      resolve(worker);
    } else {
      // Devolver al pool de disponibles
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Obtener estadísticas del pool de workers
   */
  getStats() {
    return {
      totalWorkers: this.maxWorkers,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      queuedTasks: this.queue.length,
      isInitialized: this.isInitialized,
      status: this.isInitialized ? 'ready' : 'initializing'
    };
  }

  async processImage(imagePath, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let worker = null;
    let result = null;

    try {
      worker = await this.getWorker();

      // Asegurarse de que imagePath sea una cadena
      const actualPath = typeof imagePath === 'object' && imagePath.path ? imagePath.path : imagePath;
      console.log(`🔍 Procesando imagen: ${path.basename(actualPath)}`);

      // Validar que el archivo existe y es accesible
      try {
        const stats = await fs.stat(actualPath);
        if (!stats.isFile()) {
          throw new Error('La ruta proporcionada no es un archivo');
        }
        if (stats.size === 0) {
          throw new Error('El archivo está vacío');
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`Archivo no encontrado: ${path.basename(actualPath)}`);
        }
        throw new Error(`Error accediendo al archivo: ${error.message}`);
      }

      // Configuración del OCR
      const ocrConfig = {
        tessedit_ocr_engine_mode: 1,     // Modo más preciso
        tessedit_pageseg_mode: 6,        // PSM_UNIFORM_BLOCK
        preserve_interword_spaces: 1,     // Mantener espacios entre palabras
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyzáéíóúÁÉÍÓÚüÜ0123456789.,:-$()/ ',
        ...options
      };

      // Intentar el reconocimiento
      console.log('🔍 Iniciando OCR...');
      result = await worker.recognize(actualPath, ocrConfig);

      // Validar el resultado
      if (!result || !result.data) {
        throw new Error('OCR no produjo resultados válidos');
      }

      if (!result.data.text || result.data.text.trim().length === 0) {
        throw new Error('No se pudo extraer texto de la imagen');
      }

      if (result.data.confidence < 35) {
        console.warn('⚠️ Baja confianza en el OCR:', result.data.confidence);
      }

      return result;
    } catch (error) {
      console.error('❌ Error en procesamiento OCR:', error.message);

      // Manejo de errores específicos
      if (error.message.includes('truncated file') || error.message.includes('Error attempting to read image')) {
        throw new Error(`La imagen ${path.basename(actualPath)} está corrupta o no se puede leer correctamente`);
      }

      if (error.message.includes('ENOENT')) {
        throw new Error(`No se encontró el archivo: ${path.basename(actualPath)}`);
      }

      if (error.message.includes('empty') || error.message.includes('size === 0')) {
        throw new Error(`El archivo ${path.basename(actualPath)} está vacío`);
      }

      throw new Error(`Error procesando ${path.basename(actualPath)}: ${error.message}`);
    } finally {
      // Siempre liberar el worker
      if (worker) {
        this.releaseWorker(worker);
      }
    }
  }

  /**
   * Terminar todos los workers
   */
  async terminate() {
    console.log('🔄 Cerrando worker pool...');
    try {
      await Promise.all(this.workers.map(worker => worker.terminate()));
      this.workers = [];
      this.availableWorkers = [];
      this.busyWorkers.clear();
      this.queue = [];
      this.isInitialized = false;
      console.log('✅ Worker pool cerrado correctamente');
    } catch (error) {
      console.error('❌ Error cerrando worker pool:', error);
      throw error;
    }
  }

  /**
   * Limpiar y reinicializar el pool de workers
   */
  async cleanup() {
    try {
      console.log('🧹 Limpiando worker pool...');

      // Limpiar workers ocupados
      this.busyWorkers.clear();

      // Mover todos los workers a disponibles
      this.availableWorkers = [...this.workers];

      // Limpiar la cola de espera
      this.queue = [];

      console.log('✅ Worker pool limpiado correctamente');
    } catch (error) {
      console.error('❌ Error limpiando worker pool:', error);
      // Si hay error en la limpieza, reinicializar completamente
      await this.terminate();
      await this.initialize();
    }
  }
}

// Singleton instance
let workerPoolInstance = null;

// Worker pool management functions
const getWorkerPool = () => {
  if (!workerPoolInstance) {
    workerPoolInstance = new TesseractWorkerPool();
  }
  return workerPoolInstance;
};

const shutdownWorkerPool = async () => {
  if (workerPoolInstance) {
    await workerPoolInstance.terminate();
    workerPoolInstance = null;
  }
};

// Export all utilities
export {
  TesseractWorkerPool,
  getWorkerPool,
  shutdownWorkerPool
};
