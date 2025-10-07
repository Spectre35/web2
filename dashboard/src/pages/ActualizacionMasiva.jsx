import React, { useState } from 'react';

const ActualizacionMasiva = () => {
  const [archivo, setArchivo] = useState(null);
  const [datosTabla, setDatosTabla] = useState('');
  const [verificaciones, setVerificaciones] = useState(null);
  const [resultadoActualizacion, setResultadoActualizacion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paso, setPaso] = useState(1);

  const procesarDatos = (texto) => {
    const lineas = texto.trim().split('\n');
    const transacciones = [];

    for (const linea of lineas) {
      const partes = linea.trim().split('\t');
      if (partes.length >= 2) {
        const id_transaccion = partes[0].trim();
        const estatus = partes[1].trim();

        if (id_transaccion && estatus) {
          transacciones.push({ id_transaccion, estatus });
        }
      }
    }

    return transacciones;
  };

  const verificarTransacciones = async () => {
    console.log('🔍 [ACTUALIZACIÓN] === INICIO verificarTransacciones ===');
    setIsLoading(true);

    try {
      const transacciones = procesarDatos(datosTabla);
      console.log('📊 [ACTUALIZACIÓN] Transacciones procesadas:', transacciones.length);
      console.log('🔍 [ACTUALIZACIÓN] Datos procesados:', transacciones.slice(0, 3));

      if (transacciones.length === 0) {
        console.error('❌ [ACTUALIZACIÓN] Sin transacciones válidas');
        alert('No se pudieron procesar los datos. Asegúrate de usar el formato correcto.');
        setIsLoading(false);
        return;
      }

      console.log('📤 [ACTUALIZACIÓN] Enviando petición a verificar-transacciones');
      const response = await fetch('/api/actualizaciones/verificar-transacciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transacciones })
      });

      console.log('📥 [ACTUALIZACIÓN] Status respuesta:', response.status);
      
      if (!response.ok) {
        console.error('❌ [ACTUALIZACIÓN] Response no OK:', response.status);
        const errorText = await response.text();
        console.error('❌ [ACTUALIZACIÓN] Error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();
      console.log('📋 [ACTUALIZACIÓN] Resultado:', resultado);

      if (resultado.success) {
        console.log('✅ [ACTUALIZACIÓN] Verificación exitosa');
        setVerificaciones(resultado.data);
        setPaso(2);
      } else {
        console.error('❌ [ACTUALIZACIÓN] Error en resultado:', resultado.message);
        alert('Error verificando transacciones: ' + resultado.message);
      }

    } catch (error) {
      console.error('💥 [ACTUALIZACIÓN] ERROR CRÍTICO verificarTransacciones:');
      console.error('   - Mensaje:', error.message);
      console.error('   - Stack:', error.stack);
      alert('Error verificando transacciones: ' + error.message);
    } finally {
      console.log('🏁 [ACTUALIZACIÓN] Finalizando verificarTransacciones');
      setIsLoading(false);
    }
  };

  const ejecutarActualizacion = async () => {
    console.log('🚀 [ACTUALIZACIÓN] === INICIO ejecutarActualizacion ===');
    setIsLoading(true);

    try {
      const transacciones = procesarDatos(datosTabla);
      console.log('📊 [ACTUALIZACIÓN] Transacciones para actualizar:', transacciones.length);
      console.log('🔍 [ACTUALIZACIÓN] Transacciones:', transacciones);

      console.log('📤 [ACTUALIZACIÓN] Enviando petición a actualizar-captura-cc');
      console.log('⏰ [ACTUALIZACIÓN] Timestamp inicio:', new Date().toISOString());

      const response = await fetch('/api/actualizaciones/actualizar-captura-cc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transacciones })
      });

      console.log('📥 [ACTUALIZACIÓN] Respuesta - Status:', response.status);
      console.log('⏰ [ACTUALIZACIÓN] Timestamp respuesta:', new Date().toISOString());

      if (!response.ok) {
        console.error('❌ [ACTUALIZACIÓN] Response no OK:', response.status);
        const errorText = await response.text();
        console.error('❌ [ACTUALIZACIÓN] Error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const resultado = await response.json();
      console.log('📋 [ACTUALIZACIÓN] Resultado completo:', resultado);

      if (resultado.success) {
        console.log('✅ [ACTUALIZACIÓN] Actualización exitosa');
        setResultadoActualizacion(resultado.data);
        setPaso(3);
      } else {
        console.error('❌ [ACTUALIZACIÓN] Error en actualización:', resultado.message);
        alert('Error en la actualización: ' + resultado.message);
      }

    } catch (error) {
      console.error('💥 [ACTUALIZACIÓN] ERROR CRÍTICO ejecutarActualizacion:');
      console.error('   - Mensaje:', error.message);
      console.error('   - Stack:', error.stack);
      console.error('   - Timestamp error:', new Date().toISOString());
      alert('Error ejecutando actualización: ' + error.message);
    } finally {
      console.log('🏁 [ACTUALIZACIÓN] Finalizando ejecutarActualizacion');
      setIsLoading(false);
    }
  };

  const reiniciar = () => {
    setArchivo(null);
    setDatosTabla('');
    setVerificaciones(null);
    setResultadoActualizacion(null);
    setPaso(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              🔄 Actualización Masiva de CAPTURA_CC
            </h1>
            <p className="text-gray-400">
              Actualiza masivamente el campo CAPTURA_CC en la tabla de aclaraciones basado en ID de transacción y estatus.
            </p>
          </div>

          {/* Paso 1: Entrada de datos */}
          {paso === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-900 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-2">📋 Formato de datos</h3>
                <p className="text-blue-200 text-sm">
                  Ingresa los datos con el formato: <code className="bg-blue-800 px-2 py-1 rounded">id_transaccion[TAB]ESTATUS</code>
                </p>
                <p className="text-blue-200 text-sm mt-1">
                  Ejemplo: <code className="bg-blue-800 px-2 py-1 rounded">174206787168	PERDIDA</code>
                </p>
                <div className="mt-3 text-blue-200 text-sm">
                  <strong>Valores válidos para ESTATUS:</strong> PERDIDA, GANADA
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Datos de transacciones
                </label>
                <textarea
                  value={datosTabla}
                  onChange={(e) => setDatosTabla(e.target.value)}
                  placeholder="174206787168&#9;PERDIDA&#10;174206059662&#9;PERDIDA&#10;174050636334&#9;GANADA"
                  className="w-full h-48 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                  rows={12}
                />
                <div className="mt-2 text-gray-400 text-sm">
                  {datosTabla.trim() ? `${datosTabla.trim().split('\n').length} líneas ingresadas` : 'Ingresa los datos aquí...'}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={verificarTransacciones}
                  disabled={!datosTabla.trim() || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? '🔄 Verificando...' : '🔍 Verificar Transacciones'}
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Verificación */}
          {paso === 2 && verificaciones && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-900 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-200">
                    {verificaciones.encontrados}
                  </div>
                  <div className="text-green-300 text-sm">Encontrados</div>
                </div>
                <div className="bg-yellow-900 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-200">
                    {verificaciones.no_encontrados}
                  </div>
                  <div className="text-yellow-300 text-sm">No encontrados</div>
                </div>
                <div className="bg-blue-900 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-200">
                    {verificaciones.total_verificados}
                  </div>
                  <div className="text-blue-300 text-sm">Total</div>
                </div>
              </div>

              {verificaciones.encontrados > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3 text-lg">
                    ✅ Transacciones que se actualizarán ({verificaciones.encontrados})
                  </h3>
                  <div className="bg-gray-700 rounded-lg max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-800">
                        <tr className="border-b border-gray-600">
                          <th className="text-left p-3 text-gray-300">ID Transacción</th>
                          <th className="text-left p-3 text-gray-300">Estatus Actual</th>
                          <th className="text-left p-3 text-gray-300">Nuevo Estatus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verificaciones.verificaciones
                          .filter(v => v.existe)
                          .map((v, index) => (
                          <tr key={index} className="border-b border-gray-700 hover:bg-gray-600">
                            <td className="p-3 text-white font-mono">{v.id_transaccion}</td>
                            <td className="p-3 text-gray-300">{v.captura_cc_actual || 'Sin valor'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                v.estatus_nuevo === 'GANADA' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
                              }`}>
                                {v.estatus_nuevo}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {verificaciones.no_encontrados > 0 && (
                <div>
                  <h3 className="text-yellow-300 font-semibold mb-3 text-lg">
                    ⚠️ Transacciones no encontradas ({verificaciones.no_encontrados})
                  </h3>
                  <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      {verificaciones.verificaciones
                        .filter(v => !v.existe)
                        .map((v, index) => (
                        <div key={index} className="text-yellow-200 text-sm font-mono bg-yellow-800 bg-opacity-30 p-2 rounded">
                          {v.id_transaccion} → {v.estatus_nuevo}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setPaso(1)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  ⬅️ Volver
                </button>
                <button
                  onClick={() => {
                    console.log('🖱️ Click en botón actualizar');
                    console.log('📊 verificaciones.encontrados:', verificaciones.encontrados);
                    console.log('⏳ isLoading:', isLoading);
                    ejecutarActualizacion();
                  }}
                  disabled={verificaciones.encontrados === 0 || isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? '🔄 Actualizando...' : `✅ Actualizar ${verificaciones.encontrados} registros`}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Resultado */}
          {paso === 3 && resultadoActualizacion && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-900 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-200">
                    {resultadoActualizacion.actualizaciones_exitosas}
                  </div>
                  <div className="text-green-300 text-sm">Actualizaciones exitosas</div>
                </div>
                <div className="bg-red-900 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-red-200">
                    {resultadoActualizacion.errores + resultadoActualizacion.no_encontrados}
                  </div>
                  <div className="text-red-300 text-sm">No procesados</div>
                </div>
              </div>

              <div className="bg-green-900 bg-opacity-30 p-6 rounded-lg">
                <h3 className="text-green-300 font-semibold text-lg">✅ Actualización completada</h3>
                <p className="text-green-200 mt-2">
                  {resultadoActualizacion.message}
                </p>
                <div className="mt-4 text-green-200 text-sm">
                  <strong>Resumen:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Total procesados: {resultadoActualizacion.total_procesados}</li>
                    <li>Exitosos: {resultadoActualizacion.actualizaciones_exitosas}</li>
                    <li>No encontrados: {resultadoActualizacion.no_encontrados}</li>
                    <li>Errores: {resultadoActualizacion.errores}</li>
                  </ul>
                </div>
              </div>

              {resultadoActualizacion.detalles.errores.length > 0 && (
                <div className="bg-red-900 bg-opacity-30 p-4 rounded-lg">
                  <h3 className="text-red-300 font-semibold mb-3">❌ Errores ({resultadoActualizacion.detalles.errores.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {resultadoActualizacion.detalles.errores.map((error, index) => (
                      <div key={index} className="text-red-200 text-sm bg-red-800 bg-opacity-30 p-2 rounded font-mono">
                        <strong>{error.id_transaccion}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultadoActualizacion.detalles.no_encontrados.length > 0 && (
                <div className="bg-yellow-900 bg-opacity-30 p-4 rounded-lg">
                  <h3 className="text-yellow-300 font-semibold mb-3">⚠️ No encontrados ({resultadoActualizacion.detalles.no_encontrados.length})</h3>
                  <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                    {resultadoActualizacion.detalles.no_encontrados.map((item, index) => (
                      <div key={index} className="text-yellow-200 text-sm bg-yellow-800 bg-opacity-30 p-2 rounded font-mono">
                        {item.id_transaccion} → {item.estatus}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={reiniciar}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  🔄 Nueva Actualización
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  🏠 Volver al Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActualizacionMasiva;
