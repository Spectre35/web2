import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import DetonArturo from "../assets/detonarturo.png";
import { formatearFecha } from "../utils/dateUtils";

export default function VendedorasStatus() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    setCargando(true);
    axios.get("http://192.168.1.111:3000/vendedoras-status", {
      params: busqueda ? { nombre: busqueda } : {}
    })
      .then(res => setDatos(res.data))
      .finally(() => setCargando(false));
  }, [busqueda]);

  // Calcula estatus y color
  const vendedoras = useMemo(() => {
    const hoy = new Date();
    const fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth() - 2, hoy.getDate());
    return datos.map(v => {
      let fecha = v.fechaultima; // <-- usa el nombre tal como llega del backend
      if (fecha && typeof fecha === "object" && fecha.toISOString) {
        fecha = fecha.toISOString().slice(0, 10);
      } else if (fecha && typeof fecha === "string") {
        fecha = fecha.slice(0, 10);
      } else {
        fecha = "-";
      }
      let estatus = "Detonada";
      let color = "bg-yellow-400 text-gray-900";
      let icon = (
        <img
          src={DetonArturo}
          alt="Detonada"
          className="inline-block w-6 h-6 rounded-full mr-2 align-middle"
          style={{ verticalAlign: "middle" }}
        />
      );
      if (fecha && new Date(fecha) >= fechaLimite) {
        estatus = "Activa";
        color = "bg-green-600 text-white";
        icon = null;
      }
      return {
        nombre: v.nombre,
        bloque: v.Bloque,
        sucursal: v.Sucursal,
        fechaUltima: formatearFecha(fecha),
        estatus,
        color,
        icon,
      };
    });
  }, [datos]);

  // Cambia el favicon al abrir la página
  useEffect(() => {
    const favicon = document.querySelector("link[rel*='icon']");
    if (favicon) {
      favicon.href = DetonArturo;
    }
    return () => {
      if (favicon) favicon.href = "/vite.svg";
    };
  }, []);

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl p-6 max-w-5xl mx-auto border border-white/20">
        <div className="flex justify-between mb-4 items-center">
          <div className="flex items-center gap-2">
            <img
              src={DetonArturo}
              alt="Detonada"
              className="w-8 h-8 rounded-full shadow-lg object-cover"
            />
            <h1 className="text-2xl font-bold mb-4 text-center text-gray-100 drop-shadow flex items-center">
              Buscador <span className="ml-2">Vendedoras Status</span>
            </h1>
          </div>
          <Link
            to="/"
            className="bg-gray-700/80 text-white px-3 py-2 rounded hover:bg-gray-600/80 transition"
          >
            ⬅ Volver al Home
          </Link>
        </div>
        <div className="mb-4 flex gap-4 items-center">
          <input
            type="text"
            className="border border-gray-700 bg-gray-900/60 text-gray-100 p-2 rounded w-full max-w-xs"
            placeholder="Buscar vendedora por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        {cargando ? (
          <p className="text-center text-gray-400">Cargando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-gray-900/80 shadow-md rounded text-sm text-gray-100">
              <thead>
                <tr className="bg-gray-800/80 text-left">
                  <th className="p-2">Vendedora</th>
                  <th className="p-2">Bloque</th>
                  <th className="p-2">Sucursal</th>
                  <th className="p-2">Última Venta</th>
                  <th className="p-2">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {vendedoras
                  .sort((a, b) => b.fechaUltima?.localeCompare(a.fechaUltima))
                  .map((v, i) => (
                  <tr key={i}>
                    <td className="p-2">{v.nombre}</td>
                    <td className="p-2">{v.bloque}</td>
                    <td className="p-2">{v.sucursal}</td>
                    <td className="p-2">{v.fechaUltima || "-"}</td>
                    <td className={`p-2 font-bold rounded flex items-center ${v.color}`}>
                      {v.icon}
                      {v.estatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}