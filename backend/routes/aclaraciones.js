// routes/aclaraciones.js
import express from 'express';
import { AclaracionesController } from '../controllers/aclaracionesController.js';

const router = express.Router();

export default function createAclaracionesRoutes(pool) {
  const controller = new AclaracionesController(pool);

  // 💱 Endpoint para convertir moneda
  router.post('/convertir-moneda', (req, res) => controller.convertirMoneda(req, res));

  return router;
}