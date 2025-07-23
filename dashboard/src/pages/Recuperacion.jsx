import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatearFecha, formatearFechasEnObjeto } from "../utils/dateUtils";

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
    axios.get("http://192.168.1.111:3000/anios").then(res => setAnios(res.data.map(formatearFechasEnObjeto)));
    axios.get("http://192.168.1.111:3000/bloques").then(res => setBloques(res.data.map(formatearFechasEnObjeto)));
  }, []);

  // Cargar sucursales cada vez que cambian bloque o año
  useEffect(() => {
    const params = {};
    if (bloque) params.bloque = bloque;
    // Eliminar año de los parámetros
    axios.get("http://192.168.1.111:3000/sucursales", { params }).then(res => setSucursales(res.data.map(formatearFechasEnObjeto)));
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
    axios.get("http://192.168.1.111:3000/ventas/resumen", { params }).then(res => {
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
    axios.get("http://192.168.1.111:3000/ventas/resumen-vendedora", { params }).then(res => {
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
    axios.get("http://192.168.1.111:3000/ventas/resumen-sucursal", { params }).then(res => {
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
        <h1 className="text-2xl font-bold mb-6 text-gray-100 drop-shadow">
          📈 Recuperación por Mes, Año, Bloque y Sucursal
        </h1>
        <Link
          to="/"
          className="inline-block mb-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
        >
          ← Regresar al Home
        </Link>
        <Link
          to="/dashboard-recuperacion"
          className="inline-block mb-6 ml-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
        >
          📊 Ver Dashboard de Gráficas
        </Link>
        <div className="mb-4 flex gap-4 items-center flex-wrap">
          {/* Elimina el filtro de año */}
          {/* <label className="text-gray-200 font-semibold">Año:</label>
          <select className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded"
            value={anio} onChange={e => setAnio(e.target.value)}>
            <option value="">Todos</option>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select> */}
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
          />
          <label className="text-gray-200 font-semibold">Fecha Fin:</label>
          <DatePicker
            selected={fechaFin}
            onChange={date => setFechaFin(date)}
            dateFormat="yyyy-MM-dd"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded"
            placeholderText="Selecciona fecha fin"
            maxDate={new Date()}
          />
        </div>
        <p className="text-yellow-300 mb-2">
          * Todos los montos están convertidos a pesos mexicanos (MXN)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max bg-gray-900/80 shadow-md rounded text-sm text-gray-100">
            <thead>
              <tr className="bg-gray-800/80 text-left">
                <th className="p-2">MES</th>
                <th className="p-2"># VENTAS</th>
                <th className="p-2">VENTAS CON ADEUDO</th>
                <th className="p-2">CANTIDAD PAGADA</th>
                <th className="p-2">ANTICIPO</th>
                <th className="p-2">TOTAL PAGADO</th>
                <th className="p-2">$ VENTAS</th>
                <th className="p-2">% $ RECUPERADO</th>
              </tr>
            </thead>
            <tbody>
              {resumenPorMes.map((m, i) => (
                <tr key={i}>
                  <td className="p-2">{m.mes}</td>
                  <td className="p-2">{m.ventas}</td>
                  <td className="p-2">${m.ventasAdeudo.toLocaleString()}</td>
                  <td className="p-2">${m.cantidadPagada.toLocaleString()}</td>
                  <td className="p-2">${m.anticipo.toLocaleString()}</td>
                  <td className="p-2">${m.totalPagado.toLocaleString()}</td>
                  <td className="p-2">${m.ventasTotal.toLocaleString()}</td>
                  <td className="p-2">
                    {m.ventasTotal ? `${m.porcentajeRecuperado}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* NUEVO: Grid para tablas lado a lado */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tabla Vendedora */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-100 drop-shadow">
              📋 Recuperación por Vendedora (MXN)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-fit bg-gray-900/80 shadow-md rounded text-xs text-gray-100 border border-gray-700">
                <thead>
                  <tr className="bg-gray-800/80 text-left">
                    <th className="p-1 border border-gray-700">VENDEDORA</th>
                    <th className="p-1 border border-gray-700"># VENTAS</th>
                    <th className="p-1 border border-gray-700">VENTAS CON ADEUDO</th>
                    <th className="p-1 border border-gray-700">CANTIDAD PAGADA</th>
                    <th className="p-1 border border-gray-700">ANTICIPO</th>
                    <th className="p-1 border border-gray-700">TOTAL PAGADO</th>
                    <th className="p-1 border border-gray-700">$ VENTAS</th>
                    <th className="p-1 border border-gray-700">% $ RECUPERADO</th>
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
                        <tr key={i}>
                          <td className="p-1 border border-gray-700">{v.vendedora}</td>
                          <td className="p-1 border border-gray-700">{v.ventas}</td>
                          <td className="p-1 border border-gray-700">{formatoMoneda(v.ventasAdeudo)}</td>
                          <td className="p-1 border border-gray-700">{formatoMoneda(v.cantidadPagada)}</td>
                          <td className="p-1 border border-gray-700">{formatoMoneda(v.anticipo)}</td>
                          <td className="p-1 border border-gray-700">{formatoMoneda(v.totalPagado)}</td>
                          <td className="p-1 border border-gray-700">{formatoMoneda(v.ventasTotal)}</td>
                          <td className={`p-1 font-bold border border-gray-700 ${color}`}>
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
            <div>
              <h2 className="text-xl font-bold mb-4 text-gray-100 drop-shadow">
                🏢 Recuperación por Sucursal (MXN)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-fit bg-gray-900/80 shadow-md rounded text-xs text-gray-100 border border-gray-700">
                  <thead>
                    <tr className="bg-gray-800/80 text-left">
                      <th className="p-1 border border-gray-700">SUCURSAL</th>
                      <th className="p-1 border border-gray-700">AL CORRIENTE</th>
                      <th className="p-1 border border-gray-700">LIQUIDADO</th>
                      <th className="p-1 border border-gray-700">VENCIDO</th>
                      <th className="p-1 border border-gray-700">VENTAS CON ADEUDO</th>
                      <th className="p-1 border border-gray-700">CANTIDAD PAGADA</th>
                      <th className="p-1 border border-gray-700">ANTICIPO</th>
                      <th className="p-1 border border-gray-700">TOTAL PAGADO</th>
                      <th className="p-1 border border-gray-700">$ VENTAS</th>
                      <th className="p-1 border border-gray-700">% $ RECUPERADO</th>
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
                          <tr key={i}>
                            <td className="p-1 border border-gray-700">{s.sucursal}</td>
                            <td className="p-1 border border-gray-700">{s.alCorriente}</td>
                            <td className="p-1 border border-gray-700">{s.liquidado}</td>
                            <td className="p-1 border border-gray-700">{s.vencido}</td>
                            <td className="p-1 border border-gray-700">{formatoMoneda(s.ventasAdeudo)}</td>
                            <td className="p-1 border border-gray-700">{formatoMoneda(s.cantidadPagada)}</td>
                            <td className="p-1 border border-gray-700">{formatoMoneda(s.anticipo)}</td>
                            <td className="p-1 border border-gray-700">{formatoMoneda(s.totalPagado)}</td>
                            <td className="p-1 border border-gray-700">{formatoMoneda(s.ventasTotal)}</td>
                            <td className={`p-1 font-bold border border-gray-700 ${color}`}>
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