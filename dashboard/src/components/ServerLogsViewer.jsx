import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ServerLogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:3001/api/ocr/debug/logs?limit=100');
      
      if (response.data.success) {
        setLogs(response.data.logs);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error obteniendo logs del servidor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await axios.post('http://localhost:3001/api/ocr/debug/logs/clear');
      setLogs([]);
      alert('Logs del servidor limpiados');
    } catch (error) {
      console.error('Error limpiando logs:', error);
      alert('Error limpiando logs del servidor');
    }
  };

  const copyAllLogs = () => {
    const allLogsText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\\n');
    navigator.clipboard.writeText(allLogsText).then(() => {
      alert('Todos los logs copiados al portapapeles');
    });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 3000); // Actualizar cada 3 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getLogStyle = (message) => {
    if (message.includes('📝 === TEXTO EXTRAÍDO POR OCR') || message.includes('📋 TEXTO COMPLETO:')) {
      return 'bg-green-50 border-l-4 border-green-500 text-green-800';
    }
    if (message.includes('❌') || message.includes('ERROR')) {
      return 'bg-red-50 border-l-4 border-red-500 text-red-800';
    }
    if (message.includes('⚠️') || message.includes('WARN')) {
      return 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800';
    }
    if (message.includes('✅') || message.includes('SUCCESS')) {
      return 'bg-blue-50 border-l-4 border-blue-500 text-blue-800';
    }
    if (message.includes('🔍') || message.includes('DEBUG')) {
      return 'bg-purple-50 border-l-4 border-purple-500 text-purple-800';
    }
    return 'bg-gray-50 border-l-4 border-gray-300 text-gray-700';
  };

  return (
    <div className="server-logs-viewer bg-white p-6 rounded-lg shadow-lg mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          📜 Logs del Servidor OCR
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded text-sm font-medium ${
              autoRefresh
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {autoRefresh ? '⏸️ Detener' : '▶️ Auto-actualizar'}
          </button>
          
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {isLoading ? '🔄' : '🔄 Actualizar'}
          </button>
          
          <button
            onClick={copyAllLogs}
            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            📋 Copiar todos
          </button>
          
          <button
            onClick={clearLogs}
            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {lastUpdate && (
        <p className="text-sm text-gray-500 mb-3">
          Última actualización: {lastUpdate} | {logs.length} entradas
          {autoRefresh && <span className="ml-2 text-green-600">• Auto-actualizando</span>}
        </p>
      )}

      <div className="logs-container bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay logs disponibles</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`p-2 rounded text-sm ${getLogStyle(log.message)}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs opacity-75">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                  {log.message}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <h4 className="font-medium mb-2">💡 Guía de colores:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Texto OCR extraído</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span>Operaciones exitosas</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span>Errores</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span>Advertencias</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
            <span>Información de debug</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
            <span>Logs generales</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerLogsViewer;