import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Database, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Search,
  MessageSquare,
  FileText
} from 'lucide-react';
import { getApiUrl } from '../utils/configManager';

const ChatBotStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${getApiUrl()}/api/rag-status?diagnostics=true`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
        setLastUpdate(new Date());
      } else {
        setError(data.error || 'Error obteniendo estadísticas');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReindex = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/api/rag-reindex`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refrescar stats después de reindexar
        setTimeout(fetchStats, 2000);
      } else {
        setError(data.error || 'Error en reindexación');
      }
    } catch (err) {
      setError('Error ejecutando reindexación');
    }
  };

  const testChatbot = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/chat-test`);
      const data = await response.json();
      
      if (data.success) {
        alert(`Test exitoso!\nRespuesta: ${data.response.slice(0, 100)}...\nTiempo: ${data.processingTime}ms`);
      } else {
        alert(`Test falló: ${data.error}`);
      }
    } catch (err) {
      alert('Error ejecutando test');
    }
  };

  if (loading && !stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="animate-spin mr-2" size={20} />
          <span>Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center text-red-600 dark:text-red-400">
          <AlertCircle className="mr-2" size={20} />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchStats}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const isSystemHealthy = stats?.ragAvailable && 
                         stats?.diagnostics?.overall?.success;

  return (
    <div className="space-y-6">
      {/* Header con estado general */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Brain className="text-blue-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Estado del Chatbot Inteligente
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {isSystemHealthy ? (
              <>
                <CheckCircle className="text-green-500" size={20} />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Sistema Activo
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="text-red-500" size={20} />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Sistema Inactivo
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Base de conocimientos */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="text-blue-600" size={16} />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Base de Conocimientos
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {stats?.stats?.vectorStoreSize || 0}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              documentos indexados
            </p>
          </div>

          {/* Última actualización */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="text-green-600" size={16} />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Última Actualización
              </span>
            </div>
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              {stats?.stats?.lastIngestTime 
                ? new Date(stats.stats.lastIngestTime).toLocaleDateString('es-ES')
                : 'No disponible'
              }
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              {lastUpdate ? `Consultado: ${lastUpdate.toLocaleTimeString('es-ES')}` : ''}
            </p>
          </div>

          {/* Estado de Ollama */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="text-purple-600" size={16} />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Motor IA
              </span>
            </div>
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
              {stats?.diagnostics?.ollama?.embeddings?.online ? 'Conectado' : 'Desconectado'}
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Ollama {stats?.diagnostics?.ollama?.embeddings?.online ? '✓' : '✗'}
            </p>
          </div>
        </div>
      </div>

      {/* Diagnósticos detallados */}
      {stats?.diagnostics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Diagnósticos del Sistema
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Test de embeddings */}
            {stats.diagnostics.components?.embeddings && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Search size={16} className="text-blue-500" />
                  <span className="font-medium">Embeddings</span>
                  {stats.diagnostics.components.embeddings.success ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tiempo: {stats.diagnostics.components.embeddings.duration}ms
                </p>
              </div>
            )}

            {/* Test de recuperación */}
            {stats.diagnostics.components?.retrieval && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText size={16} className="text-green-500" />
                  <span className="font-medium">Búsqueda</span>
                  {stats.diagnostics.components.retrieval.success ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Resultados: {stats.diagnostics.components.retrieval.resultsCount || 0}
                </p>
              </div>
            )}

            {/* Test de generación */}
            {stats.diagnostics.components?.generation && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare size={16} className="text-purple-500" />
                  <span className="font-medium">Generación</span>
                  {stats.diagnostics.components.generation.success ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tiempo: {stats.diagnostics.components.generation.duration}ms
                </p>
              </div>
            )}

            {/* Test completo RAG */}
            {stats.diagnostics.ragTest && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain size={16} className="text-orange-500" />
                  <span className="font-medium">RAG Completo</span>
                  {stats.diagnostics.ragTest.success ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Contexto: {stats.diagnostics.ragTest.contextUsed || 0} fuentes
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuración y acciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Configuración y Mantenimiento
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Configuración actual */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Configuración Actual
            </h4>
            {stats?.stats?.config && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Modelo de Embeddings:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {stats.stats.config.embeddingModel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Modelo de Generación:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {stats.stats.config.generationModel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Temperatura:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {stats.stats.config.temperature}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Resultados por defecto:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {stats.stats.config.defaultK}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Acciones
            </h4>
            <div className="space-y-2">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                <span>Actualizar Estado</span>
              </button>
              
              <button
                onClick={testChatbot}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <MessageSquare size={16} />
                <span>Probar Chatbot</span>
              </button>
              
              <button
                onClick={handleReindex}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <Database size={16} />
                <span>Reindexar Documentos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          El sistema RAG utiliza {stats?.stats?.vectorStoreSize || 0} documentos para proporcionar respuestas inteligentes.
          {stats?.stats?.lastIngestTime && (
            <>
              {' '}Última actualización: {new Date(stats.stats.lastIngestTime).toLocaleString('es-ES')}.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default ChatBotStats;