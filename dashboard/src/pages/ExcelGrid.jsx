import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '../styles/ag-grid-custom.css';
import axios from 'axios';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Custom cell renderer para dropdowns (estilo Google Sheets)
const GoogleSheetsDropdownRenderer = React.forwardRef((props, ref) => {
  const { value, valueFormatted, api, node, colDef } = props;
  
  const handleDropdownClick = (e) => {
    e.stopPropagation();
    // Iniciar edición en la celda
    api.startEditingCell({
      rowIndex: node.rowIndex,
      colKey: colDef.field
    });
  };

  return (
    <div 
      ref={ref}
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '0 4px'
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {valueFormatted || value || ''}
      </span>
      <div 
        onClick={handleDropdownClick}
        style={{ 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          color: '#60a5fa',
          fontSize: '12px',
          fontWeight: 'bold',
          borderLeft: '1px solid #4b5563',
          marginLeft: '4px'
        }}
      >
        ▼
      </div>
    </div>
  );
});

export default function ExcelGrid() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [gridApi, setGridApi] = useState(null);
  const [columnApi, setColumnApi] = useState(null);
  const [mostrarAreaPegado, setMostrarAreaPegado] = useState(false);
  const [datosParaPegar, setDatosParaPegar] = useState("");

  // Manejar cuando se edita una celda
  const onCellValueChanged = useCallback((event) => {
    console.log('Celda editada:', {
      field: event.colDef.field,
      newValue: event.newValue,
      oldValue: event.oldValue,
      rowData: event.data
    });
    
    // Aquí puedes agregar lógica para guardar automáticamente o marcar como modificado
    setMensaje(`✏️ Editado: ${event.colDef.headerName}`);
    setTimeout(() => setMensaje(""), 2000);
  }, []);

  // Manejar double click para edición (como Google Sheets)
  const onCellDoubleClicked = useCallback((event) => {
    // Iniciar edición con doble click
    if (event.colDef.editable) {
      event.api.startEditingCell({
        rowIndex: event.rowIndex,
        colKey: event.column.colId
      });
    }
  }, []);

  // Manejar teclas para edición directa (como Google Sheets)
  const onCellKeyDown = useCallback((event) => {
    const { event: keyboardEvent, api, node, column } = event;
    
    // Si es Enter, iniciar edición
    if (keyboardEvent.key === 'Enter' && column.colDef.editable) {
      keyboardEvent.preventDefault();
      api.startEditingCell({
        rowIndex: node.rowIndex,
        colKey: column.colId
      });
      return;
    }
    
    // Si es F2, iniciar edición
    if (keyboardEvent.key === 'F2' && column.colDef.editable) {
      keyboardEvent.preventDefault();
      api.startEditingCell({
        rowIndex: node.rowIndex,
        colKey: column.colId
      });
      return;
    }
    
    // Si es una tecla imprimible y la celda es editable, iniciar edición
    if (column.colDef.editable && 
        keyboardEvent.key.length === 1 && 
        !keyboardEvent.ctrlKey && 
        !keyboardEvent.altKey &&
        !keyboardEvent.metaKey) {
      
      // Iniciar edición y pasar la tecla presionada
      api.startEditingCell({
        rowIndex: node.rowIndex,
        colKey: column.colId,
        charPress: keyboardEvent.key
      });
      
      // Prevenir el comportamiento por defecto
      keyboardEvent.preventDefault();
    }
    
    // Permitir navegación con flechas sin interferir
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(keyboardEvent.key)) {
      // Dejar que AG-Grid maneje la navegación
      return;
    }
  }, []);

  // Manejar cuando una celda obtiene el foco
  const onCellFocused = useCallback((event) => {
    // Solo seleccionar, no editar (como Google Sheets)
    if (event.api && event.rowIndex !== null && event.column) {
      event.api.clearRangeSelection();
      event.api.addCellRange({
        rowStartIndex: event.rowIndex,
        rowEndIndex: event.rowIndex,
        columnStart: event.column,
        columnEnd: event.column
      });
    }
  }, []);

  // Definición de columnas con configuración similar a Excel (ordenadas según base de datos)
  const columnDefs = useMemo(() => [
    {
      headerName: "ID",
      field: "id",
      width: 80,
      pinned: 'left',
      cellStyle: { backgroundColor: '#f0f0f0', color: '#000' },
      editable: false,
      sortable: true,
      filter: true
    },
    {
      headerName: "Procesador",
      field: "PROCESADOR",
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['EFEVOO', 'BSD', 'CREDOMATIC']
      },
      cellEditorPopup: true,
      cellRenderer: GoogleSheetsDropdownRenderer,
      cellClass: 'dropdown-cell',
      sortable: true,
      filter: true
    },
    {
      headerName: "Año",
      field: "AÑO",
      width: 80,
      editable: true,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: {
        maxLength: 4
      },
      sortable: true,
      filter: 'agNumberColumnFilter'
    },
    {
      headerName: "Mes Petición",
      field: "MES_PETICION",
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
      },
      cellEditorPopup: true,
      cellRenderer: GoogleSheetsDropdownRenderer,
      cellClass: 'dropdown-cell',
      sortable: true,
      filter: true
    },
    {
      headerName: "EuroSkin",
      field: "EUROSKIN",
      width: 100,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['true', 'false']
      },
      cellEditorPopup: true,
      cellRenderer: GoogleSheetsDropdownRenderer,
      cellClass: 'dropdown-cell',
      sortable: true,
      filter: true
    },
    {
      headerName: "ID Comercio/Afiliación",
      field: "ID_DEL_COMERCIO_AFILIACION",
      width: 180,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Nombre del Comercio",
      field: "NOMBRE_DEL_COMERCIO",
      width: 200,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "ID Transacción",
      field: "ID_DE_TRANSACCION",
      width: 150,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Fecha Venta",
      field: "FECHA_VENTA",
      width: 120,
      editable: true,
      cellEditor: 'agDateCellEditor',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (params.value) {
          const date = new Date(params.value);
          return date.toLocaleDateString('es-ES');
        }
        return '';
      }
    },
    {
      headerName: "Monto",
      field: "MONTO",
      width: 100,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => {
        if (params.value != null && params.value !== '' && !isNaN(params.value)) {
          const numero = parseFloat(params.value);
          if (!isNaN(numero)) {
            return new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(numero);
          }
        }
        return params.value || '';
      },
      cellStyle: { textAlign: 'right' }
    },
    {
      headerName: "Número de Tarjeta",
      field: "NUM_DE_TARJETA",
      width: 150,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Autorización",
      field: "AUTORIZACION",
      width: 120,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Cliente",
      field: "CLIENTE",
      width: 150,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Vendedora",
      field: "VENDEDORA",
      width: 150,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Sucursal",
      field: "SUCURSAL",
      width: 150,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Fecha Contrato",
      field: "FECHA_CONTRATO",
      width: 130,
      editable: true,
      cellEditor: 'agDateCellEditor',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (params.value) {
          const date = new Date(params.value);
          return date.toLocaleDateString('es-ES');
        }
        return '';
      }
    },
    {
      headerName: "Paquete",
      field: "PAQUETE",
      width: 120,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Bloque",
      field: "BLOQUE",
      width: 100,
      editable: true,
      sortable: true,
      filter: true
    },
    {
      headerName: "Fecha Petición",
      field: "FECHA_DE_PETICION",
      width: 130,
      editable: true,
      cellEditor: 'agDateCellEditor',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (params.value) {
          const date = new Date(params.value);
          return date.toLocaleDateString('es-ES');
        }
        return '';
      }
    },
    {
      headerName: "Fecha Respuesta",
      field: "FECHA_DE_RESPUESTA",
      width: 130,
      editable: true,
      cellEditor: 'agDateCellEditor',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (params.value) {
          const date = new Date(params.value);
          return date.toLocaleDateString('es-ES');
        }
        return '';
      }
    },
    {
      headerName: "Comentarios",
      field: "COMENTARIOS",
      width: 200,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      sortable: true,
      filter: true
    },
    {
      headerName: "Captura CC",
      field: "CAPTURA_CC",
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['EN PROCESO', 'GANADA', 'PERDIDA']
      },
      cellEditorPopup: true,
      cellRenderer: GoogleSheetsDropdownRenderer,
      cellClass: 'dropdown-cell',
      sortable: true,
      filter: true
    }
  ], []);

  // Configuración del grid similar a Excel
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    cellDataType: false,
    wrapHeaderText: true,
    autoHeaderHeight: true,
  }), []);

  const gridOptions = useMemo(() => ({
    enableRangeSelection: true,
    enableFillHandle: true,
    enableRangeHandle: true,
    allowContextMenuWithControlKey: true,
    enableCharts: true,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 20,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    suppressMenuHide: true,
    suppressRowClickSelection: true, // No seleccionar row completo con click
    rowSelection: 'multiple',
    copyHeadersToClipboard: true,
    suppressLastEmptyLineOnPaste: true,
    // Configuración como Google Sheets
    stopEditingWhenCellsLoseFocus: true,
    enterMovesDown: true,
    enterMovesDownAfterEdit: true,
    // CLAVE: Un click selecciona, doble click edita (como Google Sheets)
    singleClickEdit: false,
    // Permitir edición con teclas directamente
    suppressClickEdit: false,
    // Navegación con teclado como Google Sheets
    suppressNavigationWithArrows: false,
    // Eventos para comportamiento como Google Sheets
    onCellValueChanged: onCellValueChanged,
    onCellDoubleClicked: onCellDoubleClicked,
    onCellKeyDown: onCellKeyDown,
    onCellFocused: onCellFocused,
    // Navegación con teclado
    suppressKeyboardEvent: (params) => {
      // Permitir navegación con flechas cuando no está editando
      if (!params.editing) {
        return false;
      }
      // Cuando está editando, solo interceptar ciertas teclas
      return false;
    }
  }), [onCellValueChanged, onCellDoubleClicked, onCellKeyDown, onCellFocused]);

  // Función para crear una fila por defecto
  const crearFilaPorDefecto = () => ({
    id: 1,
    PROCESADOR: '',
    AÑO: '2025',
    MES_PETICION: 'AGOSTO',
    EUROSKIN: 'false',
    ID_DEL_COMERCIO_AFILIACION: '',
    NOMBRE_DEL_COMERCIO: '',
    ID_DE_TRANSACCION: '',
    FECHA_VENTA: new Date().toISOString().split('T')[0],
    MONTO: 0,
    NUM_DE_TARJETA: '',
    AUTORIZACION: '',
    CLIENTE: '',
    VENDEDORA: '',
    SUCURSAL: '',
    FECHA_CONTRATO: '',
    PAQUETE: '',
    BLOQUE: '',
    FECHA_DE_PETICION: new Date().toISOString().split('T')[0],
    FECHA_DE_RESPUESTA: '',
    COMENTARIOS: '',
    CAPTURA_CC: 'EN PROCESO'
  });

  // Cargar datos desde la API
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/aclaraciones/obtener-todo`);
      const datos = response.data.map((item, index) => ({
        id: item.id || index + 1,
        ...item
      }));
      setRowData(datos.length > 0 ? datos : [crearFilaPorDefecto()]);
      setMensaje(datos.length > 0 
        ? `✅ Se cargaron ${datos.length} registros desde la base de datos`
        : '📋 Grid listo para recibir datos. Se agregó una fila por defecto'
      );
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setMensaje('📋 Grid listo para recibir datos. Se agregó una fila por defecto');
      // Iniciar con una fila por defecto en lugar de grid vacío
      setRowData([crearFilaPorDefecto()]);
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(""), 5000);
    }
  }, []);

  // Grid vacío - sin datos de ejemplo
  const generarDatosEjemplo = () => {
    return []; // Retorna array vacío
  };

  // Agregar nueva fila
  const agregarFila = useCallback(() => {
    const nuevaFila = {
      id: rowData.length + 1,
      PROCESADOR: '',
      AÑO: '2025',
      MES_PETICION: 'AGOSTO',
      ID_DEL_COMERCIO_AFILIACION: '',
      NOMBRE_DEL_COMERCIO: '',
      ID_DE_TRANSACCION: '',
      FECHA_VENTA: new Date().toISOString().split('T')[0],
      MONTO: 0, // Monto como número, no string
      NUM_DE_TARJETA: '',
      AUTORIZACION: '',
      CLIENTE: '',
      VENDEDORA: '',
      SUCURSAL: '',
      FECHA_CONTRATO: '',
      PAQUETE: '',
      BLOQUE: '',
      FECHA_DE_PETICION: new Date().toISOString().split('T')[0],
      FECHA_DE_RESPUESTA: '',
      COMENTARIOS: '',
      CAPTURA_CC: 'EN PROCESO',
      EUROSKIN: 'false'
    };
    setRowData(prev => [...prev, nuevaFila]);
    setMensaje('✅ Nueva fila agregada');
    setTimeout(() => setMensaje(""), 2000);
  }, [rowData.length]);

  // Eliminar filas seleccionadas
  const eliminarFilasSeleccionadas = useCallback(() => {
    if (!gridApi) return;
    
    const selectedRows = gridApi.getSelectedRows();
    if (selectedRows.length === 0) {
      setMensaje('⚠️ Selecciona filas para eliminar');
      setTimeout(() => setMensaje(""), 2000);
      return;
    }

    if (window.confirm(`¿Eliminar ${selectedRows.length} fila(s) seleccionada(s)?`)) {
      const selectedIds = selectedRows.map(row => row.id);
      setRowData(prev => prev.filter(row => !selectedIds.includes(row.id)));
      setMensaje(`🗑️ ${selectedRows.length} fila(s) eliminada(s)`);
      setTimeout(() => setMensaje(""), 2000);
    }
  }, [gridApi]);

  // Exportar a Excel
  const exportarExcel = useCallback(() => {
    if (!gridApi) return;
    
    gridApi.exportDataAsExcel({
      fileName: `aclaraciones_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Aclaraciones'
    });
    setMensaje('📊 Exportado a Excel');
    setTimeout(() => setMensaje(""), 2000);
  }, [gridApi]);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Función para obtener el mes actual del sistema
  const obtenerMesActual = () => {
    const meses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const fechaActual = new Date();
    return meses[fechaActual.getMonth()];
  };

  // Funciones de normalización (copiadas de IngresarAclaraciones)
  const normalizarMonto = (montoStr) => {
    if (!montoStr || montoStr === '') return 0;
    
    // Convertir a string si no lo es
    let str = montoStr.toString();
    
    // Remover todos los caracteres que no sean dígitos, puntos o comas
    str = str.replace(/[^\d.,]/g, '');
    
    // Si no hay puntos ni comas, es un número entero
    if (!str.includes('.') && !str.includes(',')) {
      const numero = parseFloat(str);
      return isNaN(numero) ? 0 : numero;
    }
    
    // Si tiene tanto punto como coma, determinar cuál es el separador decimal
    if (str.includes('.') && str.includes(',')) {
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');
      
      if (lastDot > lastComma) {
        // El punto es el separador decimal, remover comas
        str = str.replace(/,/g, '');
      } else {
        // La coma es el separador decimal, remover puntos y cambiar coma por punto
        str = str.replace(/\./g, '').replace(',', '.');
      }
    } else if (str.includes(',')) {
      // Solo tiene comas, verificar si es separador decimal o de miles
      const parts = str.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Probablemente es separador decimal
        str = str.replace(',', '.');
      } else {
        // Probablemente es separador de miles
        str = str.replace(/,/g, '');
      }
    }
    
    const numero = parseFloat(str);
    return isNaN(numero) ? 0 : numero;
  };

  const normalizarFecha = (fechaStr) => {
    if (!fechaStr) return "";
    let fecha = fechaStr.replace(/[^\d\/\-]/g, '');
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
      const [dia, mes, anio] = fecha.split('/');
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    if (/^\d{2}\-\d{2}\-\d{4}$/.test(fecha)) {
      const [dia, mes, anio] = fecha.split('-');
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return fecha;
  };

  const obtenerNombreMes = (fechaStr) => {
    if (!fechaStr) return { anio: "", mesNombre: "" };
    let anio, mes;
    let partes;
    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(fechaStr)) {
      // YYYY/MM/DD o YYYY-MM-DD
      partes = fechaStr.split(/[\/\-]/);
      anio = partes[0];
      mes = partes[1].padStart(2, '0');
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
  };

  // Función para procesar diferentes formatos de pegado (con todas las validaciones de IngresarAclaraciones)
  const procesarDatosPegados = (texto) => {
    const rows = texto.split(/\r?\n/).filter(row => row.trim());
    if (rows.length === 0) return [];

    const nuevosRegistros = [];
    const mesActual = obtenerMesActual();
    const fechaActual = new Date().toISOString().split('T')[0];

    // Columnas base de aclaraciones
    const columnas = [
      "PROCESADOR", "AÑO", "MES_PETICION", "EUROSKIN", "ID_DEL_COMERCIO_AFILIACION",
      "NOMBRE_DEL_COMERCIO", "ID_DE_TRANSACCION", "FECHA_VENTA", "MONTO", "NUM_DE_TARJETA",
      "AUTORIZACION", "CLIENTE", "VENDEDORA", "SUCURSAL", "FECHA_CONTRATO", "PAQUETE",
      "BLOQUE", "FECHA_DE_PETICION", "FECHA_DE_RESPUESTA", "COMENTARIOS", "CAPTURA_CC"
    ];

    // Encabezados EFEVOO
    const efevooHeaders = [
      "ID", "FOLIO", "CLIENTE", "SUCURSAL", "NÚMERO DE TARJETA", "MARCA DE TARJETA", 
      "TIPO DE TARJETA", "MÉTODO DE PAGO", "FECHA Y HORA", "MONTO", "NÚMERO DE AUTORIZACIÓN", "AFILIACIÓN"
    ];

    // Mapeo EFEVOO -> columnas internas
    const efevooToCol = {
      "ID": "ID_DE_TRANSACCION",
      "FOLIO": "ID_DE_TRANSACCION",
      "CLIENTE": "NOMBRE_DEL_COMERCIO",
      "SUCURSAL": "SUCURSAL",
      "NÚMERO DE TARJETA": "NUM_DE_TARJETA",
      "MÉTODO DE PAGO": "PROCESADOR",
      "FECHA Y HORA": "FECHA_VENTA",
      "MONTO": "MONTO",
      "NÚMERO DE AUTORIZACIÓN": "AUTORIZACION",
      "AFILIACIÓN": "ID_DEL_COMERCIO_AFILIACION",
      "AFILIACION": "ID_DEL_COMERCIO_AFILIACION"
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

    // Encabezados BSD verticales
    const bsdHeaders = [
      "AFILIACION", "NOMBRE DEL COMERCIO", "BIN TARJETA", "TARJETA", "FECHA VENTA",
      "HORA", "IMPORTE", "AUTORIZACION", "FECHA CONTRACARGO", "REFERENCIA"
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

    // 1. DETECTAR FORMATO CREDOMATIC
    if (texto.includes("DATOS DE LA TRANSACCIÓN") || texto.includes("No. caso:") || texto.includes("Afiliado Pagador:")) {
      const obj = {};
      
      const fechaMatch = texto.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/);
      const nombreComercioMatch = texto.match(/Señores:\s*([^\n\r]+)/);
      const montoMatch = texto.match(/Monto de la Transacción:\s*([\d,.]+)/);
      const tarjetaMatch = texto.match(/Número de Tarjeta:\s*(\d+X+\d+)/);
      const autorizacionMatch = texto.match(/Código de Autorización:\s*(\d+)/);
      const casoMatch = texto.match(/No\.\s*caso:\s*([^\n\r]+)/);
      const afiliadoMatch = texto.match(/No. Afiliado:\s*(\d+)/);
      
      if (fechaMatch) obj["FECHA_VENTA"] = normalizarFecha(fechaMatch[1]);
      if (nombreComercioMatch) obj["NOMBRE_DEL_COMERCIO"] = nombreComercioMatch[1].trim();
      if (montoMatch) obj["MONTO"] = normalizarMonto(montoMatch[1]);
      if (tarjetaMatch) obj["NUM_DE_TARJETA"] = tarjetaMatch[1];
      if (autorizacionMatch) obj["AUTORIZACION"] = autorizacionMatch[1];
      if (casoMatch) obj["ID_DE_TRANSACCION"] = casoMatch[1].trim();
      if (afiliadoMatch) obj["ID_DEL_COMERCIO_AFILIACION"] = afiliadoMatch[1];
      
      const newRow = Object.fromEntries(columnas.map(col => [col, obj[col] || ""]));
      newRow["PROCESADOR"] = "CREDOMATIC";
      newRow["EUROSKIN"] = "false";
      newRow["CAPTURA_CC"] = "EN PROCESO";
      newRow["AÑO"] = new Date().getFullYear().toString();
      newRow["MES_PETICION"] = mesActual;
      newRow["FECHA_DE_PETICION"] = fechaActual;
      newRow["id"] = rowData.length + nuevosRegistros.length + 1;
      
      // Asegurar que MONTO sea un número
      if (newRow["MONTO"]) {
        newRow["MONTO"] = normalizarMonto(newRow["MONTO"]);
      } else {
        newRow["MONTO"] = 0;
      }
      
      nuevosRegistros.push(newRow);
      return nuevosRegistros;
    }

    // 2. DETECTAR FORMATO EFEVOO HORIZONTAL
    if (rows.length >= 2) {
      const headers = rows[0].split(/\t|\s{2,}/).map(h => h.trim().toUpperCase());
      if (headers.some(h => efevooHeaders.includes(h))) {
        const dataRows = rows.slice(1);
        const mapeoDetectado = headers.map(h => efevooToCol[h] || h);
        
        dataRows.forEach(row => {
          const cells = row.split(/\t|\s{2,}/);
          const newRow = Object.fromEntries(columnas.map(col => [col, ""]));
          
          mapeoDetectado.forEach((colInterno, i) => {
            let value = cells[i] ? cells[i].trim() : "";
            if (colInterno === "MONTO") value = normalizarMonto(value);
            if (colInterno && colInterno.includes("FECHA") && value) value = normalizarFecha(value);
            if (columnas.includes(colInterno)) newRow[colInterno] = value;
          });
          
          newRow["PROCESADOR"] = "EFEVOO";
          newRow["EUROSKIN"] = "false";
          newRow["CAPTURA_CC"] = "EN PROCESO";
          newRow["AÑO"] = new Date().getFullYear().toString();
          newRow["MES_PETICION"] = mesActual;
          newRow["FECHA_DE_PETICION"] = fechaActual;
          newRow["id"] = rowData.length + nuevosRegistros.length + 1;
          
          // Asegurar que MONTO sea un número
          if (newRow["MONTO"]) {
            newRow["MONTO"] = normalizarMonto(newRow["MONTO"]);
          } else {
            newRow["MONTO"] = 0;
          }
          
          nuevosRegistros.push(newRow);
        });
        
        return nuevosRegistros;
      }
    }

    // 3. DETECTAR FORMATO BSD VERTICAL
    if (rows.length > 10 && bsdHeaders.every((h, i) => rows[i]?.trim().toUpperCase() === h)) {
      const numHeaders = bsdHeaders.length;
      const numRecords = Math.floor((rows.length - numHeaders) / numHeaders);
      
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
        
        const row = Object.fromEntries(columnas.map(col => [col, reg[col] || ""]));
        row["PROCESADOR"] = "BSD";
        row["EUROSKIN"] = "false";
        row["CAPTURA_CC"] = "EN PROCESO";
        row["AÑO"] = new Date().getFullYear().toString();
        row["MES_PETICION"] = mesActual;
        row["FECHA_DE_PETICION"] = fechaActual;
        row["id"] = rowData.length + nuevosRegistros.length + 1;
        
        // Asegurar que MONTO sea un número
        if (row["MONTO"]) {
          row["MONTO"] = normalizarMonto(row["MONTO"]);
        } else {
          row["MONTO"] = 0;
        }
        
        nuevosRegistros.push(row);
      }
      
      return nuevosRegistros;
    }

    // 4. FORMATO VERTICAL (key-value pairs)
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
      
      const newRow = Object.fromEntries(columnas.map(col => [col, obj[col] || ""]));
      newRow["EUROSKIN"] = newRow["EUROSKIN"] || "false";
      newRow["CAPTURA_CC"] = newRow["CAPTURA_CC"] || "EN PROCESO";
      newRow["AÑO"] = new Date().getFullYear().toString();
      newRow["MES_PETICION"] = mesActual;
      newRow["FECHA_DE_PETICION"] = fechaActual;
      newRow["id"] = rowData.length + nuevosRegistros.length + 1;
      
      // Asegurar que MONTO sea un número
      if (newRow["MONTO"]) {
        newRow["MONTO"] = normalizarMonto(newRow["MONTO"]);
      } else {
        newRow["MONTO"] = 0;
      }
      
      nuevosRegistros.push(newRow);
      return nuevosRegistros;
    }

    // 5. FORMATO GENÉRICO (fallback para otros formatos)
    rows.forEach((linea, index) => {
      const datos = linea.split('\t').map(item => item.trim());
      
      if (datos.length >= 3) {
        const newRow = Object.fromEntries(columnas.map(col => [col, ""]));
        
        // Mapeo genérico básico
        if (datos[0]) newRow["ID_DEL_COMERCIO_AFILIACION"] = datos[0];
        if (datos[1]) newRow["NOMBRE_DEL_COMERCIO"] = datos[1];
        if (datos[2]) newRow["MONTO"] = normalizarMonto(datos[2]);
        if (datos[3]) newRow["NUM_DE_TARJETA"] = datos[3];
        if (datos[4]) newRow["AUTORIZACION"] = datos[4];
        if (datos[5]) newRow["ID_DE_TRANSACCION"] = datos[5];
        if (datos[6]) newRow["FECHA_VENTA"] = normalizarFecha(datos[6]);
        
        newRow["PROCESADOR"] = "";
        newRow["EUROSKIN"] = "false";
        newRow["CAPTURA_CC"] = "EN PROCESO";
        newRow["AÑO"] = new Date().getFullYear().toString();
        newRow["MES_PETICION"] = mesActual;
        newRow["FECHA_DE_PETICION"] = fechaActual;
        newRow["id"] = rowData.length + nuevosRegistros.length + 1;
        
        // Asegurar que MONTO sea un número
        if (newRow["MONTO"]) {
          newRow["MONTO"] = normalizarMonto(newRow["MONTO"]);
        } else {
          newRow["MONTO"] = 0;
        }
        
        nuevosRegistros.push(newRow);
      }
    });

    return nuevosRegistros;
  };

  // Función para pegar datos masivos
  const pegarDatos = () => {
    if (!datosParaPegar.trim()) {
      setMensaje('⚠️ No hay datos para pegar');
      setTimeout(() => setMensaje(""), 2000);
      return;
    }

    try {
      const nuevosRegistros = procesarDatosPegados(datosParaPegar);
      
      if (nuevosRegistros.length === 0) {
        setMensaje('⚠️ No se pudieron procesar los datos');
        setTimeout(() => setMensaje(""), 2000);
        return;
      }

      setRowData(prev => [...prev, ...nuevosRegistros]);
      setMensaje(`✅ Se agregaron ${nuevosRegistros.length} registros desde pegado`);
      setDatosParaPegar('');
      setMostrarAreaPegado(false);
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error('Error al procesar datos:', error);
      setMensaje('❌ Error al procesar los datos pegados');
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-gray-200 min-h-screen">
      <div className="w-full max-w-none mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Excel Grid - Aclaraciones</h1>
            <p className="text-gray-400 mt-1">
              Grid estilo Excel para procesar correos de aclaraciones. Usa "Pegar Datos Masivos" para agregar datos desde correos.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={cargarDatos}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? "Cargando..." : "🔄 Cargar desde BD"}
            </button>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-4 p-3 rounded ${mensaje.startsWith('✅') ? 'bg-green-900 text-green-200' : 
                                           mensaje.startsWith('❌') ? 'bg-red-900 text-red-200' :
                                           mensaje.startsWith('⚠️') ? 'bg-yellow-900 text-yellow-200' :
                                           'bg-blue-900 text-blue-200'}`}>
            {mensaje}
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={agregarFila}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
            >
              ➕ Agregar Fila
            </button>
            <button
              onClick={() => setMostrarAreaPegado(!mostrarAreaPegado)}
              className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm"
            >
              📋 Pegar Datos Masivos
            </button>
            <button
              onClick={eliminarFilasSeleccionadas}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
            >
              🗑️ Eliminar Seleccionadas
            </button>
            <button
              onClick={exportarExcel}
              className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition text-sm"
            >
              📊 Exportar Excel
            </button>
            <div className="ml-auto text-sm text-gray-400 flex items-center">
              💡 <strong>Navegación:</strong> Flechas para moverse | Ctrl+Flechas para saltar | Enter para editar | Esc para cancelar
            </div>
          </div>
        </div>

        {/* Área de Pegado Masivo */}
        {mostrarAreaPegado && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-purple-500">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-purple-400">📋 Pegado Masivo de Datos</h3>
              <button
                onClick={() => setMostrarAreaPegado(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-2">
                <strong>Formatos de correos soportados:</strong>
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• <strong>CREDOMATIC:</strong> Correos con "DATOS DE LA TRANSACCIÓN", "No. caso:", "Afiliado Pagador:"</li>
                <li>• <strong>EFEVOO:</strong> Tablas con columnas ID, FOLIO, CLIENTE, SUCURSAL, MONTO, etc.</li>
                <li>• <strong>BSD:</strong> Formato vertical con AFILIACION, NOMBRE DEL COMERCIO, TARJETA, etc.</li>
                <li>• <strong>Genérico:</strong> Datos separados por tabulaciones o formato clave-valor</li>
                <li>• <em>💡 Simplemente copia y pega el contenido completo del correo aquí</em></li>
              </ul>
            </div>

            <textarea
              value={datosParaPegar}
              onChange={(e) => setDatosParaPegar(e.target.value)}
              placeholder="Pega aquí el contenido completo del correo de aclaración...

📧 Ejemplo CREDOMATIC:
DATOS DE LA TRANSACCIÓN
No. caso: ABC123456
Fecha: 15/08/2025
Señores: COMERCIO EJEMPLO S.A.
Monto de la Transacción: 1,500.00
Número de Tarjeta: 4152XXXX1234
Código de Autorización: 789456
No. Afiliado: 123456789

📧 Ejemplo EFEVOO (tabla):
ID	FOLIO	CLIENTE	SUCURSAL	NÚMERO DE TARJETA	MONTO	NÚMERO DE AUTORIZACIÓN
123456	FOL001	Comercio ABC	Centro	****1234	500.00	AUTH123

📧 Ejemplo BSD (vertical):
AFILIACION
123456
NOMBRE DEL COMERCIO
Comercio XYZ
TARJETA
1234
IMPORTE
750.50
AUTORIZACION
456789"
              className="w-full h-48 p-3 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono text-sm"
              style={{ resize: 'vertical' }}
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={pegarDatos}
                disabled={!datosParaPegar.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                ✅ Procesar y Agregar Datos
              </button>
              <button
                onClick={() => setDatosParaPegar('')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                🗑️ Limpiar
              </button>
              <div className="ml-auto text-sm text-gray-400 flex items-center">
                📊 Se usará el mes actual: <strong className="text-purple-400 ml-1">{obtenerMesActual()}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Grid Container */}
        <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
          <div className="ag-theme-alpine-dark h-full">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              gridOptions={gridOptions}
              onCellValueChanged={onCellValueChanged}
              onGridReady={(params) => {
                setGridApi(params.api);
                setColumnApi(params.columnApi);
                console.log('Grid ready!');
              }}
              suppressExcelExport={false}
              enableRangeSelection={true}
              enableFillHandle={true}
              enableRangeHandle={true}
              allowContextMenuWithControlKey={true}
              undoRedoCellEditing={true}
              undoRedoCellEditingLimit={20}
              enableCellTextSelection={true}
              rowSelection="multiple"
              animateRows={true}
              
              // Configuraciones de navegación tipo Excel
              navigateToNextCell={(params) => {
                const nextCell = params.nextCellPosition;
                if (nextCell) {
                  return nextCell;
                }
                return null;
              }}
              
              tabToNextCell={(params) => {
                const nextCell = params.nextCellPosition;
                if (nextCell) {
                  return nextCell;
                }
                return null;
              }}
            />
          </div>
        </div>

        {/* Footer con estadísticas */}
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between text-sm text-gray-400">
            <div>
              Total de registros: <span className="text-blue-400 font-semibold">{rowData.length}</span>
            </div>
            <div>
              Última actualización: <span className="text-blue-400 font-semibold">{new Date().toLocaleString('es-ES')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
