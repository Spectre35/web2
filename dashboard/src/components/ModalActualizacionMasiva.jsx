import React, { useState } from 'react';

const ModalActualizacionMasiva = ({ isOpen, onClose }) => {
  const [archivo, setArchivo] = useState(null);
  const [datosTabla, setDatosTabla] = useState('');
  const [modoEntrada, setModoEntrada] = useState('texto'); // 'texto' o 'archivo'
  const [verificaciones, setVerificaciones] = useState(null);
  const [resultadoActualizacion, setResultadoActualizacion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paso, setPaso] = useState(1); // 1: entrada de datos, 2: verificación, 3: resultado

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
    setIsLoading(true);
    
    try {
      const transacciones = procesarDatos(datosTabla);
      
      if (transacciones.length === 0) {
        alert('No se pudieron procesar los datos. Asegúrate de usar el formato correcto.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/actualizaciones/verificar-transacciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transacciones })
      });

      const resultado = await response.json();
      
      if (resultado.success) {
        setVerificaciones(resultado.data);
        setPaso(2);
      } else {
        alert('Error verificando transacciones: ' + resultado.message);
      }
      
    } catch (error) {
      console.error('Error verificando transacciones:', error);
      alert('Error verificando transacciones');
    } finally {
      setIsLoading(false);
    }
  };

  const ejecutarActualizacion = async () => {
    setIsLoading(true);
    
    try {
      const transacciones = procesarDatos(datosTabla);

      const response = await fetch('/api/actualizaciones/actualizar-captura-cc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transacciones })
      });

      const resultado = await response.json();
      
      if (resultado.success) {
        setResultadoActualizacion(resultado.data);
        setPaso(3);
      } else {
        alert('Error en la actualización: ' + resultado.message);
      }
      
    } catch (error) {
      console.error('Error ejecutando actualización:', error);
      alert('Error ejecutando actualización');
    } finally {
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

  const cerrarModal = () => {
    reiniciar();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Actualización Masiva de CAPTURA_CC
          </h2>
          <button
            onClick={cerrarModal}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Paso 1: Entrada de datos */}
        {paso === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-900 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">📋 Formato de datos</h3>
              <p className="text-blue-200 text-sm">
                Ingresa los datos con el formato: <code>ID_TRANSACCION[TAB]ESTATUS</code>
              </p>
              <p className="text-blue-200 text-sm mt-1">
                Ejemplo: <code>174206787168	PERDIDA</code>
              </p>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Datos de transacciones
              </label>
              <textarea
                value={datosTabla}
                onChange={(e) => setDatosTabla(e.target.value)}
                placeholder="174206787168	PERDIDA&#10;174206059662	PERDIDA&#10;174050636334	GANADA"
                className="w-full h-40 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                rows={10}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={verificarTransacciones}
                disabled={!datosTabla.trim() || isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                {isLoading ? 'Verificando...' : '🔍 Verificar Transacciones'}
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Verificación */}
        {paso === 2 && verificaciones && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-200">
                  {verificaciones.encontrados}
                </div>
                <div className="text-green-300 text-sm">Encontrados</div>
              </div>
              <div className="bg-yellow-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-200">
                  {verificaciones.no_encontrados}
                </div>
                <div className="text-yellow-300 text-sm">No encontrados</div>
              </div>
              <div className="bg-blue-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-200">
                  {verificaciones.total_verificados}
                </div>
                <div className="text-blue-300 text-sm">Total</div>
              </div>
            </div>

            {verificaciones.encontrados > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-2">
                  ✅ Transacciones que se actualizarán ({verificaciones.encontrados})
                </h3>
                <div className="bg-gray-700 rounded-lg max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left p-2 text-gray-300">ID Transacción</th>
                        <th className="text-left p-2 text-gray-300">Estatus Actual</th>
                        <th className="text-left p-2 text-gray-300">Nuevo Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificaciones.verificaciones
                        .filter(v => v.existe)
                        .slice(0, 10)
                        .map((v, index) => (
                        <tr key={index} className="border-b border-gray-700">
                          <td className="p-2 text-white">{v.id_transaccion}</td>
                          <td className="p-2 text-gray-300">{v.captura_cc_actual || 'Sin valor'}</td>
                          <td className="p-2 text-green-300">{v.estatus_nuevo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {verificaciones.verificaciones.filter(v => v.existe).length > 10 && (
                    <div className="p-2 text-center text-gray-400 text-xs">
                      ... y {verificaciones.verificaciones.filter(v => v.existe).length - 10} más
                    </div>
                  )}
                </div>
              </div>
            )}

            {verificaciones.no_encontrados > 0 && (
              <div>
                <h3 className="text-yellow-300 font-semibold mb-2">
                  ⚠️ Transacciones no encontradas ({verificaciones.no_encontrados})
                </h3>
                <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {verificaciones.verificaciones
                    .filter(v => !v.existe)
                    .slice(0, 5)
                    .map((v, index) => (
                    <div key={index} className="text-yellow-200 text-sm">
                      {v.id_transaccion} → {v.estatus_nuevo}
                    </div>
                  ))}
                  {verificaciones.verificaciones.filter(v => !v.existe).length > 5 && (
                    <div className="text-yellow-300 text-xs mt-1">
                      ... y {verificaciones.verificaciones.filter(v => !v.existe).length - 5} más
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setPaso(1)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                ⬅️ Volver
              </button>
              <button
                onClick={ejecutarActualizacion}
                disabled={verificaciones.encontrados === 0 || isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                {isLoading ? 'Actualizando...' : `✅ Actualizar ${verificaciones.encontrados} registros`}
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Resultado */}
        {paso === 3 && resultadoActualizacion && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-200">
                  {resultadoActualizacion.actualizaciones_exitosas}
                </div>
                <div className="text-green-300 text-sm">Actualizaciones exitosas</div>
              </div>
              <div className="bg-red-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-200">
                  {resultadoActualizacion.errores + resultadoActualizacion.no_encontrados}
                </div>
                <div className="text-red-300 text-sm">No procesados</div>
              </div>
            </div>

            <div className="bg-green-900 bg-opacity-30 p-4 rounded-lg">
              <h3 className="text-green-300 font-semibold">✅ Actualización completada</h3>
              <p className="text-green-200 text-sm mt-1">
                {resultadoActualizacion.message}
              </p>
            </div>

            {resultadoActualizacion.detalles.errores.length > 0 && (
              <div className="bg-red-900 bg-opacity-30 p-4 rounded-lg">
                <h3 className="text-red-300 font-semibold mb-2">❌ Errores</h3>
                <div className="max-h-32 overflow-y-auto">
                  {resultadoActualizacion.detalles.errores.map((error, index) => (
                    <div key={index} className="text-red-200 text-sm">
                      {error.id_transaccion}: {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultadoActualizacion.detalles.no_encontrados.length > 0 && (
              <div className="bg-yellow-900 bg-opacity-30 p-4 rounded-lg">
                <h3 className="text-yellow-300 font-semibold mb-2">⚠️ No encontrados</h3>
                <div className="max-h-32 overflow-y-auto">
                  {resultadoActualizacion.detalles.no_encontrados.map((item, index) => (
                    <div key={index} className="text-yellow-200 text-sm">
                      {item.id_transaccion} → {item.estatus}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={reiniciar}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                🔄 Nueva Actualización
              </button>
              <button
                onClick={cerrarModal}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalActualizacionMasiva;
