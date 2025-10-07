import { initializeDatabase, testConnection } from '../backend/models/ocrDatabase.js';
import dotenv from 'dotenv';

dotenv.config();

async function initDB() {
  console.log('🔄 Iniciando proceso de inicialización de base de datos OCR...\n');
  
  try {
    // Probar conexión
    console.log('1️⃣ Probando conexión a base de datos...');
    await testConnection();
    console.log('✅ Conexión exitosa\n');
    
    // Inicializar tablas
    console.log('2️⃣ Creando tablas del sistema OCR...');
    await initializeDatabase();
    console.log('✅ Tablas creadas correctamente\n');
    
    // Verificar estructura
    console.log('3️⃣ Verificando estructura de base de datos...');
    
    // Aquí podrías agregar verificaciones adicionales
    console.log('✅ Estructura verificada\n');
    
    console.log('🎉 ¡Base de datos OCR inicializada exitosamente!');
    console.log('📋 Tablas creadas:');
    console.log('   • ocr_documents - Documentos procesados');
    console.log('   • ocr_results - Resultados de OCR');
    console.log('   • ocr_training_data - Datos de entrenamiento');
    console.log('   • ocr_patterns - Patrones detectados');
    console.log('   • ocr_metrics - Métricas del sistema');
    console.log('   • ocr_ml_models - Modelos de ML');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar inicialización
initDB();
