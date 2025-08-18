import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

// Utilidades para formateo
function formatCurrency(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '$0.00';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatNumber(numero) {
  if (numero === null || numero === undefined || isNaN(numero)) return '0';
  const num = typeof numero === 'string' ? parseFloat(numero) : numero;
  if (isNaN(num)) return '0';
  return num.toLocaleString('es-MX');
}

function formatFecha(fecha) {
  if (!fecha) return 'N/A';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('es-MX', { 
    weekday: 'short',
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatFechaCorta(fecha) {
  if (!fecha) return 'N/A';
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('es-MX', { 
    month: '2-digit', 
    day: '2-digit' 
  });
}

// Colores para las gráficas
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];
const PROCESADOR_COLORS = {
  'BSD': '#0088FE',
  'EFEVOO': '#00C49F', 
  'STRIPE AUTO': '#FFBB28'
};

// Tipos de vista
const VISTAS = {
  RESUMEN: 'resumen',
  POR_SUCURSAL: 'por_sucursal', 
  POR_PROCESADOR: 'por_procesador',
  DETALLE_COMPLETO: 'detalle_completo'
};

// Función para obtener un rango amplio que incluya datos disponibles
function obtenerRangoAmplioDefault() {
  const hoy = new Date();
  // Empezar desde el 1 de enero del año actual
  const fechaInicio = new Date(hoy.getFullYear(), 0, 1); // Primer día del año actual
  // Fecha fin es ayer (un día menos que hoy)
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  
  // Usar formato local para evitar problemas de zona horaria
  const formatearFechaLocal = (fecha) => {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };
  
  return {
    fechaInicio: formatearFechaLocal(fechaInicio),
    fechaFin: formatearFechaLocal(ayer)
  };
}

export default function DashboardCargosAuto() {
  // Función auxiliar para formatear fechas locales sin problemas de zona horaria
  const formatearFechaLocal = (fecha) => {
    if (!fecha) return '';
    
    // Si recibimos un string de fecha (YYYY-MM-DD), devolverlo tal como está
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fecha;
    }
    
    // Si recibimos un objeto Date, usar la fecha local
    if (fecha instanceof Date) {
      const año = fecha.getFullYear();
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const dia = fecha.getDate().toString().padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    }
    
    return '';
  };

  // Estados
  const [anio, setAnio] = useState("2025");
  const [bloque, setBloque] = useState("");
  const [mes, setMes] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [anios, setAnios] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [vistaActual, setVistaActual] = useState('resumen');
  const [ordenTabla, setOrdenTabla] = useState({ campo: 'monto_total', direccion: 'desc' });
  const [tablaExpandida, setTablaExpandida] = useState(false); // Estado para expandir tabla
  const [sucursalesExpandidas, setSucursalesExpandidas] = useState({}); // Estado para expandir sucursales individuales
  
  // Estados para la nueva vista diaria
  const [filtroFechaDias, setFiltroFechaDias] = useState(7); // Últimos 7 días por defecto
  const [busquedaSucursal, setBusquedaSucursal] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina] = useState(10);
  const [procesadorExpandido, setProcesadorExpandido] = useState('consolidado'); // 'consolidado', 'BSD', 'EFEVOO', 'STRIPE AUTO'
  const [vistaCompacta, setVistaCompacta] = useState(true);
  
  // Nuevos estados para filtros avanzados
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [sucursalUniversal, setSucursalUniversal] = useState(''); // Filtro universal de sucursal
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [filtroProcesador, setFiltroProcesador] = useState('');
  const [vistaDetallada, setVistaDetallada] = useState(VISTAS.RESUMEN);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  
  const [meses] = useState([
    { valor: "1", nombre: "ENERO" }, { valor: "2", nombre: "FEBRERO" }, { valor: "3", nombre: "MARZO" },
    { valor: "4", nombre: "ABRIL" }, { valor: "5", nombre: "MAYO" }, { valor: "6", nombre: "JUNIO" },
    { valor: "7", nombre: "JULIO" }, { valor: "8", nombre: "AGOSTO" }, { valor: "9", nombre: "SEPTIEMBRE" },
    { valor: "10", nombre: "OCTUBRE" }, { valor: "11", nombre: "NOVIEMBRE" }, { valor: "12", nombre: "DICIEMBRE" }
  ]);

  // Inicializar fechas con un rango amplio
  useEffect(() => {
    const { fechaInicio: inicio, fechaFin: fin } = obtenerRangoAmplioDefault();
    setFechaInicio(inicio);
    setFechaFin(fin);
  }, []);

  // Cargar opciones de filtros
  useEffect(() => {
    
    // Cargar años
    axios.get(`${API_BASE_URL}/anios`)
      .then(r => {
        setAnios(r.data.map(a => a.toString()));
      })
      .catch(e => {
        console.error('❌ Error cargando años:', e);
        setAnios(['2024', '2025']);
      });
    
    // Cargar bloques específicos para cargos_auto
    // En lugar de usar el endpoint general, usar los bloques conocidos de cargos_auto
    setBloques(['Col1', 'Mty1', 'Mty2', 'Mty3', 'Mty4', 'Sin1', 'Sin2', 'Sin3']);
  }, []);

  // Función para cargar dashboard (manual)
  const cargarDashboard = () => {
    setLoading(true);
    setError("");
    setCambiosPendientes(false); // Resetear cambios pendientes
    
    // Preparar parámetros para el backend
    const params = {};
    
    // Solo agregar parámetros si tienen valores válidos
    if (bloque && bloque !== '' && bloque !== 'Todos los bloques') params.bloque = bloque; // ✅ FIX: No enviar si es "Todos los bloques"
    if (fechaInicio && fechaInicio !== '') params.fechaInicio = fechaInicio;
    if (fechaFin && fechaFin !== '') params.fechaFin = fechaFin;
    if (sucursalUniversal && sucursalUniversal !== '' && sucursalUniversal !== 'Todas las sucursales') params.sucursal = sucursalUniversal;
    
    console.log('� DEBUG TEMPORAL - Parámetros enviados al backend:', params);
    console.log('🚨 DEBUG TEMPORAL - Estado bloque:', bloque, 'es vacío?', bloque === '');
    console.log('🚨 DEBUG TEMPORAL - Todos los filtros:', { bloque, fechaInicio, fechaFin, sucursalUniversal });
    
    axios.get(`${API_BASE_URL}/cargos_auto/dashboard`, { params })
      .then(r => {
        console.log('🚨 DEBUG TEMPORAL - Respuesta del backend:', {
          consolidado: r.data.desglosePorDiaConsolidado?.length || 0,
          porProcesador: r.data.desglosePorDiaProcesador?.length || 0,
          porSucursal: r.data.desglosePorDiaProcesadorSucursal?.length || 0
        });
        setDashboard(r.data);
        
        // Extraer sucursales únicas de los datos
        extraerSucursalesDisponibles(r.data);
      })
      .catch(e => {
        console.error('❌ Error cargando dashboard:', e);
        const errorMsg = e?.response?.data?.error || 
                        e?.response?.data?.message || 
                        e?.message || 
                        "Error al cargar datos del dashboard";
        setError(errorMsg);
      })
      .finally(() => setLoading(false));
  };

  // Función para extraer sucursales únicas de los datos
  const extraerSucursalesDisponibles = (data) => {
    const sucursalesSet = new Set();
    
    // Extraer de registrosPorSucursal
    if (data.registrosPorSucursal) {
      data.registrosPorSucursal.forEach(item => {
        if (item.Sucursal && item.Sucursal.trim() !== '') {
          sucursalesSet.add(item.Sucursal.trim());
        }
      });
    }
    
    // Extraer de desglosePorDiaProcesadorSucursal
    if (data.desglosePorDiaProcesadorSucursal) {
      data.desglosePorDiaProcesadorSucursal.forEach(item => {
        if (item.Sucursal && item.Sucursal.trim() !== '') {
          sucursalesSet.add(item.Sucursal.trim());
        }
        if (item.sucursal && item.sucursal.trim() !== '') {
          sucursalesSet.add(item.sucursal.trim());
        }
      });
    }
    
    // Extraer de topSucursales
    if (data.topSucursales) {
      data.topSucursales.forEach(item => {
        if (item.Sucursal && item.Sucursal.trim() !== '') {
          sucursalesSet.add(item.Sucursal.trim());
        }
      });
    }
    
    // Convertir Set a Array y ordenar
    const sucursalesArray = Array.from(sucursalesSet).sort();
    setSucursalesDisponibles(sucursalesArray);
  };

  // Cargar datos iniciales solo una vez al montar el componente
  useEffect(() => {
    cargarDashboard();
  }, []); // Solo al montar, no cuando cambien los filtros

  // Función para probar conectividad
  const testConectividad = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/test-cargos-auto`);
      console.log('✅ Conectividad OK:', response.data);
      alert('✅ Conectividad OK: ' + JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ Error de conectividad:', error);
      alert('❌ Error: ' + (error.response?.data?.message || error.message));
    }
  };

  // Función para ordenamiento mejorado
  const handleOrdenar = (campo) => {
    const nuevaDireccion = 
      ordenTabla.campo === campo && ordenTabla.direccion === 'desc' 
        ? 'asc' 
        : 'desc';
    setOrdenTabla({ campo, direccion: nuevaDireccion });
  };

  // Función para calcular totales generales
  const calcularTotalesGenerales = () => {
    if (!dashboard?.totalesPorProcesador) return { totalRegistros: 0, totalMonto: 0, totalPromedio: 0 };
    
    const totalRegistros = dashboard.totalesPorProcesador.reduce((acc, item) => 
      acc + (parseInt(item.total_registros) || 0), 0);
    const totalMonto = dashboard.totalesPorProcesador.reduce((acc, item) => 
      acc + (parseFloat(item.monto_total) || 0), 0);
    const totalPromedio = totalRegistros > 0 ? totalMonto / totalRegistros : 0;
    
    return { totalRegistros, totalMonto, totalPromedio };
  };

  // Función para agrupar datos por sucursal
  const agruparPorSucursal = () => {
    if (!dashboard?.registrosPorSucursal) return [];
    
    const grupos = {};
    
    dashboard.registrosPorSucursal.forEach(item => {
      const sucursal = item.Sucursal || 'Sin sucursal';
      
      if (!grupos[sucursal]) {
        grupos[sucursal] = {
          sucursal,
          totalRegistros: 0,
          totalMonto: 0,
          procesadores: []
        };
      }
      
      grupos[sucursal].totalRegistros += parseInt(item.cantidad_registros) || 0;
      grupos[sucursal].totalMonto += parseFloat(item.monto_total) || 0;
      grupos[sucursal].procesadores.push(item);
    });
    
    return Object.values(grupos).sort((a, b) => b.totalMonto - a.totalMonto);
  };

  // Función para toggle de sucursal
  const toggleSucursal = (sucursal) => {
    setSucursalesExpandidas(prev => ({
      ...prev,
      [sucursal]: !prev[sucursal]
    }));
  };

  // Funciones para la vista diaria optimizada
  const filtrarDatosPorFecha = (datos, dias) => {
    if (!datos || !Array.isArray(datos)) return [];
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    return datos.filter(item => {
      const fechaItem = new Date(item.fecha);
      return fechaItem >= fechaLimite;
    });
  };

  const filtrarPorSucursal = (datos, busqueda) => {
    if (!datos || !Array.isArray(datos) || !busqueda.trim()) return datos;
    return datos.filter(item => 
      (item.Sucursal || item.sucursal || '').toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const paginarDatos = (datos, pagina, porPagina) => {
    if (!datos || !Array.isArray(datos)) return [];
    const inicio = (pagina - 1) * porPagina;
    const fin = inicio + porPagina;
    return datos.slice(inicio, fin);
  };

  const calcularTotalPaginas = (datos, porPagina) => {
    if (!datos || !Array.isArray(datos)) return 0;
    return Math.ceil(datos.length / porPagina);
  };

  const prepararDatosDiarios = () => {
    if (!dashboard) return { consolidado: [], porProcesador: [], detallado: [] };

    // Filtrar por días
    const consolidadoFiltrado = filtrarDatosPorFecha(dashboard.desglosePorDiaConsolidado, filtroFechaDias);
    const porProcesadorFiltrado = filtrarDatosPorFecha(dashboard.desglosePorDiaProcesador, filtroFechaDias);
    let detalladoFiltrado = filtrarDatosPorFecha(dashboard.desglosePorDiaProcesadorSucursal, filtroFechaDias);

    // Filtrar por sucursal si hay búsqueda
    if (busquedaSucursal.trim()) {
      detalladoFiltrado = filtrarPorSucursal(detalladoFiltrado, busquedaSucursal);
    }

    // Filtrar por procesador si no es vista consolidada
    if (procesadorExpandido !== 'consolidado') {
      detalladoFiltrado = detalladoFiltrado.filter(item => item.procesador === procesadorExpandido);
    }

    return {
      consolidado: consolidadoFiltrado,
      porProcesador: porProcesadorFiltrado,
      detallado: detalladoFiltrado
    };
  };

  // Funciones para filtrado avanzado (solo aplican filtros adicionales, no fechas)
  const filtrarDatosPorSucursalAvanzado = (datos) => {
    if (!datos || !filtroSucursal || filtroSucursal.trim() === '') return datos;
    
    const resultado = datos.filter(item => 
      (item.Sucursal || item.sucursal || '').toLowerCase().includes(filtroSucursal.toLowerCase())
    );
    return resultado;
  };

  const filtrarDatosPorProcesadorAvanzado = (datos) => {
    if (!datos || !filtroProcesador || filtroProcesador.trim() === '') return datos;
    
    const resultado = datos.filter(item => 
      (item.procesador || '').toLowerCase().includes(filtroProcesador.toLowerCase())
    );
    return resultado;
  };

  // Función para obtener datos procesados según la vista detallada
  const obtenerDatosProcesadosDetallados = () => {
    if (!dashboard) return [];
    
    let datos = [];
    
    switch (vistaDetallada) {
      case VISTAS.RESUMEN:
        datos = dashboard.desglosePorDiaConsolidado || [];
        break;
      case VISTAS.POR_PROCESADOR:
        datos = dashboard.desglosePorDiaProcesador || [];
        break;
      case VISTAS.POR_SUCURSAL:
        datos = dashboard.desglosePorDiaProcesadorSucursal || [];
        break;
      case VISTAS.DETALLE_COMPLETO:
        datos = dashboard.desglosePorDiaProcesadorSucursal || [];
        break;
      default:
        datos = dashboard.desglosePorDiaConsolidado || [];
    }
    
    // Solo aplicar filtros adicionales (no fechas, que ya maneja el backend)
    datos = filtrarDatosPorSucursalAvanzado(datos);
    
    datos = filtrarDatosPorProcesadorAvanzado(datos);
    
    // Ordenar datos
    if (ordenTabla.campo) {
      datos = [...datos].sort((a, b) => {
        let valorA = a[ordenTabla.campo];
        let valorB = b[ordenTabla.campo];
        
        // Convertir a números si es un campo numérico
        if (ordenTabla.campo === 'monto_total' || ordenTabla.campo === 'total_registros') {
          valorA = parseFloat(valorA) || 0;
          valorB = parseFloat(valorB) || 0;
        }
        
        // Manejar fechas
        if (ordenTabla.campo === 'fecha') {
          valorA = new Date(valorA);
          valorB = new Date(valorB);
        }
        
        if (ordenTabla.direccion === 'asc') {
          return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
        } else {
          return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
        }
      });
    }
    
    return datos;
  };

  // Función para limpiar TODOS los filtros
  const limpiarTodosLosFiltros = () => {
    
    // Filtros principales
    setBloque('');
    setFechaInicio('');
    setFechaFin('');
    setSucursalUniversal('');
    
    // Filtros avanzados
    setFiltroSucursal('');
    setFiltroProcesador('');
    
    // Otros filtros
    setBusquedaSucursal('');
    setProcesadorExpandido('consolidado');
    
    // Reset paginación
    setPaginaActual(1);
    setCambiosPendientes(false);
  };

  // Función para resetear filtros al rango amplio
  const resetearAMesActual = () => {
    limpiarTodosLosFiltros();
    
    // Establecer rango amplio de fechas
    const { fechaInicio: inicio, fechaFin: fin } = obtenerRangoAmplioDefault();
    setFechaInicio(inicio);
    setFechaFin(fin);
    
    // Ejecutar búsqueda automáticamente después de resetear
    setTimeout(() => {
      cargarDashboard();
    }, 100);
  };

  // Función para calcular totales de un conjunto de datos
  const calcularTotales = (datos) => {
    if (!datos || !Array.isArray(datos)) return { totalRegistros: 0, totalMonto: 0 };
    
    const totalRegistros = datos.reduce((acc, item) => acc + (parseInt(item.total_registros) || 0), 0);
    const totalMonto = datos.reduce((acc, item) => acc + (parseFloat(item.monto_total) || 0), 0);
    
    return { totalRegistros, totalMonto };
  };

  // Preparar datos para gráficas
  const prepararDatosGraficas = () => {
    if (!dashboard) return { barData: [], pieData: [], lineData: [], areaData: [] };

    // Datos para gráfica de barras (procesadores)
    const barData = dashboard.totalesPorProcesador?.map(item => ({
      procesador: item.procesador,
      registros: parseInt(item.total_registros) || 0,  // Cantidad de transacciones
      monto: parseFloat(item.monto_total) || 0         // Dinero total
    })) || [];

    // Datos para gráfica de pie (distribución por procesador)
    const pieData = dashboard.totalesPorProcesador?.map((item, index) => ({
      name: item.procesador,
      value: parseInt(item.total_registros) || 0,  // Usar registros para distribución
      monto: parseFloat(item.monto_total) || 0,
      fill: PROCESADOR_COLORS[item.procesador] || COLORS[index % COLORS.length]
    })) || [];

    // Datos para gráfica de área (top sucursales)
    const areaData = dashboard.topSucursales?.slice(0, 8).map(item => ({
      sucursal: item.Sucursal || 'Sin nombre',
      registros: parseInt(item.total_registros) || 0,
      monto: parseFloat(item.monto_total) || 0
    })) || [];

    return { barData, pieData, areaData };
  };

  const { barData, pieData, areaData } = prepararDatosGraficas();

  // Componente para encabezados ordenables
  const EncabezadoOrdenable = ({ campo, children, className = "", align = "text-left" }) => (
    <th 
      className={`px-6 py-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${align} ${className}`}
      onClick={() => handleOrdenar(campo)}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-200">{children}</span>
        <span className="text-gray-400">
          {ordenTabla.campo === campo ? (
            ordenTabla.direccion === 'desc' ? '↓' : '↑'
          ) : (
            '↕️'
          )}
        </span>
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-100 drop-shadow-lg mb-2">
               Dashboard Cargos Auto
            </h1>
            <p className="text-gray-300 text-lg">
              Análisis de BSD, EFEVOO y STRIPE AUTO por sucursal y bloque
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Toggle de vistas principales */}
            <div className="bg-gray-800/50 rounded-xl p-1 flex gap-1">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'resumen' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setVistaActual('resumen')}
              >
                📊 Resumen
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'graficos' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setVistaActual('graficos')}
              >
                📈 Gráficos
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'tablas' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setVistaActual('tablas')}
              >
                📋 Tablas
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'detallado' 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setVistaActual('detallado')}
              >
                🔍 Vista Detallada
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Bloque</label>
              <select 
                value={bloque} 
                onChange={e => {
                  setBloque(e.target.value);
                  setCambiosPendientes(true);
                }} 
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Todos los bloques</option>
                {bloques.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Sucursal</label>
              <select 
                value={sucursalUniversal} 
                onChange={e => {
                  setSucursalUniversal(e.target.value);
                  setCambiosPendientes(true);
                }} 
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Todas las sucursales</option>
                {sucursalesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => {
                  setFechaInicio(e.target.value);
                  setCambiosPendientes(true);
                }}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => {
                  setFechaFin(e.target.value);
                  setCambiosPendientes(true);
                }}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          {/* Botón de búsqueda para filtros principales */}
          <div className="mt-4 flex justify-end gap-3">
            {cambiosPendientes && (
              <div className="px-3 py-2 bg-orange-900/50 border border-orange-600/50 rounded-lg text-orange-300 text-sm flex items-center">
                ⏳ Hay cambios sin aplicar
              </div>
            )}
            <button
              onClick={cargarDashboard}
              disabled={loading}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                cambiosPendientes
                  ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Buscando...
                </>
              ) : cambiosPendientes ? (
                <>
                  ⚠️ Aplicar Filtros
                </>
              ) : (
                <>
                  🔍 Buscar
                </>
              )}
            </button>
            <button
              onClick={() => {
                limpiarTodosLosFiltros();
                setCambiosPendientes(true);
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              🧹 Limpiar Filtros
            </button>
            <button
              onClick={resetearAMesActual}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              📅 Resetear Todo
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-300 mt-4">Cargando dashboard...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-red-300 mb-8">
            <h3 className="font-bold mb-2">❌ Error al cargar datos:</h3>
            <p>{error}</p>
          </div>
        )}

        {dashboard && !loading && (
          <>
            {/* Vista Resumen */}
            {vistaActual === 'resumen' && (
              <div className="space-y-8">
                {/* Tarjetas de resumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-300 text-sm font-medium">Total Registros</p>
                        <p className="text-2xl font-bold text-white">
                          {formatNumber(dashboard.resumenGeneral?.total_registros)}
                        </p>
                      </div>
                      <div className="text-blue-400 text-3xl">📊</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-300 text-sm font-medium">Monto Total</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(dashboard.resumenGeneral?.monto_total_general)}
                        </p>
                      </div>
                      <div className="text-green-400 text-3xl">💰</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-300 text-sm font-medium">Sucursales</p>
                        <p className="text-2xl font-bold text-white">
                          {formatNumber(dashboard.resumenGeneral?.total_sucursales)}
                        </p>
                      </div>
                      <div className="text-purple-400 text-3xl">🏢</div>
                    </div>
                  </div>
                </div>

                {/* Tabla de totales por procesador */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-100">💳 Totales por Procesador</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-gray-200 font-semibold">Procesador</th>
                          <th className="px-6 py-4 text-right text-gray-200 font-semibold">Registros</th>
                          <th className="px-6 py-4 text-right text-gray-200 font-semibold">Monto Total</th>
                          <th className="px-6 py-4 text-right text-gray-200 font-semibold">Promedio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {/* Fila del total general */}
                        {(() => {
                          const totales = calcularTotalesGenerales();
                          return (
                            <tr className="bg-blue-900/20 border-2 border-blue-500/30 hover:bg-blue-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                  <span className="font-bold text-blue-200 text-lg">TOTAL GENERAL</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-blue-200 font-bold text-lg">
                                {formatNumber(totales.totalRegistros)}
                              </td>
                              <td className="px-6 py-4 text-right text-blue-200 font-bold text-lg">
                                {formatCurrency(totales.totalMonto)}
                              </td>
                              <td className="px-6 py-4 text-right text-blue-200 font-bold text-lg">
                                {formatCurrency(totales.totalPromedio)}
                              </td>
                            </tr>
                          );
                        })()}
                        
                        {/* Filas de desglose individual (siempre visibles en resumen) */}
                        {dashboard.totalesPorProcesador?.map((procesador, idx) => (
                          <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-6 py-4 pl-12">
                              <span className="inline-flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: PROCESADOR_COLORS[procesador.procesador] || COLORS[idx] }}
                                ></div>
                                <span className="font-medium text-gray-100">↳ {procesador.procesador}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-200">
                              {formatNumber(procesador.total_registros)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-200">
                              {formatCurrency(procesador.monto_total)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-200">
                              {procesador.total_registros > 0 
                                ? formatCurrency(procesador.monto_total / procesador.total_registros)
                                : '$0.00'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Nota explicativa */}
                  <div className="mt-4 p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                    <p className="text-xs text-gray-400">
                      💡 <strong>Total General:</strong> Suma de BSD + EFEVOO + STRIPE AUTO. 
                      El desglose por procesador se muestra por defecto en la vista de resumen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Vista Gráficos */}
            {vistaActual === 'graficos' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Gráfica de barras - Cantidad de Registros */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-100 mb-4">📊 Cantidad de Registros por Procesador</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="procesador" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151', 
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }} 
                          formatter={(value, name) => [
                            formatNumber(value),
                            'Cantidad de Transacciones'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="registros" fill="#0088FE" name="Cantidad de Transacciones" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfica de barras - Montos Totales */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-100 mb-4">💰 Montos Totales por Procesador</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="procesador" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151', 
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }} 
                          formatter={(value, name) => [
                            formatCurrency(value),
                            'Monto Total'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="monto" fill="#00C49F" name="Monto Total (MXN)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Gráfica de pie - Distribución por cantidad */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-100 mb-4">🥧 Distribución de Transacciones</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151', 
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }}
                          formatter={(value, name) => [formatNumber(value), 'Transacciones']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfica de pie - Distribución por monto */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-100 mb-4">💰 Distribución de Montos</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, monto }) => `${name} ${(percent * 100).toFixed(1)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="monto"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151', 
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }}
                          formatter={(value, name) => [formatCurrency(value), 'Monto Total']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfica de área - Top Sucursales */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-100 mb-4">🏢 Top Sucursales por Monto</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={areaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="sucursal" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151', 
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                        formatter={(value, name) => [
                          name === 'registros' ? formatNumber(value) : formatCurrency(value),
                          name === 'registros' ? 'Registros' : 'Monto Total'
                        ]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="monto" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Monto Total" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Vista Tablas */}
            {vistaActual === 'tablas' && (
              <div className="space-y-8">
                {/* Tabla de registros por sucursal y procesador */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-100">🏢 Registros por Sucursal y Procesador</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const grupos = agruparPorSucursal();
                          const todasExpandidas = grupos.every(grupo => sucursalesExpandidas[grupo.sucursal]);
                          const nuevoEstado = {};
                          grupos.forEach(grupo => {
                            nuevoEstado[grupo.sucursal] = !todasExpandidas;
                          });
                          setSucursalesExpandidas(nuevoEstado);
                        }}
                        className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg transition-all text-sm"
                      >
                        {Object.values(sucursalesExpandidas).some(Boolean) ? 'Colapsar todas' : 'Expandir todas'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-gray-200 font-semibold">Sucursal / Procesador</th>
                          <th className="px-6 py-4 text-right text-gray-200 font-semibold">Registros</th>
                          <th className="px-6 py-4 text-right text-gray-200 font-semibold">Monto Total</th>
                          <th className="px-6 py-4 text-center text-gray-200 font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {agruparPorSucursal().map((grupo, idx) => (
                          <React.Fragment key={grupo.sucursal}>
                            {/* Fila principal de la sucursal */}
                            <tr className="bg-blue-900/20 border border-blue-500/30 hover:bg-blue-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                                  <span className="font-bold text-blue-200">{grupo.sucursal}</span>
                                  <span className="text-xs text-blue-300">
                                    ({grupo.procesadores.length} procesador{grupo.procesadores.length !== 1 ? 'es' : ''})
                                  </span>
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-blue-200 font-bold">
                                {formatNumber(grupo.totalRegistros)}
                              </td>
                              <td className="px-6 py-4 text-right text-blue-200 font-bold">
                                {formatCurrency(grupo.totalMonto)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => toggleSucursal(grupo.sucursal)}
                                  className="px-3 py-1 bg-blue-600/50 hover:bg-blue-500/50 text-blue-200 rounded-md transition-all text-xs"
                                >
                                  <span className={`transform transition-transform inline-block ${
                                    sucursalesExpandidas[grupo.sucursal] ? 'rotate-180' : ''
                                  }`}>
                                    ▼
                                  </span>
                                  <span className="ml-1">
                                    {sucursalesExpandidas[grupo.sucursal] ? 'Ocultar' : 'Ver'}
                                  </span>
                                </button>
                              </td>
                            </tr>
                            
                            {/* Filas de desglose por procesador (expandibles) */}
                            {sucursalesExpandidas[grupo.sucursal] && grupo.procesadores.map((procesador, procesadorIdx) => (
                              <tr key={`${grupo.sucursal}-${procesadorIdx}`} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4 pl-12">
                                  <span className="inline-flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: PROCESADOR_COLORS[procesador.procesador] || COLORS[procesadorIdx] }}
                                    ></div>
                                    <span className="text-gray-100">↳ {procesador.procesador}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-200">
                                  {formatNumber(procesador.cantidad_registros)}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-200">
                                  {formatCurrency(procesador.monto_total)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-xs text-gray-400">
                                    {procesador.cantidad_registros > 0 
                                      ? `${formatCurrency(procesador.monto_total / procesador.cantidad_registros)} prom.`
                                      : 'N/A'
                                    }
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Estadísticas adicionales */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-400 mb-1">Total de Sucursales</p>
                      <p className="text-lg font-bold text-gray-200">{agruparPorSucursal().length}</p>
                    </div>
                    <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-400 mb-1">Sucursal con Mayor Volumen</p>
                      <p className="text-sm font-bold text-gray-200">
                        {agruparPorSucursal()[0]?.sucursal || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-600/30">
                      <p className="text-xs text-gray-400 mb-1">Mayor Monto Individual</p>
                      <p className="text-sm font-bold text-gray-200">
                        {formatCurrency(agruparPorSucursal()[0]?.totalMonto || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabla de desglose por bloque */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-100 mb-4">🌎 Desglose por Bloque y Procesador</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <EncabezadoOrdenable campo="Bloque">Bloque</EncabezadoOrdenable>
                          <EncabezadoOrdenable campo="procesador">Procesador</EncabezadoOrdenable>
                          <EncabezadoOrdenable campo="cantidad_registros" align="text-right">Registros</EncabezadoOrdenable>
                          <EncabezadoOrdenable campo="monto_total" align="text-right">Monto Total</EncabezadoOrdenable>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {dashboard.desglosePorBloque?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-6 py-4 text-gray-100 font-medium">{item.Bloque}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: PROCESADOR_COLORS[item.procesador] || COLORS[0] }}
                                ></div>
                                <span className="text-gray-100">{item.procesador}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-200">
                              {formatNumber(item.cantidad_registros)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-200">
                              {formatCurrency(item.monto_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 🔍 NUEVA VISTA DETALLADA CON FILTROS AVANZADOS */}
            {vistaActual === 'detallado' && (
              <div className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4 text-blue-300">
                  <h4 className="font-bold mb-2">🔍 Vista Detallada con Filtros Avanzados</h4>
                  <p className="text-sm">Control total sobre rangos de fechas, filtros por sucursal y procesador con navegación entre vistas especializadas.</p>
                </div>

                {/* Navegación entre Vistas Detalladas */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => {
                        setVistaDetallada(VISTAS.RESUMEN);
                        setPaginaActual(1);
                        // Para resumen, limpiar filtros específicos ya que solo mostramos totales
                        setFiltroSucursal('');
                        setFiltroProcesador('');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        vistaDetallada === VISTAS.RESUMEN 
                          ? 'bg-purple-600 text-white shadow-lg' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      📊 Resumen General
                    </button>
                    <button
                      onClick={() => {
                        setVistaDetallada(VISTAS.POR_SUCURSAL);
                        setPaginaActual(1);
                        // Para vista por sucursal, mantener filtro sucursal pero limpiar procesador
                        setFiltroProcesador('');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        vistaDetallada === VISTAS.POR_SUCURSAL 
                          ? 'bg-purple-600 text-white shadow-lg' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🏢 Por Sucursal
                    </button>
                    <button
                      onClick={() => {
                        setVistaDetallada(VISTAS.POR_PROCESADOR);
                        setPaginaActual(1);
                        // Para vista por procesador, mantener filtro procesador pero limpiar sucursal
                        setFiltroSucursal('');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        vistaDetallada === VISTAS.POR_PROCESADOR 
                          ? 'bg-purple-600 text-white shadow-lg' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      💳 Por Procesador
                    </button>
                    <button
                      onClick={() => {
                        setVistaDetallada(VISTAS.DETALLE_COMPLETO);
                        setPaginaActual(1);
                        // Para detalle completo, mantener ambos filtros
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        vistaDetallada === VISTAS.DETALLE_COMPLETO 
                          ? 'bg-purple-600 text-white shadow-lg' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🔍 Detalle Completo
                    </button>
                  </div>
                </div>

                {/* Estadísticas Rápidas */}
                {(() => {
                  const datosProcesados = obtenerDatosProcesadosDetallados();
                  const totales = calcularTotales(datosProcesados);
                  const paginaDatos = paginarDatos(datosProcesados, paginaActual, registrosPorPagina);
                  const totalPaginas = Math.ceil(datosProcesados.length / registrosPorPagina);
                  
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-600/30">
                          <p className="text-xs text-gray-400 mb-1">Total Registros Filtrados</p>
                          <p className="text-lg font-bold text-gray-200">{formatNumber(totales.totalRegistros)}</p>
                        </div>
                        <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-600/30">
                          <p className="text-xs text-gray-400 mb-1">Monto Total Filtrado</p>
                          <p className="text-lg font-bold text-gray-200">{formatCurrency(totales.totalMonto)}</p>
                        </div>
                        <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-600/30">
                          <p className="text-xs text-gray-400 mb-1">Registros Mostrados</p>
                          <p className="text-lg font-bold text-gray-200">{datosProcesados.length}</p>
                        </div>
                        <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-600/30">
                          <p className="text-xs text-gray-400 mb-1">Página Actual</p>
                          <p className="text-lg font-bold text-gray-200">{paginaActual} / {totalPaginas || 1}</p>
                        </div>
                      </div>

                      {/* Tabla de Datos Filtrados */}
                      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-bold text-gray-100">
                            {vistaDetallada === VISTAS.RESUMEN && '📊 Resumen Consolidado por Día'}
                            {vistaDetallada === VISTAS.POR_PROCESADOR && '💳 Desglose por Procesador'}
                            {vistaDetallada === VISTAS.POR_SUCURSAL && '🏢 Desglose por Sucursal'}
                            {vistaDetallada === VISTAS.DETALLE_COMPLETO && '🔍 Detalle Completo'}
                          </h3>
                          
                          {/* Paginación Superior */}
                          {totalPaginas > 1 && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                                disabled={paginaActual === 1}
                                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                              >
                                ←
                              </button>
                              <span className="px-3 py-1 bg-gray-700 text-white rounded">
                                {paginaActual} / {totalPaginas}
                              </span>
                              <button
                                onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                                disabled={paginaActual === totalPaginas}
                                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                              >
                                →
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-700/50">
                              <tr>
                                <EncabezadoOrdenable campo="fecha">Fecha</EncabezadoOrdenable>
                                {(vistaDetallada === VISTAS.POR_PROCESADOR || vistaDetallada === VISTAS.DETALLE_COMPLETO) && (
                                  <EncabezadoOrdenable campo="procesador">Procesador</EncabezadoOrdenable>
                                )}
                                {(vistaDetallada === VISTAS.POR_SUCURSAL || vistaDetallada === VISTAS.DETALLE_COMPLETO) && (
                                  <EncabezadoOrdenable campo="Sucursal">Sucursal</EncabezadoOrdenable>
                                )}
                                <EncabezadoOrdenable campo="total_registros" align="text-right">Registros</EncabezadoOrdenable>
                                <EncabezadoOrdenable campo="monto_total" align="text-right">Monto Total</EncabezadoOrdenable>
                                <th className="px-6 py-4 text-right text-gray-200 font-semibold">Promedio</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                              {paginaDatos.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                                  <td className="px-6 py-4 text-gray-100">{formatFecha(item.fecha)}</td>
                                  {(vistaDetallada === VISTAS.POR_PROCESADOR || vistaDetallada === VISTAS.DETALLE_COMPLETO) && (
                                    <td className="px-6 py-4">
                                      <span className="inline-flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: PROCESADOR_COLORS[item.procesador] || COLORS[0] }}
                                        ></div>
                                        <span className="text-gray-100 font-medium">{item.procesador}</span>
                                      </span>
                                    </td>
                                  )}
                                  {(vistaDetallada === VISTAS.POR_SUCURSAL || vistaDetallada === VISTAS.DETALLE_COMPLETO) && (
                                    <td className="px-6 py-4 text-gray-100">{item.Sucursal || item.sucursal}</td>
                                  )}
                                  <td className="px-6 py-4 text-right text-gray-200 font-semibold">
                                    {formatNumber(item.total_registros)}
                                  </td>
                                  <td className="px-6 py-4 text-right text-gray-200 font-semibold">
                                    {formatCurrency(item.monto_total)}
                                  </td>
                                  <td className="px-6 py-4 text-right text-gray-200">
                                    {item.total_registros > 0 
                                      ? formatCurrency(item.monto_total / item.total_registros)
                                      : '$0.00'
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginación Inferior */}
                        {totalPaginas > 1 && (
                          <div className="flex justify-center mt-4 gap-2">
                            <button
                              onClick={() => setPaginaActual(1)}
                              disabled={paginaActual === 1}
                              className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                            >
                              Primera
                            </button>
                            <button
                              onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                              disabled={paginaActual === 1}
                              className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                            >
                              Anterior
                            </button>
                            <span className="px-4 py-2 bg-gray-800 text-white rounded">
                              Página {paginaActual} de {totalPaginas}
                            </span>
                            <button
                              onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                              disabled={paginaActual === totalPaginas}
                              className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                            >
                              Siguiente
                            </button>
                            <button
                              onClick={() => setPaginaActual(totalPaginas)}
                              disabled={paginaActual === totalPaginas}
                              className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                            >
                              Última
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
