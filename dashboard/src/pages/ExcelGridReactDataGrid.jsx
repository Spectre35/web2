import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Custom Table Component - más simple y compatible
function SimpleDataGrid({ columns, rows, onRowsChange }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleCellClick = (rowIndex, columnKey) => {
    setEditingCell({ rowIndex, columnKey });
    setEditValue(rows[rowIndex][columnKey] || '');
  };

  const handleCellChange = (value) => {
    setEditValue(value);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const newRows = [...rows];
      const { rowIndex, columnKey } = editingCell;
      const column = columns.find(col => col.key === columnKey);
      
      let finalValue = editValue;
      
      // Apply type conversion based on column type
      if (column?.type === 'number') {
        finalValue = parseFloat(editValue) || 0;
      }
      
      newRows[rowIndex] = { ...newRows[rowIndex], [columnKey]: finalValue };
      onRowsChange(newRows);
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const isEditing = (rowIndex, columnKey) => {
    return editingCell?.rowIndex === rowIndex && editingCell?.columnKey === columnKey;
  };

  const renderCell = (row, column, rowIndex) => {
    const isCurrentlyEditing = isEditing(rowIndex, column.key);
    const value = row[column.key] || '';
    
    if (isCurrentlyEditing) {
      if (column.type === 'select') {
        return (
          <select
            value={editValue}
            onChange={(e) => handleCellChange(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-full bg-gray-600 text-white border-none outline-none px-2 py-1"
          >
            <option value="">Seleccionar...</option>
            {column.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      } else if (column.type === 'date') {
        return (
          <input
            type="date"
            value={editValue}
            onChange={(e) => handleCellChange(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-full bg-gray-600 text-white border-none outline-none px-2 py-1"
          />
        );
      } else if (column.type === 'number') {
        return (
          <input
            type="number"
            value={editValue}
            onChange={(e) => handleCellChange(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-full bg-gray-600 text-white border-none outline-none px-2 py-1 text-right"
          />
        );
      } else {
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => handleCellChange(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-full bg-gray-600 text-white border-none outline-none px-2 py-1"
          />
        );
      }
    }

    // Display mode
    let displayValue = value;
    
    if (column.type === 'number' && value) {
      displayValue = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } else if (column.type === 'date' && value) {
      displayValue = new Date(value).toLocaleDateString('es-ES');
    }

    return (
      <div
        onClick={() => handleCellClick(rowIndex, column.key)}
        className="w-full h-full px-2 py-1 cursor-pointer hover:bg-gray-600 flex items-center justify-between"
        style={{ 
          textAlign: column.type === 'number' ? 'right' : 'left',
          backgroundColor: column.key === 'id' ? '#374151' : 'transparent' 
        }}
      >
        <span className="truncate">{displayValue}</span>
        {column.type === 'select' && (
          <span className="text-blue-400 text-xs ml-1">▼</span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-auto bg-gray-700 rounded-lg">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border border-gray-600 px-2 py-2 text-left text-gray-200 font-medium text-sm bg-gray-800"
                style={{ width: column.width || 120, minWidth: column.width || 120 }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              className="hover:bg-gray-600 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={`${row.id}-${column.key}`}
                  className="border border-gray-600 p-0 text-gray-200 text-sm h-9"
                  style={{ width: column.width || 120, minWidth: column.width || 120 }}
                >
                  {renderCell(row, column, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExcelGridReactDataGrid() {
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

  // Definición de columnas simplificada
  const columns = useMemo(() => [
    {
      key: 'id',
      name: 'ID',
      width: 80,
      type: 'readonly'
    },
    {
      key: 'PROCESADOR',
      name: 'Procesador',
      width: 120,
      type: 'select',
      options: ['EFEVOO', 'BSD', 'CREDOMATIC']
    },
    {
      key: 'AÑO',
      name: 'Año',
      width: 80,
      type: 'text'
    },
    {
      key: 'MES_PETICION',
      name: 'Mes Petición',
      width: 120,
      type: 'select',
      options: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
    },
    {
      key: 'EUROSKIN',
      name: 'EuroSkin',
      width: 100,
      type: 'select',
      options: ['true', 'false']
    },
    {
      key: 'ID_DEL_COMERCIO_AFILIACION',
      name: 'ID Comercio/Afiliación',
      width: 180,
      type: 'text'
    },
    {
      key: 'NOMBRE_DEL_COMERCIO',
      name: 'Nombre del Comercio',
      width: 200,
      type: 'text'
    },
    {
      key: 'ID_DE_TRANSACCION',
      name: 'ID Transacción',
      width: 150,
      type: 'text'
    },
    {
      key: 'FECHA_VENTA',
      name: 'Fecha Venta',
      width: 120,
      type: 'date'
    },
    {
      key: 'MONTO',
      name: 'Monto',
      width: 120,
      type: 'number'
    },
    {
      key: 'NUM_DE_TARJETA',
      name: 'Número de Tarjeta',
      width: 150,
      type: 'text'
    },
    {
      key: 'AUTORIZACION',
      name: 'Autorización',
      width: 120,
      type: 'text'
    },
    {
      key: 'CLIENTE',
      name: 'Cliente',
      width: 150,
      type: 'text'
    },
    {
      key: 'VENDEDORA',
      name: 'Vendedora',
      width: 150,
      type: 'text'
    },
    {
      key: 'SUCURSAL',
      name: 'Sucursal',
      width: 150,
      type: 'text'
    },
    {
      key: 'FECHA_CONTRATO',
      name: 'Fecha Contrato',
      width: 130,
      type: 'date'
    },
    {
      key: 'PAQUETE',
      name: 'Paquete',
      width: 120,
      type: 'text'
    },
    {
      key: 'BLOQUE',
      name: 'Bloque',
      width: 100,
      type: 'text'
    },
    {
      key: 'FECHA_DE_PETICION',
      name: 'Fecha Petición',
      width: 130,
      type: 'date'
    },
    {
      key: 'FECHA_DE_RESPUESTA',
      name: 'Fecha Respuesta',
      width: 130,
      type: 'date'
    },
    {
      key: 'COMENTARIOS',
      name: 'Comentarios',
      width: 200,
      type: 'text'
    },
    {
      key: 'CAPTURA_CC',
      name: 'Captura CC',
      width: 120,
      type: 'select',
      options: ['EN PROCESO', 'GANADA', 'PERDIDA']
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
          <SimpleDataGrid
            columns={columns}
            rows={rows}
            onRowsChange={setRows}
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
