import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function SucursalesAlerta() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState(7); // Por defecto, mostrar sucursales sin actividad por 7 días o menos

  useEffect(() => {
    cargarAlertas();
  }, []);

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
      </div>
    </div>
  );
}