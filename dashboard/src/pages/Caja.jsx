import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

export default function Caja() {
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
  const limite = 1000; // o el valor que uses

  useEffect(() => {
    obtenerSucursales();
    obtenerDatos();
    // eslint-disable-next-line
  }, [pagina]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/caja/ultima-fecha`)
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
      const res = await axios.get(`${API_BASE_URL}/caja`, {
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
    window.location.href = `${API_BASE_URL}/caja/exportar?${params.toString()}`;
  };

  // Definir el orden específico de las columnas para la tabla Caja
  const ordenColumnasDeseado = [
    "id", "Cliente", "Fecha", "TipoComprobante", "Cobro", "Total", 
    "Concepto", "Sucursal", "FolioRecibo", "es_euroskin_str", 
    "FormaPago", "AplicadoA", "Terminal"
  ];

  // Obtener columnas disponibles y ordenarlas según el orden deseado
  const columnasDisponibles = datos.length > 0 ? Object.keys(datos[0]) : [];
  const columnas = ordenColumnasDeseado.filter(col => columnasDisponibles.includes(col));

  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/20">
        <div className="flex justify-between mb-4">
          <h1 className="text-2xl font-bold mb-4 text-center text-gray-100 drop-shadow">
            💵 Buscador Caja
          </h1>
          <Link
            to="/"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
          >
            🏠 Ir al Home
          </Link>
        </div>
        <span className="text-sm text-gray-300 font-semibold">
          Última actualización en base de datos:{" "}
          {fechaUltima ? fechaUltima.slice(0, 10) : "Sin registros"}
        </span>

        {/* Filtros */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
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
                      <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors">
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
      </div>
    </div>
  );
}
