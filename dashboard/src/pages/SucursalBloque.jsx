import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";

export default function SucursalBloque() {
  const [datos, setDatos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [bloques, setBloques] = useState([]);
  const [bloque, setBloque] = useState("");

  // Obtener todos los bloques únicos
  useEffect(() => {
    axios.get(`${API_BASE_URL}/bloques`)
      .then(res => setBloques(res.data))
      .catch(() => setBloques([]));
  }, []);

  // Obtener sucursal-bloque (filtrado por bloque si se selecciona)
  useEffect(() => {
    const params = bloque ? { bloque } : {};
    axios.get(`${API_BASE_URL}/sucursal-bloque`, { params })
      .then(res => setDatos(res.data))
      .catch(() => setDatos([]));
  }, [bloque]);

  // Filtra por sucursal (case insensitive)
  const filtrados = datos.filter(row =>
    row.Sucursal?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-2xl mx-auto border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-100 drop-shadow">
            🏢 Buscador Sucursal - Bloque
          </h1>
        </div>
        <div className="mb-4 flex gap-4 items-center">
          <select
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded"
            value={bloque}
            onChange={e => setBloque(e.target.value)}
          >
            <option value="">Todos los bloques</option>
            {bloques.map((b, i) => (
              <option key={i} value={b}>{b}</option>
            ))}
          </select>
          <input
            type="text"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded w-full"
            placeholder="Buscar sucursal..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full bg-gray-900/80 shadow-md rounded text-sm text-gray-100">
            <thead>
              <tr className="bg-gray-800/80 text-left">
                <th className="p-2">Sucursal</th>
                <th className="p-2">Bloque</th>
                <th className="p-2">Usuario Slack</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length > 0 ? (
                filtrados.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2">{row.Sucursal}</td>
                    <td className="p-2">{row.Bloque}</td>
                    <td className="p-2">
                      {row.nombre_slack ? (
                        <span className="text-blue-400 font-mono">
                          {row.nombre_slack}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Sin asignar</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    No hay resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}