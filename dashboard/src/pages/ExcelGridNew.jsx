import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataGrid from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Custom Select Editor for dropdowns
function SelectEditor({ row, column, onRowChange, onClose }) {
  const { options } = column;
  
  return (
    <select
      value={row[column.key] || ''}
      onChange={(e) => {
        onRowChange({ ...row, [column.key]: e.target.value });
      }}
      onBlur={() => onClose(true)}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        backgroundColor: '#374151',
        color: '#f9fafb',
        fontSize: '14px',
        padding: '0 8px'
      }}
    >
      <option value="">Seleccionar...</option>
      {options?.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

// Number Editor for currency
function NumberEditor({ row, column, onRowChange, onClose }) {
  const [value, setValue] = useState(row[column.key] || '');

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const numValue = parseFloat(value) || 0;
        onRowChange({ ...row, [column.key]: numValue });
        onClose(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const numValue = parseFloat(value) || 0;
          onRowChange({ ...row, [column.key]: numValue });
          onClose(true);
        } else if (e.key === 'Escape') {
          onClose(false);
        }
      }}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        backgroundColor: '#374151',
        color: '#f9fafb',
        fontSize: '14px',
        padding: '0 8px',
        textAlign: 'right'
      }}
    />
  );
}

// Date Editor
function DateEditor({ row, column, onRowChange, onClose }) {
  const [value, setValue] = useState(row[column.key] || '');

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        onRowChange({ ...row, [column.key]: value });
        onClose(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onRowChange({ ...row, [column.key]: value });
          onClose(true);
        } else if (e.key === 'Escape') {
          onClose(false);
        }
      }}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        backgroundColor: '#374151',
        color: '#f9fafb',
        fontSize: '14px',
        padding: '0 8px'
      }}
    />
  );
}

// Currency Formatter
const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export default function ExcelGridNew() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarAreaPegado, setMostrarAreaPegado] = useState(false);
  const [datosParaPegar, setDatosParaPegar] = useState("");

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

  // Definición de columnas
  const columns = useMemo(() => [
    {
      key: 'id',
      name: 'ID',
      width: 80,
      frozen: true,
      resizable: false,
      renderCell: ({ row }) => (
        <div style={{ padding: '8px', backgroundColor: '#374151', color: '#d1d5db' }}>
          {row.id}
        </div>
      )
    },
    {
      key: 'PROCESADOR',
      name: 'Procesador',
      width: 120,
      editor: SelectEditor,
      options: ['EFEVOO', 'BSD', 'CREDOMATIC'],
      renderCell: ({ row }) => (
        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{row.PROCESADOR || ''}</span>
          <span style={{ color: '#60a5fa', fontSize: '12px' }}>▼</span>
        </div>
      )
    },
    {
      key: 'AÑO',
      name: 'Año',
      width: 80,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.AÑO || ''}</div>
    },
    {
      key: 'MES_PETICION',
      name: 'Mes Petición',
      width: 120,
      editor: SelectEditor,
      options: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
      renderCell: ({ row }) => (
        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{row.MES_PETICION || ''}</span>
          <span style={{ color: '#60a5fa', fontSize: '12px' }}>▼</span>
        </div>
      )
    },
    {
      key: 'EUROSKIN',
      name: 'EuroSkin',
      width: 100,
      editor: SelectEditor,
      options: ['true', 'false'],
      renderCell: ({ row }) => (
        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{row.EUROSKIN || ''}</span>
          <span style={{ color: '#60a5fa', fontSize: '12px' }}>▼</span>
        </div>
      )
    },
    {
      key: 'ID_DEL_COMERCIO_AFILIACION',
      name: 'ID Comercio/Afiliación',
      width: 180,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.ID_DEL_COMERCIO_AFILIACION || ''}</div>
    },
    {
      key: 'NOMBRE_DEL_COMERCIO',
      name: 'Nombre del Comercio',
      width: 200,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.NOMBRE_DEL_COMERCIO || ''}</div>
    },
    {
      key: 'ID_DE_TRANSACCION',
      name: 'ID Transacción',
      width: 150,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.ID_DE_TRANSACCION || ''}</div>
    },
    {
      key: 'FECHA_VENTA',
      name: 'Fecha Venta',
      width: 120,
      editor: DateEditor,
      renderCell: ({ row }) => (
        <div style={{ padding: '8px' }}>
          {row.FECHA_VENTA ? new Date(row.FECHA_VENTA).toLocaleDateString('es-ES') : ''}
        </div>
      )
    },
    {
      key: 'MONTO',
      name: 'Monto',
      width: 120,
      editor: NumberEditor,
      renderCell: ({ row }) => (
        <div style={{ padding: '8px', textAlign: 'right' }}>
          {row.MONTO ? currencyFormatter.format(row.MONTO) : '0.00'}
        </div>
      )
    },
    {
      key: 'NUM_DE_TARJETA',
      name: 'Número de Tarjeta',
      width: 150,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.NUM_DE_TARJETA || ''}</div>
    },
    {
      key: 'AUTORIZACION',
      name: 'Autorización',
      width: 120,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.AUTORIZACION || ''}</div>
    },
    {
      key: 'CLIENTE',
      name: 'Cliente',
      width: 150,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.CLIENTE || ''}</div>
    },
    {
      key: 'VENDEDORA',
      name: 'Vendedora',
      width: 150,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.VENDEDORA || ''}</div>
    },
    {
      key: 'SUCURSAL',
      name: 'Sucursal',
      width: 150,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.SUCURSAL || ''}</div>
    },
    {
      key: 'FECHA_CONTRATO',
      name: 'Fecha Contrato',
      width: 130,
      editor: DateEditor,
      renderCell: ({ row }) => (
        <div style={{ padding: '8px' }}>
          {row.FECHA_CONTRATO ? new Date(row.FECHA_CONTRATO).toLocaleDateString('es-ES') : ''}
        </div>
      )
    },
    {
      key: 'PAQUETE',
      name: 'Paquete',
      width: 120,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.PAQUETE || ''}</div>
    },
    {
      key: 'BLOQUE',
      name: 'Bloque',
      width: 100,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.BLOQUE || ''}</div>
    },
    {
      key: 'FECHA_DE_PETICION',
      name: 'Fecha Petición',
      width: 130,
      editor: DateEditor,
      renderCell: ({ row }) => (
        <div style={{ padding: '8px' }}>
          {row.FECHA_DE_PETICION ? new Date(row.FECHA_DE_PETICION).toLocaleDateString('es-ES') : ''}
        </div>
      )
    },
    {
      key: 'FECHA_DE_RESPUESTA',
      name: 'Fecha Respuesta',
      width: 130,
      editor: DateEditor,
      renderCell: ({ row }) => (
        <div style={{ padding: '8px' }}>
          {row.FECHA_DE_RESPUESTA ? new Date(row.FECHA_DE_RESPUESTA).toLocaleDateString('es-ES') : ''}
        </div>
      )
    },
    {
      key: 'COMENTARIOS',
      name: 'Comentarios',
      width: 200,
      renderCell: ({ row }) => <div style={{ padding: '8px' }}>{row.COMENTARIOS || ''}</div>
    },
    {
      key: 'CAPTURA_CC',
      name: 'Captura CC',
      width: 120,
      editor: SelectEditor,
      options: ['EN PROCESO', 'GANADA', 'PERDIDA'],
      renderCell: ({ row }) => (
        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{row.CAPTURA_CC || ''}</span>
          <span style={{ color: '#60a5fa', fontSize: '12px' }}>▼</span>
        </div>
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

  // Función para procesar diferentes formatos de pegado
  const procesarDatosPegados = (texto) => {
    const rows = texto.split(/\r?\n/).filter(row => row.trim());
    if (rows.length === 0) return [];

    const nuevosRegistros = [];
    const mesActual = 'AGOSTO'; // Mes actual para agosto 2025
    const fechaActual = new Date().toISOString().split('T')[0];

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
        AÑO: new Date().getFullYear().toString(),
        MES_PETICION: mesActual,
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
      
      nuevosRegistros.push(newRow);
      return nuevosRegistros;
    }

    // Procesar otros formatos (EFEVOO, BSD, genérico)
    rows.forEach((linea) => {
      const datos = linea.split('\t').map(item => item.trim());
      
      if (datos.length >= 3) {
        const newRow = {
          id: Date.now() + Math.random(),
          PROCESADOR: "",
          AÑO: new Date().getFullYear().toString(),
          MES_PETICION: mesActual,
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
            <h1 className="text-3xl font-bold text-blue-400">🚀 Excel Grid (React Data Grid)</h1>
            <p className="text-gray-400 mt-1">
              Grid moderno compatible con React 19. Usa "Pegar Datos Masivos" para agregar datos desde correos.
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
              placeholder="Pega aquí el contenido completo del correo de aclaración..."
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
          <DataGrid
            columns={columns}
            rows={rows}
            onRowsChange={setRows}
            className="rdg-dark"
            style={{
              height: '100%',
              '--rdg-background-color': '#374151',
              '--rdg-header-background-color': '#1f2937',
              '--rdg-row-hover-background-color': '#4b5563',
              '--rdg-row-selected-background-color': '#3b82f6',
              '--rdg-border-color': '#6b7280',
              '--rdg-summary-border-color': '#6b7280',
              '--rdg-color': '#f9fafb',
              '--rdg-header-text-color': '#d1d5db',
              '--rdg-cell-frozen-background-color': '#1f2937'
            }}
            rowKeyGetter={(row) => row.id}
            enableVirtualization={true}
            rowHeight={35}
            headerRowHeight={40}
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Componente personalizado para select/dropdown
const SelectComponent = ({ active, rowData, setRowData, focus, stopEditing, columnData }) => {
  const { choices } = columnData;
  
  // Si está enfocado y activo, mostrar select nativo optimizado
  if (focus) {
    return (
      <select
        value={rowData || ''}
        onChange={(e) => {
          setRowData(e.target.value || null);
          setTimeout(() => stopEditing({ nextRow: false }), 0);
        }}
        onBlur={() => stopEditing({ nextRow: false })}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          color: 'inherit',
          padding: '0 4px'
        }}
        autoFocus
      >
        <option value="">Seleccionar...</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }

  // Si no está enfocado, mostrar solo el valor con una flecha
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      padding: '0 4px',
      background: 'transparent'
    }}>
      <span style={{ flex: 1 }}>
        {rowData || ''}
      </span>
      <div style={{ 
        fontSize: '10px',
        color: '#666',
        marginLeft: '4px'
      }}>
        ▼
      </div>
    </div>
  );
};

// Función para crear columna select reutilizable
const selectColumn = (choices) => ({
  component: SelectComponent,
  columnData: { choices },
  disableKeys: true,
  keepFocus: true,
  deleteValue: () => null,
  copyValue: ({ rowData }) => rowData || '',
  pasteValue: ({ value }) => {
    // Validar que el valor existe en las opciones
    return choices.includes(value) ? value : null;
  }
});

// Columna personalizada para montos con formato
const moneyColumn = createTextColumn({
  alignRight: true,
  continuousUpdates: false,
  parseUserInput: (value) => {
    if (!value || value === '') return 0;
    
    // Convertir a string si no lo es
    let str = value.toString();
    
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
  },
  formatBlurredInput: (value) => {
    if (value == null || value === '' || isNaN(value)) {
      return '';
    }
    const numero = parseFloat(value);
    if (!isNaN(numero)) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numero);
    }
    return value;
  },
  formatInputOnFocus: (value) => value?.toString() || '',
  formatForCopy: (value) => {
    if (value == null || value === '' || isNaN(value)) {
      return '';
    }
    return value.toString();
  }
});

export default function ExcelGridNew() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarAreaPegado, setMostrarAreaPegado] = useState(false);
  const [datosParaPegar, setDatosParaPegar] = useState("");

  // Definición de columnas usando React Datasheet Grid
  const columns = useMemo(() => [
    {
      ...keyColumn('id', textColumn),
      title: 'ID',
      minWidth: 80,
      maxWidth: 100,
      disabled: true
    },
    {
      ...keyColumn('PROCESADOR', selectColumn(['EFEVOO', 'BSD', 'CREDOMATIC'])),
      title: 'Procesador',
      minWidth: 120
    },
    {
      ...keyColumn('AÑO', createTextColumn({
        parseUserInput: (value) => value.toString(),
        formatBlurredInput: (value) => value
      })),
      title: 'Año',
      minWidth: 80
    },
    {
      ...keyColumn('MES_PETICION', selectColumn([
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
      ])),
      title: 'Mes Petición',
      minWidth: 120
    },
    {
      ...keyColumn('EUROSKIN', selectColumn(['true', 'false'])),
      title: 'EuroSkin',
      minWidth: 100
    },
    {
      ...keyColumn('ID_DEL_COMERCIO_AFILIACION', textColumn),
      title: 'ID Comercio/Afiliación',
      minWidth: 180
    },
    {
      ...keyColumn('NOMBRE_DEL_COMERCIO', textColumn),
      title: 'Nombre del Comercio',
      minWidth: 200
    },
    {
      ...keyColumn('ID_DE_TRANSACCION', textColumn),
      title: 'ID Transacción',
      minWidth: 150
    },
    {
      ...keyColumn('FECHA_VENTA', dateColumn),
      title: 'Fecha Venta',
      minWidth: 120
    },
    {
      ...keyColumn('MONTO', moneyColumn),
      title: 'Monto',
      minWidth: 100
    },
    {
      ...keyColumn('NUM_DE_TARJETA', textColumn),
      title: 'Número de Tarjeta',
      minWidth: 150
    },
    {
      ...keyColumn('AUTORIZACION', textColumn),
      title: 'Autorización',
      minWidth: 120
    },
    {
      ...keyColumn('CLIENTE', textColumn),
      title: 'Cliente',
      minWidth: 150
    },
    {
      ...keyColumn('VENDEDORA', textColumn),
      title: 'Vendedora',
      minWidth: 150
    },
    {
      ...keyColumn('SUCURSAL', textColumn),
      title: 'Sucursal',
      minWidth: 150
    },
    {
      ...keyColumn('FECHA_CONTRATO', dateColumn),
      title: 'Fecha Contrato',
      minWidth: 130
    },
    {
      ...keyColumn('PAQUETE', textColumn),
      title: 'Paquete',
      minWidth: 120
    },
    {
      ...keyColumn('BLOQUE', textColumn),
      title: 'Bloque',
      minWidth: 100
    },
    {
      ...keyColumn('FECHA_DE_PETICION', dateColumn),
      title: 'Fecha Petición',
      minWidth: 130
    },
    {
      ...keyColumn('FECHA_DE_RESPUESTA', dateColumn),
      title: 'Fecha Respuesta',
      minWidth: 130
    },
    {
      ...keyColumn('COMENTARIOS', textColumn),
      title: 'Comentarios',
      minWidth: 200
    },
    {
      ...keyColumn('CAPTURA_CC', selectColumn(['EN PROCESO', 'GANADA', 'PERDIDA'])),
      title: 'Captura CC',
      minWidth: 120
    }
  ], []);

  // Función para crear una fila por defecto
  const crearFilaPorDefecto = useCallback(() => ({
    id: data.length + 1,
    PROCESADOR: null,
    AÑO: '2025',
    MES_PETICION: 'AGOSTO',
    EUROSKIN: 'false',
    ID_DEL_COMERCIO_AFILIACION: '',
    NOMBRE_DEL_COMERCIO: '',
    ID_DE_TRANSACCION: '',
    FECHA_VENTA: new Date(),
    MONTO: 0,
    NUM_DE_TARJETA: '',
    AUTORIZACION: '',
    CLIENTE: '',
    VENDEDORA: '',
    SUCURSAL: '',
    FECHA_CONTRATO: null,
    PAQUETE: '',
    BLOQUE: '',
    FECHA_DE_PETICION: new Date(),
    FECHA_DE_RESPUESTA: null,
    COMENTARIOS: '',
    CAPTURA_CC: 'EN PROCESO'
  }), [data.length]);

  // Cargar datos desde la API
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/aclaraciones/obtener-todo`);
      const datos = response.data.map((item, index) => ({
        id: item.id || index + 1,
        ...item,
        // Convertir fechas string a objetos Date para React Datasheet Grid
        FECHA_VENTA: item.FECHA_VENTA ? new Date(item.FECHA_VENTA) : null,
        FECHA_CONTRATO: item.FECHA_CONTRATO ? new Date(item.FECHA_CONTRATO) : null,
        FECHA_DE_PETICION: item.FECHA_DE_PETICION ? new Date(item.FECHA_DE_PETICION) : null,
        FECHA_DE_RESPUESTA: item.FECHA_DE_RESPUESTA ? new Date(item.FECHA_DE_RESPUESTA) : null,
        // Asegurar que MONTO sea número
        MONTO: parseFloat(item.MONTO) || 0
      }));
      setData(datos.length > 0 ? datos : [crearFilaPorDefecto()]);
      setMensaje(datos.length > 0 
        ? `✅ Se cargaron ${datos.length} registros desde la base de datos`
        : '📋 Grid listo para recibir datos. Se agregó una fila por defecto'
      );
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setMensaje('📋 Grid listo para recibir datos. Se agregó una fila por defecto');
      setData([crearFilaPorDefecto()]);
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(""), 5000);
    }
  }, [crearFilaPorDefecto]);

  // Función para obtener el mes actual del sistema
  const obtenerMesActual = () => {
    const meses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const fechaActual = new Date();
    return meses[fechaActual.getMonth()];
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
    if (!fechaStr) return null;
    let fecha = fechaStr.replace(/[^\d\/\-]/g, '');
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
      const [dia, mes, anio] = fecha.split('/');
      return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    }
    if (/^\d{2}\-\d{2}\-\d{4}$/.test(fecha)) {
      const [dia, mes, anio] = fecha.split('-');
      return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    }
    return new Date(fecha);
  };

  // Función para procesar diferentes formatos de pegado (adaptada para React Datasheet Grid)
  const procesarDatosPegados = (texto) => {
    const rows = texto.split(/\r?\n/).filter(row => row.trim());
    if (rows.length === 0) return [];

    const nuevosRegistros = [];
    const mesActual = obtenerMesActual();
    const fechaActual = new Date();

    // Columnas base de aclaraciones
    const columnas = [
      "PROCESADOR", "AÑO", "MES_PETICION", "EUROSKIN", "ID_DEL_COMERCIO_AFILIACION",
      "NOMBRE_DEL_COMERCIO", "ID_DE_TRANSACCION", "FECHA_VENTA", "MONTO", "NUM_DE_TARJETA",
      "AUTORIZACION", "CLIENTE", "VENDEDORA", "SUCURSAL", "FECHA_CONTRATO", "PAQUETE",
      "BLOQUE", "FECHA_DE_PETICION", "FECHA_DE_RESPUESTA", "COMENTARIOS", "CAPTURA_CC"
    ];

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
      
      const newRow = {};
      columnas.forEach(col => {
        newRow[col] = obj[col] || (col === "MONTO" ? 0 : "");
      });
      
      newRow["PROCESADOR"] = "CREDOMATIC";
      newRow["EUROSKIN"] = "false";
      newRow["CAPTURA_CC"] = "EN PROCESO";
      newRow["AÑO"] = new Date().getFullYear().toString();
      newRow["MES_PETICION"] = mesActual;
      newRow["FECHA_DE_PETICION"] = fechaActual;
      newRow["id"] = data.length + nuevosRegistros.length + 1;
      
      nuevosRegistros.push(newRow);
      return nuevosRegistros;
    }

    // 2. DETECTAR FORMATO EFEVOO HORIZONTAL
    if (rows.length >= 2) {
      const headers = rows[0].split(/\t|\s{2,}/).map(h => h.trim().toUpperCase());
      const efevooHeaders = [
        "ID", "FOLIO", "CLIENTE", "SUCURSAL", "NÚMERO DE TARJETA", "MARCA DE TARJETA", 
        "TIPO DE TARJETA", "MÉTODO DE PAGO", "FECHA Y HORA", "MONTO", "NÚMERO DE AUTORIZACIÓN", "AFILIACIÓN"
      ];
      
      if (headers.some(h => efevooHeaders.includes(h))) {
        const dataRows = rows.slice(1);
        
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
        
        const mapeoDetectado = headers.map(h => efevooToCol[h] || h);
        
        dataRows.forEach(row => {
          const cells = row.split(/\t|\s{2,}/);
          const newRow = {};
          columnas.forEach(col => {
            newRow[col] = col === "MONTO" ? 0 : "";
          });
          
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
          newRow["id"] = data.length + nuevosRegistros.length + 1;
          
          nuevosRegistros.push(newRow);
        });
        
        return nuevosRegistros;
      }
    }

    // Formato genérico como fallback
    rows.forEach((linea) => {
      const datos = linea.split('\t').map(item => item.trim());
      
      if (datos.length >= 3) {
        const newRow = {};
        columnas.forEach(col => {
          newRow[col] = col === "MONTO" ? 0 : "";
        });
        
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
        newRow["id"] = data.length + nuevosRegistros.length + 1;
        
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

      setData(prev => [...prev, ...nuevosRegistros]);
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
            <h1 className="text-3xl font-bold text-blue-400">React Datasheet Grid - Aclaraciones</h1>
            <p className="text-gray-400 mt-1">
              Grid moderno estilo Excel/Google Sheets con React Datasheet Grid. Navegación optimizada y dropdowns nativos.
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
              onClick={() => setMostrarAreaPegado(!mostrarAreaPegado)}
              className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm"
            >
              📋 Pegar Datos Masivos
            </button>
            <div className="ml-auto text-sm text-gray-400 flex items-center">
              💡 <strong>Navegación:</strong> Flechas para moverse | Tab para siguiente | Enter para editar | F2 para editar | Shift+Enter para nueva fila
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
                <li>• <em>💡 Simplemente copia y pega el contenido completo del correo aquí</em></li>
              </ul>
            </div>

            <textarea
              value={datosParaPegar}
              onChange={(e) => setDatosParaPegar(e.target.value)}
              placeholder="Pega aquí el contenido completo del correo de aclaración..."
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

        {/* Grid Container - React Datasheet Grid */}
        <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 350px)' }}>
          <DataSheetGrid
            value={data}
            onChange={setData}
            columns={columns}
            createRow={crearFilaPorDefecto}
            duplicateRow={({ rowData }) => ({
              ...rowData,
              id: data.length + 1,
              FECHA_DE_PETICION: new Date()
            })}
            height={'100%'}
            style={{
              '--dsg-selection-border-color': '#60a5fa',
              '--dsg-selection-background-color': 'rgba(96, 165, 250, 0.1)',
              '--dsg-cell-background-color': '#374151',
              '--dsg-header-background-color': '#1f2937',
              '--dsg-border-color': '#4b5563',
              '--dsg-text-color': '#e5e7eb'
            }}
          />
        </div>

        {/* Footer con estadísticas */}
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between text-sm text-gray-400">
            <div>
              Total de registros: <span className="text-blue-400 font-semibold">{data.length}</span>
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
