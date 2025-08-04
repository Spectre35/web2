import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

// Función para convertir número de mes a nombre
const getMonthName = (mes) => {
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
                  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return months[mes - 1] || 'DESCONOCIDO';
};

export default function Home() {
  const [alertaSucursales, setAlertaSucursales] = useState([]);
  const [alertaProcesadores, setAlertaProcesadores] = useState([]);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState({
    totalAclaraciones: 0,
    totalRecuperacion: 0,
    totalCargosAuto: 0,
    totalCaja: 0
  });
  const [datosAclaraciones, setDatosAclaraciones] = useState([]);
  const [datosRecuperacion, setDatosRecuperacion] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = useCallback(async () => {
    setCargando(true);
    try {
      // Cargar alertas y datos de gráficos en paralelo
      const [sucursalesRes, procesadoresRes, estadisticasRes, aclaracionesRes, ventasRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/sucursales-alerta`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/cargos_auto/procesadores-alerta`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/estadisticas-generales`).catch(() => ({ 
          data: { totalAclaraciones: 0, totalRecuperacion: 0, totalCargosAuto: 0, totalCaja: 0 }
        })),
        axios.get(`${API_BASE_URL}/aclaraciones/dashboard`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/ventas/resumen?anio=2025`).catch(() => ({ data: [] }))
      ]);

      setAlertaSucursales(sucursalesRes.data || []);
      setAlertaProcesadores(procesadoresRes.data || []);
      setEstadisticasGenerales(estadisticasRes.data || {});
      
      // Procesar datos de aclaraciones para el gráfico
      if (aclaracionesRes.data && aclaracionesRes.data.aclaracionesPorMes) {
        setDatosAclaraciones(aclaracionesRes.data.aclaracionesPorMes);
      }
      
      // Datos reales de ventas mensuales 2025 para el gráfico de líneas
      const transformedData = (ventasRes.data || []).map(item => ({
        mes: getMonthName(item.mes),
        monto: item.totalpagado,
        porcentaje_recuperacion: parseFloat(((item.totalpagado / item.ventastotal) * 100).toFixed(2)),
        monto_total_vendido: item.ventastotal,
        cantidad: item.ventas,
        monto_vencido: item.ventasadeudo
      }));
      setDatosRecuperacion(transformedData);
      
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
    } finally {
      setCargando(false);
    }
  }, []);

  if (cargando) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando panel de control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header de bienvenida */}
        <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-100 drop-shadow">
                Panel de Control
              </h1>
            </div>
          </div>
        </div>

        {/* Grid de estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
          <Link 
            to="/aclaraciones"
            className="backdrop-blur-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Aclaraciones</p>
                <p className="text-2xl font-bold text-white">{estadisticasGenerales.totalAclaraciones?.toLocaleString() || '0'}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center group-hover:bg-blue-500/50 transition-colors">
                <span className="text-2xl">💳</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Alertas integradas - ARRIBA DE LOS GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Alerta de Sucursales */}
          <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🏢</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Sucursales sin Actividad</h3>
                  <p className="text-sm text-gray-400">Últimas sin cobros registrados</p>
                </div>
              </div>
              <Link 
                to="/sucursales-alerta"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg"
              >
                Ver Todo
              </Link>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {alertaSucursales.length > 0 ? (
                alertaSucursales.slice(0, 10).map((sucursal, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        sucursal.diasSinActividad >= 7 ? 'bg-red-500' :
                        sucursal.diasSinActividad >= 5 ? 'bg-orange-500' :
                        sucursal.diasSinActividad >= 3 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-200">{sucursal.Sucursal}</p>
                        <p className="text-sm text-gray-400">
                          {sucursal.diasSinActividad} día{sucursal.diasSinActividad !== 1 ? 's' : ''} sin actividad
                        </p>
                      </div>
                    </div>
                    {sucursal.ultimo_cobro && (
                      <span className="text-xs text-gray-500">
                        {formatearFecha(sucursal.ultimo_cobro)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">✅</span>
                  <p>Todas las sucursales tienen actividad reciente</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerta de Procesadores */}
          <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Procesadores con Baja Actividad</h3>
                  <p className="text-sm text-gray-400">Últimos 2 días sin transacciones</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {alertaProcesadores.length > 0 ? (
                alertaProcesadores.map((procesador, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-200">{procesador.Cobrado_Por}</p>
                        <p className="text-sm text-gray-400">
                          {procesador.monto_total !== undefined
                            ? `$${Number(procesador.monto_total).toLocaleString()}`
                            : "Sin datos"}
                        </p>
                      </div>
                    </div>
                    {procesador.ultima_fecha && (
                      <span className="text-xs text-gray-500">
                        {formatearFecha(procesador.ultima_fecha)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">✅</span>
                  <p>Todos los procesadores funcionan correctamente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gráficos Generales - DESPUÉS DE LAS ALERTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico de Aclaraciones */}
          <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Aclaraciones - Resumen Mensual</h3>
                <p className="text-sm text-gray-400">Tendencia de aclaraciones por mes</p>
              </div>
            </div>
            
            <div className="h-64 bg-gray-800/40 rounded-lg border border-gray-700/50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosAclaraciones} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="mes" 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value, name) => [
                      name === 'cantidad' ? value : `$${Number(value).toLocaleString()}`,
                      name === 'cantidad' ? 'Aclaraciones' : 'Monto'
                    ]}
                  />
                  <Bar dataKey="cantidad" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <Link 
                  to="/dashboard-aclaraciones"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  Ver Dashboard Completo →
                </Link>
              </div>
            </div>
          </div>

          {/* Gráfico de Recuperación */}
          <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Recuperación Mensual 2025</h3>
                <p className="text-sm text-gray-400">Porcentaje de cobranza efectiva por mes</p>
              </div>
            </div>
            
            <div className="h-64 bg-gray-800/40 rounded-lg border border-gray-700/50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosRecuperacion} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="mes" 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value, name) => {
                      if (name === 'monto') {
                        return [`$${Number(value).toLocaleString()}`, 'Monto Recuperado'];
                      } else if (name === 'porcentaje_recuperacion') {
                        return [`${value}%`, '% Recuperación'];
                      } else {
                        return [`$${Number(value).toLocaleString()}`, 'Monto Cobrado'];
                      }
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="monto" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    yAxisId="left"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="porcentaje_recuperacion" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, stroke: '#F59E0B', strokeWidth: 2 }}
                    yAxisId="right"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <div className="flex justify-center items-center gap-6 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-300">Cobranzas Efectivas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-300">% Recuperación</span>
                  </div>
                </div>
                <Link 
                  to="/dashboard-recuperacion"
                  className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                >
                  Ver Dashboard Recuperación →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Enlaces rápidos */}
        <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-xl">🚀</span>
            Accesos Rápidos
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link 
              to="/dashboard-aclaraciones"
              className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📈</span>
              <span className="text-sm text-gray-300 text-center">Dashboard Aclaraciones</span>
            </Link>

            <Link 
              to="/dashboard-recuperacion"
              className="flex flex-col items-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20 hover:border-green-400/40 transition-all duration-300 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</span>
              <span className="text-sm text-gray-300 text-center">Dashboard Recuperación</span>
            </Link>

            <Link 
              to="/vendedoras-status"
              className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">👩‍💼</span>
              <span className="text-sm text-gray-300 text-center">Vendedoras Status</span>
            </Link>

            <Link 
              to="/telefonos-duplicados"
              className="flex flex-col items-center p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg border border-yellow-500/20 hover:border-yellow-400/40 transition-all duration-300 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📱</span>
              <span className="text-sm text-gray-300 text-center">Teléfonos Duplicados</span>
            </Link>

            <Link 
              to="/tarjetas-duplicadas"
              className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">💳</span>
              <span className="text-sm text-gray-300 text-center">Tarjetas Duplicadas</span>
            </Link>

            <Link 
              to="/sucursal-bloque"
              className="flex flex-col items-center p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 rounded-lg border border-indigo-500/20 hover:border-indigo-400/40 transition-all duration-300 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏢</span>
              <span className="text-sm text-gray-300 text-center">Sucursal-Bloque</span>
            </Link>

            <Link 
              to="/panel"
              className="flex flex-col items-center p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg border border-red-500/20 hover:border-red-400/40 transition-all duration-300 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</span>
              <span className="text-sm text-gray-300 text-center">Panel Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}