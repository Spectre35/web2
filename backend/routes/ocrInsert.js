
import express from 'express';
import { pool } from '../../config/database.js';
const router = express.Router();

// Endpoint para insertar datos validados por el usuario
router.post('/api/ocr/insert-database', async (req, res) => {
  try {
    const datos = req.body;
    if (!datos || !datos.cliente || !datos.sucursal || !datos.bloque) {
      return res.status(400).json({ success: false, error: 'Datos incompletos para inserción' });
    }
    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO papeleria (
          cliente,
          sucursal,
          bloque,
          fecha_contrato,
          tipo,
          monto,
          t_pago,
          caja,
          usuario,
          archivo_original,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id, cliente, sucursal, bloque, monto, t_pago, created_at
      `;
      const insertValues = [
        datos.cliente,
        datos.sucursal,
        datos.bloque,
        datos.fecha_contrato,
        datos.tipo,
        datos.monto,
        datos.t_pago,
        datos.caja,
        datos.usuario,
        datos.archivo_original
      ];
      const result = await client.query(insertQuery, insertValues);
      const insertedRow = result.rows[0];
      res.json({ success: true, data: insertedRow, message: `Registro insertado exitosamente con ID ${insertedRow.id}` });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error insertando en base de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
