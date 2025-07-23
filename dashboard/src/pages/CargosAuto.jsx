import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";

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
      .get("http://192.168.1.111:3000/cargos_auto/ultima-fecha")
      .then((res) => setFechaUltima(formatearFecha(res.data.fecha)))
      .catch(() => setFechaUltima(""));
  }, []);

  useEffect(() => {
    axios
      .get("http://192.168.1.111:3000/cargos_auto/procesadores-alerta")
      .then((res) => {
        setAlertaProcesadores(res.data);
        setMostrarAlerta(res.data.length > 0);
      })
      .catch((error) => console.error("Error al obtener alertas", error));
  }, []);

  const obtenerSucursales = async () => {
    try {
      const res = await axios.get("http://192.168.1.111:3000/sucursales");
      setSucursales(res.data);
    } catch (error) {
      console.error("Error al obtener sucursales", error);
    }
  };

  // Nuevo: obtener procesadores individuales
  const obtenerProcesadores = async () => {
    try {
      const res = await axios.get("http://192.168.1.111:3000/cargos_auto/procesadores");
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
      const res = await axios.get("http://192.168.1.111:3000/cargos_auto", {
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
    window.location.href = `http://192.168.1.111:3000/cargos_auto/exportar?${params.toString()}`;
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
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/20">
        <div className="flex justify-between mb-4">
          <h1 className="text-2xl font-bold mb-4 text-center text-gray-100 drop-shadow">
            🔍 Buscador Cargos Auto
          </h1>
          <Link
            to="/"
            className="bg-gray-700/80 text-white px-3 py-2 rounded hover:bg-gray-600/80 transition"
          >
            ⬅ Volver al Home
          </Link>
        </div>
        <span className="text-sm text-gray-300 font-semibold">
          Última actualización en base de datos:{" "}
          {fechaUltima || "Sin registros"}
        </span>
        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
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
          <button
            onClick={() => {
              setPagina(1);
              obtenerDatos();
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-2 rounded shadow hover:from-blue-700 hover:to-blue-500 col-span-2 transition"
          >
            Filtrar
          </button>
          <button
            onClick={exportarExcel}
            className="bg-gradient-to-r from-green-600 to-green-400 text-white p-2 rounded shadow hover:from-green-700 hover:to-green-500 col-span-2 transition"
          >
            📥 Exportar a Excel
          </button>
        </div>
        {/* Tabla dinámica */}
        <div className="overflow-x-auto">
          {cargando ? (
            <p className="text-center text-gray-400">Cargando...</p>
          ) : (
            <table className="w-full bg-gray-900/80 shadow-md rounded text-sm text-gray-100">
              <thead>
                <tr className="bg-gray-800/80 text-left">
                  {columnas.map((col, i) => (
                    <th key={i} className="p-2 font-semibold">
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
                      className="border-b border-gray-800 hover:bg-gray-800/60"
                    >
                      {columnas.map((col, j) => (
                        <td key={j} className="p-2">
                          {row[col]?.toString()}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columnas.length}
                      className="text-center p-4 text-gray-500"
                    >
                      No hay resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* Paginación */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setPagina((p) => Math.max(p - 1, 1))}
            className="bg-gray-700/80 px-3 py-1 rounded hover:bg-gray-600/80 text-white"
            disabled={pagina === 1}
          >
            ◀ Anterior
          </button>
          <span className="font-semibold text-gray-200">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
            className="bg-gray-700/80 px-3 py-1 rounded hover:bg-gray-600/80 text-white"
            disabled={pagina === totalPaginas}
          >
            Siguiente ▶
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
    </div>
  );
}
