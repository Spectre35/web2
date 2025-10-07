import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

const ProcesadorDistribuido = () => {
  const [configuracion, setConfiguracion] = useState({
    limit: 500,
    delayEntreLotes: 2000,
    soloFaltantes: true
  });
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [apis, setApis] = useState([]);

  useEffect(() => {
    cargarAPIs();
  }, []);

  const cargarAPIs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/apis-info`);
      const data = await response.json();
      if (data.success) {
        setApis(data.data);
      }
    } catch (error) {
      console.error('Error cargando APIs:', error);
    }
  };

  const iniciarProcesamientoDistribuido = async () => {
    setProcesando(true);
    setProgreso('Iniciando procesamiento distribuido...');
    setResultados(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/procesar-bins-distribuido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuracion)
      });

      const data = await response.json();
      
      if (data.success) {
        setResultados(data);
        setProgreso('Procesamiento completado');
      } else {
        setProgreso(`Error: ${data.message}`);
      }
    } catch (error) {
      setProgreso(`Error de conexión: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const apisHabilitadas = apis.filter(api => api.enabled);
  const capacidadTotal = apisHabilitadas.reduce((total, api) => total + (api.rateLimitPerHour || 0), 0);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">⚡ Procesador Distribuido de BINs</h1>
        
        {/* Información de capacidad */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400">APIs Activas</h3>
            <p className="text-2xl font-bold text-white">{apisHabilitadas.length}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400">Capacidad Total/Hora</h3>
            <p className="text-2xl font-bold text-white">{capacidadTotal}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-400">Capacidad/Mes</h3>
            <p className="text-2xl font-bold text-white">{(capacidadTotal * 24 * 30).toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-yellow-400">BINs por API</h3>
            <p className="text-2xl font-bold text-white">~{Math.floor(configuracion.limit / Math.max(apisHabilitadas.length, 1))}</p>
          </div>
        </div>

        {/* Configuración */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">⚙️ Configuración del Procesamiento</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Límite de BINs a procesar
              </label>
              <input
                type="number"
                value={configuracion.limit}
                onChange={(e) => setConfiguracion({...configuracion, limit: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg"
                disabled={procesando}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Delay entre lotes (ms)
              </label>
              <input
                type="number"
                value={configuracion.delayEntreLotes}
                onChange={(e) => setConfiguracion({...configuracion, delayEntreLotes: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg"
                disabled={procesando}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Modo de procesamiento
              </label>
              <select
                value={configuracion.soloFaltantes}
                onChange={(e) => setConfiguracion({...configuracion, soloFaltantes: e.target.value === 'true'})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg"
                disabled={procesando}
              >
                <option value="true">Solo BINs faltantes</option>
                <option value="false">Todos los BINs</option>
              </select>
            </div>
          </div>
        </div>

        {/* APIs en uso */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">🔧 APIs que se utilizarán</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apisHabilitadas.map((api, index) => (
              <div key={api.key} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">{api.name}</h3>
                  <span className="text-xs text-green-400">✅ Activa</span>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>Límite: {api.rateLimitPerHour}/hora</p>
                  <p>Uso actual: {api.usosActuales || 0}</p>
                  <p>BINs asignados: ~{Math.floor(configuracion.limit / apisHabilitadas.length) + (index < configuracion.limit % apisHabilitadas.length ? 1 : 0)}</p>
                </div>
              </div>
            ))}
          </div>
          
          {apisHabilitadas.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No hay APIs habilitadas. Ve al Gestor de APIs para habilitar al menos una.
            </div>
          )}
        </div>

        {/* Botón de inicio */}
        <div className="text-center mb-8">
          <button
            onClick={iniciarProcesamientoDistribuido}
            disabled={procesando || apisHabilitadas.length === 0}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-lg font-semibold"
          >
            {procesando ? 'Procesando...' : '🚀 Iniciar Procesamiento Distribuido'}
          </button>
        </div>

        {/* Progreso */}
        {progreso && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-8">
            <div className="flex items-center space-x-3">
              {procesando && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              )}
              <span className="text-white">{progreso}</span>
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultados && resultados.estadisticas && (
          <div className="space-y-6">
            {/* Estadísticas generales */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">📊 Resultados del Procesamiento</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{resultados.estadisticas.totalBinsIntentados}</p>
                  <p className="text-sm text-gray-400">BINs Procesados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{resultados.estadisticas.totalExitosos}</p>
                  <p className="text-sm text-gray-400">Exitosos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{resultados.estadisticas.totalErrores}</p>
                  <p className="text-sm text-gray-400">Errores</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{resultados.estadisticas.tasaExito}</p>
                  <p className="text-sm text-gray-400">Tasa de Éxito</p>
                </div>
              </div>
            </div>

            {/* Resultados por API */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">📈 Resultados por API</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resultados.estadisticas.apisDetail.map((apiResult, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">{apiResult.api}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Exitosos:</span>
                        <span className="text-green-400 font-mono">{apiResult.exitosos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Errores:</span>
                        <span className="text-red-400 font-mono">{apiResult.errores}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rate Limited:</span>
                        <span className="text-yellow-400 font-mono">{apiResult.rateLimited}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tasa de Éxito:</span>
                        <span className="text-blue-400 font-mono">{apiResult.tasaExito}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Información del sistema */}
        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">ℹ️ Cómo funciona el procesamiento distribuido</h3>
          <ul className="text-gray-300 space-y-1">
            <li>• Distribuye los BINs equitativamente entre todas las APIs habilitadas</li>
            <li>• Cada API procesa su lote de BINs en paralelo con las otras</li>
            <li>• Maximiza la velocidad usando toda la capacidad disponible simultáneamente</li>
            <li>• Respeta los rate limits individuales de cada API</li>
            <li>• Proporciona estadísticas detalladas por API y generales</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProcesadorDistribuido;
