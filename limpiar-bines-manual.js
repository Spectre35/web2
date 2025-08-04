const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'AUTOMATICCASHPAYMENTTRACKINGDB',
  password: 'jenn',
  port: 5432,
});

async function limpiarBinesManual() {
  try {
    const binesManual = ['415231', '424631', '463070', '552533'];
    
    console.log('🧹 Limpiando BINs agregados manualmente...');
    
    for (const bin of binesManual) {
      const result = await pool.query('DELETE FROM bins_cache WHERE bin = $1', [bin]);
      console.log(`BIN ${bin} eliminado de caché: ${result.rowCount} filas afectadas`);
    }
    
    console.log('✅ Limpieza completada');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

limpiarBinesManual();
