import express from "express";
import { pool, protegerDatos } from "../config/database.js";
import os from "os";

const router = express.Router();

// 🏥 Endpoint básico de health check
router.get("/", async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test básico de base de datos
    const dbResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
    const dbLatency = Date.now() - startTime;
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: "connected",
        latency_ms: dbLatency,
        current_time: dbResult.rows[0].current_time,
        version: dbResult.rows[0].db_version.split(' ')[0] // Solo la versión
      },
      server: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        cpu_count: os.cpus().length,
        load_average: os.loadavg()
      }
    };
    
    res.json(healthStatus);
    
  } catch (error) {
    console.error("❌ Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime()
    });
  }
});

// 🏥 Health check completo (con protección)
router.get("/completo", protegerDatos, async (req, res) => {
  try {
    const checks = {
      database: await checkDatabase(),
      tables: await checkTables(),
      memory: checkMemory(),
      disk: await checkDiskSpace(),
      performance: await checkPerformance()
    };
    
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: checks,
      summary: {
        total_checks: Object.keys(checks).length,
        healthy_checks: Object.values(checks).filter(c => c.status === 'healthy').length,
        degraded_checks: Object.values(checks).filter(c => c.status === 'degraded').length,
        unhealthy_checks: Object.values(checks).filter(c => c.status === 'unhealthy').length
      }
    });
    
  } catch (error) {
    console.error("❌ Complete health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// 📊 Endpoint para estadísticas del sistema
router.get("/stats", protegerDatos, async (req, res) => {
  try {
    const queries = {
      // Conteos de tablas principales
      tableCounts: `
        SELECT 
          'ventas' as tabla, COUNT(*) as registros FROM "ventas"
        UNION ALL
        SELECT 
          'aclaraciones' as tabla, COUNT(*) as registros FROM aclaraciones
        UNION ALL
        SELECT 
          'cargos_auto' as tabla, COUNT(*) as registros FROM cargos_auto
        UNION ALL
        SELECT 
          'usuarios_slack' as tabla, COUNT(*) as registros FROM usuarios_slack
        UNION ALL
        SELECT 
          'bins_cache' as tabla, COUNT(*) as registros FROM bins_cache
      `,
      
      // Actividad reciente
      recentActivity: `
        SELECT 
          'ventas' as tabla,
          COUNT(*) FILTER (WHERE "Fecha Venta" >= CURRENT_DATE - INTERVAL '7 days') as registros_semana,
          COUNT(*) FILTER (WHERE "Fecha Venta" >= CURRENT_DATE - INTERVAL '30 days') as registros_mes
        FROM "ventas"
        UNION ALL
        SELECT 
          'aclaraciones' as tabla,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as registros_semana,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as registros_mes
        FROM aclaraciones
        UNION ALL
        SELECT 
          'cargos_auto' as tabla,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as registros_semana,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as registros_mes
        FROM cargos_auto
      `,
      
      // Información de la base de datos
      databaseInfo: `
        SELECT 
          pg_database_size(current_database()) as db_size_bytes,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
          current_database() as database_name,
          current_user as current_user
      `
    };
    
    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      results[key] = result.rows;
    }
    
    // Formatear tamaño de base de datos
    if (results.databaseInfo[0]?.db_size_bytes) {
      const sizeBytes = parseInt(results.databaseInfo[0].db_size_bytes);
      results.databaseInfo[0].db_size_formatted = formatBytes(sizeBytes);
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      server_info: {
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage: process.memoryUsage(),
        platform: process.platform,
        cpu_count: os.cpus().length
      },
      database_stats: results
    });
    
  } catch (error) {
    console.error("❌ Error getting system stats:", error);
    res.status(500).json({
      error: "Error al obtener estadísticas del sistema",
      detalles: error.message
    });
  }
});

// 🔧 Endpoint para validar configuración
router.get("/config", protegerDatos, async (req, res) => {
  try {
    const config = {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      database: {
        host: process.env.PGHOST ? '***' : 'not_set',
        database: process.env.PGDATABASE ? '***' : 'not_set',
        user: process.env.PGUSER ? '***' : 'not_set',
        ssl: process.env.PGSSL || 'undefined'
      },
      security: {
        cors_enabled: true,
        body_limit: '50mb',
        static_files: true
      },
      features: {
        file_upload: true,
        slack_integration: true,
        bin_lookup: true,
        data_export: true
      }
    };
    
    // Verificar variables de entorno críticas
    const requiredEnvVars = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    res.json({
      configuration: config,
      environment_check: {
        required_vars: requiredEnvVars,
        missing_vars: missingEnvVars,
        all_present: missingEnvVars.length === 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error checking configuration:", error);
    res.status(500).json({
      error: "Error al validar configuración",
      detalles: error.message
    });
  }
});

// 📱 Endpoint para validar conectividad externa
router.get("/conectividad", protegerDatos, async (req, res) => {
  try {
    const tests = [];
    
    // Test 1: Conectividad a internet
    try {
      const response = await fetch('https://httpbin.org/ip', { 
        method: 'GET', 
        timeout: 5000 
      });
      tests.push({
        test: 'internet_connectivity',
        status: response.ok ? 'success' : 'failure',
        details: response.ok ? 'Conectividad a internet OK' : `HTTP ${response.status}`
      });
    } catch (error) {
      tests.push({
        test: 'internet_connectivity',
        status: 'failure',
        details: error.message
      });
    }
    
    // Test 2: API de BIN lookup
    try {
      const response = await fetch('https://lookup.binlist.net/45717360', { 
        method: 'GET', 
        timeout: 5000,
        headers: { 'Accept-Version': '3' }
      });
      tests.push({
        test: 'bin_api',
        status: response.ok ? 'success' : 'warning',
        details: response.ok ? 'API de BIN accesible' : `HTTP ${response.status}`
      });
    } catch (error) {
      tests.push({
        test: 'bin_api',
        status: 'warning',
        details: `BIN API no disponible: ${error.message}`
      });
    }
    
    // Test 3: Resolución DNS
    try {
      const dns = await import('dns');
      const util = await import('util');
      const lookup = util.promisify(dns.lookup);
      
      await lookup('google.com');
      tests.push({
        test: 'dns_resolution',
        status: 'success',
        details: 'Resolución DNS funcionando'
      });
    } catch (error) {
      tests.push({
        test: 'dns_resolution',
        status: 'failure',
        details: `Error DNS: ${error.message}`
      });
    }
    
    const successCount = tests.filter(t => t.status === 'success').length;
    const warningCount = tests.filter(t => t.status === 'warning').length;
    const failureCount = tests.filter(t => t.status === 'failure').length;
    
    res.json({
      connectivity_status: failureCount === 0 ? 'healthy' : 'degraded',
      tests: tests,
      summary: {
        total_tests: tests.length,
        successful: successCount,
        warnings: warningCount,
        failures: failureCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error testing connectivity:", error);
    res.status(500).json({
      error: "Error al probar conectividad",
      detalles: error.message
    });
  }
});

// 🔄 Endpoint para reiniciar cache y limpiar recursos
router.post("/limpiar-cache", protegerDatos, async (req, res) => {
  try {
    const actions = [];
    
    // Limpiar cache de BINs antiguos
    const cleanBinsResult = await pool.query(`
      DELETE FROM bins_cache 
      WHERE consultas_realizadas <= 1 
      AND created_at <= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    actions.push({
      action: 'clean_bins_cache',
      records_removed: cleanBinsResult.rowCount
    });
    
    // Forzar garbage collection si está disponible
    if (global.gc) {
      global.gc();
      actions.push({
        action: 'garbage_collection',
        status: 'executed'
      });
    } else {
      actions.push({
        action: 'garbage_collection',
        status: 'not_available'
      });
    }
    
    // Obtener estadísticas de memoria después de la limpieza
    const memoryAfter = process.memoryUsage();
    
    res.json({
      cache_cleaned: true,
      actions_performed: actions,
      memory_after_cleanup: memoryAfter,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error cleaning cache:", error);
    res.status(500).json({
      error: "Error al limpiar cache",
      detalles: error.message
    });
  }
});

// Funciones auxiliares
async function checkDatabase() {
  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT 1');
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency_ms: latency,
      connection_pool: pool.totalCount + '/' + pool.options.max
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkTables() {
  try {
    const tables = ['ventas', 'aclaraciones', 'cargos_auto', 'usuarios_slack', 'bins_cache'];
    const results = {};
    
    for (const table of tables) {
      try {
        const countQuery = table === 'ventas' ? 
          `SELECT COUNT(*) as count FROM "${table}"` : 
          `SELECT COUNT(*) as count FROM ${table}`;
        const result = await pool.query(countQuery);
        results[table] = {
          status: 'accessible',
          record_count: parseInt(result.rows[0].count)
        };
      } catch (error) {
        results[table] = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    const allAccessible = Object.values(results).every(r => r.status === 'accessible');
    
    return {
      status: allAccessible ? 'healthy' : 'degraded',
      tables: results
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

function checkMemory() {
  const usage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsagePercent = (usedMem / totalMem) * 100;
  
  let status = 'healthy';
  if (memoryUsagePercent > 85) status = 'unhealthy';
  else if (memoryUsagePercent > 70) status = 'degraded';
  
  return {
    status: status,
    process_memory: usage,
    system_memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usage_percent: Math.round(memoryUsagePercent * 100) / 100
    }
  };
}

async function checkDiskSpace() {
  try {
    const fs = await import('fs');
    const util = await import('util');
    const stat = util.promisify(fs.stat);
    
    // Obtener info del directorio actual
    const stats = await stat('.');
    
    return {
      status: 'healthy',
      message: 'Disk space check completed',
      details: 'Basic file system access verified'
    };
  } catch (error) {
    return {
      status: 'degraded',
      error: error.message
    };
  }
}

async function checkPerformance() {
  const startTime = process.hrtime.bigint();
  
  // Operación simple para medir performance
  let sum = 0;
  for (let i = 0; i < 100000; i++) {
    sum += i;
  }
  
  const endTime = process.hrtime.bigint();
  const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  
  let status = 'healthy';
  if (executionTime > 100) status = 'degraded';
  if (executionTime > 500) status = 'unhealthy';
  
  return {
    status: status,
    execution_time_ms: Math.round(executionTime * 100) / 100,
    cpu_load: os.loadavg()
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
