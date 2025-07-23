import pkg from "pg";
const { Pool } = pkg;

// 🔗 Conexiones
const poolBuscadores = new Pool({
  host: "ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech",
  database: "buscadores",
  user: "neondb_owner",
  password: "npg_OnhVP53dwERt",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const poolCargos = new Pool({
  host: "ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech",
  database: "cargosauto",
  user: "neondb_owner",
  password: "npg_OnhVP53dwERt",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const poolCaja = new Pool({
  host: "ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech",
  database: "caja",
  user: "neondb_owner",
  password: "npg_OnhVP53dwERt",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const poolVentas = new Pool({
  host: "ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech",
  database: "ventas",
  user: "neondb_owner",
  password: "npg_OnhVP53dwERt",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// ✅ Crear tabla si no existe
async function crearTablaSiNoExiste(tabla, columnas) {
  const columnasSQL = columnas
    .map((c) => `"${c}" TEXT`)
    .join(", ");
  await poolBuscadores.query(
    `CREATE TABLE IF NOT EXISTS "${tabla}" (${columnasSQL});`
  );
}

// ✅ Crear tabla de relación usuarios-slack
async function crearTablaUsuariosSlack() {
  try {
    // Primero eliminar la tabla existente
    await poolBuscadores.query(`DROP TABLE IF EXISTS "usuarios_slack";`);
    console.log("🗑️ Tabla usuarios_slack eliminada");
    
    // Crear nueva tabla simplificada
    await poolBuscadores.query(`
      CREATE TABLE "usuarios_slack" (
        "id" SERIAL PRIMARY KEY,
        "sucursal" TEXT NOT NULL,
        "slack" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("sucursal")
      );
    `);
    console.log("✅ Tabla usuarios_slack creada con estructura simplificada");
  } catch (error) {
    console.error("❌ Error al crear tabla usuarios_slack:", error);
  }
}

// ✅ Migrar en lotes
async function migrarTabla(origenPool, tablaOrigen, batchSize = 1000) {
  try {
    console.log(`📥 Leyendo datos de ${tablaOrigen}...`);
    const { rows } = await origenPool.query(`SELECT * FROM "${tablaOrigen}"`);
    console.log(`✔ ${rows.length} registros obtenidos de ${tablaOrigen}`);

    if (rows.length === 0) return;

    const columnas = Object.keys(rows[0]);
    await crearTablaSiNoExiste(tablaOrigen, columnas);

    const columnasSQL = columnas.map((c) => `"${c}"`).join(", ");

    for (let i = 0; i < rows.length; i += batchSize) {
      const lote = rows.slice(i, i + batchSize);

      const values = [];
      const placeholders = lote
        .map((row, rowIndex) => {
          const startIndex = rowIndex * columnas.length;
          columnas.forEach((col) => values.push(row[col]));
          const p = columnas
            .map((_, colIndex) => `$${startIndex + colIndex + 1}`)
            .join(", ");
          return `(${p})`;
        })
        .join(", ");

      const sql = `INSERT INTO "${tablaOrigen}" (${columnasSQL}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;
      await poolBuscadores.query(sql, values);

      console.log(
        `✅ Insertados ${Math.min(i + batchSize, rows.length)}/${rows.length} registros en ${tablaOrigen}`
      );
    }
  } catch (error) {
    console.error(`❌ Error al migrar ${tablaOrigen}:`, error);
  }
}

// ✅ Migrar todas las tablas
async function migrarTodo() {
  console.log("🚀 Iniciando migración rápida...");

  // Crear tabla de usuarios-slack primero
  await crearTablaUsuariosSlack();

  await migrarTabla(poolCargos, "cargos_auto");
  await migrarTabla(poolCaja, "caja");
  await migrarTabla(poolVentas, "ventas");

  console.log("🎉 Migración completada en buscadores.");
  process.exit();
}

migrarTodo();
