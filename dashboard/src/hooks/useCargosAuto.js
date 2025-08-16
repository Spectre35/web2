import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { formatearFechasEnObjeto, formatearFecha } from "../utils/dateUtils";
import { API_BASE_URL } from "../config.js";
import { useMainScroll } from "../layouts/DashboardLayout";

/**
 * 🚀 Custom Hook para manejar toda la lógica de CargosAuto
 * 
 * Este hook centraliza:
 * - Estado de datos y filtros
 * - Lógica de API calls
 * - Filtros y paginación
 * - Funciones de exportación
 * 
 * @returns {Object} Estado y funciones para el componente CargosAuto
 */
export const useCargosAuto = () => {
  // ==================== ESTADOS ====================
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
  
  // Estados para filtros tipo Excel por columna
  const [filtrosColumnas, setFiltrosColumnas] = useState({});
  const [dropdownsAbiertos, setDropdownsAbiertos] = useState({});
  const [valoresUnicos, setValoresUnicos] = useState({});
  const [busquedaFiltros, setBusquedaFiltros] = useState({});
  const [ordenColumnas, setOrdenColumnas] = useState({});
  const [seleccionMultiple, setSeleccionMultiple] = useState({});
  const [ordenTabla, setOrdenTabla] = useState({ columna: null, direccion: null });
  const [filtroCargoAuto, setFiltroCargoAuto] = useState(false);
  const [limite, setLimite] = useState(100);

  // Referencias
  const dropdownRef = useRef(null);
  const mainRef = useMainScroll();
  const scrollTopRef = useRef(null);
  const tableContainerRef = useRef(null);
  const throttleTimeoutRef = useRef(null);

  // ==================== FUNCIONES DE API ====================
  
  const obtenerSucursales = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/sucursales`);
      setSucursales(res.data);
    } catch (error) {
      console.error("Error al obtener sucursales", error);
      setSucursales([]);
    }
  }, []);

  const obtenerProcesadores = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/cargos_auto/procesadores`);
      setProcesadores(res.data);
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
          procesadores: procesadorSeleccionado,
          // Agregar filtros por columna y CargoAuto
          filtros_columnas: JSON.stringify(filtrosColumnas),
          filtro_cargo_auto: filtroCargoAuto,
          pagina: pagina,
          limite: limite,
        },
        paramsSerializer: params => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v));
            } else if (value !== undefined) {
              searchParams.append(key, value || "");
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
  }, [busqueda, sucursal, fechaInicio, fechaFin, montoMin, montoMax, tarjeta, terminacion, procesadorSeleccionado, filtrosColumnas, filtroCargoAuto, pagina, limite, mainRef]);

  // ==================== EFECTOS ====================
  
  useEffect(() => {
    obtenerSucursales();
    obtenerProcesadores();
    obtenerDatos();
  }, [obtenerSucursales, obtenerProcesadores, obtenerDatos]);

  useEffect(() => {
    if (limite !== 100) {
      obtenerDatos();
    }
  }, [limite, obtenerDatos]);

  // useEffect para recargar datos cuando cambian los filtros por columna o CargoAuto
  useEffect(() => {
    setPagina(1);
    obtenerDatos();
  }, [filtrosColumnas, filtroCargoAuto]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/cargos_auto/ultima-fecha`)
      .then((res) => setFechaUltima(formatearFecha(res.data.fecha)))
      .catch(() => setFechaUltima(""));
  }, []);

  // ==================== FUNCIONES COMPUTADAS ====================
  
  const columnas = datos.length > 0 ? Object.keys(datos[0]) : [];

  // Datos con ordenamiento aplicado (los filtros ya se procesan en el backend)
  const datosFiltrados = useMemo(() => {
    let resultado = [...datos];
    
    // Solo aplicar ordenamiento local
    if (ordenTabla.columna) {
      resultado = resultado.sort((a, b) => {
        const valorA = a[ordenTabla.columna];
        const valorB = b[ordenTabla.columna];
        
        if (valorA === null || valorA === undefined) return 1;
        if (valorB === null || valorB === undefined) return -1;
        
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
  }, [datos, ordenTabla]);

  const totalMostrado = useMemo(() => {
    return total;
  }, [total]);

  const totalPaginasCalculado = useMemo(() => {
    return Math.max(1, Math.ceil(total / limite));
  }, [total, limite]);

  // ==================== HANDLERS ====================
  
  const handlePrevPage = useCallback(() => {
    setPagina((p) => Math.max(p - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPagina((p) => Math.min(p + 1, totalPaginasCalculado));
  }, [totalPaginasCalculado]);

  const handleSearchSubmit = useCallback(() => {
    setPagina(1);
    obtenerDatos();
  }, [obtenerDatos]);

  const exportarExcel = useCallback(() => {
    const params = new URLSearchParams();
    
    if (busqueda) params.append("cliente", busqueda);
    if (sucursal) params.append("sucursal", sucursal);
    if (fechaInicio) params.append("fecha_inicio", fechaInicio);
    if (fechaFin) params.append("fecha_fin", fechaFin);
    if (montoMin) params.append("monto_min", montoMin);
    if (montoMax) params.append("monto_max", montoMax);
    if (tarjeta) params.append("tarjeta", tarjeta);
    if (terminacion) params.append("terminacion", terminacion);
    procesadorSeleccionado.forEach(p => params.append("procesadores", p));
    
    if (filtroCargoAuto) {
      params.append("filtro_cargos_auto", "true");
    }
    
    if (Object.keys(filtrosColumnas).length > 0) {
      params.append("filtros_columnas", JSON.stringify(filtrosColumnas));
    }
    
    window.open(`${API_BASE_URL}/cargos_auto/exportar?${params.toString()}`, '_blank');
  }, [busqueda, sucursal, fechaInicio, fechaFin, montoMin, montoMax, tarjeta, terminacion, procesadorSeleccionado, filtrosColumnas, filtroCargoAuto]);

  // ==================== FUNCIONES DE FILTROS ====================
  
  const calcularValoresUnicos = useCallback((datos) => {
    if (!datos || datos.length === 0) return {};
    
    const unicos = {};
    const columnas = Object.keys(datos[0]);
    
    columnas.forEach(col => {
      const valores = [...new Set(datos.map(row => row[col]).filter(val => val !== null && val !== undefined))];
      unicos[col] = valores.sort();
    });
    
    return unicos;
  }, []);

  useEffect(() => {
    if (datos.length > 0) {
      setValoresUnicos(calcularValoresUnicos(datos));
    }
  }, [datos, calcularValoresUnicos]);

  // ==================== RETURN ====================
  
  return {
    // Estados
    datos,
    datosFiltrados,
    sucursales,
    procesadores,
    busqueda,
    sucursal,
    fechaInicio,
    fechaFin,
    montoMin,
    montoMax,
    tarjeta,
    terminacion,
    procesadorSeleccionado,
    pagina,
    cargando,
    total,
    totalMostrado,
    totalPaginasCalculado,
    fechaUltima,
    dropdownOpen,
    filtrosColumnas,
    dropdownsAbiertos,
    valoresUnicos,
    busquedaFiltros,
    ordenColumnas,
    seleccionMultiple,
    ordenTabla,
    filtroCargoAuto,
    limite,
    columnas,
    
    // Referencias
    dropdownRef,
    mainRef,
    scrollTopRef,
    tableContainerRef,
    throttleTimeoutRef,
    
    // Setters
    setBusqueda,
    setSucursal,
    setFechaInicio,
    setFechaFin,
    setMontoMin,
    setMontoMax,
    setTarjeta,
    setTerminacion,
    setProcesadorSeleccionado,
    setPagina,
    setDropdownOpen,
    setFiltrosColumnas,
    setDropdownsAbiertos,
    setBusquedaFiltros,
    setOrdenColumnas,
    setSeleccionMultiple,
    setOrdenTabla,
    setFiltroCargoAuto,
    setLimite,
    
    // Funciones
    obtenerDatos,
    handlePrevPage,
    handleNextPage,
    handleSearchSubmit,
    exportarExcel,
    calcularValoresUnicos,
  };
};

export default useCargosAuto;
