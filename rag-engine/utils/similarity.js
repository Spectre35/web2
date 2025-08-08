// 🔍 Utilidades de Similitud - Motor RAG
// Cálculos de similitud coseno y otras métricas

export class SimilarityUtils {
  
  // 📐 Similitud coseno entre dos vectores
  static cosineSimilarity(vecA, vecB) {
    // Validar que los vectores existan y sean arrays
    if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
      console.warn('⚠️ Vectores inválidos en similitud coseno:', { vecA: !!vecA, vecB: !!vecB });
      return 0;
    }
    
    if (vecA.length !== vecB.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }
    
    if (vecA.length === 0) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
  
  // 📊 Similitud euclidiana (distancia)
  static euclideanDistance(vecA, vecB) {
    // Validar que los vectores existan y sean arrays
    if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
      return Infinity;
    }
    
    if (vecA.length !== vecB.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }
    
    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      sum += Math.pow(vecA[i] - vecB[i], 2);
    }
    
    return Math.sqrt(sum);
  }
  
  // 🎯 Similitud euclidiana normalizada (0-1, donde 1 es más similar)
  static euclideanSimilarity(vecA, vecB) {
    // Validar que los vectores existan
    if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
      return 0;
    }
    const distance = this.euclideanDistance(vecA, vecB);
    return 1 / (1 + distance);
  }
  
  // 📈 Producto punto normalizado
  static dotProductSimilarity(vecA, vecB) {
    // Validar que los vectores existan y sean arrays
    if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
      return 0;
    }
    
    if (vecA.length !== vecB.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }
    
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    
    return dotProduct;
  }
  
  // 🔍 Búsqueda top-k más similares
  static findTopK(queryVector, documentVectors, k = 5, metric = 'cosine') {
    // Validar entrada
    if (!queryVector || !Array.isArray(documentVectors)) {
      console.warn('⚠️ Parámetros inválidos en findTopK');
      return [];
    }
    
    const similarities = documentVectors.map((docVector, index) => {
      // Validar que docVector tenga la estructura correcta
      if (!docVector || !docVector.vector) {
        console.warn(`⚠️ Documento ${index} sin vector válido`);
        return { index, similarity: 0, document: docVector };
      }
      
      let similarity;
      
      switch (metric) {
        case 'cosine':
          similarity = this.cosineSimilarity(queryVector, docVector.vector);
        default:
          similarity = this.cosineSimilarity(queryVector, docVector.vector);
      }
      
      return {
        index,
        similarity,
        metadata: docVector.metadata || {},
        content: docVector.content || ''
      };
    });
    
    // Ordenar por similitud descendente y tomar top-k
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .filter(item => item.similarity > 0.1); // Filtro mínimo de relevancia
  }
  
  // 📊 Estadísticas de similitud
  static getSimilarityStats(similarities) {
    if (similarities.length === 0) {
      return { mean: 0, max: 0, min: 0, std: 0 };
    }
    
    const scores = similarities.map(s => s.similarity);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    // Desviación estándar
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
    const std = Math.sqrt(variance);
    
    return { mean, max, min, std };
  }
  
  // 🎯 Filtro adaptativo de relevancia
  static adaptiveThreshold(similarities, minThreshold = 0.1, dynamicFactor = 0.7) {
    if (similarities.length === 0) return [];
    
    const stats = this.getSimilarityStats(similarities);
    const adaptiveThreshold = Math.max(minThreshold, stats.mean * dynamicFactor);
    
    return similarities.filter(s => s.similarity >= adaptiveThreshold);
  }
  
  // 🔄 Normalización de vectores
  static normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    
    return vector.map(val => val / magnitude);
  }
  
  // 📊 Diversidad en resultados (evitar documentos muy similares entre sí)
  static diversifyResults(results, diversityThreshold = 0.9) {
    if (results.length <= 1) return results;
    
    const diversified = [results[0]]; // Incluir el más relevante siempre
    
    for (let i = 1; i < results.length; i++) {
      const candidate = results[i];
      let tooSimilar = false;
      
      // Verificar si es muy similar a alguno ya seleccionado
      for (const selected of diversified) {
        if (selected.vector && candidate.vector) {
          const similarity = this.cosineSimilarity(selected.vector, candidate.vector);
          if (similarity > diversityThreshold) {
            tooSimilar = true;
            break;
          }
        }
      }
      
      if (!tooSimilar) {
        diversified.push(candidate);
      }
      
      // Limitar número de resultados
      if (diversified.length >= 5) break;
    }
    
    return diversified;
  }
}

export default SimilarityUtils;
