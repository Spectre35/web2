import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech',
  database: 'buscadores',
  user: 'neondb_owner',
  password: 'npg_OnhVP53dwERt',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'aclaraciones' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Columnas en orden original:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkColumns();
