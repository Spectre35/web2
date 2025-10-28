import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Importaciones del sistema OCR
import ocrRoutes from './backend/routes/ocrRoutes.js';
import { setProgressTracker } from './backend/routes/ocrRoutes.js';
import { initializeDatabase } from './backend/models/ocrDatabase.js';
import { getWorkerPool } from './backend/services/workerPool.js';
import ProcessingProgressTracker from './backend/services/processingProgressTracker.js';
import autoCleanupService from './backend/services/autoCleanupService.js';

// Configuración del entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "https://cargosfraudes.onrender.com"],
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.OCR_PORT || 3002;

// 🎯 Sistema de seguimiento de progreso global
const progressTracker = new ProcessingProgressTracker();

// 🔌 Configurar WebSocket para progreso en tiempo real
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado a WebSocket:', socket.id);
  
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`🔗 Cliente ${socket.id} unido a sesión: ${sessionId}`);
    
    // Enviar estado actual si la sesión existe
    const stats = progressTracker.getProgressStats(sessionId);
    if (stats) {
      socket.emit('progress-update', stats);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Hacer disponible el tracker y io globalmente
app.set('progressTracker', progressTracker);
app.set('io', io);

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

// 🌐 CORS configuración para OCR
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://cargosfraudes.onrender.com'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Parseo de JSON con límite aumentado para lotes de imágenes
app.use(express.json({ limit: '100mb' })); // Aumentado para lotes grandes
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Servir archivos estáticos del frontend
app.use(express.static(join(__dirname, 'frontend')));

// 📊 Establecer el progressTracker en las rutas OCR
setProgressTracker(progressTracker);

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

// Ruta principal - usar el nuevo frontend con progreso avanzado
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'frontend/index-progress.html'));
});

// Mantener ruta al frontend básico para compatibilidad
app.get('/basic', (req, res) => {
  res.sendFile(join(__dirname, 'frontend/index.html'));
});

// Ruta para servir el frontend (SPA) - usar progreso avanzado por defecto
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'frontend/index-progress.html'));
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

// Configurar eventos del tracker de progreso
progressTracker.on('progress', ({ sessionId, stats, isComplete }) => {
  // Emitir progreso a todos los clientes de la sesión
  io.to(sessionId).emit('progress-update', stats);
  
  // Log detallado del progreso
  console.log(`📊 Progreso [${sessionId}]: ${stats.overallProgress}% - Archivo ${stats.currentFile}/${stats.totalFiles} - Tiempo restante: ${Math.round(stats.estimatedRemaining / 1000)}s`);
  
  // Limpiar sesión completada después de un tiempo
  if (isComplete) {
    setTimeout(() => {
      progressTracker.cleanupSession(sessionId);
    }, 300000); // Limpiar después de 5 minutos
  }
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

    // 🧹 Inicializar servicio de limpieza automática
    console.log('🔄 Inicializando servicio de limpieza automática...');
    await autoCleanupService.start();
    console.log('✅ Servicio de limpieza automática iniciado correctamente');

    // Iniciar servidor con WebSocket
    server.listen(PORT, () => {
      console.log(`\n🚀 Servidor OCR corriendo en puerto ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔍 OCR API: http://localhost:${PORT}/api/ocr`);
      console.log(`📦 Batch API: http://localhost:${PORT}/api/ocr/batch-upload`);
      console.log(`📊 Worker Stats: http://localhost:${PORT}/api/ocr/worker-stats`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket habilitado para progreso en tiempo real`);
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
  autoCleanupService.stop();
  await shutdownWorkerPool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Recibida señal SIGINT, cerrando servidor...');
  autoCleanupService.stop();
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
