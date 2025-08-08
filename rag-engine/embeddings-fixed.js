// 🔍 Motor de Embeddings - Integración con Ollama
// Sistema de generación y gestión de embeddings vectoriales

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export class EmbeddingsEngine {
  
  constructor(options = {}) {
    this.ollamaUrl = options.endpoint || options.ollamaUrl || 'http://localhost:11434';
    this.model = options.model || 'nomic-embed-text:latest';
    this.batchSize = options.batchSize || 10;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.cacheDir = options.cacheDir || './knowledge-base/embeddings';
    this.useCache = options.useCache !== false;
    
    // Configuración de batch processing
    this.concurrentBatches = options.concurrentBatches || 3;
    this.batchDelay = options.batchDelay || 100;
    
    console.log(`🔍 EmbeddingsEngine iniciado: ${this.model} @ ${this.ollamaUrl}`);
    
    // Inicializar cache de embeddings
    this.initializeCache();
  }
  
  // 📁 Inicializar directorio de cache
  async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log(`📁 Cache de embeddings inicializado: ${this.cacheDir}`);
    } catch (error) {
      console.error('❌ Error inicializando cache:', error.message);
    }
  }
  
  // 🚀 Generar embedding para un texto
  async generateEmbedding(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Texto requerido para generar embedding');
    }
    
    const cleanText = text.trim();
    if (cleanText.length === 0) {
      throw new Error('Texto no puede estar vacío');
    }
    
    // Generar hash para cache
    const textHash = this.generateHash(cleanText);
    
    // Verificar cache si está habilitado
    if (this.useCache) {
      const cached = await this.getCachedEmbedding(textHash);
      if (cached) {
        return {
          vector: cached.vector,
          metadata: {
            ...cached.metadata,
            cached: true,
            timestamp: cached.timestamp
          }
        };
      }
    }
    
    try {
      // Generar embedding con Ollama
      const response = await this.callOllamaEmbeddings([cleanText]);
      
      if (!response.embeddings || response.embeddings.length === 0) {
        throw new Error('No se recibieron embeddings de Ollama');
      }
      
      const vector = response.embeddings[0];
      
      const result = {
        vector: vector,
        metadata: {
          ...metadata,
          textLength: cleanText.length,
          model: this.model,
          timestamp: new Date().toISOString(),
          cached: false
        }
      };
      
      // Guardar en cache si está habilitado
      if (this.useCache) {
        await this.saveCachedEmbedding(textHash, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error generando embedding:', error.message);
      throw error;
    }
  }
  
  // 🔄 Generar embeddings en lotes
  async generateBatchEmbeddings(texts, metadata = {}) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Array de textos requerido');
    }
    
    console.log(`🔄 Generando ${texts.length} embeddings en lotes de ${this.batchSize}`);
    
    const results = [];
    const batches = this.createBatches(texts, this.batchSize);
    
    // Procesar lotes con control de concurrencia
    const batchPromises = batches.map(async (batch, index) => {
      try {
        // Delay escalonado para evitar saturar Ollama
        if (index > 0) {
          await this.sleep(this.batchDelay * index);
        }
        
        return await this.processBatch(batch, index, metadata);
      } catch (error) {
        console.error(`❌ Error en lote ${index}:`, error.message);
        throw error;
      }
    });
    
    // Ejecutar hasta 3 lotes concurrentemente
    const concurrentResults = [];
    for (let i = 0; i < batchPromises.length; i += this.concurrentBatches) {
      const chunk = batchPromises.slice(i, i + this.concurrentBatches);
      const chunkResults = await Promise.all(chunk);
      concurrentResults.push(...chunkResults);
    }
    
    // Flatten results
    concurrentResults.forEach(batchResult => {
      results.push(...batchResult);
    });
    
    console.log(`✅ Completados ${results.length} embeddings`);
    return results;
  }
  
  // ⚙️ Procesar un lote individual
  async processBatch(batch, batchIndex, metadata) {
    let attempt = 0;
    const maxAttempts = this.maxRetries;
    
    while (attempt < maxAttempts) {
      try {
        console.log(`📦 Procesando lote ${batchIndex} (${batch.length} textos), intento ${attempt + 1}`);
        
        // Verificar cache para cada texto
        const uncachedTexts = [];
        const results = [];
        
        for (const text of batch) {
          const textHash = this.generateHash(text);
          const cached = this.useCache ? await this.getCachedEmbedding(textHash) : null;
          
          if (cached) {
            results.push({
              vector: cached.vector,
              metadata: { ...cached.metadata, cached: true }
            });
          } else {
            uncachedTexts.push(text);
          }
        }
        
        // Generar embeddings para textos no cacheados
        if (uncachedTexts.length > 0) {
          const response = await this.callOllamaEmbeddings(uncachedTexts);
          
          if (!response.embeddings || response.embeddings.length !== uncachedTexts.length) {
            throw new Error(`Número incorrecto de embeddings: esperado ${uncachedTexts.length}, recibido ${response.embeddings?.length || 0}`);
          }
          
          // Procesar embeddings no cacheados
          for (let i = 0; i < uncachedTexts.length; i++) {
            const text = uncachedTexts[i];
            const vector = response.embeddings[i];
            
            const result = {
              vector: vector,
              metadata: {
                ...metadata,
                textLength: text.length,
                model: this.model,
                timestamp: new Date().toISOString(),
                cached: false,
                batchIndex: batchIndex
              }
            };
            
            results.push(result);
            
            // Guardar en cache
            if (this.useCache) {
              const textHash = this.generateHash(text);
              await this.saveCachedEmbedding(textHash, result);
            }
          }
        }
        
        return results;
        
      } catch (error) {
        attempt++;
        console.warn(`⚠️ Intento ${attempt}/${this.maxRetries} falló: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
  }
  
  // 🌐 Llamada a la API de Ollama
  async callOllamaEmbeddings(texts) {
    const requestBody = {
      model: this.model,
      input: texts
    };
    
    const response = await axios.post(
      `${this.ollamaUrl}/api/embed`,
      requestBody,
      {
        timeout: 60000, // 60 segundos timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.data;
  }
  
  // 🔑 Generar hash para cache
  generateHash(text) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text + this.model).digest('hex');
  }
  
  // 📦 Crear lotes
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
  
  // 💾 Obtener embedding cacheado
  async getCachedEmbedding(hash) {
    try {
      const cachePath = path.join(this.cacheDir, `${hash}.json`);
      const data = await fs.readFile(cachePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
  
  // 💾 Guardar embedding en cache
  async saveCachedEmbedding(hash, embedding) {
    try {
      const cachePath = path.join(this.cacheDir, `${hash}.json`);
      await fs.writeFile(cachePath, JSON.stringify(embedding, null, 2));
    } catch (error) {
      console.warn('⚠️ Error guardando en cache:', error.message);
    }
  }
  
  // 🧹 Limpiar cache
  async clearCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        await fs.unlink(path.join(this.cacheDir, file));
      }
      
      console.log(`🧹 Cache limpiado: ${jsonFiles.length} archivos eliminados`);
      return { cleared: jsonFiles.length };
    } catch (error) {
      console.error('❌ Error limpiando cache:', error.message);
      return { cleared: 0, error: error.message };
    }
  }
  
  // 📊 Estadísticas del cache
  async getCacheStats() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      let totalSize = 0;
      for (const file of jsonFiles) {
        const stat = await fs.stat(path.join(this.cacheDir, file));
        totalSize += stat.size;
      }
      
      return {
        fileCount: jsonFiles.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        avgFileSize: jsonFiles.length > 0 ? Math.round(totalSize / jsonFiles.length) : 0
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de cache:', error.message);
      return { fileCount: 0, totalSize: 0, totalSizeMB: '0.00', avgFileSize: 0 };
    }
  }
  
  // 🏥 Verificar salud de Ollama
  async checkOllamaHealth() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = response.data;
      const hasModel = data.models?.some(model => model.name === this.model);
      
      return {
        online: true,
        endpoint: this.ollamaUrl,
        hasModel: hasModel,
        model: this.model,
        availableModels: data.models?.map(m => m.name) || []
      };
      
    } catch (error) {
      return {
        online: false,
        error: error.message,
        endpoint: this.ollamaUrl,
        model: this.model
      };
    }
  }
  
  // 🧪 Probar generación de embeddings
  async testEmbedding(testText = "Esto es una prueba de embeddings") {
    try {
      const start = Date.now();
      const embedding = await this.generateEmbedding(testText, { test: true });
      const duration = Date.now() - start;
      
      return {
        success: true,
        duration,
        dimensions: embedding.vector.length,
        sampleValues: embedding.vector.slice(0, 5),
        textLength: testText.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 😴 Función de espera
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 📊 Obtener información del modelo
  async getModelInfo() {
    try {
      const health = await this.checkOllamaHealth();
      const test = await this.testEmbedding();
      const cache = await this.getCacheStats();
      
      return {
        model: this.model,
        ollamaUrl: this.ollamaUrl,
        health,
        test,
        cache,
        config: {
          batchSize: this.batchSize,
          maxRetries: this.maxRetries,
          useCache: this.useCache,
          cacheDir: this.cacheDir
        }
      };
      
    } catch (error) {
      return {
        model: this.model,
        error: error.message
      };
    }
  }
}

export default EmbeddingsEngine;
