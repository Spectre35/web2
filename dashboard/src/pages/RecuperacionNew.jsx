import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatearFecha, formatearFechasEnObjeto } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

const mesesES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const FECHA_INICIO_DEFAULT = new Date("2025-01-01");
const FECHA_FIN_DEFAULT = new Date(); // hoy

export default function Recuperacion() {
  const [resumen, setResumen] = useState([]);
  const [anios, setAnios] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [bloque, setBloque] = useState("");
  const [sucursales, setSucursales] = useState([]);
  const [sucursal, setSucursal] = useState("");
  const [resumenVendedora, setResumenVendedora] = useState([]);
  const [resumenSucursal, setResumenSucursal] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(FECHA_INICIO_DEFAULT);
  const [fechaFin, setFechaFin] = useState(FECHA_FIN_DEFAULT);

  // Cargar años y bloques únicos solo una vez
  useEffect(() => {
    axios.get(`${API_BASE_URL}/anios`).then(res => setAnios(res.data.map(formatearFechasEnObjeto)));
    axios.get(`${API_BASE_URL}/bloques`).then(res => setBloques(res.data.map(formatearFechasEnObjeto)));
  }, []);

  // Cargar sucursales cada vez que cambian bloque o año
  useEffect(() => {
    const params = {};
    if (bloque) params.bloque = bloque;
    // Eliminar año de los parámetros
    axios.get(`${API_BASE_URL}/sucursales`, { params }).then(res => setSucursales(res.data.map(formatearFechasEnObjeto)));
    setSucursal(""); // Limpia sucursal al cambiar bloque o año
  }, [bloque]);

  // Cargar el resumen cada vez que cambian los filtros
  useEffect(() => {
    const params = {};
    // Eliminar año de los parámetros
    if (bloque) params.bloque = bloque;
    if (sucursal) params.sucursal = sucursal;
    if (fechaInicio) params.fecha_inicio = fechaInicio.toISOString().slice(0, 10); // <--- así
    if (fechaFin) params.fecha_fin = fechaFin.toISOString().slice(0, 10);         // <--- así
    axios.get(`${API_BASE_URL}/ventas/resumen`, { params }).then(res => {
      setResumen(res.data.map(formatearFechasEnObjeto));
    });
  }, [bloque, sucursal, fechaInicio, fechaFin]);

  // Cargar el resumen por vendedora cada vez que cambian los filtros
  useEffect(() => {
    const params = {};
    // Eliminar año de los parámetros
    if (bloque) params.bloque = bloque;
    if (sucursal) params.sucursal = sucursal;
    if (fechaInicio) params.fecha_inicio = fechaInicio.toISOString().slice(0, 10); // <--- así
    if (fechaFin) params.fecha_fin = fechaFin.toISOString().slice(0, 10);         // <--- así
    axios.get(`${API_BASE_URL}/ventas/resumen-vendedora`, { params }).then(res => {
      setResumenVendedora(res.data.map(formatearFechasEnObjeto));
    });
  }, [bloque, sucursal, fechaInicio, fechaFin]);

  // Cargar el resumen por sucursal cada vez que cambian los filtros
  useEffect(() => {
    const params = {};
    // Eliminar año de los parámetros
    if (bloque) params.bloque = bloque;
    if (sucursal) params.sucursal = sucursal;
    if (fechaInicio) params.fecha_inicio = fechaInicio.toISOString().slice(0, 10); // <--- así
    if (fechaFin) params.fecha_fin = fechaFin.toISOString().slice(0, 10);         // <--- así
    axios.get(`${API_BASE_URL}/ventas/resumen-sucursal`, { params }).then(res => {
      setResumenSucursal(res.data.map(formatearFechasEnObjeto));
    });
  }, [bloque, sucursal, fechaInicio, fechaFin]);

  // Prepara los datos para mostrar los 12 meses siempre
  const resumenPorMes = Array(12).fill(null).map((_, i) => {
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

  const formatoMoneda = monto =>
    Number(monto).toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 w-full border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-100 drop-shadow">
            📈 Recuperación por Mes, Año, Bloque y Sucursal
          </h1>
          <div className="flex gap-3">
            <Link
              to="/dashboard-recuperacion"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              📊 Ver Dashboard de Gráficas
            </Link>
            <Link
              to="/"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
            >
              🏠 Ir al Home
            </Link>
          </div>
        </div>
        
        {/* Filtros modernizados */}
        <div className="mb-6 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-gray-200 font-semibold text-sm flex items-center gap-2">
                🏢 Bloque:
              </label>
              <select 
                className="w-full border border-gray-600/50 bg-gray-900/60 backdrop-blur-sm text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={bloque} 
                onChange={e => setBloque(e.target.value)}
              >
                <option value="">Todos los bloques</option>
                {bloques.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-gray-200 font-semibold text-sm flex items-center gap-2">
                🏪 Sucursal:
              </label>
              <select
                className="w-full border border-gray-600/50 bg-gray-900/60 backdrop-blur-sm text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={sucursal}
                onChange={e => setSucursal(e.target.value)}
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map(suc => (
                  <option key={suc} value={suc}>{suc}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-gray-200 font-semibold text-sm flex items-center gap-2">
                📅 Fecha Inicio:
              </label>
              <DatePicker
                selected={fechaInicio}
                onChange={date => setFechaInicio(date)}
                dateFormat="yyyy-MM-dd"
                className="w-full border border-gray-600/50 bg-gray-900/60 backdrop-blur-sm text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholderText="Selecciona fecha inicio"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-gray-200 font-semibold text-sm flex items-center gap-2">
                📅 Fecha Fin:
              </label>
              <DatePicker
                selected={fechaFin}
                onChange={date => setFechaFin(date)}
                dateFormat="yyyy-MM-dd"
                className="w-full border border-gray-600/50 bg-gray-900/60 backdrop-blur-sm text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholderText="Selecciona fecha fin"
                maxDate={new Date()}
              />
            </div>
          </div>
        </div>
        
        {/* Nota informativa */}
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-300 text-sm flex items-center gap-2">
            ⚠️ Todos los montos están convertidos a pesos mexicanos (MXN)
          </p>
        </div>
        
        {/* Tabla principal de recuperación por mes */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              📊 Recuperación por Mes
            </h2>
            <div className="text-sm text-gray-400">
              Resumen mensual de ventas y recuperación
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-max bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl">
              <thead>
                <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-left">
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                    📅 Mes
                  </th>
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                    📦 Ventas
                  </th>
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                    💳 Con Adeudo
                  </th>
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                    💰 Cantidad Pagada
                  </th>
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                    🏦 Anticipo
                  </th>
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                    ✅ Total Pagado
                  </th>
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                    💵 $ Ventas
                  </th>
                  <th className="p-4 text-gray-100 font-semibold text-sm uppercase tracking-wide">
                    📈 % Recuperado
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumenPorMes.map((m, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'} hover:bg-gray-600/30 transition-colors duration-200`}>
                    <td className="p-4 text-gray-100 font-medium border-r border-gray-600/20">
                      {m.mes}
                    </td>
                    <td className="p-4 text-gray-200 border-r border-gray-600/20">
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md text-sm font-medium">
                        {m.ventas.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-200 border-r border-gray-600/20">
                      <span className="text-orange-300 font-medium">
                        ${m.ventasAdeudo.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-200 border-r border-gray-600/20">
                      <span className="text-green-300 font-medium">
                        ${m.cantidadPagada.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-200 border-r border-gray-600/20">
                      <span className="text-purple-300 font-medium">
                        ${m.anticipo.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-200 border-r border-gray-600/20">
                      <span className="text-cyan-300 font-semibold">
                        ${m.totalPagado.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-200 border-r border-gray-600/20">
                      <span className="text-yellow-300 font-semibold">
                        ${m.ventasTotal.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 font-bold">
                      {m.ventasTotal ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          m.porcentajeRecuperado >= 70 ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                          m.porcentajeRecuperado >= 50 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                          'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {m.porcentajeRecuperado}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grid para tablas lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tabla Vendedora */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                👩‍💼 Recuperación por Vendedora
              </h2>
              <div className="text-sm text-gray-400">
                MXN
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-fit bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-left">
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Vendedora</th>
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30"># Ventas</th>
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Con Adeudo</th>
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Cant. Pagada</th>
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Anticipo</th>
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Total Pagado</th>
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">$ Ventas</th>
                    <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide">% Recuperado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...resumenVendedora]
                    .sort((a, b) => a.porcentajeRecuperado - b.porcentajeRecuperado)
                    .map((v, i) => {
                      let color = "bg-red-600 text-white";
                      if (v.porcentajeRecuperado >= 61) color = "bg-green-600 text-white";
                      else if (v.porcentajeRecuperado >= 51) color = "bg-green-300 text-gray-900";
                      else if (v.porcentajeRecuperado >= 36) color = "bg-yellow-400 text-gray-900";
                      return (
                        <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'} hover:bg-gray-600/30 transition-colors duration-200`}>
                          <td className="p-3 text-gray-200 font-medium border-r border-gray-600/20 text-xs">
                            <div className="max-w-[120px] truncate" title={v.vendedora}>
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
                          <td className={`p-3 font-bold border-r border-gray-600/20 text-xs ${color} rounded-md text-center`}>
                            {v.ventasTotal ? `${v.porcentajeRecuperado}%` : "-"}
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
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                  🏢 Recuperación por Sucursal
                </h2>
                <div className="text-sm text-gray-400">
                  MXN
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-fit bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-left">
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Sucursal</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Al Corriente</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Liquidado</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Vencido</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Con Adeudo</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Cant. Pagada</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Anticipo</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">Total Pagado</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide border-r border-gray-600/30">$ Ventas</th>
                      <th className="p-3 text-gray-100 font-semibold text-xs uppercase tracking-wide">% Recuperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...resumenSucursal]
                      .sort((a, b) => a.porcentajeRecuperado - b.porcentajeRecuperado)
                      .map((s, i) => {
                        let color = "bg-red-600 text-white";
                        if (s.porcentajeRecuperado >= 61) color = "bg-green-600 text-white";
                        else if (s.porcentajeRecuperado >= 51) color = "bg-green-300 text-gray-900";
                        else if (s.porcentajeRecuperado >= 36) color = "bg-yellow-400 text-gray-900";
                        return (
                          <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'} hover:bg-gray-600/30 transition-colors duration-200`}>
                            <td className="p-3 text-gray-200 font-medium border-r border-gray-600/20 text-xs">
                              <div className="max-w-[120px] truncate" title={s.sucursal}>
                                {s.sucursal}
                              </div>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                                {s.alCorriente}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                                {s.liquidado}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs">
                                {s.vencido}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="text-orange-300 font-medium">
                                {formatoMoneda(s.ventasAdeudo)}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="text-green-300 font-medium">
                                {formatoMoneda(s.cantidadPagada)}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="text-purple-300 font-medium">
                                {formatoMoneda(s.anticipo)}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="text-cyan-300 font-semibold">
                                {formatoMoneda(s.totalPagado)}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200 border-r border-gray-600/20 text-xs">
                              <span className="text-yellow-300 font-semibold">
                                {formatoMoneda(s.ventasTotal)}
                              </span>
                            </td>
                            <td className={`p-3 font-bold border-r border-gray-600/20 text-xs ${color} rounded-md text-center`}>
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
      </div>
    </div>
  );
}
