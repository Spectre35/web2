import React, { useState, useEffect } from 'react';

const ConfigurationSelectors = ({ onConfigChange, initialConfig = {} }) => {
  const [config, setConfig] = useState({
    bloque: initialConfig.bloque || '',
    sucursal: initialConfig.sucursal || '',
    caja: initialConfig.caja || 10,
    usuario: initialConfig.usuario || ''
  });

  const [options, setOptions] = useState({
    bloques: [],
    sucursales: [],
    cajas: [],
    bloqueSucursales: {},
    sucursalBloque: {}
  });

  const [filteredSucursales, setFilteredSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar valores distinct del backend
  useEffect(() => {
    const fetchDistinctValues = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/api/ocr/distinct-values');

        if (!response.ok) {
          throw new Error('Error al cargar los valores');
        }

        const data = await response.json();

        if (data.success) {
          setOptions(data.data);
          setFilteredSucursales(data.data.sucursales);

          // Asegurar que caja 10 sea el valor por defecto si no hay configuración inicial
          if (!initialConfig.caja) {
            setConfig(prev => ({
              ...prev,
              caja: 10
            }));
          }
        } else {
          throw new Error(data.error || 'Error al cargar los valores');
        }
      } catch (err) {
        console.error('Error cargando valores distinct:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDistinctValues();
  }, []);

  // Filtrar sucursales cuando cambia el bloque
  useEffect(() => {
    if (config.bloque && options.bloqueSucursales[config.bloque]) {
      setFilteredSucursales(options.bloqueSucursales[config.bloque]);
    } else {
      setFilteredSucursales(options.sucursales);
    }
  }, [config.bloque, options.bloqueSucursales, options.sucursales]);

  // Notificar cambios al componente padre
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const handleChange = (field, value) => {
    if (field === 'bloque') {
      // Si cambia el bloque, limpiar la sucursal y filtrar sucursales
      setConfig(prev => ({
        ...prev,
        bloque: value,
        sucursal: '' // Limpiar sucursal cuando cambia bloque
      }));
    } else if (field === 'sucursal') {
      // Si cambia la sucursal, detectar automáticamente el bloque
      const bloqueDetectado = options.sucursalBloque[value] || '';
      setConfig(prev => ({
        ...prev,
        sucursal: value,
        bloque: bloqueDetectado
      }));
    } else if (field === 'usuario') {
      // Normalizar usuario a mayúsculas
      const usuarioNormalizado = value.toUpperCase();
      setConfig(prev => ({
        ...prev,
        usuario: usuarioNormalizado
      }));
    } else {
      // Para otros campos (caja)
      setConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          ⚙️ Configuración de Inserción
        </h3>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">Cargando opciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          ⚙️ Configuración de Inserción
        </h3>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error al cargar configuración
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        ⚙️ Configuración de Inserción
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Selector de Bloque */}
        <div>
          <label htmlFor="bloque" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🏢 Bloque
            {config.sucursal && config.bloque && (
              <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                (Auto-detectado)
              </span>
            )}
          </label>
          <select
            id="bloque"
            value={config.bloque}
            onChange={(e) => handleChange('bloque', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Seleccionar bloque...</option>
            {options.bloques.map((bloque) => (
              <option key={bloque} value={bloque}>
                {bloque}
              </option>
            ))}
          </select>
          {config.sucursal && config.bloque && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              ✓ Bloque detectado automáticamente para {config.sucursal}
            </p>
          )}
        </div>

        {/* Selector de Sucursal */}
        <div>
          <label htmlFor="sucursal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🏪 Sucursal
            {config.bloque && (
              <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                (Filtradas por {config.bloque})
              </span>
            )}
          </label>
          <select
            id="sucursal"
            value={config.sucursal}
            onChange={(e) => handleChange('sucursal', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Seleccionar sucursal...</option>
            {filteredSucursales.map((sucursal) => (
              <option key={sucursal} value={sucursal}>
                {sucursal}
              </option>
            ))}
          </select>
          {config.bloque && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mostrando {filteredSucursales.length} sucursales del bloque {config.bloque}
            </p>
          )}
        </div>

        {/* Selector de Caja */}
        <div>
          <label htmlFor="caja" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            💳 Caja
          </label>
          <select
            id="caja"
            value={config.caja}
            onChange={(e) => handleChange('caja', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {options.cajas.map((caja) => (
              <option key={caja} value={caja}>
                Caja {caja}
              </option>
            ))}
          </select>
        </div>

        {/* Campo de Usuario */}
        <div>
          <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            👤 Usuario
          </label>
          <input
            type="text"
            id="usuario"
            value={config.usuario}
            onChange={(e) => handleChange('usuario', e.target.value)}
            placeholder="Ingrese nombre de usuario"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Se convertirá automáticamente a MAYÚSCULAS
          </p>
        </div>
      </div>

      {/* Información actual */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Configuración actual:</span>
          {config.bloque && ` Bloque: ${config.bloque}`}
          {config.sucursal && ` | Sucursal: ${config.sucursal}`}
          {` | Caja: ${config.caja}`}
          {config.usuario && ` | Usuario: ${config.usuario}`}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          💡 El tipo de pago se extrae automáticamente del texto del recibo
        </p>
      </div>
    </div>
  );
};

export default ConfigurationSelectors;
