import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import DetonArturo from "../assets/detonarturo.png";
import { formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

// Componente Modal para mostrar detalles de sucursales
function ModalDetalleSucursales({ vendedora, isOpen, onClose }) {
  const [detalles, setDetalles] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);

  useEffect(() => {
    if (isOpen && vendedora) {
      setCargandoModal(true);
      axios.get(`${API_BASE_URL}/vendedoras-detalle-sucursales`, {
        params: { nombre: vendedora.nombre }
      })
        .then(res => {
          console.log('Datos recibidos del servidor:', res.data);
          const sucursalesConFormato = res.data.map(sucursal => ({
            ...sucursal,
            // Normalizar nombres de propiedades a camelCase
            totalRegistros: sucursal.totalregistros || sucursal.totalRegistros || 0,
            ultimaFecha: (() => {
              const dateStr = sucursal.ultimafecha || sucursal.ultimaFecha;
              if (dateStr && dateStr.includes('-')) {
                const [year, month, day] = dateStr.split('T')[0].split('-');
                return `${day}/${month}/${year}`;
              }
              return dateStr || '-';
            })()
          }));
          console.log('Datos procesados:', sucursalesConFormato);
          setDetalles(sucursalesConFormato);
        })
        .catch(err => {
          console.error('Error al cargar detalles de sucursales:', err);
          setDetalles([]);
        })
        .finally(() => setCargandoModal(false));
    }
  }, [isOpen, vendedora]);

  // Manejar tecla Escape y limpieza
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        // Limpiar overflow del body al desmontar
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title text-2xl">Detalle de Sucursales</h2>
            <p className="text-blue-200 mt-1">
              Vendedora: <span className="font-semibold">{vendedora?.nombre}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="modal-close-button"
          >
            ×
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="modal-content max-h-[60vh] overflow-y-auto">
          {cargandoModal ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-300">Cargando detalles...</span>
            </div>
          ) : detalles.length === 0 ? (
            <div className="text-center py-12">
              <img src={DetonArturo} alt="Sin datos" className="w-16 h-16 mx-auto mb-4 rounded-full opacity-50" />
              <p className="text-gray-400">No se encontraron registros para esta vendedora</p>
            </div>
          ) : (
            <>
              {/* Estadísticas Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 p-4 rounded-lg border border-green-500/30">
                  <div className="text-green-400 text-sm font-medium">Total Sucursales</div>
                  <div className="text-2xl font-bold text-white">{detalles.length}</div>
                </div>
                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-blue-400 text-sm font-medium">Total Registros</div>
                  <div className="text-2xl font-bold text-white">
                    {detalles.reduce((sum, s) => sum + (s.totalRegistros || 0), 0)}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-purple-400 text-sm font-medium">Sucursal Más Activa</div>
                  <div className="text-lg font-bold text-white truncate">
                    {detalles.sort((a, b) => (b.totalRegistros || 0) - (a.totalRegistros || 0))[0]?.sucursal || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Tabla de Sucursales */}
              <div className="overflow-x-auto">
                <table className="w-full bg-gray-800/50 rounded-lg overflow-hidden">
                  <thead className="bg-gray-700/80">
                    <tr>
                      <th className="text-left p-4 text-gray-200 font-semibold">Sucursal</th>
                      <th className="text-left p-4 text-gray-200 font-semibold">Bloque</th>
                      <th className="text-center p-4 text-gray-200 font-semibold">Total Registros</th>
                      <th className="text-center p-4 text-gray-200 font-semibold">Último Registro</th>
                      <th className="text-center p-4 text-gray-200 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {detalles
                      .sort((a, b) => (b.totalRegistros || 0) - (a.totalRegistros || 0))
                      .map((detalle, index) => {
                        const esReciente = (() => {
                          if (!detalle.ultimaFecha || detalle.ultimaFecha === '-') return false;
                          const [day, month, year] = detalle.ultimaFecha.split('/');
                          const fechaRegistro = new Date(year, month - 1, day);
                          const hace30Dias = new Date();
                          hace30Dias.setDate(hace30Dias.getDate() - 30);
                          return fechaRegistro >= hace30Dias;
                        })();

                        return (
                          <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-white">{detalle.sucursal}</div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-sm">
                                {detalle.bloque}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-bold text-blue-400 text-lg">
                                {detalle.totalRegistros || 0}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-gray-300">
                                {detalle.ultimaFecha}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                esReciente 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              }`}>
                                {esReciente ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="modal-button modal-button-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendedorasStatus() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [vendedoraSeleccionada, setVendedoraSeleccionada] = useState(null);

  const abrirModal = (vendedora) => {
    setVendedoraSeleccionada(vendedora);
    setModalAbierto(true);
    // Desplazar la página al tope para que el modal se vea correctamente
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setVendedoraSeleccionada(null);
    // Restaurar scroll del body
    document.body.style.overflow = 'unset';
  };

  useEffect(() => {
    setCargando(true);
    console.log("🔍 Buscando vendedoras con término:", busqueda);
    
    axios.get(`${API_BASE_URL}/vendedoras-status`, {
      params: busqueda ? { nombre: busqueda } : {}
    })
      .then(res => {
        console.log("📊 Vendedoras recibidas:", res.data.length);
        console.log("📄 Primeras 3 vendedoras:", res.data.slice(0, 3));
        setDatos(res.data);
      })
      .catch(err => {
        console.error("❌ Error al cargar vendedoras:", err);
      })
      .finally(() => setCargando(false));
  }, [busqueda]);

  // Calcula estatus y color
  const vendedoras = useMemo(() => {
    console.log("🔄 Procesando vendedoras:", datos.length);
    
    const hoy = new Date();
    const fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth() - 2, hoy.getDate());
    
    const procesadas = datos.map(v => {
      console.log("👤 Procesando vendedora:", v);
      
      let fecha = v.fechaultima; // <-- usa el nombre tal como llega del backend
      if (fecha && typeof fecha === "object" && fecha.toISOString) {
        fecha = fecha.toISOString().slice(0, 10);
      } else if (fecha && typeof fecha === "string") {
        fecha = fecha.slice(0, 10);
      } else {
        fecha = "-";
      }
      let estatus = "Inactiva";
      let color = "bg-yellow-400 text-gray-900";
      let icon = (
        <img
          src={DetonArturo}
          alt="Inactiva"
          className="inline-block w-6 h-6 rounded-full mr-2 align-middle"
          style={{ verticalAlign: "middle" }}
        />
      );
      if (fecha && new Date(fecha) >= fechaLimite) {
        estatus = "Activa";
        color = "bg-green-600 text-white";
        icon = null;
      }
      
      const resultado = {
        nombre: v.nombre,
        bloque: v.Bloque || v.bloque, // Soportar ambos formatos
        sucursal: v.Sucursal || v.sucursal, // Soportar ambos formatos
        fechaUltima: formatearFecha(fecha),
        estatus,
        color,
        icon,
      };
      
      console.log("✅ Vendedora procesada:", resultado);
      return resultado;
    });
    
    console.log("📊 Total vendedoras procesadas:", procesadas.length);
    return procesadas;
  }, [datos]);

  // Cambia el favicon al abrir la página
  useEffect(() => {
    const favicon = document.querySelector("link[rel*='icon']");
    if (favicon) {
      favicon.href = DetonArturo;
    }
    return () => {
      if (favicon) favicon.href = "/vite.svg";
    };
  }, []);

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-5xl mx-auto border border-white/20">
        <div className="flex justify-between mb-4 items-center">
          <div className="flex items-center gap-2">
            <img
              src={DetonArturo}
              alt="Detonada"
              className="w-8 h-8 rounded-full shadow-lg object-cover"
            />
            <h1 className="text-2xl font-bold mb-4 text-center text-gray-100 drop-shadow flex items-center">
              Buscador <span className="ml-2">Vendedoras Status</span>
            </h1>
          </div>
        </div>
        <div className="mb-4 flex gap-4 items-center">
          <input
            type="text"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded w-full max-w-xs"
            placeholder="Buscar vendedora por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        {cargando ? (
          <p className="text-center text-gray-400">Cargando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-gray-900/80 shadow-md rounded text-sm text-gray-100">
              <thead>
                <tr className="bg-gray-800/80 text-left">
                  <th className="p-2">Vendedora</th>
                  <th className="p-2">Bloque</th>
                  <th className="p-2">Sucursal</th>
                  <th className="p-2">Última Venta</th>
                  <th className="p-2">Estatus</th>
                  <th className="p-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vendedoras
                  .sort((a, b) => b.fechaUltima?.localeCompare(a.fechaUltima))
                  .map((v, i) => (
                  <tr key={i} className="hover:bg-gray-700/30 transition-colors">
                    <td className="p-2">{v.nombre}</td>
                    <td className="p-2">{v.bloque}</td>
                    <td className="p-2">{v.sucursal}</td>
                    <td className="p-2">{v.fechaUltima || "-"}</td>
                    <td className={`p-2 font-bold rounded flex items-center ${v.color}`}>
                      {v.icon}
                      {v.estatus}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => abrirModal(v)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 mx-auto"
                        title="Ver detalles de sucursales"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle de sucursales */}
      <ModalDetalleSucursales 
        vendedora={vendedoraSeleccionada}
        isOpen={modalAbierto}
        onClose={cerrarModal}
      />
    </div>
  );
}