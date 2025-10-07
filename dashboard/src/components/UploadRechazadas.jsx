import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

export default function UploadRechazadas() {
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [progreso, setProgreso] = useState({ insertados: 0, errores: 0 });
  const [resultadosPorArchivo, setResultadosPorArchivo] = useState([]);

  const manejarCambioArchivos = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) {
      setMensaje("❌ No se seleccionaron archivos");
      return;
    }

    // Validar que todos sean archivos CSV
    const archivosInvalidos = files.filter(file => !file.name.toLowerCase().endsWith('.csv'));
    if (archivosInvalidos.length > 0) {
      setMensaje(`❌ Estos archivos no son CSV: ${archivosInvalidos.map(f => f.name).join(', ')}`);
      return;
    }

    setArchivos(files);
    setMensaje(`📁 ${files.length} archivo(s) CSV seleccionado(s): ${files.map(f => f.name).join(', ')}`);
    setResultadosPorArchivo([]);
  };

  const subirArchivos = async () => {
    if (archivos.length === 0) {
      setMensaje("❌ Por favor selecciona al menos un archivo CSV");
      return;
    }

    setCargando(true);
    setMensaje(`📤 Subiendo ${archivos.length} archivo(s)...`);
    setProgreso({ insertados: 0, errores: 0 });
    setResultadosPorArchivo([]);

    const resultados = [];
    let totalInsertados = 0;
    let totalErrores = 0;

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      setMensaje(`📤 Procesando archivo ${i + 1}/${archivos.length}: ${archivo.name}...`);

      const formData = new FormData();
      formData.append("archivo", archivo);

      try {
        const response = await axios.post(`${API_BASE_URL}/upload-rechazadas`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 300000, // 5 minutos timeout
        });

        const resultado = {
          archivo: archivo.name,
          success: response.data.success,
          mensaje: response.data.message,
          insertados: response.data.registros_insertados || 0,
          errores: response.data.registros_con_errores || 0
        };

        resultados.push(resultado);
        totalInsertados += resultado.insertados;
        totalErrores += resultado.errores;

        setProgreso({
          insertados: totalInsertados,
          errores: totalErrores
        });

      } catch (error) {
        console.error(`Error subiendo ${archivo.name}:`, error);
        const resultado = {
          archivo: archivo.name,
          success: false,
          mensaje: error.response?.data?.message || `Error: ${error.message}`,
          insertados: 0,
          errores: 1
        };
        
        resultados.push(resultado);
        totalErrores += 1;
        
        setProgreso({
          insertados: totalInsertados,
          errores: totalErrores
        });
      }
    }

    setResultadosPorArchivo(resultados);
    
    const archivosExitosos = resultados.filter(r => r.success).length;
    const archivosFallidos = resultados.length - archivosExitosos;
    
    if (archivosFallidos === 0) {
      setMensaje(`✅ Todos los archivos procesados exitosamente! Total: ${totalInsertados} registros insertados`);
    } else if (archivosExitosos === 0) {
      setMensaje(`❌ Falló el procesamiento de todos los archivos`);
    } else {
      setMensaje(`⚠️ Procesamiento completado: ${archivosExitosos} exitosos, ${archivosFallidos} fallidos. Total: ${totalInsertados} insertados`);
    }

    // Limpiar el input de archivo
    setArchivos([]);
    document.getElementById('file-input-rechazadas').value = '';
    setCargando(false);
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl layout-transition">
      <h3 className="text-lg font-bold text-gray-100 mb-4 text-center">
        📄 Subir CSV Rechazadas
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Archivos CSV (selección múltiple):
          </label>
          <input
            id="file-input-rechazadas"
            type="file"
            accept=".csv"
            multiple
            onChange={manejarCambioArchivos}
            disabled={cargando}
            className="w-full p-2 bg-gray-700/80 border border-gray-600 rounded-lg text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
          />
        </div>

        {archivos.length > 0 && (
          <div className="text-sm text-gray-400">
            📁 Archivos seleccionados: {archivos.length}
            <div className="mt-1 space-y-1">
              {archivos.map((archivo, index) => (
                <div key={index} className="text-xs">
                  • {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={subirArchivos}
          disabled={archivos.length === 0 || cargando}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-lg"
        >
          {cargando ? "📤 Subiendo..." : `📤 Subir ${archivos.length > 0 ? archivos.length : ''} CSV`}
        </button>

        {mensaje && (
          <div className={`p-3 rounded-lg text-sm ${
            mensaje.includes("✅") 
              ? "bg-green-900/50 text-green-300 border border-green-700/50" 
              : "bg-red-900/50 text-red-300 border border-red-700/50"
          }`}>
            {mensaje}
          </div>
        )}

        {(progreso.insertados > 0 || progreso.errores > 0) && (
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
            <div className="text-sm text-blue-300">
              📊 Resultados del procesamiento:
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="text-green-400">
                ✅ Registros insertados: {progreso.insertados}
              </div>
              {progreso.errores > 0 && (
                <div className="text-yellow-400">
                  ⚠️ Registros con errores: {progreso.errores}
                </div>
              )}
            </div>
          </div>
        )}

        {resultadosPorArchivo.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
            <div className="text-sm text-gray-300 mb-2">
              📋 Detalle por archivo:
            </div>
            <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
              {resultadosPorArchivo.map((resultado, index) => (
                <div key={index} className={`p-2 rounded ${resultado.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  <div className="font-medium">{resultado.archivo}</div>
                  <div>{resultado.mensaje}</div>
                  {resultado.success && (
                    <div className="text-gray-400">
                      Insertados: {resultado.insertados} | Errores: {resultado.errores}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <div>💡 Columnas esperadas del CSV:</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>• Bloque</div>
          <div>• Sucursal</div>
          <div>• Paciente</div>
          <div>• Importe</div>
          <div>• Fecha Proceso</div>
          <div>• Codigo Respuesta</div>
          <div>• Response Msg</div>
          <div>• Notas</div>
          <div>• OrderID</div>
          <div>• Tarjeta</div>
          <div>• Banco Paquete</div>
          <div>• Tipo</div>
        </div>
      </div>
    </div>
  );
}
