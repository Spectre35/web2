import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

export default function UploadFile({ tabla }) {
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [archivosMultiples, setArchivosMultiples] = useState([]);
  const [subiendoMultiple, setSubiendoMultiple] = useState(false);
  const [progresoMultiple, setProgresoMultiple] = useState({});

  // 📋 Nombres amigables para las tablas
  const nombresTablas = {
    cargos_auto: "💳 Cargos Auto",
    caja: "💰 Caja",
    ventas: "🛒 Ventas", 
    aclaraciones: "💳 Aclaraciones"
  };

  const nombreAmigable = nombresTablas[tabla] || tabla;

  // Escuchar progreso SSE
  useEffect(() => {
    if (!subiendo) return;
    const evtSource = new EventSource(`${API_BASE_URL}/progreso`);
    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tabla === tabla) {
        setProgreso(Number(data.porcentaje));
        setTiempoRestante(data.tiempoEstimado);
      }
    };
    return () => evtSource.close();
  }, [subiendo, tabla]);

  // Función para borrar registros del año 2025
  const borrarRegistros2025 = async () => {
    if (!confirm(`¿Estás seguro de que quieres borrar TODOS los registros del año 2025 de la tabla ${nombreAmigable}?`)) {
      return;
    }
    
    setBorrando(true);
    setMensaje("");
    
    try {
      const res = await axios.delete(`${API_BASE_URL}/delete-all/${tabla}`);
      setMensaje(`✅ ${res.data.message || 'Registros del 2025 borrados exitosamente'}`);
    } catch (err) {
      setMensaje(`❌ Error al borrar registros: ${err.response?.data?.error || err.message}`);
    } finally {
      setBorrando(false);
    }
  };

  // Función para borrar registros de julio y agosto (solo para cargos_auto)
  const borrarJulioAgosto = async () => {
    if (!confirm(`¿Estás seguro de que quieres borrar TODOS los registros de JULIO y AGOSTO 2025 de ${nombreAmigable}?`)) {
      return;
    }
    
    setBorrando(true);
    setMensaje("");
    
    try {
      const res = await axios.delete(`${API_BASE_URL}/delete-julio-agosto/${tabla}`);
      setMensaje(`✅ ${res.data.message || 'Registros de julio y agosto borrados exitosamente'}`);
    } catch (err) {
      setMensaje(`❌ Error al borrar registros: ${err.response?.data?.error || err.message}`);
    } finally {
      setBorrando(false);
    }
  };

  // Función para borrar registros del MES CORRIENTE (solo para cargos_auto)
  const borrarMesCorriente = async () => {
    const fechaActual = new Date();
    const nombreMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][fechaActual.getMonth()];
    const año = fechaActual.getFullYear();
    
    if (!confirm(`¿Estás seguro de que quieres borrar TODOS los registros de ${nombreMes.toUpperCase()} ${año} de ${nombreAmigable}?`)) {
      return;
    }
    
    setBorrando(true);
    setMensaje("");
    
    try {
      const res = await axios.delete(`${API_BASE_URL}/delete-mes-corriente/${tabla}`);
      setMensaje(`✅ ${res.data.message || `Registros de ${nombreMes} ${año} borrados exitosamente`}`);
    } catch (err) {
      setMensaje(`❌ Error al borrar registros: ${err.response?.data?.error || err.message}`);
    } finally {
      setBorrando(false);
    }
  };

  // Función para manejar múltiples archivos (solo para caja)
  const onDropMultiple = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      if (tabla !== 'caja') return; // Solo para tabla caja
      
      if (acceptedFiles.length > 13) {
        setMensaje("❌ Máximo 13 archivos permitidos");
        return;
      }
      
      setArchivosMultiples(acceptedFiles);
      setSubiendoMultiple(true);
      setMensaje("");
      setProgresoMultiple({});
      
      // Subir archivos uno por uno
      for (let i = 0; i < acceptedFiles.length; i++) {
        const archivo = acceptedFiles[i];
        const formData = new FormData();
        formData.append("archivo", archivo);
        
        try {
          setProgresoMultiple(prev => ({ ...prev, [i]: 'subiendo' }));
          
          const res = await axios.post(
            `${API_BASE_URL}/upload/${tabla}`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          
          setProgresoMultiple(prev => ({ ...prev, [i]: 'completado' }));
        } catch (err) {
          setProgresoMultiple(prev => ({ ...prev, [i]: 'error' }));
        }
      }
      
      setSubiendoMultiple(false);
      setMensaje("✅ Carga múltiple completada");
    },
    [tabla]
  );

  // Función original para un solo archivo
  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      setSubiendo(true);
      setMensaje("");
      setProgreso(0);
      setTiempoRestante(null);

      const formData = new FormData();
      formData.append("archivo", acceptedFiles[0]);

      try {
        const res = await axios.post(
          `${API_BASE_URL}/upload/${tabla}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        // Extraer solo el mensaje del objeto de respuesta
        setMensaje(res.data.message || res.data.success || "✅ Archivo subido exitosamente");
      } catch (err) {
        setMensaje(`❌ Error al subir el archivo: ${err.response?.data?.error || err.message}`);
      } finally {
        setSubiendo(false);
        setProgreso(0);
        setTiempoRestante(null);
      }
    },
    [tabla]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: tabla === 'caja' ? onDropMultiple : onDrop,
    multiple: tabla === 'caja'
  });

  return (
    <div className="backdrop-blur-lg bg-white/10 p-6 rounded-xl shadow-xl flex flex-col items-center border border-white/20">
      <h2 className="font-bold mb-2 text-lg capitalize text-gray-100 drop-shadow">
        {nombreAmigable}
      </h2>
      
      {/* Botón para borrar registros del año 2025 (solo para caja y ventas) */}
      {(tabla === 'caja' || tabla === 'ventas') && (
        <button
          onClick={borrarRegistros2025}
          disabled={borrando}
          className="mb-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
        >
          {borrando ? '🗑️ Borrando 2025...' : '🗑️ Borrar Registros 2025'}
        </button>
      )}
      
      {/* Botón para borrar julio y agosto (solo para cargos_auto) */}
      {tabla === 'cargos_auto' && (
        <>
          <button
            onClick={borrarJulioAgosto}
            disabled={borrando}
            className="mb-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg w-full"
          >
            {borrando ? '🗑️ Borrando Jul/Ago...' : '🗑️ Borrar Julio y Agosto'}
          </button>
          
          <button
            onClick={borrarMesCorriente}
            disabled={borrando}
            className="mb-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg w-full"
          >
            {borrando ? '🗑️ Borrando mes...' : `🗑️ Borrar ${new Date().toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('es-ES', { month: 'long' }).slice(1)}`}
          </button>
        </>
      )}
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded p-4 w-64 text-center cursor-pointer ${
          isDragActive
            ? "border-blue-500 bg-blue-900/30"
            : "border-gray-500 bg-gray-900/30"
        } text-gray-200`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Suelta {tabla === 'caja' ? 'los archivos' : 'el archivo'} aquí...</p>
        ) : (
          <p>
            Arrastra y suelta {tabla === 'caja' ? 'archivos Excel (máx. 13)' : 'un archivo Excel'} aquí, o haz clic para seleccionar
          </p>
        )}
      </div>
      
      {/* Progreso para archivo único */}
      {subiendo && (
        <div className="w-full mt-4">
          <div className="w-full bg-gray-700 rounded h-4">
            <div
              className="bg-blue-500 h-4 rounded"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
          <div className="text-sm mt-1 text-center text-gray-200">
            {progreso}% completado
            {tiempoRestante && (
              <span>
                {" "}
                &middot; Tiempo estimado: {Math.round(tiempoRestante)}s
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Progreso para múltiples archivos (solo caja) */}
      {subiendoMultiple && tabla === 'caja' && (
        <div className="w-full mt-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">
            Subiendo archivos ({Object.keys(progresoMultiple).length}/{archivosMultiples.length})
          </h3>
          <div className="space-y-1">
            {archivosMultiples.map((archivo, index) => (
              <div key={index} className="flex items-center justify-between text-xs text-gray-300">
                <span className="truncate max-w-40">{archivo.name}</span>
                <span className="ml-2">
                  {progresoMultiple[index] === 'subiendo' && '⏳ Subiendo...'}
                  {progresoMultiple[index] === 'completado' && '✅ Completado'}
                  {progresoMultiple[index] === 'error' && '❌ Error'}
                  {!progresoMultiple[index] && '⏸️ En espera'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {mensaje && <div className="mt-4 text-center text-gray-200">{mensaje}</div>}
    </div>
  );
}
