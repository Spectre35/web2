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

  // Función para exportar resultados a CSV
  const exportarCSV = () => {
    const headers = ['Teléfono', 'Clientes Distintos', 'Veces Usado', 'Riesgo', 'Lista de Clientes'];
    const csvContent = [
      headers.join(','),
      ...datosFiltrados.map(item => {
        return [
          `"${item.telefono}"`,
          item.clientesDistintos,
          item.vecesUsado,
          item.riesgo,
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

  const obtenerColorRiesgo = (riesgo) => {
    switch (riesgo) {
      case 'Alto': return 'text-red-400 bg-red-900/30';
      case 'Medio': return 'text-yellow-400 bg-yellow-900/30';
      case 'Bajo': return 'text-green-400 bg-green-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/20">
        
        {/* Header */}
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 drop-shadow">
              📱 Validador de Teléfonos Duplicados
            </h1>
            <p className="text-gray-300 mt-2">
              Detecta clientes que comparten el mismo número de teléfono
            </p>
          </div>
          <Link
            to="/"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
          >
            🏠 Ir al Home
          </Link>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <>
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="text-blue-400 text-2xl font-bold">
                  {parseInt(estadisticas.total_registros).toLocaleString()}
                </div>
                <div className="text-gray-300 text-sm">Total Registros</div>
              </div>
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="text-green-400 text-2xl font-bold">
                  {parseInt(estadisticas.telefonos_unicos).toLocaleString()}
                </div>
                <div className="text-gray-300 text-sm">Teléfonos Únicos</div>
              </div>
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="text-purple-400 text-2xl font-bold">
                  {parseInt(estadisticas.clientes_unicos).toLocaleString()}
                </div>
                <div className="text-gray-300 text-sm">Clientes Únicos</div>
              </div>
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="text-red-400 text-2xl font-bold">
                  {datos.length}
                </div>
                <div className="text-gray-300 text-sm">Números Problemáticos</div>
              </div>
            </div>
          </>
        )}

        {/* Filtros */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buscar por teléfono o cliente..."
              className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-3 rounded focus:ring-2 focus:ring-blue-500"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="border border-gray-700 bg-gray-900/60 text-gray-100 p-3 rounded focus:ring-2 focus:ring-blue-500"
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
              className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-300"
            >
              🔄 Actualizar
            </button>
          </div>
          
          {/* Botón de exportar */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={exportarCSV}
              disabled={!datos.length}
              className="bg-gradient-to-r from-green-600 to-green-400 hover:from-green-700 hover:to-green-500 disabled:from-gray-600 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-300"
            >
              📊 Exportar CSV
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden">
          {cargando ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-lg">🔍 Analizando teléfonos duplicados...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-700/50 text-left">
                    <th className="p-4 font-semibold text-gray-200">📱 Teléfono</th>
                    <th className="p-4 font-semibold text-gray-200">👥 Clientes</th>
                    <th className="p-4 font-semibold text-gray-200">📊 Usos</th>
                    <th className="p-4 font-semibold text-gray-200">⚠️ Riesgo</th>
                    <th className="p-4 font-semibold text-gray-200">📋 Lista de Clientes</th>
                  </tr>
                </thead>
                <tbody>
                  {datosFiltrados.length > 0 ? (
                    datosFiltrados.map((item, i) => {
                      return (
                        <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors">
                          <td className="p-4 text-gray-300 font-mono">
                            {item.telefono}
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded">
                              {item.clientesDistintos}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded">
                              {item.vecesUsado}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${obtenerColorRiesgo(item.riesgo)}`}>
                              {item.riesgo}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="max-w-md">
                              {item.clientes.map((cliente, j) => (
                                <span
                                  key={j}
                                  className="inline-block bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs mr-1 mb-1"
                                >
                                  {cliente}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-gray-500">
                        {busqueda || filtroRiesgo ? 
                          "No hay resultados que coincidan con los filtros" : 
                          "No se encontraron teléfonos duplicados"
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="mt-6 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">
            <p className="mb-2">
              <strong className="text-gray-300">ℹ️ Información:</strong> Esta herramienta identifica números de teléfono compartidos entre diferentes clientes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-red-400">🔴 Riesgo Alto:</span> 4+ clientes distintos
              </div>
              <div>
                <span className="text-yellow-400">🟡 Riesgo Medio:</span> 3 clientes distintos
              </div>
              <div>
                <span className="text-green-400">🟢 Riesgo Bajo:</span> 2 clientes distintos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
