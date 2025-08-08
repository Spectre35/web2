// 📥 Ingester Principal - Sistema RAG
// Orquestador principal de ingesta de documentos y generación de base de conocimiento

import DocumentLoader from './utils/loader.js';
import TextChunker from './utils/chunker.js';
import EmbeddingsEngine from './embeddings.js';
import fs from 'fs/promises';
import path from 'path';

export class DocumentIngester {
  
  constructor(options = {}) {
    this.knowledgeBaseDir = options.knowledgeBaseDir || './knowledge-base';
    this.docsDir = path.join(this.knowledgeBaseDir, 'docs');
    this.chunksDir = path.join(this.knowledgeBaseDir, 'chunks');
    this.vectorStoreFile = path.join(this.knowledgeBaseDir, 'vector-store.json');
    
    // Inicializar componentes
    this.loader = new DocumentLoader(options.loader);
    this.chunker = new TextChunker(options.chunker);
    this.embeddings = new EmbeddingsEngine(options.embeddings);
    
    // Configuración
    this.maxConcurrency = options.maxConcurrency || 3;
    this.saveChunks = options.saveChunks !== false;
    this.autoUpdate = options.autoUpdate !== false;
    
    this.vectorStore = new Map();
    this.metadata = {
      lastUpdate: null,
      documentCount: 0,
      chunkCount: 0,
      totalEmbeddings: 0
    };
    
    this.initialize();
  }
  
  // 🚀 Inicializar el ingester
  async initialize() {
    try {
      // Crear directorios necesarios
      await Promise.all([
        fs.mkdir(this.knowledgeBaseDir, { recursive: true }),
        fs.mkdir(this.docsDir, { recursive: true }),
        fs.mkdir(this.chunksDir, { recursive: true })
      ]);
      
      // Cargar vector store existente si existe
      await this.loadVectorStore();
      
      console.log('🚀 DocumentIngester inicializado');
      console.log(`📁 Directorio base: ${this.knowledgeBaseDir}`);
      console.log(`📊 Vector store: ${this.vectorStore.size} embeddings cargados`);
      
    } catch (error) {
      console.error('❌ Error inicializando DocumentIngester:', error);
      throw error;
    }
  }
  
  // 📄 Proceso completo de ingesta
  async ingestDocuments(options = {}) {
    const startTime = Date.now();
    console.log('🔄 Iniciando proceso de ingesta de documentos...');
    
    try {
      // 1. Verificar Ollama
      const health = await this.embeddings.checkOllamaHealth();
      if (!health.online) {
        throw new Error(`Ollama no disponible: ${health.error}`);
      }
      
      if (!health.hasModel) {
        console.warn(`⚠️ Modelo de embedding ${this.embeddings.model} no encontrado`);
        console.log('💡 Ejecuta: ollama pull nomic-embed-text');
      }
      
      // 2. Cargar documentos
      console.log('📂 Cargando documentos...');
      const documents = await this.loader.loadDocuments(this.docsDir);
      
      if (documents.length === 0) {
        console.warn('⚠️ No se encontraron documentos para procesar');
        console.log(`💡 Coloca archivos .txt, .md, .csv en: ${this.docsDir}`);
        return { success: false, message: 'No hay documentos para procesar' };
      }
      
      // 3. Procesar documentos por lotes
      const results = {
        documentsProcessed: 0,
        chunksGenerated: 0,
        embeddingsCreated: 0,
        errors: [],
        performance: {}
      };
      
      for (let i = 0; i < documents.length; i += this.maxConcurrency) {
        const batch = documents.slice(i, i + this.maxConcurrency);
        const batchResults = await this.processBatch(batch, i);
        
        results.documentsProcessed += batchResults.documentsProcessed;
        results.chunksGenerated += batchResults.chunksGenerated;
        results.embeddingsCreated += batchResults.embeddingsCreated;
        results.errors.push(...batchResults.errors);
        
        console.log(`📊 Progreso: ${results.documentsProcessed}/${documents.length} documentos`);
      }
      
      // 4. Guardar vector store
      await this.saveVectorStore();
      
      // 5. Actualizar metadatos
      this.metadata = {
        lastUpdate: new Date().toISOString(),
        documentCount: results.documentsProcessed,
        chunkCount: results.chunksGenerated,
        totalEmbeddings: results.embeddingsCreated,
        processingTime: Date.now() - startTime
      };
      
      console.log('✅ Ingesta completada exitosamente');
      console.log(`📊 Resultados: ${results.documentsProcessed} docs, ${results.chunksGenerated} chunks, ${results.embeddingsCreated} embeddings`);
      console.log(`⏱️ Tiempo total: ${Math.round((Date.now() - startTime) / 1000)}s`);
      
      return {
        success: true,
        ...results,
        metadata: this.metadata
      };
      
    } catch (error) {
      console.error('❌ Error en ingesta:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  // 📦 Procesar lote de documentos
  async processBatch(documents, batchIndex) {
    const results = {
      documentsProcessed: 0,
      chunksGenerated: 0,
      embeddingsCreated: 0,
      errors: []
    };
    
    console.log(`📦 Procesando lote ${Math.floor(batchIndex / this.maxConcurrency) + 1}: ${documents.length} documentos`);
    
    for (const document of documents) {
      try {
        const docResult = await this.processDocument(document);
        
        results.documentsProcessed++;
        results.chunksGenerated += docResult.chunksGenerated;
        results.embeddingsCreated += docResult.embeddingsCreated;
        
      } catch (error) {
        console.error(`❌ Error procesando ${document.metadata.fileName}:`, error.message);
        results.errors.push({
          document: document.metadata.fileName,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  // 📄 Procesar documento individual
  async processDocument(document) {
    console.log(`📄 Procesando: ${document.metadata.fileName}`);
    
    // 1. Generar chunks
    const chunks = this.chunker.chunkByContentType(
      document.content,
      document.metadata.contentType,
      {
        ...document.metadata,
        documentId: document.id
      }
    );
    
    if (chunks.length === 0) {
      throw new Error('No se generaron chunks para el documento');
    }
    
    // 2. Generar embeddings para los chunks
    const chunkTexts = chunks.map(chunk => chunk.content);
    const chunkMetadata = chunks.map(chunk => chunk.metadata);
    
    const embeddings = await this.embeddings.generateBatchEmbeddings(chunkTexts, chunkMetadata);
    
    // 3. Guardar en vector store
    let embeddingsCreated = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      
      if (embedding.vector) {
        const vectorId = `${document.id}_chunk_${i}`;
        
        this.vectorStore.set(vectorId, {
          id: vectorId,
          vector: embedding.vector,
          content: chunk.content,
          metadata: {
            ...chunk.metadata,
            ...embedding.metadata,
            documentId: document.id,
            chunkIndex: i
          }
        });
        
        embeddingsCreated++;
      }
    }
    
    // 4. Guardar chunks si está habilitado
    if (this.saveChunks) {
      await this.saveDocumentChunks(document.id, chunks);
    }
    
    return {
      chunksGenerated: chunks.length,
      embeddingsCreated
    };
  }
  
  // 💾 Guardar chunks de documento
  async saveDocumentChunks(documentId, chunks) {
    try {
      const filePath = path.join(this.chunksDir, `${documentId}.json`);
      const data = {
        documentId,
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata
        })),
        createdAt: new Date().toISOString()
      };
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn(`⚠️ Error guardando chunks para ${documentId}:`, error.message);
    }
  }
  
  // 💾 Guardar vector store
  async saveVectorStore() {
    try {
      const data = {
        metadata: this.metadata,
        vectors: Array.from(this.vectorStore.entries()).map(([id, vector]) => ({
          id,
          ...vector
        }))
      };
      
      await fs.writeFile(this.vectorStoreFile, JSON.stringify(data, null, 2));
      console.log(`💾 Vector store guardado: ${this.vectorStore.size} embeddings`);
      
    } catch (error) {
      console.error('❌ Error guardando vector store:', error);
    }
  }
  
  // 📂 Cargar vector store existente
  async loadVectorStore() {
    try {
      const data = await fs.readFile(this.vectorStoreFile, 'utf8');
      const parsed = JSON.parse(data);
      
      this.metadata = parsed.metadata || this.metadata;
      
      if (parsed.vectors && Array.isArray(parsed.vectors)) {
        this.vectorStore.clear();
        
        for (const vector of parsed.vectors) {
          this.vectorStore.set(vector.id, {
            id: vector.id,
            vector: vector.vector,
            content: vector.content,
            metadata: vector.metadata || {}
          });
        }
        
        console.log(`📂 Vector store cargado: ${this.vectorStore.size} embeddings`);
      }
      
    } catch (error) {
      console.log('📂 No se encontró vector store existente, empezando desde cero');
    }
  }
  
  // 🔄 Actualización incremental
  async updateDocuments() {
    console.log('🔄 Verificando documentos actualizados...');
    
    try {
      const documents = await this.loader.loadDocuments(this.docsDir);
      const newOrUpdated = [];
      
      for (const doc of documents) {
        const existingVectors = Array.from(this.vectorStore.values())
          .filter(v => v.metadata.documentId === doc.id);
        
        if (existingVectors.length === 0) {
          // Documento nuevo
          newOrUpdated.push(doc);
        } else {
          // Verificar si el documento cambió
          const lastModified = new Date(doc.metadata.modified);
          const lastProcessed = new Date(existingVectors[0].metadata.createdAt);
          
          if (lastModified > lastProcessed) {
            // Documento actualizado - remover versiones anteriores
            for (const vector of existingVectors) {
              this.vectorStore.delete(vector.id);
            }
            newOrUpdated.push(doc);
          }
        }
      }
      
      if (newOrUpdated.length > 0) {
        console.log(`🔄 Procesando ${newOrUpdated.length} documentos nuevos/actualizados`);
        
        for (const doc of newOrUpdated) {
          await this.processDocument(doc);
        }
        
        await this.saveVectorStore();
        console.log('✅ Actualización incremental completada');
      } else {
        console.log('✅ Todos los documentos están actualizados');
      }
      
      return { updated: newOrUpdated.length };
      
    } catch (error) {
      console.error('❌ Error en actualización incremental:', error);
      throw error;
    }
  }
  
  // 📊 Obtener estadísticas
  getStats() {
    const vectorArray = Array.from(this.vectorStore.values());
    
    const contentTypes = {};
    const categories = {};
    let totalContentLength = 0;
    
    vectorArray.forEach(vector => {
      const contentType = vector.metadata.contentType || 'unknown';
      const category = vector.metadata.category || 'unknown';
      
      contentTypes[contentType] = (contentTypes[contentType] || 0) + 1;
      categories[category] = (categories[category] || 0) + 1;
      totalContentLength += vector.content.length;
    });
    
    return {
      metadata: this.metadata,
      vectorStore: {
        size: this.vectorStore.size,
        avgContentLength: this.vectorStore.size > 0 ? Math.round(totalContentLength / this.vectorStore.size) : 0,
        contentTypes,
        categories
      },
      directories: {
        knowledgeBase: this.knowledgeBaseDir,
        docs: this.docsDir,
        chunks: this.chunksDir
      }
    };
  }
  
  // 🧹 Limpiar datos
  async clearAll() {
    console.log('🧹 Limpiando todos los datos...');
    
    try {
      this.vectorStore.clear();
      
      // Eliminar archivos
      await Promise.all([
        fs.unlink(this.vectorStoreFile).catch(() => {}),
        this.embeddings.clearCache()
      ]);
      
      // Limpiar directorio de chunks
      try {
        const files = await fs.readdir(this.chunksDir);
        await Promise.all(
          files.map(file => fs.unlink(path.join(this.chunksDir, file)))
        );
      } catch (error) {
        // Directorio no existe o está vacío
      }
      
      this.metadata = {
        lastUpdate: null,
        documentCount: 0,
        chunkCount: 0,
        totalEmbeddings: 0
      };
      
      console.log('✅ Todos los datos limpiados');
      
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
      throw error;
    }
  }
  
  // 🔍 Obtener vector store (para el retriever)
  getVectorStore() {
    return this.vectorStore;
  }
}

export default DocumentIngester;
