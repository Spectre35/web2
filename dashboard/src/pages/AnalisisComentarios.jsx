import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function AnalisisComentarios() {
  const [comentarios, setComentarios] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [opcionesFiltros, setOpcionesFiltros] = useState({ sucursales: [], bloques: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    sucursal: '',
    bloque: '',
    fechaInicio: '',
    fechaFin: '',
    limite: 20
  });

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Cargar opciones de filtros primero
      await cargarOpcionesFiltros();
      
      // Cargar datos iniciales (sin filtros)
      await Promise.all([
        cargarComentarios(),
        cargarEstadisticas()
      ]);
      
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
      // Solo mostrar error si es un problema de conexión real
      if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('conexión')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarOpcionesFiltros = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/comentarios/filtros`);
      if (!response.ok) {
        throw new Error(`Error de conexión: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setOpcionesFiltros(result.data);
      } else {
        console.log('No se pudieron cargar las opciones de filtros');
        setOpcionesFiltros({ sucursales: [], bloques: [] });
      }
    } catch (err) {
      console.error('Error cargando filtros:', err);
      setOpcionesFiltros({ sucursales: [], bloques: [] });
      // Solo lanzar error si es de conexión
      if (err.message.includes('fetch') || err.message.includes('conexión')) {
        throw err;
      }
    }
  };

  const cargarComentarios = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.sucursal) params.append('sucursal', filtros.sucursal);
      if (filtros.bloque) params.append('bloque', filtros.bloque);
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      params.append('limite', filtros.limite.toString());

      const response = await fetch(`${API_BASE_URL}/api/comentarios/analisis?${params}`);
      if (!response.ok) {
        // Si no hay resultados, no es un error, solo datos vacíos
        console.log('No se encontraron comentarios con los filtros aplicados');
        setComentarios([]);
        return;
      }
      
      const result = await response.json();
      if (result.success) {
        setComentarios(result.data || []);
      } else {
        console.log('Sin resultados para los filtros aplicados');
        setComentarios([]);
      }
    } catch (err) {
      console.error('Error cargando comentarios:', err);
      // No lanzar error, solo establecer array vacío
      setComentarios([]);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.sucursal) params.append('sucursal', filtros.sucursal);
      if (filtros.bloque) params.append('bloque', filtros.bloque);
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);

      const response = await fetch(`${API_BASE_URL}/api/comentarios/estadisticas?${params}`);
      if (!response.ok) {
        console.log('No se encontraron estadísticas con los filtros aplicados');
        setEstadisticas({});
        return;
      }
      
      const result = await response.json();
      if (result.success) {
        setEstadisticas(result.data || {});
      } else {
        console.log('Sin estadísticas para los filtros aplicados');
        setEstadisticas({});
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      // No lanzar error, solo establecer objeto vacío
      setEstadisticas({});
    }
  };

  const aplicarFiltros = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        cargarComentarios(),
        cargarEstadisticas()
      ]);
    } catch (err) {
      console.error('Error aplicando filtros:', err);
      // No mostrar error modal, solo log en consola
      // Los datos vacíos se manejan en la UI
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = async () => {
    const filtrosLimpios = {
      sucursal: '',
      bloque: '',
      fechaInicio: '',
      fechaFin: '',
      limite: 20
    };
    
    setFiltros(filtrosLimpios);
    
    // Recargar datos con filtros limpios
    setLoading(true);
    try {
      // Temporalmente usar filtros limpios para la carga
      const params = new URLSearchParams();
      params.append('limite', '20');

      const [responseComentarios, responseEstadisticas] = await Promise.all([
        fetch(`${API_BASE_URL}/api/comentarios/analisis?${params}`),
        fetch(`${API_BASE_URL}/api/comentarios/estadisticas`)
      ]);

      if (responseComentarios.ok) {
        const resultComentarios = await responseComentarios.json();
        if (resultComentarios.success) {
          setComentarios(resultComentarios.data || []);
        }
      }

      if (responseEstadisticas.ok) {
        const resultEstadisticas = await responseEstadisticas.json();
        if (resultEstadisticas.success) {
          setEstadisticas(resultEstadisticas.data || {});
        }
      }
    } catch (err) {
      console.error('Error al limpiar filtros:', err);
    } finally {
      setLoading(false);
    }
  };

  const manejarCambioFiltro = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const obtenerColorPorPorcentaje = (porcentaje) => {
    if (porcentaje >= 10) return 'bg-red-500/20 border-red-500/30 text-red-400';
    if (porcentaje >= 5) return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
    if (porcentaje >= 2) return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
    return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando análisis de comentarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md">
          <div className="text-red-400 text-xl mb-4">❌ Error de Conexión</div>
          <div className="text-gray-300 mb-6">{error}</div>
          <div className="flex gap-4">
            <button
              onClick={cargarDatosIniciales}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              🔄 Reintentar
            </button>
            <Link
              to="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              🏠 Volver al Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4">
            💬 Análisis de Comentarios
          </h1>
          <p className="text-gray-300 text-lg">
            Análisis de comentarios frecuentes en paquetes de ventas con filtros avanzados
          </p>
        </div>

        {/* Controles y Filtros */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
          <h3 className="text-white text-lg font-bold mb-4">🔍 Filtros de Búsqueda</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Filtro de Sucursal */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                🏢 Sucursal
              </label>
              <select
                value={filtros.sucursal}
                onChange={(e) => manejarCambioFiltro('sucursal', e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
              >
                <option value="">Todas las sucursales</option>
                {opcionesFiltros.sucursales.map(sucursal => (
                  <option key={sucursal} value={sucursal}>{sucursal}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Bloque */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                🏗️ Bloque
              </label>
              <select
                value={filtros.bloque}
                onChange={(e) => manejarCambioFiltro('bloque', e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
              >
                <option value="">Todos los bloques</option>
                {opcionesFiltros.bloques.map(bloque => (
                  <option key={bloque} value={bloque}>{bloque}</option>
                ))}
              </select>
            </div>

            {/* Límite de resultados */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                📊 Límite de resultados
              </label>
              <select
                value={filtros.limite}
                onChange={(e) => manejarCambioFiltro('limite', parseInt(e.target.value))}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
              >
                <option value={10}>10 comentarios</option>
                <option value={20}>20 comentarios</option>
                <option value={50}>50 comentarios</option>
                <option value={100}>100 comentarios</option>
              </select>
            </div>

            {/* Fecha Inicio */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                📅 Fecha Inicio
              </label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => manejarCambioFiltro('fechaInicio', e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
              />
            </div>

            {/* Fecha Fin */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                📅 Fecha Fin
              </label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => manejarCambioFiltro('fechaFin', e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              onClick={aplicarFiltros}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              🔍 Aplicar Filtros
            </button>
            <button
              onClick={limpiarFiltros}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              🧹 Limpiar
            </button>
          </div>
        </div>

        {/* Estadísticas Generales */}
        {estadisticas && Object.keys(estadisticas).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-xl p-4">
              <div className="text-blue-400 text-sm font-medium">Total Paquetes</div>
              <div className="text-blue-100 text-2xl font-bold">
                {estadisticas.totalPaquetes?.toLocaleString('es-MX') || '0'}
              </div>
            </div>
            <div className="bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-xl p-4">
              <div className="text-purple-400 text-sm font-medium">Con Comentarios</div>
              <div className="text-purple-100 text-2xl font-bold">
                {estadisticas.paquetesConComentarios?.toLocaleString('es-MX') || '0'}
              </div>
            </div>
            <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4">
              <div className="text-green-400 text-sm font-medium">% Con Comentarios</div>
              <div className="text-green-100 text-2xl font-bold">
                {estadisticas.porcentajeConComentarios?.toFixed(1) || '0'}%
              </div>
            </div>
            <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 rounded-xl p-4">
              <div className="text-orange-400 text-sm font-medium">Sucursales Únicas</div>
              <div className="text-orange-100 text-2xl font-bold">
                {estadisticas.sucursalesUnicas || '0'}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Comentarios */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-white text-xl font-bold mb-6">📝 Comentarios Más Frecuentes</h3>
          
          {comentarios.length === 0 ? (
            <div className="text-gray-300 text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-xl mb-2">No se encontraron comentarios</div>
              <div className="text-sm text-gray-400 mb-4">
                {filtros.sucursal || filtros.bloque || filtros.fechaInicio || filtros.fechaFin ? 
                  'Intenta ajustar los filtros para obtener resultados' : 
                  'No hay comentarios disponibles en el sistema'
                }
              </div>
              {(filtros.sucursal || filtros.bloque || filtros.fechaInicio || filtros.fechaFin) && (
                <button
                  onClick={limpiarFiltros}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  🧹 Limpiar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {comentarios.map((comentario, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-4 border transition-all hover:scale-[1.02] ${obtenerColorPorPorcentaje(comentario.porcentaje)}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-medium mb-2">
                        {comentario.comentario}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="opacity-80">Frecuencia:</span>
                          <span className="ml-2 font-bold">{comentario.frecuencia.toLocaleString('es-MX')}</span>
                        </div>
                        <div>
                          <span className="opacity-80">Sucursales:</span>
                          <span className="ml-2 font-bold">{comentario.sucursalesAfectadas}</span>
                        </div>
                        <div>
                          <span className="opacity-80">Bloques:</span>
                          <span className="ml-2 font-bold">{comentario.bloquesAfectados}</span>
                        </div>
                        <div>
                          <span className="opacity-80">Porcentaje:</span>
                          <span className="ml-2 font-bold">{comentario.porcentaje}%</span>
                        </div>
                      </div>
                      
                      {/* Tipos de Cobranza */}
                      {comentario.tiposCobranza && comentario.tiposCobranza.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm opacity-80">Tipos de Cobranza:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {comentario.tiposCobranza.map((tipo, idx) => (
                              <span key={idx} className="bg-black/30 px-2 py-1 rounded text-xs">
                                {tipo}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        #{index + 1}
                      </div>
                      <div className="text-sm opacity-80">
                        Ranking
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="mt-8 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-white text-lg font-bold mb-2">📊 Resumen del Análisis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div>
              <p>Comentarios analizados: <span className="text-white font-bold">{comentarios.length}</span></p>
              <p>Filtros activos: <span className="text-white font-bold">
                {[
                  filtros.sucursal && `Sucursal: ${filtros.sucursal}`,
                  filtros.bloque && `Bloque: ${filtros.bloque}`,
                  filtros.fechaInicio && filtros.fechaFin && `Período: ${filtros.fechaInicio} - ${filtros.fechaFin}`
                ].filter(Boolean).join(', ') || 'Ninguno'}
              </span></p>
            </div>
            <div>
              <p>Límite de resultados: <span className="text-white font-bold">{filtros.limite}</span></p>
              <p>Última actualización: <span className="text-white font-bold">{new Date().toLocaleString('es-MX')}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
