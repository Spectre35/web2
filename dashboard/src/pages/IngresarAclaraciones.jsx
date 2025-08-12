import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../scrollbar-styles.css";

const SelectEditor = React.memo(({ value, onChange, options, className = "" }) => {
  return (
    <select
      className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      style={{ maxHeight: '200px' }} // Altura máxima para evitar dropdowns muy largos
    >
      <option value="">Selecciona...</option>
      {options.map((opt, index) => (
        <option key={`${opt}-${index}`} value={opt}>{opt}</option>
      ))}
    </select>
  );
});

export default function IngresarAclaraciones() {
  // Configuración de tipos de tabla con sus validaciones específicas
  const tiposTabla = {
    EFEVOO: {
      nombre: "EFEVOO",
      camposObligatorios: ["PROCESADOR", "ID_DE_TRANSACCION", "MONTO", "FECHA_VENTA", "AUTORIZACION", "BLOQUE", "CAPTURA_CC"],
      validaciones: {
        ID_DE_TRANSACCION: { tipo: "numerico", minLength: 8, maxLength: 50 },
        AUTORIZACION: { tipo: "alfanumerico", minLength: 6, maxLength: 12 },
        MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 },
        NUM_DE_TARJETA: { tipo: "numerico", exactLength: [4, 6, 16] }
      }
    },
    BSD: {
      nombre: "BSD",
      camposObligatorios: ["PROCESADOR", "ID_DEL_COMERCIO_AFILIACION", "NOMBRE_DEL_COMERCIO", "NUM_DE_TARJETA", "FECHA_VENTA", "MONTO", "AUTORIZACION", "FECHA_DE_RESPUESTA", "BLOQUE", "CAPTURA_CC"],
      validaciones: {
        ID_DEL_COMERCIO_AFILIACION: { tipo: "numerico", minLength: 6, maxLength: 10 },
        NUM_DE_TARJETA: { tipo: "numerico", exactLength: [4] }, // BIN de 4 dígitos
        MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 },
        AUTORIZACION: { tipo: "numerico", exactLength: [6] }
      }
    },
    CREDOMATIC: {
      nombre: "CREDOMATIC",
      camposObligatorios: ["PROCESADOR", "ID_DE_TRANSACCION", "MONTO", "FECHA_VENTA", "AUTORIZACION", "NUM_DE_TARJETA", "BLOQUE", "CAPTURA_CC"],
      validaciones: {
        ID_DE_TRANSACCION: { tipo: "alfanumerico", minLength: 12, maxLength: 30 },
        AUTORIZACION: { tipo: "numerico", exactLength: [6, 8] },
        NUM_DE_TARJETA: { tipo: "numerico", exactLength: [16] },
        MONTO: { tipo: "decimal", min: 0.01, max: 999999.99 }
      }
    }
  };

  // Definición de columnas base para la tabla de aclaraciones (siempre fijas)
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

  // Hook de navegación
  const navigate = useNavigate();

  // Estados
  const [tipoTablaSeleccionada, setTipoTablaSeleccionada] = useState("EFEVOO");
  const [filas, setFilas] = useState(
    Array(1).fill().map(() => {
      const base = Object.fromEntries(columnas.map(c => [c, ""]));
      base["EUROSKIN"] = "false";
      base["CAPTURA_CC"] = "EN PROCESO"; // Valor por defecto
      // Obtener año y mes actual en nombre
      const fechaActual = new Date();
      const anioActual = fechaActual.getFullYear().toString();
      const meses = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
      ];
      const mesActualNombre = meses[fechaActual.getMonth()];
      base["AÑO"] = anioActual;
      base["MES_PETICION"] = mesActualNombre;
      return base;
    })
  );
  const [erroresValidacion, setErroresValidacion] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [procesadores, setProcesadores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [comentariosComunes, setComentariosComunes] = useState([]);
  const [capturaCC, setCapturaCC] = useState([]);

  // Estados para funcionalidad Excel
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null); // {fila: 0, columna: "CAMPO"}
  const [rangoSeleccionado, setRangoSeleccionado] = useState(null); // {inicio: {fila, columna}, fin: {fila, columna}}
  const [datosPortapapeles, setDatosPortapapeles] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [inicioArrastre, setInicioArrastre] = useState(null);
  const [escritura, setEscritura] = useState('');

  // Estados para búsqueda automática de clientes
  const [busquedaAutomaticaHabilitada, setBusquedaAutomaticaHabilitada] = useState(true);
  const [filasYaProcesadas, setFilasYaProcesadas] = useState(new Set());

  // Estados para modal de selección de clientes
  const [modalSeleccionCliente, setModalSeleccionCliente] = useState({
    visible: false,
    clientes: [],
    filaIndex: null,
    datosOriginales: null,
    tipoCoincidencia: "general", // "general", "fecha_monto", "misma_tarjeta"
    terminacionBuscada: null
  });

  // Función para obtener las opciones de dropdown de una columna
  const getOpcionesDropdown = useCallback((columna) => {
    switch (columna) {
      case "PROCESADOR":
        return procesadores.length > 0 ? procesadores : ["CREDOMATIC", "VISANET"];
      case "SUCURSAL":
        return sucursales;
      case "BLOQUE":
        return bloques;
      case "VENDEDORA":
        return vendedoras;
      case "COMENTARIOS":
        return comentariosComunes;
      case "CAPTURA_CC":
        return capturaCC.length > 0 ? capturaCC : ["EN PROCESO", "GANADA", "PERDIDA"];
      case "EUROSKIN":
        return ["true", "false"];
      case "MES_PETICION":
        return ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
      case "AÑO":
        return Array.from({length: 10}, (_, i) => (new Date().getFullYear() - 5 + i).toString());
      default:
        return null;
    }
  }, [procesadores, sucursales, bloques, vendedoras, comentariosComunes, capturaCC]);

  // Función para verificar si una columna es dropdown
  const esDropdown = useCallback((columna) => {
    return getOpcionesDropdown(columna) !== null;
  }, [getOpcionesDropdown]);

  // Función para limpiar selección
  const limpiarSeleccion = useCallback(() => {
    setCeldaSeleccionada(null);
    setRangoSeleccionado(null);
    setEscritura('');
  }, []);

  // Event listener para clicks fuera de la tabla
  useEffect(() => {
    const handleClickFuera = (event) => {
      // Verificar si el click fue dentro de elementos interactivos
      const tabla = event.target.closest('table');
      const boton = event.target.closest('button');
      const select = event.target.closest('select');
      const input = event.target.closest('input');
      const modal = event.target.closest('.fixed'); // Para modales
      
      // Solo limpiar selección si no se clickeó en elementos interactivos
      if (!tabla && !boton && !select && !input && !modal) {
        limpiarSeleccion();
      }
    };

    document.addEventListener('mousedown', handleClickFuera);
    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
    };
  }, [limpiarSeleccion]);

  // 🔍 BÚSQUEDA AUTOMÁTICA DE CLIENTE POR CAMBIOS EN FILAS
  useEffect(() => {
    if (!busquedaAutomaticaHabilitada) return;

    const buscarClientesAutomaticamente = async () => {
      try {
        // Crear una clave única para cada fila basada en sus datos principales
        const filasParaProcesar = [];
        
        filas.forEach((fila, index) => {
          const tieneNumTarjeta = fila.NUM_DE_TARJETA && fila.NUM_DE_TARJETA.toString().trim() !== '';
          const tieneFecha = fila.FECHA_VENTA && fila.FECHA_VENTA.toString().trim() !== '';
          const tieneMonto = fila.MONTO && fila.MONTO.toString().trim() !== '';
          const noTieneCliente = !fila.CLIENTE || fila.CLIENTE.trim() === '';
          
          if (tieneNumTarjeta && tieneFecha && tieneMonto && noTieneCliente) {
            // Crear clave única para esta fila
            const claveUnica = `${fila.NUM_DE_TARJETA}-${fila.FECHA_VENTA}-${fila.MONTO}`;
            
            // Solo procesar si no se ha procesado antes
            if (!filasYaProcesadas.has(claveUnica)) {
              filasParaProcesar.push({ fila, index, claveUnica });
            }
          }
        });

        if (filasParaProcesar.length === 0) return;

        console.log(`🔍 Procesando ${filasParaProcesar.length} filas nuevas para búsqueda automática`);

        // Procesar las filas una por una
        for (const { fila, index, claveUnica } of filasParaProcesar) {
          try {
            console.log(`🔍 Buscando cliente automáticamente para fila ${index + 1}:`, {
              tarjeta: fila.NUM_DE_TARJETA,
              fecha: fila.FECHA_VENTA,
              monto: fila.MONTO
            });

            const filaEnriquecida = await buscarClienteAutomatico(fila);
            
            // Solo actualizar si se encontraron datos del cliente
            if (filaEnriquecida.CLIENTE && filaEnriquecida.CLIENTE !== fila.CLIENTE) {
              setFilas(prevFilas => {
                const nuevasFilas = [...prevFilas];
                nuevasFilas[index] = filaEnriquecida;
                return nuevasFilas;
              });
              
              console.log(`✅ Cliente encontrado automáticamente para fila ${index + 1}:`, {
                cliente: filaEnriquecida.CLIENTE,
                sucursal: filaEnriquecida.SUCURSAL,
                bloque: filaEnriquecida.BLOQUE,
                euroskin: filaEnriquecida.EUROSKIN
              });
            }

            // Marcar esta fila como procesada
            setFilasYaProcesadas(prev => new Set([...prev, claveUnica]));
            
            // Pequeña pausa entre búsquedas para no sobrecargar el servidor
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            console.error(`❌ Error buscando cliente automáticamente para fila ${index + 1}:`, error);
            // Marcar como procesada incluso si falló para no intentar de nuevo
            setFilasYaProcesadas(prev => new Set([...prev, claveUnica]));
          }
        }
      } catch (error) {
        console.error('❌ Error en búsqueda automática general:', error);
      }
    };

    // Ejecutar búsqueda automática con un delay más largo para evitar múltiples ejecuciones
    const timeoutId = setTimeout(buscarClientesAutomaticamente, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [filas, busquedaAutomaticaHabilitada, filasYaProcesadas]); // Se ejecuta cuando cambian las filas o la configuración

  // Función para validar campo según tipo de tabla
  function validarCampo(campo, valor, tipoTabla) {
    if (!valor || valor.toString().trim() === "") return null;
    
    const config = tiposTabla[tipoTabla];
    if (!config || !config.validaciones[campo]) return null;
    
    const validacion = config.validaciones[campo];
    const valorStr = valor.toString().trim();
    
    switch (validacion.tipo) {
      case "numerico":
        if (!/^\d+$/.test(valorStr)) {
          return "Debe contener solo números";
        }
        if (validacion.exactLength) {
          if (!validacion.exactLength.includes(valorStr.length)) {
            return `Debe tener ${validacion.exactLength.join(" o ")} dígitos`;
          }
        }
        if (validacion.minLength && valorStr.length < validacion.minLength) {
          return `Mínimo ${validacion.minLength} dígitos`;
        }
        if (validacion.maxLength && valorStr.length > validacion.maxLength) {
          return `Máximo ${validacion.maxLength} dígitos`;
        }
        break;
        
      case "alfanumerico":
        if (!/^[a-zA-Z0-9]+$/.test(valorStr)) {
          return "Solo se permiten letras y números";
        }
        if (validacion.minLength && valorStr.length < validacion.minLength) {
          return `Mínimo ${validacion.minLength} caracteres`;
        }
        if (validacion.maxLength && valorStr.length > validacion.maxLength) {
          return `Máximo ${validacion.maxLength} caracteres`;
        }
        break;
        
      case "decimal":
        const num = parseFloat(valorStr);
        if (isNaN(num)) {
          return "Debe ser un número válido";
        }
        if (validacion.min && num < validacion.min) {
          return `Mínimo ${validacion.min}`;
        }
        if (validacion.max && num > validacion.max) {
          return `Máximo ${validacion.max}`;
        }
        break;
        
      case "boolean":
        if (!["true", "false", "sí", "no", "si", "1", "0"].includes(valorStr.toLowerCase())) {
          return "Debe ser Sí o No";
        }
        break;
    }
    
    return null;
  }

  // Función para verificar campos obligatorios
  function verificarCamposObligatorios(fila, tipoTabla) {
    const config = tiposTabla[tipoTabla];
    if (!config) return [];
    
    const faltantes = [];
    config.camposObligatorios.forEach(campo => {
      if (!fila[campo] || fila[campo].toString().trim() === "") {
        faltantes.push(campo);
      }
    });
    
    return faltantes;
  }

  // Cargar datos iniciales
  useEffect(() => {
    async function cargarDatos() {
      try {
        // Cargar datos básicos primero
        const [resProcesadores, resSucursales, resBloques, resVendedoras, resComentarios] = await Promise.all([
          axios.get(`${API_BASE_URL}/aclaraciones/procesadores`),
          axios.get(`${API_BASE_URL}/aclaraciones/sucursales-ventas`),
          axios.get(`${API_BASE_URL}/aclaraciones/bloques`),
          axios.get(`${API_BASE_URL}/aclaraciones/vendedoras`),
          axios.get(`${API_BASE_URL}/aclaraciones/comentarios`)
        ]);
        
        setProcesadores(resProcesadores.data);
        setSucursales(resSucursales.data);
        setBloques(resBloques.data);
        setVendedoras(resVendedoras.data);
        setComentariosComunes(resComentarios.data);

        // Debug: verificar cuántas vendedoras llegaron
        console.log(`✅ Vendedoras cargadas: ${resVendedoras.data.length}`);
        console.log(`✅ Sucursales cargadas: ${resSucursales.data.length}`);

        // Intentar cargar captura-cc por separado (puede no existir)
        try {
          const resCapturaCC = await axios.get(`${API_BASE_URL}/aclaraciones/captura-cc`);
          setCapturaCC(resCapturaCC.data);
        } catch (capturaError) {
          console.warn("Endpoint captura-cc no disponible, usando valores por defecto");
          // Valores por defecto para CAPTURA_CC
          setCapturaCC(["EN PROCESO", "GANADA", "PERDIDA"]);
        }
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        setMensaje("❌ Error al cargar datos de referencia");
        // Valores por defecto en caso de error total
        setCapturaCC(["Manual", "Automática", "Mixta", "No Aplica"]);
      }
    }
    
    cargarDatos();
  }, []);

  // Limpiar errores cuando cambia el tipo de tabla
  useEffect(() => {
    setErroresValidacion({});
  }, [tipoTablaSeleccionada]);

  // Funciones para Excel-like functionality
  const handleCellChange = useCallback((filaIdx, columna, valor) => {
    setFilas(prev => prev.map((fila, idx) => 
      idx === filaIdx ? { ...fila, [columna]: valor } : fila
    ));
  }, []);

  const seleccionarCelda = useCallback((fila, columna, event) => {
    if (event.shiftKey && celdaSeleccionada) {
      // Selección de rango con Shift
      setRangoSeleccionado({
        inicio: celdaSeleccionada,
        fin: { fila, columna }
      });
    } else {
      // Selección individual
      setCeldaSeleccionada({ fila, columna });
      setRangoSeleccionado(null);
    }
    setEscritura('');
  }, [celdaSeleccionada]);

  const expandirSeleccion = useCallback((fila, columna, event) => {
    if (event.shiftKey && celdaSeleccionada) {
      setRangoSeleccionado({
        inicio: celdaSeleccionada,
        fin: { fila, columna }
      });
    }
  }, [celdaSeleccionada]);

  const manejarEscritura = useCallback((event) => {
    if (!celdaSeleccionada) return;
    
    const char = event.key;
    
    // Permitir solo caracteres imprimibles y algunos especiales
    if (char.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      
      if (rangoSeleccionado) {
        // Escribir en todas las celdas del rango
        const { inicio, fin } = rangoSeleccionado;
        const colIndiceInicio = columnas.indexOf(inicio.columna);
        const colIndiceFin = columnas.indexOf(fin.columna);
        
        setFilas(prev => prev.map((fila, filaIdx) => {
          if (filaIdx >= inicio.fila && filaIdx <= fin.fila) {
            const nuevaFila = { ...fila };
            for (let c = colIndiceInicio; c <= colIndiceFin; c++) {
              nuevaFila[columnas[c]] = char;
            }
            return nuevaFila;
          }
          return fila;
        }));
        setEscritura(char);
      } else {
        // Escribir en celda individual - concatenar
        setEscritura(prev => prev + char);
        const valorActual = filas[celdaSeleccionada.fila]?.[celdaSeleccionada.columna] || '';
        const nuevoValor = escritura + char;
        handleCellChange(celdaSeleccionada.fila, celdaSeleccionada.columna, nuevoValor);
      }
    }
  }, [celdaSeleccionada, rangoSeleccionado, escritura, filas, handleCellChange, columnas]);

  const finalizarSeleccion = useCallback((event) => {
    if (!celdaSeleccionada) return;
    
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      
      if (rangoSeleccionado) {
        // Limpiar rango múltiple
        const { inicio, fin } = rangoSeleccionado;
        const colIndiceInicio = columnas.indexOf(inicio.columna);
        const colIndiceFin = columnas.indexOf(fin.columna);
        
        setFilas(prev => prev.map((fila, filaIdx) => {
          if (filaIdx >= inicio.fila && filaIdx <= fin.fila) {
            const nuevaFila = { ...fila };
            for (let c = colIndiceInicio; c <= colIndiceFin; c++) {
              nuevaFila[columnas[c]] = '';
            }
            return nuevaFila;
          }
          return fila;
        }));
      } else {
        // Limpiar celda individual
        handleCellChange(celdaSeleccionada.fila, celdaSeleccionada.columna, '');
      }
      
      setEscritura('');
    } else if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') {
      // Finalizar escritura y limpiar estado
      setEscritura('');
    }
  }, [celdaSeleccionada, rangoSeleccionado, escritura, handleCellChange, columnas]);

  const estaEnRango = useCallback((fila, columna) => {
    if (!rangoSeleccionado) return false;
    
    const { inicio, fin } = rangoSeleccionado;
    const colIndice = columnas.indexOf(columna);
    const colIndiceInicio = columnas.indexOf(inicio.columna);
    const colIndiceFin = columnas.indexOf(fin.columna);
    
    return fila >= inicio.fila && 
           fila <= fin.fila && 
           colIndice >= colIndiceInicio && 
           colIndice <= colIndiceFin;
  }, [rangoSeleccionado, columnas]);

  const copiarSeleccion = useCallback((event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      event.preventDefault();
      
      if (rangoSeleccionado) {
        // Copiar rango múltiple
        const { inicio, fin } = rangoSeleccionado;
        const filasCopia = [];
        
        for (let f = inicio.fila; f <= fin.fila; f++) {
          const fila = [];
          const colIndiceInicio = columnas.indexOf(inicio.columna);
          const colIndiceFin = columnas.indexOf(fin.columna);
          
          for (let c = colIndiceInicio; c <= colIndiceFin; c++) {
            const valor = filas[f]?.[columnas[c]] || '';
            fila.push(valor);
          }
          filasCopia.push(fila.join('\t'));
        }
        
        const textoCompleto = filasCopia.join('\n');
        setDatosPortapapeles(textoCompleto);
        navigator.clipboard?.writeText(textoCompleto);
      } else if (celdaSeleccionada) {
        // Copiar celda individual
        const valor = filas[celdaSeleccionada.fila]?.[celdaSeleccionada.columna] || '';
        setDatosPortapapeles(valor);
        navigator.clipboard?.writeText(valor);
      }
    }
  }, [celdaSeleccionada, rangoSeleccionado, filas, columnas]);

  const pegarSeleccion = useCallback((event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'v' && celdaSeleccionada) {
      event.preventDefault();
      
      if (datosPortapapeles) {
        const lineas = datosPortapapeles.split('\n');
        const filaInicio = celdaSeleccionada.fila;
        const colInicio = columnas.indexOf(celdaSeleccionada.columna);
        
        setFilas(prev => prev.map((fila, filaIdx) => {
          const offsetFila = filaIdx - filaInicio;
          if (offsetFila >= 0 && offsetFila < lineas.length) {
            const valores = lineas[offsetFila].split('\t');
            const nuevaFila = { ...fila };
            
            valores.forEach((valor, colOffset) => {
              const colIdx = colInicio + colOffset;
              if (colIdx < columnas.length) {
                nuevaFila[columnas[colIdx]] = valor;
              }
            });
            
            return nuevaFila;
          }
          return fila;
        }));
      }
    }
  }, [celdaSeleccionada, datosPortapapeles, columnas]);

  // Agregar event listeners globales
  useEffect(() => {
    const handleKeyDown = (event) => {
      copiarSeleccion(event);
      pegarSeleccion(event);
      manejarEscritura(event);
      finalizarSeleccion(event);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [copiarSeleccion, pegarSeleccion, manejarEscritura, finalizarSeleccion]);

  // Función para normalizar fechas
  function normalizarFecha(valor) {
    if (!valor) return "";
    
    console.log('🔍 Normalizando fecha:', valor);
    
    // Patrón para DD/MM/YYYY HH:MM (formato EFEVOO)
    const regexFechaConHora = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s+(\d{1,2}):(\d{2})$/;
    const matchConHora = valor.toString().match(regexFechaConHora);
    if (matchConHora) {
      const fechaFormateada = `${matchConHora[3]}-${matchConHora[2].padStart(2, '0')}-${matchConHora[1].padStart(2, '0')}`;
      console.log('✅ Fecha con hora convertida:', fechaFormateada);
      return fechaFormateada;
    }
    
    // Patrón para DD/MM/YYYY (sin hora)
    const regex1 = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
    const match1 = valor.toString().match(regex1);
    if (match1) {
      const fechaFormateada = `${match1[3]}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
      console.log('✅ Fecha sin hora convertida:', fechaFormateada);
      return fechaFormateada;
    }
    
    // Patrón para YYYY-MM-DD (ya en formato correcto, con o sin hora)
    const regex2 = /^(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}:\d{2})?$/;
    const match2 = valor.toString().match(regex2);
    if (match2) {
      const fechaFormateada = `${match2[1]}-${match2[2]}-${match2[3]}`;
      console.log('✅ Fecha ya en formato correcto:', fechaFormateada);
      return fechaFormateada;
    }
    
    console.log('❌ Formato de fecha no reconocido:', valor);
    return valor;
  }

  // Función para normalizar montos
  function normalizarMonto(valor) {
    if (!valor) return "";
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string') {
      let limpio = valor.replace(/[$€£¥\s]/g, '');
      // Quitar separadores de miles si hay más de un punto o coma
      if ((limpio.match(/\./g) || []).length > 1 || (limpio.match(/,/g) || []).length > 1) {
        limpio = limpio.replace(/\.(?=\d{3,})/g, '').replace(/,(?=\d{3,})/g, '');
      }
      // Si hay coma y no punto, la coma es decimal
      if (limpio.includes(',') && !limpio.includes('.')) {
        limpio = limpio.replace(',', '.');
      }
      // Si hay ambos, dejar solo el punto como decimal
      if (limpio.includes('.') && limpio.includes(',')) {
        if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
          limpio = limpio.replace('.', '').replace(',', '.');
        } else {
          limpio = limpio.replace(/,/g, '');
        }
      }
      const numero = parseFloat(limpio);
      return isNaN(numero) ? "" : numero;
    }
    return "";
  }

  // Función para obtener el nombre del mes en español en mayúsculas
  function obtenerNombreMes(fechaStr) {
    if (!fechaStr) return "";
    // Acepta formatos YYYY-MM-DD, DD/MM/YYYY, etc.
    let partes = null;
    let mes = null;
    let anio = null;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
      partes = fechaStr.split("-");
      anio = partes[0];
      mes = partes[1];
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(fechaStr)) {
      // DD/MM/YYYY o DD-MM-YYYY
      partes = fechaStr.split(/[\/\-]/);
      anio = partes[2];
      mes = partes[1].padStart(2, '0');
    } else {
      return { anio: "", mesNombre: "" };
    }
    const meses = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];
    const mesIdx = parseInt(mes, 10) - 1;
    const mesNombre = meses[mesIdx] || "";
    return { anio, mesNombre };
  }

  // Función para buscar cliente automáticamente usando el endpoint del backend
  async function buscarClienteAutomatico(filaData) {
    try {
      // Extraer datos necesarios para la búsqueda
      const terminacion_tarjeta = filaData.NUM_DE_TARJETA ? 
        filaData.NUM_DE_TARJETA.toString().replace(/\D/g, '').slice(-4) : null;
      const fecha_venta = filaData.FECHA_VENTA;
      const monto = filaData.MONTO ? parseFloat(filaData.MONTO) : null;

      console.log('🔍 Buscando cliente automáticamente:', { 
        terminacion_tarjeta, 
        fecha_venta, 
        monto,
        filaOriginal: filaData 
      });

      // Validar que tenemos los datos mínimos necesarios
      if (!fecha_venta || !monto) {
        console.log('❌ No hay suficientes datos para buscar cliente (faltan fecha o monto)');
        return filaData; // Retornar la fila sin cambios
      }

      // Hacer la petición al endpoint
      const response = await axios.post(`${API_BASE_URL}/cargos_auto/buscar-clientes`, {
        terminacion_tarjeta,
        fecha_venta,
        monto
      });

      if (response.data && response.data.clientes && response.data.clientes.length > 0) {
        const clientes = response.data.clientes;
        
        // Si solo hay un cliente, usarlo automáticamente
        if (clientes.length === 1) {
          const cliente = clientes[0];
          console.log('✅ Cliente único encontrado automáticamente:', cliente);

          // Enriquecer la fila con los datos del cliente encontrado
          const filaEnriquecida = {
            ...filaData,
            CLIENTE: cliente.nombre_completo || filaData.CLIENTE,
            SUCURSAL: cliente.sucursal || filaData.SUCURSAL,
            BLOQUE: cliente.bloque || filaData.BLOQUE,
            EUROSKIN: cliente.es_euroskin ? "true" : "false"
          };

          console.log('📋 Fila enriquecida:', filaEnriquecida);
          return filaEnriquecida;
        } else {
          // Si hay múltiples clientes, mostrar modal para selección
          console.log('🔔 Múltiples clientes encontrados, mostrando modal para selección:', clientes);
          
          // Analizar si todos los clientes tienen la misma terminación de tarjeta
          const terminacionesTarjeta = clientes.map(c => c.terminacion_real).filter(t => t);
          const todasMismaTerminacion = terminacionesTarjeta.length > 0 && 
            terminacionesTarjeta.every(t => t === terminacionesTarjeta[0]);
          
          // Determinar el mensaje de explicación
          let tipoCoincidencia = "general";
          if (terminacion_tarjeta && !todasMismaTerminacion) {
            // Se buscó por tarjeta pero no todas coinciden - probablemente son resultados de fecha+monto
            tipoCoincidencia = "fecha_monto";
          } else if (terminacion_tarjeta && todasMismaTerminacion) {
            // Se buscó por tarjeta y todas coinciden - múltiples clientes con misma tarjeta
            tipoCoincidencia = "misma_tarjeta";
          }
          
          // Necesitamos obtener el índice de la fila actual
          const indiceFilaActual = filas.findIndex(fila => 
            fila.NUM_DE_TARJETA === filaData.NUM_DE_TARJETA && 
            fila.FECHA_VENTA === filaData.FECHA_VENTA && 
            fila.MONTO === filaData.MONTO
          );

          setModalSeleccionCliente({
            visible: true,
            clientes: clientes,
            filaIndex: indiceFilaActual,
            datosOriginales: filaData,
            tipoCoincidencia: tipoCoincidencia,
            terminacionBuscada: terminacion_tarjeta
          });

          // Retornar la fila sin cambios por ahora (la selección se hará en el modal)
          return filaData;
        }
      } else {
        console.log('❌ No se encontraron clientes coincidentes');
        return filaData; // Retornar la fila sin cambios
      }

    } catch (error) {
      console.error('❌ Error buscando cliente automáticamente:', error);
      return filaData; // En caso de error, retornar la fila sin cambios
    }
  }

  // Función para manejar la selección de cliente desde el modal
  function seleccionarCliente(clienteSeleccionado) {
    if (!modalSeleccionCliente.visible) return;

    const { filaIndex, datosOriginales } = modalSeleccionCliente;

    // Crear la fila enriquecida con los datos del cliente seleccionado
    const filaEnriquecida = {
      ...datosOriginales,
      CLIENTE: clienteSeleccionado.nombre_completo || datosOriginales.CLIENTE,
      SUCURSAL: clienteSeleccionado.sucursal || datosOriginales.SUCURSAL,
      BLOQUE: clienteSeleccionado.bloque || datosOriginales.BLOQUE,
      EUROSKIN: clienteSeleccionado.es_euroskin ? "true" : "false"
    };

    // Actualizar la fila en los datos
    const nuevasFilas = [...filas];
    nuevasFilas[filaIndex] = filaEnriquecida;
    setFilas(nuevasFilas);

    console.log('✅ Cliente seleccionado manualmente:', clienteSeleccionado);
    console.log('📋 Fila actualizada:', filaEnriquecida);

    // Cerrar el modal
    cerrarModalSeleccion();
  }

  // Función para cerrar el modal de selección
  function cerrarModalSeleccion() {
    setModalSeleccionCliente({
      visible: false,
      clientes: [],
      filaIndex: -1,
      datosOriginales: null,
      tipoCoincidencia: "general",
      terminacionBuscada: null
    });
  }

  // Función para manejar pegado de datos
  function manejarPegado(e) {
    // --- EFEVOO horizontal ---
    // Encabezados típicos EFEVOO (con variaciones)
    const efevooHeaders = [
      "ID", "FOLIO", "CLIENTE", "CLIENTE", "SUCURSAL", "NÚMERO DE TARJETA", "NUMERO DE TARJETA", "MARCA DE TARJETA", "TIPO DE TARJETA", "MÉTODO DE PAGO", "METODO DE PAGO", "FECHA Y HORA", "MONTO", "NÚMERO DE AUTORIZACIÓN", "NUMERO DE AUTORIZACION", "AFILIACIÓN", "AFILIACION", "PRODUCTO"
    ];
    // Mapeo EFEVOO -> columnas internas (flexible con mayúsculas/minúsculas y acentos)
    const efevooToCol = {
      "ID": "ID_DE_TRANSACCION",
      "FOLIO": "ID_DE_TRANSACCION", 
      "CLIENTE": "NOMBRE_DEL_COMERCIO",
      "Cliente": "NOMBRE_DEL_COMERCIO", // Variación con mayúscula inicial
      "SUCURSAL": "SUCURSAL",
      "Sucursal": "SUCURSAL", // Variación con mayúscula inicial
      "NÚMERO DE TARJETA": "NUM_DE_TARJETA",
      "NUMERO DE TARJETA": "NUM_DE_TARJETA", // Sin acento
      "Número de Tarjeta": "NUM_DE_TARJETA", // Variación con mayúscula inicial
      "MÉTODO DE PAGO": "PROCESADOR",
      "METODO DE PAGO": "PROCESADOR", // Sin acento
      "Método de Pago": "PROCESADOR", // Variación con mayúscula inicial
      "FECHA Y HORA": "FECHA_VENTA",
      "Fecha y Hora": "FECHA_VENTA", // Variación con mayúscula inicial
      "MONTO": "MONTO",
      "Monto": "MONTO", // Variación con mayúscula inicial
      "NÚMERO DE AUTORIZACIÓN": "AUTORIZACION",
      "NUMERO DE AUTORIZACION": "AUTORIZACION", // Sin acentos
      "Número de autorización": "AUTORIZACION", // Variación con mayúscula inicial
      "Número de Autorización": "AUTORIZACION", // Variación con mayúscula inicial
      "AFILIACIÓN": "ID_DEL_COMERCIO_AFILIACION",
      "AFILIACION": "ID_DEL_COMERCIO_AFILIACION", // Sin acento
      "Afiliación": "ID_DEL_COMERCIO_AFILIACION", // Variación con mayúscula inicial
      "PRODUCTO": "", // Campo que ignoramos
      "Producto": "" // Campo que ignoramos
    };

    // Mapeo general para todos los formatos
    const mapHeaders = {
      ...efevooToCol,
      "AÑO": "AÑO",
      "MES PETICIÓN": "MES_PETICION",
      "MES_PETICION": "MES_PETICION",
      "EUROSKIN": "EUROSKIN",
      "ID DEL COMERCIO / AFILIACIÓN": "ID_DEL_COMERCIO_AFILIACION",
      "ID DEL COMERCIO": "ID_DEL_COMERCIO_AFILIACION",
      "ID_DE_TRANSACCION": "ID_DE_TRANSACCION",
      "NOMBRE DEL COMERCIO": "NOMBRE_DEL_COMERCIO",
      "FECHA VENTA": "FECHA_VENTA",
      "MONTO": "MONTO",
      "NUM. DE TARJETA": "NUM_DE_TARJETA",
      "NUM_DE_TARJETA": "NUM_DE_TARJETA",
      "AUTORIZACION": "AUTORIZACION",
      "CLIENTE": "CLIENTE",
      "VENDEDORA": "VENDEDORA",
      "SUCURSAL": "SUCURSAL",
      "FECHA CONTRATO": "FECHA_CONTRATO",
      "PAQUETE": "PAQUETE",
      "BLOQUE": "BLOQUE",
      "FECHA DE PETICION": "FECHA_DE_PETICION",
      "FECHA DE RESPUESTA": "FECHA_DE_RESPUESTA",
      "COMENTARIOS": "COMENTARIOS",
      "CAPTURA CC": "CAPTURA_CC",
      "CAPTURA_CC": "CAPTURA_CC"
    };

    // Detectar formato EFEVOO horizontal
    // (rows se define después del paste)

    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    if (!paste) return;
    const rows = paste.split(/\r?\n/).filter(row => row.trim());

    // Detectar formato CREDOMATIC (formato específico con "DATOS DE LA TRANSACCIÓN")
    if (paste.includes("DATOS DE LA TRANSACCIÓN") || paste.includes("No. caso:") || paste.includes("Afiliado Pagador:")) {
      const obj = {};
      
      // Extraer información específica de CREDOMATIC
      const fechaMatch = paste.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/);
      const nombreComercioMatch = paste.match(/Señores:\s*([^\n\r]+)/);
      const montoMatch = paste.match(/Monto de la Transacción:\s*([\d,.]+)/);
      const tarjetaMatch = paste.match(/Número de Tarjeta:\s*(\d+X+\d+)/);
      const autorizacionMatch = paste.match(/Código de Autorización:\s*(\d+)/);
      const casoMatch = paste.match(/No\.\s*caso:\s*([^\n\r]+)/);
      const afiliadoMatch = paste.match(/No. Afiliado:\s*(\d+)/);
      
      if (fechaMatch) obj["FECHA_VENTA"] = normalizarFecha(fechaMatch[1]);
      if (nombreComercioMatch) obj["NOMBRE_DEL_COMERCIO"] = nombreComercioMatch[1].trim();
      if (montoMatch) obj["MONTO"] = normalizarMonto(montoMatch[1]);
      if (tarjetaMatch) obj["NUM_DE_TARJETA"] = tarjetaMatch[1];
      if (autorizacionMatch) obj["AUTORIZACION"] = autorizacionMatch[1];
      if (casoMatch) obj["ID_DE_TRANSACCION"] = casoMatch[1].trim();
      if (afiliadoMatch) obj["ID_DEL_COMERCIO_AFILIACION"] = afiliadoMatch[1];
      
      // Solo las columnas base, nunca más ni menos
      const newRow = Object.fromEntries(columnas.map(col => [col, obj[col] || ""]));
      newRow["PROCESADOR"] = "CREDOMATIC";
      newRow["EUROSKIN"] = "false";
      newRow["CAPTURA_CC"] = "EN PROCESO";
      
      // Detectar año y mes - usar mes actual si no hay fecha o usar fecha actual
      if (newRow["FECHA_VENTA"]) {
        const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
        newRow["AÑO"] = anio || new Date().getFullYear().toString();
        newRow["MES_PETICION"] = mesNombre || (() => {
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          return meses[new Date().getMonth()];
        })();
      } else {
        // Si no hay fecha, usar año y mes actual
        const fechaActual = new Date();
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        newRow["AÑO"] = fechaActual.getFullYear().toString();
        newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
      }

      // 🔍 BÚSQUEDA AUTOMÁTICA DE CLIENTE
      (async () => {
        try {
          const filaEnriquecida = await buscarClienteAutomatico(newRow);
          
          // Llenar las filas existentes primero, solo agregar nuevas si es necesario
          setFilas(prev => {
            const filasVacias = prev.filter(fila => {
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              return valoresConDatos.length === 0;
            }).length;
            
            if (filasVacias > 0) {
              // Reemplazar la primera fila vacía
              const nuevasFilas = [...prev];
              const indiceVacia = prev.findIndex(fila => {
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "CAPTURA_CC" && value === "EN PROCESO") return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                return valoresConDatos.length === 0;
              });
              if (indiceVacia !== -1) {
                nuevasFilas[indiceVacia] = filaEnriquecida;
              }
              return nuevasFilas;
            } else {
              // Si no hay filas vacías, agregar al principio
              return [filaEnriquecida, ...prev];
            }
          });
          setMensaje("✅ Se detectó formato CREDOMATIC, se pegó 1 fila y se buscó el cliente automáticamente.");
        } catch (error) {
          console.error('❌ Error en búsqueda automática:', error);
          // Si falla la búsqueda, usar la lógica original sin enriquecimiento
          setFilas(prev => {
            const filasVacias = prev.filter(fila => {
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              return valoresConDatos.length === 0;
            }).length;
            
            if (filasVacias > 0) {
              // Reemplazar la primera fila vacía
              const nuevasFilas = [...prev];
              const indiceVacia = prev.findIndex(fila => {
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "CAPTURA_CC" && value === "EN PROCESO") return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                return valoresConDatos.length === 0;
              });
              if (indiceVacia !== -1) {
                nuevasFilas[indiceVacia] = newRow;
              }
              return nuevasFilas;
            } else {
              // Si no hay filas vacías, agregar al principio
              return [newRow, ...prev];
            }
          });
          setMensaje("✅ Se detectó formato CREDOMATIC y se pegó 1 fila (búsqueda automática falló).");
        }
        setTimeout(() => setMensaje(""), 4000);
      })();
      
      e.target.value = "";
      return;
    }

    // Detectar formato EFEVOO (formato específico con columnas separadas por tabulaciones)

    // Detectar formato EFEVOO horizontal (debe ir después de obtener rows)
    if (rows.length >= 2) {
      const headers = rows[0].split(/\t/).map(h => h.trim());
      console.log('🔍 Encabezados detectados:', headers);
      
      // Verificar si contiene encabezados clave de EFEVOO (más flexible)
      const encabezadosClaveEFEVOO = ["ID", "Cliente", "Monto", "Fecha y Hora"];
      const tieneEncabezadosEFEVOO = encabezadosClaveEFEVOO.some(clave => 
        headers.some(h => h.toLowerCase().includes(clave.toLowerCase()))
      );
      
      if (tieneEncabezadosEFEVOO) {
        console.log('✅ Formato EFEVOO detectado por encabezados clave');
        const dataRows = rows.slice(1);
        
        const newRows = dataRows.map(row => {
          const cells = row.split(/\t/);
          console.log('🔍 Procesando fila EFEVOO:', cells);
          
          // Solo las columnas base, nunca más ni menos
          const newRow = Object.fromEntries(columnas.map(col => [col, ""]));
          
          // Mapear cada encabezado con su valor correspondiente
          headers.forEach((header, i) => {
            let value = cells[i] ? cells[i].trim() : "";
            const headerKey = header.trim();
            const colInterno = efevooToCol[headerKey] || efevooToCol[headerKey.toUpperCase()];
            
            console.log(`🔍 Mapeando: "${headerKey}" -> "${colInterno}" = "${value}"`);
            
            if (colInterno && colInterno !== "" && columnas.includes(colInterno)) {
              if (colInterno === "MONTO") {
                value = normalizarMonto(value);
              } else if (colInterno === "FECHA_VENTA" || colInterno.includes("FECHA")) {
                value = normalizarFecha(value);
              }
              newRow[colInterno] = value;
              console.log(`✅ Valor asignado: ${colInterno} = "${value}"`);
            }
          });
          
          newRow["PROCESADOR"] = "EFEVOO";
          newRow["EUROSKIN"] = "false";
          newRow["CAPTURA_CC"] = "EN PROCESO";
          
          console.log('✅ Fila EFEVOO procesada:', newRow);
          
          // Detectar año y mes - usar mes actual si no hay fecha o usar fecha actual
        if (newRow["FECHA_VENTA"]) {
          const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
          newRow["AÑO"] = anio || new Date().getFullYear().toString();
          newRow["MES_PETICION"] = mesNombre || (() => {
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            return meses[new Date().getMonth()];
          })();
        } else {
          // Si no hay fecha, usar año y mes actual
          const fechaActual = new Date();
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          newRow["AÑO"] = fechaActual.getFullYear().toString();
          newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
        }
        return newRow;
        });

        // 🔍 BÚSQUEDA AUTOMÁTICA DE CLIENTES PARA MÚLTIPLES FILAS
        (async () => {
          try {
            const filasEnriquecidas = [];
            for (const fila of newRows) {
              const filaEnriquecida = await buscarClienteAutomatico(fila);
              filasEnriquecidas.push(filaEnriquecida);
            }

            // Llenar las filas existentes primero, solo agregar nuevas si es necesario
            setFilas(prev => {
              const filasVacias = prev.filter(fila => {
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "CAPTURA_CC" && value === "EN PROCESO") return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                return valoresConDatos.length === 0;
              }).length;
              
              if (filasEnriquecidas.length <= filasVacias) {
                // Si hay suficientes filas vacías, llenarlas
                const nuevasFilas = [...prev];
                let contadorLlenado = 0;
                for (let i = 0; i < nuevasFilas.length && contadorLlenado < filasEnriquecidas.length; i++) {
                  const fila = nuevasFilas[i];
                  const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                    if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                    if (key === "AÑO") return false;
                    if (key === "MES_PETICION") return false;
                    return value !== "" && value !== null && value !== undefined;
                  });
                  if (valoresConDatos.length === 0) {
                    nuevasFilas[i] = filasEnriquecidas[contadorLlenado];
                    contadorLlenado++;
                  }
                }
                return nuevasFilas;
              } else {
                // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
                const nuevasFilas = [...prev];
                let contadorLlenado = 0;
                
                // Llenar las filas vacías existentes
                for (let i = 0; i < nuevasFilas.length && contadorLlenado < filasEnriquecidas.length; i++) {
                  const fila = nuevasFilas[i];
                  const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                    if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                    if (key === "AÑO") return false;
                    if (key === "MES_PETICION") return false;
                    return value !== "" && value !== null && value !== undefined;
                  });
                  if (valoresConDatos.length === 0) {
                    nuevasFilas[i] = filasEnriquecidas[contadorLlenado];
                    contadorLlenado++;
                  }
                }
                
                // Agregar las filas restantes al principio
                const filasRestantes = filasEnriquecidas.slice(contadorLlenado);
                return [...filasRestantes, ...nuevasFilas];
              }
            });
            setMensaje(`✅ Se pegaron ${newRows.length} filas EFEVOO (horizontal) y se buscaron los clientes automáticamente`);
          } catch (error) {
            console.error('❌ Error en búsqueda automática masiva:', error);
            // Si falla la búsqueda automática, usar la lógica original
            setFilas(prev => {
              const filasVacias = prev.filter(fila => {
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "CAPTURA_CC" && value === "EN PROCESO") return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                return valoresConDatos.length === 0;
              }).length;
              
              if (newRows.length <= filasVacias) {
                // Si hay suficientes filas vacías, llenarlas
                const nuevasFilas = [...prev];
                let contadorLlenado = 0;
                for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
                  const fila = nuevasFilas[i];
                  const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                    if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                    if (key === "AÑO") return false;
                    if (key === "MES_PETICION") return false;
                    return value !== "" && value !== null && value !== undefined;
                  });
                  if (valoresConDatos.length === 0) {
                    nuevasFilas[i] = newRows[contadorLlenado];
                    contadorLlenado++;
                  }
                }
                return nuevasFilas;
              } else {
                // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
                const nuevasFilas = [...prev];
                let contadorLlenado = 0;
                
                // Llenar las filas vacías existentes
                for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
                  const fila = nuevasFilas[i];
                  const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                    if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                    if (key === "AÑO") return false;
                    if (key === "MES_PETICION") return false;
                    return value !== "" && value !== null && value !== undefined;
                  });
                  if (valoresConDatos.length === 0) {
                    nuevasFilas[i] = newRows[contadorLlenado];
                    contadorLlenado++;
                  }
                }
                
                // Agregar las filas restantes al principio
                const filasRestantes = newRows.slice(contadorLlenado);
                return [...filasRestantes, ...nuevasFilas];
              }
            });
            setMensaje(`✅ Se pegaron ${newRows.length} filas EFEVOO (horizontal) - búsqueda automática falló`);
          }
          setTimeout(() => setMensaje(""), 4000);
        })();
        
        e.target.value = "";
        return;
      }
    }

    // Encabezados BSD verticales (orden esperado)
    const bsdHeaders = [
      "AFILIACION",
      "NOMBRE DEL COMERCIO",
      "BIN TARJETA",
      "TARJETA",
      "FECHA VENTA",
      "HORA",
      "IMPORTE",
      "AUTORIZACION",
      "FECHA CONTRACARGO",
      "REFERENCIA"
    ];

    // Mapeo BSD -> columnas internas
    const bsdToCol = {
      "AFILIACION": "ID_DEL_COMERCIO_AFILIACION",
      "NOMBRE DEL COMERCIO": "NOMBRE_DEL_COMERCIO",
      "TARJETA": "NUM_DE_TARJETA",
      "FECHA VENTA": "FECHA_VENTA",
      "HORA": "HORA",
      "IMPORTE": "MONTO",
      "AUTORIZACION": "AUTORIZACION",
      "REFERENCIA": "ID_DE_TRANSACCION"
    };

    // Detectar formato BSD vertical
    if (rows.length > 10 && bsdHeaders.every((h, i) => rows[i]?.trim().toUpperCase() === h)) {
      const numHeaders = bsdHeaders.length;
      const numRecords = Math.floor((rows.length - numHeaders) / numHeaders);
      const newRows = [];
      for (let i = 0; i < numRecords; i++) {
        const start = numHeaders + i * numHeaders;
        const end = start + numHeaders;
        const values = rows.slice(start, end);
        const reg = {};
        bsdHeaders.forEach((h, idx) => {
          let value = values[idx] ? values[idx].trim() : "";
          const col = bsdToCol[h];
          if (col === "MONTO") value = normalizarMonto(value);
          if (col && col.includes("FECHA") && value) value = normalizarFecha(value);
          reg[col] = value;
        });
        // Solo las columnas base, nunca más ni menos
        const row = Object.fromEntries(columnas.map(col => [col, reg[col] || ""]));
        row["PROCESADOR"] = "BSD";
        row["EUROSKIN"] = "false";
        row["CAPTURA_CC"] = "EN PROCESO";
        
        // Detectar año y mes - usar mes actual si no hay fecha o usar fecha actual
        if (row["FECHA_VENTA"]) {
          const { anio, mesNombre } = obtenerNombreMes(row["FECHA_VENTA"]);
          row["AÑO"] = anio || new Date().getFullYear().toString();
          row["MES_PETICION"] = mesNombre || (() => {
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            return meses[new Date().getMonth()];
          })();
        } else {
          // Si no hay fecha, usar año y mes actual
          const fechaActual = new Date();
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          row["AÑO"] = fechaActual.getFullYear().toString();
          row["MES_PETICION"] = meses[fechaActual.getMonth()];
        }
        newRows.push(row);
      }

      // 🔍 BÚSQUEDA AUTOMÁTICA DE CLIENTES PARA MÚLTIPLES FILAS BSD
      (async () => {
        try {
          const filasEnriquecidas = [];
          for (const fila of newRows) {
            const filaEnriquecida = await buscarClienteAutomatico(fila);
            filasEnriquecidas.push(filaEnriquecida);
          }

          // Llenar las filas existentes primero, solo agregar nuevas si es necesario
          setFilas(prev => {
            const filasVacias = prev.filter(fila => {
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              return valoresConDatos.length === 0;
            }).length;
            
            if (filasEnriquecidas.length <= filasVacias) {
              // Si hay suficientes filas vacías, llenarlas
              const nuevasFilas = [...prev];
              let contadorLlenado = 0;
              for (let i = 0; i < nuevasFilas.length && contadorLlenado < filasEnriquecidas.length; i++) {
                const fila = nuevasFilas[i];
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                if (valoresConDatos.length === 0) {
                  nuevasFilas[i] = filasEnriquecidas[contadorLlenado];
                  contadorLlenado++;
                }
              }
              return nuevasFilas;
            } else {
              // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
              const nuevasFilas = [...prev];
              let contadorLlenado = 0;
              
              // Llenar las filas vacías existentes
              for (let i = 0; i < nuevasFilas.length && contadorLlenado < filasEnriquecidas.length; i++) {
                const fila = nuevasFilas[i];
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                if (valoresConDatos.length === 0) {
                  nuevasFilas[i] = filasEnriquecidas[contadorLlenado];
                  contadorLlenado++;
                }
              }
              
              // Agregar las filas restantes al principio
              const filasRestantes = filasEnriquecidas.slice(contadorLlenado);
              return [...filasRestantes, ...nuevasFilas];
            }
          });
          setMensaje(`✅ Se pegaron ${newRows.length} filas BSD (vertical) y se buscaron los clientes automáticamente`);
        } catch (error) {
          console.error('❌ Error en búsqueda automática BSD:', error);
          // Si falla la búsqueda automática, usar la lógica original
          setFilas(prev => {
            const filasVacias = prev.filter(fila => {
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              return valoresConDatos.length === 0;
            }).length;
            
            if (newRows.length <= filasVacias) {
              // Si hay suficientes filas vacías, llenarlas
              const nuevasFilas = [...prev];
              let contadorLlenado = 0;
              for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
                const fila = nuevasFilas[i];
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                if (valoresConDatos.length === 0) {
                  nuevasFilas[i] = newRows[contadorLlenado];
                  contadorLlenado++;
                }
              }
              return nuevasFilas;
            } else {
              // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
              const nuevasFilas = [...prev];
              let contadorLlenado = 0;
              
              // Llenar las filas vacías existentes
              for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
                const fila = nuevasFilas[i];
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                if (valoresConDatos.length === 0) {
                  nuevasFilas[i] = newRows[contadorLlenado];
                  contadorLlenado++;
                }
              }
              
              // Agregar las filas restantes al principio
              const filasRestantes = newRows.slice(contadorLlenado);
              return [...filasRestantes, ...nuevasFilas];
            }
          });
          setMensaje(`✅ Se pegaron ${newRows.length} filas BSD (vertical) - búsqueda automática falló`);
        }
        setTimeout(() => setMensaje(""), 4000);
      })();
      
      e.target.value = "";
      return;
    }
    // ...resto de la función (otros formatos)...

    // Formato transpuesto
    if (rows.length > 2 && rows.every(r => r.split(/\t|\s{2,}/).length === 1)) {
      let headerIndices = [];
      for (let i = 0; i < rows.length; i++) {
        const val = rows[i].trim();
        if (isNaN(val) && !/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(val) && !/^\$?\s*[\d,.]+$/.test(val)) {
          headerIndices.push(i);
        }
      }
      if (headerIndices.length >= 2) {
        const headers = headerIndices.map(i => rows[i].trim().toUpperCase());
        const dataBlocks = headerIndices.map((start, idx) => {
          const end = headerIndices[idx + 1] || rows.length;
          return rows.slice(start + 1, end);
        });
        const numRegistros = Math.max(...dataBlocks.map(b => b.length));
        const registros = [];
        for (let i = 0; i < numRegistros; i++) {
          const reg = {};
          headers.forEach((h, j) => {
            const col = mapHeaders[h] || h;
            reg[col] = dataBlocks[j][i] ? dataBlocks[j][i].trim() : "";
          });
          if (reg['MONTO']) reg['MONTO'] = normalizarMonto(reg['MONTO']);
          Object.keys(reg).forEach(col => {
            if (col.includes("FECHA")) reg[col] = normalizarFecha(reg[col]);
          });
          registros.push(reg);
        }
        // Solo las columnas base, nunca más ni menos
        const newRows = registros.map(r => {
          const row = Object.fromEntries(columnas.map(col => [col, r[col] || ""]));
          row["EUROSKIN"] = row["EUROSKIN"] || "false";
          row["CAPTURA_CC"] = row["CAPTURA_CC"] || "EN PROCESO";
          
          // Detectar año y mes - usar mes actual si no hay fecha o usar fecha actual
          if (row["FECHA_VENTA"]) {
            const { anio, mesNombre } = obtenerNombreMes(row["FECHA_VENTA"]);
            row["AÑO"] = anio || new Date().getFullYear().toString();
            row["MES_PETICION"] = mesNombre || (() => {
              const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
              return meses[new Date().getMonth()];
            })();
          } else {
            // Si no hay fecha, usar año y mes actual
            const fechaActual = new Date();
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            row["AÑO"] = fechaActual.getFullYear().toString();
            row["MES_PETICION"] = meses[fechaActual.getMonth()];
          }
          return row;
        });
        setFilas(prev => {
          const nuevas = [...newRows];
          if (nuevas.length <= prev.length) {
            return prev.map((fila, i) => nuevas[i] ? nuevas[i] : fila);
          } else {
            return [
              ...nuevas.slice(0, prev.length),
              ...nuevas.slice(prev.length)
            ];
          }
        });
        setFilas(prev => {
          const nuevas = [...newRows];
          if (nuevas.length <= prev.length) {
            // Sobrescribe solo las primeras N filas
            return prev.map((fila, i) => nuevas[i] ? nuevas[i] : fila);
          } else {
            // Sobrescribe y agrega las que falten
            return [
              ...nuevas.slice(0, prev.length),
              ...nuevas.slice(prev.length)
            ];
          }
        });
      setFilas(prev => {
        const nuevas = [...newRows];
        if (nuevas.length <= prev.length) {
          return prev.map((fila, i) => nuevas[i] ? nuevas[i] : fila);
        } else {
          return [
            ...nuevas.slice(0, prev.length),
            ...nuevas.slice(prev.length)
          ];
        }
      });
        setMensaje(`✅ Se pegaron ${newRows.length} filas (formato transpuesto)`);
        setTimeout(() => setMensaje(""), 4000);
        e.target.value = "";
        return;
      }
    }

    // Vertical
    if (rows.length > 2 && rows.every(r => r.split(/\t|\s{2,}/).length === 2)) {
      const obj = {};
      rows.forEach(line => {
        const [key, value] = line.split(/\t|\s{2,}/);
        if (key && value) {
          const colInterno = mapHeaders[key.trim().toUpperCase()] || key.trim().toUpperCase();
          obj[colInterno] = value.trim();
        }
      });
      if (obj['MONTO']) obj['MONTO'] = normalizarMonto(obj['MONTO']);
      Object.keys(obj).forEach(col => {
        if (col.includes("FECHA")) obj[col] = normalizarFecha(obj[col]);
      });
      // Solo las columnas base, nunca más ni menos
      const newRow = Object.fromEntries(columnas.map(col => [col, obj[col] || ""]));
      newRow["EUROSKIN"] = newRow["EUROSKIN"] || "false";
      newRow["CAPTURA_CC"] = newRow["CAPTURA_CC"] || "EN PROCESO";
      
      // Detectar año y mes - usar mes actual si no hay fecha o usar fecha actual
      if (newRow["FECHA_VENTA"]) {
        const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
        newRow["AÑO"] = anio || new Date().getFullYear().toString();
        newRow["MES_PETICION"] = mesNombre || (() => {
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          return meses[new Date().getMonth()];
        })();
      } else {
        // Si no hay fecha, usar año y mes actual
        const fechaActual = new Date();
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        newRow["AÑO"] = fechaActual.getFullYear().toString();
        newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
      }
      // Llenar las filas existentes primero, solo agregar nuevas si es necesario
      setFilas(prev => {
        const filasVacias = prev.filter(fila => {
          const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
            if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
            if (key === "AÑO") return false;
            if (key === "MES_PETICION") return false;
            return value !== "" && value !== null && value !== undefined;
          });
          return valoresConDatos.length === 0;
        }).length;
        
        if (filasVacias > 0) {
          // Reemplazar la primera fila vacía
          const nuevasFilas = [...prev];
          const indiceVacia = prev.findIndex(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          });
          if (indiceVacia !== -1) {
            nuevasFilas[indiceVacia] = newRow;
          }
          return nuevasFilas;
        } else {
          // Si no hay filas vacías, agregar al principio
          return [newRow, ...prev];
        }
      });
      setMensaje("✅ Se detectó formato vertical y se pegó 1 fila.");
      setTimeout(() => setMensaje(""), 4000);
      e.target.value = "";
      return;
    }

      // Horizontal
      if (rows.length >= 2) {
        const headers = rows[0].split(/\t|\s{2,}/).map(h => h.trim().toUpperCase());
        const dataRows = rows.slice(1);
        const mapeoDetectado = headers.map(h => mapHeaders[h] || h);
        const newRows = dataRows.map(row => {
          const cells = row.split(/\t|\s{2,}/);
          // Solo las columnas base, nunca más ni menos
          const newRow = Object.fromEntries(columnas.map(col => [col, ""]));
          mapeoDetectado.forEach((colInterno, i) => {
            if (columnas.includes(colInterno)) {
              let value = cells[i] ? cells[i].trim() : "";
              if (colInterno === "MONTO") value = normalizarMonto(value);
              if (colInterno.includes("FECHA") && value) value = normalizarFecha(value);
              newRow[colInterno] = value;
            }
          });
          
          // Establecer valores por defecto
          newRow["EUROSKIN"] = newRow["EUROSKIN"] || "false";
          newRow["CAPTURA_CC"] = newRow["CAPTURA_CC"] || "EN PROCESO";
          
          // Detectar año y mes - usar mes actual si no hay fecha o usar fecha actual
          if (newRow["FECHA_VENTA"]) {
            const { anio, mesNombre } = obtenerNombreMes(newRow["FECHA_VENTA"]);
            newRow["AÑO"] = anio || new Date().getFullYear().toString();
            newRow["MES_PETICION"] = mesNombre || (() => {
              const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
              return meses[new Date().getMonth()];
            })();
          } else {
            // Si no hay fecha, usar año y mes actual
            const fechaActual = new Date();
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            newRow["AÑO"] = fechaActual.getFullYear().toString();
            newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
          }
          return newRow;
        });
        setFilas(prev => {
          // Si los datos previos son las 10 filas vacías iniciales, reemplazarlas
          const todasVacias = prev.every(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              // Excluir campos que tienen valores por defecto
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "CAPTURA_CC" && value === "EN PROCESO") return false;
              if (key === "AÑO") return false; // Ignorar AÑO ya que siempre tiene valor por defecto
              if (key === "MES_PETICION") return false; // Ignorar MES_PETICION ya que siempre tiene valor por defecto
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          });
          
          if (todasVacias) {
            return newRows;
          }
          
          // Si hay datos previos, llenar filas vacías primero
          const filasVacias = prev.filter(fila => {
            const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
              if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
              if (key === "AÑO") return false;
              if (key === "MES_PETICION") return false;
              return value !== "" && value !== null && value !== undefined;
            });
            return valoresConDatos.length === 0;
          }).length;
          
          if (newRows.length <= filasVacias) {
            // Si hay suficientes filas vacías, llenarlas
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = newRows[contadorLlenado];
                contadorLlenado++;
              }
            }
            return nuevasFilas;
          } else {
            // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            
            // Llenar las filas vacías existentes
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < newRows.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = newRows[contadorLlenado];
                contadorLlenado++;
              }
            }
            
            // Agregar las filas restantes al principio
            const filasRestantes = newRows.slice(contadorLlenado);
            return [...filasRestantes, ...nuevasFilas];
          }
        });
        setMensaje(`✅ Se pegaron ${newRows.length} filas y se mapearon los encabezados: ${mapeoDetectado.join(', ')}`);
        setTimeout(() => setMensaje(""), 4000);
        e.target.value = "";
        return;
      }
    
    setMensaje("❌ No se detectaron encabezados válidos");
    setTimeout(() => setMensaje(""), 4000);
  }

  // Guardar datos con validación completa
  async function guardarDatos() {
    setGuardando(true);
    try {
      const filasCompletas = filas.filter(fila => Object.values(fila).some(v => v && v.toString().trim() !== ""));
      
      if (!filasCompletas.length) {
        setMensaje("❌ No hay datos para guardar");
        setGuardando(false);
        return;
      }
      
      // Validar todas las filas
      let erroresEncontrados = false;
      const nuevosErrores = {};
      
      filasCompletas.forEach((fila, idx) => {
        // Verificar campos obligatorios
        const faltantes = verificarCamposObligatorios(fila, tipoTablaSeleccionada);
        faltantes.forEach(campo => {
          nuevosErrores[`${idx}-${campo}`] = "Campo obligatorio";
          erroresEncontrados = true;
        });
        
        // Validar formato de campos
        Object.keys(fila).forEach(campo => {
          if (fila[campo] && fila[campo].toString().trim() !== "") {
            const error = validarCampo(campo, fila[campo], tipoTablaSeleccionada);
            if (error) {
              nuevosErrores[`${idx}-${campo}`] = error;
              erroresEncontrados = true;
            }
          }
        });
      });
      
      if (erroresEncontrados) {
        setErroresValidacion(nuevosErrores);
        setMensaje("❌ Hay errores de validación. Revisa los campos marcados en rojo.");
        setGuardando(false);
        setTimeout(() => setMensaje(""), 5000);
        return;
      }
      
      // Agregar el tipo de tabla a los datos
      const datosConTipo = filasCompletas.map(fila => ({
        ...fila,
        TIPO_TABLA: tipoTablaSeleccionada
      }));
      
      await axios.post(`${API_BASE_URL}/aclaraciones/insertar-multiple`, { 
        datos: datosConTipo,
        tipoTabla: tipoTablaSeleccionada 
      });
      
      setMensaje(`✅ Se guardaron ${filasCompletas.length} registros de ${tipoTablaSeleccionada} correctamente`);
      setFilas(Array(1).fill().map(() => {
        const base = Object.fromEntries(columnas.map(c => [c, ""]));
        base["EUROSKIN"] = "false";
        base["CAPTURA_CC"] = "EN PROCESO"; // Valor por defecto
        // Obtener año y mes actual en nombre
        const fechaActual = new Date();
        const anioActual = fechaActual.getFullYear().toString();
        const meses = [
          "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
        ];
        const mesActualNombre = meses[fechaActual.getMonth()];
        base["AÑO"] = anioActual;
        base["MES_PETICION"] = mesActualNombre;
        return base;
      }));
      setErroresValidacion({});
    } catch (error) {
      setMensaje("❌ Error al guardar los datos: " + (error.response?.data?.message || error.message));
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(""), 5000);
    }
  }

  // Función para búsqueda manual masiva de clientes
  async function buscarClientesMasivo() {
    const filasConDatos = filas.filter(fila => {
      const tieneNumTarjeta = fila.NUM_DE_TARJETA && fila.NUM_DE_TARJETA.toString().trim() !== '';
      const tieneFecha = fila.FECHA_VENTA && fila.FECHA_VENTA.toString().trim() !== '';
      const tieneMonto = fila.MONTO && fila.MONTO.toString().trim() !== '';
      
      return tieneNumTarjeta && tieneFecha && tieneMonto;
    });

    if (filasConDatos.length === 0) {
      setMensaje("❌ No hay filas con datos suficientes para buscar clientes (necesita tarjeta, fecha y monto)");
      setTimeout(() => setMensaje(""), 4000);
      return;
    }

    setGuardando(true);
    setMensaje(`🔍 Buscando clientes para ${filasConDatos.length} filas...`);

    try {
      let clientesEncontrados = 0;
      
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        
        const tieneNumTarjeta = fila.NUM_DE_TARJETA && fila.NUM_DE_TARJETA.toString().trim() !== '';
        const tieneFecha = fila.FECHA_VENTA && fila.FECHA_VENTA.toString().trim() !== '';
        const tieneMonto = fila.MONTO && fila.MONTO.toString().trim() !== '';
        
        if (tieneNumTarjeta && tieneFecha && tieneMonto) {
          try {
            const filaEnriquecida = await buscarClienteAutomatico(fila);
            
            // Solo actualizar si se encontraron datos del cliente
            if (filaEnriquecida.CLIENTE && filaEnriquecida.CLIENTE.trim() !== '') {
              setFilas(prevFilas => {
                const nuevasFilas = [...prevFilas];
                nuevasFilas[i] = filaEnriquecida;
                return nuevasFilas;
              });
              clientesEncontrados++;
              
              setMensaje(`🔍 Procesando... ${clientesEncontrados} clientes encontrados`);
            }
          } catch (error) {
            console.error(`❌ Error buscando cliente para fila ${i + 1}:`, error);
          }
          
          // Pequeña pausa entre búsquedas
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setMensaje(`✅ Búsqueda completada: ${clientesEncontrados} clientes encontrados de ${filasConDatos.length} filas procesadas`);
    } catch (error) {
      console.error('❌ Error en búsqueda masiva:', error);
      setMensaje("❌ Error durante la búsqueda masiva de clientes");
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(""), 5000);
    }
  }

  // Limpiar datos
  function limpiarDatos() {
    if (window.confirm("¿Estás seguro de que quieres limpiar todos los datos?")) {
      setFilas(Array(1).fill().map(() => {
        const base = Object.fromEntries(columnas.map(c => [c, ""]));
        base["EUROSKIN"] = "false";
        base["CAPTURA_CC"] = "EN PROCESO"; // Valor por defecto
        // Obtener año y mes actual en nombre
        const fechaActual = new Date();
        const anioActual = fechaActual.getFullYear().toString();
        const meses = [
          "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
        ];
        const mesActualNombre = meses[fechaActual.getMonth()];
        base["AÑO"] = anioActual;
        base["MES_PETICION"] = mesActualNombre;
        return base;
      }));
      
      // Limpiar el registro de filas procesadas para búsqueda automática
      setFilasYaProcesadas(new Set());
      
      setMensaje("🧹 Datos limpiados");
      setTimeout(() => setMensaje(""), 2000);
    }
  }

  // Eliminar fila
  function eliminarFila(idx) {
    setFilas(filas => filas.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-4 bg-gray-900 text-gray-200 min-h-screen relative">
      {/* Área clickeable para limpiar selección */}
      <div 
        className="absolute inset-0 z-0"
        onMouseDown={(e) => {
          // Solo limpiar si el click es directamente en esta área
          if (e.target === e.currentTarget) {
            limpiarSeleccion();
          }
        }}
      ></div>
      
      {/* Estilos CSS para celdas seleccionadas */}
      <style>{`
        .cell-selected {
          background-color: rgba(59, 130, 246, 0.3) !important;
          border: 2px solid #3b82f6 !important;
          box-shadow: inset 0 0 0 1px #3b82f6 !important;
        }
        .cell-in-range {
          background-color: rgba(59, 130, 246, 0.15) !important;
          border: 1px solid #60a5fa !important;
          box-shadow: inset 0 0 0 1px #60a5fa !important;
        }
      `}</style>
      
      <div className="w-full max-w-none mx-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Ingresar Aclaraciones</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={buscarClientesMasivo}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              disabled={guardando}
            >
              🔍 Buscar Clientes
            </button>
            <button
              onClick={() => setBusquedaAutomaticaHabilitada(!busquedaAutomaticaHabilitada)}
              className={`px-4 py-2 rounded transition ${
                busquedaAutomaticaHabilitada 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
              disabled={guardando}
              title={busquedaAutomaticaHabilitada ? 'Deshabilitar búsqueda automática' : 'Habilitar búsqueda automática'}
            >
              {busquedaAutomaticaHabilitada ? '🔄 Auto ON' : '⏸️ Auto OFF'}
            </button>
            <button
              onClick={limpiarDatos}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition"
              disabled={guardando}
            >
              🧹 Limpiar
            </button>
            <button
              onClick={guardarDatos}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "💾 Guardar"}
            </button>
          </div>
        </div>

        {/* Indicador de estado de búsqueda automática */}
        {busquedaAutomaticaHabilitada && (
          <div className="mb-2 p-2 bg-blue-900 text-blue-200 rounded text-sm">
            🔄 Búsqueda automática de clientes habilitada - Los clientes se buscarán automáticamente cuando pegues datos con tarjeta, fecha y monto
          </div>
        )}

        {mensaje && (
          <div className={`mb-4 p-3 rounded ${
            mensaje.startsWith('✅') ? 'bg-green-900 text-green-200' : 
            mensaje.startsWith('🔍') ? 'bg-blue-900 text-blue-200' : 
            'bg-red-900 text-red-200'
          }`}>
            {mensaje}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Pegar datos (detecta automáticamente el formato):
          </label>
          <textarea
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            onPaste={manejarPegado}
            placeholder="Pega aquí los datos de aclaraciones..."
          />
        </div>

        <div className="bg-gray-800 rounded-lg shadow overflow-hidden mb-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-0 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-700 z-10 w-10 border border-gray-600">#</th>
                  {columnas.map(col => {
                    const esObligatorio = tiposTabla[tipoTablaSeleccionada]?.camposObligatorios.includes(col);
                    
                    // Definir anchos específicos para columnas importantes
                    let anchoColumna = "";
                    if (col === "NOMBRE_DEL_COMERCIO") anchoColumna = "min-w-[300px]";
                    else if (col === "CLIENTE") anchoColumna = "min-w-[200px]";
                    else if (col === "MONTO") anchoColumna = "min-w-[120px]";
                    else if (col === "NUM_DE_TARJETA") anchoColumna = "min-w-[150px]";
                    else if (col === "AÑO") anchoColumna = "min-w-[80px]";
                    
                    return (
                      <th key={col} className={`px-0 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider relative border border-gray-600 ${anchoColumna}`}>
                        <div className="px-3">
                          {col.replace(/_/g, ' ')}
                          {esObligatorio && (
                            <span className="text-yellow-400 ml-1" title="Campo obligatorio">*</span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-0 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-10 border border-gray-600">
                    <div className="px-3">Acción</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800">{/* Cambio de Excel: quitar divide-y */}
                {Array.isArray(filas) ? filas.map((fila, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700`}>
                    <td className="px-0 py-0 whitespace-nowrap text-sm text-gray-300 sticky left-0 bg-inherit z-10 border border-gray-600">
                      <div className="px-3 py-2">{idx + 1}</div>
                    </td>
                    {columnas.map(col => {
                      const esObligatorio = tiposTabla[tipoTablaSeleccionada]?.camposObligatorios.includes(col);
                      const tieneError = erroresValidacion[`${idx}-${col}`];
                      const estiloError = tieneError ? "border-red-500 bg-red-900/20" : "border-gray-700";
                      const estiloObligatorio = esObligatorio ? "border-yellow-500/50" : "";
                      
                      return (
                        <td key={`${idx}-${col}`} className="px-1 py-1 relative">
                          {col === 'PROCESADOR' && procesadores.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={procesadores}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'SUCURSAL' && sucursales.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={sucursales}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'BLOQUE' && bloques.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={bloques}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'VENDEDORA' && vendedoras.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={vendedoras}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col === 'COMENTARIOS' && comentariosComunes.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={comentariosComunes}
                              className={`min-w-[250px] ${estiloError} ${estiloObligatorio}`}
                            />
                          ) : col.includes('FECHA') ? (
                            <input
                              type="date"
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            />
                          ) : col === 'MONTO' ? (
                            <input
                              type="number"
                              step="0.01"
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            />
                          ) : col === 'EUROSKIN' ? (
                            <select
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            >
                              <option value="">Selecciona...</option>
                              <option value="true">Sí</option>
                              <option value="false">No</option>
                            </select>
                          ) : col === 'CAPTURA_CC' && capturaCC.length > 0 ? (
                            <SelectEditor
                              value={fila[col]}
                              onChange={(value) => handleCellChange(idx, col, value)}
                              options={capturaCC}
                              className={`${estiloError} ${estiloObligatorio}`}
                            />
                          ) : (
                            <input
                              type="text"
                              className={`w-full bg-gray-800 border rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
                              value={fila[col] || ""}
                              onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            />
                          )}
                          
                          {/* Indicador de campo obligatorio */}
                          {esObligatorio && (
                            <span className="absolute -top-1 -right-1 text-yellow-400 text-xs" title="Campo obligatorio">
                              *
                            </span>
                          )}
                          
                          {/* Tooltip de error */}
                          {tieneError && (
                            <div className="absolute top-full left-0 mt-1 p-2 bg-red-800 text-red-200 text-xs rounded shadow-lg z-50 whitespace-nowrap">
                              {tieneError}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => eliminarFila(idx)}
                        className="text-red-400 hover:text-red-300"
                        title="Eliminar fila"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columnas.length + 2} className="px-3 py-4 text-center text-gray-400 border border-gray-600">
                      No hay datos para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            onClick={() => {
              const nueva = Object.fromEntries(columnas.map(c => [c, ""]));
              nueva["EUROSKIN"] = "false";
              nueva["CAPTURA_CC"] = "EN PROCESO"; // Valor por defecto
              // Obtener año y mes actual en nombre
              const fechaActual = new Date();
              const anioActual = fechaActual.getFullYear().toString();
              const meses = [
                "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
              ];
              const mesActualNombre = meses[fechaActual.getMonth()];
              nueva["AÑO"] = anioActual;
              nueva["MES_PETICION"] = mesActualNombre;
              setFilas([...filas, nueva]);
            }}
          >
            + Agregar fila
          </button>
          <div className="text-sm text-gray-400">
            {filas.filter(f => Object.values(f).some(v => v && v.toString().trim() !== "")).length} filas con datos
          </div>
        </div>

        {/* Modal de selección de cliente */}
        {modalSeleccionCliente.visible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Seleccionar Cliente
                </h2>
                <button
                  onClick={cerrarModalSeleccion}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Se encontraron {modalSeleccionCliente.clientes.length} clientes</strong> que coinciden con los criterios de búsqueda.
                  {modalSeleccionCliente.tipoCoincidencia === "fecha_monto" && (
                    <span className="block mt-2">
                      <strong>Nota:</strong> No se encontraron coincidencias exactas con la tarjeta terminada en 
                      <span className="font-mono bg-yellow-100 px-1 rounded">{modalSeleccionCliente.terminacionBuscada}</span>, 
                      por lo que se muestran todos los clientes que coinciden con la fecha y monto.
                    </span>
                  )}
                  {modalSeleccionCliente.tipoCoincidencia === "misma_tarjeta" && (
                    <span className="block mt-2">
                      <strong>Nota:</strong> Múltiples clientes encontrados con la misma tarjeta y fecha/monto.
                    </span>
                  )}
                  <span className="block mt-2 font-semibold">
                    Selecciona el cliente correcto:
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                {modalSeleccionCliente.clientes.map((cliente, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => seleccionarCliente(cliente)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="font-semibold text-gray-700">Cliente:</span>
                        <p className="text-gray-900">{cliente.nombre_completo || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Sucursal:</span>
                        <p className="text-gray-900">{cliente.sucursal || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Bloque:</span>
                        <p className="text-gray-900">{cliente.bloque || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Tarjeta:</span>
                        <div className="flex items-center space-x-2">
                          <p className="text-gray-900">****{cliente.terminacion_real || cliente.terminacion_tarjeta || 'N/A'}</p>
                          {modalSeleccionCliente.terminacionBuscada && 
                           cliente.terminacion_real && 
                           cliente.terminacion_real !== modalSeleccionCliente.terminacionBuscada && (
                            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                              Buscada: ****{modalSeleccionCliente.terminacionBuscada}
                            </span>
                          )}
                          {modalSeleccionCliente.terminacionBuscada && 
                           cliente.terminacion_real && 
                           cliente.terminacion_real === modalSeleccionCliente.terminacionBuscada && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              ✓ Coincide
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Fecha:</span>
                        <p className="text-gray-900">{cliente.fecha_venta || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Monto:</span>
                        <p className="text-gray-900">₡{cliente.monto ? parseFloat(cliente.monto).toLocaleString() : 'N/A'}</p>
                      </div>
                      {cliente.es_euroskin && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Cliente Euroskin
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={cerrarModalSeleccion}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
