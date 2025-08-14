import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../scrollbar-styles.css";

// Componente CeldaGrid - Excel-style Grid v4.0 - Selección primero, edición después
const CeldaGrid = React.memo(({ 
  filaIdx, 
  columna, 
  valor, 
  onChange, 
  onCellClick, 
  onCellMouseEnter,
  esSeleccionada, 
  esRangoSeleccionado,
  obtenerBordesRango, // Nueva prop para bordes de rango
  esObligatorio,
  tieneError,
  tipo = 'text',
  opciones = null,
  placeholder = ""
}) => {
  const [editando, setEditando] = useState(false);
  const inputRef = useRef(null);
  const selectRef = useRef(null);
  const celdaRef = useRef(null);

  const manejarClick = useCallback((e) => {
    e.stopPropagation();
    onCellClick(filaIdx, columna, e);
    // NO activar edición inmediatamente, solo seleccionar
  }, [filaIdx, columna, onCellClick]);

  const manejarMouseDown = useCallback((e) => {
    // Solo procesar botón izquierdo y NO en elementos de formulario
    if (e.button === 0 && e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') {
      e.preventDefault(); // Prevenir selección de texto
      
      // Seleccionar celda E iniciar arrastre inmediatamente
      onCellClick(filaIdx, columna, { 
        ...e, 
        type: 'mousedown' // Marcar como mousedown para iniciar arrastre
      });
    }
  }, [filaIdx, columna, onCellClick]);

  const manejarDobleClick = useCallback((e) => {
    e.stopPropagation();
    if (!opciones) { // Solo para campos de texto, no para dropdowns
      setEditando(true);
    }
  }, [opciones]);

  const manejarMouseEnter = useCallback((e) => {
    // Manejar tanto Shift+hover como arrastre
    onCellMouseEnter(filaIdx, columna, e);
  }, [filaIdx, columna, onCellMouseEnter]);

  const finalizarEdicion = useCallback(() => {
    setEditando(false);
  }, []);

  const manejarKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      finalizarEdicion();
    } else if (e.key === 'Escape') {
      if (inputRef.current) {
        inputRef.current.value = valor || '';
      }
      finalizarEdicion();
    }
  }, [valor, finalizarEdicion]);

  const manejarChange = useCallback((nuevoValor) => {
    onChange(nuevoValor);
  }, [onChange]);

  // Activar edición cuando se selecciona y se empieza a escribir
  useEffect(() => {
    if (esSeleccionada && !editando) {
      const manejarTeclaParaEditar = (e) => {
        // Solo si el evento viene de esta celda específica
        if (document.activeElement === celdaRef.current || !document.activeElement || document.activeElement === document.body) {
          const char = e.key;
          if (char.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !opciones) {
            e.preventDefault();
            setEditando(true);
            // Establecer el valor inicial al carácter presionado
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.value = char;
                inputRef.current.focus();
                onChange(char);
              }
            }, 0);
          } else if ((e.key === 'F2' || e.key === 'Enter') && !opciones) {
            e.preventDefault();
            setEditando(true);
          }
        }
      };

      document.addEventListener('keydown', manejarTeclaParaEditar);
      return () => document.removeEventListener('keydown', manejarTeclaParaEditar);
    }
  }, [esSeleccionada, editando, onChange, opciones]);

  // Auto-focus cuando entra en modo edición
  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);

  const estiloError = tieneError ? "border-red-500 bg-red-900/20" : "border-gray-600";
  const estiloObligatorio = esObligatorio ? "border-yellow-500/50" : "";
  const estiloSeleccion = esSeleccionada ? "ring-2 ring-blue-400 bg-blue-900/30 border-blue-400" : "";
  
  // Nuevo sistema: fondo sutil para rango + bordes específicos estilo Excel
  const estiloRangoFondo = esRangoSeleccionado && !esSeleccionada ? "bg-blue-500/15" : "";
  const bordesRango = obtenerBordesRango ? obtenerBordesRango(filaIdx, columna) : "";
  
  // Cursor para selección como Excel
  const cursorStyle = editando ? 'text' : 'cell';

  const manejarClickDropdown = useCallback((e) => {
    // Para dropdowns, solo seleccionar la celda sin interferir con el dropdown
    onCellClick(filaIdx, columna, e);
  }, [filaIdx, columna, onCellClick]);

  // Para campos con opciones (dropdowns) - manejo especial para no interferir
  if (opciones) {
    return (
      <div 
        ref={celdaRef}
        tabIndex={0}
        className={`relative w-full h-full ${estiloSeleccion} ${estiloRangoFondo} ${bordesRango}`}
        onMouseEnter={manejarMouseEnter}
        onClick={manejarClickDropdown}
        style={{ 
          height: '28px',
          outline: 'none',
          cursor: 'default'
        }}
      >
        <select
          ref={selectRef}
          className={`w-full h-full bg-gray-800 border-0 text-gray-200 px-1 py-0 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${estiloError} ${estiloObligatorio}`}
          value={valor || ""}
          onChange={(e) => manejarChange(e.target.value)}
          style={{ height: '28px', fontSize: '11px' }}
        >
          <option value="">Selecciona...</option>
          {opciones.map((opt, index) => (
            <option key={`${opt}-${index}`} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  // Para campos de fecha - mostrar calendar picker inmediatamente al hacer clic
  if (tipo === 'date') {
    return (
      <div 
        ref={celdaRef}
        tabIndex={0}
        className={`relative w-full h-full ${estiloSeleccion} ${estiloRangoFondo} ${bordesRango}`}
        onMouseEnter={manejarMouseEnter}
        onClick={manejarClickDropdown}
        style={{ 
          height: '28px',
          outline: 'none',
          cursor: 'default'
        }}
      >
        <input
          ref={inputRef}
          type="date"
          className={`w-full h-full bg-gray-800 border-0 text-gray-200 px-1 py-0 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${estiloError} ${estiloObligatorio}`}
          value={valor || ""}
          onChange={(e) => manejarChange(e.target.value)}
          style={{ height: '28px', fontSize: '11px' }}
        />
      </div>
    );
  }

  // Para campos de texto - mostrar valor o input según estado
  return (
    <div 
      ref={celdaRef}
      tabIndex={0}
      className={`relative w-full h-full cursor-pointer ${estiloSeleccion} ${estiloRangoFondo} ${bordesRango} ${editando ? 'z-50' : bordesRango ? 'z-10' : ''}`}
      onClick={manejarClick}
      onMouseDown={manejarMouseDown}
      onDoubleClick={manejarDobleClick}
      onMouseEnter={manejarMouseEnter}
      style={{ 
        outline: 'none',
        cursor: cursorStyle
      }}
    >
      {editando ? (
        <input
          ref={inputRef}
          type={tipo}
          step={tipo === 'number' ? '0.01' : undefined}
          className={`w-full h-full bg-gray-800 border-0 text-gray-200 px-1 py-0 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${estiloError} ${estiloObligatorio}`}
          defaultValue={valor || ''}
          onChange={(e) => manejarChange(e.target.value)}
          onBlur={finalizarEdicion}
          onKeyDown={manejarKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          style={{ 
            minHeight: '28px',
            fontSize: '11px',
            textOverflow: 'clip' // No truncar en modo edición
          }}
        />
      ) : (
        <div 
          className={`w-full h-full px-1 py-0 bg-gray-800 border-0 text-gray-200 flex items-center ${estiloError} ${estiloObligatorio}`}
          title={valor || placeholder} // Tooltip para ver el contenido completo
        >
          <span className="truncate text-xs" style={{ fontSize: '11px' }}>
            {valor || <span className="text-gray-500">{placeholder}</span>}
          </span>
        </div>
      )}
    </div>
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
  const [debeOrdenar, setDebeOrdenar] = useState(false);
  const [busquedaEnProgreso, setBusquedaEnProgreso] = useState(false);

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

  // Función para ordenar filas por BLOQUE y CLIENTE
  const ordenarFilasPorBloqueYCliente = useCallback(() => {
    console.log('🚀 Iniciando función ordenarFilasPorBloqueYCliente...');
    setFilas(prev => {
      console.log(`📝 Filas antes del ordenamiento: ${prev.length}`);
      
      const filasOrdenadas = [...prev].sort((a, b) => {
        // Primero ordenar por BLOQUE
        const bloqueA = a.BLOQUE || '';
        const bloqueB = b.BLOQUE || '';
        
        if (bloqueA !== bloqueB) {
          // Orden específico para bloques: SIN2, SIN3, SIN4, etc.
          const ordenBloque = ['SIN2', 'SIN3', 'SIN4', 'SIN5', 'SIN6'];
          const indexA = ordenBloque.indexOf(bloqueA);
          const indexB = ordenBloque.indexOf(bloqueB);
          
          // Si ambos están en la lista de orden específico
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // Si solo uno está en la lista, ese va primero
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          // Si ninguno está en la lista, orden alfabético
          return bloqueA.localeCompare(bloqueB);
        }
        
        // Si tienen el mismo bloque, ordenar por CLIENTE alfabéticamente
        const clienteA = (a.CLIENTE || a.NOMBRE_DEL_COMERCIO || '').toLowerCase();
        const clienteB = (b.CLIENTE || b.NOMBRE_DEL_COMERCIO || '').toLowerCase();
        return clienteA.localeCompare(clienteB);
      });
      
      console.log('📋 Filas reordenadas por bloque y cliente después de búsqueda automática');
      console.log(`📊 Resultado: ${filasOrdenadas.length} filas ordenadas`);
      
      // Mostrar primeras 3 filas para verificar el orden
      if (filasOrdenadas.length > 0) {
        console.log('🔍 Primeras filas después del ordenamiento:');
        filasOrdenadas.slice(0, 3).forEach((fila, idx) => {
          console.log(`  ${idx + 1}. BLOQUE: ${fila.BLOQUE || 'N/A'}, CLIENTE: ${fila.CLIENTE || fila.NOMBRE_DEL_COMERCIO || 'N/A'}`);
        });
      }
      
      return filasOrdenadas;
    });
  }, []);

  // UseEffect para detectar cuando se completan las búsquedas automáticas y activar ordenamiento
  useEffect(() => {
    // Solo ejecutar cuando hay filas con BLOQUE (que significa que se hizo la búsqueda automática)
    const filasConBloque = filas.filter(fila => fila.BLOQUE && fila.BLOQUE.trim() !== '');
    
    if (filasConBloque.length > 0 && !busquedaEnProgreso) {
      console.log(`🎯 Detectadas ${filasConBloque.length} filas con BLOQUE, activando ordenamiento automático...`);
      setTimeout(() => {
        setDebeOrdenar(true);
      }, 1000);
    }
  }, [filas, busquedaEnProgreso]);

  // UseEffect separado para manejar el ordenamiento cuando se indica
  useEffect(() => {
    console.log(`🎯 UseEffect ordenamiento - debeOrdenar: ${debeOrdenar}`);
    if (debeOrdenar) {
      console.log('🔄 Ejecutando ordenamiento por bloque y cliente...');
      ordenarFilasPorBloqueYCliente();
      setDebeOrdenar(false); // Reset del flag
      console.log('✅ Flag debeOrdenar reseteado');
    }
  }, [debeOrdenar, ordenarFilasPorBloqueYCliente]);

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
        
        console.log(`✅ Búsqueda automática completada para ${filasParaProcesar.length} filas`);
        
      } catch (error) {
        console.error('❌ Error en búsqueda automática general:', error);
      }
    };

    // Ejecutar búsqueda automática con un delay más largo para evitar múltiples ejecuciones
    const timeoutId = setTimeout(buscarClientesAutomaticamente, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [filas, busquedaAutomaticaHabilitada, ordenarFilasPorBloqueYCliente]); // Se ejecuta cuando cambian las filas o la configuración - removí filasYaProcesadas para evitar bucles

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
      // Selección de rango con Shift - expandir desde la celda original
      if (!rangoSeleccionado) {
        // Crear nuevo rango desde la celda seleccionada actual
        setRangoSeleccionado({
          inicio: celdaSeleccionada,
          fin: { fila, columna }
        });
      } else {
        // Expandir rango existente manteniendo el punto de inicio original
        setRangoSeleccionado({
          inicio: rangoSeleccionado.inicio,
          fin: { fila, columna }
        });
      }
      // Actualizar la celda seleccionada actual
      setCeldaSeleccionada({ fila, columna });
    } else {
      // Selección individual - limpiar rango y preparar para arrastre
      setCeldaSeleccionada({ fila, columna });
      setRangoSeleccionado(null);
      
      // Solo iniciar arrastre en mousedown, pero NO si es desde un elemento de formulario
      if (event.type === 'mousedown' && event.target && 
          event.target.tagName !== 'SELECT' && 
          event.target.tagName !== 'INPUT') {
        setInicioArrastre({ fila, columna });
        setArrastrando(true);
      }
    }
    setEscritura('');
  }, [celdaSeleccionada, rangoSeleccionado]);

  const expandirSeleccion = useCallback((fila, columna, event) => {
    if (arrastrando && inicioArrastre) {
      // Arrastre con mouse - crear/actualizar rango
      const nuevoRango = {
        inicio: inicioArrastre,
        fin: { fila, columna }
      };
      setRangoSeleccionado(nuevoRango);
      setCeldaSeleccionada({ fila, columna });
    } else if (event && event.shiftKey && celdaSeleccionada) {
      // Expandir selección mientras se mantiene Shift presionado
      if (!rangoSeleccionado) {
        setRangoSeleccionado({
          inicio: celdaSeleccionada,
          fin: { fila, columna }
        });
      } else {
        setRangoSeleccionado({
          inicio: rangoSeleccionado.inicio,
          fin: { fila, columna }
        });
      }
    }
  }, [celdaSeleccionada, rangoSeleccionado, arrastrando, inicioArrastre]);

  // Función para verificar si una celda está seleccionada
  const esCeldaSeleccionada = useCallback((fila, columna) => {
    return celdaSeleccionada && 
           celdaSeleccionada.fila === fila && 
           celdaSeleccionada.columna === columna;
  }, [celdaSeleccionada]);

  // Función para verificar si una celda está en el rango seleccionado
  const esCeldaEnRango = useCallback((fila, columna) => {
    if (!rangoSeleccionado) {
      return false;
    }
    
    const { inicio, fin } = rangoSeleccionado;
    const filaInicio = Math.min(inicio.fila, fin.fila);
    const filaFin = Math.max(inicio.fila, fin.fila);
    
    const colIndiceInicio = Math.min(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
    const colIndiceFin = Math.max(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
    const colIndiceActual = columnas.indexOf(columna);
    
    const enRango = fila >= filaInicio && 
           fila <= filaFin && 
           colIndiceActual >= colIndiceInicio && 
           colIndiceActual <= colIndiceFin;
    
    return enRango;
  }, [rangoSeleccionado, columnas]);

  // Función para obtener los bordes del rango (estilo Excel) - usando outline para mejor visibilidad
  const obtenerBordesRango = useCallback((fila, columna) => {
    if (!rangoSeleccionado) return '';
    
    const { inicio, fin } = rangoSeleccionado;
    const filaInicio = Math.min(inicio.fila, fin.fila);
    const filaFin = Math.max(inicio.fila, fin.fila);
    
    const colIndiceInicio = Math.min(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
    const colIndiceFin = Math.max(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
    const colIndiceActual = columnas.indexOf(columna);
    
    const enRango = fila >= filaInicio && 
           fila <= filaFin && 
           colIndiceActual >= colIndiceInicio && 
           colIndiceActual <= colIndiceFin;
    
    if (!enRango) return '';
    
    // Para celdas individuales (selección de una sola celda), usar outline para contorno completo
    if (filaInicio === filaFin && colIndiceInicio === colIndiceFin) {
      return 'outline outline-4 outline-blue-400 outline-offset-[-4px]';
    }
    
    // Para rangos múltiples, determinar qué bordes necesita esta celda
    let bordes = [];
    
    if (fila === filaInicio) bordes.push('border-t-4 border-t-blue-400');
    if (fila === filaFin) bordes.push('border-b-4 border-b-blue-400');
    if (colIndiceActual === colIndiceInicio) bordes.push('border-l-4 border-l-blue-400');
    if (colIndiceActual === colIndiceFin) bordes.push('border-r-4 border-r-blue-400');
    
    return bordes.join(' ');
  }, [rangoSeleccionado, columnas]);

  // Función mejorada para copy/paste
  const manejarCopyPaste = useCallback((event) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'c' || event.key === 'C') {
        // Copiar
        event.preventDefault();
        if (celdaSeleccionada || rangoSeleccionado) {
          let datosCopia = [];
          
          if (rangoSeleccionado) {
            const { inicio, fin } = rangoSeleccionado;
            const filaInicio = Math.min(inicio.fila, fin.fila);
            const filaFin = Math.max(inicio.fila, fin.fila);
            const colInicio = Math.min(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
            const colFin = Math.max(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
            
            for (let f = filaInicio; f <= filaFin; f++) {
              const filaCopia = [];
              for (let c = colInicio; c <= colFin; c++) {
                filaCopia.push(filas[f]?.[columnas[c]] || '');
              }
              datosCopia.push(filaCopia);
            }
          } else if (celdaSeleccionada) {
            datosCopia = [[filas[celdaSeleccionada.fila]?.[celdaSeleccionada.columna] || '']];
          }
          
          setDatosPortapapeles(datosCopia);
          
          // También copiar al portapapeles del sistema
          const textoParaPortapapeles = datosCopia.map(fila => fila.join('\t')).join('\n');
          if (navigator.clipboard) {
            navigator.clipboard.writeText(textoParaPortapapeles);
          }
        }
      } else if (event.key === 'v' || event.key === 'V') {
        // Pegar
        event.preventDefault();
        if (datosPortapapeles && celdaSeleccionada) {
          const filaInicio = celdaSeleccionada.fila;
          const colInicio = columnas.indexOf(celdaSeleccionada.columna);
          
          setFilas(prev => {
            const nuevasFilas = [...prev];
            
            datosPortapapeles.forEach((filaCopia, offsetFila) => {
              const filaDestino = filaInicio + offsetFila;
              if (filaDestino < nuevasFilas.length) {
                filaCopia.forEach((valor, offsetCol) => {
                  const colDestino = colInicio + offsetCol;
                  if (colDestino < columnas.length) {
                    const columnaDestino = columnas[colDestino];
                    nuevasFilas[filaDestino] = {
                      ...nuevasFilas[filaDestino],
                      [columnaDestino]: valor
                    };
                  }
                });
              }
            });
            
            return nuevasFilas;
          });
        }
      }
    }
  }, [celdaSeleccionada, rangoSeleccionado, datosPortapapeles, filas, columnas]);

  // Navegación por teclado como Excel con Ctrl+Flechas y Shift
  const navegarPorTeclado = useCallback((event) => {
    if (!celdaSeleccionada) return;
    
    // No navegar si estamos editando una celda de texto
    const elementoActivo = document.activeElement;
    const esInputEditando = elementoActivo && elementoActivo.tagName === 'INPUT';
    
    if (esInputEditando) return;
    
    let nuevaCelda = null;
    const filaActual = celdaSeleccionada.fila;
    const columnaActual = celdaSeleccionada.columna;
    const indiceColumnaActual = columnas.indexOf(columnaActual);
    
    const esCtrl = event.ctrlKey;
    const esShift = event.shiftKey;
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (esCtrl) {
          // Ctrl+Arriba: ir a la primera fila
          nuevaCelda = { fila: 0, columna: columnaActual };
        } else if (filaActual > 0) {
          nuevaCelda = { fila: filaActual - 1, columna: columnaActual };
        }
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        if (esCtrl) {
          // Ctrl+Abajo: ir a la última fila con datos
          nuevaCelda = { fila: filas.length - 1, columna: columnaActual };
        } else if (filaActual < filas.length - 1) {
          nuevaCelda = { fila: filaActual + 1, columna: columnaActual };
        }
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        if (esCtrl) {
          // Ctrl+Izquierda: ir a la primera columna
          nuevaCelda = { fila: filaActual, columna: columnas[0] };
        } else if (indiceColumnaActual > 0) {
          nuevaCelda = { fila: filaActual, columna: columnas[indiceColumnaActual - 1] };
        }
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        if (esCtrl) {
          // Ctrl+Derecha: ir a la última columna
          nuevaCelda = { fila: filaActual, columna: columnas[columnas.length - 1] };
        } else if (indiceColumnaActual < columnas.length - 1) {
          nuevaCelda = { fila: filaActual, columna: columnas[indiceColumnaActual + 1] };
        }
        break;
        
      case 'Tab':
        event.preventDefault();
        if (indiceColumnaActual < columnas.length - 1) {
          nuevaCelda = { fila: filaActual, columna: columnas[indiceColumnaActual + 1] };
        } else if (filaActual < filas.length - 1) {
          // Si estamos en la última columna, ir a la primera columna de la siguiente fila
          nuevaCelda = { fila: filaActual + 1, columna: columnas[0] };
        }
        break;
        
      case 'Enter':
        event.preventDefault();
        if (filaActual < filas.length - 1) {
          nuevaCelda = { fila: filaActual + 1, columna: columnaActual };
        }
        break;
        
      case 'Home':
        event.preventDefault();
        if (esCtrl) {
          // Ctrl+Home: ir a la primera celda (0,0)
          nuevaCelda = { fila: 0, columna: columnas[0] };
        } else {
          // Home: ir al inicio de la fila actual
          nuevaCelda = { fila: filaActual, columna: columnas[0] };
        }
        break;
        
      case 'End':
        event.preventDefault();
        if (esCtrl) {
          // Ctrl+End: ir a la última celda con datos
          nuevaCelda = { fila: filas.length - 1, columna: columnas[columnas.length - 1] };
        } else {
          // End: ir al final de la fila actual
          nuevaCelda = { fila: filaActual, columna: columnas[columnas.length - 1] };
        }
        break;
    }
    
    if (nuevaCelda) {
      if (esShift && celdaSeleccionada) {
        // Shift: Expandir o crear selección de rango
        if (!rangoSeleccionado) {
          // Crear nuevo rango desde la celda actual
          setRangoSeleccionado({
            inicio: celdaSeleccionada,
            fin: nuevaCelda
          });
        } else {
          // Expandir rango existente
          setRangoSeleccionado({
            inicio: rangoSeleccionado.inicio, // Mantener el punto de inicio original
            fin: nuevaCelda
          });
        }
        // También actualizar la celda seleccionada
        setCeldaSeleccionada(nuevaCelda);
      } else {
        // Sin Shift: Mover selección simple
        setCeldaSeleccionada(nuevaCelda);
        setRangoSeleccionado(null);
      }
      setEscritura('');
    }
  }, [celdaSeleccionada, rangoSeleccionado, columnas, filas.length]);

  const manejarEscritura = useCallback((event) => {
    if (!celdaSeleccionada) return;
    
    // No manejar escritura si estamos en un input activo o dropdown
    const elementoActivo = document.activeElement;
    const esInputActivo = elementoActivo && (
      elementoActivo.tagName === 'INPUT' || 
      elementoActivo.tagName === 'SELECT' || 
      elementoActivo.tagName === 'TEXTAREA'
    );
    
    if (esInputActivo) return;
    
    const char = event.key;
    
    // Permitir solo caracteres imprimibles y algunos especiales
    if (char.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // La escritura se maneja dentro del componente CeldaGrid ahora
      return;
    }
  }, [celdaSeleccionada]);

  const finalizarSeleccion = useCallback((event) => {
    if (!celdaSeleccionada) return;
    
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      
      if (rangoSeleccionado) {
        // Limpiar rango múltiple
        const { inicio, fin } = rangoSeleccionado;
        const filaInicio = Math.min(inicio.fila, fin.fila);
        const filaFin = Math.max(inicio.fila, fin.fila);
        const colIndiceInicio = Math.min(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
        const colIndiceFin = Math.max(columnas.indexOf(inicio.columna), columnas.indexOf(fin.columna));
        
        setFilas(prev => prev.map((fila, filaIdx) => {
          if (filaIdx >= filaInicio && filaIdx <= filaFin) {
            const nuevaFila = { ...fila };
            for (let c = colIndiceInicio; c <= colIndiceFin; c++) {
              nuevaFila[columnas[c]] = '';
            }
            return nuevaFila;
          }
          return fila;
        }));
        
        console.log(`🗑️ Limpiando rango: filas ${filaInicio}-${filaFin}, columnas ${colIndiceInicio}-${colIndiceFin}`);
      } else {
        // Limpiar celda individual
        handleCellChange(celdaSeleccionada.fila, celdaSeleccionada.columna, '');
        console.log(`🗑️ Limpiando celda: ${celdaSeleccionada.fila}-${celdaSeleccionada.columna}`);
      }
      
      setEscritura('');
    } else if (event.key === 'Escape') {
      // Escape cancela la selección de rango
      setRangoSeleccionado(null);
      setEscritura('');
    }
  }, [celdaSeleccionada, rangoSeleccionado, handleCellChange, columnas]);

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
      // Solo manejar eventos si no estamos escribiendo en un input/select activo
      const elementoActivo = document.activeElement;
      const esElementoFormulario = elementoActivo && (
        elementoActivo.tagName === 'INPUT' || 
        elementoActivo.tagName === 'SELECT' || 
        elementoActivo.tagName === 'TEXTAREA'
      );
      
      // Permitir navegación global siempre, pero copy/paste y escritura solo cuando no hay elemento activo
      navegarPorTeclado(event);
      
      if (!esElementoFormulario) {
        copiarSeleccion(event);
        pegarSeleccion(event);
        copiarSeleccion(event);
        pegarSeleccion(event);
        manejarCopyPaste(event);
        manejarEscritura(event);
        finalizarSeleccion(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navegarPorTeclado, copiarSeleccion, pegarSeleccion, manejarCopyPaste, manejarEscritura, finalizarSeleccion]);

  // Event listeners para manejo de arrastre con mouse
  useEffect(() => {
    const handleMouseUp = () => {
      if (arrastrando) {
        setArrastrando(false);
        setInicioArrastre(null);
      }
    };

    const handleMouseLeave = () => {
      // Finalizar arrastre si el mouse sale de la ventana
      if (arrastrando) {
        setArrastrando(false);
        setInicioArrastre(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [arrastrando]);

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
          // Si hay múltiples clientes, verificar si alguno coincide exactamente por nombre
          console.log('🔔 Múltiples clientes encontrados:', clientes);
          
          // Verificar si todos los clientes tienen el mismo nombre (duplicados del mismo cliente)
          const nombresUnicos = [...new Set(clientes.map(c => c.nombre_completo.trim().toLowerCase()))];
          if (nombresUnicos.length === 1) {
            // Todos los clientes tienen el mismo nombre, seleccionar automáticamente el primero
            const clienteSeleccionado = clientes[0];
            console.log('✅ Todos los clientes tienen el mismo nombre, seleccionando automáticamente:', clienteSeleccionado);
            
            const filaEnriquecida = {
              ...filaData,
              CLIENTE: clienteSeleccionado.nombre_completo || filaData.CLIENTE,
              SUCURSAL: clienteSeleccionado.sucursal || filaData.SUCURSAL,
              BLOQUE: clienteSeleccionado.bloque || filaData.BLOQUE,
              EUROSKIN: clienteSeleccionado.es_euroskin ? "true" : "false"
            };

            console.log('📋 Fila enriquecida con cliente de mismo nombre:', filaEnriquecida);
            return filaEnriquecida;
          }
          
          // Buscar coincidencia exacta por nombre del cliente (si está disponible en la fila)
          let clienteExacto = null;
          if (filaData.CLIENTE || filaData.NOMBRE_DEL_COMERCIO) {
            const nombreBuscado = (filaData.CLIENTE || filaData.NOMBRE_DEL_COMERCIO).trim().toLowerCase();
            clienteExacto = clientes.find(cliente => 
              cliente.nombre_completo.trim().toLowerCase() === nombreBuscado
            );
            
            if (clienteExacto) {
              console.log('✅ Cliente con nombre exacto encontrado automáticamente:', clienteExacto);
              // Usar el cliente con coincidencia exacta
              const filaEnriquecida = {
                ...filaData,
                CLIENTE: clienteExacto.nombre_completo || filaData.CLIENTE,
                SUCURSAL: clienteExacto.sucursal || filaData.SUCURSAL,
                BLOQUE: clienteExacto.bloque || filaData.BLOQUE,
                EUROSKIN: clienteExacto.es_euroskin ? "true" : "false"
              };

              console.log('📋 Fila enriquecida con cliente exacto:', filaEnriquecida);
              return filaEnriquecida;
            }
          }
          
          // Si no hay coincidencia exacta por nombre, mostrar modal para selección
          console.log('🔔 No hay coincidencia exacta por nombre, mostrando modal para selección');
          
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
    console.log('🔍 Iniciando pegado de datos...');
    
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
    console.log('📋 Datos pegados:', paste);
    if (!paste) {
      console.log('❌ No hay datos para pegar');
      return;
    }
    const rows = paste.split(/\r?\n/).filter(row => row.trim());
    console.log('📊 Filas detectadas:', rows.length, rows);

    // Detectar formato CREDOMATIC (formato específico con "DATOS DE LA TRANSACCIÓN")
    if (paste.includes("DATOS DE LA TRANSACCIÓN") || paste.includes("No. caso:") || paste.includes("Afiliado Pagador:")) {
      console.log('🏪 Formato CREDOMATIC detectado');
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
      const encabezadosClaveEFEVOO = ["ID", "Cliente", "Monto", "Fecha", "Tarjeta"];
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
            console.log('🔍 Iniciando búsqueda automática para', newRows.length, 'filas EFEVOO');
            const filasEnriquecidas = [];
            for (const fila of newRows) {
              const filaEnriquecida = await buscarClienteAutomatico(fila);
              filasEnriquecidas.push(filaEnriquecida);
            }

            console.log('✅ Todas las filas procesadas:', filasEnriquecidas);

            // Actualizar las filas de manera simple
            setFilas(prev => {
              console.log('🔄 Actualizando estado con filas EFEVOO:', filasEnriquecidas.length);
              // Si todas las filas actuales están vacías, reemplazarlas
              const todasVacias = prev.every(fila => {
                const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                  if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                  if (key === "CAPTURA_CC" && value === "EN PROCESO") return false;
                  if (key === "AÑO") return false;
                  if (key === "MES_PETICION") return false;
                  return value !== "" && value !== null && value !== undefined;
                });
                return valoresConDatos.length === 0;
              });
              
              if (todasVacias) {
                console.log('✅ Reemplazando todas las filas vacías');
                return filasEnriquecidas;
              } else {
                console.log('✅ Agregando al principio de filas existentes');
                return [...filasEnriquecidas, ...prev];
              }
            });
            
            setMensaje(`✅ Se pegaron ${newRows.length} filas EFEVOO (horizontal) y se buscaron los clientes automáticamente`);
          } catch (error) {
            console.error('❌ Error en búsqueda automática masiva:', error);
            // Si falla la búsqueda automática, insertar sin enriquecer
            setFilas(prev => [...newRows, ...prev]);
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
        console.log('✅ Filas procesadas:', newRows.length, newRows);
        
        // Ordenar las nuevas filas por BLOQUE y luego por CLIENTE alfabéticamente
        const filasOrdenadas = newRows.sort((a, b) => {
          // Primero ordenar por BLOQUE
          const bloqueA = a.BLOQUE || '';
          const bloqueB = b.BLOQUE || '';
          
          if (bloqueA !== bloqueB) {
            // Orden específico para bloques: SIN2, SIN3, SIN4, etc.
            const ordenBloque = ['SIN2', 'SIN3', 'SIN4', 'SIN5', 'SIN6'];
            const indexA = ordenBloque.indexOf(bloqueA);
            const indexB = ordenBloque.indexOf(bloqueB);
            
            // Si ambos están en la lista de orden específico
            if (indexA !== -1 && indexB !== -1) {
              return indexA - indexB;
            }
            // Si solo uno está en la lista, ese va primero
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            // Si ninguno está en la lista, orden alfabético
            return bloqueA.localeCompare(bloqueB);
          }
          
          // Si tienen el mismo bloque, ordenar por CLIENTE alfabéticamente
          const clienteA = (a.CLIENTE || a.NOMBRE_DEL_COMERCIO || '').toLowerCase();
          const clienteB = (b.CLIENTE || b.NOMBRE_DEL_COMERCIO || '').toLowerCase();
          return clienteA.localeCompare(clienteB);
        });
        console.log('📋 Filas ordenadas por bloque y cliente:', filasOrdenadas);
        
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
            return filasOrdenadas;
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
          
          if (filasOrdenadas.length <= filasVacias) {
            // Si hay suficientes filas vacías, llenarlas
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < filasOrdenadas.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = filasOrdenadas[contadorLlenado];
                contadorLlenado++;
              }
            }
            return nuevasFilas;
          } else {
            // Si no hay suficientes filas vacías, llenar las existentes y agregar el resto al principio
            const nuevasFilas = [...prev];
            let contadorLlenado = 0;
            
            // Llenar las filas vacías existentes
            for (let i = 0; i < nuevasFilas.length && contadorLlenado < filasOrdenadas.length; i++) {
              const fila = nuevasFilas[i];
              const valoresConDatos = Object.entries(fila).filter(([key, value]) => {
                if (key === "EUROSKIN" && (value === "false" || value === "")) return false;
                if (key === "AÑO") return false;
                if (key === "MES_PETICION") return false;
                return value !== "" && value !== null && value !== undefined;
              });
              if (valoresConDatos.length === 0) {
                nuevasFilas[i] = filasOrdenadas[contadorLlenado];
                contadorLlenado++;
              }
            }
            
            // Agregar las filas restantes al principio
            const filasRestantes = filasOrdenadas.slice(contadorLlenado);
            return [...filasRestantes, ...nuevasFilas];
          }
        });
        setMensaje(`✅ Se pegaron ${filasOrdenadas.length} filas y se mapearon los encabezados: ${mapeoDetectado.join(', ')} (ordenadas por bloque y cliente)`);
        setTimeout(() => setMensaje(""), 4000);
        e.target.value = "";
        return;
      }
    
    console.log('❌ No se detectaron encabezados válidos');
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
              onClick={() => {
                console.log('🎯 Botón manual de ordenamiento presionado');
                ordenarFilasPorBloqueYCliente();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              disabled={guardando}
              title="Ordenar manualmente por bloque y cliente"
            >
              📋 Ordenar
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

        {/* Indicadores de funcionalidad Excel */}
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-400">
          <span className="bg-gray-700 px-2 py-1 rounded">
            📋 Ctrl+C = Copiar | Ctrl+V = Pegar
          </span>
          <span className="bg-gray-700 px-2 py-1 rounded">
            🖱️ Click = Seleccionar | Arrastrar = Selección múltiple
          </span>
          <span className="bg-gray-700 px-2 py-1 rounded">
            ⌨️ Flechas = Navegar | Shift+Flechas = Expandir selección
          </span>
          <span className="bg-gray-700 px-2 py-1 rounded">
            🚀 Ctrl+Flechas = Saltar al extremo | Ctrl+Home/End = Esquinas
          </span>
          <span className="bg-gray-700 px-2 py-1 rounded">
            ✏️ Escribir directamente | 🗑️ Delete = Borrar
          </span>
        </div>

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

        <div className="bg-gray-800 rounded-lg shadow overflow-hidden mb-4" 
             style={{ paddingBottom: '8px' }}
             onMouseMove={(e) => {
               // Manejar arrastre de selección
               if (arrastrando && inicioArrastre) {
                 // Encontrar la celda más cercana al cursor
                 const element = document.elementFromPoint(e.clientX, e.clientY);
                 if (element) {
                   // Buscar el td que contiene los datos
                   const celda = element.closest('td[data-fila][data-columna]');
                   if (celda) {
                     const fila = parseInt(celda.getAttribute('data-fila'));
                     const columna = celda.getAttribute('data-columna');
                     expandirSeleccion(fila, columna, e);
                   }
                 }
               }
             }}
             onMouseUp={() => {
               if (arrastrando) {
                 setArrastrando(false);
                 setInicioArrastre(null);
               }
             }}>
          <div className="overflow-x-auto custom-scrollbar" style={{ padding: '2px' }}>
            <table className="border-collapse" style={{ width: 'auto', tableLayout: 'fixed' }}>
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-0 py-1 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-700 z-10 border border-gray-600" style={{ width: '40px', minWidth: '40px', height: '24px' }}>#</th>
                  {columnas.map(col => {
                    const esObligatorio = tiposTabla[tipoTablaSeleccionada]?.camposObligatorios.includes(col);
                    
                    // Ancho optimizado para mostrar más datos - 85px cada columna
                    const anchoColumna = "85px";
                    
                    return (
                      <th key={col} className="px-0 py-1 text-left font-medium text-gray-300 uppercase tracking-tight border border-gray-600" style={{ width: anchoColumna, minWidth: anchoColumna, height: '24px', fontSize: '10px' }}>
                        <div className="px-1 truncate" title={col.replace(/_/g, ' ')} style={{ fontSize: '10px' }}>
                          {col.replace(/_/g, ' ')}
                          {esObligatorio && (
                            <span className="text-yellow-400 ml-1" title="Campo obligatorio">*</span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-0 py-1 text-left font-medium text-gray-300 uppercase tracking-tight border border-gray-600" style={{ width: '50px', minWidth: '50px', height: '24px', fontSize: '10px' }}>
                    <div className="px-1" style={{ fontSize: '10px' }}>Acción</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800" style={{ marginBottom: '6px' }}>
                {Array.isArray(filas) ? filas.map((fila, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700`}>
                    <td className="px-0 py-0 whitespace-nowrap text-gray-300 sticky left-0 bg-inherit z-10 border border-gray-600" style={{ width: '40px', minWidth: '40px', height: '28px' }}>
                      <div className="px-1 py-0 text-center" style={{ fontSize: '10px', lineHeight: '28px' }}>{idx + 1}</div>
                    </td>
                    {columnas.map(col => {
                      const esObligatorio = tiposTabla[tipoTablaSeleccionada]?.camposObligatorios.includes(col);
                      const tieneError = erroresValidacion[`${idx}-${col}`];
                      
                      // Determinar el tipo de celda y opciones
                      let tipoCelda = 'text';
                      let opciones = null;
                      
                      if (col === 'PROCESADOR' && procesadores.length > 0) {
                        opciones = procesadores;
                      } else if (col === 'SUCURSAL' && sucursales.length > 0) {
                        opciones = sucursales;
                      } else if (col === 'BLOQUE' && bloques.length > 0) {
                        opciones = bloques;
                      } else if (col === 'VENDEDORA' && vendedoras.length > 0) {
                        opciones = vendedoras;
                      } else if (col === 'COMENTARIOS' && comentariosComunes.length > 0) {
                        opciones = comentariosComunes;
                      } else if (col === 'CAPTURA_CC' && capturaCC.length > 0) {
                        opciones = capturaCC;
                      } else if (col === 'EUROSKIN') {
                        opciones = ['true', 'false'];
                      } else if (col.includes('FECHA')) {
                        tipoCelda = 'date';
                      } else if (col === 'MONTO') {
                        tipoCelda = 'number';
                      }
                      
                      // Ancho optimizado para mostrar más datos - 85px cada columna
                      const anchoColumna = "85px";
                      
                      return (
                        <td key={`${idx}-${col}`} 
                            className="p-0 border border-gray-600 relative overflow-visible" 
                            style={{ width: anchoColumna, minWidth: anchoColumna, height: '28px' }}
                            data-fila={idx}
                            data-columna={col}>
                          <CeldaGrid
                            filaIdx={idx}
                            columna={col}
                            valor={fila[col]}
                            onChange={(valor) => handleCellChange(idx, col, valor)}
                            onCellClick={seleccionarCelda}
                            onCellMouseEnter={expandirSeleccion}
                            esSeleccionada={esCeldaSeleccionada(idx, col)}
                            esRangoSeleccionado={esCeldaEnRango(idx, col)}
                            obtenerBordesRango={obtenerBordesRango}
                            esObligatorio={esObligatorio}
                            tieneError={tieneError}
                            tipo={tipoCelda}
                            opciones={opciones}
                            placeholder={`${col.replace(/_/g, ' ').toLowerCase()}`}
                          />
                          
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
                    <td className="px-0 py-0 whitespace-nowrap text-gray-300 border border-gray-600" style={{ width: '50px', minWidth: '50px', height: '28px' }}>
                      <button
                        onClick={() => eliminarFila(idx)}
                        className="text-red-400 hover:text-red-300 text-center w-full h-full flex items-center justify-center"
                        title="Eliminar fila"
                        style={{ fontSize: '10px' }}
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
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  Seleccionar Cliente
                </h2>
                <button
                  onClick={cerrarModalSeleccion}
                  className="text-gray-400 hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-700 rounded border border-gray-600">
                <p className="text-sm text-gray-200">
                  <strong>Se encontraron {modalSeleccionCliente.clientes.length} clientes</strong> que coinciden con los criterios de búsqueda.
                  {modalSeleccionCliente.tipoCoincidencia === "fecha_monto" && (
                    <span className="block mt-2">
                      <strong>Nota:</strong> No se encontraron coincidencias exactas con la tarjeta terminada en 
                      <span className="font-mono bg-yellow-600 text-yellow-100 px-1 rounded">{modalSeleccionCliente.terminacionBuscada}</span>, 
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
                    className="border border-gray-600 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors bg-gray-750"
                    onClick={() => seleccionarCliente(cliente)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="font-semibold text-gray-300">Cliente:</span>
                        <p className="text-white">{cliente.nombre_completo || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-300">Sucursal:</span>
                        <p className="text-white">{cliente.sucursal || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-300">Bloque:</span>
                        <p className="text-white">{cliente.bloque || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-300">Tarjeta:</span>
                        <div className="flex items-center space-x-2">
                          <p className="text-white">****{cliente.terminacion_real || cliente.terminacion_tarjeta || 'N/A'}</p>
                          {modalSeleccionCliente.terminacionBuscada && 
                           cliente.terminacion_real && 
                           cliente.terminacion_real !== modalSeleccionCliente.terminacionBuscada && (
                            <span className="inline-block bg-yellow-600 text-yellow-100 text-xs px-2 py-1 rounded-full">
                              Buscada: ****{modalSeleccionCliente.terminacionBuscada}
                            </span>
                          )}
                          {modalSeleccionCliente.terminacionBuscada && 
                           cliente.terminacion_real && 
                           cliente.terminacion_real === modalSeleccionCliente.terminacionBuscada && (
                            <span className="inline-block bg-green-600 text-green-100 text-xs px-2 py-1 rounded-full">
                              ✓ Coincide
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-300">Fecha:</span>
                        <p className="text-white">{cliente.fecha_venta || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-300">Monto:</span>
                        <p className="text-white">${cliente.monto ? parseFloat(cliente.monto).toLocaleString() : 'N/A'}</p>
                      </div>
                      {cliente.es_euroskin && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <span className="inline-block bg-blue-600 text-blue-100 text-xs px-2 py-1 rounded-full">
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
                  className="px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-500 transition-colors border border-gray-500"
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
