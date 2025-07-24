import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

export default function IngresarAclaraciones() {
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [procesadores, setProcesadores] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [comentarios, setComentarios] = useState([]);

  // Array de nombres de meses
  const mesesNombres = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  // Estructura de columnas para aclaraciones (orden original de la base de datos)
  const columnas = [
    "PROCESADOR",
    "AÑO", 
    "MES_PETICION",
    "EUROSKIN",
    "ID_DEL_COMERCIO_AFILIACION",
    "NOMBRE_DEL_COMERCIO",
    "ID_DE_TRANSACCION",
    "FECHA_VENTA",
    "MONTO",
    "NUM_DE_TARJETA",
    "AUTORIZACION",
    "CLIENTE",
    "VENDEDORA",
    "SUCURSAL",
    "FECHA_CONTRATO",
    "PAQUETE",
    "BLOQUE",
    "FECHA_DE_PETICION",
    "FECHA_DE_RESPUESTA",
    "COMENTARIOS",
    "CAPTURA_CC"
  ];

  // Función para convertir monto según el bloque
  const convertirMonto = (monto, bloque) => {
    if (!monto || !bloque) return 0;
    
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum)) return 0;

    // Mapeo de bloques a tipos de cambio (basado en server.js)
    const tiposCambio = {
      "MEX": 1,        // MXN
      "COL1": 0.0047,  // COP - Colombia
      "COL2": 0.0047,  // COP - Colombia
      "CRI1": 0.037,   // CRC - Costa Rica
      "CHI": 0.019,    // CLP - Chile
      "HON": 0.71,     // HNL - Honduras
      "ESP1": 21.82,   // EUR - España
      "ESP2": 21.82,   // EUR - España
      "BRA": 3.36,     // BRL - Brasil
      "USA1": 18.75,   // USD - USA
    };

    const tipoCambio = tiposCambio[bloque] || 1; // Por defecto MXN
    return (montoNum * tipoCambio).toFixed(2);
  };

  // Inicializar con algunas filas vacías con valores automáticos
  useEffect(() => {
    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth(); // getMonth() devuelve 0-11

    const filasIniciales = Array(10).fill().map(() => {
      const fila = {};
      columnas.forEach(col => {
        if (col === "AÑO") {
          fila[col] = añoActual.toString();
        } else if (col === "MES_PETICION") {
          fila[col] = mesesNombres[mesActual]; // Usar el nombre del mes
        } else {
          fila[col] = "";
        }
      });
      return fila;
    });
    setFilas(filasIniciales);
  }, []);

  // Obtener datos para los dropdowns
  useEffect(() => {
    // Procesadores
    axios.get(`${API_BASE_URL}/aclaraciones/procesadores`)
      .then(res => setProcesadores(res.data))
      .catch(error => console.error("Error al obtener procesadores:", error));

    // Vendedoras desde la tabla de ventas
    axios.get(`${API_BASE_URL}/aclaraciones/vendedoras`)
      .then(res => setVendedoras(res.data))
      .catch(error => console.error("Error al obtener vendedoras:", error));

    // Sucursales desde ventas
    axios.get(`${API_BASE_URL}/aclaraciones/sucursales-ventas`)
      .then(res => setSucursales(res.data))
      .catch(error => console.error("Error al obtener sucursales:", error));

    // Bloques desde ventas
    axios.get(`${API_BASE_URL}/aclaraciones/bloques`)
      .then(res => setBloques(res.data))
      .catch(error => console.error("Error al obtener bloques:", error));

    // Comentarios únicos
    axios.get(`${API_BASE_URL}/aclaraciones/comentarios`)
      .then(res => setComentarios(res.data))
      .catch(error => console.error("Error al obtener comentarios:", error));
  }, []);

  // Agregar nueva fila
  const agregarFila = () => {
    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth(); // getMonth() devuelve 0-11

    const nuevaFila = {};
    columnas.forEach(col => {
      if (col === "AÑO") {
        nuevaFila[col] = añoActual.toString();
      } else if (col === "MES_PETICION") {
        nuevaFila[col] = mesesNombres[mesActual]; // Usar el nombre del mes
      } else {
        nuevaFila[col] = "";
      }
    });
    setFilas([...filas, nuevaFila]);
  };

  // Agregar múltiples filas
  const agregarMultiplesFilas = () => {
    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth(); // getMonth() devuelve 0-11

    const nuevasFilas = Array(10).fill().map(() => {
      const fila = {};
      columnas.forEach(col => {
        if (col === "AÑO") {
          fila[col] = añoActual.toString();
        } else if (col === "MES_PETICION") {
          fila[col] = mesesNombres[mesActual]; // Usar el nombre del mes
        } else {
          fila[col] = "";
        }
      });
      return fila;
    });
    setFilas([...filas, ...nuevasFilas]);
  };

  // Eliminar fila
  const eliminarFila = (index) => {
    setFilas(filas.filter((_, i) => i !== index));
  };

  // Actualizar valor de celda
  const actualizarCelda = (filaIndex, columna, valor) => {
    const nuevasFilas = [...filas];
    nuevasFilas[filaIndex][columna] = valor;
    
    // Si cambia el bloque o el monto, recalcular el MONTO_MNX automáticamente
    if (columna === "BLOQUE" || columna === "MONTO") {
      const monto = columna === "MONTO" ? valor : nuevasFilas[filaIndex]["MONTO"];
      const bloque = columna === "BLOQUE" ? valor : nuevasFilas[filaIndex]["BLOQUE"];
      // Nota: MONTO_MNX se calcula automáticamente en el backend
    }
    
    setFilas(nuevasFilas);
  };

  // Pegar datos desde Excel/clipboard
  const manejarPegado = (e, filaIndex, columna) => {
    e.preventDefault();
    const datoPegado = e.clipboardData.getData('text');
    
    // Si contiene tabs o saltos de línea, es datos de Excel
    if (datoPegado.includes('\t') || datoPegado.includes('\n')) {
      const lineas = datoPegado.split('\n').filter(linea => linea.trim());
      const nuevasFilas = [...filas];
      
      lineas.forEach((linea, lineaIndex) => {
        const valores = linea.split('\t');
        const filaActual = filaIndex + lineaIndex;
        
        // Asegurar que tengamos suficientes filas
        while (nuevasFilas.length <= filaActual) {
          const nuevaFila = {};
          columnas.forEach(col => nuevaFila[col] = "");
          nuevasFilas.push(nuevaFila);
        }
        
        // Buscar el índice de la columna actual
        const columnaIndex = columnas.indexOf(columna);
        
        valores.forEach((valor, valorIndex) => {
          const columnaDestino = columnas[columnaIndex + valorIndex];
          if (columnaDestino) {
            nuevasFilas[filaActual][columnaDestino] = valor.trim();
          }
        });
      });
      
      setFilas(nuevasFilas);
      setMensaje("✅ Datos pegados correctamente desde Excel");
      setTimeout(() => setMensaje(""), 3000);
    } else {
      // Datos simples, solo actualizar la celda actual
      actualizarCelda(filaIndex, columna, datoPegado);
    }
  };

  // Guardar datos
  const guardarDatos = async () => {
    setGuardando(true);
    setMensaje("");
    
    try {
      // Filtrar solo las filas que tienen al menos un campo completado
      const filasCompletas = filas.filter(fila => 
        Object.values(fila).some(valor => valor.toString().trim() !== "")
      );

      if (filasCompletas.length === 0) {
        setMensaje("❌ No hay datos para guardar");
        setGuardando(false);
        return;
      }

      // Enviar datos al servidor
      const response = await axios.post(`${API_BASE_URL}/aclaraciones/insertar-multiple`, {
        datos: filasCompletas
      });

      setMensaje(`✅ Se guardaron ${filasCompletas.length} registros correctamente`);
      
      // Limpiar las filas después de guardar
      const filasLimpias = Array(10).fill().map(() => {
        const fila = {};
        columnas.forEach(col => fila[col] = "");
        return fila;
      });
      setFilas(filasLimpias);

    } catch (error) {
      console.error("Error al guardar:", error);
      setMensaje("❌ Error al guardar los datos: " + (error.response?.data?.message || error.message));
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(""), 5000);
    }
  };

  // Limpiar todos los datos
  const limpiarDatos = () => {
    if (confirm("¿Estás seguro de que quieres limpiar todos los datos?")) {
      const filasLimpias = Array(10).fill().map(() => {
        const fila = {};
        columnas.forEach(col => fila[col] = "");
        return fila;
      });
      setFilas(filasLimpias);
      setMensaje("🧹 Datos limpiados");
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-full mx-2 border border-white/20">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-100 drop-shadow">
            📝 Ingresar Aclaraciones Masivamente
          </h1>
          <div className="flex gap-3">
            <Link
              to="/aclaraciones"
              className="bg-gray-700/80 text-white px-4 py-2 rounded hover:bg-gray-600/80 transition font-semibold"
            >
              ⬅ Volver a Aclaraciones
            </Link>
            <Link
              to="/"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
            >
              🏠 Ir al Home
            </Link>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-200 mb-2">📋 Instrucciones:</h3>
          <ul className="text-blue-100 text-sm space-y-1">
            <li>• Puedes copiar y pegar datos directamente desde Excel</li>
            <li>• Haz clic en cualquier celda y pega con Ctrl+V</li>
            <li>• Los datos se distribuirán automáticamente en las columnas correspondientes</li>
            <li>• Usa los botones para agregar más filas según necesites</li>
          </ul>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={agregarFila}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
          >
            ➕ Agregar Fila
          </button>
          
          <button
            onClick={agregarMultiplesFilas}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded transition"
          >
            ➕➕ Agregar 10 Filas
          </button>

          <button
            onClick={guardarDatos}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded transition font-semibold"
          >
            {guardando ? "💾 Guardando..." : "💾 Guardar Datos"}
          </button>

          <button
            onClick={limpiarDatos}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
          >
            🧹 Limpiar Todo
          </button>

          <span className="text-gray-300 px-4 py-2">
            Total filas: {filas.length}
          </span>
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div className={`p-3 rounded mb-4 ${
            mensaje.includes('❌') ? 'bg-red-900/50 border border-red-500 text-red-200' :
            mensaje.includes('✅') ? 'bg-green-900/50 border border-green-500 text-green-200' :
            'bg-blue-900/50 border border-blue-500 text-blue-200'
          }`}>
            {mensaje}
          </div>
        )}

        {/* Tabla de datos */}
        <div className="overflow-x-auto">
          <table className="w-full bg-gray-900/80 shadow-md rounded text-xs">
            <thead>
              <tr className="bg-gray-800/80">
                <th className="p-2 text-gray-100 font-semibold sticky left-0 bg-gray-800">#</th>
                {columnas.map((col, i) => (
                  <th key={i} className="p-2 text-gray-100 font-semibold min-w-[120px] text-center">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="p-2 text-gray-100 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, filaIndex) => (
                <tr key={filaIndex} className="border-b border-gray-700 hover:bg-gray-800/30">
                  <td className="p-1 text-gray-300 text-center sticky left-0 bg-gray-900/90">
                    {filaIndex + 1}
                  </td>
                  {columnas.map((col, colIndex) => (
                    <td key={colIndex} className="p-1">
                      {col === "PROCESADOR" ? (
                        <select
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        >
                          <option value="">Seleccionar...</option>
                          {procesadores.map((proc, i) => (
                            <option key={i} value={proc}>{proc}</option>
                          ))}
                        </select>
                      ) : col === "AÑO" ? (
                        <input
                          type="number"
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                          placeholder="Auto-detectado"
                          readOnly
                          title="Año detectado automáticamente del sistema"
                        />
                      ) : col === "MES_PETICION" ? (
                        <select
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                          title="Seleccionar mes"
                        >
                          <option value="">Seleccionar mes...</option>
                          {mesesNombres.map((mes, i) => (
                            <option key={i} value={mes}>{mes}</option>
                          ))}
                        </select>
                      ) : col === "EUROSKIN" ? (
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={fila[col] === true || fila[col] === "true"}
                            onChange={(e) => actualizarCelda(filaIndex, col, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            title="Marcar si es EUROSKIN"
                          />
                        </div>
                      ) : col === "VENDEDORA" ? (
                        <select
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        >
                          <option value="">Seleccionar...</option>
                          {vendedoras.map((vend, i) => (
                            <option key={i} value={vend}>{vend}</option>
                          ))}
                        </select>
                      ) : col === "SUCURSAL" ? (
                        <select
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        >
                          <option value="">Seleccionar...</option>
                          {sucursales.map((suc, i) => (
                            <option key={i} value={suc}>{suc}</option>
                          ))}
                        </select>
                      ) : col === "BLOQUE" ? (
                        <select
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        >
                          <option value="">Seleccionar...</option>
                          {bloques.map((bloque, i) => (
                            <option key={i} value={bloque}>{bloque}</option>
                          ))}
                        </select>
                      ) : col === "CAPTURA_CC" ? (
                        <select
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="EN PROCESO">En Proceso</option>
                          <option value="PERDIDA">Perdida</option>
                          <option value="GANADA">Ganada</option>
                        </select>
                      ) : col.includes("FECHA") ? (
                        <input
                          type="date"
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          onPaste={(e) => manejarPegado(e, filaIndex, col)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        />
                      ) : col === "MONTO" ? (
                        <input
                          type="number"
                          step="0.01"
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          onPaste={(e) => manejarPegado(e, filaIndex, col)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                          placeholder="0.00"
                          title="El monto en MXN se calculará automáticamente según el bloque"
                        />
                      ) : col === "COMENTARIOS" ? (
                        <select
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                        >
                          <option value="">Seleccionar comentario...</option>
                          {comentarios.map(comentario => (
                            <option key={comentario} value={comentario}>
                              {comentario}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={fila[col]}
                          onChange={(e) => actualizarCelda(filaIndex, col, e.target.value)}
                          onPaste={(e) => manejarPegado(e, filaIndex, col)}
                          className="w-full bg-gray-800 text-gray-100 p-1 rounded border border-gray-600 focus:border-blue-500 text-xs"
                          placeholder={`${col.replace(/_/g, ' ')}...`}
                        />
                      )}
                    </td>
                  ))}
                  <td className="p-1 text-center">
                    <button
                      onClick={() => eliminarFila(filaIndex)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                      title="Eliminar fila"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer con estadísticas */}
        <div className="mt-4 text-sm text-gray-400 text-center">
          💡 Tip: Puedes copiar datos de Excel y pegarlos directamente en cualquier celda
        </div>
      </div>
    </div>
  );
}
