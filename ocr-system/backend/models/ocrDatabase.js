import { pool } from '../../../config/database.js';

// ================= 🗄️ MODELOS DE BASE DE DATOS PARA OCR =================

/**
 * Crear tablas necesarias para el sistema OCR
 */
export const initializeOCRTables = async () => {
  try {
    console.log('🔧 Inicializando tablas del sistema OCR...');

    // Tabla principal de documentos procesados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ocr_documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        user_id VARCHAR(100),
        document_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de resultados OCR
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ocr_results (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES ocr_documents(id) ON DELETE CASCADE,
        raw_text TEXT,
        corrected_text TEXT,
        confidence_score DECIMAL(5,4) DEFAULT 0,
        processing_time_ms INTEGER,
        ocr_engine VARCHAR(50) DEFAULT 'tesseract',
        page_number INTEGER DEFAULT 1,
        bounding_boxes JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de entrenamiento y retroalimentación
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ocr_training_data (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES ocr_documents(id) ON DELETE CASCADE,
        result_id INTEGER REFERENCES ocr_results(id) ON DELETE CASCADE,
        original_text TEXT NOT NULL,
        corrected_text TEXT NOT NULL,
        correction_type VARCHAR(50),
        user_feedback VARCHAR(20) DEFAULT 'manual',
        confidence_before DECIMAL(5,4),
        confidence_after DECIMAL(5,4),
        pattern_category VARCHAR(100),
        is_validated BOOLEAN DEFAULT false,
        validated_by VARCHAR(100),
        validation_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de patrones aprendidos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ocr_patterns (
        id SERIAL PRIMARY KEY,
        pattern_type VARCHAR(100) NOT NULL,
        original_pattern TEXT NOT NULL,
        corrected_pattern TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        accuracy_score DECIMAL(5,4) DEFAULT 0,
        context_category VARCHAR(100),
        document_types TEXT[],
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pattern_type, original_pattern, corrected_pattern)
      )
    `);

    // Tabla de métricas y estadísticas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ocr_metrics (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        total_documents INTEGER DEFAULT 0,
        total_corrections INTEGER DEFAULT 0,
        average_confidence DECIMAL(5,4) DEFAULT 0,
        processing_time_avg INTEGER DEFAULT 0,
        accuracy_improvement DECIMAL(5,4) DEFAULT 0,
        user_id VARCHAR(100),
        document_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, user_id, document_type)
      )
    `);

    // Tabla de configuración y modelos ML
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ocr_ml_models (
        id SERIAL PRIMARY KEY,
        model_name VARCHAR(100) NOT NULL UNIQUE,
        model_type VARCHAR(50) NOT NULL,
        model_path TEXT NOT NULL,
        version VARCHAR(20) NOT NULL,
        accuracy DECIMAL(5,4) DEFAULT 0,
        training_samples INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT false,
        hyperparameters JSONB,
        performance_metrics JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear índices para optimizar consultas
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ocr_documents_status ON ocr_documents(status);
      CREATE INDEX IF NOT EXISTS idx_ocr_documents_user ON ocr_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_ocr_documents_date ON ocr_documents(upload_date);
      
      CREATE INDEX IF NOT EXISTS idx_ocr_results_document ON ocr_results(document_id);
      CREATE INDEX IF NOT EXISTS idx_ocr_results_confidence ON ocr_results(confidence_score);
      
      CREATE INDEX IF NOT EXISTS idx_ocr_training_validated ON ocr_training_data(is_validated);
      CREATE INDEX IF NOT EXISTS idx_ocr_training_type ON ocr_training_data(correction_type);
      
      CREATE INDEX IF NOT EXISTS idx_ocr_patterns_type ON ocr_patterns(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_ocr_patterns_active ON ocr_patterns(is_active);
      CREATE INDEX IF NOT EXISTS idx_ocr_patterns_frequency ON ocr_patterns(frequency DESC);
      
      CREATE INDEX IF NOT EXISTS idx_ocr_metrics_date ON ocr_metrics(date);
      CREATE INDEX IF NOT EXISTS idx_ocr_metrics_user ON ocr_metrics(user_id);
    `);

    console.log('✅ Tablas del sistema OCR inicializadas correctamente');
    return { success: true, message: 'Tablas OCR creadas correctamente' };

  } catch (error) {
    console.error('❌ Error inicializando tablas OCR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener estadísticas generales del sistema OCR
 */
export const getOCRStats = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(DISTINCT r.id) as total_results,
        COUNT(DISTINCT t.id) as total_corrections,
        COUNT(DISTINCT p.id) as total_patterns,
        AVG(r.confidence_score) as avg_confidence,
        AVG(r.processing_time_ms) as avg_processing_time
      FROM ocr_documents d
      LEFT JOIN ocr_results r ON d.id = r.document_id
      LEFT JOIN ocr_training_data t ON r.id = t.result_id
      LEFT JOIN ocr_patterns p ON p.is_active = true
    `);

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas OCR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Limpiar datos antiguos de entrenamiento
 */
export const cleanupOldTrainingData = async (daysToKeep = 90) => {
  try {
    const result = await pool.query(`
      DELETE FROM ocr_training_data 
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      AND is_validated = false
    `);

    console.log(`🧹 Limpieza completada: ${result.rowCount} registros eliminados`);
    return { success: true, deletedRows: result.rowCount };
  } catch (error) {
    console.error('❌ Error en limpieza de datos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Función para probar la conexión
 */
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a base de datos exitosa:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a base de datos:', error);
    throw error;
  }
};

/**
 * Crear índices para optimizar consultas
 */
const createIndexes = async (client) => {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_ocr_documents_created_at ON ocr_documents(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_ocr_documents_file_type ON ocr_documents(file_type);',
    'CREATE INDEX IF NOT EXISTS idx_ocr_results_document_id ON ocr_results(document_id);',
    'CREATE INDEX IF NOT EXISTS idx_ocr_results_confidence ON ocr_results(confidence);',
    'CREATE INDEX IF NOT EXISTS idx_ocr_training_data_pattern_type ON ocr_training_data(pattern_type);',
    'CREATE INDEX IF NOT EXISTS idx_ocr_patterns_type ON ocr_patterns(pattern_type);',
    'CREATE INDEX IF NOT EXISTS idx_ocr_metrics_created_at ON ocr_metrics(created_at);'
  ];
  
  for (const indexQuery of indexes) {
    await client.query(indexQuery);
  }
};

/**
 * Función para inicializar todas las tablas
 */
export const initializeDatabase = async () => {
  try {
    console.log('� Inicializando tablas del sistema OCR...');
    const result = await initializeOCRTables();
    
    if (result.success) {
      console.log('✅ Base de datos OCR inicializada correctamente');
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Error inicializando base de datos OCR:', error);
    throw error;
  }
};

export default {
  initializeOCRTables,
  getOCRStats,
  cleanupOldTrainingData,
  testConnection,
  initializeDatabase
};
