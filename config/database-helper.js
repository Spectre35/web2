// 📋 Ejemplo de uso de ambas bases de datos
import { pool, poolNuevo } from './config/database-nuevo.js';

// 🔄 Funciones para la base de datos ORIGINAL (existente)
export const consultarDatosOriginales = async (query, params = []) => {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error en BD original:', error);
    throw error;
  }
};

// 🆕 Funciones para la NUEVA base de datos
export const consultarDatosNuevos = async (query, params = []) => {
  try {
    const result = await poolNuevo.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error en BD nueva:', error);
    throw error;
  }
};

// 📊 Ejemplo de endpoint que usa la nueva BD
export const crearUsuarioNuevo = async (nombre, email) => {
  const query = `
    INSERT INTO usuarios_nuevos (nombre, email, fecha_creacion) 
    VALUES ($1, $2, NOW()) 
    RETURNING *
  `;
  return await consultarDatosNuevos(query, [nombre, email]);
};

// 📊 Ejemplo de endpoint que usa la BD original
export const consultarAclaracionesExistentes = async () => {
  const query = 'SELECT * FROM aclaraciones LIMIT 10';
  return await consultarDatosOriginales(query);
};

// 🔄 Función para migrar datos entre bases de datos (si necesitas)
export const migrarDatos = async (tabla, condicion = '') => {
  try {
    // Consultar datos de la BD original
    const datosOriginales = await consultarDatosOriginales(`SELECT * FROM ${tabla} ${condicion}`);
    
    // Insertar en la nueva BD (ejemplo genérico)
    for (const dato of datosOriginales) {
      const columnas = Object.keys(dato).join(', ');
      const valores = Object.values(dato);
      const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');
      
      await consultarDatosNuevos(
        `INSERT INTO ${tabla}_migrados (${columnas}) VALUES (${placeholders})`,
        valores
      );
    }
    
    return { migrados: datosOriginales.length };
  } catch (error) {
    console.error('Error en migración:', error);
    throw error;
  }
};
