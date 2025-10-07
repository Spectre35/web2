import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export default function OCRSystem() {
  // Estados principales
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({});
  const [patterns, setPatterns] = useState([]);
  
  // Estados de configuración
  const [config, setConfig] = useState({
    language: 'spa+eng',
    documentType: 'general',
    userId: 'user-001'
  });

  // Estados de interfaz
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedText, setSelectedText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [feedbackMode, setFeedbackMode] = useState(false);

  // Refs
  const textAreaRef = useRef(null);

  useEffect(() => {
    loadDocuments();
    loadStats();
    loadPatterns();
  }, []);

  // ================= 📤 FUNCIONES DE SUBIDA Y PROCESAMIENTO =================

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setProcessing(true);
    
    try {
      for (const file of acceptedFiles) {
        await processFile(file);
      }
      
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error('Error procesando archivos:', error);
    } finally {
      setProcessing(false);
    }
  };

  const processFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', config.documentType);
    formData.append('language', config.language);
    formData.append('userId', config.userId);
    // Agregar configuración manual
    formData.append('sucursal', 'AVANTA'); // Configuración de prueba
    formData.append('bloque', 'MTY1');     // Configuración de prueba
    formData.append('caja', '10');         // Configuración de prueba

    const response = await fetch(`${API_BASE_URL}/api/ocr/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Error procesando ${file.name}`);
    }

    const result = await response.json();
    
    console.log('📊 Respuesta completa del servidor:', result);
    
    if (result.success) {
      // Manejar múltiples recibos o recibo único
      if (result.multipleReceipts && result.data && Array.isArray(result.data)) {
        // Múltiples recibos detectados
        console.log(`🎯 Se detectaron ${result.totalReceipts} recibos`);
        setCurrentDocument({
          ...result,
          isMultipleReceipts: true,
          receipts: result.data,
          filename: result.originalFilename,
          summary: result.summary
        });
      } else if (result.data) {
        // Recibo único
        setCurrentDocument(result.data);
      } else {
        console.error('Error: respuesta sin datos válidos', result);
        throw new Error(`No se pudieron obtener los datos del procesamiento de ${file.name}`);
      }
      setActiveTab('results');
    } else {
      console.error('Error: respuesta sin datos válidos', result);
      throw new Error(`No se pudieron obtener los datos del procesamiento de ${file.name}`);
    }

    return result;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff'],
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: processing
  });

  // ================= 📊 FUNCIONES DE DATOS =================

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr/documents?limit=20`);
      const result = await response.json();
      
      if (result.success) {
        setDocuments(result.data.documents);
      }
    } catch (error) {
      console.error('Error cargando documentos:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr/stats?period=7d`);
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const loadPatterns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr/patterns?limit=20`);
      const result = await response.json();
      
      if (result.success) {
        setPatterns(result.data);
      }
    } catch (error) {
      console.error('Error cargando patrones:', error);
    }
  };

  // ================= 🎓 FUNCIONES DE FEEDBACK =================

  const submitFeedback = async () => {
    if (!currentDocument || !selectedText || !correctedText) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resultId: currentDocument.resultId,
          originalText: selectedText,
          correctedText: correctedText,
          correctionType: 'manual'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Actualizar el texto corregido en el documento actual
        setCurrentDocument(prev => ({
          ...prev,
          correctedText: prev.correctedText.replace(selectedText, correctedText)
        }));
        
        setFeedbackMode(false);
        setSelectedText('');
        setCorrectedText('');
        
        // Recargar patrones para mostrar el nuevo aprendizaje
        await loadPatterns();
        await loadStats();
      }
    } catch (error) {
      console.error('Error enviando feedback:', error);
    }
  };

  const selectTextForCorrection = (text) => {
    setSelectedText(text);
    setCorrectedText(text);
    setFeedbackMode(true);
  };

  // ================= 🎨 COMPONENTES DE INTERFAZ =================

  const UploadArea = () => (
    <div className="space-y-6">
      {/* Configuración */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white text-lg font-bold mb-4">⚙️ Configuración</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              🌐 Idioma
            </label>
            <select
              value={config.language}
              onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
            >
              <option value="spa+eng">Español + Inglés</option>
              <option value="spa">Solo Español</option>
              <option value="eng">Solo Inglés</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              📄 Tipo de Documento
            </label>
            <select
              value={config.documentType}
              onChange={(e) => setConfig(prev => ({ ...prev, documentType: e.target.value }))}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
            >
              <option value="general">General</option>
              <option value="invoice">Factura</option>
              <option value="contract">Contrato</option>
              <option value="form">Formulario</option>
              <option value="receipt">Recibo</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              👤 Usuario
            </label>
            <input
              type="text"
              value={config.userId}
              onChange={(e) => setConfig(prev => ({ ...prev, userId: e.target.value }))}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
              placeholder="ID del usuario"
            />
          </div>
        </div>
      </div>

      {/* Área de subida */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
          ${isDragActive 
            ? 'border-blue-400 bg-blue-500/10' 
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
          }
          ${processing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {processing ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-blue-400 text-lg font-medium">Procesando archivo(s)...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📄</div>
            <div>
              <p className="text-white text-xl font-medium mb-2">
                {isDragActive ? '¡Suelta los archivos aquí!' : 'Arrastra archivos o haz clic para seleccionar'}
              </p>
              <p className="text-gray-400">
                Soporta: JPEG, PNG, GIF, BMP, TIFF, PDF (máx. 10MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const ResultsView = () => (
    <div className="space-y-6">
      {currentDocument && (
        <>
          {/* Información general del documento */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-white text-lg font-bold mb-4">📋 Información del Documento</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Archivo:</span>
                <p className="text-white font-medium">{currentDocument.filename || 'Sin nombre'}</p>
              </div>
              <div>
                <span className="text-gray-400">Recibos detectados:</span>
                <p className="text-white font-medium">
                  {currentDocument.isMultipleReceipts ? currentDocument.totalReceipts : 1}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Procesamiento:</span>
                <p className="text-white font-medium">
                  {currentDocument.isMultipleReceipts 
                    ? `${currentDocument.summary?.totalProcessingTime || 0}ms` 
                    : `${currentDocument.processingTime || 0}ms`}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Estado:</span>
                <p className="text-white font-medium">
                  {currentDocument.isMultipleReceipts 
                    ? `${currentDocument.summary?.successful || 0}/${currentDocument.summary?.totalProcessed || 0} exitosos`
                    : 'Procesado'}
                </p>
              </div>
            </div>
          </div>

          {/* Mostrar múltiples recibos o recibo único */}
          {currentDocument.isMultipleReceipts ? (
            <div className="space-y-6">
              <h3 className="text-white text-xl font-bold">🎯 Recibos Detectados ({currentDocument.totalReceipts})</h3>
              
              {currentDocument.receipts.map((receipt, index) => (
                <div key={index} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-white text-lg font-bold mb-4">
                    � Recibo {receipt.receiptNumber || index + 1}
                    {receipt.databaseInsertion?.success && (
                      <span className="ml-2 text-green-400 text-sm">✅ Insertado en BD</span>
                    )}
                    {receipt.databaseInsertion?.success === false && (
                      <span className="ml-2 text-red-400 text-sm">❌ No insertado</span>
                    )}
                  </h4>
                  
                  {/* Información del recibo */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-400">Archivo:</span>
                      <p className="text-white font-medium">{receipt.filename || 'Sin nombre'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Confianza OCR:</span>
                      <p className="text-white font-medium">{((receipt.confidence || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Tiempo:</span>
                      <p className="text-white font-medium">{receipt.processingTime || 0}ms</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Tipo:</span>
                      <p className="text-white font-medium">{receipt.classification?.tipo || 'No clasificado'}</p>
                    </div>
                  </div>

                  {/* Datos extraídos */}
                  {receipt.classification?.datosExtraidos && (
                    <div className="mb-4">
                      <h5 className="text-white text-md font-bold mb-2">🔍 Datos Extraídos</h5>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {Object.entries(receipt.classification.datosExtraidos).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                              <p className="text-white font-medium">
                                {value !== undefined && value !== null ? String(value) : 'No encontrado'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Motivo de no inserción */}
                  {receipt.databaseInsertion?.success === false && (
                    <div className="mb-4">
                      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                        <h6 className="text-red-400 font-bold mb-2">❌ Motivo de no inserción:</h6>
                        <p className="text-red-300 text-sm">{receipt.databaseInsertion.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Texto extraído */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <h5 className="text-white text-md font-bold mb-3">🔍 Texto Original (OCR)</h5>
                      <div className="bg-gray-950/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                        <pre className="text-gray-300 text-xs whitespace-pre-wrap">
                          {receipt.originalText && receipt.originalText.trim() ? 
                            receipt.originalText : 
                            'No se pudo extraer texto del documento'
                          }
                        </pre>
                      </div>
                      {receipt.originalText && (
                        <div className="mt-2 text-xs text-gray-400">
                          📏 Longitud: {receipt.originalText.length} caracteres
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <h5 className="text-white text-md font-bold mb-3">✨ Texto para Editar</h5>
                      <textarea
                        className="w-full bg-gray-950/50 text-gray-300 text-xs p-3 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none resize-none"
                        rows={10}
                        value={receipt.correctedText || receipt.originalText || ''}
                        onChange={(e) => {
                          // Actualizar el texto corregido del recibo específico
                          const updatedReceipts = [...currentDocument.receipts];
                          updatedReceipts[index] = {
                            ...updatedReceipts[index],
                            correctedText: e.target.value
                          };
                          setCurrentDocument({
                            ...currentDocument,
                            receipts: updatedReceipts
                          });
                        }}
                        placeholder="Aquí puedes editar el texto extraído para entrenamiento..."
                      />
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-xs text-gray-400">
                          ✏️ Texto editable para retroalimentación
                        </div>
                        <button
                          onClick={() => selectTextForCorrection(receipt.originalText || '')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          🎓 Entrenar IA
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Separador entre recibos */}
                  {index < currentDocument.receipts.length - 1 && (
                    <hr className="mt-6 border-gray-600" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Vista de recibo único (código original)
            <>
              {/* Información del documento único */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-6">
                <div>
                  <span className="text-gray-400">Confianza:</span>
                  <p className="text-white font-medium">{((currentDocument.confidence || 0) * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-gray-400">Tiempo:</span>
                  <p className="text-white font-medium">{currentDocument.processingTime || 0}ms</p>
                </div>
                <div>
                  <span className="text-gray-400">Mejora:</span>
                  <p className="text-white font-medium">{((currentDocument.improvementScore || 0) * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-gray-400">Longitud:</span>
                  <p className="text-white font-medium">{currentDocument.textLength || 0} caracteres</p>
                </div>
              </div>

              {/* Texto extraído del recibo único */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-white text-md font-bold mb-4">🔍 Texto Original (OCR)</h4>
                  <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap">
                      {currentDocument.originalText && currentDocument.originalText.trim() ? 
                        currentDocument.originalText : 
                        'No se pudo extraer texto del documento'
                      }
                    </pre>
                  </div>
                  {currentDocument.originalText && (
                    <div className="mt-2 text-xs text-gray-400">
                      📏 Longitud: {currentDocument.originalText.length} caracteres
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-white text-md font-bold mb-4">✨ Texto Corregido (Editable)</h4>
                  <textarea
                    className="w-full bg-gray-900/50 text-gray-300 text-sm p-4 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none resize-none"
                    rows={15}
                    value={currentDocument.correctedText || currentDocument.originalText || ''}
                    onChange={(e) => {
                      setCurrentDocument({
                        ...currentDocument,
                        correctedText: e.target.value
                      });
                    }}
                    placeholder="Aquí puedes editar el texto extraído para entrenamiento..."
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      ✏️ Haz clic aquí para editar y entrenar la IA
                    </div>
                    <button
                      onClick={() => selectTextForCorrection(currentDocument.originalText || '')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      🎓 Entrenar IA
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  const DocumentsHistory = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-white text-lg font-bold">📚 Historial de Documentos</h3>
        <button
          onClick={loadDocuments}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      <div className="space-y-3">
        {documents.map(doc => (
          <div key={doc.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-white font-medium">{doc.filename}</h4>
                <p className="text-gray-400 text-sm">
                  {new Date(doc.upload_date).toLocaleString('es-MX')} • 
                  {doc.document_type} • 
                  {doc.confidence_score ? `${(doc.confidence_score * 100).toFixed(1)}% confianza` : 'Procesando...'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  doc.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  doc.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                  doc.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {doc.status}
                </span>
                <button
                  onClick={() => {/* cargar detalle del documento */}}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Ver detalle
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const StatsAndPatterns = () => (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white text-lg font-bold mb-4">📊 Estadísticas (Últimos 7 días)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {stats.documents?.total_documents || 0}
            </div>
            <div className="text-gray-400 text-sm">Documentos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats.documents?.total_corrections || 0}
            </div>
            <div className="text-gray-400 text-sm">Correcciones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {stats.documents?.avg_confidence ? (stats.documents.avg_confidence * 100).toFixed(1) + '%' : '0%'}
            </div>
            <div className="text-gray-400 text-sm">Confianza Prom.</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {stats.patterns?.total_patterns || 0}
            </div>
            <div className="text-gray-400 text-sm">Patrones</div>
          </div>
        </div>
      </div>

      {/* Patrones aprendidos */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white text-lg font-bold mb-4">🧠 Patrones Aprendidos</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {patterns.map((pattern, index) => (
            <div key={index} className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <span className="text-red-400 text-sm">"{pattern.original_pattern}"</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="text-green-400 text-sm">"{pattern.corrected_pattern}"</span>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>Usado {pattern.frequency} veces</div>
                  <div>{(pattern.accuracy_score * 100).toFixed(1)}% precisión</div>
                </div>
              </div>
              <div className="mt-1">
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                  {pattern.pattern_type}
                </span>
                {pattern.context_category && (
                  <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs ml-2">
                    {pattern.context_category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ================= 🎨 RENDER PRINCIPAL =================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 mb-4">
            🔍 Sistema OCR Inteligente
          </h1>
          <p className="text-gray-300 text-lg">
            OCR con auto-retroalimentación y aprendizaje automático
          </p>
        </div>

        {/* Navegación por pestañas */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-800/50 rounded-xl p-1">
            {[
              { id: 'upload', label: '📤 Subir', icon: '📤' },
              { id: 'results', label: '📄 Resultados', icon: '📄' },
              { id: 'history', label: '📚 Historial', icon: '📚' },
              { id: 'stats', label: '📊 Estadísticas', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de pestañas */}
        <div className="min-h-[600px]">
          {activeTab === 'upload' && <UploadArea />}
          {activeTab === 'results' && <ResultsView />}
          {activeTab === 'history' && <DocumentsHistory />}
          {activeTab === 'stats' && <StatsAndPatterns />}
        </div>

        {/* Modal de feedback */}
        {feedbackMode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-white text-lg font-bold mb-4">🎓 Entrenar Modelo</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Texto Original (OCR):
                  </label>
                  <textarea
                    value={selectedText}
                    onChange={(e) => setSelectedText(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
                    rows={3}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Texto Corregido:
                  </label>
                  <textarea
                    ref={textAreaRef}
                    value={correctedText}
                    onChange={(e) => setCorrectedText(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
                    rows={3}
                    placeholder="Escribe la corrección aquí..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setFeedbackMode(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitFeedback}
                  disabled={!correctedText || correctedText === selectedText}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
                >
                  🎓 Entrenar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
