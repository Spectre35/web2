import React, { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import axios from 'axios';

const TesseractUploader = ({ onProcessed, filters, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [processingPercent, setProcessingPercent] = useState(0);
  const [processingInfo, setProcessingInfo] = useState({ processed: 0, total: 0, filename: null });

  const validateFilters = () => {
    if (!filters?.sucursal || !filters?.bloque || !filters?.caja) {
      alert('Por favor configura los filtros (Sucursal, Bloque y Caja) antes de subir documentos');
      return false;
    }
    return true;
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || !validateFilters()) {
      return;
    }

    const files = e.dataTransfer?.files || e.target?.files;
    if (!files?.length) return;

  try {
  setUploading(true);
  setUploadPercent(0);
  setProcessingPercent(0);

      // Generate batchId to track processing progress
      const makeBatchId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `batch_${Date.now()}_${Math.floor(Math.random()*10000)}`;
      const batchId = makeBatchId();
      let pollingInterval = null;
      const startPolling = () => {
        if (pollingInterval) return;
        pollingInterval = setInterval(async () => {
          try {
            const resp = await axios.get(`${API_BASE_URL}/api/ocr/processing-progress`, { params: { batchId } });
            if (resp.data && resp.data.success && resp.data.progress) {
              const p = resp.data.progress;
              const pct = p.total > 0 ? Math.round((p.processed / p.total) * 100) : 0;
              setProcessingPercent(pct);
              setProcessingInfo({ processed: p.processed, total: p.total, filename: p.filename || null });
              // stop if complete
              if (p.processed >= p.total) {
                clearInterval(pollingInterval);
                pollingInterval = null;
              }
            }
          } catch (err) {
            // ignore polling errors
          }
        }, 500);
      };

      const stopPolling = () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      };

      const formData = new FormData();
      let totalFiles = files.length;

      // Si es un solo archivo
  if (totalFiles === 1) {
        formData.append('file', files[0]);
  formData.append('batchId', batchId);
        formData.append('sucursal', filters.sucursal);
        formData.append('bloque', filters.bloque);
        formData.append('caja', filters.caja);

        // Start polling for progress
        startPolling();

        const response = await axios.post(`${API_BASE_URL}/api/ocr/upload`, formData, {
          timeout: 5 * 60 * 1000, // 5 minutos timeout
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percentCompleted);
          }
        });

        // Siempre mostrar modal de validación antes de guardar
        let validationArray = [];
        if (Array.isArray(response.data.results)) {
          validationArray = response.data.results;
        } else if (Array.isArray(response.data.data)) {
          validationArray = response.data.data;
        } else if (Array.isArray(response.data.validationData)) {
          validationArray = response.data.validationData;
        } else if (response.data && typeof response.data === 'object') {
          validationArray = [response.data];
        }
        // Aplanar arrays anidados
        validationArray = validationArray.flat ? validationArray.flat() : validationArray;

        // Normalizar diferentes formas de respuesta del backend/microservicio
        const normalizeSingle = (item) => {
          if (!item || typeof item !== 'object') return null;
          // Si trae extractedFields, usarlo como base
          const base = (item.extractedFields && typeof item.extractedFields === 'object') ? item.extractedFields : item;
          const originalFileName = item.originalName || item.originalFileName || base.originalFileName || (item.fileUrl ? item.fileUrl.split('/').pop() : null) || null;
          return {
            ...base,
            originalFileName,
            fileUrl: item.fileUrl || null,
            size: item.size || null,
            classification: item.classification || base.classification || null,
            confidence: (item.confidence !== undefined ? item.confidence : (base.confidence !== undefined ? base.confidence : null)),
            processingTime: item.processingTime || null,
            databaseId: item.databaseId || null,
            text: item.text || base.text || null,
            sucursal: base.sucursal || item.sucursal || null,
            bloque: base.bloque || item.bloque || null,
            caja: base.caja || item.caja || null
          };
        };

        // Expandir elementos que contienen `.data` (microservicio devuelve wrapper)
        let flat = [];
        for (const entry of validationArray) {
          if (!entry) continue;
          if (Array.isArray(entry)) {
            flat.push(...entry.map(normalizeSingle).filter(Boolean));
          } else if (entry.data && Array.isArray(entry.data)) {
            flat.push(...entry.data.map(normalizeSingle).filter(Boolean));
          } else {
            const n = normalizeSingle(entry);
            if (n) flat.push(n);
          }
        }

        // Filtrar solo objetos válidos
        const finalValidation = flat.filter(r => r && typeof r === 'object');

        if (finalValidation.length > 0) {
          onProcessed({
            needsValidation: true,
            validationData: finalValidation
          });
        } else {
          alert('No se extrajeron datos del documento. Verifica que el archivo sea legible.');
          throw new Error(response.data.error || 'No se extrajeron datos del documento');
        }
      }
      // Si son múltiples archivos
      else {
        Array.from(files).forEach(file => {
          formData.append('files', file);
        });
        formData.append('batchId', batchId);
        formData.append('sucursal', filters.sucursal);
        formData.append('bloque', filters.bloque);
        formData.append('caja', filters.caja);

        // Start polling for processing progress
        startPolling();

        const response = await axios.post(`http://localhost:3002/api/ocr/batch-upload`, formData, {
          timeout: 10 * 60 * 1000, // 10 minutos timeout para lotes
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percentCompleted);
          }
        });

        if (response.data && Array.isArray(response.data.validationData)) {
          // SIEMPRE mostrar modal para que el usuario confirme el guardado
          onProcessed({
            batchResults: true,
            needsValidation: true, // Siempre true para mostrar modal
            validationData: response.data.validationData,
            successCount: response.data.successfulReceipts,
            totalProcessed: response.data.totalReceipts,
            message: response.data.validationData.totalErrors > 0
              ? `Procesamiento completado. ${response.data.validationData.totalErrors} registros necesitan revisión.`
              : `Procesamiento completado. ${response.data.validationData.totalReady} registros listos para guardar.`
          });
        } else {
          throw new Error(response.data.error || 'Error procesando lote');
        }
      }
      } catch (error) {
      console.error('Error en procesamiento:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
        // ensure polling stops when we're done
        stopPolling();
        setUploading(false);
        // keep processingPercent until user closes or processing ends
        // reset upload percent after a short delay so UI shows processing
        setTimeout(() => setUploadPercent(0), 800);
      // Limpiar el input de archivos para permitir nuevas subidas
      const fileInput = document.getElementById('fileInput');
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }, [filters, onProcessed]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        disabled || !filters?.sucursal || !filters?.bloque || !filters?.caja
          ? 'border-gray-700 bg-gray-900 cursor-not-allowed opacity-75'
          : 'border-gray-600 hover:border-blue-500 cursor-pointer bg-gray-800'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => {
        if (!disabled && validateFilters()) {
          document.getElementById('fileInput').click();
        }
      }}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        onChange={handleDrop}
        multiple
        accept="image/*,.pdf"
        disabled={disabled || !filters?.sucursal || !filters?.bloque || !filters?.caja}
      />

      {uploading ? (
        <div>
          <div className="mb-4">
            <div className="h-2 w-full bg-gray-700 rounded-full">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(uploadPercent, processingPercent)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {uploadPercent > 0 ? `${uploadPercent}% subida` : processingPercent > 0 ? `${processingPercent}% OCR (${processingInfo.processed}/${processingInfo.total})` : 'Iniciando...'}
            </p>
          </div>
          <p className="text-lg text-gray-300">
            Procesando documentos...
          </p>
          {processingInfo.filename && (
            <p className="text-sm text-gray-400 mt-2">Archivo: {processingInfo.filename}</p>
          )}
        </div>
      ) : (
        <>
          <div className="text-6xl mb-4">
            {disabled || !filters?.sucursal || !filters?.bloque || !filters?.caja ? '�' : '�📄'}
          </div>
          {disabled || !filters?.sucursal || !filters?.bloque || !filters?.caja ? (
            <>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">
                Configura los filtros primero
              </h3>
              <p className="text-gray-500">
                Selecciona Sucursal, Bloque y Caja, luego haz clic en "Aplicar Filtros"
              </p>
              <div className="mt-4 p-3 bg-gray-800 rounded-lg inline-block">
                <ul className="text-left text-sm text-gray-400">
                  <li className={filters?.sucursal ? 'text-green-400' : 'text-red-400'}>
                    • Sucursal: {filters?.sucursal || 'No seleccionada'}
                  </li>
                  <li className={filters?.bloque ? 'text-green-400' : 'text-red-400'}>
                    • Bloque: {filters?.bloque || 'No seleccionado'}
                  </li>
                  <li className={filters?.caja ? 'text-green-400' : 'text-red-400'}>
                    • Caja: {filters?.caja || 'No seleccionada'}
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                Arrastra tus archivos aquí o haz clic para seleccionar
              </h3>
              <p className="text-gray-400">
                Soporta archivos JPG, PNG, PDF
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Máximo 15MB por archivo
              </p>
              <div className="mt-4 p-3 bg-gray-800 rounded-lg inline-block">
                <p className="text-sm text-gray-400 mb-2">Filtros aplicados:</p>
                <ul className="text-left text-sm text-green-400">
                  <li>• Sucursal: {filters.sucursal}</li>
                  <li>• Bloque: {filters.bloque}</li>
                  <li>• Caja: {filters.caja}</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TesseractUploader;
