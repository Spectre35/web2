import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../scrollbar-styles.css";

// Componente de Grid estilo Excel
const ExcelGrid = ({ data, columns, onDataChange, onCellChange, selectOptions = {} }) => {
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const gridRef = useRef(null);
  const inputRef = useRef(null);

  // Manejar inicio de arrastre para selección
  const handleMouseDown = (rowIdx, colIdx, event) => {
    if (event.shiftKey && selectedCell) {
      // Selección de rango con Shift+Click
      setSelectedRange({
        start: selectedCell,
        end: { row: rowIdx, col: colIdx }
      });
      setSelectedCells(new Set());
    } else if (event.ctrlKey) {
      // Selección múltiple con Ctrl+Click
      const cellKey = `${rowIdx}-${colIdx}`;
      const newSelectedCells = new Set(selectedCells);
      
      if (newSelectedCells.has(cellKey)) {
        newSelectedCells.delete(cellKey);
      } else {
        newSelectedCells.add(cellKey);
      }
      
      setSelectedCells(newSelectedCells);
      setSelectedCell({ row: rowIdx, col: colIdx });
      setSelectedRange(null);
    } else {
      // Selección normal
      setSelectedCell({ row: rowIdx, col: colIdx });
      setSelectedRange(null);
      setSelectedCells(new Set([`${rowIdx}-${colIdx}`]));
      setIsEditing(false);
      setIsDragging(true);
    }
  };

  // Manejar movimiento del mouse durante arrastre
  const handleMouseEnter = (rowIdx, colIdx) => {
    if (isDragging && selectedCell) {
      setSelectedRange({
        start: selectedCell,
        end: { row: rowIdx, col: colIdx }
      });
    }
  };

  // Finalizar arrastre
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Manejar copiar/pegar
  const handleCopy = () => {
    if (!selectedCell && !selectedRange && selectedCells.size === 0) return;
    
    let textToCopy = '';
    
    if (selectedCells.size > 1) {
      // Múltiples celdas seleccionadas con Ctrl+Click
      const cellsArray = Array.from(selectedCells);
      
      // Agrupar por filas para mantener la estructura
      const rowGroups = {};
      cellsArray.forEach(cellKey => {
        const [row, col] = cellKey.split('-').map(Number);
        if (!rowGroups[row]) rowGroups[row] = [];
        rowGroups[row].push({ row, col, value: data[row][columns[col]] || '' });
      });
      
      // Ordenar filas y columnas
      const sortedRows = Object.keys(rowGroups).sort((a, b) => a - b);
      
      sortedRows.forEach((rowKey, index) => {
        const cells = rowGroups[rowKey].sort((a, b) => a.col - b.col);
        const rowData = cells.map(cell => cell.value);
        textToCopy += rowData.join('\t');
        if (index < sortedRows.length - 1) textToCopy += '\n';
      });
      
    } else if (selectedRange) {
      // Rango seleccionado
      const { start, end } = selectedRange;
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      
      for (let row = minRow; row <= maxRow; row++) {
        const rowData = [];
        for (let col = minCol; col <= maxCol; col++) {
          rowData.push(data[row][columns[col]] || '');
        }
        textToCopy += rowData.join('\t');
        if (row < maxRow) textToCopy += '\n';
      }
      
    } else if (selectedCell) {
      // Celda individual
      textToCopy = data[selectedCell.row][columns[selectedCell.col]] || '';
    }
    
    navigator.clipboard.writeText(textToCopy);
  };

  // Manejar pegar
  const handlePaste = async () => {
    if (!selectedCell) return;
    
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').map(row => row.split('\t'));
      
      let newData = [...data];
      
      for (let i = 0; i < rows.length; i++) {
        const targetRow = selectedCell.row + i;
        if (targetRow >= newData.length) break;
        
        for (let j = 0; j < rows[i].length; j++) {
          const targetCol = selectedCell.col + j;
          if (targetCol >= columns.length) break;
          
          newData[targetRow][columns[targetCol]] = rows[i][j];
        }
      }
      
      onDataChange(newData);
    } catch (error) {
      console.error('Error al pegar:', error);
    }
  };

  // Manejar doble click para editar
  const handleCellDoubleClick = (rowIdx, colIdx) => {
    setSelectedCell({ row: rowIdx, col: colIdx });
    setIsEditing(true);
    setEditValue(data[rowIdx][columns[colIdx]] || '');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Manejar teclas
  const handleKeyDown = (event) => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    
    // Atajos de teclado con Ctrl
    if (event.ctrlKey) {
      switch (event.key.toLowerCase()) {
        case 'c':
          event.preventDefault();
          handleCopy();
          return;
        case 'v':
          event.preventDefault();
          handlePaste();
          return;
        case 'a':
          event.preventDefault();
          setSelectedRange({
            start: { row: 0, col: 0 },
            end: { row: data.length - 1, col: columns.length - 1 }
          });
          return;
      }
    }
    
    switch (event.key) {
      case 'Enter':
        if (isEditing) {
          commitEdit();
        } else {
          setIsEditing(true);
          setEditValue(data[row][columns[col]] || '');
          setTimeout(() => inputRef.current?.focus(), 0);
        }
        break;
      
      case 'Escape':
        if (isEditing) {
          setIsEditing(false);
          setEditValue('');
        }
        break;
      
      case 'Delete':
      case 'Backspace':
        if (!isEditing) {
          if (selectedRange) {
            // Borrar rango seleccionado
            const { start, end } = selectedRange;
            const minRow = Math.min(start.row, end.row);
            const maxRow = Math.max(start.row, end.row);
            const minCol = Math.min(start.col, end.col);
            const maxCol = Math.max(start.col, end.col);
            
            const newData = [...data];
            for (let r = minRow; r <= maxRow; r++) {
              for (let c = minCol; c <= maxCol; c++) {
                newData[r][columns[c]] = '';
              }
            }
            onDataChange(newData);
          } else {
            // Borrar celda actual
            const newData = [...data];
            newData[row][columns[col]] = '';
            onDataChange(newData);
          }
        }
        break;
      
      case 'F2':
        setIsEditing(true);
        setEditValue(data[row][columns[col]] || '');
        setTimeout(() => inputRef.current?.focus(), 0);
        break;
      
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          // Mover hacia la izquierda
          const newCol = col > 0 ? col - 1 : columns.length - 1;
          const newRow = col === 0 ? (row > 0 ? row - 1 : data.length - 1) : row;
          setSelectedCell({ row: newRow, col: newCol });
        } else {
          // Mover hacia la derecha
          const newCol = col < columns.length - 1 ? col + 1 : 0;
          const newRow = col === columns.length - 1 ? (row < data.length - 1 ? row + 1 : 0) : row;
          setSelectedCell({ row: newRow, col: newCol });
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (row > 0) setSelectedCell({ row: row - 1, col });
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (row < data.length - 1) setSelectedCell({ row: row + 1, col });
        break;
      
      case 'ArrowLeft':
        event.preventDefault();
        if (col > 0) setSelectedCell({ row, col: col - 1 });
        break;
      
      case 'ArrowRight':
        event.preventDefault();
        if (col < columns.length - 1) setSelectedCell({ row, col: col + 1 });
        break;
    }
  };

  // Confirmar edición
  const commitEdit = () => {
    if (selectedCell && isEditing) {
      const newData = [...data];
      newData[selectedCell.row][columns[selectedCell.col]] = editValue;
      onDataChange(newData);
      onCellChange?.(selectedCell.row, selectedCell.col, editValue);
    }
    setIsEditing(false);
    setEditValue('');
  };

  // Verificar si una celda está seleccionada
  const isCellSelected = (rowIdx, colIdx) => {
    // Verificar si está en celdas seleccionadas múltiples
    if (selectedCells.has(`${rowIdx}-${colIdx}`)) {
      return true;
    }
    
    // Verificar si está en el rango seleccionado
    if (selectedRange) {
      const { start, end } = selectedRange;
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      return rowIdx >= minRow && rowIdx <= maxRow && colIdx >= minCol && colIdx <= maxCol;
    }
    
    // Verificar si es la celda actualmente seleccionada
    return selectedCell && selectedCell.row === rowIdx && selectedCell.col === colIdx;
  };

  // Renderizar celda
  const renderCell = (rowIdx, colIdx, column) => {
    const value = data[rowIdx][column] || '';
    const isSelected = isCellSelected(rowIdx, colIdx);
    const isCurrentCell = selectedCell && selectedCell.row === rowIdx && selectedCell.col === colIdx;
    const isEditingThis = isEditing && isCurrentCell;
    const isMultiSelected = selectedCells.has(`${rowIdx}-${colIdx}`) && selectedCells.size > 1;
    
    // Determinar el tipo de input basado en la columna
    const options = selectOptions[column];
    
    let cellContent;
    if (isEditingThis) {
      if (options) {
        cellContent = (
          <select
            ref={inputRef}
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
            className="w-full h-full bg-white text-black border-0 outline-none"
            size="1"
          >
            <option value="">Selecciona...</option>
            {options.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );
      } else {
        cellContent = (
          <input
            ref={inputRef}
            type="text"
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
            className="w-full h-full bg-white text-black border-0 outline-none"
          />
        );
      }
    } else if (options && value) {
      cellContent = (
        <input
          type="text"
          value={value}
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
          className="w-full h-full bg-transparent text-gray-200 border-0 outline-none cursor-pointer"
          readOnly
        />
      );
    } else {
      cellContent = (
        <div className="w-full h-full p-1 text-gray-200 truncate">
          {value}
        </div>
      );
    }

    return (
      <td
        key={`${rowIdx}-${colIdx}`}
        className={`
          border border-gray-600 cursor-pointer h-8 min-w-[100px] relative
          ${isSelected 
            ? isMultiSelected 
              ? 'bg-green-500 bg-opacity-40' 
              : 'bg-blue-500 bg-opacity-50' 
            : 'bg-gray-800 hover:bg-gray-700'
          }
          ${isCurrentCell ? 'border-blue-400 border-2' : ''}
        `}
        onMouseDown={(e) => handleMouseDown(rowIdx, colIdx, e)}
        onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
        onMouseUp={handleMouseUp}
        onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
      >
        {cellContent}
      </td>
    );
  };

  // Efecto para manejar eventos de teclado globales
  useEffect(() => {
    const handleKeyDownGlobal = (event) => {
      if (gridRef.current && gridRef.current.contains(document.activeElement)) {
        handleKeyDown(event);
      }
    };

    document.addEventListener('keydown', handleKeyDownGlobal);
    return () => document.removeEventListener('keydown', handleKeyDownGlobal);
  }, [selectedCell, isEditing, editValue, data, columns]);

  return (
    <div 
      ref={gridRef}
      className="bg-gray-800 rounded-lg shadow overflow-hidden mb-4 focus:outline-none"
      tabIndex={0}
    >
      <div className="overflow-auto max-h-[600px] custom-scrollbar">
        <table className="border-collapse border border-gray-600">
          <thead className="bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="border border-gray-600 px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700 min-w-[50px]">
                #
              </th>
              {columns.map((col, colIdx) => (
                <th 
                  key={col} 
                  className="border border-gray-600 px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700 min-w-[100px]"
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
              <th className="border border-gray-600 px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700 min-w-[80px]">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="border border-gray-600 px-3 py-2 text-sm text-gray-300 bg-gray-700 font-medium">
                  {rowIdx + 1}
                </td>
                {columns.map((col, colIdx) => renderCell(rowIdx, colIdx, col))}
                <td className="border border-gray-600 px-3 py-2 text-sm text-gray-300 bg-gray-800">
                  <button
                    onClick={() => {
                      const newData = data.filter((_, i) => i !== rowIdx);
                      onDataChange(newData);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                    title="Eliminar fila"
                  >
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Información de selección */}
      {selectedCell && (
        <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-t border-gray-600">
          Celda seleccionada: Fila {selectedCell.row + 1}, {columns[selectedCell.col]} 
          {selectedRange && (
            <span className="ml-4">
              Rango: {selectedRange.start.row + 1},{selectedRange.start.col + 1} - {selectedRange.end.row + 1},{selectedRange.end.col + 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const SelectEditor = React.memo(({ value, onChange, options, className = "" }) => {
  return (
    <select
      className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      style={{ maxHeight: '200px' }}
    >
      <option value="">Selecciona...</option>
      {options.map((opt, index) => (
        <option key={`${opt}-${index}`} value={opt}>{opt}</option>
      ))}
    </select>
  );
});
