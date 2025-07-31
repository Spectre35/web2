import React from "react";
import { Link, useLocation } from "react-router-dom";
import CeciCursed from "../assets/ceci cursed.png";
import DetonArturo from "../assets/detonarturo.png";
import { useSidebar } from "../context/SidebarContext.jsx";

const sidebarLinks = [
  // Panel de control
  { to: "/panel", label: "⚙️ Panel de Control" },
  // Buscadores principales arriba y juntos
  { to: "/cargos-auto", label: "🔍 Cargos Auto" },
  { to: "/caja", label: "💵 Caja" },
  { to: "/ventas", label: "🔍 Reporte de Prevención" },
  // Resto de buscadores
  { to: "/aclaraciones", label: "💳 Aclaraciones" },
  { to: "/vendedoras-status", label: "👩‍💼 Vendedoras Status" },
  { to: "/sucursal-bloque", label: "🏢 Sucursal-Bloque" },
  { to: "/sucursales-alerta", label: "🚨 Alertas Sucursales" },
  { to: "/validador-telefonos", label: "📱 Validador Teléfonos" },
  // Dashboards y análisis
  { to: "/dashboard-sucursales", label: "🏢 Dashboard Sucursales" },
  { to: "/dashboard-recuperacion", label: " Dashboard Recuperación" },
  { to: "/dashboard-aclaraciones", label: "📊 Dashboard Aclaraciones" },
  { to: "/recuperacion", label: " Recuperación" },
];

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen } = useSidebar();
  return (
    <aside
      className={`bg-gray-900 h-screen flex flex-col items-center py-8 shadow-xl transition-all duration-300 z-40
        md:sticky md:top-0 md:self-start
        fixed top-0 left-0
        ${sidebarOpen ? 'w-64 md:w-64' : 'w-0 md:w-0'}
        ${sidebarOpen ? 'opacity-100' : 'opacity-0'}
        ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ overflow: sidebarOpen ? 'visible' : 'hidden', height: '100vh' }}
    >
      <div className={`mb-8 flex flex-col items-center transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} ${sidebarOpen ? '' : 'scale-0 md:scale-100'}`}>
        {sidebarOpen && (
          <img src={CeciCursed} alt="Ceci Cursed" className="w-16 h-16 rounded-full mb-2 shadow-lg object-cover" />
        )}
        {sidebarOpen && <h2 className="text-xl font-bold text-white text-center">Panel de Buscadores</h2>}
      </div>
      <nav className={`flex flex-col gap-2 w-full px-4 transition-all duration-300 ${sidebarOpen ? '' : 'px-0'}`}>
        {sidebarLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`w-full py-3 px-4 rounded-lg text-left font-semibold transition text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-pink-400 ${location.pathname === link.to ? 'bg-gradient-to-r from-blue-500 to-pink-400' : 'bg-gray-800'} ${sidebarOpen ? '' : 'text-xs px-2 py-2 overflow-hidden whitespace-nowrap'}`}
            style={{ minHeight: '2.5rem' }}
            title={link.label.replace(/^[^ ]+ /, '')}
          >
            <span className="truncate block w-full">{sidebarOpen ? link.label : link.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
