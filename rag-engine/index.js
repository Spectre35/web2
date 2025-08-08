// 🧠 RAG Engine - Motor Principal de Retrieval-Augmented Generation
// Integra todos los componentes: ingesta, búsqueda y generación

import DocumentIngester from './ingester.js';
import ContextRetriever from './retriever.js';
import ResponseGenerator from './generator.js';
import EmbeddingsEngine from './embeddings.js';
import path from 'path';
import fs from 'fs/promises';

export class RAGEngine {
  
  constructor(options = {}) {
    this.config = {
      knowledgeBasePath: options.knowledgeBasePath || './knowledge-base',
      vectorStorePath: options.vectorStorePath || './knowledge-base/vector-store.json',
      ollamaEndpoint: options.ollamaEndpoint || 'http://localhost:11434',
      embeddingModel: options.embeddingModel || 'nomic-embed-text',
      generationModel: options.generationModel || 'llama3.2:1b',
      autoIngest: options.autoIngest !== false,
      enableCache: options.enableCache !== false,
      ...options
    };
    
    // Inicializar componentes
    this.embeddings = new EmbeddingsEngine({
      endpoint: this.config.ollamaEndpoint,
      model: this.config.embeddingModel,
      enableCache: this.config.enableCache
    });
    
    this.ingester = new DocumentIngester({
      embeddingsEngine: this.embeddings,
      outputPath: this.config.vectorStorePath,
      enableCache: this.config.enableCache,
      batchSize: this.config.batchSize || 10
    });
    
    this.vectorStore = new Map();
    this.isInitialized = false;
    this.lastIngestTime = null;
    
    console.log('🧠 RAG Engine inicializando...');
  }
  
  // 🚀 Inicializar el motor RAG
  async initialize() {
    try {
      console.log('🔧 Iniciando inicialización del RAG Engine...');
      
      // 1. Verificar salud de Ollama
      await this.checkOllamaHealth();
      
      // 2. Cargar vector store existente
      await this.loadVectorStore();
      
      // 3. Auto-ingesta si está habilitada y no hay datos
      if (this.config.autoIngest && this.vectorStore.size === 0) {
        console.log('📚 Iniciando auto-ingesta de documentos...');
        await this.ingestKnowledgeBase();
      }
      
      // 4. Inicializar retriever y generator
      this.retriever = new ContextRetriever(this.vectorStore, {
        embeddings: this.embeddings,
        defaultK: this.config.defaultK || 4,
        minSimilarity: this.config.minSimilarity || 0.1
      });
      
      this.generator = new ResponseGenerator({
        ollamaEndpoint: this.config.ollamaEndpoint,
        model: this.config.generationModel,
        temperature: this.config.temperature || 0.7,
        maxTokens: this.config.maxTokens || 1000
      });
      
      this.isInitialized = true;
      console.log('✅ RAG Engine inicializado correctamente');
      
      return {
        success: true,
        vectorStoreSize: this.vectorStore.size,
        config: this.config
      };
      
    } catch (error) {
      console.error('❌ Error inicializando RAG Engine:', error);
      throw error;
    }
  }
  
  // 💬 Procesar consulta principal
  async processQuery(query, options = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG Engine no está inicializado. Llama a initialize() primero.');
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`💬 Procesando consulta: "${query.slice(0, 100)}${query.length > 100 ? '...' : ''}"`);
      
      // 1. Preparar opciones de búsqueda
      const searchOptions = {
        k: options.k || this.config.defaultK || 4,
        minSimilarity: options.minSimilarity || this.config.minSimilarity || 0.1,
        filters: options.filters || {},
        ...options.searchOptions
      };
      
      // 2. Recuperar contexto relevante
      const contextResult = await this.retriever.retrieveContext(query, searchOptions);
      
      // 3. Generar respuesta
      const generationOptions = {
        responseFormat: options.responseFormat || 'conversational',
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ...options.generationOptions
      };
      
      let response;
      
      if (contextResult.results.length > 0) {
        // Generar respuesta con contexto
        response = await this.generator.generateResponse(
          query, 
          contextResult.results, 
          generationOptions
        );
      } else {
        // Respuesta fallback sin contexto
        response = await this.generator.generateFallbackResponse(query, generationOptions);
        response.metadata.contextAvailable = false;
      }
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Consulta procesada en ${totalTime}ms`);
      
      return {
        query,
        response: response.response,
        metadata: {
          ...response.metadata,
          totalProcessingTime: totalTime,
          contextMetadata: contextResult.metadata,
          ragEngine: {
            vectorStoreSize: this.vectorStore.size,
            initialized: this.isInitialized,
            lastIngestTime: this.lastIngestTime
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error procesando consulta:', error);
      throw error;
    }
  }
  
  // 📊 Procesamiento con streaming
  async processQueryStream(query, options = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG Engine no está inicializado');
    }
    
    try {
      // 1. Recuperar contexto
      const contextResult = await this.retriever.retrieveContext(query, options.searchOptions || {});
      
      // 2. Configurar streaming
      if (contextResult.results.length > 0) {
        return await this.generator.generateStreamingResponse(
          query,
          contextResult.results,
          options.generationOptions || {}
        );
      } else {
        // Para fallback, usar respuesta normal (no streaming)
        const response = await this.generator.generateFallbackResponse(query);
        return this.createMockStream(response.response);
      }
      
    } catch (error) {
      console.error('❌ Error en streaming:', error);
      throw error;
    }
  }
  
  // 📚 Ingestar base de conocimientos
  async ingestKnowledgeBase(documentsPath = null) {
    try {
      const docsPath = documentsPath || this.config.knowledgeBasePath;
      console.log(`📚 Iniciando ingesta desde: ${docsPath}`);
      
      const result = await this.ingester.ingestDocuments(docsPath);
      
      // Recargar vector store después de la ingesta
      await this.loadVectorStore();
      
      // Reinicializar retriever con nuevo vector store
      if (this.retriever) {
        this.retriever.vectorStore = this.vectorStore;
      }
      
      this.lastIngestTime = new Date().toISOString();
      
      console.log(`✅ Ingesta completada: ${result.totalDocuments} documentos procesados`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error en ingesta:', error);
      throw error;
    }
  }
  
  // 📄 Agregar documento individual
  async addDocument(filePath, metadata = {}) {
    try {
      const result = await this.ingester.processDocument(filePath, metadata);
      
      // Agregar al vector store en memoria
      this.vectorStore.set(result.id, result);
      
      // Guardar vector store actualizado
      await this.saveVectorStore();
      
      console.log(`✅ Documento agregado: ${filePath}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error agregando documento:', error);
      throw error;
    }
  }
  
  // 🔄 Cargar vector store
  async loadVectorStore() {
    try {
      const exists = await fs.access(this.config.vectorStorePath).then(() => true).catch(() => false);
      
      if (!exists) {
        console.log('📭 No existe vector store previo, iniciando vacío');
        this.vectorStore = new Map();
        return;
      }
      
      const data = await fs.readFile(this.config.vectorStorePath, 'utf8');
      const parsed = JSON.parse(data);
      
      this.vectorStore = new Map();
      
      // Verificar si tiene la estructura nueva con "vectors" array
      if (parsed.vectors && Array.isArray(parsed.vectors)) {
        // Estructura nueva: { metadata: {...}, vectors: [...] }
        for (const doc of parsed.vectors) {
          if (doc.id) {
            this.vectorStore.set(doc.id, doc);
          }
        }
        console.log(`📦 Vector store cargado: ${this.vectorStore.size} documentos`);
      } else {
        // Estructura antigua: Map directo
        this.vectorStore = new Map(Object.entries(parsed));
        console.log(`📦 Vector store cargado: ${this.vectorStore.size} documentos`);
      }
      
    } catch (error) {
      console.warn('⚠️ Error cargando vector store, iniciando vacío:', error.message);
      this.vectorStore = new Map();
    }
  }
  
  // 💾 Guardar vector store
  async saveVectorStore() {
    try {
      // Asegurar que el directorio existe
      const dir = path.dirname(this.config.vectorStorePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Convertir Map a objeto para JSON
      const dataToSave = Object.fromEntries(this.vectorStore);
      
      await fs.writeFile(
        this.config.vectorStorePath,
        JSON.stringify(dataToSave, null, 2),
        'utf8'
      );
      
      console.log(`💾 Vector store guardado: ${this.vectorStore.size} documentos`);
      
    } catch (error) {
      console.error('❌ Error guardando vector store:', error);
      throw error;
    }
  }
  
  // 🏥 Verificar salud de Ollama
  async checkOllamaHealth() {
    try {
      const embeddingsHealth = await this.embeddings.checkOllamaHealth();
      
      // Crear generator si no existe para verificar su salud
      if (!this.generator) {
        this.generator = new ResponseGenerator({
          ollamaEndpoint: this.config.ollamaEndpoint,
          model: this.config.generationModel,
          temperature: this.config.temperature || 0.7,
          maxTokens: this.config.maxTokens || 1000
        });
      }
      
      const generatorHealth = await this.generator.checkHealth();
      
      if (!embeddingsHealth.online) {
        throw new Error(`Ollama no disponible para embeddings: ${embeddingsHealth.error}`);
      }
      
      if (!generatorHealth.online) {
        throw new Error(`Ollama no disponible para generación: ${generatorHealth.error}`);
      }
      
      // Verificar modelos específicos
      if (!embeddingsHealth.hasModel) {
        console.warn(`⚠️ Modelo de embeddings ${this.config.embeddingModel} no encontrado`);
      }
      
      if (!generatorHealth.modelAvailable) {
        console.warn(`⚠️ Modelo de generación ${this.config.generationModel} no encontrado`);
      }
      
      console.log('✅ Ollama está funcionando correctamente');
      
      return {
        embeddings: embeddingsHealth,
        generation: generatorHealth
      };
      
    } catch (error) {
      console.error('❌ Error verificando Ollama:', error);
      throw error;
    }
  }
  
  // 🔍 Buscar en base de conocimientos
  async search(query, options = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG Engine no está inicializado');
    }
    
    return await this.retriever.retrieveContext(query, options);
  }
  
  // 🔍 Búsqueda híbrida
  async hybridSearch(query, options = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG Engine no está inicializado');
    }
    
    return await this.retriever.hybridSearch(query, options);
  }
  
  // 🧹 Limpiar vector store
  async clearVectorStore() {
    this.vectorStore.clear();
    await this.saveVectorStore();
    console.log('🧹 Vector store limpiado');
  }
  
  // 📊 Estadísticas del motor
  getStats() {
    return {
      initialized: this.isInitialized,
      vectorStoreSize: this.vectorStore.size,
      lastIngestTime: this.lastIngestTime,
      config: this.config,
      components: {
        embeddings: this.embeddings ? true : false,
        retriever: this.retriever ? this.retriever.getSearchStats() : null,
        generator: this.generator ? this.generator.getGeneratorStats() : null
      }
    };
  }
  
  // 🧪 Ejecutar tests completos
  async runDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      components: {}
    };
    
    try {
      // Test de Ollama
      diagnostics.ollama = await this.checkOllamaHealth();
      
      // Test de embeddings
      if (this.embeddings) {
        diagnostics.components.embeddings = await this.embeddings.testEmbedding();
      }
      
      // Test de retrieval
      if (this.retriever) {
        diagnostics.components.retrieval = await this.retriever.testRetrieval();
      }
      
      // Test de generación
      if (this.generator) {
        diagnostics.components.generation = await this.generator.testGeneration();
      }
      
      // Test completo de RAG
      if (this.isInitialized) {
        const ragTestStart = Date.now();
        const ragResult = await this.processQuery("¿Cómo funciona el sistema?", { k: 2 });
        
        diagnostics.ragTest = {
          success: true,
          duration: Date.now() - ragTestStart,
          responseLength: ragResult.response.length,
          contextUsed: ragResult.metadata.contextMetadata?.performance?.finalResults || 0
        };
      }
      
      diagnostics.overall = {
        success: true,
        message: 'Todos los componentes funcionando correctamente'
      };
      
    } catch (error) {
      diagnostics.overall = {
        success: false,
        error: error.message
      };
    }
    
    return diagnostics;
  }
  
  // 🎛️ Actualizar configuración
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Actualizar componentes si es necesario
    if (this.generator && newConfig.generationModel) {
      this.generator.model = newConfig.generationModel;
    }
    
    if (this.embeddings && newConfig.embeddingModel) {
      this.embeddings.model = newConfig.embeddingModel;
    }
    
    console.log('⚙️ Configuración actualizada');
  }
  
  // 🔄 Crear mock stream para fallback
  createMockStream(text) {
    const chunks = text.match(/.{1,10}/g) || [text];
    let index = 0;
    
    return new ReadableStream({
      start(controller) {
        const pushChunk = () => {
          if (index < chunks.length) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({
              response: chunks[index],
              done: false
            }) + '\n'));
            index++;
            setTimeout(pushChunk, 50);
          } else {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({
              response: '',
              done: true
            }) + '\n'));
            controller.close();
          }
        };
        pushChunk();
      }
    });
  }
  
  // 🔧 Reindexar documentos
  async reindex() {
    console.log('🔄 Iniciando reindexación completa...');
    
    await this.clearVectorStore();
    await this.ingestKnowledgeBase();
    
    console.log('✅ Reindexación completada');
  }
}

export default RAGEngine;
