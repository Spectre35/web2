import React, { useState } from 'react';
import '../styles/data-grid-dark.css';
import { API_BASE_URL } from '../config.js';

const BuscadorBin = () => {
  const [bin, setBin] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [mostrarCache, setMostrarCache] = useState(false);
  const [binsCache, setBinsCache] = useState([]);
  const [paginaCache, setPaginaCache] = useState(1);

  const buscarBin = async () => {
    if (!bin || bin.length < 6) {
      setError('El BIN debe tener al menos 6 dígitos');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/buscar-bin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bin }),
      });

      const data = await response.json();

      if (data.success) {
        setResultado({
          ...data.data,
          fuente: data.fuente
        });
        // Actualizar estadísticas después de una búsqueda exitosa
        cargarEstadisticas();
      } else {
        // Manejar respuesta específica cuando no se encuentra el BIN
        if (data.sugerencia) {
          setError(`${data.message}\n\n💡 ${data.sugerencia}`);
        } else {
          setError(data.message || 'Error al buscar el BIN');
        }
      }
    } catch (error) {
      setError('Error de conexión con el servidor');
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bins-stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    buscarBin();
  };

  const limpiarFormulario = () => {
    setBin('');
    setResultado(null);
    setError('');
  };

  const cargarBinsCache = async (pagina = 1) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bins-cache?page=${pagina}&limit=20`);
      const data = await response.json();
      if (data.success) {
        setBinsCache(data.data);
        setPaginaCache(pagina);
      }
    } catch (error) {
      console.error('Error cargando BINs en cache:', error);
    }
  };

  const toggleCache = () => {
    setMostrarCache(!mostrarCache);
    if (!mostrarCache) {
      cargarBinsCache(1);
    }
  };

  // Cargar estadísticas al montar el componente
  React.useEffect(() => {
    cargarEstadisticas();
  }, []);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔍 Buscador de BINs</h1>
        
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-blue-400">Total BINs</h3>
              <p className="text-2xl font-bold text-white">{stats.total_bins}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-green-400">BINs Identificados</h3>
              <p className="text-2xl font-bold text-white">{stats.bins_identificados}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-purple-400">Bancos Únicos</h3>
              <p className="text-2xl font-bold text-white">{stats.bancos_unicos}</p>
            </div>
          </div>
        )}

        {/* Formulario de búsqueda */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bin" className="block text-sm font-medium text-gray-300 mb-2">
                Número de BIN (6-8 dígitos)
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  id="bin"
                  value={bin}
                  onChange={(e) => setBin(e.target.value.replace(/\D/g, '').substring(0, 8))}
                  placeholder="Ej: 445588"
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={cargando}
                />
        {/* Botones de acción */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleSubmit}
            disabled={cargando || !bin}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {cargando ? 'Buscando...' : 'Buscar BIN'}
          </button>
          <button
            onClick={limpiarFormulario}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={toggleCache}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {mostrarCache ? 'Ocultar' : 'Ver'} BINs en Cache
          </button>
        </div>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Lista de BINs en Cache */}
        {mostrarCache && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">📊 BINs en Base de Datos Local</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => cargarBinsCache(Math.max(paginaCache - 1, 1))}
                  disabled={paginaCache === 1}
                  className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50"
                >
                  ← Anterior
                </button>
                <span className="px-3 py-1 text-gray-300">Página {paginaCache}</span>
                <button
                  onClick={() => cargarBinsCache(paginaCache + 1)}
                  className="px-3 py-1 bg-gray-600 text-white rounded"
                >
                  Siguiente →
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {binsCache.map((binItem, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-mono font-bold text-blue-400">{binItem.bin}</h3>
                    <button
                      onClick={() => {
                        setBin(binItem.bin);
                        setResultado(binItem);
                        setMostrarCache(false);
                        setError('');
                      }}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Usar
                    </button>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-400">Banco:</span> <span className="text-white">{binItem.banco}</span></p>
                    <p><span className="text-gray-400">Tipo:</span> <span className="text-white">{binItem.tipo}</span></p>
                    <p><span className="text-gray-400">Marca:</span> <span className="text-white">{binItem.marca}</span></p>
                    <p><span className="text-gray-400">País:</span> <span className="text-white">{binItem.pais}</span></p>
                    <p><span className="text-gray-400">Fuente:</span> 
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                        binItem.fuente === 'binlookup' ? 'bg-green-900 text-green-200' : 'bg-blue-900 text-blue-200'
                      }`}>
                        {binItem.fuente}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {binsCache.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No hay BINs en la base de datos local todavía.
              </div>
            )}
          </div>
        )}

        {/* Resultado de la búsqueda */}
        {resultado && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Información del BIN: {resultado.bin}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                resultado.fuente === 'base_de_datos' 
                  ? 'bg-green-900 text-green-200' 
                  : resultado.fuente === 'rate_limit'
                  ? 'bg-yellow-900 text-yellow-200'
                  : resultado.fuente === 'not_found'
                  ? 'bg-red-900 text-red-200'
                  : 'bg-blue-900 text-blue-200'
              }`}>
                {resultado.fuente === 'base_de_datos' 
                  ? '💾 Desde Base de Datos' 
                  : resultado.fuente === 'rate_limit'
                  ? '⏰ Rate Limit Alcanzado'
                  : resultado.fuente === 'not_found'
                  ? '❌ No Encontrado'
                  : '🌐 Desde API Externa'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Banco</h3>
                <p className="text-lg font-semibold text-white">{resultado.banco}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Tipo de Tarjeta</h3>
                <p className="text-lg font-semibold text-white">{resultado.tipo}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Marca</h3>
                <p className="text-lg font-semibold text-white">{resultado.marca}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">País</h3>
                <p className="text-lg font-semibold text-white">{resultado.pais}</p>
              </div>
            </div>

            {resultado.fecha_consulta && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  Última consulta: {(() => {
                    const dateStr = resultado.fecha_consulta;
                    if (dateStr.includes('T')) {
                      const [datePart, timePart] = dateStr.split('T');
                      const [year, month, day] = datePart.split('-');
                      const time = timePart.split('.')[0]; // Quitar microsegundos si existen
                      return `${day}/${month}/${year} ${time}`;
                    }
                    return new Date(dateStr).toLocaleString('es-ES');
                  })()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Información del sistema */}
        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">ℹ️ Cómo funciona</h3>
          <ul className="text-gray-300 space-y-1 mb-4">
            <li>• Busca el BIN únicamente en nuestra base de datos local</li>
            <li>• Para obtener nuevos BINs, use el "Procesador BINs Masivo"</li>
            <li>• Sistema inteligente con 9 APIs diferentes para máxima cobertura</li>
            <li>• Gestione las APIs desde el "Gestor de APIs"</li>
          </ul>

        </div>

        {/* BINs de ejemplo para probar */}
        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">🔢 BINs de Ejemplo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { bin: '45717360', desc: 'Visa Denmark' },
              { bin: '424242', desc: 'Visa Test' },
              { bin: '510125', desc: 'MasterCard' },
              { bin: '556677', desc: 'MasterCard Test' }
            ].map((item) => (
              <button
                key={item.bin}
                onClick={() => {
                  setBin(item.bin);
                  setError('');
                  setResultado(null);
                }}
                className="p-3 bg-blue-900 hover:bg-blue-800 text-blue-100 rounded-lg text-sm transition-colors"
              >
                <div className="font-mono font-bold">{item.bin}</div>
                <div className="text-xs opacity-75">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuscadorBin;
