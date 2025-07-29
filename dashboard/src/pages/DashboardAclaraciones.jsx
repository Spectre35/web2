import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

// Utilidades para formateo
const formatCurrency = n => n?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "$0";

export default function DashboardAclaraciones() {
  // Filtros
  const [anio, setAnio] = useState("");
  const [bloque, setBloque] = useState("");
  const [mes, setMes] = useState("");

  // Datos
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Opciones de filtros
  const [anios, setAnios] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [meses] = useState([
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ]);

  // Cargar opciones de filtros
  useEffect(() => {
    axios.get(`${API_BASE_URL}/anios`).then(r => setAnios(r.data)).catch(() => {});
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10">
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 drop-shadow-lg">
              💳 Dashboard de Aclaraciones
            </h1>
            <p className="text-gray-300 mt-2 text-lg">
              Resumen y análisis de aclaraciones por filtros seleccionados
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
              onClick={() => window.location.href = "/"}
            >
              🏠 Home
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={anio} onChange={e => setAnio(e.target.value)} className="border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
              <option value="">Año</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={bloque} onChange={e => setBloque(e.target.value)} className="border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
              <option value="">Bloque</option>
              {bloques.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={mes} onChange={e => setMes(e.target.value)} className="border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
              <option value="">Mes</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {loading && <div className="text-center text-lg text-blue-400 py-12">Cargando...</div>}
        {error && <div className="text-red-500 text-center py-4">{error}</div>}

        {resumen && (
          <div className="space-y-8">
            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg">
                <div className="text-blue-400 text-3xl font-bold mb-2">
                  {formatCurrency(resumen.totalMontoEnDisputa)}
                </div>
                <div className="text-gray-300 text-sm font-medium">Monto total en disputa</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg">
                <div className="text-purple-400 text-3xl font-bold mb-2">
                  {resumen.totalAclaraciones}
                </div>
                <div className="text-gray-300 text-sm font-medium">Cantidad de aclaraciones</div>
              </div>
            </div>

            {/* Tabla: aclaraciones por mes */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
              <div className="font-semibold mb-2 text-lg text-blue-300">Aclaraciones por mes</div>
              <table className="min-w-[400px] border w-full mb-6 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                    <th className="p-2 text-left font-semibold text-gray-100">Mes</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.aclaracionesPorMes.map(row => (
                    <tr key={row.mes} className="hover:bg-gray-700/20 transition-colors duration-200">
                      <td className="p-2">{row.mes}</td>
                      <td className="p-2">{row.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tabla: estatus de documentación (por comentario) */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
              <div className="font-semibold mb-2 text-lg text-blue-300">Estatus de documentación (por comentario)</div>
              <table className="min-w-[400px] border w-full mb-6 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                    <th className="p-2 text-left font-semibold text-gray-100">Comentario</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Cantidad</th>
                    <th className="p-2 text-left font-semibold text-gray-100">%</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.estatusDocumentacion.map(row => (
                    <tr key={row.comentario} className="hover:bg-gray-700/20 transition-colors duration-200">
                      <td className="p-2">{row.comentario}</td>
                      <td className="p-2">{row.cantidad}</td>
                      <td className="p-2">{row.porcentaje}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top 10 bloques y sucursales por cantidad y monto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                <div className="font-semibold mb-2 text-blue-300">Top 10 bloques por aclaraciones</div>
                <table className="min-w-[300px] border w-full mb-4 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                      <th className="p-2 text-left font-semibold text-gray-100">Bloque</th>
                      <th className="p-2 text-left font-semibold text-gray-100">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.topBloques.map(row => (
                      <tr key={row.bloque} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-2">{row.bloque}</td>
                        <td className="p-2">{row.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="font-semibold mb-2 text-blue-300">Top 10 bloques por monto</div>
                <table className="min-w-[300px] border w-full rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                      <th className="p-2 text-left font-semibold text-gray-100">Bloque</th>
                      <th className="p-2 text-left font-semibold text-gray-100">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.topBloquesMonto.map(row => (
                      <tr key={row.bloque} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-2">{row.bloque}</td>
                        <td className="p-2">{formatCurrency(row.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                <div className="font-semibold mb-2 text-blue-300">Top 10 sucursales por aclaraciones</div>
                <table className="min-w-[300px] border w-full mb-4 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                      <th className="p-2 text-left font-semibold text-gray-100">Sucursal</th>
                      <th className="p-2 text-left font-semibold text-gray-100">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.topSucursales.map(row => (
                      <tr key={row.sucursal} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-2">{row.sucursal}</td>
                        <td className="p-2">{row.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="font-semibold mb-2 text-blue-300">Top 10 sucursales por monto</div>
                <table className="min-w-[300px] border w-full rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                      <th className="p-2 text-left font-semibold text-gray-100">Sucursal</th>
                      <th className="p-2 text-left font-semibold text-gray-100">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.topSucursalesMonto.map(row => (
                      <tr key={row.sucursal} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-2">{row.sucursal}</td>
                        <td className="p-2">{formatCurrency(row.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 10 vendedoras por cantidad y monto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                <div className="font-semibold mb-2 text-blue-300">Top 10 vendedoras por aclaraciones</div>
                <table className="min-w-[300px] border w-full mb-4 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                      <th className="p-2 text-left font-semibold text-gray-100">Vendedora</th>
                      <th className="p-2 text-left font-semibold text-gray-100">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.topVendedoras.map(row => (
                      <tr key={row.vendedora} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-2">{row.vendedora}</td>
                        <td className="p-2">{row.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="font-semibold mb-2 text-blue-300">Top 10 vendedoras por monto</div>
                <table className="min-w-[300px] border w-full rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                      <th className="p-2 text-left font-semibold text-gray-100">Vendedora</th>
                      <th className="p-2 text-left font-semibold text-gray-100">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.topVendedorasMonto.map(row => (
                      <tr key={row.vendedora} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-2">{row.vendedora}</td>
                        <td className="p-2">{formatCurrency(row.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendedores con documentación incompleta */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
              <div className="font-semibold mb-2 text-blue-300">Vendedores con documentación incompleta</div>
              <table className="min-w-[300px] border w-full rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                    <th className="p-2 text-left font-semibold text-gray-100">Vendedora</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.vendedoresIncompletos.map(row => (
                    <tr key={row.vendedora} className="hover:bg-gray-700/20 transition-colors duration-200">
                      <td className="p-2">{row.vendedora}</td>
                      <td className="p-2">{row.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resolución por mes */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
              <div className="font-semibold mb-2 text-blue-300">Resolución por mes</div>
              <table className="min-w-[400px] border w-full rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                    <th className="p-2 text-left font-semibold text-gray-100">Mes</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Ganadas</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Perdidas</th>
                    <th className="p-2 text-left font-semibold text-gray-100">En Proceso</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Monto En Disputa</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Defendido</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Perdido</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.resolucionPorMes.map(row => (
                    <tr key={row.mes} className="hover:bg-gray-700/20 transition-colors duration-200">
                      <td className="p-2">{row.mes}</td>
                      <td className="p-2">{row.ganadas}</td>
                      <td className="p-2">{row.perdidas}</td>
                      <td className="p-2">{row.enProceso}</td>
                      <td className="p-2">{formatCurrency(row.montoEnDisputa)}</td>
                      <td className="p-2">{formatCurrency(row.defendido)}</td>
                      <td className="p-2">{formatCurrency(row.perdido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top 10 sucursales que han perdido más dinero */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
              <div className="font-semibold mb-2 text-blue-300">Top 10 sucursales que han perdido más dinero</div>
              <table className="min-w-[400px] border w-full rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                    <th className="p-2 text-left font-semibold text-gray-100">Sucursal</th>
                    <th className="p-2 text-left font-semibold text-gray-100">Monto Perdido</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.topSucursalesPerdidas.map(row => (
                    <tr key={row.sucursal} className="hover:bg-gray-700/20 transition-colors duration-200">
                      <td className="p-2">{row.sucursal}</td>
                      <td className="p-2">{formatCurrency(row.montoPerdido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contador: sucursal con más dinero en disputa */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg flex flex-col items-center">
              <div className="font-semibold mb-2 text-blue-300">Sucursal con más dinero en disputa</div>
              <div className="text-xl text-gray-100">
                {resumen.sucursalMasDineroEnDisputa?.sucursal
                  ? `${resumen.sucursalMasDineroEnDisputa.sucursal} (${formatCurrency(resumen.sucursalMasDineroEnDisputa.monto)})`
                  : "Sin datos"}
              </div>
            </div>

            {/* Gráfica general: dinero en disputa por estatus */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
              <div className="font-semibold mb-2 text-blue-300">Dinero en disputa por estatus</div>
              {/* Aquí puedes usar una librería de gráficas como recharts o chart.js para mostrar los datos */}
              <pre className="bg-gray-900/60 rounded p-4 text-gray-200">{JSON.stringify(resumen.graficaDineroEstatus, null, 2)}</pre>
            </div>
            {/* Gráfica general: cantidad de aclaraciones por estatus */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
              <div className="font-semibold mb-2 text-blue-300">Cantidad de aclaraciones por estatus</div>
              <pre className="bg-gray-900/60 rounded p-4 text-gray-200">{JSON.stringify(resumen.graficaCantidadEstatus, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
