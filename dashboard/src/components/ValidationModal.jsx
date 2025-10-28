// Utilidad para convertir string o Date a objeto Date válido para DatePicker
function parseDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date;

  // Soporta strings
  if (typeof date === 'string') {
    // Formato dd/MM/yyyy -> construir como local
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [day, month, year] = date.split('/').map(Number);
      // Crear la fecha al mediodía local para evitar problemas de zona horaria
      return new Date(year, month - 1, day, 12, 0, 0);
    }

    // Formato YYYY-MM-DD (sin zona) -> construir como local (evita interpretación UTC)
    const isoDateOnly = date.split('T')[0]; // soporta también 'YYYY-MM-DDTHH:mm:..'
    const m = isoDateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      // Construir la fecha al mediodía local para evitar desplazamientos por zona horaria
      return new Date(year, month - 1, day, 12, 0, 0);
    }

    // Fallback: intentar construir Date normal (por ejemplo formatos con zona completa)
    const d = new Date(date);
    return isNaN(d) ? null : d;
  }

  return null;
}
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import es from 'date-fns/locale/es';
registerLocale('es', es);

// Estilos personalizados para el DatePicker en modo oscuro
const datePickerStyles = `
  .react-datepicker {
    background-color: #1f2937 !important;
    border-color: #4b5563 !important;
    color: white !important;
  }

  .react-datepicker__header {
    background-color: #374151 !important;
    border-bottom-color: #4b5563 !important;
  }

  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: white !important;
  }

  .react-datepicker__day {
    color: white !important;
  }

  .react-datepicker__day:hover {
    background-color: #2563eb !important;
    color: white !important;
  }

  .react-datepicker__day--selected {
    background-color: #2563eb !important;
    color: white !important;
  }

  .react-datepicker__navigation-icon::before {
    border-color: white !important;
  }

  .react-datepicker__triangle {
    display: none !important;
  }

  /* Estilos para los dropdowns de mes y año en modo oscuro */
  .react-datepicker__month-dropdown, .react-datepicker__year-dropdown {
    background-color: #1f2937 !important;
    color: white !important;
    border: 1px solid #4b5563 !important;
  }
  .react-datepicker__month-option, .react-datepicker__year-option {
    background-color: #1f2937 !important;
    color: white !important;
  }
  .react-datepicker__month-option--selected, .react-datepicker__year-option--selected {
    background-color: #2563eb !important;
    color: white !important;
  }
  .react-datepicker__month-dropdown:hover, .react-datepicker__year-dropdown:hover {
    background-color: #374151 !important;
  }
  .react-datepicker__month-read-view, .react-datepicker__year-read-view {
    background-color: #1f2937 !important;
    color: white !important;
    border: 1px solid #4b5563 !important;
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
  }
  .react-datepicker__month-read-view--down-arrow, .react-datepicker__year-read-view--down-arrow {
    border-top-color: white !important;
  }
`;

const ValidationModal = ({ isOpen, onClose, validationData, onConfirmed, userConfig }) => {
  const [editableData, setEditableData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [batchId, setBatchId] = useState(null);
  const [progress, setProgress] = useState({ reviewed: 0, total: 0, percent: 0 });

  // Formatea una Date a YYYY-MM-DD en zona local (evita desplazamiento UTC)
  const formatLocalISO = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    // Inyectar estilos personalizados para el DatePicker
    const styleElement = document.createElement('style');
    styleElement.innerHTML = datePickerStyles;
    document.head.appendChild(styleElement);

    return () => {
      // Limpiar estilos al desmontar el componente
      document.head.removeChild(styleElement);
    };
  }, []);
// (Línea eliminada: estaba fuera de lugar y causaba error de referencia)
  useEffect(() => {
    if (validationData) {
      // Si es formato antiguo (con readyToSave y needsReview)
      if (Array.isArray(validationData.readyToSave) && Array.isArray(validationData.needsReview)) {
        const allData = [
          ...validationData.readyToSave.map(item => ({ ...item, needsReview: false })),
          ...validationData.needsReview.map(item => ({ ...item, needsReview: true }))
        ];
        // Inicializar con metadatos para seguimiento de modificaciones
        const mappedAll = allData.map(item => ({
          originalData: { ...item },
          ...item,
          errors: [],
          needsReview: !!item.needsReview,
          wasModified: false
        }));
        setEditableData(mappedAll);
        // Set batchId and initial progress if present
        if (mappedAll.length > 0) {
          const b = mappedAll.find(x => x.batchId)?.batchId;
          if (b) {
            setBatchId(b);
            const total = mappedAll.length;
            const reviewed = mappedAll.filter(it => !it.needsReview).length;
            setProgress({ reviewed, total, percent: total > 0 ? Math.round((reviewed / total) * 100) : 0 });
            (async () => {
              try {
                const resp = await axios.get(`${API_BASE_URL}/api/ocr/progress`, { params: { batchId: b } });
                if (resp.data && resp.data.success && resp.data.progress) {
                  const p = resp.data.progress;
                  setProgress({ reviewed: p.reviewed, total: p.total, percent: p.total > 0 ? Math.round((p.reviewed / p.total) * 100) : 0 });
                }
              } catch (e) {
                console.debug('No previous progress for batch', b);
              }
            })();
          }
        }
      } else if (Array.isArray(validationData)) {
        // Si ya es un array de objetos -> calcular errores iniciales
        const mapped = validationData.map(item => {
          const base = { ...item };
          return {
            originalData: { ...base },
            ...base,
            errors: [],
            needsReview: false,
            wasModified: false
          };
        }).map(rec => ({ ...rec, ...validateRecord(rec) }));
        setEditableData(mapped);
        if (mapped.length > 0) {
          const b = mapped.find(x => x.batchId)?.batchId;
          if (b) {
            setBatchId(b);
            const total = mapped.length;
            const reviewed = mapped.filter(it => !it.needsReview).length;
            setProgress({ reviewed, total, percent: total > 0 ? Math.round((reviewed / total) * 100) : 0 });
            (async () => {
              try {
                const resp = await axios.get(`${API_BASE_URL}/api/ocr/progress`, { params: { batchId: b } });
                if (resp.data && resp.data.success && resp.data.progress) {
                  const p = resp.data.progress;
                  setProgress({ reviewed: p.reviewed, total: p.total, percent: p.total > 0 ? Math.round((p.reviewed / p.total) * 100) : 0 });
                }
              } catch (e) {
                console.debug('No previous progress for batch', b);
              }
            })();
          }
        }
      } else if (typeof validationData === 'object') {
        // Si es un solo objeto plano, lo convertimos en arreglo y validamos
        const single = { originalData: { ...validationData }, ...validationData, errors: [], needsReview: false, wasModified: false };
        const singleMapped = [{ ...single, ...validateRecord(single) }];
        setEditableData(singleMapped);
        if (singleMapped.length > 0) {
          const b = singleMapped[0].batchId;
          if (b) setBatchId(b);
        }
      } else {
        setEditableData([]);
      }
    }
  }, [validationData]);

  // Validador de registros: devuelve { errors: string[], needsReview: boolean }
  const validateRecord = (record) => {
    if (!record || typeof record !== 'object') return { errors: [], needsReview: false };
    const tipo = (record.tipo || '').toString().toLowerCase();
    const errors = [];
    // Reglas básicas: para recibo requerimos cliente, fecha_contrato, monto, t_pago
    if (tipo === 'contrato') {
      if (!record.cliente) errors.push('Cliente faltante');
      if (!record.fecha_contrato) errors.push('Fecha faltante');
    } else {
      // Por defecto asumimos recibo
      if (!record.cliente) errors.push('Cliente faltante');
      if (!record.fecha_contrato) errors.push('Fecha faltante');
      if (record.monto === null || record.monto === undefined || record.monto === '') errors.push('Monto faltante');
      if (!record.t_pago) errors.push('Tipo de pago faltante');
    }
    return { errors, needsReview: errors.length > 0 };
  };

  const updateField = async (index, field, value) => {
    const newData = [...editableData];
    const prev = newData[index];
    newData[index] = { ...prev, [field]: value };
    // Marcar como modificado si difiere del original
  const origVal = prev?.originalData ? prev.originalData[field] : undefined;
  const nowVal = value;
  // Consider a value modified if it changed from empty/undefined to something, or differs from original
  const origStr = origVal === undefined || origVal === null ? '' : String(origVal);
  const nowStr = nowVal === undefined || nowVal === null ? '' : String(nowVal);
  const becameModified = prev.wasModified || (origStr !== nowStr);
    newData[index].wasModified = !!becameModified;
    // Recalcular errores y needsReview
    const { errors, needsReview } = validateRecord(newData[index]);
    newData[index].errors = errors;
    // Keep needsReview true if still has errors; if user modified but fixed all errors, we may keep needsReview=false but keep wasModified=true
    newData[index].needsReview = needsReview;
    setEditableData(newData);
    // Report progress after updating editableData
    try {
      const total = newData.length;
      const reviewed = newData.filter(it => !it.needsReview).length;
      const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
      setProgress({ reviewed, total, percent: pct });
      if (batchId) {
        axios.post(`${API_BASE_URL}/api/ocr/progress`, { batchId, reviewed, total }).catch(e => console.debug('Error reporting progress', e.message));
      }
    } catch (e) {
      console.debug('Error calculating progress', e.message);
    }
  };

  const handleConfirm = async () => {
    try {
      setSaving(true);

      // Combinar datos extraídos con configuración del usuario
      const dataToSave = editableData.map(item => ({
        ...item,
        sucursal: userConfig?.sucursal || item.sucursal,
        bloque: userConfig?.bloque || item.bloque,
        caja: userConfig?.caja || item.caja,
        usuario: userConfig?.usuario || item.usuario
      }));

      // Enviar todos los datos validados al backend
      const response = await axios.post(`${API_BASE_URL}/api/ocr/confirm-batch`, {
        validatedData: dataToSave
      });

      if (response.data.success) {
        onConfirmed({
          saved: response.data.savedCount,
          total: dataToSave.length,
          errors: response.data.errorCount
        });
        onClose();
      } else {
        alert('Error guardando datos: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error confirmando datos:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Convertir de formato ISO a DD/MM/YYYY para visualización
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const handleDateChange = (index, value) => {
    // Convertir de DD/MM/YYYY a formato ISO para backend
    let isoDate = value;
    if (value.includes('/')) {
      const [day, month, year] = value.split('/');
      isoDate = `${year}-${month}-${day}`;
    }
    // Aquí deberías actualizar el campo de fecha correspondiente en editableData
    // (esto depende de cómo estés manejando el cambio de fecha en el resto del código)
    // Ejemplo:
    // updateField(index, 'fecha_contrato', isoDate);
    // ...
    return isoDate;
  };

  if (!isOpen) return null;

  // Ordenamiento: los registros que necesitan revisión o fueron modificados permanecen arriba
  const topList = [...editableData].filter(item => item.needsReview || item.wasModified);
  // Orden: modificados primero (amarillo), luego los que aún no fueron modificados (rojo)
  topList.sort((a, b) => (b.wasModified === a.wasModified) ? 0 : (b.wasModified ? 1 : -1));
  const recordsReady = [...editableData].filter(item => !item.needsReview && !item.wasModified);
  const recordsNeedingReview = [...editableData].filter(item => item.needsReview);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            Validación de Datos Extraídos
          </h2>
          <p className="text-gray-300 mt-2">
            Se procesaron {editableData.length} registros.
            {recordsNeedingReview.length > 0 && (
              <span className="text-orange-400 font-semibold">
                {" "}{recordsNeedingReview.length} necesitan revisión.
              </span>
            )}
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-800">
          {topList.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">
                ⚠️ Registros marcados ({topList.length})
              </h3>
              <div className="space-y-4">
                {topList.map((record, idx) => {
                  // find original index
                  const index = editableData.indexOf(record);
                  const isError = record.errors && record.errors.length > 0;
                  const isModified = !!record.wasModified;

                  return (
                    <div key={index} className={`rounded-lg p-4 bg-gray-900 border ${isError ? 'border-red-500' : 'border-yellow-400'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-white flex items-center">
                          {record.originalFileName}
                          {isModified && (
                            <span className="ml-3 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">MODIFICADO</span>
                          )}
                          {!isModified && isError && (
                            <span className="ml-3 text-xs bg-red-600 text-white px-2 py-0.5 rounded">SIN CORREGIR</span>
                          )}
                        </h4>
                        {record.errors && record.errors.length > 0 && (
                          <div className="text-sm text-red-400">
                            {record.errors.map((error, i) => (
                              <span key={i} className="bg-red-900 text-red-300 px-2 py-1 rounded mr-1">
                                {error}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Campos específicos según tipo de documento */}
                      {record.tipo === 'contrato' ? (
                        // CAMPOS PARA CONTRATOS: Solo Cliente y Fecha
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Cliente
                            </label>
                            <input
                              type="text"
                              value={record.cliente || ''}
                              onChange={(e) => updateField(index, 'cliente', e.target.value)}
                              className={`w-full p-2 border bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!record.cliente ? 'border-red-500' : 'border-gray-600'}`}
                              placeholder="Nombre del cliente"
                            />
                            {!record.cliente && (
                              <span className="text-xs text-red-400">Falta el nombre del cliente</span>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Fecha de Contrato
                            </label>
                            <DatePicker
                              selected={parseDate(record.fecha_contrato)}
                              locale="es"
                              onChange={(date) => {
                                // Convertir a string ISO yyyy-mm-dd
                                if (date instanceof Date && !isNaN(date)) {
                                  const iso = formatLocalISO(date);
                                  console.debug('[DATE DEBUG] index', index, 'selected Date', date, 'local ISO', iso);
                                  updateField(index, 'fecha_contrato', iso);
                                } else {
                                  console.debug('[DATE DEBUG] index', index, 'selected invalid date', date);
                                  updateField(index, 'fecha_contrato', '');
                                }
                              }}
                              dateFormat="dd/MM/yyyy"
                              placeholderText="Seleccionar fecha"
                              className={`w-full p-2 border bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!record.fecha_contrato ? 'border-red-500' : 'border-gray-600'}`}
                              calendarClassName="bg-gray-800 text-white"
                              dayClassName={() => "text-white hover:bg-blue-600"}
                              showPopperArrow={false}
                              showMonthDropdown
                              showYearDropdown
                              dropdownMode="scroll"
                            />
                            {!record.fecha_contrato && (
                              <span className="text-xs text-red-400">Falta la fecha</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        // CAMPOS PARA RECIBOS: Todos los campos
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Cliente
                              </label>
                              <input
                                type="text"
                                value={record.cliente || ''}
                                onChange={(e) => updateField(index, 'cliente', e.target.value)}
                                className={`w-full p-2 border bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!record.cliente ? 'border-red-500' : 'border-gray-600'}`}
                                placeholder="Nombre del cliente"
                              />
                              {!record.cliente && (
                                <span className="text-xs text-red-400">Falta el nombre del cliente</span>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Fecha
                              </label>
                              <DatePicker
                                selected={parseDate(record.fecha_contrato)}
                                locale="es"
                                onChange={(date) => {
                                    if (date instanceof Date && !isNaN(date)) {
                                      const iso = formatLocalISO(date);
                                      console.debug('[DATE DEBUG] index', index, 'selected Date', date, 'local ISO', iso);
                                      updateField(index, 'fecha_contrato', iso);
                                    } else {
                                      console.debug('[DATE DEBUG] index', index, 'selected invalid date', date);
                                      updateField(index, 'fecha_contrato', '');
                                    }
                                }}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Seleccionar fecha"
                                className={`w-full p-2 border bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!record.fecha_contrato ? 'border-red-500' : 'border-gray-600'}`}
                                calendarClassName="bg-gray-800 text-white"
                                dayClassName={() => "text-white hover:bg-blue-600"}
                                showPopperArrow={false}
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="scroll"
                              />
                              {!record.fecha_contrato && (
                                <span className="text-xs text-red-400">Falta la fecha</span>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Monto
                              </label>
                              <input
                                type="number"
                                value={record.monto || ''}
                                onChange={record.tipo === 'contrato' ? undefined : (e) => updateField(index, 'monto', parseFloat(e.target.value) || 0)}
                                className={`w-full p-2 border bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${(record.tipo !== 'contrato' && !record.monto) ? 'border-red-500' : 'border-gray-600'}`}
                                placeholder="0.00"
                                step="0.01"
                                disabled={record.tipo === 'contrato'}
                              />
                              {(record.tipo !== 'contrato' && (record.monto === null || record.monto === undefined || record.monto === '')) && (
                                <span className="text-xs text-red-400">Falta el monto</span>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Folio
                              </label>
                              <input
                                type="text"
                                value={record.folio || ''}
                                onChange={record.tipo === 'contrato' ? undefined : (e) => updateField(index, 'folio', e.target.value)}
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Número de folio"
                                disabled={record.tipo === 'contrato'}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Tipo de Pago
                              </label>
                              <input
                                type="text"
                                value={record.t_pago || ''}
                                onChange={record.tipo === 'contrato' ? undefined : (e) => updateField(index, 't_pago', e.target.value)}
                                className={`w-full p-2 border bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${(record.tipo !== 'contrato' && !record.t_pago) ? 'border-red-500' : 'border-gray-600'}`}
                                placeholder="Tipo de pago"
                                disabled={record.tipo === 'contrato'}
                              />
                              {(record.tipo !== 'contrato' && !record.t_pago) && (
                                <span className="text-xs text-red-400">Falta el tipo de pago</span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Tipo de Documento
                              </label>
                              <select
                                value={record.tipo || ''}
                                onChange={(e) => updateField(index, 'tipo', e.target.value)}
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Seleccionar tipo</option>
                                <option value="recibo">Recibo</option>
                                <option value="contrato">Contrato</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Sucursal
                              </label>
                              <input
                                type="text"
                                value={record.sucursal || ''}
                                onChange={(e) => updateField(index, 'sucursal', e.target.value)}
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Sucursal"
                                readOnly
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recordsReady.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3">
                ✅ Registros listos para guardar ({recordsReady.length})
              </h3>
              <div className="space-y-4">
                {recordsReady.map((record, mapIndex) => {
                  // 🔧 FIX: Usar el índice correcto en editableData, no el índice del mapeo
                  const realIndex = editableData.indexOf(record);
                  return (
                    <div key={realIndex} className="border border-green-500 rounded-lg p-4 bg-gray-900">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-white">{record.originalFileName}</h4>
                        <div className="text-sm text-green-400 font-medium">✅ Datos completos</div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Cliente</label>
                          <input
                            type="text"
                            value={record.cliente || ''}
                            onChange={(e) => updateField(realIndex, 'cliente', e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nombre del cliente"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
                          <DatePicker
                            selected={parseDate(record.fecha_contrato)}
                            onChange={(date) => {
                              if (date instanceof Date && !isNaN(date)) {
                                const iso = formatLocalISO(date);
                                updateField(realIndex, 'fecha_contrato', iso);
                              } else {
                                updateField(realIndex, 'fecha_contrato', '');
                              }
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Seleccionar fecha"
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            calendarClassName="bg-gray-800 text-white"
                            dayClassName={() => 'text-white hover:bg-blue-600'}
                            showPopperArrow={false}
                            showMonthDropdown
                            showYearDropdown
                            dropdownMode="select"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Monto</label>
                          <input
                            type="number"
                            value={record.monto || ''}
                            onChange={(e) => updateField(realIndex, 'monto', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Folio</label>
                          <input
                            type="text"
                            value={record.folio || ''}
                            onChange={(e) => updateField(realIndex, 'folio', e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Número de folio"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Pago</label>
                          <input
                            type="text"
                            value={record.t_pago || ''}
                            onChange={(e) => updateField(realIndex, 't_pago', e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Tipo de pago"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Tipo de Documento
                          </label>
                          <select
                            value={record.tipo || ''}
                            onChange={(e) => updateField(realIndex, 'tipo', e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Seleccionar tipo</option>
                            <option value="recibo">Recibo</option>
                            <option value="contrato">Contrato</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Sucursal
                          </label>
                          <input
                            type="text"
                            value={record.sucursal || ''}
                            onChange={(e) => updateField(realIndex, 'sucursal', e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Sucursal"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-800 flex items-center justify-between space-x-4">
          <div className="flex-1 mr-4">
            <div className="text-sm text-gray-300 mb-2">Progreso revisión: <span className="font-semibold text-white">{progress.reviewed}/{progress.total}</span> ({progress.percent}%)</div>
            <div className="w-full bg-gray-700 rounded h-3 overflow-hidden">
              <div className="bg-green-500 h-3" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
          <div className="flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 border border-gray-600 bg-gray-700 rounded hover:bg-gray-600"
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            disabled={saving || topList.some(r => r.errors?.length > 0)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving
              ? 'Guardando...'
              : topList.length > 0
                ? `Confirmar y Guardar ${editableData.length} Registros`
                : `Guardar ${editableData.length} Registros en Base de Datos`
            }
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
