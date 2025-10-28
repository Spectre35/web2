import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

const UploadCleanupManager = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState('');

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    loadStats();
    // Recargar estadísticas cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/cleanup/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        setMessage('❌ Error cargando estadísticas: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error de conexión: ' + error.message);
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanOldFiles = async (daysOld = 1) => {
    if (!confirm(`¿Estás seguro de eliminar archivos de más de ${daysOld} día(s)?`)) {
      return;
    }

    try {
      setCleaning(true);
      setMessage(`🧹 Eliminando archivos de más de ${daysOld} día(s)...`);

      const response = await fetch(`${API_BASE_URL}/api/cleanup/old-files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysOld })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        await loadStats(); // Recargar estadísticas
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error de conexión: ${error.message}`);
      console.error('Error en limpieza:', error);
    } finally {
      setCleaning(false);
    }
  };

  const cleanAllFiles = async () => {
    const confirmText = prompt(
      '🚨 ¡CUIDADO! Esto eliminará TODOS los archivos de uploads.\n\n' +
      'Escribe exactamente "DELETE_ALL_UPLOADS" para confirmar:'
    );

    if (confirmText !== 'DELETE_ALL_UPLOADS') {
      setMessage('❌ Limpieza cancelada - confirmación incorrecta');
      return;
    }

    try {
      setCleaning(true);
      setMessage('🚨 ELIMINANDO TODOS LOS ARCHIVOS...');

      const response = await fetch(`${API_BASE_URL}/api/cleanup/all-files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_ALL_UPLOADS' })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        await loadStats(); // Recargar estadísticas
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error de conexión: ${error.message}`);
      console.error('Error en limpieza completa:', error);
    } finally {
      setCleaning(false);
    }
  };

  const formatFileSize = (sizeMB) => {
    const size = parseFloat(sizeMB);
    if (size < 1) return `${(size * 1024).toFixed(1)} KB`;
    if (size < 1024) return `${size.toFixed(1)} MB`;
    return `${(size / 1024).toFixed(1)} GB`;
  };

  const getStatusColor = (fileCount, sizeMB) => {
    const size = parseFloat(sizeMB);
    if (fileCount === 0) return 'text-green-400';
    if (size < 100) return 'text-yellow-400';
    if (size < 500) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="backdrop-blur-lg bg-white/10 p-6 rounded-xl shadow-xl border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-100 drop-shadow">
          🧹 Gestor de Limpieza de Uploads
        </h3>
        <button
          onClick={loadStats}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          {loading ? '🔄' : '↻'} Actualizar
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-900/20 border border-green-600/30 text-green-300'
            : message.includes('❌')
            ? 'bg-red-900/20 border border-red-600/30 text-red-300'
            : 'bg-blue-900/20 border border-blue-600/30 text-blue-300'
        }`}>
          {message}
        </div>
      )}

      {stats ? (
        <>
          {/* Estadísticas generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/50">
              <div className="text-2xl font-bold text-gray-100">
                {stats.totalFiles}
              </div>
              <div className="text-gray-300 text-sm">Archivos Totales</div>
            </div>
            <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/50">
              <div className={`text-2xl font-bold ${getStatusColor(stats.totalFiles, stats.totalSizeMB)}`}>
                {formatFileSize(stats.totalSizeMB)}
              </div>
              <div className="text-gray-300 text-sm">Espacio Utilizado</div>
            </div>
          </div>

          {/* Estadísticas por directorio */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-3">📂 Por Directorio</h4>
            <div className="space-y-2">
              {stats.directories.map((dir, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    dir.exists 
                      ? 'bg-gray-800/30 border-gray-600/40' 
                      : 'bg-gray-900/30 border-gray-700/40'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-200 font-medium">
                        {dir.exists ? '📁' : '📂'} {dir.name}
                      </div>
                      <div className="text-gray-400 text-sm font-mono">
                        {dir.path}
                      </div>
                    </div>
                    <div className="text-right">
                      {dir.exists ? (
                        <>
                          <div className={`font-bold ${getStatusColor(dir.fileCount, dir.sizeMB)}`}>
                            {dir.fileCount} archivos
                          </div>
                          <div className="text-gray-300 text-sm">
                            {formatFileSize(dir.sizeMB)}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-500 italic">No existe</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones de limpieza */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-200">🛠️ Acciones de Limpieza</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Limpieza suave */}
              <button
                onClick={() => cleanOldFiles(1)}
                disabled={cleaning || stats.totalFiles === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm"
              >
                {cleaning ? '🔄' : '🧹'} Archivos &gt; 1 día
              </button>

              {/* Limpieza media */}
              <button
                onClick={() => cleanOldFiles(0.5)}
                disabled={cleaning || stats.totalFiles === 0}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm"
              >
                {cleaning ? '🔄' : '🧹'} Archivos &gt; 12 horas
              </button>

              {/* Limpieza agresiva */}
              <button
                onClick={() => cleanOldFiles(0.1)}
                disabled={cleaning || stats.totalFiles === 0}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm"
              >
                {cleaning ? '🔄' : '🧹'} Archivos &gt; 2 horas
              </button>
            </div>

            {/* Limpieza completa - botón separado y más prominente */}
            {stats.totalFiles > 0 && (
              <div className="pt-3 border-t border-gray-700/50">
                <button
                  onClick={cleanAllFiles}
                  disabled={cleaning}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-bold transition-colors border-2 border-red-500/50 hover:border-red-400/70"
                >
                  {cleaning ? '🔄 Procesando...' : '🚨 ELIMINAR TODOS LOS ARCHIVOS'}
                </button>
                <p className="text-red-400 text-xs text-center mt-2 italic">
                  ⚠️ Esta acción es irreversible y eliminará TODOS los archivos
                </p>
              </div>
            )}
          </div>

          {/* Información automática */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <h4 className="text-blue-300 font-semibold mb-2">ℹ️ Limpieza Automática</h4>
            <div className="text-blue-200 text-sm space-y-1">
              <p>• Los archivos se eliminan automáticamente después del procesamiento exitoso</p>
              <p>• Limpieza automática cada 30 minutos de archivos &gt; 2 horas</p>
              <p>• Límite automático de almacenamiento: 1GB total</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400">
            {loading ? '🔄 Cargando estadísticas...' : '📊 Carga las estadísticas para comenzar'}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCleanupManager;