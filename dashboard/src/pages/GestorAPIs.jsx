import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

const GestorAPIs = () => {
  const [apis, setApis] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [configurando, setConfigurando] = useState(null);
  const [formConfig, setFormConfig] = useState({});

  useEffect(() => {
    cargarAPIs();
  }, []);

  const cargarAPIs = async () => {
    try {
      setCargando(true);
      const response = await fetch(`${API_BASE_URL}/api/apis-info`);
      const data = await response.json();
      if (data.success) {
        setApis(data.data);
      }
    } catch (error) {
      console.error('Error cargando APIs:', error);
    } finally {
      setCargando(false);
    }
  };

  const configurarAPI = async (apiKey, config) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/configurar-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, config })
      });
      
      const data = await response.json();
      if (data.success) {
        await cargarAPIs();
        setConfigurando(null);
        setFormConfig({});
      }
    } catch (error) {
      console.error('Error configurando API:', error);
    }
  };

  const probarAPI = async (apiKey) => {
    const binPrueba = '448590'; // BIN de prueba conocido
    try {
      const response = await fetch(`${API_BASE_URL}/api/buscar-bin-api-especifica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bin: binPrueba, apiKey })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`✅ API ${data.api_utilizada} funcionando correctamente!\n\nBanco: ${data.data.banco}`);
      } else {
        alert(`❌ Error probando API: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ Error de conexión: ${error.message}`);
    }
  };

  if (cargando) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Cargando información de APIs...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔧 Gestor de APIs para BINs</h1>
        
        {/* Resumen de APIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400">Total APIs</h3>
            <p className="text-2xl font-bold text-white">{apis.length}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400">APIs Habilitadas</h3>
            <p className="text-2xl font-bold text-white">{apis.filter(api => api.enabled).length}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-400">Capacidad Total/Hora</h3>
            <p className="text-2xl font-bold text-white">
              {apis.filter(api => api.enabled).reduce((total, api) => total + (api.rateLimitPerHour || 0), 0)}
            </p>
          </div>
        </div>

        {/* Lista de APIs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {apis.map((api) => (
            <div key={api.key} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">{api.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    api.enabled 
                      ? 'bg-green-900 text-green-200' 
                      : 'bg-red-900 text-red-200'
                  }`}>
                    {api.enabled ? '✅ Habilitada' : '❌ Deshabilitada'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Límite por hora:</span>
                  <span className="text-white font-mono">{api.rateLimitPerHour || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Usos actuales:</span>
                  <span className="text-white font-mono">{api.usosActuales || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Disponibilidad:</span>
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        api.enabled && api.rateLimitPerHour 
                          ? (api.usosActuales / api.rateLimitPerHour) > 0.8 
                            ? 'bg-red-500' 
                            : (api.usosActuales / api.rateLimitPerHour) > 0.5 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                          : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: api.enabled && api.rateLimitPerHour 
                          ? `${Math.min((api.usosActuales / api.rateLimitPerHour) * 100, 100)}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => {
                    setConfigurando(api.key);
                    setFormConfig({
                      enabled: api.enabled,
                      rateLimitPerHour: api.rateLimitPerHour || 1000
                    });
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  ⚙️ Configurar
                </button>
                {api.enabled && (
                  <button
                    onClick={() => probarAPI(api.key)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    🧪 Probar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal de configuración */}
        {configurando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 w-full max-w-md">
              <h3 className="text-xl font-semibold text-white mb-4">
                Configurar {apis.find(a => a.key === configurando)?.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estado
                  </label>
                  <select
                    value={formConfig.enabled ? 'true' : 'false'}
                    onChange={(e) => setFormConfig({...formConfig, enabled: e.target.value === 'true'})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg"
                  >
                    <option value="true">Habilitada</option>
                    <option value="false">Deshabilitada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Límite por hora
                  </label>
                  <input
                    type="number"
                    value={formConfig.rateLimitPerHour || ''}
                    onChange={(e) => setFormConfig({...formConfig, rateLimitPerHour: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg"
                    placeholder="1000"
                  />
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => configurarAPI(configurando, formConfig)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setConfigurando(null);
                      setFormConfig({});
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guía para agregar nuevas APIs */}
        <div className="mt-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Cómo agregar nuevas APIs</h3>
          <div className="text-gray-300 space-y-2">
            <p>Para agregar una nueva API, necesitas:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>URL base de la API</li>
              <li>Headers de autenticación (API key, tokens, etc.)</li>
              <li>Límite de requests por hora</li>
              <li>Formato de respuesta para mapear los datos</li>
            </ul>
            <p className="mt-4 text-blue-400">
              💡 Una vez que tengas las credenciales, podemos configurar automáticamente la nueva API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestorAPIs;
