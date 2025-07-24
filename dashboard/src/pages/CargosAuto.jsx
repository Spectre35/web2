import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

export default function CargosAuto() {
  const [datos, setDatos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [procesadores, setProcesadores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [terminacion, setTerminacion] = useState("");
  const [procesadorSeleccionado, setProcesadorSeleccionado] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [total, setTotal] = useState(0);
  const [fechaUltima, setFechaUltima] = useState("");
  const [alertaProcesadores, setAlertaProcesadores] = useState([]);
  const [mostrarAlerta, setMostrarAlerta] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const limite = 1000;

  useEffect(() => {
    obtenerSucursales();
    obtenerProcesadores();
    obtenerDatos();
    // eslint-disable-next-line
  }, [pagina]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/cargos_auto/ultima-fecha`)
      .then((res) => setFechaUltima(formatearFecha(res.data.fecha)))
      .catch(() => setFechaUltima(""));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/cargos_auto/procesadores-alerta`)
      .then((res) => {
        setAlertaProcesadores(res.data);
        setMostrarAlerta(res.data.length > 0);
      })
      .catch((error) => console.error("Error al obtener alertas", error));
  }, []);

  const obtenerSucursales = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/sucursales`);
      setSucursales(res.data);
    } catch (error) {
      console.error("Error al obtener sucursales", error);
    }
  };

  // Nuevo: obtener procesadores individuales
  const obtenerProcesadores = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/cargos_auto/procesadores`);
      // Ordena y limpia solo para mostrar en el dropdown
      setProcesadores(
        res.data
          .filter(Boolean)
          .map(p => p.trim())
          .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
      );
    } catch (error) {
      setProcesadores([]);
    }
  };

  const obtenerDatos = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_BASE_URL}/cargos_auto`, {
        params: {
          cliente: busqueda,
          sucursal: sucursal,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto_min: montoMin,
          monto_max: montoMax,
          tarjeta: tarjeta,
          terminacion: terminacion,
          procesadores: procesadorSeleccionado, // <-- así
          pagina: pagina,
          limite: limite,
        },
        paramsSerializer: params => {
          // Serializa arrays como ?procesadores=KUSHKI&procesadores=NETPAY
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v));
            } else if (value !== undefined && value !== "") {
              searchParams.append(key, value);
            }
          });
          return searchParams.toString();
        }
      });
      setDatos(res.data.datos.map(formatearFechasEnObjeto));
      setTotal(res.data.total);
      setCargando(false);
    } catch (error) {
      setCargando(false);
    }
  };

  const exportarExcel = () => {
    const params = new URLSearchParams();
    if (busqueda) params.append("cliente", busqueda);
    if (sucursal) params.append("sucursal", sucursal);
    if (fechaInicio) params.append("fecha_inicio", fechaInicio);
    if (fechaFin) params.append("fecha_fin", fechaFin);
    if (montoMin) params.append("monto_min", montoMin);
    if (montoMax) params.append("monto_max", montoMax);
    if (tarjeta) params.append("tarjeta", tarjeta);
    if (terminacion) params.append("terminacion", terminacion);
    // Serializa procesadores como múltiples parámetros
    procesadorSeleccionado.forEach(p => params.append("procesadores", p));
    window.location.href = `${API_BASE_URL}/cargos_auto/exportar?${params.toString()}`;
  };

  const columnas = datos.length > 0 ? Object.keys(datos[0]) : [];
  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  // Nuevo: handler para seleccionar varios procesadores
  const handleProcesadoresChange = (e) => {
    const options = Array.from(e.target.selectedOptions);
    setProcesadorSeleccionado(options.map(opt => opt.value));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProcesadorToggle = (proc) => {
    setProcesadorSeleccionado((prev) =>
      prev.includes(proc)
        ? prev.filter((p) => p !== proc)
        : [...prev, proc]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-100">🔍 Buscador Cargos Auto</h1>
        <Link
          to="/"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
        >
          🏠 Ir al Home
        </Link>
      </div>

      {/* Información de última actualización */}
      <div className="mb-6">
        <span className="text-sm text-gray-300 font-semibold">
          Última actualización en base de datos:{" "}
          {fechaUltima || "Sin registros"}
        </span>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6 backdrop-blur-sm">
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
          {/* Nuevo: Select múltiple para procesadores */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded w-full text-left"
              onClick={() => setDropdownOpen((open) => !open)}
            >
              {procesadorSeleccionado.length > 0
                ? `Procesadores (${procesadorSeleccionado.length})`
                : "Selecciona procesadores"}
              <span className="float-right">&#9660;</span>
            </button>
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full max-h-40 overflow-auto bg-gray-900 border border-gray-700 rounded shadow-lg">
                {procesadores.map((proc, i) => (
                  <label
                    key={i}
                    className="flex items-center px-2 py-1 hover:bg-gray-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={procesadorSeleccionado.includes(proc)}
                      onChange={() => handleProcesadorToggle(proc)}
                      className="mr-2 accent-blue-500"
                    />
                    <span className="text-gray-100">{proc}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* Campo de tarjeta */}
          <input
            type="text"
            placeholder="Número tarjeta"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-2 rounded focus:ring-2 focus:ring-blue-500"
            value={tarjeta}
            onChange={e => setTarjeta(e.target.value)}
          />
          {/* Campo de terminación */}
          <input
            type="text"
            placeholder="Terminación tarjeta"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-400 p-2 rounded focus:ring-2 focus:ring-blue-500"
            value={terminacion}
            onChange={e => setTerminacion(e.target.value)}
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition font-semibold"
        >
          🔍 Buscar
        </button>
        <button
          onClick={exportarExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition font-semibold"
        >
          📥 Exportar a Excel
        </button>
      </div>

      {/* Tabla dinámica */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-lg">Cargando...</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700/50 text-left">
                  {columnas.map((col, i) => (
                    <th key={i} className="p-3 font-semibold text-gray-200">
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
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      {columnas.map((col, j) => (
                        <td key={j} className="p-3 text-gray-300">
                          {row[col]?.toString()}
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

      {/* Alerta procesadores inactivos */}
      {mostrarAlerta && alertaProcesadores.length > 0 && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-red-700/90 text-white p-6 rounded-xl shadow-xl font-bold min-w-[320px] max-w-[90vw]">
          <div className="flex justify-between items-center mb-2">
            <span>
              ⚠️ Procesadores con baja actividad en los últimos 2 días:
            </span>
            <button
              className="ml-4 text-white bg-red-900 rounded-full px-2 py-1 hover:bg-red-800 transition font-bold"
              onClick={() => setMostrarAlerta(false)}
              title="Cerrar alerta"
            >
              ✕
            </button>
          </div>
          <ul className="mt-2 list-disc ml-6">
            {alertaProcesadores.map((p, i) => (
              <li key={i}>
                {p.Cobrado_Por}:{" "}
                {p.monto_total !== undefined
                  ? `$${Number(p.monto_total).toLocaleString()}`
                  : ""}
                {p.ultima_fecha
                  ? ` (última: ${formatearFecha(p.ultima_fecha)})`
                  : " (Sin registro)"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
