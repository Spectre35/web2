import express from 'express';
import comentariosController from '../controllers/comentariosController.js';

const router = express.Router();

// ================= 📊 RUTAS DE ANÁLISIS DE COMENTARIOS =================

/**
 * @route GET /api/comentarios/analisis
 * @desc Obtiene análisis de comentarios frecuentes con filtros
 * @query {string} sucursal - Filtro por sucursal específica
 * @query {string} bloque - Filtro por bloque específico
 * @query {string} fecha_inicio - Fecha de inicio (YYYY-MM-DD)
 * @query {string} fecha_fin - Fecha de fin (YYYY-MM-DD)
 * @query {number} limite - Límite de resultados (default: 20)
 */
router.get('/analisis', comentariosController.obtenerAnalisisComentarios);

/**
 * @route GET /api/comentarios/estadisticas
 * @desc Obtiene estadísticas generales de comentarios
 * @query {string} sucursal - Filtro por sucursal específica
 * @query {string} bloque - Filtro por bloque específico
 * @query {string} fecha_inicio - Fecha de inicio (YYYY-MM-DD)
 * @query {string} fecha_fin - Fecha de fin (YYYY-MM-DD)
 */
router.get('/estadisticas', comentariosController.obtenerEstadisticas);

/**
 * @route GET /api/comentarios/filtros
 * @desc Obtiene opciones disponibles para filtros (sucursales y bloques)
 */
router.get('/filtros', comentariosController.obtenerOpcionesFiltros);

/**
 * @route GET /api/comentarios/detalle/:comentario
 * @desc Obtiene detalle específico de un comentario
 * @param {string} comentario - Comentario a analizar
 * @query {string} sucursal - Filtro por sucursal específica
 * @query {string} bloque - Filtro por bloque específico
 * @query {string} fecha_inicio - Fecha de inicio (YYYY-MM-DD)
 * @query {string} fecha_fin - Fecha de fin (YYYY-MM-DD)
 */
router.get('/detalle/:comentario', comentariosController.obtenerDetalleComentario);

export default router;
