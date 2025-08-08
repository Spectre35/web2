// 📂 Cargador de Archivos - Motor RAG
// Sistema avanzado de carga y procesamiento de documentos

import fs from 'fs/promises';
import path from 'path';

export class DocumentLoader {
  
  constructor(options = {}) {
    this.supportedExtensions = options.supportedExtensions || ['.txt', '.md', '.csv', '.json'];
    this.encoding = options.encoding || 'utf8';
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.recursive = options.recursive !== false;
  }
  
  // 📂 Cargar documentos desde directorio
  async loadDocuments(directoryPath) {
    try {
      console.log(`📂 Cargando documentos desde: ${directoryPath}`);
      
      const files = await this.getFiles(directoryPath, this.recursive);
      const documents = [];
      
      for (const filePath of files) {
        try {
          const doc = await this.loadSingleDocument(filePath);
          if (doc) {
            documents.push(doc);
          }
        } catch (error) {
          console.error(`❌ Error cargando ${filePath}:`, error.message);
        }
      }
      
      console.log(`✅ Cargados ${documents.length} documentos exitosamente`);
      return documents;
      
    } catch (error) {
      console.error('❌ Error cargando documentos:', error);
      throw error;
    }
  }
  
  // 📄 Cargar un documento individual
  async loadSingleDocument(filePath) {
    const stats = await fs.stat(filePath);
    
    // Verificar tamaño del archivo
    if (stats.size > this.maxFileSize) {
      console.warn(`⚠️ Archivo muy grande: ${filePath} (${this.formatFileSize(stats.size)})`);
      return null;
    }
    
    // Verificar extensión
    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedExtensions.includes(ext)) {
      console.warn(`⚠️ Extensión no soportada: ${filePath}`);
      return null;
    }
    
    const content = await fs.readFile(filePath, this.encoding);
    
    if (!content.trim()) {
      console.warn(`⚠️ Archivo vacío: ${filePath}`);
      return null;
    }
    
    const metadata = await this.extractMetadata(filePath, stats);
    const processedContent = this.preprocessContent(content, ext);
    
    return {
      id: this.generateDocumentId(filePath),
      content: processedContent,
      metadata,
      filePath,
      size: stats.size,
      extension: ext
    };
  }
  
  // 🔍 Obtener lista de archivos
  async getFiles(dirPath, recursive = true) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && recursive) {
          // Evitar directorios de sistema y ocultos
          if (!entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
            const subFiles = await this.getFiles(fullPath, recursive);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error leyendo directorio ${dirPath}:`, error.message);
    }
    
    return files;
  }
  
  // 📊 Extraer metadata del archivo
  async extractMetadata(filePath, stats) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    
    // Detectar tipo de contenido basado en la estructura de directorios
    const contentType = this.detectContentType(dirName, fileName);
    
    // Detectar categoría basada en palabras clave en el nombre
    const category = this.detectCategory(fileName);
    
    return {
      fileName,
      baseName,
      extension: ext,
      directory: dirName,
      fullPath: filePath,
      size: stats.size,
      sizeFormatted: this.formatFileSize(stats.size),
      created: stats.birthtime,
      modified: stats.mtime,
      contentType,
      category,
      language: this.detectLanguage(fileName),
      priority: this.calculatePriority(fileName, dirName)
    };
  }
  
  // 🔍 Detectar tipo de contenido
  detectContentType(dirPath, fileName) {
    const dirLower = dirPath.toLowerCase();
    const fileLower = fileName.toLowerCase();
    
    if (dirLower.includes('manual') || fileLower.includes('manual')) return 'manual';
    if (dirLower.includes('faq') || fileLower.includes('faq')) return 'faq';
    if (dirLower.includes('procedimiento') || fileLower.includes('procedure')) return 'procedure';
    if (dirLower.includes('politica') || fileLower.includes('policy')) return 'policy';
    if (dirLower.includes('guia') || fileLower.includes('guide')) return 'guide';
    if (dirLower.includes('tutorial')) return 'tutorial';
    
    return 'document';
  }
  
  // 🏷️ Detectar categoría
  detectCategory(fileName) {
    const fileLower = fileName.toLowerCase();
    
    const categories = {
      'aclaraciones': ['aclaracion', 'claim', 'dispute'],
      'ventas': ['venta', 'sale', 'sell', 'cobranza'],
      'sucursales': ['sucursal', 'branch', 'office'],
      'cargos': ['cargo', 'charge', 'fee'],
      'sistema': ['sistema', 'system', 'config'],
      'usuario': ['usuario', 'user', 'manual'],
      'tecnico': ['tecnico', 'technical', 'admin']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => fileLower.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }
  
  // 🌐 Detectar idioma
  detectLanguage(fileName) {
    const fileLower = fileName.toLowerCase();
    
    if (fileLower.includes('_en') || fileLower.includes('_english')) return 'en';
    if (fileLower.includes('_es') || fileLower.includes('_español')) return 'es';
    
    // Por defecto español para este sistema
    return 'es';
  }
  
  // ⭐ Calcular prioridad del documento
  calculatePriority(fileName, dirPath) {
    let priority = 1;
    
    const fileLower = fileName.toLowerCase();
    const dirLower = dirPath.toLowerCase();
    
    // Prioridad alta para documentos importantes
    if (fileLower.includes('importante') || fileLower.includes('critical')) priority += 2;
    if (fileLower.includes('manual') || fileLower.includes('guia')) priority += 1;
    if (fileLower.includes('faq') || fileLower.includes('frecuente')) priority += 1;
    
    // Prioridad por directorio
    if (dirLower.includes('importante') || dirLower.includes('critical')) priority += 2;
    if (dirLower.includes('manual')) priority += 1;
    
    return Math.min(priority, 5); // Máximo 5
  }
  
  // 🧹 Preprocesar contenido
  preprocessContent(content, extension) {
    let processed = content;
    
    // Normalizar saltos de línea
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Limpiar espacios excesivos
    processed = processed.replace(/[ \t]+/g, ' ');
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Procesar según el tipo de archivo
    switch (extension) {
      case '.md':
        processed = this.preprocessMarkdown(processed);
        break;
      case '.csv':
        processed = this.preprocessCSV(processed);
        break;
      case '.json':
        processed = this.preprocessJSON(processed);
        break;
    }
    
    return processed.trim();
  }
  
  // 📝 Preprocesar Markdown
  preprocessMarkdown(content) {
    // Convertir headers a texto plano pero mantener estructura
    content = content.replace(/^#{1,6}\s+(.+)$/gm, '$1\n' + '='.repeat(20));
    
    // Limpiar enlaces pero mantener el texto
    content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Limpiar código inline
    content = content.replace(/`([^`]+)`/g, '$1');
    
    // Limpiar bloques de código pero mantener contenido relevante
    content = content.replace(/```[\s\S]*?```/g, '[CÓDIGO OMITIDO]');
    
    return content;
  }
  
  // 📊 Preprocesar CSV
  preprocessCSV(content) {
    const lines = content.split('\n');
    if (lines.length < 2) return content;
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const processed = [`Estructura de datos: ${headers.join(', ')}`];
    
    // Tomar muestra de las primeras filas para contexto
    const sampleRows = lines.slice(1, 6);
    processed.push('\nDatos de ejemplo:');
    
    sampleRows.forEach((row, index) => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        processed.push(`Registro ${index + 1}: ${headers.map((h, i) => `${h}: ${values[i]}`).join(', ')}`);
      }
    });
    
    return processed.join('\n');
  }
  
  // 📋 Preprocesar JSON
  preprocessJSON(content) {
    try {
      const data = JSON.parse(content);
      return this.jsonToText(data);
    } catch (error) {
      console.warn('⚠️ Error parseando JSON, usando contenido original');
      return content;
    }
  }
  
  // 🔄 Convertir JSON a texto legible
  jsonToText(obj, prefix = '') {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }
    
    const lines = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          lines.push(`${fullKey}: [${value.length} elementos]`);
          value.slice(0, 3).forEach((item, index) => {
            lines.push(`  - ${index + 1}: ${this.jsonToText(item)}`);
          });
        } else {
          lines.push(`${fullKey}:`);
          lines.push(this.jsonToText(value, fullKey));
        }
      } else {
        lines.push(`${fullKey}: ${value}`);
      }
    }
    
    return lines.join('\n');
  }
  
  // 📏 Formatear tamaño de archivo
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  // 🆔 Generar ID único para documento
  generateDocumentId(filePath) {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    const hash = this.simpleHash(normalized);
    const timestamp = Date.now().toString(36);
    return `doc_${hash}_${timestamp}`;
  }
  
  // #️⃣ Hash simple para IDs
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString(36);
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
  
  // 📊 Estadísticas de carga
  getLoadingStats(documents) {
    if (documents.length === 0) {
      return { count: 0, totalSize: 0, avgSize: 0, types: {}, categories: {} };
    }
    
    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
    const types = {};
    const categories = {};
    
    documents.forEach(doc => {
      const ext = doc.extension;
      const cat = doc.metadata.category;
      
      types[ext] = (types[ext] || 0) + 1;
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    return {
      count: documents.length,
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize),
      avgSize: Math.round(totalSize / documents.length),
      avgSizeFormatted: this.formatFileSize(Math.round(totalSize / documents.length)),
      types,
      categories,
      documents: documents.map(doc => ({
        id: doc.id,
        fileName: doc.metadata.fileName,
        size: doc.metadata.sizeFormatted,
        type: doc.metadata.contentType,
        category: doc.metadata.category
      }))
    };
  }
}

export default DocumentLoader;
