import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Area, AreaChart, 
  Legend, RadialBarChart, RadialBar 
} from 'recharts';

// Utilidades para formateo
const formatCurrency = n => n?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0";

// Colores para las gráficas
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

export default function DashboardAclaraciones() {
  // Estados existentes
  const [anio, setAnio] = useState("");
  const [bloque, setBloque] = useState("");
  const [mes, setMes] = useState("");
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [anios, setAnios] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [vistaActual, setVistaActual] = useState('resumen'); // 'resumen', 'graficos', 'tablas'
  const [meses] = useState([
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ]);

  // Cargar opciones de filtros
  useEffect(() => {
    axios.get(`${API_BASE_URL}/anios`).then(r => setAnios(r.data.map(a => a.toString()))).catch(() => {});
    axios.get(`${API_BASE_URL}/aclaraciones/bloques`).then(r => setBloques(r.data)).catch(() => {});
  }, []);

  // Cargar dashboard
  useEffect(() => {
    setLoading(true);
    setError("");
    axios.get(`${API_BASE_URL}/aclaraciones/dashboard`, {
      params: { anio, bloque, mes }
    })
      .then(r => setResumen(r.data))
      .catch(e => setError(e?.response?.data?.error || "Error al cargar datos"))
      .finally(() => setLoading(false));
  }, [anio, bloque, mes]);

  // Preparar datos para gráficas
  const prepararDatosGraficas = () => {
    if (!resumen) return {};

    // Datos para gráfica de línea (aclaraciones por mes)
    const lineData = resumen.aclaracionesPorMes?.map(item => ({
      mes: item.mes,
      cantidad: item.cantidad,
      monto: parseFloat(item.monto || 0)
    })) || [];

    // Datos para gráfica de pie (estatus de documentación)
    const pieData = resumen.estatusDocumentacion?.map(item => ({
      name: item.comentario,
      value: item.cantidad,
      percentage: item.porcentaje
    })) || [];

    // Datos para gráfica de barras (top bloques)
    const barData = resumen.topBloques?.slice(0, 8).map(item => ({
      bloque: item.bloque,
      cantidad: item.cantidad
    })) || [];

    // Datos para gráfica de área (resolución por mes)
    const areaData = resumen.resolucionPorMes?.map(item => ({
      mes: item.mes,
      ganadas: parseInt(item.ganadas) || 0,
      perdidas: parseInt(item.perdidas) || 0,
      enProceso: parseInt(item.enProceso) || 0,
      montoEnDisputa: parseFloat(item.montoEnDisputa) || 0
    })) || [];

    // Datos para radial bar (métricas principales)
    const metricsData = [
      {
        name: 'Total Aclaraciones',
        value: resumen.total?.totalAclaraciones || 0,
        fill: '#8884d8'
      },
      {
        name: 'En Proceso',
        value: resumen.total?.aclaracionesEnProceso || 0,
        fill: '#82ca9d'
      },
      {
        name: 'Ganadas',
        value: resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseInt(curr.ganadas) || 0), 0) || 0,
        fill: '#ffc658'
      }
    ];

    return { lineData, pieData, barData, areaData, metricsData };
  };

  const { lineData, pieData, barData, areaData, metricsData } = prepararDatosGraficas();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10">
        
        {/* Header mejorado */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-100 drop-shadow-lg mb-2">
              💳 Dashboard de Aclaraciones
            </h1>
            <p className="text-gray-300 text-lg">
              Resumen y análisis de aclaraciones por filtros seleccionados
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Toggle de vistas */}
            <div className="bg-gray-800/50 rounded-xl p-1 flex gap-1">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'resumen' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setVistaActual('resumen')}
              >
                📊 Resumen
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'graficos' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setVistaActual('graficos')}
              >
                📈 Gráficos
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'tablas' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setVistaActual('tablas')}
              >
                📋 Tablas
              </button>
            </div>
            <button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
              onClick={() => window.location.href = "/"}
            >
              🏠 Home
            </button>
          </div>
        </div>

        {/* Filtros mejorados */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Año</label>
              <select 
                value={anio} 
                onChange={e => setAnio(e.target.value)} 
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Todos los años</option>
                {anios.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Bloque</label>
              <select 
                value={bloque} 
                onChange={e => setBloque(e.target.value)} 
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Todos los bloques</option>
                {bloques.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Mes</label>
              <select 
                value={mes} 
                onChange={e => setMes(e.target.value)} 
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Todos los meses</option>
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <p className="text-blue-400 mt-4">Cargando datos...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-center">
            {error}
          </div>
        )}

        {resumen && (
          <div className="space-y-8">
            
            {/* Vista Resumen */}
            {vistaActual === 'resumen' && (
              <>
                {/* Métricas principales mejoradas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-blue-400 text-2xl">💰</div>
                      <div className="text-xs text-gray-400 bg-blue-900/30 px-2 py-1 rounded-full">
                        Monto Total
                      </div>
                    </div>
                    <div className="text-blue-400 text-2xl font-bold mb-2">
                      {formatCurrency(resumen.total?.totalMontoEnDisputa || 0)}
                    </div>
                    <div className="text-gray-300 text-sm font-medium">En disputa</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '85%'}}></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-purple-400 text-2xl">📋</div>
                      <div className="text-xs text-gray-400 bg-purple-900/30 px-2 py-1 rounded-full">
                        Total
                      </div>
                    </div>
                    <div className="text-purple-400 text-2xl font-bold mb-2">
                      {resumen.total?.totalAclaraciones || 0}
                    </div>
                    <div className="text-gray-300 text-sm font-medium">Aclaraciones</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '70%'}}></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-green-400 text-2xl">✅</div>
                      <div className="text-xs text-gray-400 bg-green-900/30 px-2 py-1 rounded-full">
                        Exitosas
                      </div>
                    </div>
                    <div className="text-green-400 text-2xl font-bold mb-2">
                      {resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseInt(curr.ganadas) || 0), 0) || 0}
                    </div>
                    <div className="text-gray-300 text-sm font-medium">Ganadas</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '60%'}}></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-yellow-400 text-2xl">⏳</div>
                      <div className="text-xs text-gray-400 bg-yellow-900/30 px-2 py-1 rounded-full">
                        Pendientes
                      </div>
                    </div>
                    <div className="text-yellow-400 text-2xl font-bold mb-2">
                      {resumen.total?.aclaracionesEnProceso || 0}
                    </div>
                    <div className="text-gray-300 text-sm font-medium">En proceso</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>
                </div>

                {/* Gráficos resumen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfica de área - Resolución por mes */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                      <span className="mr-2">📈</span>
                      Resolución por Mes
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="mes" stroke="#D1D5DB" fontSize={12} />
                          <YAxis stroke="#D1D5DB" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB'
                            }} 
                          />
                          <Legend />
                          <Area type="monotone" dataKey="ganadas" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="perdidas" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="enProceso" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfica de pie - Estatus de documentación */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                      <span className="mr-2">🥧</span>
                      Estatus de Documentación
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name}: ${percentage}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Vista Gráficos */}
            {vistaActual === 'graficos' && (
              <div className="space-y-6">
                {/* Gráficas principales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfica de línea - Tendencia mensual */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4">📊 Tendencia de Aclaraciones</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="mes" stroke="#D1D5DB" />
                          <YAxis stroke="#D1D5DB" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }} 
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="cantidad" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                            name="Cantidad"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfica de barras - Top bloques */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4">🏢 Top Bloques</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="bloque" stroke="#D1D5DB" fontSize={12} />
                          <YAxis stroke="#D1D5DB" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }} 
                          />
                          <Bar dataKey="cantidad" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Gráfica radial - Métricas principales */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-semibold text-gray-100 mb-4">🎯 Métricas Principales</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={metricsData}>
                        <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                        <Legend />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }} 
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Vista Tablas mejoradas */}
            {vistaActual === 'tablas' && (
              <div className="space-y-8">
                
                {/* Tablas principales organizadas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Tabla: Aclaraciones por mes */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center">
                        <span className="mr-2">📅</span>
                        Aclaraciones por Mes
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900/60 border-b border-gray-700">
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Mes</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.aclaracionesPorMes?.map((row, i) => (
                            <tr key={row.mes} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-blue-900/30 transition-colors duration-200`}>
                              <td className="px-4 py-3 text-gray-100 font-medium">{row.mes}</td>
                              <td className="px-4 py-3">
                                <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.cantidad}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla: Estatus de documentación */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center">
                        <span className="mr-2">📄</span>
                        Estatus Documentación
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900/60 border-b border-gray-700">
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Comentario</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Cantidad</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.estatusDocumentacion?.map((row, i) => (
                            <tr key={row.comentario} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-purple-900/30 transition-colors duration-200`}>
                              <td className="px-4 py-3 text-gray-100 font-medium">{row.comentario}</td>
                              <td className="px-4 py-3">
                                <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.cantidad}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.porcentaje}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla: Vendedores con documentación incompleta */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center">
                        <span className="mr-2">⚠️</span>
                        Documentación Incompleta
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900/60 border-b border-gray-700">
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Vendedora</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.vendedoresIncompletos?.map((row, i) => (
                            <tr key={row.vendedora} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-red-900/30 transition-colors duration-200`}>
                              <td className="px-4 py-3 text-gray-100 font-medium">{row.vendedora}</td>
                              <td className="px-4 py-3">
                                <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.cantidad}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tablas detalladas - Top rankings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Tabla: Resolución por mes */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center">
                        <span className="mr-2">📊</span>
                        Resolución por Mes
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900/60 border-b border-gray-700">
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">Mes</th>
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">Ganadas</th>
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">Perdidas</th>
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">En Proceso</th>
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">Monto Disputa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.resolucionPorMes?.map((row, i) => (
                            <tr key={row.mes} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-indigo-900/30 transition-colors duration-200`}>
                              <td className="px-3 py-3 text-gray-100 font-medium">{row.mes}</td>
                              <td className="px-3 py-3">
                                <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.ganadas}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.perdidas}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.enProceso}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-blue-300 font-semibold text-xs">
                                {formatCurrency(row.montoEnDisputa)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla: Top sucursales que han perdido más dinero */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center">
                        <span className="mr-2">💸</span>
                        Top Pérdidas por Sucursal
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900/60 border-b border-gray-700">
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Sucursal</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-200">Monto Perdido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.topSucursalesPerdidas?.map((row, i) => (
                            <tr key={row.sucursal} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-red-900/30 transition-colors duration-200`}>
                              <td className="px-4 py-3 text-gray-100 font-medium">{row.sucursal}</td>
                              <td className="px-4 py-3 text-red-300 font-semibold">
                                {formatCurrency(row.monto_perdido)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tablas adicionales en acordeón */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { data: resumen.topBloques, title: "Top Bloques", key: "bloque", value: "cantidad", icon: "🏢", color: "blue" },
                    { data: resumen.topSucursales, title: "Top Sucursales", key: "sucursal", value: "cantidad", icon: "🏪", color: "green" },
                    { data: resumen.topVendedoras, title: "Top Vendedoras", key: "vendedora", value: "cantidad", icon: "👩‍💼", color: "purple" },
                    { data: resumen.topBloquesMonto, title: "Bloques por Monto", key: "bloque", value: "monto", icon: "💰", color: "yellow", isCurrency: true }
                  ].map((table, index) => (
                    <div key={index} className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className={`bg-gradient-to-r from-${table.color}-600 to-${table.color}-700 px-4 py-3`}>
                        <h3 className="font-semibold text-white text-sm flex items-center">
                          <span className="mr-2">{table.icon}</span>
                          {table.title}
                        </h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {table.data?.slice(0, 10).map((row, i) => (
                              <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-${table.color}-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-2 text-gray-100 font-medium">{row[table.key]}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className={`bg-${table.color}-600/20 text-${table.color}-300 px-2 py-1 rounded-full text-xs font-semibold`}>
                                    {table.isCurrency ? formatCurrency(row[table.value]) : row[table.value]}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
