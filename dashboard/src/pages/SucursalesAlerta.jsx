import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function SucursalesAlerta() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState(7); // Por defecto, mostrar sucursales sin actividad por 7 días o menos
  const [modalDetalle, setModalDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [fechaInicioModal, setFechaInicioModal] = useState('');
  const [fechaFinModal, setFechaFinModal] = useState('');
  const [filtroEstatusModal, setFiltroEstatusModal] = useState('vencidos'); // 'vencidos' | 'todos'

  useEffect(() => {
    cargarAlertas();
  }, []);

  // Efecto para manejar el scroll del body cuando el modal está abierto
  useEffect(() => {
    if (modalDetalle) {
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
      // Asegurar que el modal esté en el top
      window.scrollTo(0, 0);
      
      // Agregar listener para la tecla ESC
      const handleEsc = (event) => {
        if (event.keyCode === 27) {
          cerrarModal();
        }
      };
      document.addEventListener('keydown', handleEsc);
      
      return () => {
        document.removeEventListener('keydown', handleEsc);
      };
    } else {
      // Restaurar scroll del body cuando el modal se cierra
      document.body.style.overflow = 'unset';
    }

    // Cleanup function para restaurar el scroll si el componente se desmonta
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalDetalle]);

  const cargarAlertas = async () => {
    try {
      setLoading(true);
      console.log('🔍 Intentando conectar a:', `${API_BASE_URL}/sucursales-alerta`);
      const response = await axios.get(`${API_BASE_URL}/sucursales-alerta`);
      console.log('✅ Respuesta recibida:', response.data);
      setAlertas(response.data);
      setError(null);
    } catch (err) {
      console.error('❌ Error al cargar alertas:', err);
      console.error('📊 Detalles del error:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      
      let errorMessage = 'Error al cargar las alertas de sucursales';
      if (err.code === 'ECONNREFUSED') {
        errorMessage = 'No se puede conectar al servidor. Verifica que esté funcionando en el puerto 3000.';
      } else if (err.response?.status === 404) {
        errorMessage = 'El endpoint /sucursales-alerta no fue encontrado en el servidor.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Error interno del servidor. Revisa los logs del backend.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar el modal correctamente
  const cerrarModal = () => {
    setModalDetalle(null);
    setFechaInicioModal('');
    setFechaFinModal('');
    setFiltroEstatusModal('vencidos');
    // Restaurar scroll del body inmediatamente
    document.body.style.overflow = 'unset';
  };

  const cargarDetalleSucursal = async (sucursal, fechaInicio = '', fechaFin = '', filtroEstatus = 'vencidos') => {
    try {
      setLoadingDetalle(true);
      console.log(`🔍 Cargando detalle para sucursal: ${sucursal}`);
      
      // Construir URL con parámetros
      let url = `${API_BASE_URL}/sucursal-detalle/${encodeURIComponent(sucursal)}`;
      const params = new URLSearchParams();
      
      if (fechaInicio && fechaFin) {
        params.append('fecha_inicio', fechaInicio);
        params.append('fecha_fin', fechaFin);
        console.log(`📅 Con filtro de fechas: ${fechaInicio} - ${fechaFin}`);
      } else {
        console.log(`📅 Sin filtro de fechas (últimos 90 días por defecto)`);
      }
      
      params.append('filtro_estatus', filtroEstatus);
      console.log(`📊 Filtro de estatus: ${filtroEstatus}`);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      console.log('✅ Detalle recibido:', response.data);
      
      // Debug específico para tarjetas
      if (response.data.topTarjetas) {
        console.log('🃏 Top Tarjetas encontradas:', response.data.topTarjetas);
      } else {
        console.log('❌ No se encontraron topTarjetas en la respuesta');
        console.log('📊 Claves disponibles en response.data:', Object.keys(response.data));
      }
      
      setModalDetalle(response.data);
      
      // Si no tenemos fechas en el estado, usar las del modal
      if (!fechaInicioModal && !fechaFinModal && response.data.periodo) {
        setFechaInicioModal(response.data.periodo.fechaInicio);
        setFechaFinModal(response.data.periodo.fechaFin);
      }
    } catch (err) {
      console.error('❌ Error al cargar detalle de sucursal:', err);
      alert(`Error al cargar detalle de ${sucursal}: ${err.message}`);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const aplicarFiltroFechas = () => {
    if (modalDetalle) {
      cargarDetalleSucursal(modalDetalle.sucursal, fechaInicioModal, fechaFinModal, filtroEstatusModal);
    }
  };

  const resetearFiltroFechas = () => {
    setFechaInicioModal('');
    setFechaFinModal('');
    if (modalDetalle) {
      cargarDetalleSucursal(modalDetalle.sucursal, '', '', filtroEstatusModal);
    }
  };

  const cambiarFiltroEstatus = (nuevoFiltro) => {
    setFiltroEstatusModal(nuevoFiltro);
    if (modalDetalle) {
      cargarDetalleSucursal(modalDetalle.sucursal, fechaInicioModal, fechaFinModal, nuevoFiltro);
    }
  };

  const probarConexion = async () => {
    try {
      console.log('🧪 Probando conexión con endpoint de test...');
      const response = await axios.get(`${API_BASE_URL}/sucursales-alerta-test`);
      console.log('✅ Test exitoso:', response.data);
      alert('✅ Conexión exitosa con el servidor!\nPuedes revisar la consola para más detalles.');
    } catch (err) {
      console.error('❌ Test falló:', err);
      alert('❌ Error en la conexión:\n' + (err.message || 'Error desconocido'));
    }
  };

  const obtenerPrioridad = (dias) => {
    if (dias >= 7) return { nivel: 'Crítica', color: 'bg-red-500', textColor: 'text-red-100' };
    if (dias >= 5) return { nivel: 'Alta', color: 'bg-orange-500', textColor: 'text-orange-100' };
    if (dias >= 3) return { nivel: 'Media', color: 'bg-yellow-500', textColor: 'text-yellow-100' };
    return { nivel: 'Baja', color: 'bg-blue-500', textColor: 'text-blue-100' };
  };

  const alertasFiltradas = alertas.filter(alerta => alerta.diasSinActividad <= filtro);

  const estadisticas = {
    critica: alertasFiltradas.filter(a => a.diasSinActividad >= 7).length,
    alta: alertasFiltradas.filter(a => a.diasSinActividad >= 5 && a.diasSinActividad < 7).length,
    media: alertasFiltradas.filter(a => a.diasSinActividad >= 3 && a.diasSinActividad < 5).length,
    baja: alertasFiltradas.filter(a => a.diasSinActividad >= 2 && a.diasSinActividad < 3).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando alertas...</div>
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
              onClick={cargarAlertas}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={probarConexion}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              🧪 Probar Conexión
            </button>
            <Link
              to="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              🏠 Volver al Home
            </Link>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            URL: {API_BASE_URL}/sucursales-alerta
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 mb-4">
              🚨 Alertas de Sucursales
            </h1>
            <p className="text-gray-300 text-lg">
              Monitoreo de sucursales con días sin cobros de procesadores válidos
            </p>
          </div>
        </div>

        {/* Controles */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <label className="text-white font-medium">
            Filtrar por días sin cobro:
          </label>
          <select
            value={filtro}
            onChange={(e) => setFiltro(Number(e.target.value))}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
          >
            <option value={2}>2 días</option>
            <option value={3}>3 días</option>
            <option value={5}>5 días</option>
            <option value={7}>7 días</option>
            <option value={15}>15 días</option>
            <option value={30}>30 días</option>
          </select>
          <button
            onClick={cargarAlertas}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
            <div className="text-red-400 text-sm font-medium">Crítica (≥7 días)</div>
            <div className="text-red-100 text-2xl font-bold">{estadisticas.critica}</div>
          </div>
          <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 rounded-xl p-4">
            <div className="text-orange-400 text-sm font-medium">Alta (5-6 días)</div>
            <div className="text-orange-100 text-2xl font-bold">{estadisticas.alta}</div>
          </div>
          <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4">
            <div className="text-yellow-400 text-sm font-medium">Media (3-4 días)</div>
            <div className="text-yellow-100 text-2xl font-bold">{estadisticas.media}</div>
          </div>
          <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-xl p-4">
            <div className="text-blue-400 text-sm font-medium">Baja (2 días)</div>
            <div className="text-blue-100 text-2xl font-bold">{estadisticas.baja}</div>
          </div>
        </div>

        {/* Lista de Alertas */}
        {alertasFiltradas.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
            <div className="text-gray-300 text-xl">
              ✅ No hay sucursales con alertas en el período seleccionado
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {alertasFiltradas
              .sort((a, b) => b.diasSinActividad - a.diasSinActividad)
              .map((alerta, index) => {
                const prioridad = obtenerPrioridad(alerta.diasSinActividad);
                return (
                  <div
                    key={`${alerta.Sucursal}-${index}`}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white text-xl font-bold mb-2">
                          🏢 {alerta.Sucursal}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Responsable:</span>
                            <span className="text-white ml-2">{alerta.nombre_slack}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Último procesador:</span>
                            <span className="text-white ml-2">{alerta.ultimo_procesador}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Último cobro:</span>
                            <span className="text-white ml-2">
                              {new Date(alerta.ultima_fecha).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Última venta:</span>
                            <span className="text-white ml-2">
                              {alerta.ultima_venta ? new Date(alerta.ultima_venta).toLocaleDateString() : 'Sin registro'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Días sin cobro:</span>
                            <span className="text-white ml-2 font-bold">{alerta.diasSinActividad} días</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`${prioridad.color} ${prioridad.textColor} px-3 py-1 rounded-full text-sm font-bold`}
                        >
                          {prioridad.nivel}
                        </span>
                        <button
                          onClick={() => cargarDetalleSucursal(alerta.Sucursal)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          📊 Ver Detalle
                        </button>
                        <div className="text-right">
                          <div className="text-white text-2xl font-bold">
                            {alerta.diasSinActividad}
                          </div>
                          <div className="text-gray-400 text-sm">
                            días sin cobro
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Resumen */}
        <div className="mt-8 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-white text-lg font-bold mb-2">📊 Resumen</h3>
          <p className="text-gray-300">
            Total de sucursales con alertas: <span className="text-white font-bold">{alertasFiltradas.length}</span>
          </p>
          <p className="text-gray-300">
            Filtro actual: Sucursales con <span className="text-white font-bold">{filtro} días o menos</span> sin cobro
          </p>
        </div>

        {/* Modal de Detalle de Sucursal */}
        {modalDetalle && (
          <div 
            className="fixed inset-0 z-[9999] overflow-y-auto"
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999
            }}
          >
            {/* Fondo del modal */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={cerrarModal}
            ></div>
            
            {/* Contenedor del modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <div 
                className="relative bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header del Modal */}
                <div className="bg-gray-800 border-b border-gray-600 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                      <span className="text-3xl">🏢</span>
                      Detalle de {modalDetalle.sucursal}
                    </h3>
                    <button 
                      onClick={cerrarModal}
                      className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg p-2 transition-all duration-200"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Controles de Fecha y Filtros */}
                  <div className="mb-4 bg-gray-700/30 rounded-lg p-4 space-y-4">
                    {/* Filtro de Estatus */}
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-gray-300 text-sm font-medium">📊 Mostrar:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => cambiarFiltroEstatus('vencidos')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            filtroEstatusModal === 'vencidos'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          🔴 Solo Vencidos
                        </button>
                        <button
                          onClick={() => cambiarFiltroEstatus('todos')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            filtroEstatusModal === 'todos'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          📊 Todos los Paquetes
                        </button>
                      </div>
                    </div>
                    
                    {/* Controles de Fecha */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm font-medium">📅 Período:</span>
                        {modalDetalle.periodo && modalDetalle.periodo.esUltimos90Dias ? (
                          <span className="text-blue-400 text-sm font-medium">Últimos 90 días</span>
                        ) : (
                          <span className="text-blue-400 text-sm font-medium">Personalizado</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-gray-300 text-sm">Desde:</label>
                        <input
                          type="date"
                          value={fechaInicioModal}
                          onChange={(e) => setFechaInicioModal(e.target.value)}
                          className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-gray-300 text-sm">Hasta:</label>
                        <input
                          type="date"
                          value={fechaFinModal}
                          onChange={(e) => setFechaFinModal(e.target.value)}
                          className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={aplicarFiltroFechas}
                          disabled={!fechaInicioModal || !fechaFinModal}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          🔍 Aplicar
                        </button>
                        <button
                          onClick={resetearFiltroFechas}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          🔄 Últimos 90 días
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Contenido del Modal - Área con scroll */}
                <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-6">
                  {/* Estadísticas Generales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                      <div className="text-blue-400 font-semibold text-lg">{modalDetalle.totales.totalPaquetes.toLocaleString()}</div>
                      <div className="text-blue-300 text-sm">Total Paquetes</div>
                    </div>
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                      <div className="text-red-400 font-semibold text-lg">{modalDetalle.totales.totalVencidos.toLocaleString()}</div>
                      <div className="text-red-300 text-sm">Vencidos ({modalDetalle.totales.porcentajeVencidos}%)</div>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                      <div className="text-green-400 font-semibold text-lg">{modalDetalle.totales.totalLiquidados.toLocaleString()}</div>
                      <div className="text-green-300 text-sm">Liquidados ({modalDetalle.totales.porcentajeLiquidados}%)</div>
                    </div>
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                      <div className="text-yellow-400 font-semibold text-lg">{modalDetalle.totales.totalCorriente.toLocaleString()}</div>
                      <div className="text-yellow-300 text-sm">Al Corriente ({modalDetalle.totales.porcentajeCorriente}%)</div>
                    </div>
                  </div>

                  {/* Sección: Tipo de Cobranza */}
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💳</span>
                      Tipo de Cobranza 
                      {modalDetalle.filtros && modalDetalle.filtros.soloVencidos ? (
                        <span className="text-red-400 text-sm">(Solo Paquetes Vencidos)</span>
                      ) : (
                        <span className="text-blue-400 text-sm">(Todos los Paquetes)</span>
                      )}
                    </h4>
                    
                    {modalDetalle.tipoCobranza.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {modalDetalle.tipoCobranza.map((tipo, index) => (
                          <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-300 font-medium">{tipo.tipo}</span>
                              <span className="text-blue-400 font-bold">{tipo.porcentaje}%</span>
                            </div>
                            <div className="text-gray-400 text-sm mb-2">
                              {tipo.cantidad.toLocaleString()} paquetes
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                                style={{width: `${tipo.porcentaje}%`}}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-4">
                        No hay datos de tipo de cobranza para el filtro seleccionado
                      </div>
                    )}
                  </div>

                  {/* Sección: Comentarios Frecuentes */}
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💬</span>
                      Comentarios Más Frecuentes
                      {modalDetalle.filtros && modalDetalle.filtros.soloVencidos ? (
                        <span className="text-red-400 text-sm">(Solo Paquetes Vencidos)</span>
                      ) : (
                        <span className="text-blue-400 text-sm">(Todos los Paquetes)</span>
                      )}
                    </h4>
                    
                    {modalDetalle.comentariosFrecuentes.length > 0 ? (
                      <div className="space-y-3">
                        {modalDetalle.comentariosFrecuentes.map((comentario, index) => (
                          <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-gray-300 font-medium flex-1 pr-4">
                                {comentario.comentario}
                              </span>
                              <div className="text-right">
                                <div className="text-yellow-400 font-bold">{comentario.porcentaje}%</div>
                                <div className="text-gray-400 text-sm">{comentario.frecuencia} veces</div>
                              </div>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-yellow-500 h-2 rounded-full transition-all duration-500" 
                                style={{width: `${comentario.porcentaje}%`}}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-4">
                        No hay comentarios registrados para el filtro seleccionado
                      </div>
                    )}
                  </div>

                  {/* Sección: Top Tarjetas Más Usadas */}
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💳</span>
                      Top Tarjetas Más Usadas
                      {modalDetalle.filtros && modalDetalle.filtros.soloVencidos ? (
                        <span className="text-red-400 text-sm">(Solo Paquetes Vencidos)</span>
                      ) : (
                        <span className="text-blue-400 text-sm">(Todos los Paquetes)</span>
                      )}
                    </h4>
                    
                    {modalDetalle.topTarjetas && modalDetalle.topTarjetas.length > 0 ? (
                      <div className="space-y-3">
                        {modalDetalle.topTarjetas.map((tarjeta, index) => (
                          <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-gray-300 font-medium text-lg">
                                    BIN: {tarjeta.bin || 'N/A'}
                                  </span>
                                  <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-sm font-medium">
                                    {tarjeta.banco || 'Banco no disponible'}
                                  </span>
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {(tarjeta.cantidadTransacciones || 0).toLocaleString()} paquetes
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-green-400 font-bold text-lg">{tarjeta.porcentaje || 0}%</div>
                                <div className="text-gray-400 text-xs">del total</div>
                              </div>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                                style={{width: `${tarjeta.porcentaje || 0}%`}}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-4">
                        {modalDetalle.topTarjetas === undefined ? 
                          'Los datos de tarjetas no están disponibles en la respuesta del servidor' :
                          'No hay datos de tarjetas para el filtro seleccionado'
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Modal para Detalle */}
        {loadingDetalle && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-blue-400 text-lg font-medium">Cargando detalle de sucursal...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}