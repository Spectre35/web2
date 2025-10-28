const { Pool } = require('pg');

// Configuración de la base de datos (usando las mismas variables del server.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:12345678@localhost:5432/web2",
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function consultarProcesadores() {
  try {
    console.log('🔍 Consultando procesadores únicos en la tabla aclaraciones...');
    
    const client = await pool.connect();
    
    // Consultar procesadores únicos
    const query = `
      SELECT DISTINCT "procesador", COUNT(*) as cantidad
      FROM "aclaraciones"
      WHERE "procesador" IS NOT NULL AND "procesador" != ''
      GROUP BY "procesador"
      ORDER BY cantidad DESC
    `;
    
    const result = await client.query(query);
    
    console.log('\n📊 PROCESADORES ENCONTRADOS:');
    console.log('=====================================');
    
    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.procesador} (${row.cantidad} registros)`);
      });
      
      console.log('\n📋 Lista para el array:');
      const procesadores = ['TODOS', ...result.rows.map(row => row.procesador)];
      console.log(JSON.stringify(procesadores, null, 2));
      
    } else {
      console.log('❌ No se encontraron procesadores en la tabla');
    }
    
    await client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error consultando procesadores:', error);
    process.exit(1);
  }
}

consultarProcesadores();