import React, { useState, useCallback } from 'react';
import { Upload, Eye, Save, FileText, AlertCircle, CheckCircle, X, Loader } from 'lucide-react';

// URL base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ProcesadorRecibos = () => {
  const [archivo, setArchivo] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [datosExtraidos, setDatosExtraidos] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Función para procesar archivo seleccionado
  const manejarArchivoSeleccionado = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!tiposPermitidos.includes(file.type)) {
        alert('Tipo de archivo no soportado. Use JPG, PNG, GIF o PDF.');
        return;
      }

      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      setArchivo(file);
      
      // Crear previsualización para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPrevisualizacion(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPrevisualizacion(null);
      }

      // Limpiar datos anteriores
      setDatosExtraidos(null);
      setResultado(null);
    }
  }, []);

  // Función principal de procesamiento OCR
  const procesarArchivo = useCallback(async () => {
    if (!archivo) return;

    setProcesando(true);
    setDatosExtraidos(null);

    try {
      console.log('📄 Enviando archivo al servidor...', archivo.name, 'Tipo:', archivo.type);
      
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('archivo', archivo);

      const response = await fetch(`${API_BASE_URL}/api/procesar-recibo`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      const datos = await response.json();
      console.log('✅ Datos recibidos del servidor:', datos);
      setDatosExtraidos(datos);
      
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      alert(`Error al procesar el archivo: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  }, [archivo]);

  // Función para guardar en base de datos
  const guardarEnBaseDatos = useCallback(async () => {
    if (!datosExtraidos) return;

    setGuardando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/guardar-recibo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosExtraidos)
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const resultado = await response.json();
      setResultado({ tipo: 'success', mensaje: 'Recibo guardado exitosamente', datos: resultado });
      
      // Limpiar formulario después de 3 segundos
      setTimeout(() => {
        setArchivo(null);
        setPrevisualizacion(null);
        setDatosExtraidos(null);
        setResultado(null);
      }, 3000);

    } catch (error) {
      console.error('Error al guardar:', error);
      setResultado({ tipo: 'error', mensaje: 'Error al guardar en base de datos' });
    } finally {
      setGuardando(false);
    }
  }, [datosExtraidos]);

  // Función para actualizar campos manualmente
  const actualizarCampo = useCallback((campo, valor) => {
    setDatosExtraidos(prev => ({
      ...prev,
      [campo]: valor
    }));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="w-8 h-8" />
          Procesador de Recibos OCR
        </h1>
        <p className="text-blue-100 mt-2">
          Sube imágenes de recibos de Europiel para extraer datos automáticamente
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de carga de archivo */}
        <div className="backdrop-blur-lg bg-gray-800/90 rounded-lg shadow-lg p-6 border border-gray-600/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <Upload className="w-5 h-5" />
            Cargar Archivo
          </h2>

          <div className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-gray-700/30">
            <input
              type="file"
              id="archivo-input"
              className="hidden"
              accept="image/*,.pdf"
              onChange={manejarArchivoSeleccionado}
            />
            <label htmlFor="archivo-input" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Haz clic para seleccionar archivo
              </p>
              <p className="text-sm text-gray-400">
                Formatos: JPG, PNG, GIF, WEBP, BMP, TIFF, PDF (máx. 10MB)
              </p>
            </label>
          </div>

          {archivo && (
            <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <p className="text-sm font-medium text-gray-200">Archivo seleccionado:</p>
              <p className="text-sm text-gray-300">{archivo.name}</p>
              <p className="text-xs text-gray-400">
                {(archivo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {/* Previsualización */}
          {previsualizacion && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Previsualización
              </h3>
              <img
                src={previsualizacion}
                alt="Previsualización"
                className="w-full max-h-60 object-contain rounded border border-gray-200"
              />
            </div>
          )}

          {/* Botón de procesamiento */}
          <button
            onClick={procesarArchivo}
            disabled={!archivo || procesando}
            className="w-full mt-4 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {procesando ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Procesando archivo...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Procesar con OCR
              </>
            )}
          </button>
        </div>

        {/* Panel de datos extraídos */}
        <div className="backdrop-blur-lg bg-gray-800/90 rounded-lg shadow-lg p-6 border border-gray-600/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5" />
            Datos Extraídos
          </h2>

          {!datosExtraidos ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p>Los datos extraídos aparecerán aquí</p>
              <p className="text-sm mt-1">Selecciona y procesa un archivo primero</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Campos editables */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Folio
                  </label>
                  <input
                    type="text"
                    value={datosExtraidos.folio || ''}
                    onChange={(e) => actualizarCampo('folio', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                    placeholder="CI1-1607"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={datosExtraidos.cliente || ''}
                    onChange={(e) => actualizarCampo('cliente', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                    placeholder="CELESTE ANAHI ALEJO PECINA"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      Monto
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={datosExtraidos.monto || ''}
                      onChange={(e) => actualizarCampo('monto', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                      placeholder="3000.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={datosExtraidos.fecha || ''}
                      onChange={(e) => actualizarCampo('fecha', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Concepto
                  </label>
                  <input
                    type="text"
                    value={datosExtraidos.concepto || ''}
                    onChange={(e) => actualizarCampo('concepto', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                    placeholder="ANTICIPO A PAQUETE NUEVO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Sucursal
                  </label>
                  <input
                    type="text"
                    value={datosExtraidos.sucursal || ''}
                    onChange={(e) => actualizarCampo('sucursal', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                    placeholder="Plaza Citadel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Bloque
                  </label>
                  <input
                    type="text"
                    value={datosExtraidos.bloque || ''}
                    onChange={(e) => actualizarCampo('bloque', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                    placeholder="A, B, C, D..."
                  />
                </div>

                {/* Cliente encontrado en BD */}
                {datosExtraidos.clienteEnBD && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-green-400 mb-1">
                      ✅ Cliente encontrado en Base de Datos
                    </label>
                    <input
                      type="text"
                      value={datosExtraidos.clienteEnBD}
                      readOnly
                      className="w-full px-3 py-2 bg-green-900/30 border border-green-600/50 rounded text-green-300 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none focus:border-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Confianza del OCR */}
              {datosExtraidos.confianza && (
                <div className="bg-blue-900/30 p-3 rounded border border-blue-600/50">
                  <p className="text-sm text-blue-300">
                    <strong>Confianza OCR:</strong> {datosExtraidos.confianza}%
                  </p>
                  {datosExtraidos.confianza < 70 && (
                    <p className="text-xs text-orange-400 mt-1">
                      ⚠️ Confianza baja - Revise los datos manualmente
                    </p>
                  )}
                </div>
              )}

              {/* Botón guardar */}
              <button
                onClick={guardarEnBaseDatos}
                disabled={guardando}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar en Base de Datos
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`p-4 rounded-lg border ${
          resultado.tipo === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {resultado.tipo === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{resultado.mensaje}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcesadorRecibos;
