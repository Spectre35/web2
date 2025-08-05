import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../config.js";

export default function TarjetasDuplicadas() {
  const [datos, setDatos] = useState([]);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  
  // Estados para el modal de tarjetas por sucursal
  const [modalSucursal, setModalSucursal] = useState({ mostrar: false, sucursal: '', datos: [] });
  const [cargandoModal, setCargandoModal] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      
      // Construir URL con parámetros de fecha si están definidos
      let url = `${API_BASE_URL}/dashboard-tarjetas-duplicadas`;
      const params = new URLSearchParams();
      
      if (fechaInicio) {
        params.append('fechaInicio', fechaInicio);
      }
      if (fechaFin) {
        params.append('fechaFin', fechaFin);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('🌐 Cargando con URL:', url);
      
      const res = await axios.get(url);
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
    const coincideBusqueda = !busqueda || 
      item.sucursal.toLowerCase().includes(busqueda.toLowerCase());
    
    return coincideBusqueda;
  });

  // Función para cargar tarjetas duplicadas de una sucursal específica
  const cargarTarjetasPorSucursal = async (sucursal) => {
    setCargandoModal(true);
    try {
      // Construir URL con parámetros de fecha si están definidos
      let url = `${API_BASE_URL}/validar-tarjetas/sucursal/${encodeURIComponent(sucursal)}`;
      const params = new URLSearchParams();
      
      if (fechaInicio) {
        params.append('fechaInicio', fechaInicio);
      }
      if (fechaFin) {
        params.append('fechaFin', fechaFin);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await axios.get(url);
      setModalSucursal({
        mostrar: true,
        sucursal,
        datos: res.data.datos || []
      });
    } catch (error) {
      console.error("Error al cargar tarjetas de la sucursal:", error);
      alert(`❌ Error al cargar datos de la sucursal: ${error.message}`);
    } finally {
      setCargandoModal(false);
    }
  };

  // Función para cerrar el modal
  const cerrarModal = () => {
    setModalSucursal({ mostrar: false, sucursal: '', datos: [] });
  };

  // Función para descargar datos de una sucursal específica
  const descargarDatosSucursal = async (sucursal) => {
    try {
      setCargandoModal(true);
      // Construir URL con parámetros de fecha si están definidos
      let url = `${API_BASE_URL}/validar-tarjetas/sucursal/${encodeURIComponent(sucursal)}`;
      const params = new URLSearchParams();
      
      if (fechaInicio) {
        params.append('fechaInicio', fechaInicio);
      }
      if (fechaFin) {
        params.append('fechaFin', fechaFin);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await axios.get(url);
      const datosSucursal = res.data.datos || [];
      
      if (datosSucursal.length === 0) {
        alert(`❌ No hay datos de tarjetas duplicadas para la sucursal: ${sucursal}`);
        return;
      }

      // Preparar datos para Excel
      const datosExcel = datosSucursal.map(item => ({
        "Sucursal": sucursal,
        "Tarjeta": item.tarjeta || "",
        "Clientes Distintos": item.clientesDistintos || 0,
        "Veces Usado": item.vecesUsado || 0,
        "Última Fecha": item.ultimaFechaRegistro ? 
          (() => {
            const dateStr = item.ultimaFechaRegistro;
            if (dateStr.includes('-')) {
              const [year, month, day] = dateStr.split('T')[0].split('-');
              return `${day}/${month}/${year}`;
            }
            return dateStr;
          })() : 
          "Sin fecha",
        "Lista de Clientes": item.clientes ? item.clientes.join(' | ') : "",
        "Fecha de Descarga": new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      // Crear y descargar archivo Excel
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 20 }, // Sucursal
        { wch: 20 }, // Tarjeta
        { wch: 12 }, // Clientes Distintos
        { wch: 12 }, // Veces Usado
        { wch: 15 }, // Última Fecha
        { wch: 50 }, // Lista de Clientes
        { wch: 20 }  // Fecha de Descarga
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, "Tarjetas Duplicadas");
      
      const nombreArchivo = `tarjetas_duplicadas_${sucursal.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      
      alert(`✅ Archivo descargado: ${nombreArchivo}\n📊 ${datosSucursal.length} registros exportados`);
      
    } catch (error) {
      console.error("Error al descargar datos de la sucursal:", error);
      alert(`❌ Error al descargar datos: ${error.message}`);
    } finally {
      setCargandoModal(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 layout-transition">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10 layout-transition">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 drop-shadow-lg">
              💳 Tarjetas Duplicadas por Sucursal
            </h1>
            <p className="text-gray-300 mt-2 text-lg">
              Análisis detallado de tarjetas duplicadas en cada sucursal
            </p>
          </div>
          <div className="flex gap-3">
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
                {estadisticasGenerales.total_tarjetas_duplicadas}
              </div>
              <div className="text-gray-300 text-sm font-medium">Tarjetas Duplicadas</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-yellow-400 text-3xl font-bold mb-2">
                {estadisticasGenerales.total_clientes_afectados}
              </div>
              <div className="text-gray-300 text-sm font-medium">Clientes Afectados</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg">
              <div className="text-purple-400 text-3xl font-bold mb-2">
                {estadisticasGenerales.promedio_tarjetas_por_sucursal}
              </div>
              <div className="text-gray-300 text-sm font-medium">Promedio por Sucursal</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre de sucursal..."
              className="border border-gray-600/50 bg-gray-900/50 text-gray-100 placeholder-gray-400 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className="flex flex-col">
              <label className="text-gray-300 text-sm mb-1">📅 Fecha Inicio:</label>
              <input
                type="date"
                className="border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-300 text-sm mb-1">📅 Fecha Fin:</label>
              <input
                type="date"
                className="border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <button
              onClick={cargarDatos}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Tabla de resultados */}
        {cargando ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-blue-400 text-lg font-medium">Cargando datos de tarjetas duplicadas...</p>
          </div>
        ) : (
          <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-gray-100">
                    <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                      🏢 Sucursal
                    </th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                      💳 Tarjetas Duplicadas
                    </th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide border-r border-gray-600/30">
                      👥 Clientes Afectados
                    </th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wide">
                      🔧 Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {datosFiltrados.map((item, index) => {
                    return (
                      <tr 
                        key={index} 
                        className={`${index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'} hover:bg-gray-600/30 transition-colors duration-200`}
                      >
                        <td className="px-6 py-4 text-gray-200 font-medium border-r border-gray-600/20">
                          {item.sucursal}
                        </td>
                        <td className="px-6 py-4 text-gray-200 border-r border-gray-600/20">
                          <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
                            {item.tarjetas_duplicadas}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-200 border-r border-gray-600/20">
                          <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">
                            {item.clientes_afectados}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => cargarTarjetasPorSucursal(item.sucursal)}
                              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                              disabled={cargandoModal}
                            >
                              {cargandoModal ? "⏳" : "👁️"} Ver
                            </button>
                            <button
                              onClick={() => descargarDatosSucursal(item.sucursal)}
                              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                              disabled={cargandoModal}
                            >
                              {cargandoModal ? "⏳" : "📥"} Descargar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {datosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💳</div>
                  <p className="text-gray-400 text-lg font-medium">
                    No se encontraron tarjetas duplicadas con los filtros aplicados
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal para mostrar tarjetas de una sucursal */}
        {modalSucursal.mostrar && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-2 pt-4">
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-2xl max-w-7xl w-full max-h-[96vh] overflow-hidden flex flex-col">
              <div className="sticky top-0 z-10 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600/50 p-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <span className="text-xl">💳</span>
                    Tarjetas Duplicadas - {modalSucursal.sucursal}
                  </h3>
                  <button 
                    onClick={cerrarModal}
                    className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg p-3 transition-all duration-200 text-xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center hover:scale-110"
                    title="Cerrar modal"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                {modalSucursal.datos.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💳</div>
                    <p className="text-gray-400">No hay tarjetas duplicadas en esta sucursal</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 text-gray-100">
                          <th className="px-4 py-3 font-semibold text-sm">💳 Tarjeta</th>
                          <th className="px-4 py-3 font-semibold text-sm">👥 # Clientes</th>
                          <th className="px-4 py-3 font-semibold text-sm">� Nombres de Clientes</th>
                          <th className="px-4 py-3 font-semibold text-sm">�🔢 Veces Usado</th>
                          <th className="px-4 py-3 font-semibold text-sm">📅 Última Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalSucursal.datos.map((item, index) => (
                          <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/20'}`}>
                            <td className="px-4 py-3 text-gray-200 font-mono text-sm">
                              {item.tarjeta}
                            </td>
                            <td className="px-4 py-3 text-gray-200">
                              <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-medium">
                                {item.clientesDistintos}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-200 max-w-xs">
                              <div className="space-y-1">
                                {item.clientes && item.clientes.length > 0 ? (
                                  item.clientes.map((cliente, clienteIndex) => (
                                    <div key={clienteIndex} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs inline-block mr-1 mb-1">
                                      {cliente}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">Sin datos de clientes</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-200">
                              <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-medium">
                                {item.vecesUsado}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-300 text-sm">
                              {item.ultimaFechaRegistro ? 
                                (() => {
                                  const dateStr = item.ultimaFechaRegistro;
                                  if (dateStr.includes('-')) {
                                    const [year, month, day] = dateStr.split('T')[0].split('-');
                                    return `${day}/${month}/${year}`;
                                  }
                                  return dateStr;
                                })() : 
                                'Sin fecha'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
