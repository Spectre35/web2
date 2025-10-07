import comentariosService from '../services/comentariosService.js';

// ================= 📊 CONTROLADOR DE ANÁLISIS DE COMENTARIOS =================

/**
 * Obtiene comentarios frecuentes con filtros
 * GET /api/comentarios/analisis
 */
const obtenerAnalisisComentarios = async (req, res) => {
  try {
    console.time('comentarios-analisis-query');
    
    const { sucursal, bloque, fecha_inicio, fecha_fin, limite } = req.query;
    
    const filtros = {
      sucursal: sucursal || null,
      bloque: bloque || null,
      fechaInicio: fecha_inicio || null,
      fechaFin: fecha_fin || null,
      limite: limite ? parseInt(limite) : 20
    };

    console.log('🔍 [COMENTARIOS] Solicitud de análisis con filtros:', filtros);

    const resultado = await comentariosService.obtenerComentariosPorSucursal(filtros);
    
    console.timeEnd('comentarios-analisis-query');

    if (!resultado.success) {
      return res.status(500).json({
        error: 'Error al obtener análisis de comentarios',
        details: resultado.error
      });
    }

    res.json({
      success: true,
      data: resultado.data,
      filtros: resultado.filtros,
      total: resultado.total,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en obtenerAnalisisComentarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtiene estadísticas generales de comentarios
 * GET /api/comentarios/estadisticas
 */
const obtenerEstadisticas = async (req, res) => {
  try {
    console.time('comentarios-estadisticas-query');
    
    const { sucursal, bloque, fecha_inicio, fecha_fin } = req.query;
    
    const filtros = {
      sucursal: sucursal || null,
      bloque: bloque || null,
      fechaInicio: fecha_inicio || null,
      fechaFin: fecha_fin || null
    };

    console.log('🔍 [COMENTARIOS] Solicitud de estadísticas con filtros:', filtros);

    const resultado = await comentariosService.obtenerEstadisticasComentarios(filtros);
    
    console.timeEnd('comentarios-estadisticas-query');

    if (!resultado.success) {
      return res.status(500).json({
        error: 'Error al obtener estadísticas de comentarios',
        details: resultado.error
      });
    }

    res.json({
      success: true,
      data: resultado.data,
      filtros,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en obtenerEstadisticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtiene opciones para filtros (sucursales y bloques)
 * GET /api/comentarios/filtros
 */
const obtenerOpcionesFiltros = async (req, res) => {
  try {
    console.time('comentarios-filtros-query');
    
    console.log('🔍 [COMENTARIOS] Solicitud de opciones de filtros');

    const [sucursalesResult, bloquesResult] = await Promise.all([
      comentariosService.obtenerSucursalesDisponibles(),
      comentariosService.obtenerBloquesDisponibles()
    ]);
    
    console.timeEnd('comentarios-filtros-query');

    if (!sucursalesResult.success || !bloquesResult.success) {
      return res.status(500).json({
        error: 'Error al obtener opciones de filtros',
        details: {
          sucursales: sucursalesResult.error,
          bloques: bloquesResult.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        sucursales: sucursalesResult.data,
        bloques: bloquesResult.data
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en obtenerOpcionesFiltros:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtiene detalle específico de un comentario
 * GET /api/comentarios/detalle/:comentario
 */
const obtenerDetalleComentario = async (req, res) => {
  try {
    console.time('comentario-detalle-query');
    
    const { comentario } = req.params;
    const { sucursal, bloque, fecha_inicio, fecha_fin } = req.query;
    
    if (!comentario) {
      return res.status(400).json({
        error: 'El comentario es requerido'
      });
    }

    const filtros = {
      sucursal: sucursal || null,
      bloque: bloque || null,
      fechaInicio: fecha_inicio || null,
      fechaFin: fecha_fin || null,
      comentarioEspecifico: comentario
    };

    console.log(`🔍 [COMENTARIOS] Solicitud de detalle para comentario: "${comentario}"`);

    // Aquí puedes agregar lógica específica para obtener más detalles de un comentario
    // Por ahora devolvemos un placeholder
    
    console.timeEnd('comentario-detalle-query');

    res.json({
      success: true,
      data: {
        comentario: comentario,
        mensaje: 'Funcionalidad de detalle pendiente de implementar'
      },
      filtros,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en obtenerDetalleComentario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

export default {
  obtenerAnalisisComentarios,
  obtenerEstadisticas,
  obtenerOpcionesFiltros,
  obtenerDetalleComentario
};
