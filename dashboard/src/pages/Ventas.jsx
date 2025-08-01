import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { block } from "million/react";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";
import { useMainScroll } from "../layouts/DashboardLayout";

export default function Ventas() {
  const [datos, setDatos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [terminacion, setTerminacion] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [total, setTotal] = useState(0);
  const [fechaUltima, setFechaUltima] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const limite = 100; // límite optimizado
  const mainRef = useMainScroll();

  // Referencias para optimizar el scroll
  const scrollTopRef = useRef(null);
  const tableContainerRef = useRef(null);
  const throttleTimeoutRef = useRef(null);

  // Función de throttling para el scroll
  const throttleScroll = useCallback((callback, delay = 16) => {
    return (...args) => {
      if (!throttleTimeoutRef.current) {
        throttleTimeoutRef.current = requestAnimationFrame(() => {
          callback(...args);
          throttleTimeoutRef.current = null;
        });
      }
    };
  }, []);

  // Handlers optimizados para scroll
  const handleTopScroll = throttleScroll((e) => {
    if (tableContainerRef.current && !tableContainerRef.current.isScrolling) {
      tableContainerRef.current.scrollLeft = e.target.scrollLeft;
    }
  });

  const handleTableScroll = throttleScroll((e) => {
    if (scrollTopRef.current && !scrollTopRef.current.isScrolling) {
      scrollTopRef.current.scrollLeft = e.target.scrollLeft;
    }
  });

  useEffect(() => {
    obtenerSucursales();
    obtenerDatos();
    // eslint-disable-next-line
  }, [pagina]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/ventas/ultima-fecha`)
      .then((res) => setFechaUltima(formatearFecha(res.data.fecha)))
      .catch(() => setFechaUltima(""));
  }, []);

  const obtenerSucursales = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/sucursales`);
      setSucursales(res.data);
    } catch (error) {
      console.error("Error al obtener sucursales", error);
    }
  };

  const obtenerDatos = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_BASE_URL}/ventas`, {
        params: {
          cliente: busqueda,
          sucursal: sucursal,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto_min: montoMin,
          monto_max: montoMax,
          tarjeta: tarjeta,
          terminacion: terminacion,
          pagina: pagina,
          limite: limite,
        },
      });
      setDatos(res.data.datos.map(formatearFechasEnObjeto));
      setTotal(res.data.total);
      setCargando(false);
    } catch (error) {
      setCargando(false);
    }
  };

  const exportarExcel = () => {
    const params = new URLSearchParams({
      cliente: busqueda,
      sucursal: sucursal,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      monto_min: montoMin,
      monto_max: montoMax,
      tarjeta: tarjeta,
      terminacion: terminacion,
    });
    window.location.href = `${API_BASE_URL}/ventas/exportar?${params.toString()}`;
  };

  const columnas = datos.length > 0 ? Object.keys(datos[0]) : [];
  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/20">
        <div className="flex justify-between mb-4">
          <h1 className="text-2xl font-bold mb-4 text-center text-gray-100 drop-shadow">
            🔍 Buscador Reporte de Prevencion
          </h1>
        </div>
        <span className="text-sm text-gray-300 font-semibold">
          Última actualización en base de datos:{" "}
          {fechaUltima ? fechaUltima.slice(0, 10) : "Sin registros"}
        </span>
        {/* Filtros */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((suc, i) => (
                <option key={i} value={suc}>
                  {suc}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
            <input
              type="date"
              className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
            <input
              type="number"
              placeholder="Monto mínimo"
              className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={montoMin}
              onChange={(e) => setMontoMin(e.target.value)}
            />
            <input
              type="number"
              placeholder="Monto máximo"
              className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={montoMax}
              onChange={(e) => setMontoMax(e.target.value)}
            />
            <input
              type="text"
              placeholder="Número tarjeta"
              className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={tarjeta}
              onChange={(e) => setTarjeta(e.target.value)}
            />
            <input
              type="text"
              placeholder="Terminación tarjeta"
              className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={terminacion}
              onChange={(e) => setTerminacion(e.target.value)}
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setPagina(1);
              obtenerDatos();
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-all duration-300"
          >
            🔍 Buscar
          </button>
          <button
            onClick={exportarExcel}
            className="bg-gradient-to-r from-green-600 to-green-400 hover:from-green-700 hover:to-green-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-all duration-300"
          >
            📥 Exportar a Excel
          </button>
        </div>
        {/* Tabla dinámica con scroll sincronizado optimizado */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden w-full">
          {/* Barra de scroll horizontal superior sincronizada */}
          <div
            ref={scrollTopRef}
            className="overflow-x-auto mb-2 bg-gray-700/50 p-1 rounded"
            onScroll={handleTopScroll}
            style={{ scrollbarWidth: "thin" }}
          >
            <div
              style={{
                width: `${Math.max(1200, columnas.length * 300)}px`,
                height: "12px",
                background:
                  "linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%)",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* Contenedor de la tabla sincronizada */}
          <div
            ref={tableContainerRef}
            className="overflow-x-auto table-container"
            onScroll={handleTableScroll}
            style={{ scrollbarWidth: "thin" }}
          >
            {cargando ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-lg">Cargando...</div>
              </div>
            ) : (
              <table
                className="w-full text-sm"
                style={{ minWidth: `${Math.max(1200, columnas.length * 120)}px` }}
              >
                <thead>
                  <tr className="bg-gray-700/50 text-left">
                    {columnas.map((col, i) => (
                      <th
                        key={i}
                        className="p-3 font-semibold text-gray-200 whitespace-nowrap border-r border-gray-600/30 last:border-r-0"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.length > 0 ? (
                    datos.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors"
                      >
                        {columnas.map((col, j) => (
                          <td
                            key={j}
                            className="p-3 text-gray-300 whitespace-nowrap border-r border-gray-600/20 last:border-r-0"
                          >
                            {col === "FechaCompra" && row[col]
                              ? row[col].slice(0, 10)
                              : row[col]?.toString()}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columnas.length}
                        className="text-center p-8 text-gray-500"
                      >
                        No hay resultados para mostrar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Paginación */}
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setPagina((p) => Math.max(p - 1, 1))}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
            disabled={pagina === 1}
          >
            ← Anterior
          </button>
          <span className="text-gray-300 font-medium">
            Página {pagina} de {totalPaginas} | Total: {total} registros
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
            disabled={pagina === totalPaginas}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
