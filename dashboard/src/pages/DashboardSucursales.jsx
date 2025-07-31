import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

export default function DashboardSucursales() {
  const [datos, setDatos] = useState([]);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [filtroRiesgo, setFiltroRiesgo] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_BASE_URL}/dashboard-sucursales-duplicados`);
      setDatos(res.data.sucursales);
      setEstadisticasGenerales(res.data.estadisticas_generales);
      setCargando(false);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setCargando(false);
    }
  };

  // Filtrar datos según los criterios
  const datosFiltrados = datos.filter(item => {
    const coincideFiltroRiesgo = !filtroRiesgo || item.nivel_riesgo_sucursal === filtroRiesgo;
    const coincideBusqueda = !busqueda || 
      item.sucursal.toLowerCase().includes(busqueda.toLowerCase());
    
    return coincideFiltroRiesgo && coincideBusqueda;
  });

  // Función para exportar resultados a CSV
  const exportarCSV = () => {
    const headers = [
      'Sucursal', 'Total Teléfonos Duplicados', 'Total Clientes Afectados', 
      'Total Registros Problema', 'Promedio Clientes por Teléfono', 'Máx Clientes en un Teléfono',
      'Teléfonos Alto Riesgo', 'Teléfonos Medio Riesgo', 'Teléfonos Bajo Riesgo', 'Nivel Riesgo Sucursal'
    ];
    
    const csvContent = [
      headers.join(','),
      ...datosFiltrados.map(item => {
        return [
          `"${item.sucursal}"`,
          item.total_telefonos_duplicados,
          item.total_clientes_afectados,
          item.total_registros_problema,
          item.promedio_clientes_por_telefono,
          item.max_clientes_en_un_telefono,
          item.telefonos_alto_riesgo,
          item.telefonos_medio_riesgo,
          item.telefonos_bajo_riesgo,
          `"${item.nivel_riesgo_sucursal}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_sucursales_duplicados_${new Date().toISOString().split('T')[0]}.csv`);
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

  const obtenerIconoRiesgo = (riesgo) => {
    switch (riesgo) {
      case 'Alto': return '🔴';
      case 'Medio': return '🟡';
      case 'Bajo': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 drop-shadow-lg">
              🏢 Dashboard Sucursales - Teléfonos Duplicados
            </h1>
            <p className="text-gray-300 mt-2 text-lg">
              Análisis de sucursales con mayor incidencia de teléfonos duplicados
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/validador-telefonos"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
            >
              📱 Ver Teléfonos
            </Link>
          </div>
        </div>

        {/* Estadísticas Generales */}
        {estadisticasGenerales && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-blue-400 text-3xl font-bold mb-2">
                {estadisticasGenerales.total_sucursales}
              </div>
              <div className="text-gray-300 text-sm font-medium">Total Sucursales</div>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-red-400 text-3xl font-bold mb-2">
                {estadisticasGenerales.total_telefonos_duplicados}
              </div>
              <div className="text-gray-300 text-sm font-medium">Teléfonos Duplicados</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-yellow-400 text-3xl font-bold mb-2">
                {estadisticasGenerales.total_clientes_afectados}
              </div>
              <div className="text-gray-300 text-sm font-medium">Clientes Afectados</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-purple-400 text-3xl font-bold mb-2">
                {estadisticasGenerales.promedio_telefonos_por_sucursal}
              </div>
              <div className="text-gray-300 text-sm font-medium">Promedio por Sucursal</div>
            </div>
          </div>
        )}

        {/* Distribución por Riesgo */}
        {estadisticasGenerales && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-red-400 text-2xl font-bold mb-2">
                    {estadisticasGenerales.sucursales_alto_riesgo}
                  </div>
                  <div className="text-gray-300 text-sm font-medium">🔴 Alto Riesgo</div>
                </div>
                <div className="text-4xl">🏢</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-yellow-400 text-2xl font-bold mb-2">
                    {estadisticasGenerales.sucursales_medio_riesgo}
                  </div>
                  <div className="text-gray-300 text-sm font-medium">🟡 Medio Riesgo</div>
                </div>
                <div className="text-4xl">🏪</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-green-400 text-2xl font-bold mb-2">
                    {estadisticasGenerales.sucursales_bajo_riesgo}
                  </div>
                  <div className="text-gray-300 text-sm font-medium">🟢 Bajo Riesgo</div>
                </div>
                <div className="text-4xl">🏬</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre de sucursal..."
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
              <option value="Alto">🔴 Alto Riesgo</option>
              <option value="Medio">🟡 Medio Riesgo</option>
              <option value="Bajo">🟢 Bajo Riesgo</option>
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

        {/* Tabla de Resultados */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
          {cargando ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent"></div>
                <div className="text-gray-300 text-xl font-medium">🔍 Analizando sucursales...</div>
                <div className="text-gray-400 text-sm">Calculando estadísticas de teléfonos duplicados</div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                    <th className="p-4 text-left font-semibold text-gray-100 min-w-[200px]">🏢 Sucursal</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[120px]">📱 Teléfonos Duplicados</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[120px]">👥 Clientes Afectados</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[120px]">📊 Registros Problema</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[120px]">📈 Promedio</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[120px]">⚠️ Nivel Riesgo</th>
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[200px]">🎯 Distribución Riesgo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {datosFiltrados.length > 0 ? (
                    datosFiltrados.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-700/20 transition-colors duration-200">
                        <td className="p-4">
                          <div className="font-medium text-gray-100 text-base">
                            {item.sucursal}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            Máx: {item.max_clientes_en_un_telefono} clientes en un teléfono
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-red-500/20 text-red-300 px-3 py-2 rounded-lg font-bold text-lg border border-red-500/30">
                            {item.total_telefonos_duplicados}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-yellow-500/20 text-yellow-300 px-3 py-2 rounded-lg font-semibold border border-yellow-500/30">
                            {item.total_clientes_afectados}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-purple-500/20 text-purple-300 px-3 py-2 rounded-lg font-semibold border border-purple-500/30">
                            {item.total_registros_problema}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg font-semibold border border-blue-500/30">
                            {item.promedio_clientes_por_telefono}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-4 py-2 rounded-lg text-sm font-bold border ${obtenerColorRiesgo(item.nivel_riesgo_sucursal)}`}>
                            {obtenerIconoRiesgo(item.nivel_riesgo_sucursal)} {item.nivel_riesgo_sucursal}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <div className="text-center">
                              <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs border border-red-500/30">
                                🔴 {item.telefonos_alto_riesgo}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs border border-yellow-500/30">
                                🟡 {item.telefonos_medio_riesgo}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs border border-green-500/30">
                                🟢 {item.telefonos_bajo_riesgo}
                              </div>
                            </div>
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
                            "✅ No se encontraron datos de sucursales"
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
              <strong className="text-gray-100">ℹ️ Información del Dashboard:</strong> Este dashboard muestra las sucursales con mayor incidencia de teléfonos duplicados.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <span className="text-red-400 font-semibold">🔴 Alto Riesgo:</span>
                <p className="text-gray-300 text-sm mt-1">Sucursales con teléfonos compartidos por 4+ clientes</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <span className="text-yellow-400 font-semibold">🟡 Medio Riesgo:</span>
                <p className="text-gray-300 text-sm mt-1">Sucursales con teléfonos compartidos por 3 clientes</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <span className="text-green-400 font-semibold">🟢 Bajo Riesgo:</span>
                <p className="text-gray-300 text-sm mt-1">Sucursales con teléfonos compartidos por 2 clientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
