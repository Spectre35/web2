import React, { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import io from 'socket.io-client';

const TesseractUploader = ({ onProcessed, filters, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [processingPercent, setProcessingPercent] = useState(0);
  const [processingInfo, setProcessingInfo] = useState({ processed: 0, total: 0, filename: null });
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStats, setProgressStats] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const validateFilters = () => {
    if (!filters?.sucursal || !filters?.bloque || !filters?.caja) {
      alert('Por favor configura los filtros (Sucursal, Bloque y Caja) antes de subir documentos');
      return false;
    }
    return true;
  };

  // 🔌 Función para conectar WebSocket
  const connectWebSocket = (sessionId) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io('http://localhost:3002');

    socketRef.current.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      setIsConnected(true);
      socketRef.current.emit('join-session', sessionId);
    });

    socketRef.current.on('progress-update', (stats) => {
      console.log('📊 Progreso actualizado:', stats);
      setProgressStats(stats);
      
      // Actualizar porcentaje general
      const currentProgress = stats.overallProgress || 0;
      setProcessingPercent(currentProgress);
      
      // Actualizar información de archivo actual
      if (stats.currentFileName || stats.filesProcessed !== undefined) {
        setProcessingInfo({
          processed: stats.filesProcessed || 0,
          total: stats.totalFiles || processingInfo.total || 0,
          filename: stats.currentFileName || `Procesando archivo ${(stats.filesProcessed || 0) + 1}...`
        });
      }
      
      // 🔄 Para lotes, asegurar que el modal se mantenga visible durante el procesamiento
      if (stats.totalFiles > 1) {
        console.log(`📋 Lote: ${stats.filesProcessed || 0}/${stats.totalFiles || 0} archivos procesados`);
      }
      
      // Si está completado, esperar y luego cerrar
      if (stats.isComplete) {
        console.log('✅ Procesamiento completado:', stats);
        setTimeout(() => {
          setShowProgressModal(false);
          setUploading(false);
          setProgressStats(null);
          setProcessingPercent(100);
        }, 3000); // Más tiempo para lotes grandes
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
      setIsConnected(false);
    });

    // 🎯 Listener adicional para completar procesamiento de lotes
    socketRef.current.on('batch-complete', (data) => {
      console.log('✅ Lote completado:', data);
      setProcessingPercent(100);
      setProcessingInfo({
        processed: data.totalFiles || processingInfo.total,
        total: data.totalFiles || processingInfo.total,
        filename: `Completado: ${data.totalFiles} archivos procesados`
      });
    });

    // 🔄 Listener para errores de conexión
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      setIsConnected(false);
    });

    return socketRef.current;
  };

  // 🧹 Limpiar WebSocket al desmontar
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || !validateFilters()) {
      return;
    }

    const files = e.dataTransfer?.files || e.target?.files;
    if (!files?.length) return;

    try {
      // 🚀 Inicializar estado de procesamiento
      setUploading(true);
      setUploadPercent(0);
      setProcessingPercent(0);
      setShowProgressModal(true);

      // 📊 Generar sessionId único para WebSocket
      const newSessionId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // 🔌 Conectar WebSocket para progreso en tiempo real
      connectWebSocket(newSessionId);

      console.log('🚀 Iniciando procesamiento con sessionId:', newSessionId);

      const formData = new FormData();
      let totalFiles = files.length;

      // Si es un solo archivo
      if (totalFiles === 1) {
        formData.append('file', files[0]);
        formData.append('sessionId', newSessionId);
        formData.append('sucursal', filters.sucursal);
        formData.append('bloque', filters.bloque);
        formData.append('caja', filters.caja);

        // 🚀 Llamar al sistema OCR en puerto 3002 con WebSocket
        const response = await axios.post('http://localhost:3002/api/ocr/upload', formData, {
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
        formData.append('sessionId', newSessionId);
        formData.append('sucursal', filters.sucursal);
        formData.append('bloque', filters.bloque);
        formData.append('caja', filters.caja);

        // 🚀 Llamar al sistema OCR para lote en puerto 3002 con WebSocket
        const response = await axios.post('http://localhost:3002/api/ocr/batch-upload', formData, {
          timeout: 10 * 60 * 1000, // 10 minutos timeout para lotes
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percentCompleted);
            
            // 🔄 Una vez que termina la subida, cambiar a procesamiento
            if (percentCompleted === 100) {
              console.log('📤 Subida completada, iniciando procesamiento...');
              setProcessingPercent(1); // Pequeño progreso para indicar que comenzó el procesamiento
              setProcessingInfo({
                processed: 0,
                total: totalFiles,
                filename: `Procesando lote de ${totalFiles} archivos...`
              });
            }
          }
        });

        console.log('✅ Respuesta del batch-upload:', response.data);
        
        if (response.data && Array.isArray(response.data.validationData)) {
          // ⏰ Esperar un poco para que el WebSocket actualice el progreso final
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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
        
        // 🧹 Limpiar estado en caso de error
        setShowProgressModal(false);
        setUploading(false);
        setUploadPercent(0);
        setProcessingPercent(0);
        setProgressStats(null);
        
        // Desconectar WebSocket
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        
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
                className={`h-full rounded-full transition-all duration-500 ${
                  uploadPercent < 100 && uploadPercent > 0 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-r from-purple-500 to-blue-600'
                }`}
                style={{ width: `${Math.max(uploadPercent, processingPercent)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {uploadPercent < 100 && uploadPercent > 0 
                ? `📤 ${uploadPercent}% subida` 
                : processingPercent > 0 
                  ? `🔍 ${processingPercent}% procesamiento (${processingInfo.processed}/${processingInfo.total})` 
                  : 'Iniciando...'}
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

      {/* 🎯 Modal de Progreso Avanzado con WebSocket */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                📊 Procesamiento OCR en Curso
              </h3>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isConnected ? '🔗 Conectado' : '🔴 Desconectado'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${progressStats?.isComplete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {progressStats?.isComplete ? '✅ Completado' : '⚡ Procesando'}
                </span>
              </div>
            </div>

            {/* Progreso General */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-blue-600">
                  {processingPercent}%
                </span>
                <span className="text-sm text-gray-600">
                  {processingInfo.processed} / {processingInfo.total} archivos
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 relative"
                  style={{ width: `${processingPercent}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Archivo Actual */}
            {processingInfo.filename && !progressStats?.isComplete && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  📄 Procesando archivo {processingInfo.processed + 1}/{processingInfo.total}
                </div>
                <div className="text-sm text-yellow-700 break-all">
                  {processingInfo.filename}
                </div>
              </div>
            )}

            {/* Etapas Detalladas */}
            {progressStats?.stages && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {progressStats.stages.map(stage => (
                  <div 
                    key={stage.name} 
                    className={`p-3 rounded-lg border-l-4 transition-all duration-300 ${
                      stage.progress >= 100 ? 'bg-green-50 border-green-400' : 
                      stage.progress > 0 ? 'bg-yellow-50 border-yellow-400' : 
                      'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-700 mb-1 uppercase">
                      {stage.name === 'upload' && '📤 Subida'}
                      {stage.name === 'preprocessing' && '🔧 Preproceso'}
                      {stage.name === 'ocr' && '🔍 OCR'}
                      {stage.name === 'classification' && '📋 Clasificación'}
                      {stage.name === 'extraction' && '📊 Extracción'}
                      {stage.name === 'validation' && '✅ Validación'}
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{stage.progress}%</span>
                      <span className="text-xs text-gray-500">{stage.completed}/{stage.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          stage.progress >= 100 ? 'bg-green-500' : 
                          stage.progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${stage.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Información de Tiempo */}
            {progressStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Transcurrido</div>
                  <div className="text-sm font-semibold text-blue-600">
                    {formatTime(progressStats.elapsedTime)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Restante</div>
                  <div className="text-sm font-semibold text-orange-600">
                    {formatTime(progressStats.estimatedRemaining)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Total Est.</div>
                  <div className="text-sm font-semibold text-purple-600">
                    {formatTime(progressStats.estimatedTotal)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Velocidad</div>
                  <div className="text-sm font-semibold text-green-600">
                    {progressStats.processingRate > 0 ? formatTime(progressStats.processingRate) + '/archivo' : 'Calculando...'}
                  </div>
                </div>
              </div>
            )}

            {/* Errores */}
            {progressStats?.errors && progressStats.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="text-sm font-medium text-red-800 mb-2">
                  ⚠️ Errores encontrados ({progressStats.errors.length})
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {progressStats.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1 p-2 bg-white rounded">
                      <strong>Archivo {error.fileIndex + 1}:</strong> {error.fileName || 'Sin nombre'} - {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón de Cerrar/Completar */}
            <div className="flex justify-end">
              {progressStats?.isComplete ? (
                <button 
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  onClick={() => {
                    setShowProgressModal(false);
                    setUploading(false);
                    setProgressStats(null);
                  }}
                >
                  ✅ Ver Resultados
                </button>
              ) : (
                <button 
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    if (confirm('¿Estás seguro de cancelar el procesamiento?')) {
                      setShowProgressModal(false);
                      setUploading(false);
                      if (socketRef.current) {
                        socketRef.current.disconnect();
                      }
                    }
                  }}
                >
                  ❌ Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 🕐 Función auxiliar para formatear tiempo
const formatTime = (ms) => {
  if (!ms || ms < 1000) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export default TesseractUploader;
