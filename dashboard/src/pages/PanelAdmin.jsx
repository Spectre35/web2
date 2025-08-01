import { useState } from "react";
import UploadFile from "../components/UploadFile";
import { Link } from "react-router-dom";

const PASSWORD = "1202"; // Cambia esto

export default function PanelAdmin() {
  const [autorizado, setAutorizado] = useState(false);
  const [input, setInput] = useState("");

  if (!autorizado) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 layout-transition">
        <div className="bg-gray-900/80 p-8 rounded-xl shadow-xl border border-white/20 layout-transition">
          <h2 className="text-xl font-bold text-gray-100 mb-4">Panel Admin</h2>
          <input
            type="password"
            className="p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 mb-4 w-full"
            placeholder="Contraseña"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input === PASSWORD && setAutorizado(true)}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-2"
            onClick={() => input === PASSWORD && setAutorizado(true)}
          >
            Entrar
          </button>
          <Link
            to="/"
            className="block text-center bg-gray-700/80 text-white px-4 py-2 rounded hover:bg-gray-600/80 transition font-semibold"
          >
            ⬅ Volver al Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 layout-transition">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-100 drop-shadow layout-transition">
        📊 Panel de Actualización de Tablas
      </h1>
      <div className="flex justify-center mb-6">
        <Link
          to="/"
          className="bg-gray-700/80 text-white px-6 py-2 rounded hover:bg-gray-600/80 transition font-semibold"
        >
          ⬅ Volver al Home
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        <UploadFile tabla="cargos_auto" />
        <UploadFile tabla="caja" />
        <UploadFile tabla="ventas" />
        <UploadFile tabla="aclaraciones" />
      </div>
    </div>
  );
}
