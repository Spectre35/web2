import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

export default function Aclaraciones() {
  const [datos, setDatos] = useState([]);
  const [procesadores, setProcesadores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [procesador, setProcesador] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [total, setTotal] = useState(0);
  const [fechaUltima, setFechaUltima] = useState("");
  const limite = 1000;

  useEffect(() => {
    obtenerDatos();
  }, [pagina]);

  useEffect(() => {
    obtenerProcesadores();
    obtenerSucursales();
  }, []);

  const obtenerProcesadores = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/aclaraciones/procesadores`);
      const data = await response.json();
      setProcesadores(data);
    } catch (error) {
      console.error("Error al obtener procesadores:", error);
    }
  };

  const obtenerSucursales = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/aclaraciones/sucursales`);
      const data = await response.json();
      setSucursales(data);
    } catch (error) {
      console.error("Error al obtener sucursales:", error);
    }
  };

  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        pagina,
        limite,
        ...(busqueda && { busqueda }),
        ...(procesador && { procesador }),
        ...(sucursal && { sucursal }),
        ...(fechaInicio && { fecha_inicio: fechaInicio }),
        ...(fechaFin && { fecha_fin: fechaFin }),
        ...(montoMin && { monto_min: montoMin }),
        ...(montoMax && { monto_max: montoMax }),
      });

      const response = await fetch(`${API_BASE_URL}/aclaraciones?${params}`);
      const data = await response.json();
      
      setDatos((data.datos || []).map(formatearFechasEnObjeto));
      setTotal(data.total || 0);

      // Obtener última fecha
      const fechaResponse = await fetch(`${API_BASE_URL}/aclaraciones/ultima-fecha`);
      const fechaData = await fechaResponse.json();
      setFechaUltima(fechaData.fecha ? formatearFecha(fechaData.fecha) : "No disponible");
    } catch (error) {
      console.error("Error al obtener datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const exportarExcel = () => {
    const datosExcel = datos.map(row => ({
      "Procesador": row.PROCESADOR || "",
      "Año": row.AÑO || "",
      "Mes Petición": row.MES_PETICION || "",
      "EuroSkin": row.EUROSKIN ? "SÍ" : "NO",
      "ID Comercio": row.ID_DEL_COMERCIO_AFILIACION || "",
      "Nombre Comercio": row.NOMBRE_DEL_COMERCIO || "",
      "ID Transacción": row.ID_DE_TRANSACCION || "",
      "Fecha Venta": row.FECHA_VENTA || "",
      "Monto": row.MONTO || "",
      "Num. Tarjeta": row.NUM_DE_TARJETA || "",
      "Autorización": row.AUTORIZACION || "",
      "Cliente": row.CLIENTE || "",
      "Vendedora": row.VENDEDORA || "",
      "Sucursal": row.SUCURSAL || "",
      "Fecha Contrato": row.FECHA_CONTRATO || "",
      "Paquete": row.PAQUETE || "",
      "Bloque": row.BLOQUE || "",
      "Fecha Petición": row.FECHA_DE_PETICION || "",
      "Fecha Respuesta": row.FECHA_DE_RESPUESTA || "",
      "Comentarios": row.COMENTARIOS || "",
      "Captura CC": row.CAPTURA_CC || "",
      "Monto MXN": row.MONTO_MNX || ""
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aclaraciones");
    XLSX.writeFile(wb, `aclaraciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columnas = datos.length > 0 ? Object.keys(datos[0]) : [];
  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-100">💳 Aclaraciones</h1>
        <div className="flex gap-3">
          <Link 
            to="/ingresar-aclaraciones" 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition font-semibold"
          >
            📝 Ingresar Datos
          </Link>
          <Link 
            to="/" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
          >
            🏠 Ir al Home
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="🔍 Buscar cliente, tarjeta, ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          
          <select
            value={procesador}
            onChange={(e) => setProcesador(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">🏦 Todos los procesadores</option>
            {procesadores.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">🏢 Todas las sucursales</option>
            {sucursales.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={exportarExcel}
            disabled={!datos.length}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            📊 Exportar Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />

          <input
            type="number"
            placeholder="💰 Monto mínimo"
            value={montoMin}
            onChange={(e) => setMontoMin(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />

          <input
            type="number"
            placeholder="💰 Monto máximo"
            value={montoMax}
            onChange={(e) => setMontoMax(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          <button
            onClick={() => {
              setPagina(1);
              obtenerDatos();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            🔍 Buscar
          </button>
          
          <button
            onClick={() => {
              setBusqueda("");
              setProcesador("");
              setSucursal("");
              setFechaInicio("");
              setFechaFin("");
              setMontoMin("");
              setMontoMax("");
              setPagina(1);
            }}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            🔄 Limpiar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{total.toLocaleString()}</div>
            <div className="text-gray-300">Total Registros</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{procesadores.length}</div>
            <div className="text-gray-300">Procesadores</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{sucursales.length}</div>
            <div className="text-gray-300">Sucursales</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{fechaUltima}</div>
            <div className="text-gray-300">Última Actualización</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div className="mt-2 text-gray-300">Cargando...</div>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  {columnas.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600">
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-gray-900/30" : "bg-gray-800/30"}>
                    {columnas.map((col) => (
                      <td key={col} className="px-4 py-3 text-gray-200 border-b border-gray-700">
                        {row[col]?.toString() || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-gray-300">
          Página {pagina} de {totalPaginas} • {total.toLocaleString()} registros
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPagina(Math.max(1, pagina - 1))}
            disabled={pagina <= 1}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
            disabled={pagina >= totalPaginas}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
