import pkg from 'pg';
import ExcelJS from 'exceljs';
const { Pool } = pkg;

// Conexión a la base de datos
const pool = new Pool({
  host: "ep-sweet-bird-aeqhnyu4-pooler.c-2.us-east-2.aws.neon.tech",
  database: "buscadores",
  user: "neondb_owner",
  password: "npg_OnhVP53dwERt",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function procesarArchivoSlack() {
  try {
    console.log("📥 Procesando archivo Libro1.xlsx...\n");

    // Leer el archivo Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('dashboard/Libro1.xlsx');
    const sheet = workbook.worksheets[0];

    // Obtener las columnas (primera fila)
    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[colNumber] = cell.value.toString().toLowerCase();
      }
    });

    console.log("📋 Columnas detectadas:", headers.filter(Boolean));

    // Buscar índices de las columnas
    let sucursalIndex = -1;
    let slackIndex = -1;

    headers.forEach((header, index) => {
      if (header && header.includes('sucursal')) {
        sucursalIndex = index;
      }
      if (header && (header.includes('slack') || header.includes('usuario'))) {
        slackIndex = index;
      }
    });

    if (sucursalIndex === -1 || slackIndex === -1) {
      console.error("❌ No se encontraron las columnas 'sucursal' y 'slack'");
      console.log("Columnas encontradas:", headers.filter(Boolean));
      return;
    }

    console.log(`✅ Columna sucursal encontrada en índice: ${sucursalIndex}`);
    console.log(`✅ Columna slack encontrada en índice: ${slackIndex}`);

    // Procesar las filas de datos
    const usuarios = [];
    const totalRows = sheet.rowCount;

    for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      
      const sucursalCell = row.getCell(sucursalIndex);
      const slackCell = row.getCell(slackIndex);

      if (sucursalCell.value && slackCell.value) {
        let sucursal = sucursalCell.value.toString().trim();
        let slack = slackCell.value.toString().trim().toLowerCase();

        // Agregar @ si no lo tiene
        if (!slack.startsWith('@')) {
          slack = '@' + slack;
        }

        usuarios.push({
          sucursal: sucursal,
          slack: slack
        });

        console.log(`✓ Fila ${rowNumber}: ${sucursal} → ${slack}`);
      }
    }

    console.log(`\n📊 Total de usuarios procesados: ${usuarios.length}`);

    if (usuarios.length === 0) {
      console.log("❌ No se encontraron datos para procesar");
      return;
    }

    // Insertar en la base de datos
    console.log("\n💾 Insertando datos en la base de datos...");
    
    let insertados = 0;
    for (const usuario of usuarios) {
      try {
        const result = await pool.query(`
          INSERT INTO "usuarios_slack" ("sucursal", "slack")
          VALUES ($1, $2)
          ON CONFLICT ("sucursal") 
          DO UPDATE SET 
            "slack" = EXCLUDED."slack"
          RETURNING *
        `, [usuario.sucursal, usuario.slack]);
        
        insertados++;
        console.log(`✅ ${insertados}/${usuarios.length}: ${usuario.sucursal} → ${usuario.slack}`);
      } catch (error) {
        console.error(`❌ Error insertando ${usuario.sucursal}:`, error.message);
      }
    }

    console.log(`\n🎉 Proceso completado! ${insertados} usuarios insertados/actualizados`);

  } catch (error) {
    console.error("❌ Error procesando archivo:", error.message);
  } finally {
    await pool.end();
  }
}

procesarArchivoSlack();
