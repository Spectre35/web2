import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Area, AreaChart,
  Legend, RadialBarChart, RadialBar
} from 'recharts';

// Utilidades para formateo
function formatCurrency(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '$0.00';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// Función para establecer rangos de fechas predefinidos
function obtenerRangoFechasPredefinido(periodo) {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth(); // 0-11



  switch(periodo) {
    case 'hoy':
      const fechaHoy = hoy.toISOString().split('T')[0];
      return { inicio: fechaHoy, fin: fechaHoy };

    case 'ayer':
      const ayer = new Date(hoy);
      ayer.setDate(hoy.getDate() - 1);
      const fechaAyer = ayer.toISOString().split('T')[0];
      return { inicio: fechaAyer, fin: fechaAyer };

    case 'semana':
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      return {
        inicio: inicioSemana.toISOString().split('T')[0],
        fin: finSemana.toISOString().split('T')[0]
      };

    case 'semana_pasada':
      const inicioSemPasada = new Date(hoy);
      inicioSemPasada.setDate(hoy.getDate() - hoy.getDay() - 7);
      const finSemPasada = new Date(inicioSemPasada);
      finSemPasada.setDate(inicioSemPasada.getDate() + 6);
      return {
        inicio: inicioSemPasada.toISOString().split('T')[0],
        fin: finSemPasada.toISOString().split('T')[0]
      };

    case 'ultimos_7':
      const inicio7 = new Date(hoy);
      inicio7.setDate(hoy.getDate() - 6);
      return {
        inicio: inicio7.toISOString().split('T')[0],
        fin: hoy.toISOString().split('T')[0]
      };

    case 'ultimos_15':
      const inicio15 = new Date(hoy);
      inicio15.setDate(hoy.getDate() - 14);
      return {
        inicio: inicio15.toISOString().split('T')[0],
        fin: hoy.toISOString().split('T')[0]
      };

    case 'ultimos_30':
      const inicio30 = new Date(hoy);
      inicio30.setDate(hoy.getDate() - 29);
      return {
        inicio: inicio30.toISOString().split('T')[0],
        fin: hoy.toISOString().split('T')[0]
      };

    case 'mes':
      const inicioMes = new Date(año, mes, 1);
      const finMes = new Date(año, mes + 1, 0);
      return {
        inicio: inicioMes.toISOString().split('T')[0],
        fin: finMes.toISOString().split('T')[0]
      };

    case 'mes_pasado':
      const inicioMesPasado = new Date(año, mes - 1, 1);
      const finMesPasado = new Date(año, mes, 0);
      return {
        inicio: inicioMesPasado.toISOString().split('T')[0],
        fin: finMesPasado.toISOString().split('T')[0]
      };

    case 'trimestre':
      // TRIMESTRES ESTÁNDAR FIJOS (independiente de configuración regional)
      // Q1: Ene-Feb-Mar (meses 0,1,2)
      // Q2: Abr-May-Jun (meses 3,4,5)
      // Q3: Jul-Ago-Sep (meses 6,7,8)
      // Q4: Oct-Nov-Dic (meses 9,10,11)
      const trimestreActual = Math.floor(mes / 3); // 0,1,2,3
      const inicioMesTrimestre = trimestreActual * 3; // 0,3,6,9

      const inicioTrimestre = new Date(año, inicioMesTrimestre, 1);
      const finTrimestre = new Date(año, inicioMesTrimestre + 3, 0); // último día del 3er mes
      return {
        inicio: inicioTrimestre.toISOString().split('T')[0],
        fin: finTrimestre.toISOString().split('T')[0]
      };

    case 'trimestre_pasado':
      // CÁLCULO CONSISTENTE DEL TRIMESTRE ANTERIOR
      // Definir trimestres estándar fijos (independiente de configuración regional)
      // Q1: Ene-Feb-Mar (meses 0,1,2) -> trimestre 0
      // Q2: Abr-May-Jun (meses 3,4,5) -> trimestre 1
      // Q3: Jul-Ago-Sep (meses 6,7,8) -> trimestre 2
      // Q4: Oct-Nov-Dic (meses 9,10,11) -> trimestre 3

      const trimestreActualPasado = Math.floor(mes / 3); // 0,1,2,3
      const trimestreAnterior = trimestreActualPasado - 1;

      let añoTrimAnterior, inicioMesAnterior;

      // Si estamos en Q1 (ene-mar), el trimestre anterior es Q4 del año pasado
      if (trimestreAnterior < 0) {
        añoTrimAnterior = año - 1;
        inicioMesAnterior = 9; // Octubre (mes 9)
      } else {
        añoTrimAnterior = año;
        inicioMesAnterior = trimestreAnterior * 3;
      }

      // Crear fechas con constructor estándar (evita problemas de zona horaria)
      const inicioTrimAnterior = new Date(añoTrimAnterior, inicioMesAnterior, 1);
      const finTrimAnterior = new Date(añoTrimAnterior, inicioMesAnterior + 3, 0); // último día del 3er mes

      return {
        inicio: inicioTrimAnterior.toISOString().split('T')[0],
        fin: finTrimAnterior.toISOString().split('T')[0]
      };

    case 'año':
      const inicioAño = new Date(año, 0, 1);
      const finAño = new Date(año, 11, 31);
      return {
        inicio: inicioAño.toISOString().split('T')[0],
        fin: finAño.toISOString().split('T')[0]
      };

    case 'año_pasado':
      const inicioAñoPasado = new Date(año - 1, 0, 1);
      const finAñoPasado = new Date(año - 1, 11, 31);
      return {
        inicio: inicioAñoPasado.toISOString().split('T')[0],
        fin: finAñoPasado.toISOString().split('T')[0]
      };

    default:
      return { inicio: '', fin: '' };
  }
}



// Configuración de rangos predefinidos organizados por categorías
const RANGOS_PREDEFINIDOS = {
  'Recientes': [
    { key: 'hoy', label: 'Hoy', icon: '📅', colorClass: 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30', activeClass: 'bg-blue-600 text-white' },
    { key: 'ayer', label: 'Ayer', icon: '📋', colorClass: 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30', activeClass: 'bg-indigo-600 text-white' },
    { key: 'ultimos_7', label: 'Últimos 7 días', icon: '📊', colorClass: 'bg-green-600/20 text-green-300 hover:bg-green-600/30', activeClass: 'bg-green-600 text-white' },
    { key: 'ultimos_15', label: 'Últimos 15 días', icon: '📈', colorClass: 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30', activeClass: 'bg-emerald-600 text-white' },
    { key: 'ultimos_30', label: 'Últimos 30 días', icon: '📉', colorClass: 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/30', activeClass: 'bg-teal-600 text-white' }
  ],
  'Períodos': [
    { key: 'semana', label: 'Esta semana', icon: '🗓️', colorClass: 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30', activeClass: 'bg-purple-600 text-white' },
    { key: 'semana_pasada', label: 'Semana pasada', icon: '🗂️', colorClass: 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30', activeClass: 'bg-violet-600 text-white' },
    { key: 'mes', label: 'Este mes', icon: '📆', colorClass: 'bg-pink-600/20 text-pink-300 hover:bg-pink-600/30', activeClass: 'bg-pink-600 text-white' },
    { key: 'mes_pasado', label: 'Mes pasado', icon: '📝', colorClass: 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30', activeClass: 'bg-rose-600 text-white' }
  ],
  'Amplios': [
    { key: 'trimestre', label: 'Este trimestre', icon: '📋', colorClass: 'bg-orange-600/20 text-orange-300 hover:bg-orange-600/30', activeClass: 'bg-orange-600 text-white' },
    { key: 'trimestre_pasado', label: 'Trimestre pasado', icon: '📄', colorClass: 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30', activeClass: 'bg-amber-600 text-white' },
    { key: 'año', label: 'Este año', icon: '📚', colorClass: 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30', activeClass: 'bg-yellow-600 text-white' },
    { key: 'año_pasado', label: 'Año pasado', icon: '📖', colorClass: 'bg-lime-600/20 text-lime-300 hover:bg-lime-600/30', activeClass: 'bg-lime-600 text-white' }
  ]
};

// Función para obtener fechas por defecto (inicio de año hasta ayer)
const obtenerFechasPorDefecto = () => {
  const hoy = new Date();
  const año = hoy.getFullYear();

  // Inicio del año corriente
  const inicioAño = new Date(año, 0, 1);
  const fechaInicioAño = inicioAño.toISOString().split('T')[0];

  // Ayer
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const fechaAyer = ayer.toISOString().split('T')[0];

  return { inicio: fechaInicioAño, fin: fechaAyer };
};

// Colores para las gráficas
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

export default function DashboardAclaraciones() {
  // Obtener fechas por defecto
  const fechasDefecto = obtenerFechasPorDefecto();

  // Estados existentes
  const [bloque, setBloque] = useState("");
  const [fechaInicio, setFechaInicio] = useState(fechasDefecto.inicio);
  const [fechaFin, setFechaFin] = useState(fechasDefecto.fin);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [anios, setAnios] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [vistaActual, setVistaActual] = useState('resumen'); // 'resumen', 'graficos', 'tablas'
  const [ordenProcesadores, setOrdenProcesadores] = useState({ campo: '', direccion: 'desc' }); // Estado para ordenamiento

  // Estados para filtros mejorados
  const [rangoActivo, setRangoActivo] = useState(null); // Rango predefinido activo
  const [mostrarPreview, setMostrarPreview] = useState(false); // Preview de fechas
  const [previewRango, setPreviewRango] = useState(null); // Datos del preview

  // 💱 ESTADOS PARA MODAL DE CONVERSIÓN DE MONEDA
  const [modalConversion, setModalConversion] = useState(false);
  const [anioConversion, setAnioConversion] = useState("");
  const [procesandoConversion, setProcesandoConversion] = useState(false);
  const [progresoConversion, setProgresoConversion] = useState({ procesados: 0, total: 0 });
  const [resultadoConversion, setResultadoConversion] = useState(null);


  // Cargar opciones de filtros
  useEffect(() => {
    axios.get(`${API_BASE_URL}/aclaraciones/anios`).then(r => setAnios(r.data.map(a => a.toString()))).catch(() => {});
    axios.get(`${API_BASE_URL}/aclaraciones/bloques`).then(r => setBloques(r.data)).catch(() => {});
  }, []);

  // Cargar dashboard
  useEffect(() => {
    setLoading(true);
    setError("");
    axios.get(`${API_BASE_URL}/aclaraciones/dashboard`, {
      params: { bloque, fechaInicio, fechaFin }
    })
      .then(r => setResumen(r.data))
      .catch(e => setError(e?.response?.data?.error || "Error al cargar datos"))
      .finally(() => setLoading(false));
  }, [bloque, fechaInicio, fechaFin]);

  // Función para aplicar rangos de fechas predefinidos
  const aplicarRangoPredefinido = (periodo) => {
    const rango = obtenerRangoFechasPredefinido(periodo);
    setFechaInicio(rango.inicio);
    setFechaFin(rango.fin);
    setRangoActivo(periodo);
    setMostrarPreview(false);
  };

  // Función para mostrar preview del rango
  const mostrarPreviewRango = (periodo) => {
    const rango = obtenerRangoFechasPredefinido(periodo);
    setPreviewRango({ periodo, ...rango });
    setMostrarPreview(true);
  };

  // Detectar si las fechas actuales coinciden con algún rango predefinido
  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setRangoActivo(null);
      return;
    }

    // Buscar si las fechas actuales coinciden con algún rango predefinido
    for (const categoria of Object.values(RANGOS_PREDEFINIDOS)) {
      for (const rango of categoria) {
        const rangoFechas = obtenerRangoFechasPredefinido(rango.key);
        if (rangoFechas.inicio === fechaInicio && rangoFechas.fin === fechaFin) {
          setRangoActivo(rango.key);
          return;
        }
      }
    }
    setRangoActivo(null);
  }, [fechaInicio, fechaFin]);

  // Función para formatear fechas para display
  const formatearFechaDisplay = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Función para manejar el ordenamiento de las tablas de procesadores
  const handleOrdenar = (campo) => {
    const nuevaDireccion =
      ordenProcesadores.campo === campo && ordenProcesadores.direccion === 'desc'
        ? 'asc'
        : 'desc';

    setOrdenProcesadores({ campo, direccion: nuevaDireccion });
  };

  // Función para ordenar los datos de procesadores
  const ordenarDatosProcesadores = (datos) => {
    if (!ordenProcesadores.campo) return datos;

    return [...datos].sort((a, b) => {
      let valorA = a[ordenProcesadores.campo];
      let valorB = b[ordenProcesadores.campo];

      // Para el campo procesador (texto), usar comparación de strings
      if (ordenProcesadores.campo === 'procesador') {
        valorA = valorA.toString().toLowerCase();
        valorB = valorB.toString().toLowerCase();

        if (ordenProcesadores.direccion === 'asc') {
          return valorA.localeCompare(valorB);
        } else {
          return valorB.localeCompare(valorA);
        }
      }

      // Para el campo porcentajeGanadas, calcularlo dinámicamente
      if (ordenProcesadores.campo === 'porcentajeGanadas') {
        const totalA = a.total || 0;
        const totalB = b.total || 0;
        valorA = totalA > 0 ? ((a.ganadas || 0) / totalA * 100) : 0;
        valorB = totalB > 0 ? ((b.ganadas || 0) / totalB * 100) : 0;
      } else {
        // Para campos numéricos normales
        valorA = parseFloat(valorA) || 0;
        valorB = parseFloat(valorB) || 0;
      }

      if (ordenProcesadores.direccion === 'asc') {
        return valorA - valorB;
      } else {
        return valorB - valorA;
      }
    });
  };

  // Preparar datos para gráficas
  const prepararDatosGraficas = () => {
    if (!resumen) return {};

    // Datos para gráfica de línea (aclaraciones por mes)
    const lineData = resumen.aclaracionesPorMes?.map(item => ({
      mes: item.mes,
      cantidad: item.cantidad,
      monto: parseFloat(item.monto || 0)
    })) || [];

    // Datos para gráfica de pie (estatus de documentación)
    const pieData = resumen.estatusDocumentacion?.map(item => ({
      name: item.comentario,
      value: item.cantidad,
      percentage: item.porcentaje
    })) || [];

    // Datos para gráfica de barras (top bloques)
    const barData = resumen.topBloques?.slice(0, 8).map(item => ({
      bloque: item.bloque,
      cantidad: item.cantidad
    })) || [];

    // Datos para gráfica de área (resolución por mes)
    const areaData = resumen.resolucionPorMes?.map(item => ({
      mes: item.mes,
      ganadas: parseInt(item.ganadas) || 0,
      perdidas: parseInt(item.perdidas) || 0,
      enProceso: parseInt(item.enProceso) || 0,
      montoEnDisputa: parseFloat(item.montoEnDisputa) || 0
    })) || [];

    // Datos para radial bar (métricas principales)
    const metricsData = [
      {
        name: 'Total Aclaraciones',
        value: resumen.total?.totalAclaraciones || 0,
        fill: '#8884d8'
      },
      {
        name: 'En Proceso',
        value: resumen.total?.aclaracionesEnProceso || 0,
        fill: '#82ca9d'
      },
      {
        name: 'Ganadas',
        value: resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseInt(curr.ganadas) || 0), 0) || 0,
        fill: '#ffc658'
      }
    ];

    // 📊 NUEVO: Datos para gráfica de aclaraciones por procesador
    const procesadorDataBase = resumen.aclaracionesPorProcesador?.map(item => ({
      procesador: item.procesador,
      enProceso: parseInt(item.enProceso) || 0,
      ganadas: parseInt(item.ganadas) || 0,
      perdidas: parseInt(item.perdidas) || 0,
      total: parseInt(item.total) || 0,
      montoTotal: parseFloat(item.monto_total) || 0,
      montoGanado: parseFloat(item.monto_ganado) || 0,
      montoPerdido: parseFloat(item.monto_perdido) || 0,
      montoEnProceso: parseFloat(item.monto_en_proceso) || 0
    })) || [];

    // Aplicar ordenamiento a los datos de procesadores
    const procesadorData = ordenarDatosProcesadores(procesadorDataBase);

    return { lineData, pieData, barData, areaData, metricsData, procesadorData };
  };

  // 💱 FUNCIÓN PARA CONVERTIR MONEDA
  const convertirMoneda = async () => {
    if (!anioConversion) {
      alert("Por favor selecciona un año");
      return;
    }

    if (!confirm(`¿Estás seguro de convertir todas las aclaraciones del año ${anioConversion} a moneda MXN? Esta acción actualizará la columna monto_mnx en la base de datos.`)) {
      return;
    }

    setProcesandoConversion(true);
    setProgresoConversion({ procesados: 0, total: 0 });
    setResultadoConversion(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/aclaraciones/convertir-moneda`, {
        anio: anioConversion
      });

      setResultadoConversion(response.data);
      setProgresoConversion({
        procesados: response.data.registrosActualizados,
        total: response.data.registrosEncontrados
      });
    } catch (error) {
      console.error('Error al convertir moneda:', error);
      alert('Error al convertir moneda: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcesandoConversion(false);
    }
  };

  const { lineData, pieData, barData, areaData, metricsData, procesadorData } = prepararDatosGraficas();

  // Componente para encabezados de tabla ordenables
  const EncabezadoOrdenable = ({ campo, children, className = "", align = "text-left" }) => {
    const estaOrdenado = ordenProcesadores.campo === campo;
    const direccion = ordenProcesadores.direccion;

    return (
      <th
        className={`px-4 py-3 font-medium cursor-pointer hover:bg-gray-700/30 transition-colors ${align} ${className} text-gray-300`}
        onClick={() => handleOrdenar(campo)}
      >
        <div className={`flex items-center gap-1 ${align === 'text-center' ? 'justify-center' : align === 'text-right' ? 'justify-end' : 'justify-start'}`}>
          <span>{children}</span>
          <span className="text-xs opacity-70 ml-1">
            {estaOrdenado ? (
              direccion === 'desc' ? '▼' : '▲'
            ) : (
              '⇅'
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl shadow-2xl p-6 max-w-full mx-2 md:mx-8 border border-white/10">

        {/* Header mejorado */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-100 drop-shadow-lg mb-2">
              💳 Dashboard de Aclaraciones
            </h1>
            <p className="text-gray-300 text-lg">
              Resumen y análisis de aclaraciones por filtros seleccionados
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Toggle de vistas */}
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
            </div>

            {/* 💱 Botón de Conversión de Moneda */}
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all flex items-center gap-2"
              onClick={() => setModalConversion(true)}
            >
              💱 Convertir Moneda
            </button>
          </div>
        </div>

        {/* Filtros mejorados */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Bloque</label>
              <select
                value={bloque}
                onChange={e => setBloque(e.target.value)}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Todos los bloques</option>
                {bloques.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Fecha de inicio"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Fecha de fin"
              />
            </div>
          </div>

          {/* Filtros de rango de fechas mejorados */}
          <div className="relative border-t border-gray-600/30 pt-4">
            {/* Inputs de fecha con preview */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-400">Rango activo:</span>
                {rangoActivo && (
                  <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded-md">
                    {RANGOS_PREDEFINIDOS['Recientes'].concat(RANGOS_PREDEFINIDOS['Períodos'], RANGOS_PREDEFINIDOS['Amplios'])
                      .find(r => r.key === rangoActivo)?.label || rangoActivo}
                  </span>
                )}
              </div>
              {mostrarPreview && previewRango && (
                <div className="absolute z-10 mt-2 p-3 bg-gray-900/95 border border-blue-600/50 rounded-lg text-xs text-blue-300 max-w-md shadow-xl backdrop-blur-sm">
                  <strong>{RANGOS_PREDEFINIDOS['Recientes'].concat(RANGOS_PREDEFINIDOS['Períodos'], RANGOS_PREDEFINIDOS['Amplios'])
                    .find(r => r.key === previewRango.periodo)?.label}:</strong> {formatearFechaDisplay(previewRango.inicio)} - {formatearFechaDisplay(previewRango.fin)}
                </div>
              )}
            </div>

            {/* Rangos predefinidos horizontales */}
            <div className="w-full">
              <span className="text-sm text-gray-400 mb-3 block">Rangos rápidos:</span>

              {/* Recientes */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Recientes</div>
                <div className="flex flex-wrap gap-2">
                  {RANGOS_PREDEFINIDOS['Recientes'].map((rango) => (
                    <button
                      key={rango.key}
                      onClick={() => aplicarRangoPredefinido(rango.key)}
                      onMouseEnter={() => mostrarPreviewRango(rango.key)}
                      onMouseLeave={() => setMostrarPreview(false)}
                      className={`
                        px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center gap-2 transform
                        ${rangoActivo === rango.key
                          ? `${rango.activeClass} shadow-lg scale-105`
                          : `${rango.colorClass} hover:scale-102`
                        }
                      `}
                      title={`${rango.label} - Click para aplicar`}
                    >
                      <span>{rango.icon}</span>
                      <span className="font-medium">{rango.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Períodos */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Períodos</div>
                <div className="flex flex-wrap gap-2">
                  {RANGOS_PREDEFINIDOS['Períodos'].map((rango) => (
                    <button
                      key={rango.key}
                      onClick={() => aplicarRangoPredefinido(rango.key)}
                      onMouseEnter={() => mostrarPreviewRango(rango.key)}
                      onMouseLeave={() => setMostrarPreview(false)}
                      className={`
                        px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center gap-2 transform
                        ${rangoActivo === rango.key
                          ? `${rango.activeClass} shadow-lg scale-105`
                          : `${rango.colorClass} hover:scale-102`
                        }
                      `}
                      title={`${rango.label} - Click para aplicar`}
                    >
                      <span>{rango.icon}</span>
                      <span className="font-medium">{rango.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amplios */}
              <div className="mb-2">
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Amplios</div>
                <div className="flex flex-wrap gap-2">
                  {RANGOS_PREDEFINIDOS['Amplios'].map((rango) => (
                    <button
                      key={rango.key}
                      onClick={() => aplicarRangoPredefinido(rango.key)}
                      onMouseEnter={() => mostrarPreviewRango(rango.key)}
                      onMouseLeave={() => setMostrarPreview(false)}
                      className={`
                        px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center gap-2 transform
                        ${rangoActivo === rango.key
                          ? `${rango.activeClass} shadow-lg scale-105`
                          : `${rango.colorClass} hover:scale-102`
                        }
                      `}
                      title={`${rango.label} - Click para aplicar`}
                    >
                      <span>{rango.icon}</span>
                      <span className="font-medium">{rango.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <p className="text-blue-400 mt-4">Cargando datos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-center">
            {error}
          </div>
        )}

        {resumen && (
          <div className="space-y-8">

            {/* Vista Resumen */}
            {vistaActual === 'resumen' && (
              <>
                {/* Métricas principales mejoradas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-purple-400 text-2xl">📋</div>
                      <div className="text-xs text-gray-400 bg-purple-900/30 px-2 py-1 rounded-full">
                        Total
                      </div>
                    </div>
                    <div className="text-purple-400 text-2xl font-bold mb-2">
                      {resumen.total?.totalAclaraciones || 0}
                    </div>
                    <div className="text-gray-300 text-sm font-medium">Aclaraciones</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '70%'}}></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-green-400 text-2xl">✅</div>
                      <div className="text-xs text-gray-400 bg-green-900/30 px-2 py-1 rounded-full">
                        Exitosas
                      </div>
                    </div>
                    <div className="text-green-400 text-2xl font-bold mb-2 flex flex-col">
                      <span>{resumen.total?.aclaracionesGanadas || 0} ganadas</span>
                      <span className="text-lg text-green-300 font-semibold">{formatCurrency(resumen.total?.montoGanado || 0)}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-medium">Ganadas y cantidad ganada</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '60%'}}></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-yellow-400 text-2xl">⏳</div>
                      <div className="text-xs text-gray-400 bg-yellow-900/30 px-2 py-1 rounded-full">
                        Pendientes
                      </div>
                    </div>
                    <div className="text-yellow-400 text-2xl font-bold mb-2 flex flex-col">
                      <span>{resumen.total?.aclaracionesEnProceso || 0} en proceso</span>
                      <span className="text-lg text-yellow-300 font-semibold">{formatCurrency(resumen.total?.totalMontoEnDisputa || 0)}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-medium">En proceso y monto en disputa</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>

                  {/* Tarjeta de Perdidas */}
                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-red-400 text-2xl">❌</div>
                      <div className="text-xs text-gray-400 bg-red-900/30 px-2 py-1 rounded-full">
                        Perdidas
                      </div>
                    </div>
                    <div className="text-red-400 text-2xl font-bold mb-2 flex flex-col">
                      <span>{resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseInt(curr.perdidas) || 0), 0) || 0} perdidas</span>
                      <span className="text-lg text-red-300 font-semibold">{formatCurrency(resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseFloat(curr.montoPerdido) || 0), 0) || 0)}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-medium">Perdidas y monto perdido</div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                      <div className="bg-red-500 h-2 rounded-full" style={{width: '30%'}}></div>
                    </div>
                  </div>
                </div>

                {/* Gráficos resumen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfica de área - Resolución por mes */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                      <span className="mr-2">📈</span>
                      Resolución por Mes
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="mes" stroke="#D1D5DB" fontSize={12} />
                          <YAxis stroke="#D1D5DB" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB'
                            }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="ganadas" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="perdidas" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="enProceso" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfica de pie - Estatus de documentación */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                      <span className="mr-2">🥧</span>
                      Estatus de Documentación
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name}: ${percentage}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Vista Gráficos */}
            {vistaActual === 'graficos' && (
              <div className="space-y-6">
                {/* Gráficas principales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfica de línea - Tendencia mensual */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4">📊 Tendencia de Aclaraciones</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="mes" stroke="#D1D5DB" />
                          <YAxis stroke="#D1D5DB" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="cantidad"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                            name="Cantidad"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfica de barras - Top bloques */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4">🏢 Top Bloques</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="bloque" stroke="#D1D5DB" fontSize={12} />
                          <YAxis stroke="#D1D5DB" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="cantidad" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Gráfica de aclaraciones por procesador */}
                <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-semibold text-gray-100 mb-4">💳 Aclaraciones por Procesador</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={procesadorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="procesador" stroke="#D1D5DB" fontSize={12} />
                        <YAxis stroke="#D1D5DB" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                          formatter={(value, name) => [
                            value,
                            name === 'enProceso' ? 'En Proceso' :
                            name === 'ganadas' ? 'Ganadas' :
                            name === 'perdidas' ? 'Perdidas' : name
                          ]}
                        />
                        <Legend
                          wrapperStyle={{ color: '#D1D5DB' }}
                          formatter={(value) =>
                            value === 'enProceso' ? 'En Proceso' :
                            value === 'ganadas' ? 'Ganadas' :
                            value === 'perdidas' ? 'Perdidas' : value
                          }
                        />
                        <Bar dataKey="enProceso" stackId="a" fill="#FCD34D" name="enProceso" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="ganadas" stackId="a" fill="#10B981" name="ganadas" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="perdidas" stackId="a" fill="#F87171" name="perdidas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabla de desglose por procesador */}
                  <div className="mt-6">
                    <h4 className="text-lg font-medium text-gray-200 mb-3">📋 Desglose Detallado</h4>
                    <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-800/70">
                            <tr className="border-b border-gray-600/50">
                              <EncabezadoOrdenable campo="procesador" align="text-left">Procesador</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="enProceso" align="text-center">En Proceso</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="ganadas" align="text-center">Ganadas</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="perdidas" align="text-center">Perdidas</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="total" align="text-center">Total</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="porcentajeGanadas" align="text-center">% Ganadas</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="montoEnProceso" align="text-center">💰 Monto En Proceso</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="montoGanado" align="text-center">💰 Monto Ganado</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="montoPerdido" align="text-center">💰 Monto Perdido</EncabezadoOrdenable>
                              <EncabezadoOrdenable campo="montoTotal" align="text-center">💰 Monto Total</EncabezadoOrdenable>
                            </tr>
                          </thead>
                          <tbody className="text-gray-300">
                            {procesadorData && procesadorData.length > 0 ? (
                              procesadorData.map((item, index) => {
                                // Usar el total que viene del backend (ya calculado correctamente)
                                const total = item.total || 0;
                                const porcentajeGanadas = total > 0 ? ((item.ganadas || 0) / total * 100).toFixed(1) : '0.0';
                                const montoTotal = item.montoTotal || 0;

                                return (
                                  <tr key={item.procesador || index} className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-blue-300">{item.procesador || 'Sin procesador'}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-600/20 text-yellow-300">
                                        {item.enProceso || 0}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-600/20 text-green-300">
                                        {item.ganadas || 0}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-600/20 text-red-300">
                                        {item.perdidas || 0}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-gray-200">{total}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`font-medium ${
                                        parseFloat(porcentajeGanadas) >= 70 ? 'text-green-400' :
                                        parseFloat(porcentajeGanadas) >= 50 ? 'text-yellow-400' : 'text-red-400'
                                      }`}>
                                        {porcentajeGanadas}%
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-yellow-300">
                                      {formatCurrency(item.montoEnProceso || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-green-300">
                                      {formatCurrency(item.montoGanado || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-red-300">
                                      {formatCurrency(item.montoPerdido || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-blue-300">
                                      {formatCurrency(montoTotal)}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                                  No hay datos de procesadores disponibles
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {procesadorData && procesadorData.length > 0 && (
                            <tfoot className="bg-gray-800/70 border-t-2 border-gray-600/50">
                              <tr className="font-bold text-gray-200">
                                <td className="px-4 py-3">TOTAL GENERAL</td>
                                <td className="px-4 py-3 text-center">
                                  {procesadorData.reduce((sum, item) => sum + (item.enProceso || 0), 0)}
                                </td>
                                <td className="px-4 py-3 text-center text-green-400">
                                  {procesadorData.reduce((sum, item) => sum + (item.ganadas || 0), 0)}
                                </td>
                                <td className="px-4 py-3 text-center text-red-400">
                                  {procesadorData.reduce((sum, item) => sum + (item.perdidas || 0), 0)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {procesadorData.reduce((sum, item) => sum + (item.total || 0), 0)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {(() => {
                                    const totalGanadas = procesadorData.reduce((sum, item) => sum + (item.ganadas || 0), 0);
                                    const totalGeneral = procesadorData.reduce((sum, item) => sum + (item.total || 0), 0);
                                    return totalGeneral > 0 ? (totalGanadas / totalGeneral * 100).toFixed(1) + '%' : '0.0%';
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-center text-yellow-400">
                                  {formatCurrency(
                                    procesadorData.reduce((sum, item) => sum + (item.montoEnProceso || 0), 0)
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-green-400">
                                  {formatCurrency(
                                    procesadorData.reduce((sum, item) => sum + (item.montoGanado || 0), 0)
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-red-400">
                                  {formatCurrency(
                                    procesadorData.reduce((sum, item) => sum + (item.montoPerdido || 0), 0)
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-blue-400">
                                  {formatCurrency(
                                    procesadorData.reduce((sum, item) => sum + (item.montoTotal || 0), 0)
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vista Tablas mejoradas - Organizadas por categorías */}
            {vistaActual === 'tablas' && (
              <div className="space-y-12">

                {/* GRUPO 1: ANÁLISIS TEMPORAL - Tablas por Mes */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">📅</span>
                    Análisis Temporal por Mes
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cantidad de aclaraciones por mes */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">📊</span>
                          Aclaraciones por Mes
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Mes</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.aclaracionesPorMes?.map((row, i) => (
                              <tr key={row.mes} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-blue-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.mes}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center text-blue-300 font-semibold text-xs">
                                  {formatCurrency(row.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Desglose de resolución por mes */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">📈</span>
                          Resolución Detallada por Mes
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-2 py-3 text-left font-semibold text-gray-200">Mes</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Ganadas</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Perdidas</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">En Proceso</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Monto Disputa</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Monto Defendido</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-200">Monto Perdido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.resolucionPorMes?.map((row, i) => (
                              <tr key={row.mes} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-indigo-900/30 transition-colors duration-200`}>
                                <td className="px-2 py-3 text-gray-100 font-medium">{row.mes}</td>
                                <td className="px-2 py-3 text-center">
                                  <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded-full text-xs font-semibold">
                                    {row.ganadas}
                                  </span>
                                </td>
                                <td className="px-2 py-3 text-center">
                                  <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded-full text-xs font-semibold">
                                    {row.perdidas}
                                  </span>
                                </td>
                                <td className="px-2 py-3 text-center">
                                  <span className="bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-semibold">
                                    {row.enProceso}
                                  </span>
                                </td>
                                <td className="px-2 py-3 text-center text-blue-300 font-semibold text-xs">
                                  {formatCurrency(row.montoEnDisputa)}
                                </td>
                                <td className="px-2 py-3 text-green-300 font-semibold text-xs">
                                  {formatCurrency(row.montoDefendido)}
                                </td>
                                <td className="px-2 py-3 text-red-300 font-semibold text-xs">
                                  {formatCurrency(row.montoPerdido)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 2: ANÁLISIS POR BLOQUES */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">🏢</span>
                    Análisis por Bloques
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top 10 bloques por aclaración */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">🏢</span>
                          Top 10 Bloques por Aclaración
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Bloque</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topBloques?.slice(0, 10).map((row, i) => (
                              <tr key={row.bloque} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-blue-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.bloque}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top 10 bloques por monto */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">💰</span>
                          Top 10 Bloques por Monto
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Bloque</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topBloquesMonto?.slice(0, 10).map((row, i) => (
                              <tr key={row.bloque} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-yellow-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.bloque}</td>
                                <td className="px-4 py-3 text-center text-yellow-300 font-semibold text-xs">
                                  {formatCurrency(row.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 3: ANÁLISIS POR SUCURSALES */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">🏪</span>
                    Análisis por Sucursales
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top 10 sucursales por aclaración */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">🏪</span>
                          Top 10 Sucursales por Aclaración
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Sucursal</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topSucursales?.slice(0, 10).map((row, i) => (
                              <tr key={row.sucursal} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-green-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.sucursal}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className="bg-green-600/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top 10 sucursales por monto */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">💵</span>
                          Top 10 Sucursales por Monto
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Sucursal</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topSucursalesMonto?.slice(0, 10).map((row, i) => (
                              <tr key={row.sucursal} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-cyan-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.sucursal}</td>
                                <td className="px-3 py-3 text-center text-cyan-300 font-semibold text-xs">
                                  {formatCurrency(row.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sucursales con más pérdidas */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">💸</span>
                          Sucursales con Más Pérdidas
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Sucursal</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Monto Perdido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topSucursalesPerdidas?.slice(0, 10).map((row, i) => (
                              <tr key={row.sucursal} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-red-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.sucursal}</td>
                                <td className="px-3 py-3 text-center text-red-300 font-semibold text-xs">
                                  {formatCurrency(row.monto_perdido)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 4: ANÁLISIS POR VENDEDORAS */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">👩‍💼</span>
                    Análisis por Vendedoras
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top 10 vendedoras por aclaración */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">👩‍💼</span>
                          Top 10 Vendedoras por Aclaración
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Vendedora</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.topVendedoras?.slice(0, 10).map((row, i) => (
                              <tr key={row.vendedora} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-purple-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.vendedora}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top 10 vendedoras por aclaración y monto */}
                  <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-pink-600 to-pink-700 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center">
                        <span className="mr-2">💎</span>
                        Top 10 Vendedoras por Monto
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-900/80">
                          <tr className="border-b border-gray-700">
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                            <th className="px-3 py-3 text-left font-semibold text-gray-200">Vendedora</th>
                            <th className="px-3 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                            <th className="px-3 py-3 text-center font-semibold text-gray-200">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.topVendedorasMonto?.slice(0, 10).map((row, i) => (
                            <tr key={row.vendedora} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-pink-900/30 transition-colors duration-200`}>
                              <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                              <td className="px-3 py-3 text-gray-100 font-medium">{row.vendedora}</td>
                              <td className="px-3 py-3 text-center">
                                <span className="bg-pink-600/20 text-pink-300 px-2 py-1 rounded-full text-xs font-semibold">
                                  {row.cantidad}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center text-pink-300 font-semibold text-xs">
                                {formatCurrency(row.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                    {/* Vendedoras con documentación incompleta */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">⚠️</span>
                          Documentación Incompleta
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">#</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-200">Vendedora</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-200">Incompletas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.vendedoresIncompletos?.slice(0, 10).map((row, i) => (
                              <tr key={row.vendedora} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-orange-900/30 transition-colors duration-200`}>
                                <td className="px-3 py-3 text-gray-400 font-semibold">{i + 1}</td>
                                <td className="px-3 py-3 text-gray-100 font-medium">{row.vendedora}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 5: ANÁLISIS DE ESTATUS Y RESOLUCIÓN */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                    <span className="mr-3">📋</span>
                    Análisis de Estatus y Resolución
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Estatus de documentación */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">📄</span>
                          Estatus de Documentación
                        </h3>
                      </div>
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-900/80">
                            <tr className="border-b border-gray-700">
                              <th className="px-4 py-3 text-left font-semibold text-gray-200">Estatus</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Cantidad</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-200">Porcentaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.estatusDocumentacion?.map((row, i) => (
                              <tr key={row.comentario} className={`${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-800/40'} hover:bg-teal-900/30 transition-colors duration-200`}>
                                <td className="px-4 py-3 text-gray-100 font-medium">{row.comentario}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-teal-600/20 text-teal-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.cantidad}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-green-600/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                                    {row.porcentaje}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tabla de ganadas, perdidas, en proceso */}
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3">
                        <h3 className="font-semibold text-white flex items-center">
                          <span className="mr-2">⚖️</span>
                          Resumen de Resolución
                        </h3>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex justify-between items-center p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-green-400 text-xl mr-3">✅</span>
                              <span className="text-gray-100 font-medium">Ganadas</span>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">{resumen.total?.aclaracionesGanadas || 0}</div>
                              <div className="text-green-300 text-sm">{formatCurrency(resumen.total?.montoGanado || 0)}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-red-400 text-xl mr-3">❌</span>
                              <span className="text-gray-100 font-medium">Perdidas</span>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400 font-bold text-lg">
                                {resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseInt(curr.perdidas) || 0), 0) || 0}
                              </div>
                              <div className="text-red-300 text-sm">
                                {formatCurrency(resumen.resolucionPorMes?.reduce((acc, curr) => acc + (parseFloat(curr.montoPerdido) || 0), 0) || 0)}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-yellow-400 text-xl mr-3">⏳</span>
                              <span className="text-gray-100 font-medium">En Proceso</span>
                            </div>
                            <div className="text-right">
                              <div className="text-yellow-400 font-bold text-lg">{resumen.total?.aclaracionesEnProceso || 0}</div>
                              <div className="text-yellow-300 text-sm">{formatCurrency(resumen.total?.totalMontoEnDisputa || 0)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 💱 MODAL DE CONVERSIÓN DE MONEDA */}
      {modalConversion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                💱 Convertir Moneda a MXN
              </h3>
              <button
                onClick={() => setModalConversion(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Seleccionar Año para Conversión
                </label>
                <select
                  value={anioConversion}
                  onChange={(e) => setAnioConversion(e.target.value)}
                  className="w-full border border-gray-600 bg-gray-700 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={procesandoConversion}
                >
                  <option value="">Selecciona un año</option>
                  {anios.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>ℹ️ Información:</strong><br/>
                  Esta acción convertirá todos los montos de aclaraciones del año seleccionado a pesos mexicanos (MXN) basándose en el bloque y guardará el resultado en la columna <code>monto_mnx</code>.
                </p>
              </div>

              {procesandoConversion && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400"></div>
                    <span className="text-gray-300">Procesando conversiones...</span>
                  </div>
                  {progresoConversion.total > 0 && (
                    <div className="text-sm text-gray-400">
                      Procesados: {progresoConversion.procesados} de {progresoConversion.total}
                    </div>
                  )}
                </div>
              )}

              {resultadoConversion && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-300 font-semibold mb-2">✅ Conversión Completada</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>• Registros encontrados: <span className="text-green-400">{resultadoConversion.registrosEncontrados}</span></p>
                    <p>• Registros actualizados: <span className="text-green-400">{resultadoConversion.registrosActualizados}</span></p>
                    {resultadoConversion.detallesPorBloque && (
                      <div className="mt-2">
                        <p className="font-medium">Detalles por bloque:</p>
                        {Object.entries(resultadoConversion.detallesPorBloque).map(([bloque, datos]) => (
                          <p key={bloque} className="ml-2 text-xs">
                            {bloque}: {datos.registros} registros - Factor: {datos.factor}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setModalConversion(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  disabled={procesandoConversion}
                >
                  Cancelar
                </button>
                <button
                  onClick={convertirMoneda}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={procesandoConversion || !anioConversion}
                >
                  {procesandoConversion ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      💱 Convertir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
