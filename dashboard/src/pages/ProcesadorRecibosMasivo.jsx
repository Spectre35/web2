import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config.js';

const ProcesadorRecibosMasivo = () => {
  const [archivos, setArchivos] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [progreso, setProgreso] = useState(null);
  const [errores, setErrores] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const fileInputRef = useRef(null);

  // Funciones para drag and drop
  const manejarDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(true);
  };

  const manejarDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Solo quitar el estado de arrastre si realmente salimos del área
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setArrastrando(false);
    }
  };

  const manejarDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);

    const archivosDropeados = Array.from(e.dataTransfer.files);
    const archivosImagen = archivosDropeados.filter(archivo => 
      archivo.type.startsWith('image/')
    );

    if (archivosImagen.length > 0) {
      setArchivos(prevArchivos => [...prevArchivos, ...archivosImagen]);
      setResultados([]);
      setErrores([]);
    } else {
      alert('Por favor, solo arrastra archivos de imagen (JPG, PNG, etc.)');
    }
  };

  const manejarSeleccionArchivos = (event) => {
    const archivosSeleccionados = Array.from(event.target.files);
    setArchivos(prevArchivos => [...prevArchivos, ...archivosSeleccionados]);
    setResultados([]);
    setErrores([]);
  };

  const eliminarArchivo = (index) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const procesarRecibos = async () => {
    if (archivos.length === 0) {
      alert('Por favor selecciona al menos un archivo');
      return;
    }

    setProcesando(true);
    setProgreso({ actual: 0, total: archivos.length });
    setResultados([]);
    setErrores([]);

    const formData = new FormData();
    archivos.forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    try {
      console.log('🚀 Enviando archivos al servidor...');
      
      const response = await fetch(`${API_BASE_URL}/api/procesar-recibos-masivo`, {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Respuesta del servidor - Status:', response.status);
      console.log('📡 Respuesta del servidor - OK:', response.ok);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      console.log('📊 Respuesta completa del servidor:', data);
      console.log('📊 Tipo de data:', typeof data);
      console.log('📊 Keys disponibles:', Object.keys(data || {}));
      console.log('📊 Valores:', data);

      // El backend puede enviar 'success' o 'exito'
      const esExitoso = data.success === true || data.exito === true;
      console.log('📊 ¿Es exitoso?', esExitoso, '(success:', data.success, ', exito:', data.exito, ')');

      if (esExitoso) {
        // Asegurar que resultados y errores sean arrays
        const resultadosArray = Array.isArray(data.resultados) ? data.resultados : [];
        const erroresArray = Array.isArray(data.errores) ? data.errores : [];
        
        console.log('📊 Datos recibidos del servidor:', data);
        console.log('✅ Resultados:', resultadosArray);
        console.log('❌ Errores:', erroresArray);
        
        setResultados(resultadosArray);
        setErrores(erroresArray);
      } else {
        const errorMessage = data.error || data.mensaje || 'Error desconocido en el procesamiento';
        console.error('❌ Error del servidor:', errorMessage);
        setErrores([{ archivo: 'General', error: errorMessage }]);
      }
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      const mensajeError = error.message || 'Error de conexión con el servidor';
      setErrores([{ 
        archivo: 'Error de Sistema', 
        error: mensajeError + ' - Verifica que el servidor esté funcionando'
      }]);
    } finally {
      setProcesando(false);
      setProgreso(null);
    }
  };

  const limpiarArchivos = () => {
    setArchivos([]);
    setResultados([]);
    setErrores([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">📄 Procesador Masivo de Recibos</h1>
        
        {/* Selección de archivos con Drag & Drop */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">📁 Seleccionar Recibos</h2>
          
          <div className="space-y-4">
            {/* Zona de Drag & Drop */}
            <div
              onDragOver={manejarDragOver}
              onDragLeave={manejarDragLeave}
              onDrop={manejarDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                ${arrastrando 
                  ? 'border-blue-400 bg-blue-900/20 scale-105' 
                  : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={manejarSeleccionArchivos}
                className="hidden"
              />
              
              <div className="space-y-4">
                {arrastrando ? (
                  <>
                    <div className="text-6xl">📄⬇️</div>
                    <div className="text-blue-400 font-semibold text-lg">
                      ¡Suelta los archivos aquí!
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-6xl">📁</div>
                    <div className="text-white font-semibold text-lg">
                      Arrastra y suelta tus recibos aquí
                    </div>
                    <div className="text-gray-400">
                      o <span className="text-blue-400 underline">haz clic para seleccionar archivos</span>
                    </div>
                  </>
                )}
                <div className="text-sm text-gray-500">
                  Formatos soportados: JPG, PNG, GIF, BMP, TIFF, WEBP
                </div>
              </div>
            </div>

            {/* Lista de archivos seleccionados */}
            {archivos.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    📋 {archivos.length} archivo(s) seleccionado(s)
                  </h3>
                  <button
                    onClick={() => setArchivos([])}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    🗑️ Limpiar todo
                  </button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {archivos.map((archivo, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between bg-gray-600 p-2 rounded border border-gray-500"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <div className="text-sm text-white font-medium truncate max-w-xs">
                            {archivo.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {(archivo.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarArchivo(index);
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Eliminar archivo"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-sm text-gray-400">
                    Tamaño total: {(archivos.reduce((total, archivo) => total + archivo.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={procesarRecibos}
                disabled={procesando || archivos.length === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold transition-all duration-200"
              >
                {procesando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Procesar {archivos.length} Recibo{archivos.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={procesando}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span>➕</span>
                <span>Agregar más archivos</span>
              </button>

              <button
                onClick={limpiarArchivos}
                disabled={procesando}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span>🗑️</span>
                <span>Limpiar todo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progreso */}
        {progreso && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="text-white">
                Procesando archivo {progreso.actual} de {progreso.total}...
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultados.length > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              ✅ Resultados ({resultados.length} procesados)
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-gray-300">Archivo</th>
                    <th className="text-left p-3 text-gray-300">Cliente</th>
                    <th className="text-left p-3 text-gray-300">Monto</th>
                    <th className="text-left p-3 text-gray-300">Fecha</th>
                    <th className="text-left p-3 text-gray-300">Sucursal</th>
                    <th className="text-left p-3 text-gray-300">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((resultado, index) => {
                    // Asegurar que resultado es un objeto válido
                    const archivo = resultado?.archivo || `Archivo ${index + 1}`;
                    const datos = resultado?.datos || {};
                    const exito = resultado?.exito === true;
                    
                    return (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="p-3 text-gray-300 text-sm">{archivo}</td>
                        <td className="p-3 text-white">
                          {datos.cliente || 'No detectado'}
                        </td>
                        <td className="p-3 text-green-400">
                          {datos.monto ? `$${datos.monto}` : 'No detectado'}
                        </td>
                        <td className="p-3 text-gray-300">
                          {datos.fecha || 'No detectada'}
                        </td>
                        <td className="p-3 text-gray-300">
                          {datos.sucursal || 'No detectada'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            exito 
                              ? 'bg-green-900 text-green-200' 
                              : 'bg-red-900 text-red-200'
                          }`}>
                            {exito ? 'Procesado' : 'Error'}
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

        {/* Errores */}
        {errores.length > 0 && (
          <div className="bg-red-900 p-6 rounded-lg border border-red-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              ❌ Errores ({errores.length})
            </h2>
            
            <div className="space-y-2">
              {errores.map((error, index) => {
                // Asegurar que error es un objeto válido
                const archivo = error?.archivo || `Error ${index + 1}`;
                const mensaje = error?.error || error || 'Error desconocido';
                
                return (
                  <div key={index} className="bg-red-800 p-3 rounded border border-red-600">
                    <div className="text-red-200">
                      <strong>{archivo}:</strong> {String(mensaje)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Información mejorada */}
        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">ℹ️ Cómo usar el procesador</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-md font-semibold text-blue-400 mb-2">📁 Subir archivos</h4>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• <strong>Arrastra y suelta:</strong> Arrastra imágenes directamente a la zona azul</li>
                <li>• <strong>Clic para seleccionar:</strong> Haz clic en la zona para abrir el explorador</li>
                <li>• <strong>Múltiples archivos:</strong> Puedes agregar varios archivos a la vez</li>
                <li>• <strong>Eliminar individual:</strong> Usa el ❌ para quitar archivos específicos</li>
              </ul>
            </div>
            <div>
              <h4 className="text-md font-semibold text-green-400 mb-2">🤖 Procesamiento con IA</h4>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• <strong>EasyOCR:</strong> Tecnología avanzada de reconocimiento de texto</li>
                <li>• <strong>Alta precisión:</strong> Especialmente optimizado para español</li>
                <li>• <strong>Extracción automática:</strong> Cliente, monto, fecha, sucursal y concepto</li>
                <li>• <strong>Validación:</strong> Los datos se validan contra la base de datos</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="text-blue-200 text-sm">
              <strong>💡 Consejo:</strong> Para mejores resultados, asegúrate de que las imágenes sean claras y el texto sea legible. 
              Los recibos de Europiel son procesados automáticamente con alta precisión.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcesadorRecibosMasivo;
