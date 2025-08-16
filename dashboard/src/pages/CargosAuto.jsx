import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { block } from "million/react";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";
import { useMainScroll } from "../layouts/DashboardLayout";

// Componente de filtro avanzado tipo Excel (memorizado para evitar re-renders)
const FiltroExcelAvanzado = memo(({ 
  columna, 
  valoresUnicos, 
  filtrosColumnas, 
  busquedaFiltros, 
  ordenColumnas, 
  seleccionMultiple, 
  datos,
  onBusquedaChange, 
  onOrdenarChange, 
  onToggleSeleccion, 
  onSeleccionarTodos, 
  onDeseleccionarTodos, 
  onAplicarSeleccion, 
  onLimpiarFiltro, 
  onCerrar,
  obtenerValoresFiltrados
}) => {
  const valoresFiltrados = obtenerValoresFiltrados(columna);
  const seleccionados = seleccionMultiple[columna] || [];
  const busqueda = busquedaFiltros[columna] || '';
  const orden = ordenColumnas[columna] || 'asc';
  
  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-gray-800 border border-gray-600/50 rounded-lg shadow-lg min-w-72 max-w-80 max-h-96 flex flex-col backdrop-blur-sm">
      {/* Header */}
      <div className="p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-200">{columna}</h4>
          <button
            onClick={() => onCerrar(columna)}
            className="text-gray-400 hover:text-gray-200 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700/50"
          >
            ×
          </button>
        </div>
        
        {/* Búsqueda */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(columna, e.target.value)}
            className="w-full px-3 py-2 bg-gray-700/50 text-gray-100 rounded border border-gray-600/50 focus:border-blue-500/50 focus:outline-none text-sm"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          {busqueda && (
            <button
              onClick={() => onBusquedaChange(columna, '')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Controles */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => onOrdenarChange(columna, orden === 'asc' ? 'desc' : 'asc')}
            className={`px-2 py-1 rounded ${
              orden === 'asc' 
                ? 'bg-blue-600/80 text-white' 
                : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70'
            }`}
            title={`Ordenar ${orden === 'asc' ? 'Z-A' : 'A-Z'}`}
          >
            {orden === 'asc' ? '↓' : '↑'}
          </button>
          
          <button
            onClick={() => onSeleccionarTodos(columna)}
            className="px-2 py-1 bg-green-600/80 text-white rounded hover:bg-green-600"
            title="Seleccionar todos"
          >
            Todo
          </button>
          
          <button
            onClick={() => onDeseleccionarTodos(columna)}
            className="px-2 py-1 bg-red-600/80 text-white rounded hover:bg-red-600"
            title="Deseleccionar todos"
          >
            Nada
          </button>
          
          <button
            onClick={() => onLimpiarFiltro(columna)}
            className="px-2 py-1 bg-gray-600/80 text-white rounded hover:bg-gray-600"
            title="Limpiar filtro"
          >
            Limpiar
          </button>
        </div>
      </div>
      
      {/* Lista de valores */}
      <div className="flex-1 overflow-auto p-3 max-h-64">
        <div className="text-xs text-gray-400 mb-2 p-2 bg-gray-700/30 rounded">
          {valoresFiltrados.length} de {valoresUnicos[columna]?.length || 0} elementos
          {seleccionados.length > 0 && (
            <span className="text-blue-400"> • {seleccionados.length} seleccionados</span>
          )}
        </div>
        
        {valoresFiltrados.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            {busqueda ? 'Sin resultados' : 'Sin valores'}
          </div>
        ) : (
          <div className="space-y-1">
            {valoresFiltrados.slice(0, 100).map((valor, idx) => (
              <label
                key={`${columna}-${valor}-${idx}`}
                className="flex items-center px-2 py-1.5 hover:bg-gray-700/50 cursor-pointer rounded text-sm"
              >
                <input
                  type="checkbox"
                  checked={seleccionados.includes(valor)}
                  onChange={() => onToggleSeleccion(columna, valor)}
                  className="mr-3 accent-blue-500 w-4 h-4"
                />
                <span className="text-gray-200 flex-1 truncate" title={valor?.toString()}>
                  {valor?.toString()}
                </span>
                <span className="text-xs text-gray-500 ml-2 bg-gray-600/50 px-1.5 py-0.5 rounded">
                  {datos.filter(row => row[columna] === valor).length}
                </span>
              </label>
            ))}
            {valoresFiltrados.length > 100 && (
              <div className="text-xs text-gray-500 text-center py-2">
                ... y {valoresFiltrados.length - 100} más
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-gray-700/50">
        <div className="flex gap-2">
          <button
            onClick={() => onAplicarSeleccion(columna)}
            className="flex-1 bg-blue-600/90 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium"
            disabled={seleccionados.length === 0}
          >
            Aplicar ({seleccionados.length})
          </button>
          <button
            onClick={() => onCerrar(columna)}
            className="px-3 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 rounded text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
});

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // 🆕 Estados para filtros tipo Excel por columna
  const [filtrosColumnas, setFiltrosColumnas] = useState({});
  const [dropdownsAbiertos, setDropdownsAbiertos] = useState({});
  const [valoresUnicos, setValoresUnicos] = useState({});
  const [busquedaFiltros, setBusquedaFiltros] = useState({});
  const [ordenColumnas, setOrdenColumnas] = useState({});
  const [seleccionMultiple, setSeleccionMultiple] = useState({});
  const [ordenTabla, setOrdenTabla] = useState({ columna: null, direccion: null });
  const [filtroCargoAuto, setFiltroCargoAuto] = useState(false);
  const [limite, setLimite] = useState(100); // 🆕 Límite configurable
  
  const dropdownRef = useRef(null);
  const mainRef = useMainScroll();

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

  useEffect(() => {
    obtenerSucursales();
    obtenerProcesadores();
    obtenerDatos();
    // eslint-disable-next-line
  }, [pagina]);

  // 🆕 useEffect para recargar datos cuando cambia el límite
  useEffect(() => {
    if (limite !== 100) { // Solo si cambió del valor por defecto
      obtenerDatos();
    }
    // eslint-disable-next-line
  }, [limite]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/cargos_auto/ultima-fecha`)
      .then((res) => setFechaUltima(formatearFecha(res.data.fecha)))
      .catch(() => setFechaUltima(""));
  }, []);

  const obtenerSucursales = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/sucursales`);
      setSucursales(res.data);
    } catch (error) {
      console.error("Error al obtener sucursales", error);
    }
  }, []);

  // Nuevo: obtener procesadores individuales
  const obtenerProcesadores = useCallback(async () => {
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
  }, []);

  const obtenerDatos = useCallback(async () => {
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
      if (mainRef?.current) mainRef.current.scrollTop = 0;
    } catch (error) {
      setCargando(false);
      console.error('Error al obtener datos:', error);
    }
  }, [busqueda, sucursal, fechaInicio, fechaFin, montoMin, montoMax, tarjeta, terminacion, procesadorSeleccionado, pagina, limite, mainRef]);

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
      
      // Cerrar dropdowns de filtros de columnas al hacer clic fuera
      if (!event.target.closest('th') && 
          !event.target.closest('.absolute') && 
          !event.target.closest('button') && 
          !event.target.closest('input') &&
          !event.target.closest('label')) {
        setDropdownsAbiertos({});
      }
    };
    
    // También cerrar con Escape
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownsAbiertos({});
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleProcesadorToggle = (proc) => {
    setProcesadorSeleccionado((prev) =>
      prev.includes(proc)
        ? prev.filter((p) => p !== proc)
        : [...prev, proc]
    );
  };

  // 🆕 Funciones para filtros tipo Excel avanzados
  const calcularValoresUnicos = useCallback((datos) => {
    if (!datos || datos.length === 0) return {};
    
    const valoresColumnas = {};
    const columnas = Object.keys(datos[0]);
    
    columnas.forEach(columna => {
      const valores = [...new Set(datos.map(row => row[columna]).filter(val => val !== null && val !== undefined && val !== ''))];
      valoresColumnas[columna] = valores.sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
          return a.localeCompare(b, 'es', { sensitivity: 'base' });
        }
        return a < b ? -1 : a > b ? 1 : 0;
      });
    });
    
    return valoresColumnas;
  }, []);

  const obtenerValoresFiltrados = useCallback((columna) => {
    const valores = valoresUnicos[columna] || [];
    const busqueda = busquedaFiltros[columna] || '';
    const orden = ordenColumnas[columna] || 'asc';
    
    let valoresFiltrados = valores.filter(valor => 
      valor.toString().toLowerCase().includes(busqueda.toLowerCase())
    );
    
    if (orden === 'desc') {
      valoresFiltrados = valoresFiltrados.reverse();
    }
    
    return valoresFiltrados;
  }, [valoresUnicos, busquedaFiltros, ordenColumnas]);

  const toggleDropdownColumna = useCallback((columna) => {
    setDropdownsAbiertos(prev => ({
      ...prev,
      [columna]: !prev[columna]
    }));
    
    // Inicializar búsqueda si no existe
    if (!busquedaFiltros[columna]) {
      setBusquedaFiltros(prev => ({ ...prev, [columna]: '' }));
    }
  }, [busquedaFiltros]);

  const manejarBusquedaFiltro = useCallback((columna, valor) => {
    setBusquedaFiltros(prev => ({
      ...prev,
      [columna]: valor
    }));
  }, []);

  const ordenarValoresColumna = useCallback((columna, orden) => {
    // Actualizar el orden en el dropdown del filtro
    setOrdenColumnas(prev => ({
      ...prev,
      [columna]: orden
    }));
    
    // También aplicar el ordenamiento en la tabla principal
    setOrdenTabla({
      columna: columna,
      direccion: orden
    });
  }, []);

  const manejarOrdenamientoColumna = useCallback((columna) => {
    const ordenActual = ordenTabla.columna === columna ? ordenTabla.direccion : null;
    let nuevaDirection;
    
    if (ordenActual === null) {
      nuevaDirection = 'asc';
    } else if (ordenActual === 'asc') {
      nuevaDirection = 'desc';
    } else {
      nuevaDirection = 'asc';
    }
    
    // Actualizar tanto el orden de la tabla como el del filtro
    setOrdenTabla({
      columna: columna,
      direccion: nuevaDirection
    });
    
    setOrdenColumnas(prev => ({
      ...prev,
      [columna]: nuevaDirection
    }));
  }, [ordenTabla]);

  const aplicarFiltroColumna = useCallback((columna, valor) => {
    setFiltrosColumnas(prev => {
      const nuevos = { ...prev };
      if (valor === '' || valor === null) {
        delete nuevos[columna];
      } else {
        nuevos[columna] = valor;
      }
      return nuevos;
    });
    
    // Cerrar dropdown después de seleccionar
    setDropdownsAbiertos(prev => ({
      ...prev,
      [columna]: false
    }));
    
    // Reset a página 1 cuando se aplica un filtro
    setPagina(1);
  }, []);

  const toggleSeleccionMultiple = useCallback((columna, valor) => {
    setSeleccionMultiple(prev => {
      const seleccionActual = prev[columna] || [];
      const nuevaSeleccion = seleccionActual.includes(valor)
        ? seleccionActual.filter(v => v !== valor)
        : [...seleccionActual, valor];
      
      return {
        ...prev,
        [columna]: nuevaSeleccion
      };
    });
  }, []);

  const aplicarSeleccionMultiple = useCallback((columna) => {
    setSeleccionMultiple(prev => {
      const seleccionados = prev[columna] || [];
      if (seleccionados.length === 0) {
        // Si no hay selección, limpiar filtro
        setFiltrosColumnas(prevFiltros => {
          const nuevos = { ...prevFiltros };
          delete nuevos[columna];
          return nuevos;
        });
      } else {
        // Aplicar selección múltiple
        setFiltrosColumnas(prevFiltros => ({
          ...prevFiltros,
          [columna]: seleccionados
        }));
      }
      return prev;
    });
    
    setDropdownsAbiertos(prev => ({
      ...prev,
      [columna]: false
    }));
    setPagina(1);
  }, []);

  const limpiarFiltroColumna = useCallback((columna) => {
    setFiltrosColumnas(prev => {
      const nuevos = { ...prev };
      delete nuevos[columna];
      return nuevos;
    });
    setSeleccionMultiple(prev => {
      const nuevos = { ...prev };
      delete nuevos[columna];
      return nuevos;
    });
  }, []);

  const limpiarTodosFiltros = useCallback(() => {
    setFiltrosColumnas({});
    setDropdownsAbiertos({});
    setBusquedaFiltros({});
    setOrdenColumnas({});
    setSeleccionMultiple({});
    setOrdenTabla({ columna: null, direccion: null });
    setFiltroCargoAuto(false);
  }, []);

  const seleccionarTodos = useCallback((columna) => {
    const valoresFiltrados = obtenerValoresFiltrados(columna);
    setSeleccionMultiple(prev => ({
      ...prev,
      [columna]: valoresFiltrados
    }));
  }, [obtenerValoresFiltrados]);

  const deseleccionarTodos = useCallback((columna) => {
    setSeleccionMultiple(prev => ({
      ...prev,
      [columna]: []
    }));
  }, []);

  // Filtrar y ordenar datos localmente con soporte para selección múltiple
  const datosFiltrados = useMemo(() => {
    let resultado = datos;
    
    // 1. Aplicar filtro de Cargos Auto (procesadores específicos)
    if (filtroCargoAuto) {
      const procesadoresCargoAuto = ['BSD', 'EFEVOO', 'STRIPE AUTO'];
      resultado = resultado.filter(row => {
        // Buscar en diferentes posibles nombres de columna para el procesador
        const procesador = row.Cobrado_Por || row.procesador || row.Procesador || row.cobrado_por || '';
        return procesadoresCargoAuto.some(proc => 
          procesador.toString().toUpperCase().includes(proc.toUpperCase())
        );
      });
    }
    
    // 2. Aplicar filtros de columnas
    if (resultado.length && Object.keys(filtrosColumnas).length) {
      resultado = resultado.filter(row => {
        return Object.entries(filtrosColumnas).every(([columna, valor]) => {
          const valorCelda = row[columna];
          if (valorCelda === null || valorCelda === undefined) return false;
          
          // Soporte para selección múltiple
          if (Array.isArray(valor)) {
            return valor.some(v => valorCelda.toString().toLowerCase().includes(v.toString().toLowerCase()));
          }
          
          return valorCelda.toString().toLowerCase().includes(valor.toString().toLowerCase());
        });
      });
    }
    
    // 3. Aplicar ordenamiento
    if (ordenTabla.columna && ordenTabla.direccion) {
      resultado = [...resultado].sort((a, b) => {
        const valorA = a[ordenTabla.columna];
        const valorB = b[ordenTabla.columna];
        
        // Manejar valores nulos
        if (valorA === null || valorA === undefined) return 1;
        if (valorB === null || valorB === undefined) return -1;
        
        // Convertir a string para comparación
        const strA = valorA.toString().toLowerCase();
        const strB = valorB.toString().toLowerCase();
        
        // Detectar si son números
        const numA = parseFloat(strA);
        const numB = parseFloat(strB);
        const sonNumeros = !isNaN(numA) && !isNaN(numB);
        
        let comparacion;
        if (sonNumeros) {
          comparacion = numA - numB;
        } else {
          comparacion = strA.localeCompare(strB, 'es', { sensitivity: 'base' });
        }
        
        return ordenTabla.direccion === 'asc' ? comparacion : -comparacion;
      });
    }
    
    return resultado;
  }, [datos, filtrosColumnas, ordenTabla, filtroCargoAuto]);

  // Funciones de exportación (después de datosFiltrados)
  const exportarExcel = useCallback(() => {
    const params = new URLSearchParams();
    
    // Filtros básicos
    if (busqueda) params.append("cliente", busqueda);
    if (sucursal) params.append("sucursal", sucursal);
    if (fechaInicio) params.append("fecha_inicio", fechaInicio);
    if (fechaFin) params.append("fecha_fin", fechaFin);
    if (montoMin) params.append("monto_min", montoMin);
    if (montoMax) params.append("monto_max", montoMax);
    if (tarjeta) params.append("tarjeta", tarjeta);
    if (terminacion) params.append("terminacion", terminacion);
    procesadorSeleccionado.forEach(p => params.append("procesadores", p));
    
    // Filtro de Cargos Auto
    if (filtroCargoAuto) {
      params.append("filtro_cargos_auto", "true");
    }
    
    // Filtros de columnas (tipo Excel)
    if (Object.keys(filtrosColumnas).length > 0) {
      params.append("filtros_columnas", JSON.stringify(filtrosColumnas));
    }
    
    // Abrir en nueva ventana para descarga
    window.open(`${API_BASE_URL}/cargos_auto/exportar?${params.toString()}`, '_blank');
  }, [busqueda, sucursal, fechaInicio, fechaFin, montoMin, montoMax, tarjeta, terminacion, procesadorSeleccionado, filtrosColumnas, filtroCargoAuto]);

  // Funciones auxiliares para exportación CSV (ya no necesarias con backend)
  // Las funciones convertirACSV y descargarCSV se han eliminado porque ahora el backend maneja la exportación

  // Calcular valores únicos cuando cambian los datos
  useEffect(() => {
    if (datos.length > 0) {
      setValoresUnicos(calcularValoresUnicos(datos));
    }
  }, [datos, calcularValoresUnicos]);

  // Componente optimizado para la tabla con Million.js y filtros Excel súper avanzados
  const TablaOptimizada = block(({ 
    datos, 
    columnas, 
    filtrosColumnas, 
    valoresUnicos, 
    dropdownsAbiertos, 
    busquedaFiltros,
    ordenColumnas,
    seleccionMultiple,
    ordenTabla,
    datosOriginales,
    onToggleDropdown, 
    onBusquedaChange,
    onOrdenarChange,
    onToggleSeleccion,
    onSeleccionarTodos,
    onDeseleccionarTodos,
    onAplicarSeleccion,
    onLimpiarFiltro,
    onCerrarDropdown,
    onOrdenarColumna,
    obtenerValoresFiltrados
  }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-700/50 text-left">
          {columnas.map((col, i) => (
            <th key={i} className="p-2 font-semibold text-gray-200 relative">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onOrdenarColumna(col)}
                  className="flex items-center gap-2 text-left hover:text-blue-300 transition-colors cursor-pointer flex-1"
                  title={`Ordenar por ${col}`}
                >
                  <span className="truncate pr-2">{col}</span>
                  {/* Indicador de ordenamiento en el título */}
                  {ordenTabla.columna === col && (
                    <span className="text-blue-400 text-lg">
                      {ordenTabla.direccion === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
                
                <div className="relative">
                  {/* Indicadores de estado */}
                  <div className="flex items-center gap-1">
                    {/* Indicador de filtro activo */}
                    {filtrosColumnas[col] && (
                      <span className="bg-blue-500 text-white text-xs px-1 rounded-full" title="Filtro activo">
                        {Array.isArray(filtrosColumnas[col]) 
                          ? filtrosColumnas[col].length 
                          : '1'
                        }
                      </span>
                    )}
                    
                    {/* Botón de filtro */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDropdown(col);
                      }}
                      className={`text-xs p-1 rounded transition-colors ${
                        dropdownsAbiertos[col] 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                      title="Filtro avanzado"
                    >
                      🔽
                    </button>
                  </div>
                  
                  {/* Dropdown de filtros súper avanzado */}
                  {dropdownsAbiertos[col] && (
                    <FiltroExcelAvanzado
                      columna={col}
                      valoresUnicos={valoresUnicos}
                      filtrosColumnas={filtrosColumnas}
                      busquedaFiltros={busquedaFiltros}
                      ordenColumnas={ordenColumnas}
                      seleccionMultiple={seleccionMultiple}
                      datos={datosOriginales}
                      onBusquedaChange={onBusquedaChange}
                      onOrdenarChange={onOrdenarChange}
                      onToggleSeleccion={onToggleSeleccion}
                      onSeleccionarTodos={onSeleccionarTodos}
                      onDeseleccionarTodos={onDeseleccionarTodos}
                      onAplicarSeleccion={onAplicarSeleccion}
                      onLimpiarFiltro={onLimpiarFiltro}
                      onCerrar={onCerrarDropdown}
                      obtenerValoresFiltrados={obtenerValoresFiltrados}
                    />
                  )}
                </div>
              </div>
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
  ));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-100">🔍 Buscador Cargos Auto</h1>
      </div>

      {/* Información de última actualización */}
      <div className="mb-6">
        <span className="text-sm text-gray-300 font-semibold">
          Última actualización en base de datos:{" "}
          {fechaUltima || "Sin registros"}
        </span>
      </div>

      {/* Filtros principales - Diseño minimalista */}
      <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/50 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔍</span>
          <h2 className="text-lg font-medium text-gray-200">Filtros</h2>
        </div>

        {/* Grid de filtros básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
          {/* Campo de búsqueda */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Cliente</label>
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Sucursal */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Sucursal</label>
            <select
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {/* Fecha inicio */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Fecha Inicio</label>
            <input
              type="date"
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {/* Fecha fin */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Fecha Fin</label>
            <input
              type="date"
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          {/* Monto mínimo */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Monto Mínimo</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={montoMin}
              onChange={(e) => setMontoMin(e.target.value)}
            />
          </div>

          {/* Monto máximo */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Monto Máximo</label>
            <input
              type="number"
              placeholder="999,999.99"
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={montoMax}
              onChange={(e) => setMontoMax(e.target.value)}
            />
          </div>

          {/* Procesadores */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Procesadores</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="w-full border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 rounded text-left focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex justify-between items-center"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                <span className={procesadorSeleccionado.length > 0 ? "text-gray-100" : "text-gray-500"}>
                  {procesadorSeleccionado.length > 0
                    ? `${procesadorSeleccionado.length} seleccionado${procesadorSeleccionado.length > 1 ? 's' : ''}`
                    : "Seleccionar"}
                </span>
                <span className={`text-gray-400 ${dropdownOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-gray-800 border border-gray-600 rounded shadow-lg">
                  {procesadores.map((proc, i) => (
                    <label
                      key={i}
                      className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={procesadorSeleccionado.includes(proc)}
                        onChange={() => handleProcesadorToggle(proc)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded mr-2"
                      />
                      <span className="text-gray-100">{proc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Número Tarjeta</label>
            <input
              type="text"
              placeholder="1234567890123456"
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={tarjeta}
              onChange={e => setTarjeta(e.target.value)}
            />
          </div>
        </div>

        {/* Fila inferior: Filtros adicionales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-gray-800/20 rounded border border-gray-700/40">
          {/* Terminación */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Terminación</label>
            <input
              type="text"
              placeholder="1234"
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={terminacion}
              onChange={e => setTerminacion(e.target.value)}
            />
          </div>
          
          {/* Cargos Auto */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Filtros Especiales</label>
            <div className="flex items-center space-x-2 p-2 bg-gray-800/30 rounded border border-gray-700/50">
              <input
                type="checkbox"
                id="cargosAutoFilter"
                checked={filtroCargoAuto}
                onChange={e => setFiltroCargoAuto(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded"
              />
              <label
                htmlFor="cargosAutoFilter"
                className="text-gray-300 text-sm cursor-pointer"
              >
                Cargos Auto (BSD, EFEVOO, STRIPE)
              </label>
            </div>
          </div>
          
          {/* Selector de registros */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Registros por Página</label>
            <select
              value={limite}
              onChange={e => {
                setLimite(Number(e.target.value));
                setPagina(1);
              }}
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>

          {/* Información de estado */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Estado</label>
            <div className="p-2 bg-gray-800/30 rounded border border-gray-700/50">
              <div className="text-sm text-gray-400">
                <div>Filtros: {Object.keys(filtrosColumnas).length + (filtroCargoAuto ? 1 : 0)}</div>
                <div>Por página: {limite}</div>
              </div>
            </div>
          </div>
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
        
        {/* Botón limpiar filtros de columnas */}
        {(Object.keys(filtrosColumnas).length > 0 || filtroCargoAuto || limite !== 100) && (
          <button
            onClick={() => {
              limpiarTodosFiltros();
              setLimite(100); // También resetear el límite
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition font-semibold"
          >
            🗑️ Limpiar Todo ({Object.keys(filtrosColumnas).length} filtros
            {filtroCargoAuto ? ' + Cargos Auto' : ''}
            {limite !== 100 ? ` + ${limite} reg.` : ''})
          </button>
        )}
      </div>

      {/* Panel de filtros activos */}
      {(Object.keys(filtrosColumnas).length > 0 || filtroCargoAuto) && (
        <div className="bg-blue-900/30 border border-blue-600/50 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-300 font-semibold">🔽 Filtros Activos:</span>
            <span className="text-gray-300">
              Mostrando {datosFiltrados.length} de {datos.length} registros
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Filtro Cargos Auto */}
            {filtroCargoAuto && (
              <span className="inline-flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                <span className="font-medium">🎯 Cargos Auto (Cobrado_Por):</span>
                <span className="font-mono">BSD, EFEVOO, STRIPE AUTO</span>
                <button
                  onClick={() => setFiltroCargoAuto(false)}
                  className="ml-1 text-purple-200 hover:text-white transition-colors"
                  title="Eliminar filtro"
                >
                  ✕
                </button>
              </span>
            )}
            
            {/* Filtros de columnas */}
            {Object.entries(filtrosColumnas).map(([columna, valor]) => (
              <span
                key={columna}
                className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-sm"
              >
                <span className="font-medium">{columna}:</span>
                {Array.isArray(valor) ? (
                  <span className="font-mono">
                    [{valor.length} elementos] 
                    {valor.length <= 2 
                      ? `"${valor.join('", "')}"` 
                      : `"${valor[0]}", "${valor[1]}"...`
                    }
                  </span>
                ) : (
                  <span className="font-mono">
                    "{valor.toString().substring(0, 20)}{valor.toString().length > 20 ? '...' : ''}"
                  </span>
                )}
                <button
                  onClick={() => limpiarFiltroColumna(columna)}
                  className="ml-1 text-blue-200 hover:text-white transition-colors"
                  title="Eliminar filtro"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla dinámica con filtros tipo Excel */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto relative">
          <style jsx>{`
            .tabla-container {
              position: relative;
              overflow: visible;
            }
            .tabla-container th {
              position: relative;
              overflow: visible;
            }
          `}</style>
          {cargando ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-lg">Cargando...</div>
            </div>
          ) : (
            <div className="tabla-container">
              <TablaOptimizada 
                datos={datosFiltrados} 
                columnas={columnas}
                filtrosColumnas={filtrosColumnas}
                valoresUnicos={valoresUnicos}
                dropdownsAbiertos={dropdownsAbiertos}
                busquedaFiltros={busquedaFiltros}
                ordenColumnas={ordenColumnas}
                seleccionMultiple={seleccionMultiple}
                ordenTabla={ordenTabla}
                datosOriginales={datos}
                onToggleDropdown={toggleDropdownColumna}
                onBusquedaChange={manejarBusquedaFiltro}
                onOrdenarChange={ordenarValoresColumna}
                onToggleSeleccion={toggleSeleccionMultiple}
                onSeleccionarTodos={seleccionarTodos}
                onDeseleccionarTodos={deseleccionarTodos}
                onAplicarSeleccion={aplicarSeleccionMultiple}
                onLimpiarFiltro={limpiarFiltroColumna}
                onCerrarDropdown={toggleDropdownColumna}
                onOrdenarColumna={manejarOrdenamientoColumna}
                obtenerValoresFiltrados={obtenerValoresFiltrados}
              />
            </div>
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
          Página {pagina} de {totalPaginas} | 
          {Object.keys(filtrosColumnas).length > 0 
            ? ` Filtrados: ${datosFiltrados.length} | Total: ${total}` 
            : ` Total: ${total}`
          } registros | 📊 {limite} por página
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
  );
}
