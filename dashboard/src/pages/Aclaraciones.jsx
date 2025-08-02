import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

// Componente para desplegables en modo edición
const SelectEditor = React.memo(({ value, onChange, options, className = "" }) => {
  return (
    <select
      className={`w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6 ${className}`}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">-</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt.length > 20 ? opt.substring(0, 20) + '...' : opt}</option> // Truncar opciones largas
      ))}
    </select>
  );
});

export default function Aclaraciones() {
  const navigate = useNavigate();
  
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
  const [estiloTabla, setEstiloTabla] = useState(true); // true = responsive, false = scroll horizontal
  const [limite, setLimite] = useState(100); // Límite optimizado
  const [indicePaginaInterna, setIndicePaginaInterna] = useState(0); // Para paginación dinámica del array

  // Scroll optimization references
  const scrollTopRef = useRef(null);
  const tableContainerRef = useRef(null);
  const throttleTimeoutRef = useRef(null);

  // Throttled scroll function for smooth performance
  const throttleScroll = useCallback((callback, delay = 16) => {
    if (throttleTimeoutRef.current) return;
    throttleTimeoutRef.current = requestAnimationFrame(() => {
      callback();
      throttleTimeoutRef.current = null;
    });
  }, []);

  const handleTopScroll = throttleScroll((e) => {
    if (tableContainerRef.current && e.target.scrollTop > 0) {
      tableContainerRef.current.scrollTop = e.target.scrollTop;
    }
  });

  const handleTableScroll = throttleScroll((e) => {
    if (scrollTopRef.current && e.target.scrollTop > 0) {
      scrollTopRef.current.scrollTop = e.target.scrollTop;
    }
  });

  // Estados para el modal de contraseña de ingreso
  const [mostrarModalPassword, setMostrarModalPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  
  // Estados para el modo de edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [passwordEdicion, setPasswordEdicion] = useState("");
  const [errorPasswordEdicion, setErrorPasswordEdicion] = useState("");
  const [datosEditados, setDatosEditados] = useState({});
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  
  // Estados para desplegables del modo edición
  const [bloques, setBloques] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [comentariosComunes, setComentariosComunes] = useState([]);
  const [capturaCC, setCapturaCC] = useState([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  
  // Estado para mostrar notificación de conversión
  const [notificacionConversion, setNotificacionConversion] = useState("");
  
  const PASSWORD_CORRECTA = "admin123"; // Contraseña para ambos casos

  useEffect(() => {
    obtenerDatos();
  }, [pagina, limite]); // Agregar límite como dependencia

  useEffect(() => {
    obtenerProcesadores();
    obtenerSucursales();
    // No cargar opciones de edición hasta que se necesiten
  }, []);

  // Cargar opciones de edición solo cuando se active el modo
  useEffect(() => {
    if (modoEdicion && (bloques.length === 0 || vendedoras.length === 0)) {
      obtenerOpcionesEdicion();
    }
  }, [modoEdicion]);

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

  const obtenerOpcionesEdicion = async () => {
    if (cargandoOpciones) return; // Evitar múltiples llamadas
    
    setCargandoOpciones(true);
    try {
      console.log("🔄 Cargando opciones de edición...");
      
      // Usar Promise.allSettled para evitar que un error detenga todo
      const resultados = await Promise.allSettled([
        fetch(`${API_BASE_URL}/aclaraciones/bloques`).then(r => r.json()),
        fetch(`${API_BASE_URL}/aclaraciones/vendedoras`).then(r => r.json()),
        fetch(`${API_BASE_URL}/aclaraciones/comentarios-comunes`).then(r => r.json()),
        fetch(`${API_BASE_URL}/aclaraciones/captura-cc`).then(r => r.json())
      ]);

      // Procesar resultados de forma segura
      if (resultados[0].status === 'fulfilled') setBloques(resultados[0].value || []);
      if (resultados[1].status === 'fulfilled') setVendedoras(resultados[1].value || []);
      if (resultados[2].status === 'fulfilled') setComentariosComunes(resultados[2].value || []);
      if (resultados[3].status === 'fulfilled') setCapturaCC(resultados[3].value || []);

      console.log("✅ Opciones de edición cargadas");
    } catch (error) {
      console.error("❌ Error al obtener opciones de edición:", error);
    } finally {
      setCargandoOpciones(false);
    }
  };

  const obtenerDatos = useCallback(async () => {
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
  }, [pagina, limite, busqueda, procesador, sucursal, fechaInicio, fechaFin, montoMin, montoMax]);

  // Optimized pagination handlers
  const handlePrevPage = useCallback(() => {
    setPagina((p) => Math.max(p - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPagina((p) => Math.min(p + 1, Math.ceil(total / limite)));
  }, [total, limite]);

  const handleSearchSubmit = useCallback(() => {
    setPagina(1);
    obtenerDatos();
  }, [obtenerDatos]);

  const exportarExcel = useCallback(() => {
    const datosExcel = datos.map(row => ({
      "Procesador": row.procesador || "",
      "Año": row.año || "",
      "Mes Petición": row.mes_peticion || "",
      "EuroSkin": row.euroskin ? "SÍ" : "NO",
      "ID Comercio": row.id_del_comercio_afiliacion || "",
      "Nombre Comercio": row.nombre_del_comercio || "",
      "ID Transacción": row.id_de_transaccion || "",
      "Fecha Venta": row.fecha_venta || "",
      "Monto": row.monto || "",
      "Num. Tarjeta": row.num_de_tarjeta || "",
      "Autorización": row.autorizacion || "",
      "Cliente": row.cliente || "",
      "Vendedora": row.vendedora || "",
      "Sucursal": row.sucursal || "",
      "Fecha Contrato": row.fecha_contrato || "",
      "Paquete": row.paquete || "",
      "Bloque": row.bloque || "",
      "Fecha Petición": row.fecha_de_peticion || "",
      "Fecha Respuesta": row.fecha_de_respuesta || "",
      "Comentarios": row.comentarios || "",
      "Captura CC": row.captura_cc || "",
      "Monto MXN": row.monto_mnx || ""
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aclaraciones");
    XLSX.writeFile(wb, `aclaraciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [datos]);

  const columnas = datos.length > 0 ? Object.keys(datos[0]) : [];
  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  // Funciones para el modal de contraseña de ingreso
  const manejarIngresarDatos = () => {
    setMostrarModalPassword(true);
    setPassword("");
    setErrorPassword("");
  };

  const verificarPassword = () => {
    if (password === PASSWORD_CORRECTA) {
      setMostrarModalPassword(false);
      navigate("/ingresar-aclaraciones");
    } else {
      setErrorPassword("Contraseña incorrecta");
      setPassword("");
    }
  };

  const cerrarModal = () => {
    setMostrarModalPassword(false);
    setPassword("");
    setErrorPassword("");
  };

  // Funciones para el modo de edición
  const manejarModoEdicion = () => {
    setMostrarModalEdicion(true);
    setPasswordEdicion("");
    setErrorPasswordEdicion("");
  };

  const verificarPasswordEdicion = () => {
    if (passwordEdicion === PASSWORD_CORRECTA) {
      setMostrarModalEdicion(false);
      setModoEdicion(true);
      // No inicializar todos los datos de edición de una vez - solo cuando se edite
      setDatosEditados({});
    } else {
      setErrorPasswordEdicion("Contraseña incorrecta");
      setPasswordEdicion("");
    }
  };

  const cerrarModalEdicion = () => {
    setMostrarModalEdicion(false);
    setPasswordEdicion("");
    setErrorPasswordEdicion("");
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setDatosEditados({});
  };

  const actualizarCampo = (filaIndex, campo, valor) => {
    setDatosEditados(prev => {
      const nuevosEditados = {
        ...prev,
        [filaIndex]: {
          ...prev[filaIndex],
          [campo]: valor
        }
      };

      // 💰 CONVERSIÓN AUTOMÁTICA DE MONTO A MXN
      if (campo === 'monto' && valor && !isNaN(valor)) {
        const filaOriginal = datos[parseInt(filaIndex)];
        const bloque = filaOriginal?.bloque || '';
        
        // DEBUG: Ver qué está pasando con los datos
        console.log('🔍 DEBUG Conversión:');
        console.log('- filaIndex:', filaIndex);
        console.log('- filaOriginal:', filaOriginal);
        console.log('- bloque detectado:', bloque);
        console.log('- valor a convertir:', valor);
        
        // Tipos de cambio basados en el backend (sincronizados)
        const tiposCambio = {
          "COL": 0.004573,
          "HON": 0.71,
          "ESP1": 21.82,
          "ESP2": 21.82,
          "BRA": 3.36,
          "USA1": 18.75
        };

        let montoMnx = null;
        const montoOriginal = parseFloat(valor);
        
        console.log('- montoOriginal parseado:', montoOriginal);
        console.log('- tipoCambio disponible para', bloque, ':', tiposCambio[bloque]);
        
        if (montoOriginal !== null && !isNaN(montoOriginal)) {
          if (bloque === "MEX" || bloque.includes("SIN") || bloque.includes("MTY")) {
            // Si es México, el monto ya está en MXN
            montoMnx = montoOriginal;
            console.log('- Es MEX, no se convierte:', montoMnx);
          } else if (tiposCambio[bloque]) {
            // Convertir usando el tipo de cambio del bloque
            const tipoCambio = tiposCambio[bloque];
            montoMnx = montoOriginal * tipoCambio;
            console.log(`- Conversión: ${montoOriginal} × ${tipoCambio} = ${montoMnx}`);
          } else {
            // Si no hay tipo de cambio para el bloque, intentar detectar por país
            console.log('⚠️ No se encontró tipo de cambio para bloque:', bloque);
            console.log('- Intentando detectar país por otros campos...');
            
            // Buscar país en otros campos de la fila
            const filaCompleta = JSON.stringify(filaOriginal).toLowerCase();
            if (filaCompleta.includes('colombia') || filaCompleta.includes('col')) {
              montoMnx = montoOriginal * 0.004573;
              console.log('- Detectado Colombia por contenido, aplicando 0.0045');
            } else {
              // Por defecto, asumir que es peso mexicano
              montoMnx = montoOriginal;
              console.log('- Sin detección, asumiendo MXN');
            }
          }
          
          // Redondear a 2 decimales
          montoMnx = Math.round(montoMnx * 100) / 100;
          
          // Actualizar automáticamente el monto_mnx
          nuevosEditados[filaIndex].monto_mnx = montoMnx;
          
          // Mostrar notificación
          const tipoCambioFinal = tiposCambio[bloque] || (montoMnx / montoOriginal);
          setNotificacionConversion(`💰 ${valor} ${bloque || 'AUTO'} × ${tipoCambioFinal.toFixed(4)} = $${montoMnx} MXN`);
          setTimeout(() => setNotificacionConversion(""), 3000);
          
          console.log(`💰 Conversión final: ${valor} ${bloque || 'AUTO'} -> $${montoMnx} MXN`);
        } else {
          console.log('❌ Valor no válido para conversión:', valor);
        }
      }

      return nuevosEditados;
    });
  };

  const guardarCambios = async () => {
    setGuardandoCambios(true);
    try {
      // Debug inicial
      console.log("🔍 Estado actual:");
      console.log("- datos.length:", datos.length);
      console.log("- datosEditados:", datosEditados);
      console.log("- Primer elemento de datos:", datos[0]);
      
      // Preparar los registros para enviar al backend
      const registrosParaActualizar = [];
      
      Object.keys(datosEditados).forEach(filaIndex => {
        console.log("🔍 Procesando índice:", filaIndex, "parseInt:", parseInt(filaIndex));
        const filaOriginal = datos[parseInt(filaIndex)];
        const datosCambiados = datosEditados[filaIndex];
        
        // Verificar que la fila original existe
        if (!filaOriginal) {
          console.error("❌ Fila original no encontrada para índice:", filaIndex);
          console.error("❌ datos.length:", datos.length);
          console.error("❌ índices disponibles:", datos.map((_, i) => i));
          return;
        }
        
        // Verificar si realmente hay cambios
        const hayCambios = Object.keys(datosCambiados).some(campo => 
          datosCambiados[campo] !== filaOriginal[campo]
        );
        
        if (hayCambios) {
          // Identificar el registro con debug
          console.log("🔍 Fila original completa:", filaOriginal);
          console.log("🔍 Campos disponibles:", Object.keys(filaOriginal));
          
          // Verificar que tenemos los campos necesarios para identificación
          if (!filaOriginal.id_de_transaccion) {
            console.error("❌ No se encontró id_de_transaccion en:", filaOriginal);
            alert("Error: No se puede identificar el registro para actualizar");
            return;
          }
          
          registrosParaActualizar.push({
            id_original: {
              id_de_transaccion: filaOriginal.id_de_transaccion,
              num_de_tarjeta: filaOriginal.num_de_tarjeta
              // Removemos fecha_venta del identificador
            },
            datos_nuevos: {}
          });
          
          console.log("🔍 ID enviado:", {
            id_de_transaccion: filaOriginal.id_de_transaccion,
            num_de_tarjeta: filaOriginal.num_de_tarjeta
          });
          
          // Convertir los nombres de campos - ya vienen en minúsculas desde la BD
          Object.keys(datosCambiados).forEach(campoFrontend => {
            // Los campos ya están en minúsculas, solo necesitamos pasarlos directamente
            registrosParaActualizar[registrosParaActualizar.length - 1].datos_nuevos[campoFrontend] = datosCambiados[campoFrontend];
          });
        }
      });
      
      if (registrosParaActualizar.length === 0) {
        alert("❌ No hay cambios para guardar");
        setModoEdicion(false);
        setDatosEditados({});
        return;
      }

      // Llamada al endpoint de actualización
      const response = await fetch(`${API_BASE_URL}/aclaraciones/actualizar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registros: registrosParaActualizar
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const resultado = await response.json();
      
      if (resultado.success) {
        // Recargar los datos desde el servidor después de guardar
        await obtenerDatos();
        
        setModoEdicion(false);
        setDatosEditados({});
        
        alert(`✅ Cambios guardados exitosamente!\n${resultado.registros_procesados} registros actualizados`);
      } else {
        throw new Error("La respuesta del servidor indica un error");
      }
      
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      alert(`❌ Error al guardar los cambios: ${error.message}`);
    } finally {
      setGuardandoCambios(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-1">
      <div className="flex justify-between items-center mb-4"> {/* Margin reducido */}
        <h1 className="text-2xl font-bold text-gray-100">💳 Aclaraciones</h1> {/* Título más pequeño */}
        <div className="flex gap-3">
          {!modoEdicion ? (
            <>
              <button 
                onClick={manejarIngresarDatos}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition font-semibold"
              >
                📝 Ingresar Datos
              </button>
              <button 
                onClick={manejarModoEdicion}
                disabled={cargandoOpciones}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition font-semibold disabled:bg-gray-600"
              >
                {cargandoOpciones ? "🔄 Cargando..." : "✏️ Editar Datos"}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={guardarCambios}
                disabled={guardandoCambios}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition font-semibold disabled:bg-gray-600"
              >
                {guardandoCambios ? "� Guardando..." : "💾 Guardar Cambios"}
              </button>
              <button 
                onClick={cancelarEdicion}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition font-semibold"
              >
                ❌ Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 p-3 rounded-lg mb-4 backdrop-blur-sm"> {/* Padding y margin reducidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"> {/* Gap reducido */}
          <input
            type="text"
            placeholder="🔍 Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />
          
          <select
            value={procesador}
            onChange={(e) => setProcesador(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="">🏦 Procesadores</option>
            {procesadores.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="">🏢 Sucursales</option>
            {sucursales.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={exportarExcel}
            disabled={!datos.length}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
          >
            📊 Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3"> {/* Gap y margin reducidos */}
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />
          
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />

          <input
            type="number"
            placeholder="💰 Min"
            value={montoMin}
            onChange={(e) => setMontoMin(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />

          <input
            type="number"
            placeholder="💰 Max"
            value={montoMax}
            onChange={(e) => setMontoMax(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-3 mt-3"> {/* Gap y margin reducidos */}
          <button
            onClick={() => {
              setPagina(1);
              obtenerDatos();
            }}
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
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
            className="px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm"
          >
            🔄 Limpiar
          </button>

          <select
            value={limite}
            onChange={(e) => {
              const nuevoLimite = parseInt(e.target.value);
              setLimite(nuevoLimite);
              setPagina(1); // Resetear a página 1 al cambiar límite
              
              // Aviso de rendimiento para límites altos
              if (nuevoLimite >= 500 && modoEdicion) {
                alert("⚠️ Con 500+ registros, el modo edición puede ser más lento. Se recomienda usar filtros para reducir los resultados.");
              }
            }}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value={100}>📄 100</option>
            <option value={250}>📄 250</option>
            <option value={500}>📄 500</option>
            <option value={1000}>📄 1000</option>
          </select>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-gray-800/50 p-2 rounded-lg mb-3 backdrop-blur-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-blue-400">{total.toLocaleString()}</div>
            <div className="text-gray-300 text-xs">Total</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">{procesadores.length}</div>
            <div className="text-gray-300 text-xs">Procesadores</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-400">{sucursales.length}</div>
            <div className="text-gray-300 text-xs">Sucur.</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">{fechaUltima}</div>
            <div className="text-gray-300 text-xs">Última Act.</div>
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
          <div className="overflow-x-auto" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%' }}>
            <table className="w-full text-xs"> {/* Texto más pequeño */}
              <thead className="bg-gray-700">
                <tr>
                  {columnas.map((col) => (
                    <th key={col} className={`px-2 py-2 text-left text-white font-semibold border-b border-gray-600 text-xs ${col === 'cliente' ? 'whitespace-nowrap' : 'whitespace-nowrap'}`}> {/* Padding reducido y texto pequeño */}
                      {col === 'cliente' 
                        ? col.replace(/_/g, " ") // Mostrar cliente completo
                        : col.replace(/_/g, " ").substring(0, 15) // Truncar otros títulos
                      }
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-gray-900/30" : "bg-gray-800/30"}>
                    {columnas.map((col) => (
                      <td key={col} className="px-2 py-1 text-gray-200 border-b border-gray-700 text-xs min-w-0"> {/* Padding y texto reducido */}
                        {modoEdicion ? (
                          col === 'procesador' && procesadores.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[idx]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(idx, col, value)}
                              options={procesadores}
                              className="text-xs h-6" // Altura reducida
                            />
                          ) : col === 'sucursal' && sucursales.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[idx]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(idx, col, value)}
                              options={sucursales}
                              className="text-xs h-6"
                            />
                          ) : col === 'bloque' && bloques.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[idx]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(idx, col, value)}
                              options={bloques}
                              className="min-w-[120px] text-xs h-6"
                            />
                          ) : col === 'vendedora' && vendedoras.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[idx]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(idx, col, value)}
                              options={vendedoras}
                              className="text-xs h-6"
                            />
                          ) : col === 'comentarios' && comentariosComunes.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[idx]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(idx, col, value)}
                              options={comentariosComunes}
                              className="min-w-[150px] text-xs h-6" // Ancho reducido
                            />
                          ) : col === 'captura_cc' && capturaCC.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[idx]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(idx, col, value)}
                              options={capturaCC}
                              className="text-xs h-6"
                            />
                          ) : col === 'euroskin' ? (
                            <select
                              value={datosEditados[idx]?.[col] || row[col] || ""}
                              onChange={(e) => actualizarCampo(idx, col, e.target.value)}
                              className="w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6"
                            >
                              <option value="">-</option>
                              <option value="TRUE">Sí</option>
                              <option value="FALSE">No</option>
                            </select>
                          ) : (col.includes('fecha') || col.includes('fecha_')) ? (
                            <input
                              type="date"
                              value={datosEditados[idx]?.[col] || row[col]?.toString() || ""}
                              onChange={(e) => actualizarCampo(idx, col, e.target.value)}
                              className="w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6"
                            />
                          ) : col === 'monto' ? (
                            <input
                              type="number"
                              step="0.01"
                              value={datosEditados[idx]?.[col] || row[col]?.toString() || ""}
                              onChange={(e) => actualizarCampo(idx, col, e.target.value)}
                              className="min-w-[140px] bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6"
                              placeholder="Monto original"
                              title="Al editar este campo, se calculará automáticamente el monto en MXN"
                            />
                          ) : col === 'monto_mnx' ? (
                            <div className="relative min-w-[140px]">
                              <input
                                type="number"
                                step="0.01"
                                value={datosEditados[idx]?.[col] || row[col]?.toString() || ""}
                                onChange={(e) => actualizarCampo(idx, col, e.target.value)}
                                className={`w-full px-1 py-0 rounded border focus:outline-none text-xs h-6 ${
                                  datosEditados[idx]?.monto_mnx ? 
                                  'bg-green-700/50 text-green-100 border-green-500 focus:border-green-400' : 
                                  'bg-gray-700 text-white border-gray-600 focus:border-blue-500'
                                }`}
                                placeholder="Auto-calculado"
                                title={datosEditados[idx]?.monto_mnx ? 'Convertido automáticamente desde el monto original' : 'Monto en pesos mexicanos'}
                              />
                              {datosEditados[idx]?.monto_mnx && (
                                <span className="absolute -top-1 -right-1 text-green-400 text-xs">🔄</span>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={datosEditados[idx]?.[col] || row[col]?.toString() || ""}
                              onChange={(e) => actualizarCampo(idx, col, e.target.value)}
                              className="w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6"
                            />
                          )
                        ) : (
                          col === 'cliente' ? (
                            <div className="whitespace-nowrap" title={row[col]?.toString() || ""}> {/* Columna cliente sin truncar */}
                              {row[col]?.toString() || ""}
                            </div>
                          ) : col === 'monto' || col === 'monto_mnx' || col === 'bloque' ? (
                            <div className="whitespace-nowrap min-w-[120px]" title={row[col]?.toString() || ""}> {/* Columnas de monto y bloque más anchas */}
                              {row[col]?.toString() || ""}
                            </div>
                          ) : (
                            <div className="truncate max-w-[120px]" title={row[col]?.toString() || ""}> {/* Truncar contenido con tooltip */}
                              {row[col]?.toString() || ""}
                            </div>
                          )
                        )}
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
      <div className="flex justify-between items-center mt-3">
        <div className="text-gray-300 text-sm">
          Pág {pagina}/{totalPaginas} • {total.toLocaleString()} reg • {datos.length}/{limite}
          {modoEdicion && <span className="text-yellow-400 ml-2">📝</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setPagina(Math.max(1, pagina - 10))}
            disabled={pagina <= 10}
            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
          >
            ⏪-10
          </button>
          <button
            onClick={() => setPagina(Math.max(1, pagina - 1))}
            disabled={pagina <= 1}
            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
          >
            ← Ant
          </button>
          <span className="px-2 py-1 bg-blue-600 text-white rounded font-semibold text-xs">
            {pagina}
          </span>
          <button
            onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
            disabled={pagina >= totalPaginas}
            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
          >
            Sig →
          </button>
          <button
            onClick={() => setPagina(Math.min(totalPaginas, pagina + 10))}
            disabled={pagina >= totalPaginas - 10}
            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
          >
            +10⏩
          </button>
        </div>
      </div>

      {/* Modal de contraseña para ingresar datos */}
      {mostrarModalPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">🔒 Acceso Restringido</h3>
            <p className="text-gray-300 mb-4">Ingresa la contraseña para acceder a la sección de ingreso de datos:</p>
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && verificarPassword()}
              placeholder="Contraseña"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              autoFocus
            />
            
            {errorPassword && (
              <p className="text-red-400 text-sm mb-4">❌ {errorPassword}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={verificarPassword}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition font-semibold"
              >
                ✅ Verificar
              </button>
              <button
                onClick={cerrarModal}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de contraseña para modo edición */}
      {mostrarModalEdicion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">🔐 Modo Edición</h3>
            <p className="text-gray-300 mb-4">Ingresa la contraseña para activar el modo de edición de datos:</p>
            
            <input
              type="password"
              value={passwordEdicion}
              onChange={(e) => setPasswordEdicion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && verificarPasswordEdicion()}
              placeholder="Contraseña"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              autoFocus
            />
            
            {errorPasswordEdicion && (
              <p className="text-red-400 text-sm mb-4">❌ {errorPasswordEdicion}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={verificarPasswordEdicion}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition font-semibold"
              >
                ✅ Activar Edición
              </button>
              <button
                onClick={cerrarModalEdicion}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de conversión automática */}
      {notificacionConversion && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-xl z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-medium">{notificacionConversion}</span>
          </div>
        </div>
      )}
    </div>
  );
}
