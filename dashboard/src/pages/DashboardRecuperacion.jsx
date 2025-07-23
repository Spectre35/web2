import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatearFecha, formatearFechasEnObjeto } from "../utils/dateUtils";

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
    axios.get("http://192.168.1.111:3000/bloques").then(res => setBloques(res.data.map(formatearFechasEnObjeto)));
  }, []);
  useEffect(() => {
    const params = {};
    if (bloque) params.bloque = bloque;
    axios.get("http://192.168.1.111:3000/sucursales", { params }).then(res => setSucursales(res.data.map(formatearFechasEnObjeto)));
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
      axios.get("http://192.168.1.111:3000/ventas/resumen", { params }),
      axios.get("http://192.168.1.111:3000/ventas/resumen-sucursal", { params }),
      axios.get("http://192.168.1.111:3000/ventas/resumen-sucursal-completo", { params }),
      axios.get("http://192.168.1.111:3000/ventas/resumen-vendedora", { params }),
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
              to="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              🏠 Ir al Home
            </Link>
            <Link
              to="/recuperacion"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              ← Volver a Tabla
            </Link>
          </div>
        </div>
        {/* Filtros */}
        <div className="mb-4 flex gap-4 items-center flex-wrap">
          <label className="text-gray-200 font-semibold">Bloque:</label>
          <select className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded"
            value={bloque} onChange={e => setBloque(e.target.value)}>
            <option value="">Todos</option>
            {bloques.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label className="text-gray-200 font-semibold">Sucursal:</label>
          <select
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded"
            value={sucursal}
            onChange={e => setSucursal(e.target.value)}
            disabled={loading}
          >
            <option value="">Todas</option>
            {sucursales.map(suc => (
              <option key={suc} value={suc}>{suc}</option>
            ))}
          </select>
          <label className="text-gray-200 font-semibold">Fecha Inicio:</label>
          <DatePicker
            selected={fechaInicio}
            onChange={date => setFechaInicio(date)}
            dateFormat="yyyy-MM-dd"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded"
            placeholderText="Selecciona fecha inicio"
            disabled={loading}
          />
          <label className="text-gray-200 font-semibold">Fecha Fin:</label>
          <DatePicker
            selected={fechaFin}
            onChange={date => setFechaFin(date)}
            dateFormat="yyyy-MM-dd"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded"
            placeholderText="Selecciona fecha fin"
            maxDate={new Date()}
            disabled={loading}
          />
        </div>

        <div className={"relative"}>
          <div className="relative">
            {/* Gráfica de línea: % recuperado por mes */}
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-2 text-gray-100">Cobranza mensual (% recuperado)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={resumenPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="porcentajeRecuperado" name="% Recuperado" stroke="#22c55e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica de barras: Montos por mes */}
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-2 text-gray-100">Montos por mes</h2>
              <ResponsiveContainer width="100%" height={250}>
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
              <div className="mb-10">
                <h2 className="text-lg font-bold mb-2 text-gray-100">Estatus Cobranza</h2>
                {/* Total de paquetes (suma de ventas) */}
                <div className="mb-2 text-gray-200 font-semibold text-base">
                  Total de paquetes: {resumenSucursalCompleto.reduce((acc, s) => acc + (s.ventas || 0), 0).toLocaleString("es-MX")}
                </div>
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
                {/* Leyenda con porcentaje */}
                <div className="flex flex-wrap gap-4 mt-2 justify-center">
                  {(() => {
                    const pieData = getPieEstatusData(resumenSucursalCompleto);
                    const totalPaquetes = resumenSucursalCompleto.reduce((acc, s) => acc + (s.ventas || 0), 0);
                    return pieData.map((d, i) => {
                      const color = i === 0 ? "#22c55e" : i === 1 ? "#facc15" : "#ef4444";
                      const porcentaje = totalPaquetes > 0 ? Math.round((d.value / totalPaquetes) * 100) : 0;
                      return (
                        <span key={d.name} className="flex items-center text-xs">
                          <span className="inline-block w-3 h-3 mr-1 rounded" style={{ background: color }}></span>
                          {d.name} ({porcentaje}%)
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Botón para mostrar/ocultar Ranking de Sucursales */}
            <div className="mb-4">
              <button
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded transition"
                onClick={() => setShowSucursales(v => !v)}
              >
                {showSucursales ? "Ocultar" : "Mostrar"} Ranking de Sucursales
              </button>
            </div>
            {showSucursales && resumenSucursal.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-bold mb-2 text-gray-100">Ranking de Sucursales (% Recuperado)</h2>
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
            )}

            {/* Botón para mostrar/ocultar Ranking de Vendedoras */}
            <div className="mb-4">
              <button
                className="bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded transition"
                onClick={() => setShowVendedoras(v => !v)}
              >
                {showVendedoras ? "Ocultar" : "Mostrar"} Ranking de Vendedoras
              </button>
            </div>
            {showVendedoras && resumenVendedora.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-bold mb-2 text-gray-100">Ranking de Vendedoras (% Recuperado)</h2>
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
            )}

          </div>
        </div>
      </div>

      {/* ✅ Modal para mostrar información completa */}
      {modalVendedora && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 shadow-xl max-w-md max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">{modalVendedora.vendedora}</h3>
              <button 
                onClick={() => setModalVendedora(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-green-400">% Recuperado: {modalVendedora.porcentajeRecuperado}%</p>
              <p className="text-blue-400">Total Ventas: {modalVendedora.ventas?.toLocaleString()}</p>
              <p className="text-yellow-400">Total Pagado: {modalVendedora.totalPagado?.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
              <p className="text-red-400">Monto Vencido: {modalVendedora.montoVencido?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0"}</p>
              <p className="text-orange-400">Paquetes Vencidos: {modalVendedora.totalVencido?.toLocaleString() || 0}</p>
              
              {modalVendedora.ventasPorSucursal && (
                <div className="border-t border-gray-600 pt-3">
                  <p className="text-gray-300 font-semibold mb-2">Ventas por Sucursal:</p>
                  {modalVendedora.ventasPorSucursal.map((sucursalInfo, index) => {
                    const [sucursal, cantidad] = sucursalInfo.split(': ');
                    return (
                      <p key={index} className="text-cyan-300 text-sm">
                        • {sucursal}: {cantidad} ventas
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}