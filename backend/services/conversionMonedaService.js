// services/conversionMonedaService.js
import pkg from "pg";

const { Pool } = pkg;

// Mapeo de bloques a países y monedas
const BLOQUE_PAIS_MONEDA = {
  COL1: { pais: "Colombia", moneda: "COP" },
  COL2: { pais: "Colombia", moneda: "COP" },
  COL: { pais: "Colombia", moneda: "COP" },
  CR: { pais: "Costa Rica", moneda: "CRC" },
  CRI1: { pais: "Costa Rica", moneda: "CRC" },
  CHI: { pais: "Chile", moneda: "CLP" },
  HON: { pais: "Honduras", moneda: "HNL" },
  ESP1: { pais: "España", moneda: "EUR" },
  ESP2: { pais: "España", moneda: "EUR" },
  BRA: { pais: "Brasil", moneda: "BRL" },
  USA1: { pais: "USA", moneda: "USD" },
};

const TIPO_CAMBIO = {
  MXN: 1,
  COP: 0.004573,
  CRC: 0.037,
  CLP: 0.019,
  HNL: 0.71,
  EUR: 21.82,
  BRL: 3.36,
  USD: 18.75,
};

export class ConversionMonedaService {
  constructor(pool) {
    this.pool = pool;
  }

  async convertirMonedasPorAnio(anio) {
    console.log(`💱 Iniciando conversión de moneda para año: ${anio}`);
    
    if (!anio) {
      throw new Error("Se requiere especificar el año");
    }

    const client = await this.pool.connect();
    
    try {
      // 1. Obtener aclaraciones del año
      const aclaraciones = await this._obtenerAclaracionesDelAnio(client, anio);
      
      if (aclaraciones.length === 0) {
        return { 
          exito: false, 
          mensaje: `No se encontraron aclaraciones para el año ${anio}` 
        };
      }

      // 2. Procesar conversiones
      const resultado = await this._procesarConversiones(client, aclaraciones);
      
      return {
        exito: true,
        anio: anio,
        registrosEncontrados: aclaraciones.length,
        registrosActualizados: resultado.registrosActualizados,
        detallesPorBloque: resultado.detallesPorBloque,
        mensaje: `Conversión completada: ${resultado.registrosActualizados} registros actualizados`
      };

    } finally {
      client.release();
    }
  }

  async _obtenerAclaracionesDelAnio(client, anio) {
    const consultaAclaraciones = `
      SELECT 
        "procesador", "bloque", "monto", "año", 
        CASE 
          WHEN "id_de_transaccion" IS NOT NULL THEN "id_de_transaccion"::text
          ELSE COALESCE("autorizacion", 'sin_id')
        END as id_registro
      FROM "aclaraciones" 
      WHERE "año"::text = $1 
      AND "monto" IS NOT NULL 
      AND "bloque" IS NOT NULL
    `;
    
    const result = await client.query(consultaAclaraciones, [anio]);
    console.log(`📊 Encontradas ${result.rows.length} aclaraciones para convertir`);
    
    return result.rows;
  }

  async _procesarConversiones(client, aclaraciones) {
    let registrosActualizados = 0;
    const detallesPorBloque = {};
    
    for (const aclaracion of aclaraciones) {
      const { bloque, monto, id_registro } = aclaracion;
      
      // Obtener información del bloque
      const infoBloque = BLOQUE_PAIS_MONEDA[bloque];
      if (!infoBloque) {
        console.warn(`⚠️ Bloque no reconocido: ${bloque}`);
        continue;
      }

      // Obtener tipo de cambio
      const tipoCambio = TIPO_CAMBIO[infoBloque.moneda];
      if (!tipoCambio) {
        console.warn(`⚠️ Moneda no reconocida: ${infoBloque.moneda}`);
        continue;
      }

      // Calcular monto en MXN
      const montoOriginal = parseFloat(monto);
      const montoMXN = montoOriginal * tipoCambio;

      // Actualizar registro
      const actualizado = await this._actualizarMontoMXN(client, id_registro, montoMXN);
      
      if (actualizado) {
        registrosActualizados++;
        
        // Agregar a estadísticas por bloque
        if (!detallesPorBloque[bloque]) {
          detallesPorBloque[bloque] = {
            pais: infoBloque.pais,
            moneda: infoBloque.moneda,
            tipoCambio: tipoCambio,
            registros: 0,
            montoTotal: 0,
            montoTotalMXN: 0
          };
        }
        
        detallesPorBloque[bloque].registros++;
        detallesPorBloque[bloque].montoTotal += montoOriginal;
        detallesPorBloque[bloque].montoTotalMXN += montoMXN;
      }
    }

    return { registrosActualizados, detallesPorBloque };
  }

  async _actualizarMontoMXN(client, idRegistro, montoMXN) {
    try {
      const updateQuery = `
        UPDATE "aclaraciones" 
        SET "monto_mnx" = $1
        WHERE CASE 
          WHEN "id_de_transaccion" IS NOT NULL THEN "id_de_transaccion"::text
          ELSE COALESCE("autorizacion", 'sin_id')
        END = $2
      `;
      
      const result = await client.query(updateQuery, [montoMXN.toFixed(2), idRegistro]);
      return result.rowCount > 0;
    } catch (error) {
      console.error(`❌ Error actualizando registro ${idRegistro}:`, error.message);
      return false;
    }
  }
}