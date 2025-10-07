// controllers/aclaracionesController.js
import { ConversionMonedaService } from '../services/conversionMonedaService.js';

export class AclaracionesController {
  constructor(pool) {
    this.conversionService = new ConversionMonedaService(pool);
  }

  async convertirMoneda(req, res) {
    try {
      const { anio } = req.body;
      
      const resultado = await this.conversionService.convertirMonedasPorAnio(anio);
      
      if (!resultado.exito) {
        return res.status(404).json({
          error: resultado.mensaje
        });
      }

      res.json(resultado);

    } catch (error) {
      console.error('❌ Error al convertir moneda:', error);
      res.status(500).json({ 
        error: "Error al convertir moneda", 
        detalle: error.message 
      });
    }
  }
}