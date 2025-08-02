import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { formatearFecha, formatearFechasEnObjeto } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

// Utilidades para formateo
function formatCurrency(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '$0.00';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const mesesES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const FECHA_INICIO_DEFAULT = new Date("2025-01-01");
const FECHA_FIN_DEFAULT = new Date();

const COLORS = [
  "#22c55e", "#facc15", "#ef4444", "#3b82f6", "#a21caf", "#f472b6", "#f59e42", "#0ea5e9", "#6366f1", "#16a34a",
  "#eab308", "#dc2626", "#7c3aed", "#f43f5e", "#14b8a6", "#fbbf24", "#ea580c", "#64748b", "#84cc16", "#e11d48"
];

function getPieEstatusData(resumenSucursal) {
  let alCorriente = 0, liquidado = 0, vencido = 0;
  resumenSucursal.forEach(s => {
    alCorriente += Number(s.alCorriente ?? s.al_corriente ?? 0);
    liquidado += Number(s.liquidado ?? 0);
    vencido += Number(s.vencido ?? 0);
  });
  return [
    { name: "Al Corriente", value: alCorriente },
    { name: "Liquidado", value: liquidado },
    { name: "Vencido", value: vencido }
  ];
}

export default function DashboardRecuperacion() {
  const [bloques, setBloques] = useState([]);
  const [bloque, setBloque] = useState("");
  const [sucursales, setSucursales] = useState([]);
  const [sucursal, setSucursal] = useState("");
  const [resumen, setResumen] = useState([]);
  const [resumenSucursal, setResumenSucursal] = useState([]);
  const [resumenSucursalCompleto, setResumenSucursalCompleto] = useState([]);
  const [resumenVendedora, setResumenVendedora] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(FECHA_INICIO_DEFAULT);
  const [fechaFin, setFechaFin] = useState(FECHA_FIN_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [showSucursales, setShowSucursales] = useState(false);
  const [showVendedoras, setShowVendedoras] = useState(false);
  const [modalVendedora, setModalVendedora] = useState(null);
  const [vistaActual, setVistaActual] = useState('graficos'); // 'graficos', 'tablas'
  
  // Estados para ordenamiento (para vista tablas)
  const [sortVendedora, setSortVendedora] = useState({ column: 'porcentajeRecuperado', direction: 'asc' });
  const [sortSucursal, setSortSucursal] = useState({ column: 'porcentajeRecuperado', direction: 'asc' });

  // Función para manejar ordenamiento
  const handleSort = (column, tableType) => {
    if (tableType === 'vendedora') {
      const newDirection = sortVendedora.column === column && sortVendedora.direction === 'desc' ? 'asc' : 'desc';
      setSortVendedora({ column, direction: newDirection });
    } else if (tableType === 'sucursal') {
      const newDirection = sortSucursal.column === column && sortSucursal.direction === 'desc' ? 'asc' : 'desc';
      setSortSucursal({ column, direction: newDirection });
    }
  };

  // Función para ordenar datos
  const sortData = (data, sortConfig) => {
    if (!sortConfig.column) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.column];
      let bVal = b[sortConfig.column];
      
      // Convertir a números si es necesario
      if (typeof aVal === 'string' && !isNaN(Number(aVal))) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      
      // Para strings, convertir a minúsculas para comparación
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Función para renderizar icono de ordenamiento
  const renderSortIcon = (column, sortConfig) => {
    if (sortConfig.column !== column) {
      return <span className="text-gray-500 ml-1">⏶⏷</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-blue-400 ml-1">⏶</span> : 
      <span className="text-blue-400 ml-1">⏷</span>;
  };

  // Cargar bloques y sucursales
  useEffect(() => {
    axios.get(`${API_BASE_URL}/bloques`).then(res => setBloques(res.data));
  }, []);

  useEffect(() => {
    const params = {};
    if (bloque) params.bloque = bloque;
    axios.get(`${API_BASE_URL}/sucursales`, { params }).then(res => setSucursales(res.data));
    setSucursal("");
  }, [bloque]);

  // Cargar datos con optimización
  const cargarDatos = useCallback(() => {
    setLoading(true);
    const params = {};
    if (bloque) params.bloque = bloque;
    if (sucursal) params.sucursal = sucursal;
    if (fechaInicio) params.fecha_inicio = fechaInicio.toISOString().slice(0, 10);
    if (fechaFin) params.fecha_fin = fechaFin.toISOString().slice(0, 10);

    Promise.all([
      axios.get(`${API_BASE_URL}/ventas/resumen`, { params }),
      axios.get(`${API_BASE_URL}/ventas/resumen-sucursal`, { params }),
      axios.get(`${API_BASE_URL}/ventas/resumen-sucursal-completo`, { params }),
      axios.get(`${API_BASE_URL}/ventas/resumen-vendedora`, { params }),
    ]).then(([resMes, resSuc, resSucCompleto, resVend]) => {
      console.log('📊 DEBUG - Datos recibidos:', {
        parametros: params,
        resumenMensual: resMes.data,
        cantidadRegistros: resMes.data.length,
        primerosRegistros: resMes.data.slice(0, 3)
      });
      
      // Usar directamente los datos de la API como en Recuperacion.jsx
      setResumen(resMes.data.map(formatearFechasEnObjeto));
      setResumenSucursal(resSuc.data.map(formatearFechasEnObjeto));
      setResumenSucursalCompleto(resSucCompleto.data.map(formatearFechasEnObjeto));
      setResumenVendedora(resVend.data.map(formatearFechasEnObjeto));
      setLoading(false);
    }).catch((error) => {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    });
  }, [bloque, sucursal, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Memoización para mejorar rendimiento
  const resumenPorMes = useMemo(() => {
    // Usar la misma lógica que resumenPorMesTabla para los gráficos
    const resultado = Array(12).fill(null).map((_, i) => {
      const row = resumen.find(r => Number(r.mes) === i + 1);
      return {
        mes: mesesES[i],
        ventas: row ? Number(row.ventas) : 0,
        ventasAdeudo: row ? Number(row.ventasadeudo) : 0,
        cantidadPagada: row ? Number(row.cantidadpagada) : 0,
        anticipo: row ? Number(row.anticipo) : 0,
        totalPagado: row ? Number(row.totalpagado) : 0,
        ventasTotal: row ? Number(row.ventastotal) : 0,
        porcentajeRecuperado: row && row.ventastotal > 0
          ? Math.round((Number(row.totalpagado) / Number(row.ventastotal)) * 100)
          : 0
      };
    });
    
    console.log('📈 DEBUG - Datos para gráficos:', {
      resumenOriginal: resumen.length,
      resumenProcesado: resultado.filter(r => r.ventasTotal > 0).length,
      mesesConDatos: resultado.filter(r => r.ventasTotal > 0).map(r => r.mes)
    });
    
    return resultado;
  }, [resumen]);
  
  const metricas = useMemo(() => {
    console.log('🎯 DEBUG - Calculando métricas:', {
      resumenSucursalCompleto: resumenSucursalCompleto.length,
      resumenVendedora: resumenVendedora.length,
      primerosRegistrosSucursal: resumenSucursalCompleto.slice(0, 2),
      primerosRegistrosVendedora: resumenVendedora.slice(0, 2)
    });
    
    if (!resumen.length) {
      console.log('❌ No hay datos de resumen mensual disponibles para métricas');
      return null;
    }
    
    console.log('📊 Usando datos de resumen mensual para métricas (fuente más confiable)');
    
    // Calcular totales desde el resumen mensual (fuente más confiable)
    let totalPaquetes = resumen.reduce((acc, r) => acc + (Number(r.ventas) || 0), 0);
    if (resumenSucursalCompleto.length > 0) {
      totalPaquetes = resumenSucursalCompleto.reduce((acc, s) => acc + (Number(s.ventas) || 0), 0);
      console.log('� Total paquetes desde resumenSucursalCompleto:', totalPaquetes);
    } else {
      // Fallback a resumenVendedora
      totalPaquetes = resumenVendedora.reduce((acc, v) => acc + (Number(v.ventas) || 0), 0);
      console.log('📦 Total paquetes desde resumenVendedora (fallback):', totalPaquetes);
    }
    
    // Para montos: usar resumenVendedora que tiene totalPagado y ventasTotal
    const totalPagado = resumen.reduce((acc, r) => acc + (Number(r.totalpagado) || 0), 0);
    const totalVentasTotal = resumen.reduce((acc, r) => acc + (Number(r.ventastotal) || 0), 0);
    const porcentajeRecuperado = totalVentasTotal > 0 ? Math.round((totalPagado / totalVentasTotal) * 100) : 0;
    
    console.log('� Total paquetes desde resumen mensual:', totalPaquetes);
    console.log('�💰 Montos calculados desde resumen mensual:', { totalPagado, totalVentasTotal, porcentajeRecuperado });
    
    const resultado = {
      totalPaquetes,
      totalPagado,
      totalVentasTotal,
      porcentajeRecuperado
    };
    
    console.log('💡 Métricas finales:', resultado);
    
    // Validar que hay datos válidos
    if (totalPaquetes === 0 && totalPagado === 0 && totalVentasTotal === 0) {
      console.warn('⚠️ Todas las métricas son 0, posible problema con filtros o datos');
      return null;
    }
    
    return resultado;
  }, [resumen, resumenVendedora, resumenSucursalCompleto]);

  // Preparar datos para tabla mensual (igual que en Recuperacion.jsx)
  const resumenPorMesTabla = useMemo(() => {
    return Array(12).fill(null).map((_, i) => {
      const row = resumen.find(r => Number(r.mes) === i + 1);
      return {
        mes: mesesES[i],
        ventas: row ? Number(row.ventas) : 0,
        ventasAdeudo: row ? Number(row.ventasadeudo) : 0,
        cantidadPagada: row ? Number(row.cantidadpagada) : 0,
        anticipo: row ? Number(row.anticipo) : 0,
        totalPagado: row ? Number(row.totalpagado) : 0,
        ventasTotal: row ? Number(row.ventastotal) : 0,
        porcentajeRecuperado: row && row.ventastotal > 0
          ? Math.round((Number(row.totalpagado) / Number(row.ventastotal)) * 100)
          : 0
      };
    });
  }, [resumen]);

  const formatoMoneda = monto =>
    Number(monto).toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ">
      <div className="max-w-full mx-auto">
        {/* Header mejorado */}
        <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center gap-3">
                <span className="text-4xl">💰</span>
                Dashboard de Recuperación
              </h1>
              <p className="text-gray-400">Análisis completo de cobranza y recuperación</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/recuperacion"
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <span>📊</span>
                Ir a Tabla
              </Link>
            </div>
          </div>
        </div>

        {/* Selector de vista */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'graficos', label: '📊 Dashboard Gráfico', icon: '📊' },
              { key: 'tablas', label: '📋 Tabla Completa', icon: '📋' }
            ].map(vista => (
              <button
                key={vista.key}
                onClick={() => setVistaActual(vista.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  vistaActual === vista.key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <span>{vista.icon}</span>
                {vista.label}
              </button>
            ))}
          </div>
        </div>
        {/* Filtros mejorados */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <span className="text-xl">�</span>
            Filtros del Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Bloque</label>
              <select 
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={bloque} 
                onChange={e => setBloque(e.target.value)}
                disabled={loading}
              >
                <option value="">Todos los bloques</option>
                {bloques.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Sucursal</label>
              <select
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={sucursal}
                onChange={e => setSucursal(e.target.value)}
                disabled={loading}
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map(suc => (
                  <option key={suc} value={suc}>{suc}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio ? fechaInicio.toISOString().slice(0, 10) : ''}
                onChange={e => setFechaInicio(e.target.value ? new Date(e.target.value) : null)}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                disabled={loading}
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin ? fechaFin.toISOString().slice(0, 10) : ''}
                onChange={e => setFechaFin(e.target.value ? new Date(e.target.value) : null)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Loading state mejorado */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-blue-400 text-lg font-medium">Cargando datos del dashboard...</p>
          </div>
        )}

        {/* Contenido principal */}
        {!loading && (
          <div className="space-y-8">
            
            {/* Vista Gráficos - Incluye métricas, gráficos y rankings */}
            {vistaActual === 'graficos' && (
              <>
                {/* Métricas principales */}
                {metricas ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-green-400 text-3xl">💰</div>
                        <div className="text-xs text-gray-400 bg-green-900/30 px-2 py-1 rounded-full">
                          Porcentaje
                        </div>
                      </div>
                      <div className="text-green-400 text-2xl font-bold mb-2">
                        {metricas.porcentajeRecuperado}%
                      </div>
                      <div className="text-gray-300 text-sm font-medium">Recuperación Total</div>
                      <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                        <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{width: `${metricas.porcentajeRecuperado}%`}}></div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-blue-400 text-3xl">📦</div>
                        <div className="text-xs text-gray-400 bg-blue-900/30 px-2 py-1 rounded-full">
                          Paquetes
                        </div>
                      </div>
                      <div className="text-blue-400 text-2xl font-bold mb-2">
                        {metricas.totalPaquetes.toLocaleString()}
                      </div>
                      <div className="text-gray-300 text-sm font-medium">Total Ventas</div>
                      <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '85%'}}></div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-yellow-400 text-3xl">💵</div>
                        <div className="text-xs text-gray-400 bg-yellow-900/30 px-2 py-1 rounded-full">
                          Monto
                        </div>
                      </div>
                      <div className="text-yellow-400 text-xl font-bold mb-2">
                        {formatCurrency(metricas.totalPagado)}
                      </div>
                      <div className="text-gray-300 text-sm font-medium">Total Pagado</div>
                      <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: '78%'}}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-yellow-400 text-2xl">⚠️</span>
                      <h3 className="text-yellow-300 font-semibold text-lg">Sin datos de métricas</h3>
                    </div>
                    <p className="text-yellow-200 text-sm">
                      No se pudieron cargar las métricas principales. Esto puede deberse a:
                    </p>
                    <ul className="text-yellow-200 text-xs mt-2 ml-4 space-y-1">
                      <li>• No hay datos para el rango de fechas seleccionado</li>
                      <li>• Los filtros aplicados no devuelven resultados</li>
                      <li>• Problema de conexión con la base de datos</li>
                    </ul>
                    <div className="mt-3 text-xs text-yellow-300">
                      📊 Debug: Datos cargados: {resumenSucursalCompleto.length} sucursales completas, {resumenVendedora.length} vendedoras
                      <br />
                      📋 Primer registro sucursal: {resumenSucursalCompleto.length > 0 ? JSON.stringify(Object.keys(resumenSucursalCompleto[0])) : 'No hay datos'}
                      <br />
                      📋 Primer registro vendedora: {resumenVendedora.length > 0 ? JSON.stringify(Object.keys(resumenVendedora[0])) : 'No hay datos'}
                    </div>
                  </div>
                )}
                {/* Gráfica de línea: % recuperado por mes */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                      <span className="text-2xl">📈</span>
                      Cobranza mensual (% recuperado)
                    </h2>
                    <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
                      Tendencia de recuperación por mes
                    </div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={resumenPorMes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="mes" 
                          fontSize={12} 
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={v => `${v}%`} 
                          fontSize={12}
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="porcentajeRecuperado" 
                          name="% Recuperado" 
                          stroke="#22c55e" 
                          strokeWidth={3}
                          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfica de barras: Montos por mes */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      Montos por mes
                    </h2>
                    <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
                      Comparativa de ventas vs recuperación
                    </div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={resumenPorMes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="mes" fontSize={12} tick={{ fill: '#9CA3AF' }} />
                        <YAxis
                          tickFormatter={v => formatCurrency(v)}
                          fontSize={12}
                          tick={{ fill: '#9CA3AF' }}
                        />
                        <Tooltip
                          formatter={v => formatCurrency(v)}
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="ventasTotal" name="Ventas Totales" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="totalPagado" name="Total Pagado" fill="#22c55e" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="ventasAdeudo" name="Ventas con Adeudo" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie chart: Estatus cobranza */}
                {resumenSucursalCompleto.length > 0 && (
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        Estatus Cobranza
                      </h2>
                      <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
                        Distribución por estatus de pago
                      </div>
                    </div>
                    
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                      <div className="text-gray-200 font-semibold text-lg text-center">
                        📦 Total de paquetes: {metricas?.totalPaquetes.toLocaleString("es-MX") || 0}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={getPieEstatusData(resumenSucursalCompleto)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label={({ name, value }) => {
                              const totalPaquetes = metricas?.totalPaquetes || 0;
                              const porcentaje = totalPaquetes > 0 ? Math.round((value / totalPaquetes) * 100) : 0;
                              return `${name}: ${value} (${porcentaje}%)`;
                            }}
                            labelLine={false}
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill="#facc15" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-4 justify-center">
                      {getPieEstatusData(resumenSucursalCompleto).map((d, i) => {
                        const color = i === 0 ? "#22c55e" : i === 1 ? "#facc15" : "#ef4444";
                        const totalPaquetes = metricas?.totalPaquetes || 0;
                        const porcentaje = totalPaquetes > 0 ? Math.round((d.value / totalPaquetes) * 100) : 0;
                        return (
                          <div key={d.name} className="flex items-center bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-600/50">
                            <span className="inline-block w-4 h-4 mr-2 rounded-full shadow-sm" style={{ background: color }}></span>
                            <span className="text-gray-200 text-sm font-medium">{d.name} ({porcentaje}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ranking de Sucursales */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                      <span className="text-2xl">🏪</span>
                      Ranking de Sucursales
                    </h2>
                    <button
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      onClick={() => setShowSucursales(v => !v)}
                    >
                      {showSucursales ? "Ocultar" : "Mostrar"} Ranking
                    </button>
                  </div>
                  
                  {showSucursales && resumenSucursal.length > 0 && (
                    <div>
                      <div className="mb-4 text-gray-400 text-sm bg-gray-800/30 p-3 rounded-lg">
                        📈 Porcentaje de recuperación por sucursal
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={Math.max(320, resumenSucursal.length * 32)}>
                          <BarChart
                            data={[...resumenSucursal].sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)}
                            layout="vertical"
                            barCategoryGap={8}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                            <YAxis
                              type="category"
                              dataKey="sucursal"
                              width={220}
                              tick={{
                                fontSize: 12,
                                fill: "#fff",
                                wordBreak: "break-all",
                                lineHeight: 1.1,
                              }}
                            />
                            <Tooltip
                              formatter={(value) => [`${value}%`, "Recuperado"]}
                              labelFormatter={label => `Sucursal: ${label}`}
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151',
                                borderRadius: '8px'
                              }}
                            />
                            <Bar dataKey="porcentajeRecuperado" name="% Recuperado">
                              {[...resumenSucursal]
                                .sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)
                                .map((s, i) => {
                                  let color = "#dc2626";
                                  if (s.porcentajeRecuperado >= 61) color = "#22c55e";
                                  else if (s.porcentajeRecuperado >= 51) color = "#bbf7d0";
                                  else if (s.porcentajeRecuperado >= 36) color = "#facc15";
                                  return <Cell key={i} fill={color} />;
                                })
                              }
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ranking de Vendedoras */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                      <span className="text-2xl">👩‍💼</span>
                      Ranking de Vendedoras
                    </h2>
                    <button
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      onClick={() => setShowVendedoras(v => !v)}
                    >
                      {showVendedoras ? "Ocultar" : "Mostrar"} Ranking
                    </button>
                  </div>
                  
                  {showVendedoras && resumenVendedora.length > 0 && (
                    <div>
                      <div className="mb-4 text-gray-400 text-sm bg-gray-800/30 p-3 rounded-lg">
                        📈 Porcentaje de recuperación por vendedora
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={Math.max(320, resumenVendedora.length * 32)}>
                          <BarChart
                            data={[...resumenVendedora].sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)}
                            layout="vertical"
                            barCategoryGap={8}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                            <YAxis
                              type="category"
                              dataKey="vendedora"
                              width={220}
                              tick={{
                                fontSize: 12,
                                fill: "#fff",
                                wordBreak: "break-all",
                                lineHeight: 1.1,
                              }}
                            />
                            <Tooltip
                              formatter={(value) => [`${value}%`, "% Recuperado"]}
                              labelFormatter={label => `Vendedora: ${label}`}
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151',
                                borderRadius: '8px'
                              }}
                            />
                            <Bar 
                              dataKey="porcentajeRecuperado" 
                              name="% Recuperado"
                              onClick={(data) => setModalVendedora(data)}
                            >
                              {[...resumenVendedora]
                                .sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)
                                .map((v, i) => {
                                  let color = "#dc2626";
                                  if (v.porcentajeRecuperado >= 61) color = "#22c55e";
                                  else if (v.porcentajeRecuperado >= 51) color = "#65a30d";
                                  else if (v.porcentajeRecuperado >= 36) color = "#eab308";
                                  return <Cell key={i} fill={color} />;
                                })
                              }
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Vista Tablas - Página completa de recuperación */}
            {vistaActual === 'tablas' && (
              <>
                {/* Nota informativa */}
                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-300 text-sm flex items-center gap-2">
                    ⚠️ Todos los montos están convertidos a pesos mexicanos (MXN)
                  </p>
                </div>
                
                {/* Tabla principal de recuperación por mes */}
                <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 w-full" style={{ position: 'relative', zIndex: '1' }}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                      📊 Recuperación por Mes
                    </h2>
                    <div className="text-sm text-gray-400">
                      Resumen mensual de ventas y recuperación
                    </div>
                  </div>
                  
                  {/* Debug info */}
                  {resumen.length === 0 && (
                    <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-yellow-300 text-sm flex items-center gap-2">
                        ⚠️ No hay datos de resumen mensual disponibles. Verifica los filtros aplicados.
                      </p>
                      <p className="text-yellow-300 text-xs mt-2">
                        Datos cargados: Resumen={resumen.length}, Sucursales={resumenSucursal.length}, Vendedoras={resumenVendedora.length}
                      </p>
                    </div>
                  )}
                  
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-full bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl table-fixed">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-left">
                          <th className="w-[12%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">
                            📅 Mes
                          </th>
                          <th className="w-[10%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">
                            📦 Ventas
                          </th>
                          <th className="w-[13%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">
                            💳 Con Adeudo
                          </th>
                          <th className="w-[13%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">
                            💰 Cant. Pagada
                          </th>
                          <th className="w-[12%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">
                            🏦 Anticipo
                          </th>
                          <th className="w-[13%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">
                            ✅ Total Pagado
                          </th>
                          <th className="w-[13%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">
                            💵 $ Ventas
                          </th>
                          <th className="w-[14%] p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide">
                            📈 % Recuperado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenPorMesTabla.map((m, i) => {
                          const hasData = m.ventas > 0 || m.ventasTotal > 0 || m.totalPagado > 0;
                          return (
                            <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'} hover:bg-gray-600/30 transition-colors duration-200 ${hasData ? 'opacity-100' : 'opacity-60'}`}>
                              <td className="p-3 text-gray-100 font-medium border-r border-gray-600/20 text-sm">
                                {m.mes}
                              </td>
                              <td className="p-3 text-gray-200 border-r border-gray-600/20 text-center">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${hasData ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-600/20 text-gray-400'}`}>
                                  {m.ventas.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-3 text-gray-200 border-r border-gray-600/20 text-right">
                                <span className={`font-medium text-xs ${hasData ? 'text-orange-300' : 'text-gray-400'}`}>
                                  {formatoMoneda(m.ventasAdeudo)}
                                </span>
                              </td>
                              <td className="p-3 text-gray-200 border-r border-gray-600/20 text-right">
                                <span className={`font-medium text-xs ${hasData ? 'text-green-300' : 'text-gray-400'}`}>
                                  {formatoMoneda(m.cantidadPagada)}
                                </span>
                              </td>
                              <td className="p-3 text-gray-200 border-r border-gray-600/20 text-right">
                                <span className={`font-medium text-xs ${hasData ? 'text-purple-300' : 'text-gray-400'}`}>
                                  {formatoMoneda(m.anticipo)}
                                </span>
                              </td>
                              <td className="p-3 text-gray-200 border-r border-gray-600/20 text-right">
                                <span className={`font-semibold text-xs ${hasData ? 'text-cyan-300' : 'text-gray-400'}`}>
                                  {formatoMoneda(m.totalPagado)}
                                </span>
                              </td>
                              <td className="p-3 text-gray-200 border-r border-gray-600/20 text-right">
                                <span className={`font-semibold text-xs ${hasData ? 'text-yellow-300' : 'text-gray-400'}`}>
                                  {formatoMoneda(m.ventasTotal)}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-center">
                                {m.ventasTotal > 0 ? (
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    m.porcentajeRecuperado >= 70 ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                    m.porcentajeRecuperado >= 50 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                    'bg-red-500/20 text-red-300 border border-red-500/30'
                                  }`}>
                                    {m.porcentajeRecuperado}%
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grid para tablas lado a lado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Tabla Vendedora */}
                  <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 min-w-[420px] table-container" style={{ position: 'relative', zIndex: '1' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 min-w-[340px]">
                      <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2 whitespace-normal break-words min-w-[220px]">
                        👩‍💼 Recuperación por Vendedora
                      </h2>
                      <div className="text-sm text-gray-400 mt-2 sm:mt-0">
                        MXN
                      </div>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className="min-w-[700px] w-full bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl text-xs" style={{ transform: 'scale(0.9)', transformOrigin: 'top left' }}>
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-left">
                            <th 
                              className="p-1 min-w-[80px] text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30 cursor-pointer hover:bg-gray-600/30 transition-colors whitespace-normal break-words"
                              onClick={() => handleSort('vendedora', 'vendedora')}
                            >
                              <div className="flex items-center">
                                Vendedora
                                {renderSortIcon('vendedora', sortVendedora)}
                              </div>
                            </th>
                            <th 
                              className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30 cursor-pointer hover:bg-gray-600/30 transition-colors"
                              onClick={() => handleSort('ventas', 'vendedora')}
                            >
                              <div className="flex items-center">
                                # Ventas
                                {renderSortIcon('ventas', sortVendedora)}
                              </div>
                            </th>
                            <th 
                              className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30 cursor-pointer hover:bg-gray-600/30 transition-colors"
                              onClick={() => handleSort('ventasAdeudo', 'vendedora')}
                            >
                              <div className="flex items-center">
                                Con Adeudo
                                {renderSortIcon('ventasAdeudo', sortVendedora)}
                              </div>
                            </th>
                            <th 
                              className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30 cursor-pointer hover:bg-gray-600/30 transition-colors"
                              onClick={() => handleSort('cantidadPagada', 'vendedora')}
                            >
                              <div className="flex items-center">
                                Cant. Pagada
                                {renderSortIcon('cantidadPagada', sortVendedora)}
                              </div>
                            </th>
                            <th 
                              className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30 cursor-pointer hover:bg-gray-600/30 transition-colors"
                              onClick={() => handleSort('anticipo', 'vendedora')}
                            >
                              <div className="flex items-center">
                                Anticipo
                                {renderSortIcon('anticipo', sortVendedora)}
                              </div>
                            </th>
                            <th 
                              className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30 cursor-pointer hover:bg-gray-600/30 transition-colors"
                              onClick={() => handleSort('totalPagado', 'vendedora')}
                            >
                              <div className="flex items-center">
                                Total Pagado
                                {renderSortIcon('totalPagado', sortVendedora)}
                              </div>
                            </th>
                            <th 
                              className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30 cursor-pointer hover:bg-gray-600/30 transition-colors"
                              onClick={() => handleSort('ventasTotal', 'vendedora')}
                            >
                              <div className="flex items-center">
                                $ Ventas
                                {renderSortIcon('ventasTotal', sortVendedora)}
                              </div>
                            </th>
                            <th 
                              className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-600/30 transition-colors"
                              onClick={() => handleSort('porcentajeRecuperado', 'vendedora')}
                            >
                              <div className="flex items-center">
                                % Recuperado
                                {renderSortIcon('porcentajeRecuperado', sortVendedora)}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortData(resumenVendedora, sortVendedora)
                            .map((v, i) => {
                              let color = "bg-red-600 text-white";
                              if (v.porcentajeRecuperado >= 61) color = "bg-green-600 text-white";
                              else if (v.porcentajeRecuperado >= 51) color = "bg-green-300 text-gray-900";
                              else if (v.porcentajeRecuperado >= 36) color = "bg-yellow-400 text-gray-900";
                              return (
                                <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'} hover:bg-gray-600/30 transition-colors duration-200`}>
                                  <td className="p-1 text-gray-200 font-medium border-r border-gray-600/20 text-xs whitespace-normal break-words">
                                    <div className="max-w-[120px] whitespace-normal break-words" title={v.vendedora}>
                                      {v.vendedora}
                                    </div>
                                  </td>
                                  <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                                      {v.ventas}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                                    <span className="text-orange-300 font-medium">
                                      {formatoMoneda(v.ventasAdeudo)}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                                    <span className="text-green-300 font-medium">
                                      {formatoMoneda(v.cantidadPagada)}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                                    <span className="text-purple-300 font-medium">
                                      {formatoMoneda(v.anticipo)}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                                    <span className="text-cyan-300 font-semibold">
                                      {formatoMoneda(v.totalPagado)}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                                    <span className="text-yellow-300 font-semibold">
                                      {formatoMoneda(v.ventasTotal)}
                                    </span>
                                  </td>
                                  <td className={`p-1 font-bold border-r border-gray-600/20 text-xs ${color} rounded-md text-center`}>
                                    <span className="text-xs">{v.ventasTotal ? `${v.porcentajeRecuperado}%` : "-"}</span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla Sucursal */}
                  {resumenSucursal.length > 0 && (
                    <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 min-w-[420px] table-container" style={{ position: 'relative', zIndex: '1' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 min-w-[340px]">
                        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2 whitespace-normal break-words min-w-[220px]">
                          🏢 Recuperación por Sucursal
                        </h2>
                        <div className="text-sm text-gray-400 mt-2 sm:mt-0">
                          MXN
                        </div>
                      </div>
                      <div className="w-full overflow-x-auto">
                      <table className="min-w-[700px] w-full bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl text-xs" style={{ transform: 'scale(0.9)', transformOrigin: 'top left' }}>
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-left">
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[12%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('sucursal', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Sucursal
                                  {renderSortIcon('sucursal', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[8%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('alCorriente', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Corriente
                                  {renderSortIcon('alCorriente', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[8%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('liquidado', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Liquid.
                                  {renderSortIcon('liquidado', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[8%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('vencido', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Venc.
                                  {renderSortIcon('vencido', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[12%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('ventasAdeudo', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Adeudo
                                  {renderSortIcon('ventasAdeudo', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[12%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('cantidadPagada', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Pagado
                                  {renderSortIcon('cantidadPagada', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[10%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('anticipo', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Anticipo
                                  {renderSortIcon('anticipo', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[12%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('totalPagado', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Total $
                                  {renderSortIcon('totalPagado', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight border-r border-gray-600/30 w-[12%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('ventasTotal', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  Ventas $
                                  {renderSortIcon('ventasTotal', sortSucursal)}
                                </div>
                              </th>
                              <th 
                                className="p-2 text-gray-100 font-semibold text-xs uppercase tracking-tight w-[6%] cursor-pointer hover:bg-gray-600/30 transition-colors"
                                onClick={() => handleSort('porcentajeRecuperado', 'sucursal')}
                              >
                                <div className="flex items-center">
                                  %
                                  {renderSortIcon('porcentajeRecuperado', sortSucursal)}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortData(resumenSucursal, sortSucursal)
                              .map((s, i) => {
                                let color = "bg-red-600 text-white";
                                if (s.porcentajeRecuperado >= 61) color = "bg-green-600 text-white";
                                else if (s.porcentajeRecuperado >= 51) color = "bg-green-300 text-gray-900";
                                else if (s.porcentajeRecuperado >= 36) color = "bg-yellow-400 text-gray-900";
                                
                                return (
                                  <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'} hover:bg-gray-600/30 transition-colors duration-200`}>
                                    <td className="p-1 text-gray-200 font-medium border-r border-gray-600/20 text-xs whitespace-normal break-words">
                                      <div className="max-w-[100px] whitespace-normal break-words" title={s.sucursal}>
                                        {s.sucursal}
                                      </div>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-center">
                                      <span className="bg-green-500/20 text-green-300 px-1 py-0.5 rounded text-xs">
                                        {s.alCorriente}
                                      </span>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-center">
                                      <span className="bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded text-xs">
                                        {s.liquidado}
                                      </span>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-center">
                                      <span className="bg-red-500/20 text-red-300 px-1 py-0.5 rounded text-xs">
                                        {s.vencido}
                                      </span>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-right">
                                      <span className="text-orange-300 font-medium" title={formatoMoneda(s.ventasAdeudo)}>
                                        {formatoMoneda(s.ventasAdeudo)}
                                      </span>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-right">
                                      <span className="text-green-300 font-medium" title={formatoMoneda(s.cantidadPagada)}>
                                        {formatoMoneda(s.cantidadPagada)}
                                      </span>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-right">
                                      <span className="text-purple-300 font-medium" title={formatoMoneda(s.anticipo)}>
                                        {formatoMoneda(s.anticipo)}
                                      </span>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-right">
                                      <span className="text-cyan-300 font-semibold" title={formatoMoneda(s.totalPagado)}>
                                        {formatoMoneda(s.totalPagado)}
                                      </span>
                                    </td>
                                    <td className="p-2 text-gray-200 border-r border-gray-600/20 text-xs text-right">
                                      <span className="text-yellow-300 font-semibold" title={formatoMoneda(s.ventasTotal)}>
                                        {formatoMoneda(s.ventasTotal)}
                                      </span>
                                    </td>
                                    <td className={`p-2 font-bold text-xs ${color} rounded-md text-center`}>
                                      {s.ventasTotal ? `${s.porcentajeRecuperado}%` : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal para vendedora */}
        {modalVendedora && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600/50 p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                    <span className="text-2xl">👩‍💼</span>
                    {modalVendedora.vendedora}
                  </h3>
                  <button 
                    onClick={() => setModalVendedora(null)}
                    className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg p-2 transition-all duration-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-3">
                    <div className="text-green-400 font-semibold text-lg">{modalVendedora.porcentajeRecuperado}%</div>
                    <div className="text-green-300 text-sm">Recuperado</div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                    <div className="text-blue-400 font-semibold text-lg">{modalVendedora.ventas?.toLocaleString()}</div>
                    <div className="text-blue-300 text-sm">Total Ventas</div>
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
                  <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-2">💰 Información Financiera</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Pagado:</span>
                      <span className="text-yellow-400 font-medium">{formatCurrency(modalVendedora.totalPagado)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monto Vencido:</span>
                      <span className="text-red-400 font-medium">{formatCurrency(modalVendedora.montoVencido) || "$0"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Paquetes Vencidos:</span>
                      <span className="text-orange-400 font-medium">{modalVendedora.totalVencido?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}