
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import DataGrid from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Función para crear una fila por defecto
const crearFilaPorDefecto = () => ({
  id: Date.now(),
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

// Componente para dropdown personalizado
function SelectEditor({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
      className="w-full h-full bg-white border-none outline-none px-2 text-sm"
    >
      <option value="">Seleccionar...</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

// Formateador personalizado para fechas
function formatDate(value) {
  if (!value) return '';
  if (value.includes('T')) {
    value = value.split('T')[0];
  }
  if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [año, mes, dia] = value.split('-');
    return `${dia}/${mes}/${año}`;
  }
  return value;
}

// Formateador personalizado para números
function formatNumber(value) {
  if (!value || value === 0) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function ExcelGridReactDataGrid() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarAreaPegado, setMostrarAreaPegado] = useState(false);
  const [datosParaPegar, setDatosParaPegar] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Definición de columnas para React Data Grid
  const columns = useMemo(() => [
    {
      key: 'id',
      name: 'ID',
      width: 80,
      frozen: true,
      resizable: true,
      sortable: true
    },
    {
      key: 'PROCESADOR',
      name: 'Procesador',
      width: 120,
      resizable: true,
      sortable: true,
      editor: (props) => (
        <SelectEditor 
          {...props} 
          options={['EFEVOO', 'BSD', 'CREDOMATIC']}
        />
      )
    },
    {
      key: 'AÑO',
      name: 'Año',
      width: 80,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'MES_PETICION',
      name: 'Mes Petición',
      width: 120,
      resizable: true,
      sortable: true,
      editor: (props) => (
        <SelectEditor 
          {...props} 
          options={['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']}
        />
      )
    },
    {
      key: 'EUROSKIN',
      name: 'EuroSkin',
      width: 100,
      resizable: true,
      sortable: true,
      editor: (props) => (
        <SelectEditor 
          {...props} 
          options={['true', 'false']}
        />
      )
    },
    {
      key: 'ID_DEL_COMERCIO_AFILIACION',
      name: 'ID Comercio/Afiliación',
      width: 180,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'NOMBRE_DEL_COMERCIO',
      name: 'Nombre del Comercio',
      width: 200,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'ID_DE_TRANSACCION',
      name: 'ID Transacción',
      width: 150,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'FECHA_VENTA',
      name: 'Fecha Venta',
      width: 120,
      resizable: true,
      sortable: true,
      formatter: ({ row }) => formatDate(row.FECHA_VENTA),
      editor: 'textEditor'
    },
    {
      key: 'MONTO',
      name: 'Monto',
      width: 120,
      resizable: true,
      sortable: true,
      formatter: ({ row }) => formatNumber(row.MONTO),
      editor: 'textEditor'
    },
    {
      key: 'NUM_DE_TARJETA',
      name: 'Número de Tarjeta',
      width: 150,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'AUTORIZACION',
      name: 'Autorización',
      width: 120,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'CLIENTE',
      name: 'Cliente',
      width: 150,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'VENDEDORA',
      name: 'Vendedora',
      width: 150,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'SUCURSAL',
      name: 'Sucursal',
      width: 150,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'FECHA_CONTRATO',
      name: 'Fecha Contrato',
      width: 130,
      resizable: true,
      sortable: true,
      formatter: ({ row }) => formatDate(row.FECHA_CONTRATO),
      editor: 'textEditor'
    },
    {
      key: 'PAQUETE',
      name: 'Paquete',
      width: 120,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'BLOQUE',
      name: 'Bloque',
      width: 100,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'FECHA_DE_PETICION',
      name: 'Fecha Petición',
      width: 130,
      resizable: true,
      sortable: true,
      formatter: ({ row }) => formatDate(row.FECHA_DE_PETICION),
      editor: 'textEditor'
    },
    {
      key: 'FECHA_DE_RESPUESTA',
      name: 'Fecha Respuesta',
      width: 130,
      resizable: true,
      sortable: true,
      formatter: ({ row }) => formatDate(row.FECHA_DE_RESPUESTA),
      editor: 'textEditor'
    },
    {
      key: 'COMENTARIOS',
      name: 'Comentarios',
      width: 200,
      resizable: true,
      sortable: true,
      editor: 'textEditor'
    },
    {
      key: 'CAPTURA_CC',
      name: 'Captura CC',
      width: 120,
      resizable: true,
      sortable: true,
      editor: (props) => (
        <SelectEditor 
          {...props} 
          options={['EN PROCESO', 'GANADA', 'PERDIDA']}
        />
      )
    }
  ], []);

  // Cargar datos desde la API
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/aclaraciones/obtener-todo`);
      const datos = response.data.map((item, index) => ({
        id: item.id || index + 1,
        ...item
      }));
      setRows(datos.length > 0 ? datos : [crearFilaPorDefecto()]);
      setMensaje(datos.length > 0 
        ? `✅ Se cargaron ${datos.length} registros desde la base de datos`
        : '📋 Grid listo para recibir datos. Se agregó una fila por defecto'
      );
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setMensaje('📋 Grid listo para recibir datos. Se agregó una fila por defecto');
      setRows([crearFilaPorDefecto()]);
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(""), 5000);
    }
  }, []);

  // Agregar nueva fila
  const agregarFila = useCallback(() => {
    const nuevaFila = crearFilaPorDefecto();
    setRows(prev => [...prev, nuevaFila]);
    setMensaje('✅ Nueva fila agregada');
    setTimeout(() => setMensaje(""), 2000);
  }, []);

  // Manejar cambios en las filas
  const handleRowsChange = (newRows, { indexes, column }) => {
    // Procesar cambios especiales para ciertos tipos de datos
    const processedRows = newRows.map(row => {
      // Procesar fechas
      if (column?.key && column.key.includes('FECHA')) {
        const value = row[column.key];
        if (value && typeof value === 'string') {
          row[column.key] = normalizarFecha(value);
        }
      }
      
      // Procesar montos
      if (column?.key === 'MONTO') {
        const value = row[column.key];
        if (value && typeof value === 'string') {
          row[column.key] = normalizarMonto(value);
        }
      }

      // Auto-detectar año y mes basado en fecha de venta
      if (column?.key === 'FECHA_VENTA' && row.FECHA_VENTA) {
        const { anio, mesNombre } = obtenerNombreMes(row.FECHA_VENTA);
        if (anio) row.AÑO = anio;
        if (mesNombre) row.MES_PETICION = mesNombre;
      }

      return row;
    });

    setRows(processedRows);
  };

  // Funciones de normalización (copiadas del componente original)
  const normalizarMonto = (montoStr) => {
    if (!montoStr || montoStr === '') return 0;
    let str = montoStr.toString();
    str = str.replace(/[^\d.,]/g, '');
    if (!str.includes('.') && !str.includes(',')) {
      const numero = parseFloat(str);
      return isNaN(numero) ? 0 : numero;
    }
    if (str.includes('.') && str.includes(',')) {
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');
      if (lastDot > lastComma) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(/\./g, '').replace(',', '.');
      }
    } else if (str.includes(',')) {
      const parts = str.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        str = str.replace(',', '.');
      } else {
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

  // Función para obtener el nombre del mes en español en mayúsculas
  function obtenerNombreMes(fechaStr) {
    if (!fechaStr) return { anio: "", mesNombre: "" };
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

  // Funciones de selección múltiple
  const handleRowSelection = (selectedRowsSet) => {
    setSelectedRows(selectedRowsSet);
  };

  const handleBulkDelete = () => {
    if (selectedRows.size === 0) return;
    
    if (confirm(`¿Estás seguro de que quieres eliminar ${selectedRows.size} filas seleccionadas?`)) {
      const newRows = rows.filter(row => !selectedRows.has(row.id));
      setRows(newRows);
      setSelectedRows(new Set());
      setMensaje(`${selectedRows.size} filas eliminadas exitosamente`);
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
  };

  // Función para procesar diferentes formatos de pegado (mejorada con lógica de IngresarAclaraciones)
  const procesarDatosPegados = (texto) => {
    const rows = texto.split(/\r?\n/).filter(row => row.trim());
    if (rows.length === 0) return [];

    const nuevosRegistros = [];
    const fechaActual = new Date().toISOString().split('T')[0];

    // Encabezados y mapeos para diferentes formatos
    const efevooHeaders = [
      "ID", "FOLIO", "CLIENTE", "SUCURSAL", "NÚMERO DE TARJETA", "MARCA DE TARJETA", "TIPO DE TARJETA", "MÉTODO DE PAGO", "FECHA Y HORA", "MONTO", "NÚMERO DE AUTORIZACIÓN", "AFILIACIÓN"
    ];

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

    const bsdHeaders = [
      "AFILIACION",
      "NOMBRE DEL COMERCIO",
      "TARJETA",
      "FECHA VENTA",
      "HORA",
      "IMPORTE",
      "AUTORIZACION",
      "FECHA CONTRACARGO",
      "REFERENCIA"
    ];

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

    // Detectar formato CREDOMATIC
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
      
      const newRow = {
        id: Date.now(),
        PROCESADOR: "CREDOMATIC",
        EUROSKIN: "false",
        ID_DEL_COMERCIO_AFILIACION: obj["ID_DEL_COMERCIO_AFILIACION"] || "",
        NOMBRE_DEL_COMERCIO: obj["NOMBRE_DEL_COMERCIO"] || "",
        ID_DE_TRANSACCION: obj["ID_DE_TRANSACCION"] || "",
        FECHA_VENTA: obj["FECHA_VENTA"] || "",
        MONTO: obj["MONTO"] || 0,
        NUM_DE_TARJETA: obj["NUM_DE_TARJETA"] || "",
        AUTORIZACION: obj["AUTORIZACION"] || "",
        CLIENTE: "",
        VENDEDORA: "",
        SUCURSAL: "",
        FECHA_CONTRATO: "",
        PAQUETE: "",
        BLOQUE: "",
        FECHA_DE_PETICION: fechaActual,
        FECHA_DE_RESPUESTA: "",
        COMENTARIOS: "",
        CAPTURA_CC: "EN PROCESO"
      };

      // Detectar año y mes
      if (newRow["FECHA_VENTA"]) {
        const { anio } = obtenerNombreMes(newRow["FECHA_VENTA"]);
        newRow["AÑO"] = anio || new Date().getFullYear().toString();
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        newRow["MES_PETICION"] = meses[new Date().getMonth()];
      } else {
        const fechaActual = new Date();
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        newRow["AÑO"] = fechaActual.getFullYear().toString();
        newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
      }
      
      nuevosRegistros.push(newRow);
      return nuevosRegistros;
    }

    // Detectar formato BSD vertical
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
        
        const newRow = {
          id: Date.now() + Math.random(),
          PROCESADOR: "BSD",
          EUROSKIN: "false",
          ID_DEL_COMERCIO_AFILIACION: reg["ID_DEL_COMERCIO_AFILIACION"] || "",
          NOMBRE_DEL_COMERCIO: reg["NOMBRE_DEL_COMERCIO"] || "",
          ID_DE_TRANSACCION: reg["ID_DE_TRANSACCION"] || "",
          FECHA_VENTA: reg["FECHA_VENTA"] || "",
          MONTO: reg["MONTO"] || 0,
          NUM_DE_TARJETA: reg["NUM_DE_TARJETA"] || "",
          AUTORIZACION: reg["AUTORIZACION"] || "",
          CLIENTE: "",
          VENDEDORA: "",
          SUCURSAL: "",
          FECHA_CONTRATO: "",
          PAQUETE: "",
          BLOQUE: "",
          FECHA_DE_PETICION: fechaActual,
          FECHA_DE_RESPUESTA: "",
          COMENTARIOS: "",
          CAPTURA_CC: "EN PROCESO"
        };

        // Detectar año y mes
        if (newRow["FECHA_VENTA"]) {
          const { anio } = obtenerNombreMes(newRow["FECHA_VENTA"]);
          newRow["AÑO"] = anio || new Date().getFullYear().toString();
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          newRow["MES_PETICION"] = meses[new Date().getMonth()];
        } else {
          const fechaActual = new Date();
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          newRow["AÑO"] = fechaActual.getFullYear().toString();
          newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
        }
        
        nuevosRegistros.push(newRow);
      }
      return nuevosRegistros;
    }

    // Detectar formato EFEVOO horizontal
    if (rows.length > 0 && efevooHeaders.some(h => rows[0].toUpperCase().includes(h))) {
      const headerRow = rows[0];
      const headers = headerRow.split(/\t|\s{2,}/).map(h => h.trim().toUpperCase());
      const mapeoDetectado = headers.map(h => efevooToCol[h] || null).filter(Boolean);
      
      if (mapeoDetectado.length > 0) {
        const dataRows = rows.slice(1);
        dataRows.forEach(row => {
          const cells = row.split(/\t|\s{2,}/);
          const newRow = {
            id: Date.now() + Math.random(),
            PROCESADOR: "EFEVOO",
            EUROSKIN: "false",
            ID_DEL_COMERCIO_AFILIACION: "",
            NOMBRE_DEL_COMERCIO: "",
            ID_DE_TRANSACCION: "",
            FECHA_VENTA: "",
            MONTO: 0,
            NUM_DE_TARJETA: "",
            AUTORIZACION: "",
            CLIENTE: "",
            VENDEDORA: "",
            SUCURSAL: "",
            FECHA_CONTRATO: "",
            PAQUETE: "",
            BLOQUE: "",
            FECHA_DE_PETICION: fechaActual,
            FECHA_DE_RESPUESTA: "",
            COMENTARIOS: "",
            CAPTURA_CC: "EN PROCESO"
          };
          
          mapeoDetectado.forEach((colInterno, i) => {
            if (colInterno) {
              let value = cells[i] ? cells[i].trim() : "";
              if (colInterno === "MONTO") value = normalizarMonto(value);
              if (colInterno.includes("FECHA") && value) value = normalizarFecha(value);
              newRow[colInterno] = value;
            }
          });

          // Detectar año y mes
          if (newRow["FECHA_VENTA"]) {
            const { anio } = obtenerNombreMes(newRow["FECHA_VENTA"]);
            newRow["AÑO"] = anio || new Date().getFullYear().toString();
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            newRow["MES_PETICION"] = meses[new Date().getMonth()];
          } else {
            const fechaActual = new Date();
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            newRow["AÑO"] = fechaActual.getFullYear().toString();
            newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
          }
          
          nuevosRegistros.push(newRow);
        });
        return nuevosRegistros;
      }
    }

    // Mapeo genérico con detección automática de encabezados
    if (rows.length > 1) {
      const headerRow = rows[0];
      const headers = headerRow.split(/\t|\s{2,}/).map(h => h.trim().toUpperCase());
      const mapeoDetectado = headers.map(h => mapHeaders[h] || null);
      
      if (mapeoDetectado.some(Boolean)) {
        const dataRows = rows.slice(1);
        dataRows.forEach(row => {
          const cells = row.split(/\t|\s{2,}/);
          const newRow = {
            id: Date.now() + Math.random(),
            PROCESADOR: "",
            EUROSKIN: "false",
            ID_DEL_COMERCIO_AFILIACION: "",
            NOMBRE_DEL_COMERCIO: "",
            ID_DE_TRANSACCION: "",
            FECHA_VENTA: "",
            MONTO: 0,
            NUM_DE_TARJETA: "",
            AUTORIZACION: "",
            CLIENTE: "",
            VENDEDORA: "",
            SUCURSAL: "",
            FECHA_CONTRATO: "",
            PAQUETE: "",
            BLOQUE: "",
            FECHA_DE_PETICION: fechaActual,
            FECHA_DE_RESPUESTA: "",
            COMENTARIOS: "",
            CAPTURA_CC: "EN PROCESO"
          };
          
          mapeoDetectado.forEach((colInterno, i) => {
            if (colInterno) {
              let value = cells[i] ? cells[i].trim() : "";
              if (colInterno === "MONTO") value = normalizarMonto(value);
              if (colInterno.includes("FECHA") && value) value = normalizarFecha(value);
              newRow[colInterno] = value;
            }
          });

          // Detectar año y mes
          if (newRow["FECHA_VENTA"]) {
            const { anio } = obtenerNombreMes(newRow["FECHA_VENTA"]);
            newRow["AÑO"] = anio || new Date().getFullYear().toString();
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            newRow["MES_PETICION"] = meses[new Date().getMonth()];
          } else {
            const fechaActual = new Date();
            const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            newRow["AÑO"] = fechaActual.getFullYear().toString();
            newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
          }
          
          nuevosRegistros.push(newRow);
        });
        return nuevosRegistros;
      }
    }

    // Formato genérico simple (datos separados por tabulaciones sin encabezados)
    rows.forEach((linea) => {
      const datos = linea.split('\t').map(item => item.trim());
      
      if (datos.length >= 3) {
        const newRow = {
          id: Date.now() + Math.random(),
          PROCESADOR: "",
          EUROSKIN: "false",
          ID_DEL_COMERCIO_AFILIACION: datos[0] || "",
          NOMBRE_DEL_COMERCIO: datos[1] || "",
          ID_DE_TRANSACCION: datos[5] || "",
          FECHA_VENTA: normalizarFecha(datos[6]) || "",
          MONTO: normalizarMonto(datos[2]) || 0,
          NUM_DE_TARJETA: datos[3] || "",
          AUTORIZACION: datos[4] || "",
          CLIENTE: "",
          VENDEDORA: "",
          SUCURSAL: "",
          FECHA_CONTRATO: "",
          PAQUETE: "",
          BLOQUE: "",
          FECHA_DE_PETICION: fechaActual,
          FECHA_DE_RESPUESTA: "",
          COMENTARIOS: "",
          CAPTURA_CC: "EN PROCESO"
        };

        // Detectar año y mes
        if (newRow["FECHA_VENTA"]) {
          const { anio } = obtenerNombreMes(newRow["FECHA_VENTA"]);
          newRow["AÑO"] = anio || new Date().getFullYear().toString();
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          newRow["MES_PETICION"] = meses[new Date().getMonth()];
        } else {
          const fechaActual = new Date();
          const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          newRow["AÑO"] = fechaActual.getFullYear().toString();
          newRow["MES_PETICION"] = meses[fechaActual.getMonth()];
        }
        
        nuevosRegistros.push(newRow);
      }
    });

    return nuevosRegistros;
  };

  // Función para manejar pegado directo
  const manejarPegado = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    if (!paste) return;

    try {
      const nuevosRegistros = procesarDatosPegados(paste);
      
      if (nuevosRegistros.length === 0) {
        setMensaje('⚠️ No se pudieron procesar los datos pegados');
        setTimeout(() => setMensaje(""), 2000);
        return;
      }

      setRows(prev => [...prev, ...nuevosRegistros]);
      setMensaje(`✅ Se agregaron ${nuevosRegistros.length} registros desde pegado directo`);
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error('Error al procesar datos:', error);
      setMensaje('❌ Error al procesar los datos pegados');
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  // Función para pegar datos masivos desde el textarea
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

      setRows(prev => [...prev, ...nuevosRegistros]);
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

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <div className="p-4 bg-gray-900 text-gray-200 min-h-screen">
      <div className="w-full max-w-none mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">🚀 Excel Grid (Tabla Personalizada)</h1>
            <p className="text-gray-400 mt-1">
              Grid personalizado 100% compatible con React 19. Usa "Pegar Datos Masivos" para agregar datos desde correos.
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
            <div className="ml-auto text-sm text-gray-400 flex items-center">
              💡 <strong>Navegación:</strong> Flechas para moverse | Enter para editar | Esc para cancelar
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
                <li>• <strong>Genérico:</strong> Datos separados por tabulaciones</li>
              </ul>
            </div>

            <textarea
              value={datosParaPegar}
              onChange={(e) => setDatosParaPegar(e.target.value)}
              onPaste={manejarPegado}
              placeholder="Pega aquí el contenido completo del correo de aclaración (o presiona Ctrl+V para pegado automático)..."
              className="w-full h-32 p-3 bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono text-sm"
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
            </div>
          </div>
        )}

        {/* Grid Container */}
        <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 350px)' }}>
          <SimpleDataGrid
            columns={columns}
            rows={rows}
            onRowsChange={setRows}
            selectedRows={selectedRows}
            onRowSelection={handleRowSelection}
            onSelectAll={handleSelectAll}
            onBulkDelete={handleBulkDelete}
            onClearSelection={handleClearSelection}
          />
        </div>

        {/* Footer con estadísticas */}
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between text-sm text-gray-400">
            <div>
              Total de registros: <span className="text-blue-400 font-semibold">{rows.length}</span>
            </div>
            <div>
              Última actualización: <span className="text-blue-400 font-semibold">{new Date().toLocaleString('es-ES')}</span>
            </div>
            <div>
              <span className="text-green-400">✅ Compatible con React 19</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
