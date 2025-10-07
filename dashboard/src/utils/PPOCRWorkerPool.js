/**
 * Manager para pool de Web Workers de PP-OCR
 * Maneja el procesamiento paralelo de múltiples imágenes con optimización de memoria
 */

class PPOCRWorkerPool {
  constructor(maxWorkers = null, options = {}) {
    this.maxWorkers = maxWorkers || Math.min(navigator.hardwareConcurrency || 4, 6);
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers = new Set();
    this.taskQueue = [];
    this.initialized = false;
    this.nextTaskId = 1;
    this.taskPromises = new Map();

    // Configuración de rendimiento
    this.options = {
      maxMemoryMB: options.maxMemoryMB || 512, // Límite de memoria por worker
      batchSize: options.batchSize || 10, // Procesar en lotes para controlar memoria
      maxQueueSize: options.maxQueueSize || 100, // Límite de tareas en cola
      gcInterval: options.gcInterval || 30000, // Intervalo de garbage collection
      ...options
    };

    // Monitoreo de rendimiento
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      processingTime: 0,
      memoryUsage: 0,
      lastGC: Date.now()
    };

    // Setup garbage collection timer
    this.setupGarbageCollection();
  }

  /**
   * Setup garbage collection and memory monitoring
   */
  setupGarbageCollection() {
    this.gcTimer = setInterval(() => {
      this.performGarbageCollection();
    }, this.options.gcInterval);
  }

  /**
   * Perform garbage collection and memory cleanup
   */
  performGarbageCollection() {
    try {
      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      }

      // Update memory usage stats
      if (performance.memory) {
        this.stats.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
      }

      this.stats.lastGC = Date.now();
    } catch (error) {
      console.warn('Error en garbage collection:', error);
    }
  }
  async initialize() {
    if (this.initialized) return;

    try {
      // Create workers
      const initPromises = [];
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = new Worker('/src/workers/ppocr-worker.js');
        worker._id = i;
        worker._busy = false;

        this.workers.push(worker);
        this.availableWorkers.push(worker);

        // Setup worker message handling
        this.setupWorkerHandlers(worker);

        // Initialize worker
        initPromises.push(this.sendWorkerMessage(worker, 'INIT', null));
      }

      // Wait for all workers to initialize
      await Promise.all(initPromises);

      this.initialized = true;
    } catch (error) {
      console.error('❌ Error inicializando pool de workers:', error);
      throw error;
    }
  }

  /**
   * Setup message handlers for a worker
   */
  setupWorkerHandlers(worker) {
    worker.onmessage = (event) => {
      const { type, id, result, error } = event.data;

      if (this.taskPromises.has(id)) {
        const { resolve, reject } = this.taskPromises.get(id);

        switch (type) {
          case 'INIT_SUCCESS':
            resolve();
            break;

          case 'PROCESS_SUCCESS':
            this.releaseWorker(worker);
            resolve(result);
            break;

          case 'CLEANUP_SUCCESS':
            resolve();
            break;

          case 'ERROR':
            this.releaseWorker(worker);
            reject(new Error(error.message));
            break;

          default:
            console.warn(`Mensaje desconocido del worker: ${type}`);
        }

        this.taskPromises.delete(id);
      }

      // Process next task in queue if available
      this.processNextTask();
    };

    worker.onerror = (error) => {
      console.error(`❌ Error en worker ${worker._id}:`, error);
      this.releaseWorker(worker);
    };
  }

  /**
   * Send message to worker with promise-based response
   */
  sendWorkerMessage(worker, type, data) {
    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++;

      this.taskPromises.set(taskId, { resolve, reject });

      worker.postMessage({
        type,
        id: taskId,
        data
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.taskPromises.has(taskId)) {
          this.taskPromises.delete(taskId);
          reject(new Error(`Worker timeout para tarea ${taskId}`));
        }
      }, 30000);
    });
  }

  /**
   * Process multiple images in parallel with memory optimization
   */
  async processImages(files, onProgress = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check queue size limit
    if (files.length > this.options.maxQueueSize) {
      throw new Error(`Demasiados archivos. Máximo ${this.options.maxQueueSize} archivos por lote.`);
    }

    const results = [];
    const processedCount = { value: 0 };

    console.log(`📦 Procesando ${files.length} archivos con ${this.maxWorkers} workers (lotes de ${this.options.batchSize})`);

    // Process files in batches to control memory usage
    const batches = this.createBatches(files, this.options.batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      console.log(`🔄 Procesando lote ${batchIndex + 1}/${batches.length} (${batch.length} archivos)`);

      // Process batch in parallel
      const batchPromises = batch.map(async (file, index) => {
        try {
          // Check memory before processing
          await this.checkMemoryUsage();

          // Convert file to ImageData
          const imageData = await this.fileToImageData(file);

          // Queue for processing
          const startTime = performance.now();
          const result = await this.queueImageProcessing(imageData, file.name);
          const processingTime = performance.now() - startTime;

          processedCount.value++;

          // Update stats
          this.stats.totalProcessed++;
          this.stats.processingTime += processingTime;

          // Call progress callback if provided
          if (onProgress) {
            onProgress({
              current: processedCount.value,
              total: files.length,
              filename: file.name,
              result,
              batchIndex: batchIndex + 1,
              totalBatches: batches.length
            });
          }

          return {
            filename: file.name,
            success: true,
            ...result
          };
        } catch (error) {
          console.error(`❌ Error procesando ${file.name}:`, error);

          processedCount.value++;
          this.stats.totalErrors++;

          if (onProgress) {
            onProgress({
              current: processedCount.value,
              total: files.length,
              filename: file.name,
              error: error.message,
              batchIndex: batchIndex + 1,
              totalBatches: batches.length
            });
          }

          return {
            filename: file.name,
            success: false,
            error: error.message
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Cleanup between batches
      if (batchIndex < batches.length - 1) {
        await this.cleanupBetweenBatches();
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Procesamiento completado: ${successCount}/${files.length} exitosos`);

    return results;
  }

  /**
   * Create batches from file array
   */
  createBatches(files, batchSize) {
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Check memory usage and wait if necessary
   */
  async checkMemoryUsage() {
    if (!performance.memory) return;

    const memoryUsageMB = performance.memory.usedJSHeapSize / (1024 * 1024);

    if (memoryUsageMB > this.options.maxMemoryMB) {
      console.warn(`⚠️ Memoria alta: ${memoryUsageMB.toFixed(1)}MB, esperando cleanup...`);

      // Force garbage collection
      this.performGarbageCollection();

      // Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Cleanup between batches
   */
  async cleanupBetweenBatches() {
    console.log('🧹 Limpieza entre lotes...');

    // Force garbage collection
    this.performGarbageCollection();

    // Small delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Convert file to ImageData for worker processing with memory optimization
   */
  async fileToImageData(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Optimize image size for memory efficiency
          const maxSize = 1920;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Clean up canvas immediately
          canvas.width = 0;
          canvas.height = 0;

          // Convert to transferable format
          const result = {
            data: Array.from(imageData.data), // Convert to regular array for worker transfer
            width: imageData.width,
            height: imageData.height
          };

          // Revoke object URL to free memory
          URL.revokeObjectURL(img.src);

          resolve(result);
        } catch (error) {
          URL.revokeObjectURL(img.src);
          reject(error);
        }
      };

      img.onerror = (error) => {
        URL.revokeObjectURL(img.src);
        reject(error);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Queue image processing task
   */
  async queueImageProcessing(imageData, fileName) {
    return new Promise((resolve, reject) => {
      const task = {
        imageData,
        fileName,
        resolve,
        reject
      };

      // Try to assign to available worker immediately
      const worker = this.getAvailableWorker();
      if (worker) {
        this.processTask(worker, task);
      } else {
        // Queue for later processing
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Get available worker from pool
   */
  getAvailableWorker() {
    return this.availableWorkers.shift() || null;
  }

  /**
   * Process task with assigned worker
   */
  async processTask(worker, task) {
    try {
      this.busyWorkers.add(worker);
      worker._busy = true;

      const result = await this.sendWorkerMessage(worker, 'PROCESS_IMAGE', {
        imageData: task.imageData,
        fileName: task.fileName
      });

      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }
  }

  /**
   * Release worker back to available pool
   */
  releaseWorker(worker) {
    if (this.busyWorkers.has(worker)) {
      this.busyWorkers.delete(worker);
      worker._busy = false;
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Process next task in queue
   */
  processNextTask() {
    if (this.taskQueue.length > 0) {
      const worker = this.getAvailableWorker();
      if (worker) {
        const task = this.taskQueue.shift();
        this.processTask(worker, task);
      }
    }
  }

  /**
   * Get comprehensive pool statistics
   */
  getStats() {
    const memoryInfo = performance.memory ? {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024)),
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024))
    } : null;

    return {
      // Pool state
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      queuedTasks: this.taskQueue.length,
      initialized: this.initialized,

      // Performance stats
      totalProcessed: this.stats.totalProcessed,
      totalErrors: this.stats.totalErrors,
      averageProcessingTime: this.stats.totalProcessed > 0
        ? Math.round(this.stats.processingTime / this.stats.totalProcessed)
        : 0,
      successRate: this.stats.totalProcessed > 0
        ? Math.round(((this.stats.totalProcessed - this.stats.totalErrors) / this.stats.totalProcessed) * 100)
        : 100,

      // Memory info
      memory: memoryInfo,
      lastGC: new Date(this.stats.lastGC).toLocaleTimeString(),

      // Configuration
      config: {
        maxMemoryMB: this.options.maxMemoryMB,
        batchSize: this.options.batchSize,
        maxQueueSize: this.options.maxQueueSize,
        gcInterval: this.options.gcInterval
      }
    };
  }

  /**
   * Cleanup all workers and resources
   */
  async cleanup() {
    try {
      // Clear garbage collection timer
      if (this.gcTimer) {
        clearInterval(this.gcTimer);
        this.gcTimer = null;
      }

      // Send cleanup message to all workers
      const cleanupPromises = this.workers.map(worker =>
        this.sendWorkerMessage(worker, 'CLEANUP', null)
      );

      await Promise.all(cleanupPromises);

      // Terminate workers
      this.workers.forEach(worker => worker.terminate());

      // Clear all references
      this.workers = [];
      this.availableWorkers = [];
      this.busyWorkers.clear();
      this.taskQueue = [];
      this.taskPromises.clear();
      this.initialized = false;

      // Reset stats
      this.stats = {
        totalProcessed: 0,
        totalErrors: 0,
        processingTime: 0,
        memoryUsage: 0,
        lastGC: Date.now()
      };

      // Final garbage collection
      this.performGarbageCollection();
    } catch (error) {
      console.error('❌ Error limpiando workers:', error);
      // Force cleanup anyway
      if (this.gcTimer) {
        clearInterval(this.gcTimer);
        this.gcTimer = null;
      }
      this.workers.forEach(worker => worker.terminate());
      this.workers = [];
      this.availableWorkers = [];
      this.busyWorkers.clear();
      this.taskQueue = [];
      this.taskPromises.clear();
      this.initialized = false;
    }
  }

  /**
   * Process single image (for compatibility)
   */
  async processImage(file) {
    const results = await this.processImages([file]);
    return results[0];
  }
}

export default PPOCRWorkerPool;
