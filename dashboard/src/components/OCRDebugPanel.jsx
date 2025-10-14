import React, { useState } from 'react';

const OCRDebugPanel = ({ results }) => {
  const [showFullText, setShowFullText] = useState(false);
  const [selectedTab, setSelectedTab] = useState('logs');

  if (!results || !results.debugInfo) {
    return null;
  }

  const { debugInfo } = results;

  const formatText = (text) => {
    if (!text) return 'Sin texto';
    // Mostrar saltos de línea y espacios correctamente
    return text.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  };

  const getTextPreview = (text, maxLength = 300) => {
    if (!text) return 'Sin texto';
    if (text.length <= maxLength) return formatText(text);
    return formatText(text.substring(0, maxLength)) + '...';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Texto copiado al portapapeles');
    });
  };

  return (
    <div className="ocr-debug-panel bg-gray-50 border rounded-lg p-4 mt-4">
      <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
        🔍 Panel de Debug OCR
        <span className="ml-2 text-sm text-gray-600">
          (Confianza: {debugInfo.ocrConfidence}% | {debugInfo.textLength} caracteres)
        </span>
      </h4>

      {/* Pestañas */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setSelectedTab('logs')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'logs'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📋 Logs de Procesamiento
        </button>
        <button
          onClick={() => setSelectedTab('text')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'text'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📄 Texto OCR Completo
        </button>
        <button
          onClick={() => setSelectedTab('fields')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'fields'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🏷️ Campos Extraídos
        </button>
      </div>

      {/* Contenido de las pestañas */}
      {selectedTab === 'logs' && (
        <div className="space-y-2">
          <h5 className="font-medium text-gray-700">Pasos de Procesamiento:</h5>
          {debugInfo.processingSteps?.map((step, index) => (
            <div key={index} className="bg-white p-2 rounded border-l-4 border-blue-400">
              <code className="text-sm text-gray-700">{step}</code>
            </div>
          ))}
          
          <div className="bg-blue-50 p-3 rounded mt-4">
            <h6 className="font-medium text-blue-800 mb-2">📊 Estadísticas:</h6>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Tipo de documento:</strong> {debugInfo.documentType}</div>
              <div><strong>Confianza OCR:</strong> {debugInfo.ocrConfidence}%</div>
              <div><strong>Caracteres extraídos:</strong> {debugInfo.textLength}</div>
              <div><strong>Tiempo procesamiento:</strong> {results.processingTime}ms</div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'text' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h5 className="font-medium text-gray-700">Texto extraído por OCR:</h5>
            <div className="space-x-2">
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                {showFullText ? '📋 Vista previa' : '📄 Texto completo'}
              </button>
              <button
                onClick={() => copyToClipboard(debugInfo.originalText)}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                📋 Copiar texto
              </button>
            </div>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
            {showFullText 
              ? formatText(debugInfo.originalText)
              : getTextPreview(debugInfo.originalText, 500)
            }
          </div>
          
          {!showFullText && debugInfo.textLength > 500 && (
            <p className="text-gray-600 text-sm mt-2">
              Mostrando primeros 500 de {debugInfo.textLength} caracteres. 
              <button 
                onClick={() => setShowFullText(true)}
                className="text-blue-500 hover:underline ml-1"
              >
                Ver todo
              </button>
            </p>
          )}
        </div>
      )}

      {selectedTab === 'fields' && (
        <div>
          <h5 className="font-medium text-gray-700 mb-3">Campos extraídos automáticamente:</h5>
          <div className="space-y-2">
            {Object.entries(debugInfo.extractedFields || {}).map(([key, value]) => (
              <div key={key} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-blue-600">{key}:</span>
                    <span className="ml-2 text-gray-800">
                      {value !== null && value !== undefined ? String(value) : 'No encontrado'}
                    </span>
                  </div>
                  {value && (
                    <button
                      onClick={() => copyToClipboard(String(value))}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                      title="Copiar valor"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {Object.keys(debugInfo.extractedFields || {}).length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-yellow-700">⚠️ No se extrajeron campos automáticamente</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OCRDebugPanel;