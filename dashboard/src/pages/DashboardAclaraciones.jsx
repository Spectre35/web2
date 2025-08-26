import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Area, AreaChart, 
  Legend, RadialBarChart, RadialBar 
} from 'recharts';

// Utilidades para formateo
function formatCurrency(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '$0.00';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// Colores para las gráficas
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

export default function DashboardAclaraciones() {
  // Estados existentes
  const [anio, setAnio] = useState("2025");
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

  // 💱 ESTADOS PARA MODAL DE CONVERSIÓN DE MONEDA
  const [modalConversion, setModalConversion] = useState(false);
  const [anioConversion, setAnioConversion] = useState("");
  const [procesandoConversion, setProcesandoConversion] = useState(false);
  const [progresoConversion, setProgresoConversion] = useState({ procesados: 0, total: 0 });
  const [resultadoConversion, setResultadoConversion] = useState(null);


  // Cargar opciones de filtros
  useEffect(() => {
    axios.get(`${API_BASE_URL}/aclaraciones/anios`).then(r => setAnios(r.data.map(a => a.toString()))).catch(() => {});
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

  // 💱 FUNCIÓN PARA CONVERTIR MONEDA
  const convertirMoneda = async () => {
    if (!anioConversion) {
      alert("Por favor selecciona un año");
      return;
    }

    if (!confirm(`¿Estás seguro de convertir todas las aclaraciones del año ${anioConversion} a moneda MXN? Esta acción actualizará la columna monto_mnx en la base de datos.`)) {
      return;
    }

    setProcesandoConversion(true);
    setProgresoConversion({ procesados: 0, total: 0 });
    setResultadoConversion(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/aclaraciones/convertir-moneda`, {
        anio: anioConversion
      });

      setResultadoConversion(response.data);
      setProgresoConversion({ 
        procesados: response.data.registrosActualizados, 
        total: response.data.registrosEncontrados 
      });
    } catch (error) {
      console.error('Error al convertir moneda:', error);
      alert('Error al convertir moneda: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcesandoConversion(false);
    }
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
            
            {/* 💱 Botón de Conversión de Moneda */}
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all flex items-center gap-2"
              onClick={() => setModalConversion(true)}
            >
              💱 Convertir Moneda
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
                    <div className="text-green-400 text-2xl font-bold mb-2 flex flex-col">
                      <span>{resumen.total?.aclaracionesGanadas || 0} ganadas</span>
                      <span className="text-lg text-green-300 font-semibold">{formatCurrency(resumen.total?.montoGanado || 0)}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-medium">Ganadas y cantidad ganada</div>
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
                    <div className="text-yellow-400 text-2xl font-bold mb-2 flex flex-col">
                      <span>{resumen.total?.aclaracionesEnProceso || 0} en proceso</span>
                      <span className="text-lg text-yellow-300 font-semibold">{formatCurrency(resumen.total?.totalMontoEnDisputa || 0)}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-medium">En proceso y monto en disputa</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>

                  {/* Tarjeta de Perdidas */}
                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-red-400 text-2xl">❌</div>
                      <div className="text-xs text-gray-400 bg-red-900/30 px-2 py-1 rounded-full">
                        Perdidas
                      </div>
                    </div>
                    <div className="text-red-400 text-2xl font-bold mb-2 flex flex-col">
                      <span>{resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseInt(curr.perdidas) || 0), 0) || 0} perdidas</span>
                      <span className="text-lg text-red-300 font-semibold">{formatCurrency(resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseFloat(curr.montoPerdido) || 0), 0) || 0)}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-medium">Perdidas y monto perdido</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-red-500 h-2 rounded-full" style={{width: '30%'}}></div>
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
              </div>
            )}

            {/* Vista Tablas mejoradas - Organizadas por categorías */}
            {vistaActual === 'tablas' && (
              <div className="space-y-12">
                
                {/* GRUPO 1: ANÁLISIS TEMPORAL - Tablas por Mes */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">📅</span>
                    Análisis Temporal por Mes
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cantidad de aclaraciones por mes */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">📊</span>
                          Aclaraciones por Mes
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Mes</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.aclaracionesPorMes?.map((row, i) => (
                              <tr key={row.mes} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-blue-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.mes}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center text-blue-300 font-semibold text-xs">
                                  {formatCurrency(row.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Desglose de resolución por mes */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">📈</span>
                          Resolución Detallada por Mes
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-2 py-3 text-left font-semibold text-gray-200">Mes</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Ganadas</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Perdidas</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">En Proceso</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Monto Disputa</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Monto Defendido</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Monto Perdido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.resolucionPorMes?.map((row, i) => (
                              <tr key={row.mes} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-indigo-900/30 transition-colors duration-200`}>
                                <td className="px-2 py-3 text-gray-100 font-medium">{row.mes}</td>
                                <td className="px-2 py-3 text-center">
                                  <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded-full text-xs font-semibold">
                                    {row.ganadas}
                                  </span>
                                </td>
                                <td className="px-2 py-3 text-center">
                                  <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded-full text-xs font-semibold">
                                    {row.perdidas}
                                  </span>
                                </td>
                                <td className="px-2 py-3 text-center">
                                  <span className="bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-semibold">
                                    {row.enProceso}
                                  </span>
                                </td>
                                <td className="px-2 py-3 text-center text-blue-300 font-semibold text-xs">
                                  {formatCurrency(row.montoEnDisputa)}
                                </td>
                                <td className="px-2 py-3 text-green-300 font-semibold text-xs">
                                  {formatCurrency(row.montoDefendido)}
                                </td>
                                <td className="px-2 py-3 text-red-300 font-semibold text-xs">
                                  {formatCurrency(row.montoPerdido)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 2: ANÁLISIS POR BLOQUES */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">🏢</span>
                    Análisis por Bloques
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top 10 bloques por aclaración */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">🏢</span>
                          Top 10 Bloques por Aclaración
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Bloque</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topBloques?.slice(0, 10).map((row, i) => (
                              <tr key={row.bloque} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-blue-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.bloque}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top 10 bloques por monto */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">💰</span>
                          Top 10 Bloques por Monto
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Bloque</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topBloquesMonto?.slice(0, 10).map((row, i) => (
                              <tr key={row.bloque} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-yellow-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.bloque}</td>
                                <td className="px-4 py-3 text-center text-yellow-300 font-semibold text-xs">
                                  {formatCurrency(row.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 3: ANÁLISIS POR SUCURSALES */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">🏪</span>
                    Análisis por Sucursales
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top 10 sucursales por aclaración */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">🏪</span>
                          Top 10 Sucursales por Aclaración
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Sucursal</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topSucursales?.slice(0, 10).map((row, i) => (
                              <tr key={row.sucursal} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-green-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.sucursal}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className="bg-green-600/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top 10 sucursales por monto */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">💵</span>
                          Top 10 Sucursales por Monto
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Sucursal</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topSucursalesMonto?.slice(0, 10).map((row, i) => (
                              <tr key={row.sucursal} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-cyan-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.sucursal}</td>
                                <td className="px-3 py-3 text-center text-cyan-300 font-semibold text-xs">
                                  {formatCurrency(row.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sucursales con más pérdidas */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">💸</span>
                          Sucursales con Más Pérdidas
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Sucursal</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Monto Perdido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topSucursalesPerdidas?.slice(0, 10).map((row, i) => (
                              <tr key={row.sucursal} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-red-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.sucursal}</td>
                                <td className="px-3 py-3 text-center text-red-300 font-semibold text-xs">
                                  {formatCurrency(row.monto_perdido)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 4: ANÁLISIS POR VENDEDORAS */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">👩‍💼</span>
                    Análisis por Vendedoras
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top 10 vendedoras por aclaración */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">👩‍💼</span>
                          Top 10 Vendedoras por Aclaración
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Vendedora</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topVendedoras?.slice(0, 10).map((row, i) => (
                              <tr key={row.vendedora} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-purple-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.vendedora}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top 10 vendedoras por aclaración y monto */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-pink-600 to-pink-700 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center">
                        <span className="mr-2">💎</span>
                        Top 10 Vendedoras por Monto
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-900/80">
                          <tr className="border-b border-gray-700">
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">Vendedora</th>
                            <th className="px-3 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            <th className="px-3 py-3 text-center font-semibold text-gray-200">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.topVendedorasMonto?.slice(0, 10).map((row, i) => (
                            <tr key={row.vendedora} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-pink-900/30 transition-colors duration-200`}>
                              <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                              <td className="px-3 py-3 text-gray-100 font-medium">{row.vendedora}</td>
                              <td className="px-3 py-3 text-center">
                                <span className="bg-pink-600/20 text-pink-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.cantidad}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center text-pink-300 font-semibold text-xs">
                                {formatCurrency(row.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                    {/* Vendedoras con documentación incompleta */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">⚠️</span>
                          Documentación Incompleta
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Vendedora</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Incompletas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.vendedoresIncompletos?.slice(0, 10).map((row, i) => (
                              <tr key={row.vendedora} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-orange-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.vendedora}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full text-xs font-semibold">
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
                </div>

                {/* GRUPO 5: ANÁLISIS DE ESTATUS Y RESOLUCIÓN */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">📋</span>
                    Análisis de Estatus y Resolución
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Estatus de documentación */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">📄</span>
                          Estatus de Documentación
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Estatus</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Porcentaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.estatusDocumentacion?.map((row, i) => (
                              <tr key={row.comentario} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-teal-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.comentario}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-teal-600/20 text-teal-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-green-600/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.porcentaje}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tabla de ganadas, perdidas, en proceso */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">⚖️</span>
                          Resumen de Resolución
                        </h3>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex justify-between items-center p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-green-400 text-xl mr-3">✅</span>
                              <span className="text-gray-100 font-medium">Ganadas</span>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">{resumen.total?.aclaracionesGanadas || 0}</div>
                              <div className="text-green-300 text-sm">{formatCurrency(resumen.total?.montoGanado || 0)}</div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-red-400 text-xl mr-3">❌</span>
                              <span className="text-gray-100 font-medium">Perdidas</span>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400 font-bold text-lg">
                                {resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseInt(curr.perdidas) || 0), 0) || 0}
                              </div>
                              <div className="text-red-300 text-sm">
                                {formatCurrency(resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseFloat(curr.montoPerdido) || 0), 0) || 0)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-yellow-400 text-xl mr-3">⏳</span>
                              <span className="text-gray-100 font-medium">En Proceso</span>
                            </div>
                            <div className="text-right">
                              <div className="text-yellow-400 font-bold text-lg">{resumen.total?.aclaracionesEnProceso || 0}</div>
                              <div className="text-yellow-300 text-sm">{formatCurrency(resumen.total?.totalMontoEnDisputa || 0)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 💱 MODAL DE CONVERSIÓN DE MONEDA */}
      {modalConversion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                💱 Convertir Moneda a MXN
              </h3>
              <button
                onClick={() => setModalConversion(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Seleccionar Año para Conversión
                </label>
                <select
                  value={anioConversion}
                  onChange={(e) => setAnioConversion(e.target.value)}
                  className="w-full border border-gray-600 bg-gray-700 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={procesandoConversion}
                >
                  <option value="">Selecciona un año</option>
                  {anios.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>ℹ️ Información:</strong><br/>
                  Esta acción convertirá todos los montos de aclaraciones del año seleccionado a pesos mexicanos (MXN) basándose en el bloque y guardará el resultado en la columna <code>monto_mnx</code>.
                </p>
              </div>

              {procesandoConversion && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400"></div>
                    <span className="text-gray-300">Procesando conversiones...</span>
                  </div>
                  {progresoConversion.total > 0 && (
                    <div className="text-sm text-gray-400">
                      Procesados: {progresoConversion.procesados} de {progresoConversion.total}
                    </div>
                  )}
                </div>
              )}

              {resultadoConversion && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-300 font-semibold mb-2">✅ Conversión Completada</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>• Registros encontrados: <span className="text-green-400">{resultadoConversion.registrosEncontrados}</span></p>
                    <p>• Registros actualizados: <span className="text-green-400">{resultadoConversion.registrosActualizados}</span></p>
                    {resultadoConversion.detallesPorBloque && (
                      <div className="mt-2">
                        <p className="font-medium">Detalles por bloque:</p>
                        {Object.entries(resultadoConversion.detallesPorBloque).map(([bloque, datos]) => (
                          <p key={bloque} className="ml-2 text-xs">
                            {bloque}: {datos.registros} registros - Factor: {datos.factor}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setModalConversion(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  disabled={procesandoConversion}
                >
                  Cancelar
                </button>
                <button
                  onClick={convertirMoneda}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={procesandoConversion || !anioConversion}
                >
                  {procesandoConversion ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      💱 Convertir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
