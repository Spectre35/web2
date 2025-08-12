import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import moment from "moment";

// Importar configuración y utilidades compartidas
import { pool, protegerDatos, formatearFechasEnObjeto } from "./config/database.js";

// Importar todas las rutas modularizadas
import uploadRoutes from "./routes/upload.js";
import ventasRoutes from "./routes/ventas.js";
import aclaracionesRoutes from "./routes/aclaraciones.js";
import cargosAutoRoutes from "./routes/cargos_auto.js";
import sucursalesRoutes from "./routes/sucursales.js";
import usuariosSlackRoutes from "./routes/usuarios_slack.js";
import binsRoutes from "./routes/bins.js";
import healthRoutes from "./routes/health.js";
import generalRoutes from "./routes/general.js";

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3001;

// 🌐 Middlewares
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// 📁 Servir archivos estáticos (para el dashboard)
app.use(express.static('dashboard/dist'));

// 📊 CONFIGURAR TODAS LAS RUTAS MODULARIZADAS
console.log('📦 Configurando rutas modularizadas...');

// Ruta para progreso de carga y operaciones de upload
app.use('/api', uploadRoutes);

// Rutas para análisis de ventas
app.use('/api/ventas', ventasRoutes);

// Rutas para gestión de aclaraciones
app.use('/api/aclaraciones', aclaracionesRoutes);

// Rutas para cargos automáticos
app.use('/api/cargos_auto', cargosAutoRoutes);

// Rutas para gestión de sucursales
app.use('/api/sucursales', sucursalesRoutes);

// Rutas para usuarios de Slack
app.use('/api/usuarios-slack', usuariosSlackRoutes);

// Rutas para API de BINs
app.use('/api/bins', binsRoutes);

// Rutas para health checks y monitoreo
app.use('/api/health', healthRoutes);

// Rutas generales (años, bloques, validaciones, etc.)
app.use('/api', generalRoutes);

// 🔄 Rutas de compatibilidad para el frontend (sin prefijo /api)
// Estas rutas mapean directamente a las rutas modulares para mantener compatibilidad

// Rutas para sucursales sin prefijo /api
app.use('/sucursales-alerta', sucursalesRoutes);
app.use('/sucursales', sucursalesRoutes);

// Rutas para cargos auto sin prefijo /api  
app.use('/cargos_auto', cargosAutoRoutes);

// Rutas para ventas sin prefijo /api
app.use('/ventas', ventasRoutes);

// Rutas para aclaraciones sin prefijo /api
app.use('/aclaraciones', aclaracionesRoutes);

// Rutas para caja sin prefijo /api
app.use('/caja', (req, res, next) => {
  // Redirigir caja a ventas ya que comparten funcionalidad
  req.url = req.url;
  ventasRoutes(req, res, next);
});

// Ruta para estadísticas generales
app.get('/estadisticas-generales', async (req, res) => {
  try {
    const estadisticas = {
      totalAclaraciones: 0,
      totalRecuperacion: 0, 
      totalCargosAuto: 0,
      totalCaja: 0
    };
    res.json(estadisticas);
  } catch (error) {
    console.error('Error en estadísticas generales:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// 🏠 Ruta principal - Dashboard
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'dashboard/dist' });
});

// 🔧 Inicialización de la base de datos
async function inicializarBaseDatos() {
  try {
    console.log('🔧 Verificando estructura de base de datos...');
    
    // Verificar y crear tabla bins_cache si no existe
    const createBinsCacheTable = `
      CREATE TABLE IF NOT EXISTS bins_cache (
        id SERIAL PRIMARY KEY,
        bin VARCHAR(8) UNIQUE NOT NULL,
        banco VARCHAR(100),
        marca VARCHAR(50),
        tipo VARCHAR(50),
        pais VARCHAR(100),
        codigo_pais VARCHAR(2),
        moneda VARCHAR(10),
        prepago BOOLEAN DEFAULT false,
        categoria VARCHAR(50),
        consultas_realizadas INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await pool.query(createBinsCacheTable);
    console.log('✅ Tabla bins_cache verificada/creada');
    
    // Verificar y crear índices importantes
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_bins_cache_bin ON bins_cache(bin);',
      'CREATE INDEX IF NOT EXISTS idx_bins_cache_consultas ON bins_cache(consultas_realizadas DESC);',
      'CREATE INDEX IF NOT EXISTS idx_aclaraciones_fecha_venta ON aclaraciones(fecha_venta);',
      'CREATE INDEX IF NOT EXISTS idx_aclaraciones_procesador ON aclaraciones(procesador);',
      'CREATE INDEX IF NOT EXISTS idx_cargos_auto_fecha_venta ON cargos_auto(fecha_venta);',
      'CREATE INDEX IF NOT EXISTS idx_ventas_fecha_venta ON "ventas"("Fecha Venta");',
      'CREATE INDEX IF NOT EXISTS idx_ventas_sucursal ON "ventas"("Sucursal");'
    ];
    
    for (const indexQuery of createIndexes) {
      try {
        await pool.query(indexQuery);
      } catch (error) {
        // Los índices pueden ya existir, no es crítico
        console.log(`ℹ️ Índice ya existe o error menor:`, error.message);
      }
    }
    
    console.log('✅ Índices de base de datos verificados');
    
    // Verificar conexión
    const testQuery = await pool.query('SELECT NOW() as current_time, COUNT(*) as total_ventas FROM "ventas"');
    console.log(`✅ Base de datos conectada - ${testQuery.rows[0].total_ventas} ventas registradas`);
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}

// 🚀 Iniciar servidor
async function iniciarServidor() {
  try {
    // Inicializar base de datos
    await inicializarBaseDatos();
    
    // Configurar manejo de errores global
    app.use((error, req, res, next) => {
      console.error('❌ Error no manejado:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
      });
    });
    
    // Manejar rutas no encontradas
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
    
    // Iniciar el servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor modularizado ejecutándose en http://localhost:${PORT}`);
      console.log(`🌐 También disponible en http://192.168.1.111:${PORT}`);
      console.log(`📊 Dashboard disponible en: http://localhost:${PORT}`);
      console.log(`🔗 API base: http://localhost:${PORT}/api`);
      console.log('');
      console.log('📦 RUTAS DISPONIBLES:');
      console.log('  📊 Upload/Progreso: /api/progreso, /api/upload/:tabla');
      console.log('  💰 Ventas: /api/ventas/*');
      console.log('  📋 Aclaraciones: /api/aclaraciones/*');
      console.log('  🚗 Cargos Auto: /api/cargos_auto/*');
      console.log('  🏢 Sucursales: /api/sucursales/*');
      console.log('  👥 Usuarios Slack: /api/usuarios-slack/*');
      console.log('  💳 BINs: /api/bins/*');
      console.log('  🏥 Health: /api/health/*');
      console.log('  🔧 General: /api/anios, /api/bloques, /api/validar-*');
      console.log('');
      console.log('🔒 Endpoints protegidos requieren IP autorizada');
      console.log('📈 Monitoreo disponible en: /api/health');
    });
    
  } catch (error) {
    console.error('❌ Error crítico iniciando servidor:', error);
    process.exit(1);
  }
}

// 🛡️ Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// 🔄 Manejo de señales de cierre
process.on('SIGTERM', async () => {
  console.log('🔄 Recibida señal SIGTERM, cerrando servidor...');
  try {
    await pool.end();
    console.log('✅ Pool de base de datos cerrado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cerrando pool de base de datos:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🔄 Recibida señal SIGINT (Ctrl+C), cerrando servidor...');
  try {
    await pool.end();
    console.log('✅ Pool de base de datos cerrado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cerrando pool de base de datos:', error);
    process.exit(1);
  }
});

// 🚀 Iniciar aplicación
iniciarServidor();

// 📤 Exportar app para testing
export default app;
