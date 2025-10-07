import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Importaciones del sistema OCR
import ocrRoutes from './backend/routes/ocrRoutes.js';
import { initializeDatabase } from './backend/models/ocrDatabase.js';
import { getWorkerPool } from './backend/services/workerPool.js';

// Configuración del entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.OCR_PORT || 3002;

// Middlewares de seguridad y compresión
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(compression());

// CORS configurado para desarrollo
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://tu-dominio.com']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parseo de JSON con límite aumentado para lotes de imágenes
app.use(express.json({ limit: '100mb' })); // Aumentado para lotes grandes
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Servir archivos estáticos del frontend
app.use(express.static(join(__dirname, 'frontend/dist')));

// Rutas de la API OCR
app.use('/api/ocr', ocrRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'OCR System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta para servir el frontend (SPA)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'frontend/dist/index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);

  // Log detallado del error
  console.error('Stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request Method:', req.method);
  console.error('Request Headers:', req.headers);

  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Función para inicializar el servidor
async function startServer() {
  try {
    // Inicializar base de datos
    console.log('🔄 Inicializando base de datos OCR...');
    await initializeDatabase();
    console.log('✅ Base de datos OCR inicializada correctamente');

    // Inicializar worker pool de Tesseract
    console.log('🔄 Inicializando worker pool de Tesseract...');
    const workerPool = getWorkerPool();
    await workerPool.initialize();
    console.log('✅ Worker pool de Tesseract inicializado correctamente');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor OCR corriendo en puerto ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔍 OCR API: http://localhost:${PORT}/api/ocr`);
      console.log(`📦 Batch API: http://localhost:${PORT}/api/ocr/batch-upload`);
      console.log(`📊 Worker Stats: http://localhost:${PORT}/api/ocr/worker-stats`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏊 Workers disponibles: ${workerPool.getStats().totalWorkers}\n`);
    });

  } catch (error) {
    console.error('❌ Error al inicializar el servidor OCR:', error);
    process.exit(1);
  }
}

// Importar función de shutdown
import { shutdownWorkerPool } from './backend/services/workerPool.js';

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  console.log('🔄 Recibida señal SIGTERM, cerrando servidor...');
  await shutdownWorkerPool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Recibida señal SIGINT, cerrando servidor...');
  await shutdownWorkerPool();
  process.exit(0);
});

// Manejo de promesas rechazadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.error('En promesa:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

// Iniciar el servidor
startServer();

export default app;
