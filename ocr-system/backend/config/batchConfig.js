import os from 'os';

// ================= ⚙️ CONFIGURACIÓN OPTIMIZADA PARA PROCESAMIENTO MASIVO =================

export const BATCH_CONFIG = {
  // 🏊 Configuración del Worker Pool
  WORKERS: {
    MAX_WORKERS: Math.min(os.cpus().length, 8), // Máximo 8 workers
    MIN_WORKERS: 2, // Mínimo 2 workers siempre activos
    QUEUE_TIMEOUT: 30000, // 30 segundos timeout para cola
    INITIALIZATION_TIMEOUT: 60000 // 1 minuto para inicializar
  },

  // 📦 Configuración de Lotes
  BATCH_PROCESSING: {
    BATCH_SIZE: 15, // Documentos por lote
    MAX_CONCURRENT_BATCHES: 2, // Lotes simultáneos
    MAX_FILES_PER_REQUEST: 200, // Máximo archivos por petición
    BATCH_TIMEOUT: 300000 // 5 minutos timeout por lote
  },

  // 💾 Configuración de Base de Datos
  DATABASE: {
    DB_BATCH_SIZE: 50, // Registros por transacción
    CONNECTION_POOL_SIZE: 10, // Pool de conexiones
    QUERY_TIMEOUT: 30000, // 30 segundos timeout
    MAX_RETRIES: 3 // Reintentos en caso de error
  },

  // 🖼️ Configuración de Imágenes
  IMAGE_PROCESSING: {
    MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB por archivo
    SUPPORTED_FORMATS: ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'pdf'],
    OPTIMIZE_THRESHOLD: 2000000, // 2MP threshold para optimización
    MAX_RESOLUTION: 2400, // Máxima resolución en píxeles
    COMPRESSION_LEVEL: 0, // Sin compresión para OCR
    QUALITY: 100 // Máxima calidad
  },

  // 🔍 Configuración de OCR
  OCR_SETTINGS: {
    DEFAULT_LANGUAGE: 'spa+eng',
    CONFIDENCE_THRESHOLD: 30, // Mínima confianza para aceptar texto
    TIMEOUT_PER_DOCUMENT: 60000, // 1 minuto por documento
    RETRY_ATTEMPTS: 2, // Reintentos por documento
    
    // Configuraciones específicas de Tesseract
    TESSERACT_CONFIGS: {
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
      },
      fast: {
        tessedit_pageseg_mode: 11,
        tessedit_char_whitelist: '',
        preserve_interword_spaces: 1,
        tessedit_create_hocr: 0
      }
    }
  },

  // 🗑️ Configuración de Limpieza
  CLEANUP: {
    AUTO_CLEANUP_ENABLED: true,
    CLEANUP_INTERVAL_HOURS: 24, // Limpiar cada 24 horas
    KEEP_FILES_DAYS: 7, // Mantener archivos 7 días
    CLEANUP_BATCH_SIZE: 100 // Archivos por lote de limpieza
  },

  // 📊 Configuración de Monitoreo
  MONITORING: {
    LOG_BATCH_PROGRESS: true,
    LOG_INDIVIDUAL_DOCS: false, // Solo para debugging
    PERFORMANCE_METRICS: true,
    MEMORY_MONITORING: true,
    STATS_CACHE_TTL: 60000 // 1 minuto cache para estadísticas
  },

  // 🚨 Límites de Memoria
  MEMORY_LIMITS: {
    MAX_HEAP_USAGE: 0.8, // 80% del heap máximo
    WORKER_MEMORY_LIMIT: 200 * 1024 * 1024, // 200MB por worker
    BATCH_MEMORY_LIMIT: 1024 * 1024 * 1024, // 1GB por lote
    GC_THRESHOLD: 0.7 // Forzar GC al 70% de memoria
  }
};

// 📈 Configuración dinámica basada en recursos del sistema
export function getOptimalConfig() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const cpuCores = os.cpus().length;

  // Ajustar configuración según memoria disponible
  const config = { ...BATCH_CONFIG };

  if (totalMemory < 4 * 1024 * 1024 * 1024) { // Menos de 4GB
    config.WORKERS.MAX_WORKERS = Math.min(cpuCores, 4);
    config.BATCH_PROCESSING.BATCH_SIZE = 10;
    config.BATCH_PROCESSING.MAX_CONCURRENT_BATCHES = 1;
    config.IMAGE_PROCESSING.MAX_RESOLUTION = 1800;
  } else if (totalMemory < 8 * 1024 * 1024 * 1024) { // Menos de 8GB
    config.WORKERS.MAX_WORKERS = Math.min(cpuCores, 6);
    config.BATCH_PROCESSING.BATCH_SIZE = 12;
    config.IMAGE_PROCESSING.MAX_RESOLUTION = 2000;
  } else { // 8GB o más
    config.WORKERS.MAX_WORKERS = Math.min(cpuCores, 8);
    config.BATCH_PROCESSING.BATCH_SIZE = 15;
    config.IMAGE_PROCESSING.MAX_RESOLUTION = 2400;
  }

  // Ajustar según memoria libre
  const memoryUsageRatio = (totalMemory - freeMemory) / totalMemory;
  if (memoryUsageRatio > 0.8) {
    config.BATCH_PROCESSING.BATCH_SIZE = Math.floor(config.BATCH_PROCESSING.BATCH_SIZE * 0.7);
    config.WORKERS.MAX_WORKERS = Math.floor(config.WORKERS.MAX_WORKERS * 0.8);
  }

  console.log(`⚙️ Configuración optimizada para:`, {
    memoria: `${(totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB total`,
    libre: `${(freeMemory / 1024 / 1024 / 1024).toFixed(1)}GB libre`,
    cores: cpuCores,
    workers: config.WORKERS.MAX_WORKERS,
    batchSize: config.BATCH_PROCESSING.BATCH_SIZE
  });

  return config;
}

// 🎯 Configuración para diferentes tipos de carga de trabajo
export const WORKLOAD_PRESETS = {
  // Para lotes pequeños (1-20 documentos)
  SMALL_BATCH: {
    BATCH_SIZE: 5,
    MAX_CONCURRENT_BATCHES: 1,
    MAX_WORKERS: 4,
    TIMEOUT: 60000
  },

  // Para lotes medianos (20-50 documentos)  
  MEDIUM_BATCH: {
    BATCH_SIZE: 10,
    MAX_CONCURRENT_BATCHES: 2,
    MAX_WORKERS: 6,
    TIMEOUT: 120000
  },

  // Para lotes grandes (50-100 documentos)
  LARGE_BATCH: {
    BATCH_SIZE: 15,
    MAX_CONCURRENT_BATCHES: 2,
    MAX_WORKERS: 8,
    TIMEOUT: 300000
  },

  // Para lotes muy grandes (100+ documentos)
  EXTRA_LARGE_BATCH: {
    BATCH_SIZE: 20,
    MAX_CONCURRENT_BATCHES: 3,
    MAX_WORKERS: 8,
    TIMEOUT: 600000
  }
};

export default BATCH_CONFIG;
