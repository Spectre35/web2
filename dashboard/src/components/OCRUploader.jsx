import React, { useState } from 'react';
import axios from 'axios';

const OCRUploader = ({ onDocumentProcessed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', 'spa+eng');
    formData.append('userId', 'admin'); // O el ID del usuario actual

    try {
      console.log('📤 Subiendo archivo al OCR...');

      const response = await axios.post('http://localhost:3001/api/ocr/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000 // 60 segundos timeout
      });

      console.log('✅ Respuesta del OCR:', response.data);

      if (response.data.success) {
        setResults(response.data);

        // Llamar callback si se proporciona
        if (onDocumentProcessed) {
          onDocumentProcessed(response.data);
        }
      } else {
        setError(response.data.message || 'Error procesando el documento');
      }
    } catch (error) {
      console.error('❌ Error subiendo archivo:', error);
      setError(error.response?.data?.message || error.message || 'Error conectando con el servidor OCR');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('language', 'spa+eng');
    formData.append('userId', 'admin');
    formData.append('sucursal', 'MATRIZ');
    formData.append('bloque', 'PRINCIPAL');

    try {
      console.log(`📤 Subiendo ${files.length} archivos al OCR en lote...`);

      const response = await axios.post('http://localhost:3001/api/ocr/batch-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000 // 5 minutos timeout para lotes
      });

      console.log('✅ Respuesta del OCR batch:', response.data);
      setResults(response.data);

      if (onDocumentProcessed) {
        onDocumentProcessed(response.data);
      }
    } catch (error) {
      console.error('❌ Error subiendo archivos en lote:', error);
      setError(error.response?.data?.message || error.message || 'Error procesando lote de documentos');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="ocr-uploader bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        🔍 Procesamiento OCR - Documentos EUROPIEL
      </h3>

      <div className="space-y-4">
        {/* Upload individual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📄 Subir documento individual
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.tiff,.bmp,.webp"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Upload múltiple */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📚 Subir múltiples documentos (máx 200)
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.tiff,.bmp,.webp"
            multiple
            onChange={handleBatchUpload}
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Estado de carga */}
        {isUploading && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Procesando documento(s) con OCR...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
            <p className="font-semibold">❌ Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Resultados */}
        {results && (
          <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
            <h4 className="font-semibold mb-2">✅ Procesamiento completado:</h4>

            {results.batchResults ? (
              // Resultados de lote
              <div>
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-semibold text-green-800 mb-2">📊 Resumen del Lote</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Total procesados:</strong> {results.totalProcessed}</p>
                      <p><strong>Exitosos:</strong> <span className="text-green-600">{results.successCount}</span></p>
                      <p><strong>Errores:</strong> <span className="text-red-600">{results.errorCount || 0}</span></p>
                    </div>
                    <div>
                      <p><strong>Tiempo total:</strong> {Math.round(results.totalTime/1000)}s</p>
                      <p><strong>Guardados en BD:</strong> <span className="text-blue-600">✅ Sí</span></p>
                      <p><strong>Estado:</strong> <span className="text-green-600">Completado</span></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">📄 Documentos Procesados:</h4>
                  {results.batchResults.slice(0, 5).map((doc, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-800">Documento {index + 1}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          doc.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {doc.success ? 'Exitoso' : 'Error'}
                        </span>
                      </div>

                      {doc.success && (
                        <div className="space-y-1 text-sm">
                          <p><strong>Tipo:</strong> {doc.classification?.type || 'N/A'}</p>
                          <p><strong>Confianza:</strong> {((doc.classification?.confidence || 0) * 100).toFixed(1)}%</p>

                          {doc.classification?.extractedFields?.cliente && (
                            <p><strong>Cliente:</strong> {doc.classification.extractedFields.cliente}</p>
                          )}
                          {doc.classification?.extractedFields?.fecha_contrato && (
                            <p><strong>Fecha:</strong> {doc.classification.extractedFields.fecha_contrato}</p>
                          )}
                          {doc.classification?.extractedFields?.monto && (
                            <p><strong>Monto:</strong> {doc.classification.extractedFields.monto}</p>
                          )}

                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <span className="text-xs text-green-600">✅ Guardado en base de datos</span>
                          </div>
                        </div>
                      )}

                      {!doc.success && (
                        <p className="text-sm text-red-600">Error: {doc.error}</p>
                      )}
                    </div>
                  ))}

                  {results.batchResults.length > 5 && (
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-600">
                        ... y {results.batchResults.length - 5} documentos más procesados exitosamente
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Resultado individual
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-semibold text-green-800 mb-2">📄 Documento Procesado</h4>
                  <div className="space-y-2">
                    <p><strong>Tipo:</strong> {results.classification?.type || 'N/A'}</p>
                    <p><strong>Confianza:</strong> {((results.classification?.confidence || 0) * 100).toFixed(1)}%</p>
                    <p><strong>Estado:</strong> <span className="text-green-600">✅ Procesado exitosamente</span></p>
                    <p><strong>Base de datos:</strong> <span className="text-blue-600">✅ Guardado</span></p>
                  </div>
                </div>

                {results.classification?.extractedFields && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="font-semibold text-blue-800 mb-2">📋 Datos Extraídos:</p>
                    <div className="space-y-1 text-sm">
                      {results.classification.extractedFields.cliente && (
                        <p><strong>Cliente:</strong> {results.classification.extractedFields.cliente}</p>
                      )}
                      {results.classification.extractedFields.fecha_contrato && (
                        <p><strong>Fecha contrato:</strong> {results.classification.extractedFields.fecha_contrato}</p>
                      )}
                      {results.classification.extractedFields.monto && (
                        <p><strong>Monto:</strong> {results.classification.extractedFields.monto}</p>
                      )}
                      {results.classification.extractedFields.tipo_pago && (
                        <p><strong>Tipo pago:</strong> {results.classification.extractedFields.tipo_pago}</p>
                      )}
                      {results.classification.extractedFields.sucursal && (
                        <p><strong>Sucursal:</strong> {results.classification.extractedFields.sucursal}</p>
                      )}
                      {results.classification.extractedFields.bloque && (
                        <p><strong>Bloque:</strong> {results.classification.extractedFields.bloque}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Tiempo procesamiento:</strong> {results.processingTime}ms</p>
                  <p><strong>ID resultado:</strong> {results.resultId}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Información del sistema */}
      <div className="mt-6 p-4 bg-gray-50 rounded text-sm text-gray-600">
        <h4 className="font-semibold mb-2">📋 Información del sistema:</h4>
        <ul className="space-y-1">
          <li>• <strong>Servidor OCR:</strong> http://localhost:3001</li>
          <li>• <strong>Tipos soportados:</strong> Contratos y Recibos EUROPIEL</li>
          <li>• <strong>Formatos:</strong> JPG, PNG, PDF, TIFF, BMP, WebP</li>
          <li>• <strong>Tamaño máximo:</strong> 10MB por archivo</li>
          <li>• <strong>Lote máximo:</strong> 200 archivos</li>
        </ul>
      </div>
    </div>
  );
};

export default OCRUploader;
