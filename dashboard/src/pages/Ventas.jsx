import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";

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
  const limite = 1000;

  useEffect(() => {
    obtenerSucursales();
    obtenerDatos();
    // eslint-disable-next-line
  }, [pagina]);

  useEffect(() => {
    axios
      .get("http://192.168.1.111:3000/ventas/ultima-fecha")
      .then((res) => setFechaUltima(formatearFecha(res.data.fecha)))
      .catch(() => setFechaUltima(""));
  }, []);

  const obtenerSucursales = async () => {
    try {
      const res = await axios.get("http://192.168.1.111:3000/sucursales");
      setSucursales(res.data);
    } catch (error) {
      console.error("Error al obtener sucursales", error);
    }
  };

  const obtenerDatos = async () => {
    try {
      setCargando(true);
      const res = await axios.get("http://192.168.1.111:3000/ventas", {
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
    window.location.href = `http://192.168.1.111:3000/ventas/exportar?${params.toString()}`;
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
          <Link
            to="/"
            className="bg-gray-700/80 text-white px-3 py-2 rounded hover:bg-gray-600/80 transition"
          >
            ⬅ Volver al Home
          </Link>
        </div>
        <span className="text-sm text-gray-300 font-semibold">
          Última actualización en base de datos:{" "}
          {fechaUltima ? fechaUltima.slice(0, 10) : "Sin registros"}
        </span>
        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
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
        {/* Tabla dinámica - MÁS COMPACTA + SCROLL ARRIBA FUNCIONAL */}
        <div className="w-full">
          {/* Barra de scroll horizontal arriba - SINCRONIZADA */}
          <div
            className="overflow-x-auto mb-2 bg-gray-700/50 p-1 rounded scroll-top"
            onScroll={(e) => {
              const tableContainer = document.querySelector(".table-container");
              if (tableContainer) {
                tableContainer.scrollLeft = e.target.scrollLeft;
              }
            }}
          >
            <div
              style={{
                width: `${Math.max(3000, columnas.length * 280)}px`, // DINÁMICO
                height: "16px",
                backgroundColor: "#4B5563",
                borderRadius: "4px",
              }}
            >
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-[10px] text-gray-300 select-none">
                  ← Scroll horizontal →
                </span>
              </div>
            </div>
          </div>

          {/* Tabla principal con sincronización */}
          <div
            className="overflow-x-auto table-container"
            onScroll={(e) => {
              const scrollTop = document.querySelector(".scroll-top");
              if (scrollTop) {
                scrollTop.scrollLeft = e.target.scrollLeft;
              }
            }}
          >
            {cargando ? (
              <p className="text-center text-gray-400">Cargando...</p>
            ) : (
              <table
                className="w-full bg-gray-900/80 shadow-md rounded text-xs text-gray-100"
                style={{ minWidth: `${Math.max(3000, columnas.length * 180)}px` }} // MISMO ANCHO DINÁMICO
              >
                <thead>
                  <tr className="bg-gray-800/80 text-left">
                    {columnas.map((col, i) => (
                      <th
                        key={i}
                        className="px-1 py-1.5 font-semibold whitespace-nowrap text-xs border-r border-gray-700 last:border-r-0"
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
                        className="border-b border-gray-800 hover:bg-gray-800/60"
                      >
                        {columnas.map((col, j) => (
                          <td
                            key={j}
                            className="px-1 py-1 whitespace-nowrap text-xs border-r border-gray-700/50 last:border-r-0"
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
      </div>
    </div>
  );
}
