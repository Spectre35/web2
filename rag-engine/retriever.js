// 🎯 Retriever - Sistema de Búsqueda de Contexto
// Motor de recuperación de información relevante para RAG

import SimilarityUtils from './utils/similarity.js';
import EmbeddingsEngine from './embeddings.js';

export class ContextRetriever {
  
  constructor(vectorStore, options = {}) {
    this.vectorStore = vectorStore;
    this.embeddings = new EmbeddingsEngine(options.embeddings);
    
    // Configuración de búsqueda optimizada para velocidad
    this.defaultK = options.defaultK || 2; // Menos documentos para procesar más rápido
    this.maxK = options.maxK || 3; // Límite máximo reducido
    this.minSimilarity = options.minSimilarity || 0.2; // Umbral más bajo para encontrar resultados
    this.diversityThreshold = options.diversityThreshold || 0.9; // Menos estricto
    this.useAdaptiveThreshold = options.useAdaptiveThreshold !== false;
    this.enableReranking = false; // Deshabilitado para velocidad
    
    // Configuración de filtros simplificada
    this.enableFilters = false; // Deshabilitado para velocidad
    this.boostFactors = options.boostFactors || {
      contentType: { manual: 1.1, faq: 1.05, procedure: 1.1 },
      category: { aclaraciones: 1.05, ventas: 1.02 },
      priority: { 5: 1.1, 4: 1.05, 3: 1.0, 2: 1.0, 1: 1.0 }
    };
  }
  
  // 🔍 Búsqueda principal de contexto
  async retrieveContext(query, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Buscando contexto para: "${query.slice(0, 100)}${query.length > 100 ? '...' : ''}"`);
      
      // 1. Generar embedding de la consulta
      const queryEmbedding = await this.embeddings.generateEmbedding(query, { 
        isQuery: true,
        timestamp: new Date().toISOString()
      });
      
      // 2. Configurar parámetros de búsqueda
      const searchParams = {
        k: options.k || this.defaultK,
        minSimilarity: options.minSimilarity || this.minSimilarity,
        filters: options.filters || {},
        contentTypes: options.contentTypes || [],
        categories: options.categories || [],
        boostQuery: options.boostQuery || true
      };
      
      // 3. Buscar documentos similares
      const candidates = this.findSimilarDocuments(queryEmbedding.vector, searchParams);
      
      // 4. Aplicar filtros si están habilitados
      let filteredCandidates = candidates;
      if (this.enableFilters && Object.keys(searchParams.filters).length > 0) {
        filteredCandidates = this.applyFilters(candidates, searchParams.filters);
      }
      
      // 5. Re-ranking si está habilitado
      if (this.enableReranking) {
        filteredCandidates = this.rerankResults(filteredCandidates, query);
      }
      
      // 6. Diversificar resultados
      const diversifiedResults = SimilarityUtils.diversifyResults(
        filteredCandidates,
        this.diversityThreshold
      );
      
      // 7. Aplicar threshold adaptativo
      let finalResults = diversifiedResults;
      if (this.useAdaptiveThreshold) {
        finalResults = SimilarityUtils.adaptiveThreshold(
          diversifiedResults,
          searchParams.minSimilarity
        );
      }
      
      // 8. Limitar resultados finales
      finalResults = finalResults.slice(0, Math.min(searchParams.k, this.maxK));
      
      const retrievalTime = Date.now() - startTime;
      
      console.log(`✅ Contexto recuperado: ${finalResults.length} documentos (${retrievalTime}ms)`);
      
      return {
        results: finalResults,
        metadata: {
          query,
          queryEmbedding: queryEmbedding.metadata,
          searchParams,
          performance: {
            retrievalTime,
            candidatesFound: candidates.length,
            afterFiltering: filteredCandidates.length,
            afterDiversification: diversifiedResults.length,
            finalResults: finalResults.length
          },
          similarities: finalResults.map(r => r.similarity)
        }
      };
      
    } catch (error) {
      console.error('❌ Error en recuperación de contexto:', error);
      throw error;
    }
  }
  
  // 🔎 Buscar documentos similares
  findSimilarDocuments(queryVector, searchParams) {
    if (this.vectorStore.size === 0) {
      console.warn('⚠️ Vector store está vacío');
      return [];
    }
    
    const documentVectors = Array.from(this.vectorStore.values()).map(doc => ({
      ...doc,
      vector: doc.vector
    }));
    
    // Búsqueda por similitud coseno
    const results = SimilarityUtils.findTopK(
      queryVector,
      documentVectors,
      searchParams.k * 2, // Buscar más para filtrar después
      'cosine'
    );
    
    // Aplicar boost factors si está habilitado
    if (searchParams.boostQuery) {
      return this.applyBoostFactors(results);
    }
    
    return results;
  }
  
  // 🚀 Aplicar factores de boost
  applyBoostFactors(results) {
    return results.map(result => {
      let boostedSimilarity = result.similarity;
      const metadata = result.metadata || {};
      
      // Boost por tipo de contenido
      const contentType = metadata.contentType;
      if (contentType && this.boostFactors.contentType[contentType]) {
        boostedSimilarity *= this.boostFactors.contentType[contentType];
      }
      
      // Boost por categoría
      const category = metadata.category;
      if (category && this.boostFactors.category[category]) {
        boostedSimilarity *= this.boostFactors.category[category];
      }
      
      // Boost por prioridad
      const priority = metadata.priority;
      if (priority && this.boostFactors.priority[priority]) {
        boostedSimilarity *= this.boostFactors.priority[priority];
      }
      
      // Boost por recencia (documentos más recientes)
      const createdAt = metadata.createdAt;
      if (createdAt) {
        const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0.9, 1 - (ageInDays / 365) * 0.1); // Máximo 10% de reducción por año
        boostedSimilarity *= recencyBoost;
      }
      
      return {
        ...result,
        originalSimilarity: result.similarity,
        similarity: Math.min(boostedSimilarity, 1.0) // Limitar a 1.0
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }
  
  // 🔧 Aplicar filtros específicos
  applyFilters(results, filters) {
    return results.filter(result => {
      const metadata = result.metadata || {};
      
      // Filtro por tipo de contenido
      if (filters.contentTypes && filters.contentTypes.length > 0) {
        if (!filters.contentTypes.includes(metadata.contentType)) {
          return false;
        }
      }
      
      // Filtro por categoría
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(metadata.category)) {
          return false;
        }
      }
      
      // Filtro por rango de fechas
      if (filters.dateRange) {
        const docDate = new Date(metadata.createdAt);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        
        if (docDate < startDate || docDate > endDate) {
          return false;
        }
      }
      
      // Filtro por palabras clave en metadata
      if (filters.keywords && filters.keywords.length > 0) {
        const searchText = `${metadata.fileName || ''} ${metadata.category || ''} ${result.content || ''}`.toLowerCase();
        const hasKeyword = filters.keywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) {
          return false;
        }
      }
      
      // Filtro por tamaño mínimo de contenido
      if (filters.minContentLength && result.content.length < filters.minContentLength) {
        return false;
      }
      
      return true;
    });
  }
  
  // 🎯 Re-ranking de resultados
  rerankResults(results, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    return results.map(result => {
      const content = result.content.toLowerCase();
      let rerankScore = result.similarity;
      
      // Bonus por coincidencias exactas de palabras
      let exactMatches = 0;
      queryWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = (content.match(regex) || []).length;
        exactMatches += matches;
      });
      
      if (exactMatches > 0) {
        const exactMatchBoost = Math.min(0.2, exactMatches * 0.05);
        rerankScore += exactMatchBoost;
      }
      
      // Bonus por longitud de contenido relevante
      const contentLength = result.content.length;
      if (contentLength > 200 && contentLength < 2000) {
        rerankScore += 0.05; // Contenido de tamaño medio es preferible
      }
      
      // Penalty por contenido muy corto o muy largo
      if (contentLength < 50) {
        rerankScore -= 0.1;
      } else if (contentLength > 3000) {
        rerankScore -= 0.05;
      }
      
      return {
        ...result,
        originalSimilarity: result.similarity,
        similarity: Math.min(rerankScore, 1.0),
        exactMatches
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }
  
  // 🎯 Búsqueda híbrida (semántica + por palabras clave)
  async hybridSearch(query, options = {}) {
    try {
      // 1. Búsqueda semántica normal
      const semanticResults = await this.retrieveContext(query, {
        ...options,
        k: Math.min((options.k || this.defaultK) * 2, this.maxK)
      });
      
      // 2. Búsqueda por palabras clave
      const keywordResults = this.keywordSearch(query, options);
      
      // 3. Combinar y fusionar resultados
      const combinedResults = this.mergeSearchResults(
        semanticResults.results,
        keywordResults,
        options.k || this.defaultK
      );
      
      return {
        results: combinedResults,
        metadata: {
          ...semanticResults.metadata,
          hybridSearch: true,
          semanticCount: semanticResults.results.length,
          keywordCount: keywordResults.length,
          combinedCount: combinedResults.length
        }
      };
      
    } catch (error) {
      console.error('❌ Error en búsqueda híbrida:', error);
      throw error;
    }
  }
  
  // 🔤 Búsqueda por palabras clave
  keywordSearch(query, options = {}) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    const results = [];
    
    for (const [id, doc] of this.vectorStore.entries()) {
      const content = doc.content.toLowerCase();
      let score = 0;
      let matches = 0;
      
      // Contar coincidencias de palabras
      queryWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const wordMatches = (content.match(regex) || []).length;
        if (wordMatches > 0) {
          matches++;
          score += wordMatches / queryWords.length;
        }
      });
      
      // Solo incluir si hay al menos una coincidencia
      if (matches > 0) {
        // Normalizar score
        const normalizedScore = Math.min(score / queryWords.length, 1.0);
        
        results.push({
          index: id,
          similarity: normalizedScore,
          content: doc.content,
          metadata: {
            ...doc.metadata,
            searchType: 'keyword',
            keywordMatches: matches,
            totalQueryWords: queryWords.length
          }
        });
      }
    }
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.k || this.defaultK);
  }
  
  // 🔀 Fusionar resultados de búsqueda semántica y por palabras clave
  mergeSearchResults(semanticResults, keywordResults, k) {
    const mergedMap = new Map();
    
    // Agregar resultados semánticos
    semanticResults.forEach((result, index) => {
      mergedMap.set(result.index, {
        ...result,
        semanticRank: index + 1,
        semanticScore: result.similarity,
        sources: ['semantic']
      });
    });
    
    // Agregar resultados por palabras clave
    keywordResults.forEach((result, index) => {
      const existing = mergedMap.get(result.index);
      
      if (existing) {
        // Combinar scores si ya existe
        existing.keywordRank = index + 1;
        existing.keywordScore = result.similarity;
        existing.sources.push('keyword');
        
        // Score combinado: promedio ponderado
        const semanticWeight = 0.7;
        const keywordWeight = 0.3;
        existing.similarity = (
          existing.semanticScore * semanticWeight +
          result.similarity * keywordWeight
        );
      } else {
        // Nuevo resultado solo de keywords
        mergedMap.set(result.index, {
          ...result,
          keywordRank: index + 1,
          keywordScore: result.similarity,
          sources: ['keyword']
        });
      }
    });
    
    // Convertir a array y ordenar por score combinado
    return Array.from(mergedMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }
  
  // 📊 Estadísticas de búsqueda
  getSearchStats() {
    return {
      vectorStoreSize: this.vectorStore.size,
      config: {
        defaultK: this.defaultK,
        maxK: this.maxK,
        minSimilarity: this.minSimilarity,
        diversityThreshold: this.diversityThreshold,
        useAdaptiveThreshold: this.useAdaptiveThreshold,
        enableReranking: this.enableReranking,
        enableFilters: this.enableFilters
      },
      boostFactors: this.boostFactors
    };
  }
  
  // 🧪 Probar búsqueda
  async testRetrieval(testQuery = "¿Cómo funciona el sistema?") {
    try {
      const start = Date.now();
      const result = await this.retrieveContext(testQuery, { k: 3 });
      const duration = Date.now() - start;
      
      return {
        success: true,
        testQuery,
        duration,
        resultsCount: result.results.length,
        avgSimilarity: result.results.length > 0 
          ? result.results.reduce((sum, r) => sum + r.similarity, 0) / result.results.length 
          : 0,
        topResults: result.results.slice(0, 2).map(r => ({
          similarity: r.similarity,
          contentPreview: r.content.slice(0, 100) + '...',
          metadata: r.metadata
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default ContextRetriever;
