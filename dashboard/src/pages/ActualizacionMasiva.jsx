import React, { useState } from 'react';
import { API_BASE_URL } from '../config.js';

const ActualizacionMasiva = () => {
  const [datosTabla, setDatosTabla] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 🎯 CONTROLES PARA VALIDADOR ESTRICTO
  const [campoBusqueda, setCampoBusqueda] = useState('id_transaccion');
  const [procesador, setProcesador] = useState('');
  const [resultadosValidador, setResultadosValidador] = useState(null);
  
  const procesadores = ['TODOS', 'BAC', 'BANWIRE', 'BSD', 'CAIXA', 'CONEKTA', 'CREDIBANCO', 'CREDOMATIC', 'CYCLOPAY', 'EFEVOO', 'EVERTEC', 'FICOHSA', 'FIRSTDATA', 'KUSHKI', 'MERCADO PAGO', 'NETPAY', 'PAYCODE', 'PHAROS', 'PROMERICA', 'PROSA', 'REDEBAN', 'SABADELL', 'SLIMPAY', 'STRIPE', 'TOKU', 'WOMPI'];

  // 🎯 VALIDADOR ESTRICTO GENERAL
  const ejecutarValidadorEstricto = async (tipoValidacion) => {
    console.log('🎯 [VALIDADOR ESTRICTO] Iniciando...', { campoBusqueda, procesador, tipoValidacion });
    setIsLoading(true);
    setResultadosValidador(null);

    try {
      // Procesar IDs del textarea
      const idsArray = datosTabla
        .split(/[,\n\r\s]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (idsArray.length === 0) {
        alert('❌ Ingresa al menos un ID');
        setIsLoading(false);
        return;
      }

      if (!procesador) {
        alert('❌ Selecciona un procesador');
        setIsLoading(false);
        return;
      }

      const payload = {
        idsTransaccion: idsArray,
        tipoValidacion,
        campoBusqueda,
        procesador: procesador === 'TODOS' ? null : procesador
      };

      console.log('📤 [VALIDADOR ESTRICTO] Enviando:', payload);

      const response = await fetch(`${API_BASE_URL}/aclaraciones/validador-estricto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });

      const resultado = await response.json();
      console.log('📥 [VALIDADOR ESTRICTO] Respuesta:', resultado);

      if (!response.ok) {
        throw new Error(resultado.error || 'Error en validador');
      }

      setResultadosValidador(resultado);
      alert(`✅ Validador completado: ${resultado.actualizados} actualizados, ${resultado.noEncontrados} no encontrados`);

      // Limpiar input solo si hubo actualizaciones
      if (resultado.actualizados > 0) {
        setDatosTabla('');
      }

    } catch (error) {
      console.error('❌ [VALIDADOR ESTRICTO] Error:', error);
      alert('❌ Error en validador: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              🎯 Validador Estricto de Transacciones
            </h1>
            <p className="text-gray-400">
              Busca y actualiza transacciones con coincidencias exactas basado en ID o autorización.
            </p>
          </div>

          <div className="space-y-6">
            {/* Información sobre el formato */}
            <div className="bg-purple-900 bg-opacity-30 border border-purple-600 p-4 rounded-lg">
              <h3 className="text-purple-200 font-semibold mb-2">📋 Formato de entrada</h3>
              <p className="text-purple-300 text-sm">
                Solo ingresa los IDs separados por comas o en líneas diferentes:
              </p>
              <p className="text-purple-300 text-sm mt-1">
                <code className="bg-purple-800 px-2 py-1 rounded">174206787168, 174206059662, 174050636334</code>
              </p>
              <p className="text-purple-300 text-sm mt-1">
                <strong>El estatus se define con los botones GANADA/PERDIDA</strong>
              </p>
            </div>

            {/* Área de entrada de datos */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                IDs de transacciones
              </label>
              <textarea
                value={datosTabla}
                onChange={(e) => setDatosTabla(e.target.value)}
                placeholder="174206787168, 174206059662&#10;174050636334&#10;175123456789"
                className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 font-mono text-sm"
                rows={8}
              />
              <div className="mt-2 text-gray-400 text-sm">
                {datosTabla.trim() ? 
                  `${datosTabla.split(/[,\n\r\s]+/).filter(id => id.trim().length > 0).length} IDs detectados` : 
                  'Ingresa los IDs aquí...'
                }
              </div>
            </div>

            {/* Controles del validador */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-4">🔧 Configuración de búsqueda</h3>
              
              {/* Selección de Campo */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Campo de búsqueda:
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCampoBusqueda('id_transaccion')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      campoBusqueda === 'id_transaccion'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    ID Transacción
                  </button>
                  <button
                    onClick={() => setCampoBusqueda('autorizacion')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      campoBusqueda === 'autorizacion'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Autorización
                  </button>
                </div>
              </div>

              {/* Selección de Procesador */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Procesador:
                </label>
                <select
                  value={procesador}
                  onChange={(e) => setProcesador(e.target.value)}
                  className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="">Seleccionar procesador...</option>
                  {procesadores.map(proc => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              </div>

              {/* Botones de Acción */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => ejecutarValidadorEstricto('GANADA')}
                  disabled={!datosTabla.trim() || !procesador || isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? '⏳ Procesando...' : '✅ Marcar GANADA'}
                </button>
                <button
                  onClick={() => ejecutarValidadorEstricto('PERDIDA')}
                  disabled={!datosTabla.trim() || !procesador || isLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? '⏳ Procesando...' : '❌ Marcar PERDIDA'}
                </button>
              </div>
            </div>

            {/* Resultados del Validador */}
            {resultadosValidador && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-white font-semibold mb-3">📊 Resultados del validador</h4>
                
                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-200">
                      {resultadosValidador.actualizados}
                    </div>
                    <div className="text-green-300 text-sm">Actualizados</div>
                  </div>
                  <div className="bg-yellow-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-200">
                      {resultadosValidador.noEncontrados}
                    </div>
                    <div className="text-yellow-300 text-sm">No encontrados</div>
                  </div>
                  <div className="bg-blue-800 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-200">
                      {resultadosValidador.total}
                    </div>
                    <div className="text-blue-300 text-sm">Total procesados</div>
                  </div>
                </div>

                {/* Detalles */}
                {resultadosValidador.detalles && resultadosValidador.detalles.length > 0 && (
                  <div className="bg-gray-800 p-3 rounded-lg max-h-40 overflow-y-auto">
                    <h5 className="text-gray-300 text-sm font-medium mb-2">Detalles:</h5>
                    {resultadosValidador.detalles.slice(0, 10).map((detalle, index) => (
                      <div key={index} className="text-xs text-gray-300 mb-1">
                        • {detalle.valorBuscado} → {detalle.estatusNuevo} (Procesador: {detalle.procesador})
                      </div>
                    ))}
                    {resultadosValidador.detalles.length > 10 && (
                      <div className="text-xs text-gray-400 mt-2">
                        ... y {resultadosValidador.detalles.length - 10} más actualizaciones
                      </div>
                    )}
                  </div>
                )}

                {/* IDs no encontrados */}
                {resultadosValidador.idsNoEncontrados && resultadosValidador.idsNoEncontrados.length > 0 && (
                  <div className="bg-yellow-900 bg-opacity-30 p-3 rounded-lg mt-3">
                    <h5 className="text-yellow-300 text-sm font-medium mb-2">
                      No encontrados ({resultadosValidador.idsNoEncontrados.length}):
                    </h5>
                    <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                      {resultadosValidador.idsNoEncontrados.slice(0, 10).map((item, index) => (
                        <div key={index} className="text-xs text-yellow-200 bg-yellow-800 bg-opacity-30 p-1 rounded">
                          {item.valorBuscado}
                        </div>
                      ))}
                    </div>
                    {resultadosValidador.idsNoEncontrados.length > 10 && (
                      <div className="text-xs text-yellow-400 mt-1">
                        ... y {resultadosValidador.idsNoEncontrados.length - 10} más
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Botón para limpiar */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setDatosTabla('');
                  setResultadosValidador(null);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔄 Limpiar formulario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActualizacionMasiva;
