import { pool } from '../../../config/database.js';

/**
 * Servicio para insertar datos extraídos del OCR en la base de datos
 */
class DatabaseService {

  /**
   * Inserta los datos extraídos en la tabla papeleria
   * @param {Object} extractedFields - Campos extraídos del documento
   * @param {string} extractedFields.cliente - Nombre del cliente
   * @param {string} extractedFields.fecha_contrato - Fecha en formato AAAA-MM-DD
   * @param {string} extractedFields.tipo - Tipo de documento (contrato/recibo)
   * @param {number} [extractedFields.monto] - Monto (solo para recibos)
   * @param {string} [extractedFields.t_pago] - Tipo de pago (solo para recibos)
   * @param {string} [extractedFields.bloque] - Bloque seleccionado
   * @param {string} [extractedFields.sucursal] - Sucursal seleccionada
   * @param {number} [extractedFields.caja] - Caja seleccionada
   * @returns {Promise<Object>} Resultado de la inserción
   */
  async insertarDatosExtraidos(extractedFields) {
    try {
      console.log('🔄 Insertando datos en base de datos:', extractedFields);


      // Validar campos requeridos - Si no hay cliente, asignar nombre genérico
      // Pero si el cliente es "SIN TEXTO OCR", "SIN TEXTO", vacío o similar, NO insertar
      const clienteRaw = (extractedFields.cliente || '').trim();
      const clienteUpper = clienteRaw.toUpperCase();
      const valoresInvalidos = [
        '',
        'SIN TEXTO OCR',
        'SIN TEXTO',
        'SIN_TEXTO',
        'NO TEXTO',
        'NO_TEXTO',
        'NULL',
        'N/A',
        'NA',
      ];
      // Solo rechazar si es exactamente igual a un valor inválido (ignorando espacios)
      if (!clienteRaw || valoresInvalidos.some(v => clienteUpper === v)) {
        console.log('⛔ Registro ignorado: cliente vacío o inválido:', extractedFields.cliente);
        return {
          success: false,
          error: 'Cliente vacío o inválido, registro no insertado',
          message: 'Cliente vacío o inválido, registro no insertado',
          data: null
        };
      }

      if (!extractedFields.tipo) {
        throw new Error('El campo tipo es requerido');
      }

      // Preparar los datos para inserción con valores de configuración
      const datosInsercion = {
        cliente: extractedFields.cliente,
        sucursal: extractedFields.sucursal || null,
        bloque: extractedFields.bloque || null,
        fecha_contrato: extractedFields.fecha_contrato || null,
        tipo: extractedFields.tipo,
        monto: extractedFields.monto || null,
        t_pago: extractedFields.t_pago || null,
        caja: extractedFields.caja || null,
        usuario: extractedFields.usuario || 'OCR_AUTO' // Usuario de configuración o automático
      };

      // Query de inserción en la tabla papeleria (estructura original)
      const query = `
        INSERT INTO papeleria (
          cliente, sucursal, bloque, fecha_contrato, tipo, monto, t_pago, caja, usuario
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING id, cliente, sucursal, fecha_contrato, tipo, monto
      `;

      const values = [
        datosInsercion.cliente,
        datosInsercion.sucursal,
        datosInsercion.bloque,
        datosInsercion.fecha_contrato,
        datosInsercion.tipo || 'recibo',
        datosInsercion.monto,
        datosInsercion.t_pago || 'EFECTIVO',
        datosInsercion.caja || 'AUTO',
        datosInsercion.usuario
      ];

      const result = await pool.query(query, values);
      const insertedRecord = result.rows[0];

      console.log('✅ Datos insertados correctamente en tabla papeleria:', {
        id: insertedRecord.id,
        cliente: insertedRecord.cliente,
        sucursal: insertedRecord.sucursal,
        fecha_contrato: insertedRecord.fecha_contrato,
        tipo: insertedRecord.tipo,
        monto: insertedRecord.monto
      });

      return {
        success: true,
        data: insertedRecord,
        message: 'Datos insertados correctamente en la base de datos'
      };

    } catch (error) {
      console.error('❌ Error insertando datos en base de datos:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al insertar datos en la base de datos'
      };
    }
  }

  /**
   * Verifica si ya existe un registro similar en la base de datos
   * @param {Object} extractedFields - Campos extraídos
   * @returns {Promise<boolean>} True si existe un registro similar
   */
  async verificarRegistroExistente(extractedFields) {
    try {
      const query = `
        SELECT id, cliente, fecha_contrato, tipo
        FROM papeleria
        WHERE cliente ILIKE $1
          AND fecha_contrato = $2
          AND tipo = $3
        LIMIT 1
      `;

      const values = [
        `%${extractedFields.cliente}%`,
        extractedFields.fecha_contrato,
        extractedFields.tipo
      ];

      const result = await pool.query(query, values);

      if (result.rows.length > 0) {
        console.log('⚠️ Se encontró un registro similar reciente en papeleria:', result.rows[0]);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error verificando registro existente:', error);
      return false;
    }
  }

  /**
   * Obtiene los últimos registros insertados
   * @param {number} limit - Número de registros a obtener
   * @returns {Promise<Array>} Lista de registros recientes
   */
  async obtenerRegistrosRecientes(limit = 10) {
    try {
      const query = `
        SELECT id, cliente, sucursal, bloque, fecha_contrato, tipo, monto, t_pago, caja, usuario, created_at
        FROM papeleria
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      console.error('❌ Error obteniendo registros recientes:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Procesa automáticamente los datos extraídos y los inserta si no existen
   * @param {Object} extractedFields - Campos extraídos del OCR
   * @param {boolean} forceInsert - Forzar inserción sin verificar duplicados
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async procesarDatosExtraidos(extractedFields, forceInsert = false) {
    try {
      // Validar que tenemos datos mínimos para insertar
      if (!extractedFields.cliente || !extractedFields.tipo) {
        return {
          success: false,
          message: 'Datos insuficientes: se requiere al menos cliente y tipo',
          data: null
        };
      }

      // Verificar duplicados a menos que se fuerce la inserción
      if (!forceInsert && extractedFields.fecha_contrato) {
        const existeRegistro = await this.verificarRegistroExistente(extractedFields);
        if (existeRegistro) {
          return {
            success: false,
            message: 'Ya existe un registro similar reciente. Use forceInsert=true para insertar de todos modos.',
            data: null,
            duplicate: true
          };
        }
      }

      // Insertar los datos
      const resultado = await this.insertarDatosExtraidos(extractedFields);
      return resultado;

    } catch (error) {
      console.error('❌ Error procesando datos extraídos:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error procesando datos extraídos'
      };
    }
  }

  /**
   * Obtiene documentos procesados recientemente de la base de datos
   * @param {number} limit - Número máximo de documentos a retornar
   * @returns {Promise<Array>} Lista de documentos procesados
   */
  async getRecentDocuments(limit = 10) {
    try {
      console.log(`🔄 Obteniendo últimos ${limit} documentos procesados`);

      const query = `
        SELECT
          id,
          cliente,
          sucursal,
          bloque,
          fecha_contrato,
          tipo,
          monto,
          t_pago,
          caja,
          usuario,
          created_at
        FROM papeleria
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);

      console.log(`✅ Se encontraron ${result.rows.length} documentos`);
      return result.rows;

    } catch (error) {
      console.error('❌ Error obteniendo documentos recientes:', error);
      throw new Error(`Error consultando documentos: ${error.message}`);
    }
  }
}

// Exportar la clase
export default DatabaseService;
