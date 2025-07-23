import React from "react";
import { Link } from "react-router-dom";
import CeciCursed from "../assets/ceci cursed.png";
import DetonArturo from "../assets/detonarturo.png";

export default function Home() {
  // Cambia el favicon al abrir la página Home
  React.useEffect(() => {
    const favicon = document.querySelector("link[rel*='icon']");
    if (favicon) {
      favicon.href = DetonArturo;
    }
    return () => {
      if (favicon) favicon.href = "/vite.svg";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 bg-transparent">
        <div className="relative flex items-center gap-4">
          {/* Imagen con movimiento y brillo */}
          <div className="relative">
            <img
              src={CeciCursed}
              alt="Ceci Cursed"
              className="w-12 h-12 rounded-full shadow-lg object-cover animate-coin-shine-vertical animate-coin-move-vertical"
              style={{ minWidth: 48, minHeight: 48 }}
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-left text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x drop-shadow">
            Panel de Buscadores
          </h1>
        </div>
        <Link
          to="/panel"
          className="flex items-center gap-2 text-gray-100 hover:text-pink-400 transition font-bold text-xl"
          title="Panel de Administración"
        >
          <span className="animate-spin-slow text-3xl">⚙️</span>
          <span className="hidden md:inline">Panel</span>
        </Link>
      </header>

      {/* Hero / Botones */}
      <main className="flex flex-col items-center justify-center flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <Link
            to="/cargos-auto"
            className="bg-gradient-to-r from-blue-600 via-blue-400 to-purple-500 animate-gradient-x text-white p-6 rounded-xl shadow-xl text-center text-lg font-bold transition hover:scale-105"
          >
            🔍 Buscador Cargos Auto
          </Link>
          <Link
            to="/caja"
            className="bg-gradient-to-r from-green-600 via-green-400 to-yellow-400 animate-gradient-x text-white p-6 rounded-xl shadow-xl text-center text-lg font-bold transition hover:scale-105"
          >
            💵 Buscador Caja
          </Link>
          <Link
            to="/ventas"
            className="bg-gradient-to-r from-purple-600 via-pink-400 to-blue-400 animate-gradient-x text-white p-6 rounded-xl shadow-xl text-center text-lg font-bold transition hover:scale-105"
          >
            🔍 Buscador Reporte de Prevencion
          </Link>
          <Link
            to="/aclaraciones"
            className="bg-gradient-to-r from-yellow-600 via-orange-400 to-red-400 animate-gradient-x text-white p-6 rounded-xl shadow-xl text-center text-lg font-bold transition hover:scale-105"
          >
            💳 Aclaraciones
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <Link
            to="/vendedoras-status"
            className="bg-gradient-to-r from-blue-700 via-blue-400 to-green-400 animate-gradient-x text-white font-semibold py-6 px-6 rounded-xl shadow-xl text-center text-lg transition hover:scale-105 flex items-center justify-center gap-2"
          >
            <img
              src={DetonArturo}
              alt="Detonada"
              className="w-7 h-7 rounded-full shadow-lg object-cover"
            />
             Buscador Vendedoras Status
          </Link>
          <Link
            to="/sucursal-bloque"
            className="bg-gradient-to-r from-green-700 via-green-400 to-blue-400 animate-gradient-x text-white font-semibold py-6 px-6 rounded-xl shadow-xl text-center text-lg transition hover:scale-105"
          >
            🏢 Buscador Sucursal-Bloque
          </Link>
        </div>
        <div className="flex flex-col md:flex-row justify-center gap-6 mt-4">
          <Link
            to="/recuperacion"
            className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-pink-400 animate-gradient-x text-white px-8 py-4 rounded-xl shadow-xl hover:scale-105 transition font-semibold text-lg text-center"
          >
            📈 Ir a Recuperación
          </Link>
          <Link
            to="/dashboard-recuperacion"
            className="bg-gradient-to-r from-pink-600 via-purple-400 to-blue-400 animate-gradient-x text-white px-8 py-4 rounded-xl shadow-xl hover:scale-105 transition font-semibold text-lg text-center"
          >
            📊 Dashboard de Recuperacion
          </Link>
        </div>
      </main>
    </div>
  );
}
