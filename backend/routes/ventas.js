import express from 'express';
import { pool } from '../../config/database.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Ruta para obtener valores distinct de bloque y sucursal
router.get('/distinct-values', async (req, res) => {
  try {
    console.log('🔍 Obteniendo valores distinct de ventas...');

    // Obtener bloques distintos
    const bloquesQuery = await pool.query(
      'SELECT DISTINCT "Bloque" FROM ventas WHERE "Bloque" IS NOT NULL ORDER BY "Bloque"'
    );

    // Obtener sucursales distintas
    const sucursalesQuery = await pool.query(
      'SELECT DISTINCT "Sucursal" FROM ventas WHERE "Sucursal" IS NOT NULL ORDER BY "Sucursal"'
    );

    // Obtener relaciones entre bloque y sucursal
    const relacionesQuery = await pool.query(
      'SELECT DISTINCT "Bloque", "Sucursal" FROM ventas WHERE "Bloque" IS NOT NULL AND "Sucursal" IS NOT NULL ORDER BY "Bloque", "Sucursal"'
    );

    console.log('✅ Bloques:', bloquesQuery.rows);
    console.log('✅ Sucursales:', sucursalesQuery.rows);
    console.log('✅ Relaciones:', relacionesQuery.rows);
    res.json({
      success: true,
      data: {
        bloques: bloquesQuery.rows,
        sucursales: sucursalesQuery.rows,
        relaciones: relacionesQuery.rows
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener valores distinct:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los valores de referencia'
    });
  }
});

export default router;
