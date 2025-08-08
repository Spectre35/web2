// ✂️ Chunker Inteligente - División de Texto
// Sistema avanzado de división de documentos en chunks semánticos

export class TextChunker {
  
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.overlap = options.overlap || 200;
    this.minChunkSize = options.minChunkSize || 100;
    this.maxChunkSize = options.maxChunkSize || 2000;
    this.preserveStructure = options.preserveStructure || true;
  }
  
  // ✂️ División principal de texto
  chunkText(text, metadata = {}) {
    if (!text || text.length < this.minChunkSize) {
      return text ? [this.createChunk(text, 0, metadata)] : [];
    }
    
    // 📋 Dividir por estructura semántica
    if (this.preserveStructure) {
      return this.semanticChunking(text, metadata);
    } else {
      return this.simpleChunking(text, metadata);
    }
  }
  
  // 🧠 División semántica inteligente
  semanticChunking(text, metadata) {
    const chunks = [];
    
    // 1. Dividir por secciones (títulos, párrafos grandes)
    const sections = this.splitBySections(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const section of sections) {
      // Si la sección es muy grande, dividirla
      if (section.length > this.maxChunkSize) {
        // Guardar chunk actual si no está vacío
        if (currentChunk.trim()) {
          chunks.push(this.createChunk(currentChunk, chunkIndex++, metadata));
          currentChunk = '';
        }
        
        // Dividir sección grande
        const largeSectionChunks = this.simpleChunking(section, metadata, chunkIndex);
        chunks.push(...largeSectionChunks);
        chunkIndex += largeSectionChunks.length;
        
      } else if (currentChunk.length + section.length > this.chunkSize) {
        // Guardar chunk actual y empezar nuevo
        if (currentChunk.trim()) {
          chunks.push(this.createChunk(currentChunk, chunkIndex++, metadata));
        }
        currentChunk = this.getOverlap(currentChunk) + section;
        
      } else {
        // Agregar sección al chunk actual
        currentChunk += (currentChunk ? '\n\n' : '') + section;
      }
    }
    
    // Guardar último chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, metadata));
    }
    
    return chunks;
  }
  
  // 📄 División por secciones
  splitBySections(text) {
    // Patrones de división semántica
    const sectionPatterns = [
      /\n\s*#{1,6}\s+.+/g,        // Títulos Markdown
      /\n\s*\d+\.\s+.+/g,         // Listas numeradas
      /\n\s*[•\-\*]\s+.+/g,       // Listas con viñetas
      /\n\s*[A-Z][^.!?]*[.!?]\s*\n/g, // Párrafos que terminan en punto
      /\n\s*\n/g                  // Dobles saltos de línea
    ];
    
    // Dividir por párrafos grandes primero
    let sections = text.split(/\n\s*\n/);
    
    // Subdividir párrafos muy largos
    const result = [];
    for (const section of sections) {
      if (section.length > this.chunkSize * 1.5) {
        // Dividir por oraciones
        const sentences = this.splitBySentences(section);
        result.push(...sentences);
      } else {
        result.push(section);
      }
    }
    
    return result.filter(s => s.trim().length > 0);
  }
  
  // 📝 División por oraciones
  splitBySentences(text) {
    // Patrones para detectar final de oración
    const sentenceEnders = /[.!?]+\s+/g;
    const sentences = text.split(sentenceEnders);
    
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      if (!cleanSentence) continue;
      
      if (currentChunk.length + cleanSentence.length > this.chunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = cleanSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + cleanSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  // 🔄 División simple con overlap
  simpleChunking(text, metadata, startIndex = 0) {
    const chunks = [];
    let chunkIndex = startIndex;
    
    for (let i = 0; i < text.length; i += (this.chunkSize - this.overlap)) {
      const end = Math.min(i + this.chunkSize, text.length);
      const chunkText = text.slice(i, end);
      
      if (chunkText.trim().length >= this.minChunkSize) {
        chunks.push(this.createChunk(chunkText, chunkIndex++, metadata));
      }
      
      if (end >= text.length) break;
    }
    
    return chunks;
  }
  
  // 🔗 Obtener overlap del chunk anterior
  getOverlap(text) {
    if (!text || text.length <= this.overlap) return text;
    
    const overlapText = text.slice(-this.overlap);
    
    // Intentar cortar en un punto natural (espacio, salto de línea)
    const lastSpace = overlapText.lastIndexOf(' ');
    const lastNewline = overlapText.lastIndexOf('\n');
    const cutPoint = Math.max(lastSpace, lastNewline);
    
    if (cutPoint > this.overlap * 0.5) {
      return overlapText.slice(cutPoint + 1);
    }
    
    return overlapText;
  }
  
  // 📦 Crear objeto chunk
  createChunk(text, index, metadata) {
    return {
      id: `chunk_${index}_${Date.now()}`,
      content: text.trim(),
      index,
      length: text.trim().length,
      metadata: {
        ...metadata,
        chunkIndex: index,
        createdAt: new Date().toISOString(),
        wordCount: text.trim().split(/\s+/).length
      }
    };
  }
  
  // 📊 Estadísticas de chunking
  getChunkingStats(chunks) {
    if (chunks.length === 0) {
      return { count: 0, avgLength: 0, totalLength: 0, minLength: 0, maxLength: 0 };
    }
    
    const lengths = chunks.map(c => c.length);
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    
    return {
      count: chunks.length,
      avgLength: Math.round(totalLength / chunks.length),
      totalLength,
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      chunks: chunks.map(c => ({
        id: c.id,
        length: c.length,
        preview: c.content.slice(0, 100) + (c.content.length > 100 ? '...' : '')
      }))
    };
  }
  
  // 🔍 Chunking especializado por tipo de contenido
  chunkByContentType(text, contentType, metadata = {}) {
    const typeMetadata = { ...metadata, contentType };
    
    switch (contentType.toLowerCase()) {
      case 'manual':
        return this.chunkManual(text, typeMetadata);
      case 'faq':
        return this.chunkFAQ(text, typeMetadata);
      case 'procedure':
        return this.chunkProcedure(text, typeMetadata);
      case 'policy':
        return this.chunkPolicy(text, typeMetadata);
      default:
        return this.chunkText(text, typeMetadata);
    }
  }
  
  // 📖 Chunking especializado para manuales
  chunkManual(text, metadata) {
    // Manuales tienen estructura jerárquica
    this.chunkSize = 800; // Chunks más pequeños para manuales
    this.overlap = 150;
    
    return this.semanticChunking(text, { ...metadata, specialized: 'manual' });
  }
  
  // ❓ Chunking para FAQs
  chunkFAQ(text, metadata) {
    const qaPattern = /(?:pregunta|question|q):\s*(.+?)(?:respuesta|answer|a):\s*(.+?)(?=(?:pregunta|question|q):|$)/gis;
    const matches = [...text.matchAll(qaPattern)];
    
    if (matches.length > 0) {
      return matches.map((match, index) => {
        const question = match[1].trim();
        const answer = match[2].trim();
        const content = `Pregunta: ${question}\nRespuesta: ${answer}`;
        
        return this.createChunk(content, index, {
          ...metadata,
          type: 'faq',
          question,
          answer
        });
      });
    }
    
    // Fallback a chunking normal
    return this.chunkText(text, metadata);
  }
  
  // 📋 Chunking para procedimientos
  chunkProcedure(text, metadata) {
    // Procedimientos por pasos
    const stepPattern = /(?:paso|step)\s*\d+[:.]?\s*(.+?)(?=(?:paso|step)\s*\d+|$)/gis;
    const matches = [...text.matchAll(stepPattern)];
    
    if (matches.length > 0) {
      return matches.map((match, index) => {
        const stepContent = match[1].trim();
        const content = `Paso ${index + 1}: ${stepContent}`;
        
        return this.createChunk(content, index, {
          ...metadata,
          type: 'procedure',
          stepNumber: index + 1
        });
      });
    }
    
    return this.chunkText(text, metadata);
  }
  
  // 📜 Chunking para políticas
  chunkPolicy(text, metadata) {
    // Políticas por secciones
    this.chunkSize = 1200; // Chunks más grandes para políticas
    this.overlap = 100;
    
    return this.semanticChunking(text, { ...metadata, specialized: 'policy' });
  }
}

export default TextChunker;
