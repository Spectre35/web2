import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

export default function ValidadorTelefonos() {
  const [datos, setDatos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [filtroRiesgo, setFiltroRiesgo] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarDatos();
    cargarEstadisticas();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_BASE_URL}/validar-telefonos`);
      setDatos(res.data.datos);
      setCargando(false);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/estadisticas-telefonos`);
      setEstadisticas(res.data);
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  // Filtrar datos según los criterios
  const datosFiltrados = datos.filter(item => {
    const coincideFiltroRiesgo = !filtroRiesgo || item.riesgo === filtroRiesgo;
    const coincideBusqueda = !busqueda || 
      item.telefono.includes(busqueda) ||
      item.clientes.some(cliente => 
        cliente.toLowerCase().includes(busqueda.toLowerCase())
      );
    
    return coincideFiltroRiesgo && coincideBusqueda;
  });

  // Función para exportar resultados a CSV
  const exportarCSV = () => {
    const headers = ['Teléfono', 'Clientes Distintos', 'Veces Usado', 'Riesgo', 'Última Fecha', 'Cantidad Sucursales', 'Sucursales', 'Lista de Clientes'];
    const csvContent = [
      headers.join(','),
      ...datosFiltrados.map(item => {
        return [
          `"${item.telefono}"`,
          item.clientesDistintos,
          item.vecesUsado,
          item.riesgo,
          `"${item.ultimaFechaRegistro ? new Date(item.ultimaFechaRegistro).toLocaleDateString('es-ES') : 'Sin fecha'}"`,
          item.cantidadSucursales || item.sucursales?.length || 0,
          `"${item.sucursales ? item.sucursales.join(' | ') : ''}"`,
          `"${item.clientes.join(' | ')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `telefonos_duplicados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const obtenerColorRiesgo = (riesgo) => {
    switch (riesgo) {
      case 'Alto': return 'text-red-400 bg-red-900/30 border-red-500/30';
      case 'Medio': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
      case 'Bajo': return 'text-green-400 bg-green-900/30 border-green-500/30';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/30';
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10">
        
        {/* Header */}
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 drop-shadow-lg">
              📱 Validador de Teléfonos Duplicados
            </h1>
            <p className="text-gray-300 mt-2 text-lg">
              Detecta clientes que comparten el mismo número de teléfono
            </p>
          </div>
          <Link
            to="/"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
          >
            🏠 Ir al Home
          </Link>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-blue-400 text-3xl font-bold mb-2">
                {parseInt(estadisticas.total_registros).toLocaleString()}
              </div>
              <div className="text-gray-300 text-sm font-medium">Total Registros</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-green-400 text-3xl font-bold mb-2">
                {parseInt(estadisticas.telefonos_unicos).toLocaleString()}
              </div>
              <div className="text-gray-300 text-sm font-medium">Teléfonos Únicos</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-purple-400 text-3xl font-bold mb-2">
                {parseInt(estadisticas.clientes_unicos).toLocaleString()}
              </div>
              <div className="text-gray-300 text-sm font-medium">Clientes Únicos</div>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-red-400 text-3xl font-bold mb-2">
                {datos.length}
              </div>
              <div className="text-gray-300 text-sm font-medium">Números Problemáticos</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buscar por teléfono o cliente..."
              className="border border-gray-600/50 bg-gray-900/50 text-gray-100 placeholder-gray-400 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={filtroRiesgo}
              onChange={(e) => setFiltroRiesgo(e.target.value)}
            >
              <option value="">Todos los niveles de riesgo</option>
              <option value="Alto">🔴 Riesgo Alto</option>
              <option value="Medio">🟡 Riesgo Medio</option>
              <option value="Bajo">🟢 Riesgo Bajo</option>
            </select>
            <button
              onClick={cargarDatos}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105"
            >
              🔄 Actualizar
            </button>
          </div>
          
          {/* Botón de exportar */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={exportarCSV}
              disabled={!datos.length}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100"
            >
              📊 Exportar CSV
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
          {cargando ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent"></div>
                <div className="text-gray-300 text-xl font-medium">🔍 Analizando teléfonos duplicados...</div>
                <div className="text-gray-400 text-sm">Esto puede tomar unos momentos</div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                    <th className="p-4 text-left font-semibold text-gray-100 min-w-[130px]">📱 Teléfono</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[100px]">👥 Clientes</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[80px]">📊 Usos</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[100px]">⚠️ Riesgo</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[130px]">📅 Última Fecha</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[150px]">🏢 Sucursales</th>
                    <th className="p-4 text-left font-semibold text-gray-100 min-w-[250px]">📋 Lista de Clientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {datosFiltrados.length > 0 ? (
                    datosFiltrados.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-4">
                          <span className="text-gray-100 font-mono text-base font-medium bg-gray-700/40 px-3 py-2 rounded-lg">
                            {item.telefono}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg font-semibold border border-blue-500/30">
                            {item.clientesDistintos}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-purple-500/20 text-purple-300 px-3 py-2 rounded-lg font-semibold border border-purple-500/30">
                            {item.vecesUsado}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-4 py-2 rounded-lg text-sm font-bold border ${obtenerColorRiesgo(item.riesgo)}`}>
                            {item.riesgo}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-lg text-sm font-medium border border-indigo-500/30">
                            {item.ultimaFechaRegistro ? 
                              new Date(item.ultimaFechaRegistro).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              }) : 
                              'Sin fecha'
                            }
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="text-center">
                              <span className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-lg text-sm font-semibold border border-cyan-500/30">
                                {item.cantidadSucursales || item.sucursales?.length || 0} sucursales
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-xs mx-auto">
                              {item.sucursales && item.sucursales.map((sucursal, j) => (
                                <span
                                  key={j}
                                  className="inline-block bg-cyan-800/30 text-cyan-200 px-2 py-1 rounded text-xs border border-cyan-700/30"
                                  title={sucursal}
                                >
                                  {sucursal.length > 12 ? sucursal.substring(0, 12) + '...' : sucursal}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="max-w-md space-y-1">
                            {item.clientes.map((cliente, j) => (
                              <span
                                key={j}
                                className="inline-block bg-gray-700/60 text-gray-200 px-3 py-1 rounded-lg text-sm mr-2 mb-1 border border-gray-600/40 font-medium"
                              >
                                {cliente}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center p-12">
                        <div className="text-gray-400 text-lg">
                          {busqueda || filtroRiesgo ? 
                            "❌ No hay resultados que coincidan con los filtros aplicados" : 
                            "✅ No se encontraron teléfonos duplicados"
                          }
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="mt-8 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
          <div className="text-sm text-gray-300">
            <p className="mb-4 text-lg font-medium">
              <strong className="text-gray-100">ℹ️ Información:</strong> Esta herramienta identifica números de teléfono compartidos entre diferentes clientes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <span className="text-red-400 font-semibold">🔴 Riesgo Alto:</span>
                <p className="text-gray-300 text-sm mt-1">4 o más clientes distintos</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <span className="text-yellow-400 font-semibold">🟡 Riesgo Medio:</span>
                <p className="text-gray-300 text-sm mt-1">Exactamente 3 clientes distintos</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <span className="text-green-400 font-semibold">🟢 Riesgo Bajo:</span>
                <p className="text-gray-300 text-sm mt-1">Exactamente 2 clientes distintos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}