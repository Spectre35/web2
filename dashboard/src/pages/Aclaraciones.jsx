import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { formatearFechasEnObjeto, formatearFecha, convertirFechaParaInput, convertirFechaDesdeInput } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";

// ✅ Hook de debouncing para optimizar actualizaciones
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ✅ Componente optimizado para desplegables en modo edición con memo
const SelectEditor = React.memo(({ value, onChange, options, className = "" }) => {
  return (
    <select
      className={`w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6 ${className}`}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">-</option>
      {options.map(opt => (
        <option key={opt} value={opt}>
          {opt.length > 20 ? opt.substring(0, 20) + '...' : opt}
        </option>
      ))}
    </select>
  );
});

// ✅ Componente optimizado para celdas editables con memo
const EditableCell = React.memo(({ 
  value, 
  onChange, 
  tipo = "text",
  opciones = [],
  className = "" 
}) => {
  const [valorLocal, setValorLocal] = useState(value || "");
  const debouncedValue = useDebounce(valorLocal, 300); // 300ms de debounce
  
  // Sincronizar valor externo con local
  useEffect(() => {
    setValorLocal(value || "");
  }, [value]);
  
  // Enviar cambio debounced al padre
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);
  
  const handleChange = useCallback((nuevoValor) => {
    setValorLocal(nuevoValor);
  }, []);
  
  if (tipo === "select" && opciones.length > 0) {
    return (
      <SelectEditor
        value={valorLocal}
        onChange={handleChange}
        options={opciones}
        className={className}
      />
    );
  }
  
  if (tipo === "date") {
    return (
      <input
        type="date"
        className={`w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6 ${className}`}
        value={valorLocal}
        onChange={(e) => handleChange(e.target.value)}
      />
    );
  }
  
  return (
    <input
      type={tipo}
      className={`w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6 ${className}`}
      value={valorLocal}
      onChange={(e) => handleChange(e.target.value)}
    />
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

  // 🆕 Estados para filtros dinámicos por columna
  const [filtrosColumnas, setFiltrosColumnas] = useState({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [valoresUnicos, setValoresUnicos] = useState({});

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
  const [progresoGuardado, setProgresoGuardado] = useState({ actual: 0, total: 0 });
  
  // Estados para la paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(50);

  // Debug: Monitorear cambios en paginación
  useEffect(() => {
    console.log(`🔍 Estado paginación: página=${paginaActual}, filasPorPagina=${filasPorPagina}, totalDatos=${datos.length}`);
  }, [paginaActual, filasPorPagina, datos.length]);
  
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
      setPaginaActual(1); // ✅ Resetear paginación de tabla al obtener nuevos datos

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

  // 🆕 Funciones para filtros dinámicos
  const calcularValoresUnicos = useCallback(() => {
    if (datos.length === 0) return;
    
    const nuevosValores = {};
    columnas.forEach(columna => {
      const valores = [...new Set(datos.map(row => row[columna]).filter(val => val !== null && val !== undefined && val !== ''))];
      nuevosValores[columna] = valores.sort();
    });
    setValoresUnicos(nuevosValores);
  }, [datos, columnas]);

  // ✅ Arreglado: Eliminar useEffect que causa bucle infinito
  // useEffect(() => {
  //   calcularValoresUnicos();
  // }, [calcularValoresUnicos]);

  const aplicarFiltro = (columna, valor) => {
    setFiltrosColumnas(prev => ({
      ...prev,
      [columna]: valor
    }));
  };

  const limpiarFiltros = () => {
    setFiltrosColumnas({});
  };

  const limpiarFiltroColumna = (columna) => {
    setFiltrosColumnas(prev => {
      const nuevos = { ...prev };
      delete nuevos[columna];
      return nuevos;
    });
  };

  // 📊 Calcular número de filtros activos
  const filtrosActivos = Object.values(filtrosColumnas).filter(valor => valor && valor.toString().trim() !== '').length;

  // Filtrar datos según filtros de columnas
  const datosFiltrados = React.useMemo(() => {
    if (Object.keys(filtrosColumnas).length === 0) return datos;
    
    return datos.filter(row => {
      return Object.entries(filtrosColumnas).every(([columna, valor]) => {
        if (!valor) return true;
        const valorRow = row[columna]?.toString()?.toLowerCase() || '';
        const valorFiltro = valor.toString().toLowerCase();
        return valorRow.includes(valorFiltro);
      });
    });
  }, [datos, filtrosColumnas]);

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

  // ✅ OPTIMIZACIÓN: Función ultra-rápida para escritura con memoización
  const actualizarCampo = useCallback((filaIndex, campo, valor) => {
    setDatosEditados(prev => ({
      ...prev,
      [filaIndex]: {
        ...prev[filaIndex],
        [campo]: valor
      }
    }));
  }, []);

  // ✅ FUNCIÓN MEMOIZADA PARA APLICAR CONVERSIONES (se ejecuta solo al guardar)
  const aplicarConversiones = useCallback((datosEditados) => {
    const datosConConversiones = { ...datosEditados };
    
    // Tipos de cambio centralizados
    const tiposCambio = {
      "COL": 0.004573,
      "HON": 0.71,
      "ESP1": 21.82,
      "ESP2": 21.82,
      "BRA": 3.36,
      "USA1": 18.75
    };
    
    Object.keys(datosConConversiones).forEach(filaIndex => {
      const cambiosEnFila = datosConConversiones[filaIndex];
      
      // Si se cambió el monto, calcular monto_mnx automáticamente
      if (cambiosEnFila.monto && !isNaN(cambiosEnFila.monto)) {
        const filaOriginal = datos[parseInt(filaIndex)];
        const bloque = filaOriginal?.bloque || '';
        const montoOriginal = parseFloat(cambiosEnFila.monto);
        
        let montoMnx = null;
        
        if (bloque === "MEX" || bloque.includes("SIN") || bloque.includes("MTY")) {
          // México - ya está en MXN
          montoMnx = montoOriginal;
        } else if (tiposCambio[bloque]) {
          // Conversión por bloque
          montoMnx = montoOriginal * tiposCambio[bloque];
        } else {
          // Detectar por contenido o asumir MXN
          const filaCompleta = JSON.stringify(filaOriginal).toLowerCase();
          if (filaCompleta.includes('colombia') || filaCompleta.includes('col')) {
            montoMnx = montoOriginal * 0.004573;
          } else {
            montoMnx = montoOriginal;
          }
        }
        
        // Aplicar conversión automática solo si no se editó manualmente monto_mnx
        if (!cambiosEnFila.monto_mnx) {
          datosConConversiones[filaIndex].monto_mnx = Math.round(montoMnx * 100) / 100;
          console.log(`💰 Conversión aplicada: ${cambiosEnFila.monto} ${bloque} -> $${datosConConversiones[filaIndex].monto_mnx} MXN`);
        }
      }
    });
    
    return datosConConversiones;
  }, [datos]);

  // Funciones de paginación para la tabla
  const datosPaginacion = useMemo(() => {
    const totalPaginasTabla = Math.ceil(datos.length / filasPorPagina);
    const indiceInicio = (paginaActual - 1) * filasPorPagina;
    const indiceFin = indiceInicio + filasPorPagina;
    const datosPaginados = datos.slice(indiceInicio, indiceFin);
    
    console.log(`🔄 Paginación calculada: página ${paginaActual}/${totalPaginasTabla}, mostrando ${indiceInicio+1}-${Math.min(indiceFin, datos.length)} de ${datos.length}`);
    
    return {
      totalPaginasTabla,
      indiceInicio,
      indiceFin,
      datosPaginados
    };
  }, [datos, paginaActual, filasPorPagina]);

  const { totalPaginasTabla, indiceInicio, indiceFin, datosPaginados } = datosPaginacion;

  const irAPagina = (numeroPagina) => {
    const nuevaPagina = Math.max(1, Math.min(numeroPagina, totalPaginasTabla));
    console.log(`📄 Navegando de página ${paginaActual} a ${nuevaPagina}`);
    setPaginaActual(nuevaPagina);
  };

  const cambiarFilasPorPagina = (nuevasFilas) => {
    console.log(`📊 Cambiando filas por página de ${filasPorPagina} a ${nuevasFilas}`);
    setFilasPorPagina(nuevasFilas);
    setPaginaActual(1); // Resetear a primera página
  };

  // 🚀 PREPARACIÓN: Hook para scroll virtual (cuando tengas datasets muy grandes)
  const useVirtualScroll = (items, containerHeight = 400, itemHeight = 32) => {
    const [scrollTop, setScrollTop] = useState(0);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight) + 1, items.length);
    const visibleItems = items.slice(startIndex, endIndex);
    
    return {
      containerStyle: { height: containerHeight, overflow: 'auto' },
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
      visibleItems,
      onScroll: (e) => setScrollTop(e.target.scrollTop)
    };
  };

  // ✅ FUNCIÓN OPTIMIZADA: Guardar cambios con batching inteligente
  const guardarCambios = async () => {
    setGuardandoCambios(true);
    
    try {
      console.time("guardar-cambios");
      console.log("🔍 Iniciando guardado optimizado...");
      
      // ✅ APLICAR CONVERSIONES AUTOMÁTICAS antes de procesar
      console.log("💰 Aplicando conversiones automáticas...");
      const datosConConversiones = aplicarConversiones(datosEditados);
      console.log("✅ Conversiones aplicadas:", datosConConversiones);
      
      // Mostrar notificación de conversiones aplicadas
      const conversionesAplicadas = Object.keys(datosConConversiones).filter(filaIndex => 
        datosConConversiones[filaIndex].monto && datosConConversiones[filaIndex].monto_mnx
      ).length;
      
      if (conversionesAplicadas > 0) {
        setNotificacionConversion(`💰 ${conversionesAplicadas} conversiones automáticas aplicadas`);
        setTimeout(() => setNotificacionConversion(""), 3000);
      }
      
      // ✅ OPTIMIZACIÓN 1: Agrupar cambios por campo para usar endpoint específico
      const cambiosPorCampo = {};
      const cambiosMultiples = [];
      
      Object.keys(datosConConversiones).forEach(filaIndex => {
        const filaOriginal = datos[parseInt(filaIndex)];
        const datosCambiados = datosConConversiones[filaIndex];
        
        if (!filaOriginal) {
          console.error("❌ Fila original no encontrada para índice:", filaIndex);
          return;
        }
        
        // Verificar que hay cambios reales
        const hayCambios = Object.keys(datosCambiados).some(campo => 
          datosCambiados[campo] !== filaOriginal[campo]
        );
        
        if (!hayCambios) return;
        
        // Identificación del registro
        const identificacion = {
          id_transaccion: filaOriginal.id_de_transaccion,
          num_tarjeta: filaOriginal.num_de_tarjeta
        };
        
        if (!identificacion.id_transaccion) {
          console.error("❌ No se puede identificar registro:", filaOriginal);
          return;
        }
        
        const camposModificados = Object.keys(datosCambiados);
        
        // ✅ Si solo se modificó UN campo, usar endpoint optimizado
        if (camposModificados.length === 1) {
          const campo = camposModificados[0];
          
          if (!cambiosPorCampo[campo]) {
            cambiosPorCampo[campo] = [];
          }
          
          cambiosPorCampo[campo].push({
            ...identificacion,
            valor: datosCambiados[campo]
          });
        } else {
          // ✅ Múltiples campos -> usar endpoint general
          cambiosMultiples.push({
            id_original: identificacion,
            datos_nuevos: datosCambiados
          });
        }
      });
      
      console.log(`� Análisis de cambios:`, {
        camposUnicos: Object.keys(cambiosPorCampo).length,
        registrosMulticampo: cambiosMultiples.length
      });
      
      const promesas = [];
      
      // ✅ OPTIMIZACIÓN 2: Procesar campos únicos con endpoint masivo
      for (const [campo, registros] of Object.entries(cambiosPorCampo)) {
        console.log(`🚀 Enviando ${registros.length} cambios para campo: ${campo}`);
        
        const promesa = fetch(`${API_BASE_URL}/aclaraciones/actualizar-campo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campo, registros })
        }).then(response => {
          if (!response.ok) throw new Error(`Error en campo ${campo}: ${response.status}`);
          return response.json();
        }).then(resultado => ({
          tipo: 'campo_unico',
          campo,
          ...resultado
        }));
        
        promesas.push(promesa);
      }
      
      // ✅ OPTIMIZACIÓN 3: Procesar cambios múltiples en paralelo
      if (cambiosMultiples.length > 0) {
        console.log(`🚀 Enviando ${cambiosMultiples.length} cambios multicampo`);
        
        const promesa = fetch(`${API_BASE_URL}/aclaraciones/actualizar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registros: cambiosMultiples })
        }).then(response => {
          if (!response.ok) throw new Error(`Error en multicampo: ${response.status}`);
          return response.json();
        }).then(resultado => ({
          tipo: 'multicampo',
          ...resultado
        }));
        
        promesas.push(promesa);
      }
      
      if (promesas.length === 0) {
        alert("❌ No hay cambios para guardar");
        setModoEdicion(false);
        setDatosEditados({});
        return;
      }
      
      // ✅ OPTIMIZACIÓN 4: Ejecutar todas las actualizaciones con progreso
      setProgresoGuardado({ actual: 0, total: promesas.length });
      
      const resultados = [];
      for (let i = 0; i < promesas.length; i++) {
        setProgresoGuardado({ actual: i + 1, total: promesas.length });
        const resultado = await promesas[i];
        resultados.push(resultado);
      }
      
      console.timeEnd("guardar-cambios");
      
      // Calcular estadísticas
      const stats = resultados.reduce((acc, resultado) => {
        acc.registrosActualizados += resultado.registros_actualizados || 0;
        acc.operaciones += 1;
        if (resultado.tipo === 'campo_unico') {
          acc.camposUnicos += 1;
        } else {
          acc.multicampo += 1;
        }
        return acc;
      }, { registrosActualizados: 0, operaciones: 0, camposUnicos: 0, multicampo: 0 });
      
      console.log("📊 Resultados:", { resultados, stats });
      
      // ✅ OPTIMIZACIÓN 5: Recargar solo si hubo cambios exitosos
      if (stats.registrosActualizados > 0) {
        await obtenerDatos();
        setModoEdicion(false);
        setDatosEditados({});
        
        alert(`✅ Guardado optimizado exitoso!\n` +
              `• ${stats.registrosActualizados} registros actualizados\n` +
              `• ${stats.operaciones} operaciones ejecutadas\n` +
              `• ${stats.camposUnicos} campos únicos + ${stats.multicampo} multicampo`);
      } else {
        throw new Error("No se actualizaron registros");
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
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition font-semibold disabled:bg-gray-600 relative"
              >
                {guardandoCambios ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>
                      💾 Guardando... 
                      {progresoGuardado.total > 0 && (
                        <span className="ml-1">
                          ({progresoGuardado.actual}/{progresoGuardado.total})
                        </span>
                      )}
                    </span>
                  </div>
                ) : "💾 Guardar Cambios"}
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

      {/* 🆕 Panel de Filtros Avanzados por Columnas */}
      <div className="bg-gray-800/50 p-3 rounded-lg mb-3 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm"
            >
              <span>{mostrarFiltros ? '🔽' : '▶️'}</span>
              Filtros por Columna
              {filtrosActivos > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {filtrosActivos}
                </span>
              )}
            </button>
            
            {filtrosActivos > 0 && (
              <button
                onClick={limpiarFiltros}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
              >
                🗑️ Limpiar Todos
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-300">
            Mostrando: <span className="text-blue-400 font-bold">{datosFiltrados.length}</span> de <span className="text-gray-400">{datos.length}</span> registros
          </div>
        </div>

        {mostrarFiltros && (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">
              💡 Filtros se aplican en tiempo real sobre los datos cargados
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {columnas.map(columna => (
                <div key={columna} className="relative">
                  <label className="block text-xs text-gray-400 mb-1 capitalize">
                    {columna.replace(/_/g, " ")}
                    {filtrosColumnas[columna] && (
                      <button
                        onClick={() => limpiarFiltroColumna(columna)}
                        className="ml-2 text-red-400 hover:text-red-300"
                        title="Limpiar filtro"
                      >
                        ✕
                      </button>
                    )}
                  </label>
                  
                  {/* Para columnas con pocos valores únicos, mostrar dropdown */}
                  {valoresUnicos[columna]?.length <= 20 ? (
                    <select
                      value={filtrosColumnas[columna] || ''}
                      onChange={(e) => aplicarFiltro(columna, e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-xs"
                    >
                      <option value="">Todos ({valoresUnicos[columna]?.length || 0})</option>
                      {valoresUnicos[columna]?.map(valor => (
                        <option key={valor} value={valor}>
                          {valor?.toString().substring(0, 30)}
                          {valor?.toString().length > 30 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    /* Para columnas con muchos valores, mostrar input de búsqueda */
                    <input
                      type="text"
                      placeholder={`Buscar en ${columna.replace(/_/g, " ")}...`}
                      value={filtrosColumnas[columna] || ''}
                      onChange={(e) => aplicarFiltro(columna, e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-xs"
                    />
                  )}
                  
                  {/* Indicador de valores únicos */}
                  <div className="text-xs text-gray-500 mt-1">
                    {valoresUnicos[columna]?.length || 0} valores únicos
                  </div>
                </div>
              ))}
            </div>
            
            {/* Filtros activos */}
            {filtrosActivos > 0 && (
              <div className="mt-3 p-2 bg-gray-700/50 rounded">
                <div className="text-xs text-gray-400 mb-2">Filtros activos:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(filtrosColumnas)
                    .filter(([, valor]) => valor)
                    .map(([columna, valor]) => (
                      <span
                        key={columna}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded text-xs"
                      >
                        <span className="capitalize">{columna.replace(/_/g, " ")}</span>
                        <span>:</span>
                        <span className="font-mono">"{valor.toString().substring(0, 15)}{valor.toString().length > 15 ? '...' : ''}"</span>
                        <button
                          onClick={() => limpiarFiltroColumna(columna)}
                          className="ml-1 text-purple-200 hover:text-white"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
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
            <table className="w-full text-xs">
              <thead className="bg-gray-700">
                <tr>
                  {columnas.map((col) => (
                    <th key={col} className={`px-2 py-2 text-left text-white font-semibold border-b border-gray-600 text-xs ${col === 'cliente' ? 'whitespace-nowrap' : 'whitespace-nowrap'}`}>
                      {col === 'cliente' 
                        ? col.replace(/_/g, " ")
                        : col.replace(/_/g, " ").substring(0, 15)
                      }
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datosPaginados.map((row, idx) => {
                  // Calcular el índice real en la lista completa
                  const indiceReal = indiceInicio + idx;
                  // Usar ID único si existe, sino usar índice real
                  const keyUnica = row.id || row.ID || `row-${indiceReal}`;
                  return (
                  <tr key={keyUnica} className={idx % 2 === 0 ? "bg-gray-900/30" : "bg-gray-800/30"}>
                    {columnas.map((col) => (
                      <td key={col} className="px-2 py-1 text-gray-200 border-b border-gray-700 text-xs min-w-0">
                        {modoEdicion ? (
                          col === 'procesador' && procesadores.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[indiceReal]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(indiceReal, col, value)}
                              options={procesadores}
                              className="text-xs h-6"
                            />
                          ) : col === 'sucursal' && sucursales.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[indiceReal]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(indiceReal, col, value)}
                              options={sucursales}
                              className="text-xs h-6"
                            />
                          ) : col === 'bloque' && bloques.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[indiceReal]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(indiceReal, col, value)}
                              options={bloques}
                              className="min-w-[120px] text-xs h-6"
                            />
                          ) : col === 'vendedora' && vendedoras.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[indiceReal]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(indiceReal, col, value)}
                              options={vendedoras}
                              className="text-xs h-6"
                            />
                          ) : col === 'comentarios' && comentariosComunes.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[indiceReal]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(indiceReal, col, value)}
                              options={comentariosComunes}
                              className="min-w-[150px] text-xs h-6"
                            />
                          ) : col === 'captura_cc' && capturaCC.length > 0 ? (
                            <SelectEditor
                              value={datosEditados[indiceReal]?.[col] || row[col] || ""}
                              onChange={(value) => actualizarCampo(indiceReal, col, value)}
                              options={capturaCC}
                              className="text-xs h-6"
                            />
                          ) : col === 'euroskin' ? (
                            <select
                              value={datosEditados[indiceReal]?.[col] || row[col] || ""}
                              onChange={(e) => actualizarCampo(indiceReal, col, e.target.value)}
                              className="w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6"
                            >
                              <option value="">-</option>
                              <option value="TRUE">Sí</option>
                              <option value="FALSE">No</option>
                            </select>
                          ) : (col.includes('fecha') || col.includes('fecha_')) ? (
                            <input
                              type="date"
                              value={convertirFechaParaInput(datosEditados[indiceReal]?.[col] || row[col]?.toString() || "")}
                              onChange={(e) => {
                                // Convertir de YYYY-MM-DD a DD/MM/YYYY al guardar
                                const fechaFormateada = convertirFechaDesdeInput(e.target.value);
                                actualizarCampo(indiceReal, col, fechaFormateada);
                              }}
                              className="w-full bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6"
                              title="Formato: DD/MM/YYYY"
                            />
                          ) : col === 'monto' ? (
                            <input
                              type="number"
                              step="0.01"
                              value={datosEditados[indiceReal]?.[col] || row[col]?.toString() || ""}
                              onChange={(e) => actualizarCampo(indiceReal, col, e.target.value)}
                              className="min-w-[140px] bg-gray-700 text-white px-1 py-0 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-xs h-6"
                              placeholder="Monto original"
                              title="Al editar este campo, se calculará automáticamente el monto en MXN"
                            />
                          ) : col === 'monto_mnx' ? (
                            <div className="relative min-w-[140px]">
                              <input
                                type="number"
                                step="0.01"
                                value={datosEditados[indiceReal]?.[col] || row[col]?.toString() || ""}
                                onChange={(e) => actualizarCampo(indiceReal, col, e.target.value)}
                                className={`w-full px-1 py-0 rounded border focus:outline-none text-xs h-6 ${
                                  datosEditados[indiceReal]?.monto_mnx ? 
                                  'bg-green-700/50 text-green-100 border-green-500 focus:border-green-400' : 
                                  'bg-gray-700 text-white border-gray-600 focus:border-blue-500'
                                }`}
                                placeholder="Auto-calculado"
                                title={datosEditados[indiceReal]?.monto_mnx ? 'Convertido automáticamente desde el monto original' : 'Monto en pesos mexicanos'}
                              />
                              {datosEditados[indiceReal]?.monto_mnx && (
                                <span className="absolute -top-1 -right-1 text-green-400 text-xs">🔄</span>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={datosEditados[indiceReal]?.[col] || row[col]?.toString() || ""}
                              onChange={(e) => actualizarCampo(indiceReal, col, e.target.value)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controles de paginación de tabla */}
      {datos.length > 0 && (
        <div className="flex justify-between items-center mt-3 p-3 bg-gray-900/50 rounded">
          <div className="flex items-center gap-4">
            <div className="text-gray-300 text-sm">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFin, datos.length)} de {datos.length} registros
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm">Filas por página:</span>
              <select
                value={filasPorPagina}
                onChange={(e) => cambiarFilasPorPagina(parseInt(e.target.value))}
                className="bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => irAPagina(1)}
              disabled={paginaActual === 1}
              className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
            >
              ⏮️
            </button>
            <button
              onClick={() => irAPagina(paginaActual - 1)}
              disabled={paginaActual === 1}
              className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
            >
              ⬅️
            </button>
            
            <div className="flex items-center gap-1">
              {/* Mostrar páginas cercanas */}
              {Array.from({ length: Math.min(5, totalPaginasTabla) }, (_, i) => {
                let numeroPagina;
                if (totalPaginasTabla <= 5) {
                  numeroPagina = i + 1;
                } else if (paginaActual <= 3) {
                  numeroPagina = i + 1;
                } else if (paginaActual > totalPaginasTabla - 3) {
                  numeroPagina = totalPaginasTabla - 4 + i;
                } else {
                  numeroPagina = paginaActual - 2 + i;
                }
                
                return (
                  <button
                    key={numeroPagina}
                    onClick={() => irAPagina(numeroPagina)}
                    className={`px-2 py-1 rounded text-xs transition ${
                      numeroPagina === paginaActual
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {numeroPagina}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => irAPagina(paginaActual + 1)}
              disabled={paginaActual === totalPaginasTabla}
              className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
            >
              ➡️
            </button>
            <button
              onClick={() => irAPagina(totalPaginasTabla)}
              disabled={paginaActual === totalPaginasTabla}
              className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:bg-gray-800 disabled:cursor-not-allowed text-xs"
            >
              ⏭️
            </button>
          </div>
        </div>
      )}

      {/* Paginación de consulta API */}
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
