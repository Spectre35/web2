import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import * as XLSX from 'xlsx';

export default function ValidadorEstatusStripe() {
  const [archivo, setArchivo] = useState(null);
  const [tipoValidacion, setTipoValidacion] = useState('perdidas'); // 'perdidas' o 'ganadas'
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [preview, setPreview] = useState([]);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Función para procesar el archivo Excel y extraer IDs de transacción
  const procesarArchivo = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log('📋 Datos del Excel:', jsonData.slice(0, 2)); // Ver primeras 2 filas
        console.log('📋 Columnas disponibles:', Object.keys(jsonData[0] || {}));

        // Buscar la columna "ID" (primera columna del Excel de Stripe)
        let idColumn = null;
        const primeraFila = jsonData[0] || {};
        
        // Primero buscar explícitamente por "ID"
        for (const [key, value] of Object.entries(primeraFila)) {
          const keyLower = key.toLowerCase().trim();
          if (keyLower === 'id') {
            idColumn = key;
            console.log('✅ Encontrada columna ID:', idColumn);
            break;
          }
        }

        // Si no encontramos "ID", usar la primera columna (que generalmente es el ID en Stripe)
        if (!idColumn) {
          const columnas = Object.keys(primeraFila);
          idColumn = columnas[0];
          console.log('🔍 Usando primera columna como ID:', idColumn);
        }

        console.log('✅ Columna seleccionada para IDs:', idColumn);

        // Extraer IDs de transacción de la columna correcta
        const idsTransaccion = jsonData.map(row => {
          return row[idColumn];
        }).filter(id => id && id.toString().trim() !== '');

        console.log('🎯 IDs extraídos:', idsTransaccion.slice(0, 5), '... total:', idsTransaccion.length);
        
        // Crear preview de los primeros 10 registros
        const previewData = jsonData.slice(0, 10).map((row, index) => ({
          index: index + 1,
          id: Object.values(row)[0] || 'N/A',
          description: Object.values(row)[1] || 'N/A',
          disputeCreated: Object.values(row)[2] || 'N/A',
          disputeAmount: Object.values(row)[4] || 'N/A',
          chargeId: row[idColumn] || 'N/A'
        }));

        setPreview(previewData);
        setMostrarPreview(true);
        
        return idsTransaccion;
      } catch (error) {
        console.error('Error procesando archivo:', error);
        alert('Error al procesar el archivo. Asegúrate de que sea un archivo Excel válido.');
        return [];
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Manejar selección de archivo
  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      procesarArchivo(file);
    }
  };

  // Procesar validación
  const procesarValidacion = async () => {
    if (!archivo) {
      alert('Por favor selecciona un archivo Excel');
      return;
    }

    setProcesando(true);
    setResultado(null);

    try {
      // Leer y procesar el archivo
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          console.log('📋 Procesando archivo para validación...');
          console.log('📋 Columnas disponibles:', Object.keys(jsonData[0] || {}));

          // Buscar la columna "ID" (primera columna del Excel de Stripe)
          let idColumn = null;
          const primeraFila = jsonData[0] || {};
          
          // Primero buscar explícitamente por "ID"
          for (const [key, value] of Object.entries(primeraFila)) {
            const keyLower = key.toLowerCase().trim();
            if (keyLower === 'id') {
              idColumn = key;
              console.log('✅ Encontrada columna ID:', idColumn);
              break;
            }
          }

          // Si no encontramos "ID", usar la primera columna (que generalmente es el ID en Stripe)
          if (!idColumn) {
            const columnas = Object.keys(primeraFila);
            idColumn = columnas[0];
            console.log('🔍 Usando primera columna como ID:', idColumn);
          }

          console.log('✅ Columna seleccionada para IDs:', idColumn);

          // Extraer IDs de transacción
          const idsTransaccion = jsonData.map(row => {
            return row[idColumn];
          }).filter(id => id && id.toString().trim() !== '');

          console.log('🎯 IDs extraídos para envío:', idsTransaccion.slice(0, 5), '... total:', idsTransaccion.length);

          // Enviar al backend
          const response = await axios.post(`${API_BASE_URL}/aclaraciones/validador-stripe`, {
            idsTransaccion,
            tipoValidacion
          });

          setResultado(response.data);
        } catch (error) {
          console.error('Error en validación:', error);
          alert('Error al procesar la validación: ' + (error.response?.data?.error || error.message));
        } finally {
          setProcesando(false);
        }
      };
      reader.readAsArrayBuffer(archivo);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el archivo');
      setProcesando(false);
    }
  };

  // Limpiar formulario
  const limpiarFormulario = () => {
    setArchivo(null);
    setResultado(null);
    setPreview([]);
    setMostrarPreview(false);
    document.getElementById('archivo-input').value = '';
  };

  // Función de debug para un ID específico
  const debugBuscarId = async () => {
    const idBuscar = prompt('Ingresa el ID que quieres buscar en la base de datos:');
    
    if (!idBuscar) return;
    
    try {
      console.log('🔍 DEBUG: Buscando ID:', idBuscar);
      
      const response = await axios.post(`${API_BASE_URL}/aclaraciones/debug-busqueda`, {
        idBuscar: idBuscar.trim()
      });
      
      console.log('📊 Resultados de búsqueda DEBUG:', response.data);
      
      // Mostrar resultados en alerta
      let mensaje = `🔍 RESULTADOS DE BÚSQUEDA PARA: "${response.data.idBuscado}"\n\n`;
      mensaje += `📏 Longitud del ID: ${response.data.longitud}\n\n`;
      
      mensaje += `✅ TOTALES ENCONTRADOS:\n`;
      mensaje += `• Exacta en Transacción: ${response.data.totales.exactaTransaccion}\n`;
      mensaje += `• Exacta en Autorización: ${response.data.totales.exactaAutorizacion}\n`;
      mensaje += `• UPPER/TRIM Transacción: ${response.data.totales.upperTransaccion}\n`;
      mensaje += `• UPPER/TRIM Autorización: ${response.data.totales.upperAutorizacion}\n`;
      mensaje += `• LIKE Transacción: ${response.data.totales.ilikeTransaccion}\n`;
      mensaje += `• LIKE Autorización: ${response.data.totales.ilikeAutorizacion}\n`;
      mensaje += `• Exacta en Comercio: ${response.data.totales.exactaComercio}\n`;
      mensaje += `• LIKE Comercio: ${response.data.totales.ilikeComercio}\n`;
      mensaje += `• Similares: ${response.data.totales.similares}\n\n`;
      
      // Mostrar primeros resultados encontrados
      if (response.data.resultados.exactaTransaccion.length > 0) {
        mensaje += `🎯 COINCIDENCIA EXACTA EN TRANSACCIÓN:\n`;
        response.data.resultados.exactaTransaccion.slice(0, 3).forEach(row => {
          mensaje += `ID: ${row.id}, Trans: ${row.id_de_transaccion}, Auth: ${row.autorizacion}\n`;
        });
      }
      
      if (response.data.resultados.exactaAutorizacion.length > 0) {
        mensaje += `\n🎯 COINCIDENCIA EXACTA EN AUTORIZACIÓN:\n`;
        response.data.resultados.exactaAutorizacion.slice(0, 3).forEach(row => {
          mensaje += `ID: ${row.id}, Trans: ${row.id_de_transaccion}, Auth: ${row.autorizacion}\n`;
        });
      }
      
      if (response.data.resultados.exactaComercio.length > 0) {
        mensaje += `\n🏪 COINCIDENCIA EXACTA EN ID COMERCIO:\n`;
        response.data.resultados.exactaComercio.slice(0, 3).forEach(row => {
          mensaje += `ID: ${row.id}, Comercio: ${row.id_del_comercio_afiliacion}, Trans: ${row.id_de_transaccion}\n`;
        });
      }
      
      if (response.data.resultados.ilikeComercio.length > 0) {
        mensaje += `\n🏪 COINCIDENCIA PARCIAL EN ID COMERCIO:\n`;
        response.data.resultados.ilikeComercio.slice(0, 3).forEach(row => {
          mensaje += `ID: ${row.id}, Comercio: ${row.id_del_comercio_afiliacion}, Trans: ${row.id_de_transaccion}\n`;
        });
      }
      
      if (response.data.resultados.similares.length > 0) {
        mensaje += `\n🔍 REGISTROS SIMILARES:\n`;
        response.data.resultados.similares.slice(0, 5).forEach(row => {
          mensaje += `ID: ${row.id}, Trans: ${row.id_de_transaccion}, Auth: ${row.autorizacion}, Comercio: ${row.id_del_comercio_afiliacion || 'N/A'}\n`;
        });
      }
      
      alert(mensaje);
      
    } catch (error) {
      console.error('❌ Error en debug:', error);
      alert('Error al buscar ID: ' + (error.response?.data?.error || error.message));
    }
  };

  // Función de prueba para ver IDs en base de datos
  const probarIdsBaseDatos = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/aclaraciones/test-ids`);
      console.log('🔍 Estructura de tabla aclaraciones:', response.data.columnas);
      console.log('🔍 IDs de muestra en base de datos:', response.data.datos);
      
      // Mostrar información de la estructura de la tabla
      const columnas = response.data.columnas.map(col => 
        `${col.column_name} (${col.data_type})`
      ).join('\n');
      
      // Mostrar en una alerta los primeros IDs
      const ids = response.data.datos.map(row => 
        `ID: ${row.id}, Transacción: ${row.id_de_transaccion || 'N/A'}, Auth: ${row.autorizacion || 'N/A'}, Status: ${row.captura_cc || 'N/A'}`
      ).slice(0, 5).join('\n');
      
      alert(`ESTRUCTURA DE TABLA:\n${columnas}\n\n` + 
            `MUESTRA DE IDs:\n${ids}\n\n(Ver consola para más detalles)`);
    } catch (error) {
      console.error('Error obteniendo IDs de prueba:', error);
      alert('Error al obtener IDs de prueba: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-100 drop-shadow-lg mb-2">
            🔍 Validador Estatus Stripe
          </h1>
          <p className="text-gray-300 text-lg">
            Actualiza masivamente el estatus de aclaraciones basándose en archivos de Stripe
          </p>
        </div>

        {/* Formulario principal */}
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Tipo de validación */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Validación
              </label>
              <select
                value={tipoValidacion}
                onChange={(e) => setTipoValidacion(e.target.value)}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="perdidas">📉 Marcar como Perdidas</option>
                <option value="ganadas">📈 Marcar como Ganadas</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Selecciona si quieres marcar las aclaraciones como ganadas o perdidas
              </p>
            </div>

            {/* Selector de archivo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Archivo Excel de Stripe
              </label>
              <input
                id="archivo-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleArchivoChange}
                className="w-full border border-gray-600/50 bg-gray-900/50 text-gray-100 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Sube el archivo Excel exportado desde Stripe con la estructura: ID, Description, Dispute Created, etc.
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              onClick={procesarValidacion}
              disabled={!archivo || procesando}
              className={`px-6 py-3 rounded-lg text-white font-medium transition-all flex items-center gap-2 ${
                !archivo || procesando
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {procesando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                <>
                  ⚡ Procesar Validación
                </>
              )}
            </button>

            <button
              onClick={limpiarFormulario}
              className="px-6 py-3 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 font-medium transition-all"
            >
              🗑️ Limpiar
            </button>

            <button
              onClick={probarIdsBaseDatos}
              className="px-6 py-3 rounded-lg bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 font-medium transition-all"
              title="Ver muestra de IDs en la base de datos"
            >
              🔍 Probar IDs
            </button>

            <button
              onClick={debugBuscarId}
              className="px-6 py-3 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 font-medium transition-all"
              title="Buscar un ID específico en la base de datos"
            >
              🐛 Debug ID
            </button>
          </div>
        </div>

        {/* Preview del archivo */}
        {mostrarPreview && preview.length > 0 && (
          <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-100 mb-4">
              📋 Preview del Archivo ({preview.length} de {archivo?.name})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-700/50">
                    <th className="p-3 text-left text-gray-300">#</th>
                    <th className="p-3 text-left text-gray-300">ID Transacción</th>
                    <th className="p-3 text-left text-gray-300">Descripción</th>
                    <th className="p-3 text-left text-gray-300">Fecha Disputa</th>
                    <th className="p-3 text-left text-gray-300">Monto</th>
                    <th className="p-3 text-left text-gray-300">Charge ID</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.index} className="border-t border-gray-600/30 hover:bg-gray-700/30">
                      <td className="p-3 text-gray-300">{row.index}</td>
                      <td className="p-3 text-blue-400 font-mono text-xs">{row.id}</td>
                      <td className="p-3 text-gray-300">{row.description}</td>
                      <td className="p-3 text-gray-300">{row.disputeCreated}</td>
                      <td className="p-3 text-gray-300">{row.disputeAmount}</td>
                      <td className="p-3 text-gray-400 font-mono text-xs">{row.chargeId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultado && (
          <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-100 mb-4">
              📊 Resultados de la Validación
            </h3>
            
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <div className="text-blue-400 text-sm font-medium">IDs Procesados</div>
                <div className="text-2xl font-bold text-blue-300">{resultado.totalProcesados}</div>
              </div>
              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                <div className="text-green-400 text-sm font-medium">Actualizados</div>
                <div className="text-2xl font-bold text-green-300">{resultado.actualizados}</div>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <div className="text-yellow-400 text-sm font-medium">No Encontrados</div>
                <div className="text-2xl font-bold text-yellow-300">{resultado.noEncontrados}</div>
              </div>
            </div>

            {/* Detalles de actualizaciones */}
            {resultado.detalles && resultado.detalles.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-200 mb-3">✅ Aclaraciones Actualizadas</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-700/50">
                        <th className="p-3 text-left text-gray-300">ID Aclaración</th>
                        <th className="p-3 text-left text-gray-300">ID Transacción</th>
                        <th className="p-3 text-left text-gray-300">Cliente</th>
                        <th className="p-3 text-left text-gray-300">Monto</th>
                        <th className="p-3 text-left text-gray-300">Nuevo Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.detalles.map((detalle, index) => (
                        <tr key={index} className="border-t border-gray-600/30 hover:bg-gray-700/30">
                          <td className="p-3 text-blue-400">{detalle.id}</td>
                          <td className="p-3 text-gray-300 font-mono text-xs">{detalle.idTransaccion}</td>
                          <td className="p-3 text-gray-300">{detalle.cliente}</td>
                          <td className="p-3 text-gray-300">${detalle.monto}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              tipoValidacion === 'ganadas' 
                                ? 'bg-green-600/20 text-green-300' 
                                : 'bg-red-600/20 text-red-300'
                            }`}>
                              {tipoValidacion === 'ganadas' ? '✅ Ganada' : '❌ Perdida'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* IDs no encontrados */}
            {resultado.idsNoEncontrados && resultado.idsNoEncontrados.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-200 mb-3">⚠️ IDs No Encontrados en la Base de Datos</h4>
                <div className="bg-yellow-900/10 border border-yellow-600/30 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {resultado.idsNoEncontrados.map((id, index) => (
                      <span key={index} className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded text-xs font-mono">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
