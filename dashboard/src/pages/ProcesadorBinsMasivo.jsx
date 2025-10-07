import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

const ProcesadorBinsMasivo = () => {
  const [binsUtilizados, setBinsUtilizados] = useState([]);
  const [cargandoBins, setCargandoBins] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [limiteBins, setLimiteBins] = useState(500);
  const [delaySegundos, setDelaySegundos] = useState(1);

  const cargarBinsUtilizados = async () => {
    setCargandoBins(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/bins-mas-utilizados?limit=${limiteBins}`);
      const data = await response.json();
      
      if (data.success) {
        setBinsUtilizados(data);
      }
    } catch (error) {
      console.error('Error cargando BINs:', error);
    } finally {
      setCargandoBins(false);
    }
  };

  const iniciarProcesamiento = async () => {
    if (!binsUtilizados.bins_pendientes || binsUtilizados.bins_pendientes.length === 0) {
      alert('No hay BINs pendientes para procesar');
      return;
    }

    const confirmar = confirm(
      `¿Procesar ${binsUtilizados.bins_pendientes.length} BINs con delay de ${delaySegundos} segundos?\n\n` +
      `Tiempo estimado: ${Math.round((binsUtilizados.bins_pendientes.length * delaySegundos) / 60)} minutos\n` +
      `Nota: El proceso se detendrá automáticamente si alcanza el rate limit de la API.`
    );

    if (!confirmar) return;

    setProcesando(true);
    setProgreso({ actual: 0, total: binsUtilizados.bins_pendientes.length });
    setResultados(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/procesar-bins-masivo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bins: binsUtilizados.bins_pendientes,
          delay: delaySegundos
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResultados(data);
        // Recargar la lista de BINs para actualizar estadísticas
        cargarBinsUtilizados();
      }
    } catch (error) {
      console.error('Error en procesamiento:', error);
      alert('Error durante el procesamiento: ' + error.message);
    } finally {
      setProcesando(false);
      setProgreso(null);
    }
  };

  useEffect(() => {
    cargarBinsUtilizados();
  }, [limiteBins]);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🚀 Procesador Masivo de BINs</h1>

        {/* Configuración */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">⚙️ Configuración</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Límite de BINs a extraer
              </label>
              <input
                type="number"
                value={limiteBins}
                onChange={(e) => setLimiteBins(parseInt(e.target.value))}
                min="50"
                max="500"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Delay entre consultas (segundos)
              </label>
              <input
                type="number"
                value={delaySegundos}
                onChange={(e) => setDelaySegundos(parseInt(e.target.value))}
                min="1"
                max="3600"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Recomendado: 720 segundos (12 min) para respetar rate limit
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={cargarBinsUtilizados}
                disabled={cargandoBins}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600"
              >
                {cargandoBins ? 'Cargando...' : 'Extraer BINs'}
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas de BINs */}
        {binsUtilizados.total_bins && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-blue-400">Total BINs</h3>
              <p className="text-2xl font-bold text-white">{binsUtilizados.total_bins}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-green-400">Ya en Cache</h3>
              <p className="text-2xl font-bold text-white">{binsUtilizados.ya_en_cache}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-yellow-400">Pendientes</h3>
              <p className="text-2xl font-bold text-white">{binsUtilizados.pendientes_consulta}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-purple-400">Tiempo Estimado</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round((binsUtilizados.pendientes_consulta * delaySegundos) / 60)}m
              </p>
            </div>
          </div>
        )}

        {/* Botón de procesamiento */}
        {binsUtilizados.pendientes_consulta > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  🎯 {binsUtilizados.pendientes_consulta} BINs listos para procesar
                </h3>
                <p className="text-gray-400">
                  Tiempo estimado: {Math.round((binsUtilizados.pendientes_consulta * delaySegundos) / 60)} minutos
                </p>
              </div>
              <button
                onClick={iniciarProcesamiento}
                disabled={procesando}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 font-semibold"
              >
                {procesando ? 'Procesando...' : 'Iniciar Procesamiento'}
              </button>
            </div>
          </div>
        )}

        {/* Progreso del procesamiento */}
        {procesando && progreso && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Progreso del Procesamiento</h3>
            <div className="bg-gray-700 rounded-full h-4 mb-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-gray-300">
              {progreso.actual} / {progreso.total} BINs procesados 
              ({Math.round((progreso.actual / progreso.total) * 100)}%)
            </p>
          </div>
        )}

        {/* Resultados del procesamiento */}
        {resultados && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">📈 Resultados del Procesamiento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-900 p-4 rounded-lg">
                <h4 className="text-green-200 font-semibold">Exitosos</h4>
                <p className="text-2xl font-bold text-white">{resultados.resumen.exitosos}</p>
              </div>
              <div className="bg-yellow-900 p-4 rounded-lg">
                <h4 className="text-yellow-200 font-semibold">Rate Limited</h4>
                <p className="text-2xl font-bold text-white">{resultados.resumen.rate_limited}</p>
              </div>
              <div className="bg-red-900 p-4 rounded-lg">
                <h4 className="text-red-200 font-semibold">Errores</h4>
                <p className="text-2xl font-bold text-white">{resultados.resumen.errores}</p>
              </div>
              <div className="bg-blue-900 p-4 rounded-lg">
                <h4 className="text-blue-200 font-semibold">Total Procesados</h4>
                <p className="text-2xl font-bold text-white">{resultados.resumen.total_procesados}</p>
              </div>
            </div>

            {resultados.resumen.rate_limited > 0 && (
              <div className="p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
                <h4 className="text-yellow-200 font-semibold mb-2">⚠️ Rate Limit Alcanzado</h4>
                <p className="text-yellow-100 text-sm">
                  El procesamiento se detuvo porque se alcanzó el límite de la API. 
                  Puedes continuar en una hora o aumentar el delay entre consultas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Top BINs más utilizados */}
        {binsUtilizados.bins_mas_utilizados && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Top 20 BINs Más Utilizados</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-700 text-left">
                    <th className="p-3 text-gray-200">BIN</th>
                    <th className="p-3 text-gray-200">Frecuencia</th>
                    <th className="p-3 text-gray-200">Clientes Distintos</th>
                    <th className="p-3 text-gray-200">Última Fecha</th>
                    <th className="p-3 text-gray-200">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {binsUtilizados.bins_mas_utilizados.slice(0, 20).map((bin, index) => {
                    const yaEnCache = !binsUtilizados.bins_pendientes.find(p => p.bin === bin.bin);
                    return (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="p-3 font-mono text-blue-400">{bin.bin}</td>
                        <td className="p-3 text-gray-300">{bin.frecuencia}</td>
                        <td className="p-3 text-gray-300">{bin.clientes_distintos}</td>
                        <td className="p-3 text-gray-300">{bin.ultima_fecha?.slice(0, 10)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            yaEnCache 
                              ? 'bg-green-900 text-green-200' 
                              : 'bg-yellow-900 text-yellow-200'
                          }`}>
                            {yaEnCache ? 'En Cache' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcesadorBinsMasivo;
