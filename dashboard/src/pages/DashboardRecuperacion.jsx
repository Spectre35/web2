import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
import { formatearFecha, formatearFechasEnObjeto } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

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
  const [pendingRender, setPendingRender] = useState(false);
  const [showSucursales, setShowSucursales] = useState(false);
  const [showVendedoras, setShowVendedoras] = useState(false);
  // Agregar estado para modal
  const [modalVendedora, setModalVendedora] = useState(null);

  // Cargar bloques y sucursales
  useEffect(() => {
    axios.get(`${API_BASE_URL}/bloques`).then(res => setBloques(res.data.map(formatearFechasEnObjeto)));
  }, []);
  useEffect(() => {
    const params = {};
    if (bloque) params.bloque = bloque;
    axios.get(`${API_BASE_URL}/sucursales`, { params }).then(res => setSucursales(res.data.map(formatearFechasEnObjeto)));
    setSucursal("");
  }, [bloque]);

  // Cargar datos
  useEffect(() => {
    setLoading();
    setPendingRender(true);
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
      const arr = Array(12).fill(null).map((_, i) => {
        const row = resMes.data.find(r => Number(r.mes) === i + 1);
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
      setResumen(arr);
      setResumenSucursal(resSuc.data.map(formatearFechasEnObjeto));
      setResumenSucursalCompleto(resSucCompleto.data.map(formatearFechasEnObjeto));
      setResumenVendedora(resVend.data.map(formatearFechasEnObjeto));
    });
  }, [bloque, sucursal, fechaInicio, fechaFin]);

  // Elimina loading y pendingRender, y cualquier pantalla de carga
  useLayoutEffect(() => {
    if (!pendingRender) setLoading(false);
  }, [pendingRender, resumen, resumenSucursal, resumenSucursalCompleto, resumenVendedora]);

  const resumenPorMes = useMemo(() => {
    return resumen;
  }, [resumen]);

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 w-full border border-white/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-100 drop-shadow">
            📊 Dashboard de Recuperación
          </h1>
          <div className="flex gap-2">
            <Link
              to="/recuperacion"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              ← Ir a Tabla
            </Link>
          </div>
        </div>
        {/* Filtros */}
        <div className="bg-gray-800/50 p-6 rounded-xl mb-8 backdrop-blur-sm border border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">📊 Filtros del Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">Bloque:</label>
              <select className="w-full border border-gray-600 bg-gray-800/70 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={bloque} onChange={e => setBloque(e.target.value)}>
                <option value="">Todos los bloques</option>
                {bloques.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 font-medium mb-2">Sucursal:</label>
              <select
                className="w-full border border-gray-600 bg-gray-800/70 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            
            <div>
              <label className="block text-gray-300 font-medium mb-2">Fecha Inicio:</label>
              <input
                type="date"
                value={fechaInicio ? fechaInicio.toISOString().slice(0, 10) : ''}
                onChange={e => setFechaInicio(e.target.value ? new Date(e.target.value) : null)}
                className="w-full border border-gray-600 bg-gray-800/70 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                placeholder="Selecciona fecha inicio"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-gray-300 font-medium mb-2">Fecha Fin:</label>
              <input
                type="date"
                value={fechaFin ? fechaFin.toISOString().slice(0, 10) : ''}
                onChange={e => setFechaFin(e.target.value ? new Date(e.target.value) : null)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full border border-gray-600 bg-gray-800/70 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                placeholder="Selecciona fecha fin"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="relative">
          {/* Gráfica de línea: % recuperado por mes */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                📈 Cobranza mensual (% recuperado)
              </h2>
              <div className="text-sm text-gray-400">
                Tendencia de recuperación por mes
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
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
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="porcentajeRecuperado" name="% Recuperado" stroke="#22c55e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica de barras: Montos por mes */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                💰 Montos por mes
              </h2>
              <div className="text-sm text-gray-400">
                Comparativa de ventas vs recuperación
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resumenPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis
                    tickFormatter={v => v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })}
                  />
                  <Tooltip
                    formatter={v => v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })}
                  />
                  <Legend />
                  <Bar dataKey="ventasTotal" name="Ventas Totales" fill="#3b82f6" />
                  <Bar dataKey="totalPagado" name="Total Pagado" fill="#22c55e" />
                  <Bar dataKey="ventasAdeudo" name="Ventas con Adeudo" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

          {/* Pie chart: Estatus cobranza por sucursal */}
          {resumenSucursalCompleto.length > 0 && (
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                  📊 Estatus Cobranza
                </h2>
                <div className="text-sm text-gray-400">
                  Distribución por estatus de pago
                </div>
              </div>
              
              {/* Total de paquetes (suma de ventas) */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                <div className="text-gray-200 font-semibold text-lg text-center">
                  📦 Total de paquetes: {resumenSucursalCompleto.reduce((acc, s) => acc + (s.ventas || 0), 0).toLocaleString("es-MX")}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
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
                        // Total de paquetes para porcentaje
                        const totalPaquetes = resumenSucursalCompleto.reduce((acc, s) => acc + (s.ventas || 0), 0);
                        const porcentaje = totalPaquetes > 0 ? Math.round((value / totalPaquetes) * 100) : 0;
                        return `${name}: ${value} (${porcentaje}%)`;
                      }}
                      labelLine={false}
                    >
                      <Cell fill="#22c55e" /> {/* Al Corriente */}
                      <Cell fill="#facc15" /> {/* Liquidado */}
                      <Cell fill="#ef4444" /> {/* Vencido */}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Leyenda con porcentaje mejorada */}
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {(() => {
                  const pieData = getPieEstatusData(resumenSucursalCompleto);
                  const totalPaquetes = resumenSucursalCompleto.reduce((acc, s) => acc + (s.ventas || 0), 0);
                  return pieData.map((d, i) => {
                    const color = i === 0 ? "#22c55e" : i === 1 ? "#facc15" : "#ef4444";
                    const porcentaje = totalPaquetes > 0 ? Math.round((d.value / totalPaquetes) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-600/50">
                        <span className="inline-block w-4 h-4 mr-2 rounded-full shadow-sm" style={{ background: color }}></span>
                        <span className="text-gray-200 text-sm font-medium">{d.name} ({porcentaje}%)</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Ranking de Sucursales */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                🏪 Ranking de Sucursales
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
                <div className="mb-4 text-gray-400 text-sm">
                  📈 Porcentaje de recuperación por sucursal
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={Math.max(320, resumenSucursal.length * 32)}>
                    <BarChart
                      data={[...resumenSucursal].sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)}
                      layout="vertical"
                      barCategoryGap={8}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
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
                          background: "#222", 
                          color: "#fff", 
                          borderRadius: 8,
                          border: "1px solid #444"
                        }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            
                            return (
                              <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 shadow-lg max-w-sm">
                                <p className="text-gray-100 font-semibold mb-2 text-lg">{`${label}`}</p>
                                
                                {/* Información principal */}
                                <div className="mb-3">
                                  <p className="text-green-400 font-semibold">{`% Recuperado: ${data.porcentajeRecuperado}%`}</p>
                                  <p className="text-blue-400">{`Total Ventas: ${data.ventas?.toLocaleString() || 0}`}</p>
                                </div>

                                {/* Información financiera */}
                                <div className="mb-3 text-sm">
                                  <p className="text-yellow-400">{`Total Pagado: ${data.totalPagado?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}`}</p>
                                  <p className="text-purple-400">{`Ventas Total: ${data.ventasTotal?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}`}</p>
                                  <p className="text-red-400">{`Monto Vencido: ${data.montoVencido?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}`}</p>
                                  <p className="text-orange-400">{`Paquetes Vencidos: ${data.totalVencido?.toLocaleString() || 0}`}</p>
                                </div>
                                
                                {/* Información de estatus */}
                                <div className="border-t border-gray-600 pt-2">
                                  <p className="text-gray-300 font-semibold mb-1 text-sm">Estatus de Paquetes:</p>
                                  <div className="text-xs space-y-1">
                                    <p className="text-green-300">• Al Corriente: {data.alCorriente?.toLocaleString() || 0}</p>
                                    <p className="text-yellow-300">• Liquidado: {data.liquidado?.toLocaleString() || 0}</p>
                                    <p className="text-red-300">• Vencido: {data.vencido?.toLocaleString() || 0}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        }}
                      />
                      <Bar dataKey="porcentajeRecuperado" name="% Recuperado">
                        {
                          [...resumenSucursal]
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
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                👩‍💼 Ranking de Vendedoras
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
                <div className="mb-4 text-gray-400 text-sm">
                  📈 Porcentaje de recuperación por vendedora
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={Math.max(320, resumenVendedora.length * 32)}>
                    <BarChart
                      data={[...resumenVendedora].sort((a, b) => b.porcentajeRecuperado - a.porcentajeRecuperado)}
                      layout="vertical"
                      barCategoryGap={8}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
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
                        formatter={(value, name, props) => {
                          // ✅ AÑADIR información de ventas al tooltip
                          const ventasCount = props.payload?.ventas || 0;
                          return [
                            `${value}%`, 
                            "% Recuperado",
                            // Información adicional que aparecerá en el tooltip
                            `Ventas: ${ventasCount.toLocaleString()}`
                          ];
                        }}
                        labelFormatter={label => `Vendedora: ${label}`}
                        contentStyle={{ 
                          background: "#222", 
                          color: "#fff", 
                          borderRadius: 8,
                          border: "1px solid #444"
                        }}
                        // ✅ PERSONALIZAR el contenido completo del tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            
                            return (
                              <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 shadow-lg max-w-sm">
                                <p className="text-gray-100 font-semibold mb-2 text-lg">{`${label}`}</p>
                                
                                {/* Métricas principales */}
                                <div className="mb-3">
                                  <p className="text-green-400 font-semibold">{`% Recuperado: ${data.porcentajeRecuperado}%`}</p>
                                  <p className="text-blue-400">{`Total Ventas: ${data.ventas?.toLocaleString() || 0}`}</p>
                                </div>

                                {/* Información financiera */}
                                <div className="mb-3 text-sm">
                                  <p className="text-yellow-400">{`Total Pagado: ${data.totalPagado?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}`}</p>
                                  <p className="text-purple-400">{`Ventas Total: ${data.ventasTotal?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}`}</p>
                                  <p className="text-red-400">{`Monto Vencido: ${data.montoVencido?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}`}</p>
                                  <p className="text-orange-400">{`Paquetes Vencidos: ${data.totalVencido?.toLocaleString() || 0}`}</p>
                                </div>

                                {/* ✅ SECCIÓN LIMPIA: Ventas por Sucursal */}
                                {data.ventasPorSucursal && Array.isArray(data.ventasPorSucursal) && data.ventasPorSucursal.length > 0 && (
                                  <div className="border-t border-gray-600 pt-2">
                                    <p className="text-gray-300 font-semibold mb-1 text-sm">Ventas por Sucursal:</p>
                                    <div className="space-y-1">
                                      {data.ventasPorSucursal.slice(0, 5).map((sucursalInfo, index) => {
                                        if (typeof sucursalInfo !== 'string') return null;
                                        
                                        const [sucursal, cantidad] = sucursalInfo.split(': ');
                                        return (
                                          <p key={index} className="text-cyan-300 text-xs">
                                            • {sucursal}: <span className="font-semibold">{cantidad}</span> ventas
                                          </p>
                                        );
                                      })}
                                      {/* Mostrar "y X más" si hay más sucursales */}
                                      {data.ventasPorSucursal.length > 5 && (
                                        <p className="text-gray-400 text-xs italic">
                                          ... y {data.ventasPorSucursal.length - 5} sucursales más
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* ✅ FALLBACK: Si no hay ventasPorSucursal, mostrar sucursales normales */}
                                {(!data.ventasPorSucursal || data.ventasPorSucursal.length === 0) && data.sucursales && (
                                  <div className="border-t border-gray-600 pt-2">
                                    <p className="text-gray-300 font-semibold mb-1 text-sm">Sucursales:</p>
                                    <p className="text-cyan-300 text-xs">{data.sucursales}</p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="porcentajeRecuperado" 
                        name="% Recuperado"
                        onClick={(data) => setModalVendedora(data)} // ✅ Agregar onClick
                      >
                        {
                          [...resumenVendedora]
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

          </div>
        </div>
      </div>

      {/* Modal para mostrar información completa de vendedora */}
      {modalVendedora && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600/50 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                  👩‍💼 {modalVendedora.vendedora}
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
              {/* Métricas principales */}
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

              {/* Información financiera */}
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
                <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-2">💰 Información Financiera</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Pagado:</span>
                    <span className="text-yellow-400 font-medium">{modalVendedora.totalPagado?.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monto Vencido:</span>
                    <span className="text-red-400 font-medium">{modalVendedora.montoVencido?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paquetes Vencidos:</span>
                    <span className="text-orange-400 font-medium">{modalVendedora.totalVencido?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Ventas por sucursal */}
              {modalVendedora.ventasPorSucursal && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-2 mb-3">🏪 Ventas por Sucursal</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {modalVendedora.ventasPorSucursal.map((sucursalInfo, index) => {
                      const [sucursal, cantidad] = sucursalInfo.split(': ');
                      return (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="text-gray-400 text-sm">{sucursal}:</span>
                          <span className="text-cyan-300 font-medium text-sm">{cantidad} ventas</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}