import React, { useState, useEffect } from 'react';
import TesseractUploader from '../components/TesseractUploader';
import ValidationModal from '../components/ValidationModal';
import { API_BASE_URL } from "../config";
import axios from "axios";

const ProcesarDocumentos = () => {
  // useState hooks al inicio
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBloque, setSelectedBloque] = useState('');
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [selectedCaja, setSelectedCaja] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [processingFilters, setProcessingFilters] = useState({
    sucursal: '',
    bloque: '',
    caja: '',
    usuario: ''
  });
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    data: null
  });
  const [options, setOptions] = useState({
    bloques: [],
    sucursales: [],
    cajas: [9, 10, 11, 12], // Valores fijos para las cajas
    bloqueSucursales: {},
    sucursalBloque: {}
  });

  // Efecto para filtrar sucursales según bloque seleccionado
  useEffect(() => {
    if (selectedBloque) {
      const sucursalesDelBloque = options.bloqueSucursales[selectedBloque] || [];
      if (!sucursalesDelBloque.includes(selectedSucursal)) {
        setSelectedSucursal('');
      }
    }
  }, [selectedBloque, options.bloqueSucursales]);

  // Efecto para seleccionar automáticamente el bloque al elegir sucursal
  useEffect(() => {
    if (selectedSucursal) {
      const bloqueCorrespondiente = options.sucursalBloque[selectedSucursal];
      if (bloqueCorrespondiente && bloqueCorrespondiente !== selectedBloque) {
        setSelectedBloque(bloqueCorrespondiente);
      }
    }
  }, [selectedSucursal, options.sucursalBloque]);

  // Cargar datos iniciales y documentos recientes
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Cargar valores distinct del backend para los selectores
        const response = await axios.get(`${API_BASE_URL}/api/ventas/distinct-values`);
        if (!response.data.success) {
          throw new Error('Error al cargar los valores');
        }
        const { bloques, sucursales, relaciones } = response.data.data;
        // Crear mapeo de bloque a sucursales
        const bloqueSucursales = {};
        relaciones.forEach(rel => {
          if (!bloqueSucursales[rel.Bloque]) {
            bloqueSucursales[rel.Bloque] = [];
          }
          if (!bloqueSucursales[rel.Bloque].includes(rel.Sucursal)) {
            bloqueSucursales[rel.Bloque].push(rel.Sucursal);
          }
        });
        // Crear mapeo de sucursal a bloque
        const sucursalBloque = {};
        relaciones.forEach(rel => {
          sucursalBloque[rel.Sucursal] = rel.Bloque;
        });
        setOptions({
          bloques: bloques.map(b => b.Bloque).sort(),
          sucursales: sucursales.map(s => s.Sucursal).sort(),
          cajas: [9, 10, 11, 12],
          bloqueSucursales,
          sucursalBloque
        });
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        alert('Error cargando datos de referencia. Por favor, recarga la página.');
      }
    };
    const loadRecentDocuments = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/ocr/documents?limit=10`);
        if (response.data.success) {
          setDocumentos(response.data.documents || []);
        }
      } catch (error) {
        console.error('Error cargando documentos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
    loadRecentDocuments();
  }, []);



  const handleDocumentProcessed = (result) => {
    const loadRecentDocuments = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/ocr/documents?limit=10`);
        if (response.data.success) {
          setDocumentos(response.data.documents || []);
        }
      } catch (error) {
        console.error('Error actualizando documentos:', error);
      }
    };

    // Validar que result tenga la estructura esperada
    console.log('[DEBUG] Resultado recibido del backend:', result);
    if (!result || typeof result !== 'object') {
      console.warn('Resultado de procesamiento inválido:', result);
      loadRecentDocuments();
      return;
    }

    // Si hay datos que necesitan validación, abrir modal
    if (result.needsValidation && result.validationData) {
      console.log('[DEBUG] Abriendo modal con validationData:', result.validationData);
      // Si validationData[0].data existe y es un array, usar ese array directamente
      // Generate a simple batchId for progress tracking
      const makeBatchId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `batch_${Date.now()}_${Math.floor(Math.random()*10000)}`;

      if (
        Array.isArray(result.validationData) &&
        result.validationData.length === 1 &&
        result.validationData[0] &&
        Array.isArray(result.validationData[0].data)
      ) {
        setValidationModal({
          isOpen: true,
          data: result.validationData[0].data.map(d => ({ ...d, batchId: makeBatchId() }))
        });
      } else {
        setValidationModal({
          isOpen: true,
          data: (Array.isArray(result.validationData) ? result.validationData : [result.validationData]).map(d => ({ ...d, batchId: makeBatchId() }))
        });
      }
      return;
    }

    // Si el backend mandó results/data/validationData aunque sea vacío, mostrar modal igual
    if (Array.isArray(result.results) && result.results.length > 0) {
      setValidationModal({ isOpen: true, data: result.results });
      return;
    }
    if (Array.isArray(result.data) && result.data.length > 0) {
      setValidationModal({ isOpen: true, data: result.data });
      return;
    }
    if (Array.isArray(result.validationData) && result.validationData.length > 0) {
      setValidationModal({ isOpen: true, data: result.validationData });
      return;
    }
    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      setValidationModal({ isOpen: true, data: [result] });
      return;
    }

    // Recargar documentos después del procesamiento
    loadRecentDocuments();

    if (result.batchResults || result.results) {
      alert('Documento procesado correctamente');
    } else {
      alert('Documento procesado correctamente');
    }
  };

  const handleValidationConfirmed = async (result) => {
    // Recargar documentos después de guardar
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ocr/documents?limit=10`);
      if (response.data.success) {
        setDocumentos(response.data.documents || []);
      }
    } catch (error) {
      console.error('Error actualizando documentos:', error);
    }

    // Mostrar mensaje de éxito
    alert(`✅ Guardado completado: ${result.saved}/${result.total} registros guardados exitosamente`);
  };

  const handleValidationClose = () => {
    setValidationModal({
      isOpen: false,
      data: null
    });
  };

  const handleApplyFilters = () => {
    // Validar que se hayan ingresado los campos requeridos
    if (!selectedBloque) {
      alert('Por favor selecciona el bloque');
      return;
    }
    if (!selectedSucursal) {
      alert('Por favor selecciona la sucursal');
      return;
    }
    if (!selectedCaja) {
      alert('Por favor selecciona la caja');
      return;
    }

    // Aplicar filtros
    setProcessingFilters({
      sucursal: selectedSucursal,
      bloque: selectedBloque,
      caja: selectedCaja,
      usuario: selectedUsuario
    });
    setFiltersApplied(true);

    // Mostrar confirmación
    alert(`Filtros aplicados:\n- Sucursal: ${selectedSucursal}\n- Bloque: ${selectedBloque}\n- Caja: ${selectedCaja}\n- Usuario: ${selectedUsuario || 'OCR_AUTO'}\n\nAhora puedes subir documentos.`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 py-8 mb-6 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🔍 Procesamiento de Documentos</h1>
              <p className="text-lg text-gray-300">
                Extrae automáticamente datos de contratos y recibos EUROPIEL
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="mb-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">
              🎯 Filtros de Procesamiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Selector de Bloque */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bloque
                </label>
                <select
                  value={selectedBloque}
                  onChange={(e) => setSelectedBloque(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un bloque</option>
                  {options.bloques.map((bloque) => (
                    <option key={bloque} value={bloque}>
                      {bloque}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Sucursal */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sucursal
                </label>
                <select
                  value={selectedSucursal}
                  onChange={(e) => setSelectedSucursal(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona una sucursal</option>
                  {(selectedBloque
                    ? options.bloqueSucursales[selectedBloque] || []
                    : options.sucursales
                  ).map((sucursal) => (
                    <option key={sucursal} value={sucursal}>
                      {sucursal}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Caja */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Caja
                </label>
                <select
                  value={selectedCaja}
                  onChange={(e) => setSelectedCaja(e.target.value)}
                  className={`w-full bg-gray-700 border border-gray-600 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !selectedBloque || !selectedSucursal ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!selectedBloque || !selectedSucursal}
                >
                  <option value="">Selecciona una caja</option>
                  {options.cajas.map((caja) => (
                    <option key={caja} value={caja}>
                      {caja}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo de Usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={selectedUsuario}
                  onChange={(e) => setSelectedUsuario(e.target.value.toUpperCase())}
                  placeholder="Nombre del usuario"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {selectedUsuario ? `Usuario: ${selectedUsuario}` : 'Opcional - Se usará OCR_AUTO si está vacío'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleApplyFilters}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Componente de carga de documentos */}
        <div className="mb-8">
          <TesseractUploader
            onProcessed={handleDocumentProcessed}
            filters={processingFilters}
          />
        </div>

        {/* Lista de documentos procesados recientemente */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">📋 Documentos Procesados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Confianza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {loading ? (
                  <tr key="loading">
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                      Cargando documentos...
                    </td>
                  </tr>
                ) : documentos.length === 0 ? (
                  <tr key="empty">
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                      No hay documentos procesados
                    </td>
                  </tr>
                ) : (
                  documentos.map((doc, index) => (
                    <tr key={index} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {doc.originalName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {doc.ocrResults?.classification?.type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                        }`}>
                          {doc.success ? 'Exitoso' : 'Error'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {doc.ocrResults?.confidence ? `${Math.round(doc.ocrResults.confidence)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(doc.metadata?.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de validación */}
      <ValidationModal
        isOpen={validationModal.isOpen}
        onClose={handleValidationClose}
        validationData={validationModal.data}
        onConfirmed={handleValidationConfirmed}
        userConfig={{
          sucursal: selectedSucursal,
          bloque: selectedBloque,
          caja: selectedCaja,
          usuario: selectedUsuario
        }}
      />
    </div>
  );
};

export default ProcesarDocumentos;
