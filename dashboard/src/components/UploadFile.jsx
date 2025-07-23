import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

export default function UploadFile({ tabla }) {
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(null);

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
    const evtSource = new EventSource("http://192.168.1.111:3000/progreso");
    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tabla === tabla) {
        setProgreso(Number(data.porcentaje));
        setTiempoRestante(data.tiempoEstimado);
      }
    };
    return () => evtSource.close();
  }, [subiendo, tabla]);

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
          `http://192.168.1.111:3000/upload/${tabla}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setMensaje(res.data);
      } catch (err) {
        setMensaje("❌ Error al subir el archivo");
      } finally {
        setSubiendo(false);
        setProgreso(0);
        setTiempoRestante(null);
      }
    },
    [tabla]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="backdrop-blur-lg bg-white/10 p-6 rounded-xl shadow-xl flex flex-col items-center border border-white/20">
      <h2 className="font-bold mb-2 text-lg capitalize text-gray-100 drop-shadow">
        {nombreAmigable}
      </h2>
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
          <p>Suelta el archivo aquí...</p>
        ) : (
          <p>
            Arrastra y suelta un archivo Excel aquí, o haz clic para seleccionar
          </p>
        )}
      </div>
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
      {mensaje && <div className="mt-4 text-center text-gray-200">{mensaje}</div>}
    </div>
  );
}
