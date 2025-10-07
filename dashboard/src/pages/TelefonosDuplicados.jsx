import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../config.js";

export default function TelefonosDuplicados() {
  const [datos, setDatos] = useState([]);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState(null);
  const [bloques, setBloques] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [bloque, setBloque] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  
  // 🆕 Estados para el modal de teléfonos por sucursal
  const [modalSucursal, setModalSucursal] = useState({ mostrar: false, sucursal: '', datos: [] });
  const [cargandoModal, setCargandoModal] = useState(false);

  useEffect(() => {
    cargarDatos();
    cargarBloques();
  }, []);

  const cargarBloques = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/bloques`);
      setBloques(res.data);
    } catch (error) {
      console.error("Error al cargar bloques:", error);
    }
  };

  // Efecto para manejar el scroll del body cuando el modal está abierto
  useEffect(() => {
    if (modalSucursal.mostrar) {
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
      // Asegurar que el modal esté en el top
      window.scrollTo(0, 0);
      
      // Agregar listener para la tecla ESC
      const handleEsc = (event) => {
        if (event.keyCode === 27) {
          cerrarModal();
        }
      };
      document.addEventListener('keydown', handleEsc);
      
      return () => {
        document.removeEventListener('keydown', handleEsc);
      };
    } else {
      // Restaurar scroll del body cuando el modal se cierra
      document.body.style.overflow = 'unset';
    }

    // Cleanup function para restaurar el scroll si el componente se desmonta
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalSucursal.mostrar]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      
      // Construir URL con parámetros de filtros si están definidos
      let url = `${API_BASE_URL}/dashboard-sucursales-duplicados`;
      const params = new URLSearchParams();
      
      if (fechaInicio) {
        params.append('fechaInicio', fechaInicio);
      }
      if (fechaFin) {
        params.append('fechaFin', fechaFin);
      }
      if (bloque) {
        params.append('bloque', bloque);
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


  // 🆕 Función para cargar teléfonos duplicados de una sucursal específica
  const cargarTelefonosPorSucursal = async (sucursal) => {
    setCargandoModal(true);
    try {
      // Construir URL con parámetros de filtros si están definidos
      let url = `${API_BASE_URL}/validar-telefonos/sucursal/${encodeURIComponent(sucursal)}`;
      const params = new URLSearchParams();
      
      if (fechaInicio) {
        params.append('fechaInicio', fechaInicio);
      }
      if (fechaFin) {
        params.append('fechaFin', fechaFin);
      }
      if (bloque) {
        params.append('bloque', bloque);
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
      console.error("Error al cargar teléfonos de la sucursal:", error);
      alert(`❌ Error al cargar datos de la sucursal: ${error.message}`);
    } finally {
      setCargandoModal(false);
    }
  };

  // 🆕 Función para cerrar el modal
  const cerrarModal = () => {
    setModalSucursal({ mostrar: false, sucursal: '', datos: [] });
    // Restaurar scroll del body inmediatamente
    document.body.style.overflow = 'unset';
  };

  // 🆕 Función para descargar datos de una sucursal específica
  const descargarDatosSucursal = async (sucursal) => {
    try {
      setCargandoModal(true);
      // Construir URL con parámetros de filtros si están definidos
      let url = `${API_BASE_URL}/validar-telefonos/sucursal/${encodeURIComponent(sucursal)}`;
      const params = new URLSearchParams();
      
      if (fechaInicio) {
        params.append('fechaInicio', fechaInicio);
      }
      if (fechaFin) {
        params.append('fechaFin', fechaFin);
      }
      if (bloque) {
        params.append('bloque', bloque);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await axios.get(url);
      const datosSucursal = res.data.datos || [];
      
      if (datosSucursal.length === 0) {
        alert(`❌ No hay datos de teléfonos duplicados para la sucursal: ${sucursal}`);
        return;
      }

      // Preparar datos para Excel
      const datosExcel = datosSucursal.map(item => ({
        "Sucursal": sucursal,
        "Teléfono": item.telefono || "",
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
        { wch: 15 }, // Teléfono
        { wch: 12 }, // Clientes Distintos
        { wch: 12 }, // Veces Usado
        { wch: 15 }, // Última Fecha
        { wch: 50 }, // Lista de Clientes
        { wch: 20 }  // Fecha de Descarga
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, "Teléfonos Duplicados");
      
      const nombreArchivo = `telefonos_duplicados_${sucursal.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
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
              📱 Teléfonos Duplicados por Sucursal
            </h1>
            <p className="text-gray-300 mt-2 text-lg">
              Análisis detallado de teléfonos duplicados en cada sucursal
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

        {/* Filtros */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre de sucursal..."
              className="border border-gray-600/50 bg-gray-900/50 text-gray-100 placeholder-gray-400 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className="flex flex-col">
              <label className="text-gray-300 text-sm mb-1">🏢 Bloque:</label>
              <select
                className="border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={bloque}
                onChange={(e) => setBloque(e.target.value)}
              >
                <option value="">Todos los bloques</option>
                {bloques.map((bloqueItem) => (
                  <option key={bloqueItem} value={bloqueItem}>
                    {bloqueItem}
                  </option>
                ))}
              </select>
            </div>
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
                    <th className="p-4 text-center font-semibold text-gray-100 min-w-[160px]">🔧 Acciones</th>
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
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => cargarTelefonosPorSucursal(item.sucursal)}
                              disabled={cargandoModal}
                              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-500 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100"
                              title={`Ver teléfonos duplicados de ${item.sucursal}`}
                            >
                              {cargandoModal ? "🔄" : "👁️ Ver"}
                            </button>
                            <button
                              onClick={() => descargarDatosSucursal(item.sucursal)}
                              disabled={cargandoModal}
                              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-500 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100"
                              title={`Descargar datos de ${item.sucursal}`}
                            >
                              {cargandoModal ? "⏳" : "💾"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center p-12">
                        <div className="text-gray-400 text-lg">
                          {busqueda ? 
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
              <strong className="text-gray-100">ℹ️ Información:</strong> Este dashboard muestra los teléfonos duplicados clasificados por sucursal y permite análisis detallado.
            </p>
          </div>
        </div>
      </div>
      
      {/* 🆕 Modal para mostrar teléfonos duplicados por sucursal */}
      {modalSucursal.mostrar && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          onClick={cerrarModal}
        >
          {/* Contenedor del modal */}
          <div className="min-h-screen flex items-start justify-center p-4 pt-8">
            <div 
              className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden border border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-gray-700/50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 mb-2">
                    📱 Teléfonos Duplicados - {modalSucursal.sucursal}
                  </h2>
                  <p className="text-gray-300">
                    {modalSucursal.datos.length} teléfonos problemáticos encontrados
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => descargarDatosSucursal(modalSucursal.sucursal)}
                    disabled={cargandoModal}
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100"
                  >
                    {cargandoModal ? "⏳ Descargando..." : "💾 Descargar Excel"}
                  </button>
                  <button
                    onClick={cerrarModal}
                    className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    ❌ Cerrar
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {modalSucursal.datos.length > 0 ? (
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-700/60 border-b-2 border-gray-600/50">
                          <th className="p-3 text-left font-semibold text-gray-100">📱 Teléfono</th>
                          <th className="p-3 text-center font-semibold text-gray-100">👥 Clientes</th>
                          <th className="p-3 text-center font-semibold text-gray-100">📊 Usos</th>
                          <th className="p-3 text-center font-semibold text-gray-100">📅 Última Fecha</th>
                          <th className="p-3 text-left font-semibold text-gray-100">📋 Lista de Clientes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/40">
                        {modalSucursal.datos.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-700/20 transition-colors duration-200">
                            <td className="p-3">
                              <span className="text-gray-100 font-mono text-sm font-medium bg-gray-700/40 px-3 py-2 rounded-lg">
                                {item.telefono}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg font-semibold border border-blue-500/30 text-sm">
                                {item.clientesDistintos}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg font-semibold border border-purple-500/30 text-sm">
                                {item.vecesUsado}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-sm font-medium border border-indigo-500/30">
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
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="max-w-md space-y-1">
                                {item.clientes && item.clientes.map((cliente, j) => (
                                  <span
                                    key={j}
                                    className="inline-block bg-gray-700/60 text-gray-200 px-2 py-1 rounded-lg text-sm mr-2 mb-1 border border-gray-600/40 font-medium"
                                  >
                                    {cliente}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <div className="text-xl text-gray-300 mb-2">¡Excelente!</div>
                  <div className="text-gray-400">
                    No se encontraron teléfonos duplicados en esta sucursal
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="bg-gray-800/60 p-4 border-t border-gray-700/50">
              <div className="flex justify-between items-center text-sm text-gray-400">
                <div>
                  📊 Mostrando {modalSucursal.datos.length} registros de teléfonos duplicados
                </div>
                <div>
                  🏢 Sucursal: <span className="text-gray-300 font-medium">{modalSucursal.sucursal}</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
