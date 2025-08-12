import express from "express";
import { pool, protegerDatos, formatearFechasEnObjeto } from "../config/database.js";

const router = express.Router();

// 📊 Endpoint para obtener usuarios de Slack
router.get("/", protegerDatos, async (req, res) => {
  try {
    const { activo, limite = 100, busqueda } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let values = [];
    let paramIndex = 1;
    
    if (activo !== undefined) {
      whereClause += ` AND activo = $${paramIndex}`;
      values.push(activo === 'true');
      paramIndex++;
    }
    
    if (busqueda) {
      whereClause += ` AND (
        nombre ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        slack_id ILIKE $${paramIndex} OR
        departamento ILIKE $${paramIndex}
      )`;
      values.push(`%${busqueda}%`);
      paramIndex++;
    }
    
    const query = `
      SELECT 
        id, nombre, email, slack_id, departamento,
        activo, ultimo_login, notificaciones_habilitadas,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha_registro,
        TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as ultima_actualizacion
      FROM usuarios_slack 
      ${whereClause}
      ORDER BY nombre ASC
      LIMIT $${paramIndex}
    `;
    
    values.push(parseInt(limite));
    
    const result = await pool.query(query, values);
    const usuarios = result.rows.map(formatearFechasEnObjeto);
    
    console.log(`✅ Obtenidos ${usuarios.length} usuarios de Slack`);
    
    res.json({
      usuarios: usuarios,
      total: usuarios.length,
      filtros: {
        activo: activo,
        busqueda: busqueda || null
      }
    });
    
  } catch (error) {
    console.error("❌ Error obteniendo usuarios de Slack:", error);
    res.status(500).json({ 
      error: "Error al obtener usuarios de Slack",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para obtener departamentos únicos
router.get("/departamentos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT departamento 
      FROM usuarios_slack 
      WHERE departamento IS NOT NULL 
      ORDER BY departamento
    `);
    
    res.json(result.rows.map(row => row.departamento));
  } catch (err) {
    console.error("❌ Error obteniendo departamentos:", err);
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
});

// 🔍 Endpoint para buscar usuario por Slack ID
router.get("/slack/:slackId", protegerDatos, async (req, res) => {
  const { slackId } = req.params;
  
  try {
    const query = `
      SELECT 
        id, nombre, email, slack_id, departamento,
        activo, ultimo_login, notificaciones_habilitadas,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha_registro,
        TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as ultima_actualizacion
      FROM usuarios_slack 
      WHERE slack_id = $1
    `;
    
    const result = await pool.query(query, [slackId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        error: "Usuario no encontrado",
        slack_id: slackId
      });
    }
    
    const usuario = formatearFechasEnObjeto(result.rows[0]);
    
    console.log(`✅ Usuario encontrado: ${usuario.nombre} (${slackId})`);
    
    res.json(usuario);
    
  } catch (error) {
    console.error("❌ Error buscando usuario por Slack ID:", error);
    res.status(500).json({ 
      error: "Error al buscar usuario",
      detalles: error.message 
    });
  }
});

// ✏️ Endpoint para crear usuario de Slack
router.post("/", protegerDatos, async (req, res) => {
  const { nombre, email, slack_id, departamento, notificaciones_habilitadas = true } = req.body;
  
  if (!nombre || !email || !slack_id) {
    return res.status(400).json({ 
      error: "Campos requeridos: nombre, email, slack_id" 
    });
  }
  
  try {
    // Verificar que el Slack ID no existe
    const checkQuery = `SELECT id FROM usuarios_slack WHERE slack_id = $1`;
    const checkResult = await pool.query(checkQuery, [slack_id]);
    
    if (checkResult.rowCount > 0) {
      return res.status(409).json({ 
        error: "Ya existe un usuario con este Slack ID",
        slack_id: slack_id
      });
    }
    
    const query = `
      INSERT INTO usuarios_slack (
        nombre, email, slack_id, departamento, 
        notificaciones_habilitadas, activo, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, true, NOW()
      )
      RETURNING 
        id, nombre, email, slack_id, departamento,
        activo, notificaciones_habilitadas,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha_registro
    `;
    
    const valores = [nombre, email, slack_id, departamento, notificaciones_habilitadas];
    const result = await pool.query(query, valores);
    
    const usuario = formatearFechasEnObjeto(result.rows[0]);
    
    console.log(`✅ Usuario de Slack creado: ${nombre} (${slack_id})`);
    
    res.status(201).json({
      success: true,
      usuario: usuario
    });
    
  } catch (error) {
    console.error("❌ Error creando usuario de Slack:", error);
    res.status(500).json({ 
      error: "Error al crear usuario",
      detalles: error.message 
    });
  }
});

// ✏️ Endpoint para actualizar usuario de Slack
router.put("/:id", protegerDatos, async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  
  try {
    // Construir query dinámico
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(campos).forEach(([campo, valor]) => {
      // Validar campos permitidos
      const camposPermitidos = [
        'nombre', 'email', 'slack_id', 'departamento',
        'activo', 'notificaciones_habilitadas'
      ];
      
      if (camposPermitidos.includes(campo)) {
        setClauses.push(`${campo} = $${paramIndex}`);
        values.push(valor);
        paramIndex++;
      }
    });
    
    if (setClauses.length === 0) {
      return res.status(400).json({ 
        error: "No hay campos válidos para actualizar" 
      });
    }
    
    // Agregar timestamp de actualización
    setClauses.push(`updated_at = NOW()`);
    values.push(id); // ID va al final
    
    const query = `
      UPDATE usuarios_slack 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, nombre, email, slack_id, departamento,
        activo, notificaciones_habilitadas,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha_registro,
        TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as ultima_actualizacion
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        error: "Usuario no encontrado" 
      });
    }
    
    const usuario = formatearFechasEnObjeto(result.rows[0]);
    
    console.log(`✅ Usuario de Slack actualizado: ${usuario.nombre} (ID: ${id})`);
    
    res.json({
      success: true,
      usuario: usuario
    });
    
  } catch (error) {
    console.error("❌ Error actualizando usuario de Slack:", error);
    res.status(500).json({ 
      error: "Error al actualizar usuario",
      detalles: error.message 
    });
  }
});

// 🗑️ Endpoint para desactivar usuario (soft delete)
router.delete("/:id", protegerDatos, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar que el usuario existe
    const checkQuery = `SELECT nombre, email, slack_id FROM usuarios_slack WHERE id = $1`;
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ 
        error: "Usuario no encontrado" 
      });
    }
    
    // Desactivar usuario en lugar de eliminarlo
    const updateQuery = `
      UPDATE usuarios_slack 
      SET activo = false, updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id, nombre, email, slack_id, activo,
        TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as fecha_desactivacion
    `;
    
    const result = await pool.query(updateQuery, [id]);
    const usuario = formatearFechasEnObjeto(result.rows[0]);
    
    console.log(`🗑️ Usuario de Slack desactivado: ${usuario.nombre} (ID: ${id})`);
    
    res.json({
      success: true,
      mensaje: "Usuario desactivado exitosamente",
      usuario: usuario
    });
    
  } catch (error) {
    console.error("❌ Error desactivando usuario de Slack:", error);
    res.status(500).json({ 
      error: "Error al desactivar usuario",
      detalles: error.message 
    });
  }
});

// 🔄 Endpoint para reactivar usuario
router.patch("/:id/reactivar", protegerDatos, async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      UPDATE usuarios_slack 
      SET activo = true, updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id, nombre, email, slack_id, activo,
        TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as fecha_reactivacion
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        error: "Usuario no encontrado" 
      });
    }
    
    const usuario = formatearFechasEnObjeto(result.rows[0]);
    
    console.log(`🔄 Usuario de Slack reactivado: ${usuario.nombre} (ID: ${id})`);
    
    res.json({
      success: true,
      mensaje: "Usuario reactivado exitosamente",
      usuario: usuario
    });
    
  } catch (error) {
    console.error("❌ Error reactivando usuario de Slack:", error);
    res.status(500).json({ 
      error: "Error al reactivar usuario",
      detalles: error.message 
    });
  }
});

// 📊 Endpoint para estadísticas de usuarios de Slack
router.get("/estadisticas", protegerDatos, async (req, res) => {
  try {
    const queries = {
      // Resumen general
      resumenGeneral: `
        SELECT 
          COUNT(*) as total_usuarios,
          COUNT(*) FILTER (WHERE activo = true) as usuarios_activos,
          COUNT(*) FILTER (WHERE activo = false) as usuarios_inactivos,
          COUNT(*) FILTER (WHERE notificaciones_habilitadas = true) as con_notificaciones,
          COUNT(DISTINCT departamento) as departamentos_unicos,
          COUNT(*) FILTER (WHERE ultimo_login IS NOT NULL) as con_ultimo_login,
          COUNT(*) FILTER (WHERE ultimo_login >= CURRENT_DATE - INTERVAL '30 days') as login_ultimo_mes
        FROM usuarios_slack
      `,
      
      // Por departamento
      porDepartamento: `
        SELECT 
          departamento,
          COUNT(*) as total_usuarios,
          COUNT(*) FILTER (WHERE activo = true) as activos,
          COUNT(*) FILTER (WHERE activo = false) as inactivos,
          COUNT(*) FILTER (WHERE notificaciones_habilitadas = true) as con_notificaciones,
          COUNT(*) FILTER (WHERE ultimo_login >= CURRENT_DATE - INTERVAL '30 days') as login_reciente
        FROM usuarios_slack
        WHERE departamento IS NOT NULL
        GROUP BY departamento
        ORDER BY total_usuarios DESC
      `,
      
      // Actividad reciente
      actividadReciente: `
        SELECT 
          DATE_TRUNC('day', ultimo_login) as fecha,
          COUNT(DISTINCT id) as usuarios_unicos,
          COUNT(*) as total_logins
        FROM usuarios_slack
        WHERE ultimo_login >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', ultimo_login)
        ORDER BY fecha DESC
        LIMIT 30
      `,
      
      // Usuarios más activos
      usuariosMasActivos: `
        SELECT 
          nombre, email, departamento,
          ultimo_login,
          notificaciones_habilitadas,
          TO_CHAR(ultimo_login, 'DD/MM/YYYY HH24:MI') as ultimo_login_formateado
        FROM usuarios_slack
        WHERE activo = true AND ultimo_login IS NOT NULL
        ORDER BY ultimo_login DESC
        LIMIT 10
      `
    };
    
    const resultados = {};
    
    for (const [clave, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      
      if (clave === 'usuariosMasActivos') {
        resultados[clave] = result.rows.map(formatearFechasEnObjeto);
      } else if (clave === 'actividadReciente') {
        resultados[clave] = result.rows.map(row => ({
          ...row,
          fecha: formatearFechasEnObjeto(row).fecha
        }));
      } else {
        resultados[clave] = result.rows;
      }
    }
    
    console.log(`✅ Estadísticas de usuarios de Slack generadas exitosamente`);
    
    res.json(resultados);
    
  } catch (error) {
    console.error("❌ Error generando estadísticas de usuarios de Slack:", error);
    res.status(500).json({ 
      error: "Error al generar estadísticas",
      detalles: error.message 
    });
  }
});

// 📅 Endpoint para actualizar último login
router.patch("/:id/ultimo-login", protegerDatos, async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      UPDATE usuarios_slack 
      SET ultimo_login = NOW(), updated_at = NOW()
      WHERE id = $1 AND activo = true
      RETURNING 
        id, nombre, slack_id,
        TO_CHAR(ultimo_login, 'DD/MM/YYYY HH24:MI') as ultimo_login_formateado
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        error: "Usuario no encontrado o inactivo" 
      });
    }
    
    const usuario = formatearFechasEnObjeto(result.rows[0]);
    
    console.log(`📅 Último login actualizado: ${usuario.nombre} (ID: ${id})`);
    
    res.json({
      success: true,
      usuario: usuario
    });
    
  } catch (error) {
    console.error("❌ Error actualizando último login:", error);
    res.status(500).json({ 
      error: "Error al actualizar último login",
      detalles: error.message 
    });
  }
});

// 🔔 Endpoint para alternar notificaciones
router.patch("/:id/notificaciones", protegerDatos, async (req, res) => {
  const { id } = req.params;
  const { habilitadas } = req.body;
  
  if (typeof habilitadas !== 'boolean') {
    return res.status(400).json({ 
      error: "Se requiere el campo 'habilitadas' como boolean" 
    });
  }
  
  try {
    const query = `
      UPDATE usuarios_slack 
      SET notificaciones_habilitadas = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id, nombre, notificaciones_habilitadas,
        TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as fecha_actualizacion
    `;
    
    const result = await pool.query(query, [habilitadas, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        error: "Usuario no encontrado" 
      });
    }
    
    const usuario = formatearFechasEnObjeto(result.rows[0]);
    
    console.log(`🔔 Notificaciones ${habilitadas ? 'habilitadas' : 'deshabilitadas'}: ${usuario.nombre} (ID: ${id})`);
    
    res.json({
      success: true,
      usuario: usuario
    });
    
  } catch (error) {
    console.error("❌ Error alternando notificaciones:", error);
    res.status(500).json({ 
      error: "Error al alternar notificaciones",
      detalles: error.message 
    });
  }
});

export default router;
