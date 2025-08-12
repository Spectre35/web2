import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../scrollbar-styles.css";

// Componente de Grid estilo Excel - VERSIÓN SIMPLIFICADA
const ExcelGrid = ({ data, columns, onDataChange, onCellChange, selectOptions = {} }) => {
  const [selectedCell, setSelectedCell] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  // Función simple para convertir fechas
  const convertDateFormat = (dateValue, toInputFormat = false) => {
    if (!dateValue) return '';
    
    if (toInputFormat) {
      // Convertir de DD/MM/YYYY a YYYY-MM-DD para input date
      if (dateValue.includes('/')) {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      return dateValue;
    } else {
      // Convertir de YYYY-MM-DD a DD/MM/YYYY para display
      if (dateValue.includes('-')) {
        const parts = dateValue.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
      }
      return dateValue;
    }
  };

  // Iniciar edición
  const startEdit = (rowIdx, colIdx) => {
    const column = columns[colIdx];
    const options = selectOptions[column];
    const isDateField = column.includes('FECHA');
    
    // Solo entrar en modo edición para campos de texto (no dropdowns ni fechas)
    if (!options && !isDateField) {
      setSelectedCell({ row: rowIdx, col: colIdx });
      setIsEditing(true);
      setEditValue(data[rowIdx][column] || '');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // Confirmar edición
  const commitEdit = () => {
    if (selectedCell && isEditing) {
      onCellChange(selectedCell.row, selectedCell.col, editValue);
    }
    setIsEditing(false);
    setEditValue('');
  };

  // Manejar teclas
  const handleKeyDown = (event) => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;

    switch (event.key) {
      case 'Enter':
        if (isEditing) {
          commitEdit();
        } else {
          startEdit(row, col);
        }
        break;
      
      case 'Escape':
        if (isEditing) {
          setIsEditing(false);
          setEditValue('');
        }
        break;
      
      case 'F2':
        if (!isEditing) {
          startEdit(row, col);
        }
        break;

      case 'ArrowUp':
        if (!isEditing && row > 0) {
          setSelectedCell({ row: row - 1, col });
        }
        break;
      
      case 'ArrowDown':
        if (!isEditing && row < data.length - 1) {
          setSelectedCell({ row: row + 1, col });
        }
        break;
      
      case 'ArrowLeft':
        if (!isEditing && col > 0) {
          setSelectedCell({ row, col: col - 1 });
        }
        break;
      
      case 'ArrowRight':
        if (!isEditing && col < columns.length - 1) {
          setSelectedCell({ row, col: col + 1 });
        }
        break;
    }
  };

  // Renderizar celda - SIMPLIFICADO
  const renderCell = (rowIdx, colIdx, column) => {
    const value = data[rowIdx][column] || '';
    const isSelected = selectedCell && selectedCell.row === rowIdx && selectedCell.col === colIdx;
    const isEditingThis = isEditing && isSelected;
    const options = selectOptions[column];
    
    let cellContent;
    
    if (options) {
      // Dropdown directo
      cellContent = (
        <select
          value={value}
          onChange={(e) => {
            const newData = [...data];
            newData[rowIdx][column] = e.target.value;
            onDataChange(newData);
            onCellChange?.(rowIdx, colIdx, e.target.value);
          }}
          onFocus={() => setSelectedCell({ row: rowIdx, col: colIdx })}
          className={`w-full h-full border-0 outline-none cursor-pointer ${
            isSelected ? 'bg-blue-500 bg-opacity-50 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
        >
          <option value="">Selecciona...</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      );
    } else if (column.includes('FECHA')) {
      // Fecha directa
      cellContent = (
        <input
          type="date"
          value={convertDateFormat(value, true)}
          onChange={(e) => {
            const newData = [...data];
            newData[rowIdx][column] = convertDateFormat(e.target.value, false);
            onDataChange(newData);
            onCellChange?.(rowIdx, colIdx, convertDateFormat(e.target.value, false));
          }}
          onFocus={() => setSelectedCell({ row: rowIdx, col: colIdx })}
          className={`w-full h-full border-0 outline-none cursor-pointer px-2 ${
            isSelected ? 'bg-blue-500 bg-opacity-50 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
        />
      );
    } else if (isEditingThis) {
      // Campo de texto en edición
      cellContent = (
        <input
          ref={inputRef}
          type={column === 'MONTO' ? 'number' : 'text'}
          step={column === 'MONTO' ? '0.01' : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitEdit();
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setEditValue('');
            }
          }}
          className="w-full h-full border-0 outline-none px-1 bg-white text-black"
        />
      );
    } else {
      // Campo normal
      cellContent = (
        <div className="w-full h-full px-2 py-1 overflow-hidden text-ellipsis whitespace-nowrap cursor-text">
          {value || '\u00A0'}
        </div>
      );
    }

    return (
      <td
        key={`${rowIdx}-${colIdx}`}
        className={`border border-gray-600 cursor-pointer h-8 min-w-[100px] relative ${
          isSelected ? 'bg-blue-500 bg-opacity-50' : 'bg-gray-800 hover:bg-gray-700'
        }`}
        onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
        onDoubleClick={() => startEdit(rowIdx, colIdx)}
      >
        {cellContent}
      </td>
    );
  };

  // Event listener simple
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      handleKeyDown(e);
    };

    document.addEventListener('keydown', handleKeyDownGlobal);
    return () => document.removeEventListener('keydown', handleKeyDownGlobal);
  }, [selectedCell, isEditing, editValue]);

  return (
    <div className="overflow-auto max-h-[500px] border border-gray-600 bg-gray-900">
      <table className="w-full table-fixed">
        <thead className="sticky top-0 bg-gray-700">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                className="border border-gray-600 px-2 py-2 text-left text-gray-200 text-sm font-medium min-w-[100px]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((column, colIdx) => renderCell(rowIdx, colIdx, column))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const IngresarAclaraciones = () => {
  const navigate = useNavigate();
  const [bloques, setBloques] = useState([]);
  const [bloquesOriginales, setBloquesOriginales] = useState([]);
  const [aclaraciones, setAclaraciones] = useState([]);
  const [currentBloque, setCurrentBloque] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAclaraciones, setFilterAclaraciones] = useState("todas");
  const [clientes, setClientes] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [tiposProducto, setTiposProducto] = useState([]);

  // Estado para grid
  const [gridData, setGridData] = useState([]);
  const [columns] = useState([
    'FECHA_CONSIGNACION',
    'NIT',
    'CLIENTE',
    'CIUDAD',
    'OBSERVACIONES',
    'FECHA_FACTURABLE',
    'TIPO_PRODUCTO',
    'MONTO',
    'FECHA_PAGO_TEORICA'
  ]);

  // Opciones para campos select
  const selectOptions = {
    'CLIENTE': clientes,
    'CIUDAD': ciudades,
    'TIPO_PRODUCTO': tiposProducto
  };

  // Funciones de carga de datos
  const cargarBloques = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/aclaraciones/bloques`);
      setBloques(response.data);
      setBloquesOriginales(response.data);
    } catch (error) {
      console.error('Error al cargar bloques:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarAclaraciones = async (bloqueId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/aclaraciones/bloque/${bloqueId}`);
      setAclaraciones(response.data);
      setGridData(response.data.map(acl => ({
        id: acl.ID,
        FECHA_CONSIGNACION: acl.FECHA_CONSIGNACION || '',
        NIT: acl.NIT || '',
        CLIENTE: acl.CLIENTE || '',
        CIUDAD: acl.CIUDAD || '',
        OBSERVACIONES: acl.OBSERVACIONES || '',
        FECHA_FACTURABLE: acl.FECHA_FACTURABLE || '',
        TIPO_PRODUCTO: acl.TIPO_PRODUCTO || '',
        MONTO: acl.MONTO || '',
        FECHA_PAGO_TEORICA: acl.FECHA_PAGO_TEORICA || ''
      })));
    } catch (error) {
      console.error('Error al cargar aclaraciones:', error);
      setAclaraciones([]);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosApoyo = async () => {
    try {
      const [clientesRes, ciudadesRes, tiposRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/general/clientes`),
        axios.get(`${API_BASE_URL}/general/ciudades`),
        axios.get(`${API_BASE_URL}/general/tipos-producto`)
      ]);
      setClientes(clientesRes.data);
      setCiudades(ciudadesRes.data);
      setTiposProducto(tiposRes.data);
    } catch (error) {
      console.error('Error al cargar datos de apoyo:', error);
    }
  };

  // Manejar cambios en el grid
  const handleDataChange = (newData) => {
    setGridData(newData);
  };

  const handleCellChange = (rowIndex, colIndex, newValue) => {
    const column = columns[colIndex];
    const newData = [...gridData];
    newData[rowIndex][column] = newValue;
    setGridData(newData);
  };

  // Guardar cambios
  const guardarCambios = async () => {
    if (!currentBloque) return;

    setLoading(true);
    try {
      const aclaracionesParaGuardar = gridData.map(row => ({
        ID: row.id,
        ID_BLOQUE: currentBloque.ID,
        FECHA_CONSIGNACION: row.FECHA_CONSIGNACION,
        NIT: row.NIT,
        CLIENTE: row.CLIENTE,
        CIUDAD: row.CIUDAD,
        OBSERVACIONES: row.OBSERVACIONES,
        FECHA_FACTURABLE: row.FECHA_FACTURABLE,
        TIPO_PRODUCTO: row.TIPO_PRODUCTO,
        MONTO: parseFloat(row.MONTO) || 0,
        FECHA_PAGO_TEORICA: row.FECHA_PAGO_TEORICA
      }));

      await axios.put(`${API_BASE_URL}/aclaraciones/bloque/${currentBloque.ID}`, {
        aclaraciones: aclaracionesParaGuardar
      });

      alert('Cambios guardados exitosamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  // Efectos
  useEffect(() => {
    cargarBloques();
    cargarDatosApoyo();
  }, []);

  // Filtros
  const bloquesFiltrados = bloques.filter(bloque => {
    const matchesSearch = bloque.NOMBRE_BLOQUE.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterAclaraciones === "todas" ||
      (filterAclaraciones === "pendientes" && bloque.ESTADO === "PENDIENTE") ||
      (filterAclaraciones === "completadas" && bloque.ESTADO === "COMPLETADO");
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ingresar Aclaraciones</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Volver al Dashboard
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Buscar bloque..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
        />
        <select
          value={filterAclaraciones}
          onChange={(e) => setFilterAclaraciones(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
        >
          <option value="todas">Todas</option>
          <option value="pendientes">Pendientes</option>
          <option value="completadas">Completadas</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de bloques */}
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Bloques de Aclaraciones</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {bloquesFiltrados.map((bloque) => (
                <div
                  key={bloque.ID}
                  onClick={() => {
                    setCurrentBloque(bloque);
                    cargarAclaraciones(bloque.ID);
                  }}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    currentBloque?.ID === bloque.ID
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <h3 className="font-medium">{bloque.NOMBRE_BLOQUE}</h3>
                  <p className="text-sm text-gray-300">
                    Estado: {bloque.ESTADO} | Aclaraciones: {bloque.TOTAL_ACLARACIONES}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grid de aclaraciones */}
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {currentBloque ? `Aclaraciones - ${currentBloque.NOMBRE_BLOQUE}` : 'Selecciona un bloque'}
            </h2>
            {currentBloque && (
              <button
                onClick={guardarCambios}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            )}
          </div>

          {currentBloque && gridData.length > 0 ? (
            <ExcelGrid
              data={gridData}
              columns={columns}
              onDataChange={handleDataChange}
              onCellChange={handleCellChange}
              selectOptions={selectOptions}
            />
          ) : (
            <p className="text-gray-400">Selecciona un bloque para ver las aclaraciones</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IngresarAclaraciones;
