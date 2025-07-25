import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: "ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech",
  database: "buscadores",
  user: "neondb_owner",
  password: "npg_OnhVP53dwERt",
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function checkDates() {
  try {
    console.log('🔍 Verificando fechas en la base de datos...');
    
    const result = await pool.query(`
      SELECT 
        MIN("FechaCompra") as fecha_minima,
        MAX("FechaCompra") as fecha_maxima,
        COUNT(*) as total_registros,
        COUNT(CASE WHEN "FechaCompra" >= '2025-01-01' THEN 1 END) as registros_2025,
        COUNT(CASE WHEN "FechaCompra" >= '2024-01-01' AND "FechaCompra" < '2025-01-01' THEN 1 END) as registros_2024,
        COUNT(CASE WHEN "FechaCompra" < '2024-01-01' THEN 1 END) as registros_anteriores
      FROM "ventas" 
      WHERE "FechaCompra" IS NOT NULL
    `);
    
    console.log('📅 Análisis de fechas:');
    console.log('- Fecha mínima:', result.rows[0].fecha_minima);
    console.log('- Fecha máxima:', result.rows[0].fecha_maxima);
    console.log('- Total registros con fecha:', result.rows[0].total_registros);
    console.log('- Registros de 2025:', result.rows[0].registros_2025);
    console.log('- Registros de 2024:', result.rows[0].registros_2024);
    console.log('- Registros anteriores a 2024:', result.rows[0].registros_anteriores);
    
    // Verificar algunos ejemplos de fechas recientes
    const recentDates = await pool.query(`
      SELECT "FechaCompra", COUNT(*) as cantidad
      FROM "ventas" 
      WHERE "FechaCompra" IS NOT NULL
      GROUP BY "FechaCompra"
      ORDER BY "FechaCompra" DESC
      LIMIT 10
    `);
    
    console.log('\n📆 Últimas 10 fechas con registros:');
    recentDates.rows.forEach(row => {
      console.log(`- ${row.FechaCompra}: ${row.cantidad} registros`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDates();
